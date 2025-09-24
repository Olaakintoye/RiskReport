const express = require('express');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const tiingo = require('./market_data_tiingo');

// Helper function to get Python executable path
function getPythonExecutable() {
  const pythonExecutable = path.join(__dirname, '..', 'var_env', 'bin', 'python');
  const oldVenvPython = path.join(__dirname, '..', 'venv', 'bin', 'python3');
  const fallbackPython = 'python3'; // Fallback to system python if venv not found
  
  // Check if new virtual environment Python exists first
  if (fs.existsSync(pythonExecutable)) {
    console.log('🐍 Using Python executable:', pythonExecutable);
    return pythonExecutable;
  }
  
  // Check if old virtual environment Python exists
  if (fs.existsSync(oldVenvPython)) {
    console.log('🐍 Using Python executable:', oldVenvPython);
    return oldVenvPython;
  }
  
  console.log('🐍 Using Python executable:', fallbackPython);
  return fallbackPython;
}

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Simple status endpoint for health checks
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'VaR Analysis API is running'
  });
});

// Set proper MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

app.use((req, res, next) => {
  // Only set content-type header for API routes
  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json');
  } 
  // For other routes, let express.static handle content-type
  else {
    const extname = path.extname(req.path);
    if (mimeTypes[extname]) {
      res.setHeader('Content-Type', mimeTypes[extname]);
    }
  }
  next();
});

// Serve static files from the public directory with proper mime types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// Serve images from images directory with proper mime types
app.use('/images', express.static(path.join(__dirname, 'images'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// Also serve files from server root directory
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// Define predefined stress periods
const STRESS_PERIODS = {
  'gfc': '2008-09-01:2009-03-31', // Global Financial Crisis
  'covid': '2020-02-15:2020-04-15', // COVID-19 Crash
  'dotcom': '2000-03-01:2002-10-15', // Dot-com Bubble Burst
  'black_monday': '1987-10-01:1987-10-30', // Black Monday
  'volmageddon': '2018-02-01:2018-02-15' // Volmageddon
};

// Endpoint to run the VaR analysis
app.post('/api/run-var', async (req, res) => {
  try {
    // Log the full request body to diagnose parameter issues
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    // Extract parameters, handling both direct parameters and params object
    const params = req.body.params || req.body;
    
    // Try to extract portfolio from different possible locations
    const portfolio = params.portfolio || req.body.portfolio;
    
    console.log('Extracted portfolio:', portfolio ? 'Yes' : 'No');
    if (portfolio) {
      console.log('Portfolio name:', portfolio.name);
      console.log('Portfolio assets count:', portfolio.assets?.length || 0);
    }
    
    const { 
      varMethod = 'monte-carlo', // Default to Monte Carlo if not specified
      distribution = 'normal', // default to normal distribution
      contractSize = 50,
      numContracts = 10,
      stressPeriod,
      attributionOnly,
      skipChart
    } = params;
    
    // Calculate portfolio value directly from assets if provided
    let portfolioValue = null;
    if (portfolio && portfolio.assets && portfolio.assets.length > 0) {
      portfolioValue = portfolio.assets.reduce(
        (sum, asset) => sum + (asset.price * asset.quantity), 
        0
      );
      console.log(`Calculated portfolio value from assets: $${portfolioValue.toFixed(2)}`);
    }
    
    // Handle both confidenceLevel and confidenceLevels formats
    const confidenceLevel = params.confidenceLevel || params.confidenceLevels || '0.95';
    const timeHorizon = params.timeHorizon || 1;
    const numSimulations = params.numSimulations || 10000;
    const lookbackPeriod = params.lookbackPeriod || 5;
    
    // Validate parameters
    if (!confidenceLevel || !timeHorizon || !numSimulations) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        received: { confidenceLevel, timeHorizon, numSimulations, lookbackPeriod }
      });
    }
    
    // Check if portfolio data was provided
    if (!portfolio) {
      console.warn('No portfolio data provided, will use default S&P 500 calculation');
    } else {
      console.log('Portfolio data received:', portfolio.name, 'with', portfolio.assets?.length || 0, 'assets');
    }
    
    // Log validated parameters
    console.log('Running VaR analysis with validated params:', {
      confidenceLevel,
      timeHorizon,
      numSimulations,
      contractSize,
      numContracts,
      lookbackPeriod,
      varMethod,
      distribution,
      usePortfolioData: !!portfolio,
      portfolioValue
    });
    
    // Format confidence levels for Python
    const confidenceLevelsStr = Array.isArray(confidenceLevel) 
      ? confidenceLevel.join(',') 
      : confidenceLevel;
    
    // Get stress period dates if a predefined period was selected
    let stressPeriodDates = '';
    if (stressPeriod) {
      if (STRESS_PERIODS[stressPeriod]) {
        stressPeriodDates = STRESS_PERIODS[stressPeriod];
      } else if (stressPeriod.includes(':')) {
        // Custom date range
        stressPeriodDates = stressPeriod;
      }
    }
    
    // Create a unique filename for this analysis
    const timestamp = Date.now();
    const methodPrefix = varMethod.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const outputFilename = `${methodPrefix}_var_${timestamp}.png`;
    const jsonOutputFilename = `${methodPrefix}_var_${timestamp}.json`;
    
    // Create absolute paths for the output files
    const outputFilePath = path.join(__dirname, outputFilename);
    const jsonOutputFilePath = path.join(__dirname, jsonOutputFilename);
    
    console.log(`Will write output to: ${outputFilePath}`);
    console.log(`Will write JSON to: ${jsonOutputFilePath}`);
    
    // If portfolio data is provided, save it to a temporary file
    let portfolioDataPath = '';
    if (portfolio && portfolio.assets && portfolio.assets.length > 0) {
      portfolioDataPath = path.join(__dirname, `portfolio_data_${timestamp}.json`);
      fs.writeFileSync(portfolioDataPath, JSON.stringify(portfolio), 'utf8');
      console.log(`Portfolio data saved to ${portfolioDataPath}`);
    }
    
    // Prepare Python script arguments
    const args = [
      path.join(__dirname, 'var_analysis.py'),
      '--confidence', confidenceLevelsStr,
      '--horizon', timeHorizon,
      '--simulations', numSimulations,
      '--contract-size', contractSize,
      '--contracts', numContracts,
      '--output', outputFilePath,
      '--distribution', distribution,
      '--method', varMethod,
      '--lookback', lookbackPeriod // Always include lookback period
    ];
    if (attributionOnly || skipChart) {
      args.push('--skip-chart');
    }
    
    // Add portfolio data path if available
    if (portfolioDataPath) {
      args.push('--portfolio-data', portfolioDataPath);
    }
    
    // Add portfolio value directly if calculated
    if (portfolioValue !== null) {
      args.push('--portfolio-value', portfolioValue.toString());
    }
    
    // Add stress period if specified
    if (stressPeriodDates) {
      args.push('--stress-period', stressPeriodDates);
    }
    
    console.log(`Using ${lookbackPeriod} years of historical data for VaR calculation`);
    console.log('Running Python script with args:', args);
    
    // Use virtual environment Python interpreter
    const pythonExecutable = getPythonExecutable();
    
    // Run the Python script
    const python = spawn(pythonExecutable, args);
    
    let dataString = '';
    let errorString = '';
    
    // Collect data from script
    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    // Collect error output
    python.stderr.on('data', (data) => {
      errorString += data.toString();
    });
    
    // Handle script completion
    python.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`Error: ${errorString}`);
        
        // Clean up temporary portfolio data file if it exists
        if (portfolioDataPath && fs.existsSync(portfolioDataPath)) {
          try {
            fs.unlinkSync(portfolioDataPath);
            console.log(`Cleaned up temporary portfolio data file: ${portfolioDataPath}`);
          } catch (err) {
            console.error(`Error cleaning up temporary portfolio data file: ${err}`);
          }
        }
        
        return res.status(500).json({ error: 'Error running VaR analysis', details: errorString });
      }
      
      try {
        // Check if image and JSON were generated
        const imageUrl = `/images/${outputFilename}`;
        const jsonPath = path.join(__dirname, jsonOutputFilename);
        
        // Create images directory if it doesn't exist
        const imagesDir = path.join(__dirname, 'images');
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        // Copy files to images directory
        if (fs.existsSync(path.join(__dirname, outputFilename))) {
          // Copy to timestamped file in images directory
          fs.copyFileSync(
            path.join(__dirname, outputFilename),
            path.join(imagesDir, outputFilename)
          );
          
          // Also copy to standard filename based on method for frontend consistency
          const standardFilename = varMethod === 'parametric' 
            ? 'parametric_var.png' 
            : varMethod === 'historical' 
              ? 'historical_var.png' 
              : 'monte_carlo_var.png';
              
          fs.copyFileSync(
            path.join(__dirname, outputFilename),
            path.join(imagesDir, standardFilename)
          );
          
          // Clean up original files
          fs.unlinkSync(path.join(__dirname, outputFilename));
        } else {
          console.log(`Warning: Output image file ${outputFilename} not found in expected location`);
        }
        
        // Parse JSON results
        let results = {};
        if (fs.existsSync(jsonOutputFilePath)) {
          const jsonData = fs.readFileSync(jsonOutputFilePath, 'utf8');
          results = JSON.parse(jsonData);
          
          // Copy JSON to images directory with timestamp
          fs.copyFileSync(
            jsonOutputFilePath,
            path.join(imagesDir, jsonOutputFilename)
          );
          
          // Also copy to standard filename based on method
          const standardJsonFilename = varMethod === 'parametric' 
            ? 'parametric_var.json' 
            : varMethod === 'historical' 
              ? 'historical_var.json' 
              : 'monte_carlo_var.json';
              
          fs.copyFileSync(
            jsonOutputFilePath,
            path.join(imagesDir, standardJsonFilename)
          );
          
          // Clean up original file
          fs.unlinkSync(jsonOutputFilePath);
        } else {
          // Extract results from output if JSON not available
          console.log('JSON file not found, parsing from console output');
          const lines = dataString.split('\n');
          let currentValue = 0;
          let portfolioValue = 0;
          
          for (const line of lines) {
            if (line.includes('Current S&P 500 Value:')) {
              currentValue = parseFloat(line.split('$')[1].trim());
            } else if (line.includes('Portfolio Value:')) {
              portfolioValue = parseFloat(line.split('$')[1].replace(/,/g, '').trim());
            }
          }
          
          results = {
            current_value: currentValue,
            portfolio_value: portfolioValue,
            var_results: {},
            distribution,
            time_horizon: parseInt(timeHorizon, 10)
          };
        }
        
        // Clean up temporary portfolio data file if it exists
        if (portfolioDataPath && fs.existsSync(portfolioDataPath)) {
          try {
            fs.unlinkSync(portfolioDataPath);
            console.log(`Cleaned up temporary portfolio data file: ${portfolioDataPath}`);
          } catch (err) {
            console.error(`Error cleaning up temporary portfolio data file: ${err}`);
          }
        }
        
        // Return the results
        res.json({
          success: true,
          results,
          chartUrl: imageUrl,
          jsonUrl: `/images/${jsonOutputFilename}`,
          processOutput: dataString
        });
      } catch (err) {
        console.error('Error parsing Python output:', err);
        res.status(500).json({ 
          error: 'Error parsing results', 
          output: dataString,
          details: err.message 
        });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Endpoint to get available stress periods
app.get('/api/stress-periods', (req, res) => {
  const formattedPeriods = Object.entries(STRESS_PERIODS).map(([id, dateRange]) => {
    const [startDate, endDate] = dateRange.split(':');
    return {
      id,
      name: id
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      startDate,
      endDate,
      dateRange
    };
  });
  
  res.json({
    success: true,
    stressPeriods: formattedPeriods
  });
});

// NEW ENDPOINT: Get latest chart images for each VaR model type
app.get('/api/latest-charts', (req, res) => {
  try {
    const imagesDir = path.join(__dirname, 'images');
    
    // Get all files in the images directory
    const files = fs.readdirSync(imagesDir);
    
    // Filter and group by VaR type
    const parametricFiles = files.filter(file => file.startsWith('parametric_var_') && file.endsWith('.png'));
    const historicalFiles = files.filter(file => file.startsWith('historical_var_') && file.endsWith('.png'));
    const monteCarloFiles = files.filter(file => file.startsWith('monte_carlo_var_') && file.endsWith('.png'));
    
    // Sort by timestamp (descending) to get the most recent file
    const sortByTimestamp = (files) => {
      return files.sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop().replace('.png', ''), 10);
        const timestampB = parseInt(b.split('_').pop().replace('.png', ''), 10);
        return timestampB - timestampA; // Descending order
      });
    };
    
    const latestParametric = sortByTimestamp(parametricFiles)[0] || 'parametric_var.png';
    const latestHistorical = sortByTimestamp(historicalFiles)[0] || 'historical_var.png';
    const latestMonteCarlo = sortByTimestamp(monteCarloFiles)[0] || 'monte_carlo_var.png';
    
    // Get file stats to include last modified time
    const getFileDetails = (filename) => {
      const filePath = path.join(imagesDir, filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          filename,
          path: `/images/${filename}`,
          lastModified: stats.mtime,
          size: stats.size
        };
      }
      return null;
    };
    
    res.json({
      success: true,
      charts: {
        parametric: getFileDetails(latestParametric),
        historical: getFileDetails(latestHistorical),
        monteCarlo: getFileDetails(latestMonteCarlo)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting latest charts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get latest charts', 
      details: error.message 
    });
  }
});

// Individual chart generation endpoints
app.get('/generate/parametric', async (req, res) => {
  try {
    console.log('Regenerating parametric VaR chart...');
    
    const outputFilename = `parametric_var_${Date.now()}.png`;
    const outputPath = path.join(__dirname, outputFilename);
    
    await new Promise((resolve, reject) => {
      const python = spawn(getPythonExecutable(), [
        path.join(__dirname, 'var_analysis.py'),
        '--method', 'parametric',
        '--output', outputPath,
        '--lookback', '5',
        '--confidence', '0.95',
        '--horizon', '1',
        '--contract-size', '50',
        '--contracts', '10',
        '--use-cache'
      ]);
      
      let stderrData = '';
      
      python.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          // Copy to images directory
          const imagesDir = path.join(__dirname, 'images');
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
          }
          
          if (fs.existsSync(outputPath)) {
            const destPath = path.join(imagesDir, outputFilename);
            fs.copyFileSync(outputPath, destPath);
            console.log('Parametric chart generated successfully');
            resolve();
          } else {
            reject(new Error('Output file not found'));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}: ${stderrData}`));
        }
      });
      
      python.on('error', (err) => {
        reject(err);
      });
    });
    
    res.json({ success: true, message: 'Parametric chart generated successfully' });
  } catch (error) {
    console.error('Error generating parametric chart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/generate/historical', async (req, res) => {
  try {
    console.log('Regenerating historical VaR chart...');
    
    const outputFilename = `historical_var_${Date.now()}.png`;
    const outputPath = path.join(__dirname, outputFilename);
    
    await new Promise((resolve, reject) => {
      const python = spawn(getPythonExecutable(), [
        path.join(__dirname, 'var_analysis.py'),
        '--method', 'historical',
        '--output', outputPath,
        '--lookback', '5',
        '--confidence', '0.95',
        '--horizon', '1',
        '--contract-size', '50',
        '--contracts', '10',
        '--use-cache'
      ]);
      
      let stderrData = '';
      
      python.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          // Copy to images directory
          const imagesDir = path.join(__dirname, 'images');
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
          }
          
          if (fs.existsSync(outputPath)) {
            const destPath = path.join(imagesDir, outputFilename);
            fs.copyFileSync(outputPath, destPath);
            console.log('Historical chart generated successfully');
            resolve();
          } else {
            reject(new Error('Output file not found'));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}: ${stderrData}`));
        }
      });
      
      python.on('error', (err) => {
        reject(err);
      });
    });
    
    res.json({ success: true, message: 'Historical chart generated successfully' });
  } catch (error) {
    console.error('Error generating historical chart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/generate/montecarlo', async (req, res) => {
  try {
    console.log('Regenerating Monte Carlo VaR chart...');
    
    const outputFilename = `monte_carlo_var_${Date.now()}.png`;
    const outputPath = path.join(__dirname, outputFilename);
    
    await new Promise((resolve, reject) => {
      const python = spawn(getPythonExecutable(), [
        path.join(__dirname, 'var_analysis.py'),
        '--method', 'monte-carlo',
        '--output', outputPath,
        '--lookback', '5',
        '--confidence', '0.95',
        '--horizon', '1',
        '--contract-size', '50',
        '--contracts', '10',
        '--simulations', '10000',
        '--use-cache'
      ]);
      
      let stderrData = '';
      
      python.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          // Copy to images directory
          const imagesDir = path.join(__dirname, 'images');
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
          }
          
          if (fs.existsSync(outputPath)) {
            const destPath = path.join(imagesDir, outputFilename);
            fs.copyFileSync(outputPath, destPath);
            console.log('Monte Carlo chart generated successfully');
            resolve();
          } else {
            reject(new Error('Output file not found'));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}: ${stderrData}`));
        }
      });
      
      python.on('error', (err) => {
        reject(err);
      });
    });
    
    res.json({ success: true, message: 'Monte Carlo chart generated successfully' });
  } catch (error) {
    console.error('Error generating Monte Carlo chart:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to regenerate all VaR charts at once
app.get('/generate/all', async (req, res) => {
  try {
    console.log('Regenerating all VaR charts...');
    
    // Run each chart generation process in sequence
    const charts = [
      { method: 'parametric', output: 'parametric_var.png' },
      { method: 'historical', output: 'historical_var.png' },
      { method: 'monte-carlo', output: 'monte_carlo_var.png' }
    ];
    
    const results = {
      success: true,
      message: 'Charts generated',
      charts: [],
      failed: []
    };
    
    for (const chart of charts) {
      try {
        console.log(`Generating ${chart.method} chart...`);
        
        // Add a timeout to prevent hanging if Python process gets stuck
        const timeoutMs = 60000; // 60 seconds timeout
        
        await new Promise((resolve, reject) => {
          const python = spawn(getPythonExecutable(), [
            path.join(__dirname, 'var_analysis.py'),
            '--method', chart.method,
            '--output', path.join(__dirname, chart.output),
            '--lookback', '5',
            '--confidence', '0.95,0.99,0.995',
            '--horizon', '1',
            '--contract-size', '50',
            '--contracts', '10',
            '--use-cache'
          ]);
          
          let stdoutData = '';
          let stderrData = '';
          
          python.stdout.on('data', (data) => {
            stdoutData += data.toString();
          });
          
          python.stderr.on('data', (data) => {
            stderrData += data.toString();
            console.error(`Python error (${chart.method}):`, data.toString());
          });
          
          // Set timeout to prevent hanging
          const timeout = setTimeout(() => {
            python.kill();
            reject(new Error(`Timeout generating ${chart.method} chart`));
          }, timeoutMs);
          
          python.on('close', (code) => {
            clearTimeout(timeout);
            
            if (code === 0) {
              console.log(`${chart.method} chart generation completed successfully`);
              
              // Copy file to images directory
              const sourcePath = path.join(__dirname, chart.output);
              const imagesDir = path.join(__dirname, 'images');
              const destPath = path.join(imagesDir, chart.output);
              
              try {
                // Ensure images directory exists
                if (!fs.existsSync(imagesDir)) {
                  fs.mkdirSync(imagesDir, { recursive: true });
                }
                
                if (fs.existsSync(sourcePath)) {
                  // Copy to timestamped filename
                  fs.copyFileSync(sourcePath, destPath);
                  console.log(`Copied ${chart.output} to images directory`);
                  
                  // Also copy to standard filename (without timestamp)
                  const standardFilename = chart.method === 'parametric' 
                    ? 'parametric_var.png' 
                    : chart.method === 'historical' 
                      ? 'historical_var.png' 
                      : 'monte_carlo_var.png';
                      
                  fs.copyFileSync(
                    sourcePath,
                    path.join(imagesDir, standardFilename)
                  );
                  console.log(`Copied ${chart.output} to standard filename ${standardFilename}`);
                  
                  // Check for corresponding JSON file and copy it too
                  const jsonSourcePath = sourcePath.replace('.png', '.json');
                  if (fs.existsSync(jsonSourcePath)) {
                    const standardJsonFilename = standardFilename.replace('.png', '.json');
                    fs.copyFileSync(
                      jsonSourcePath,
                      path.join(imagesDir, standardJsonFilename)
                    );
                    console.log(`Copied JSON to standard filename ${standardJsonFilename}`);
                  }
                  
                  results.charts.push(`/images/${chart.output}`);
                  resolve();
                } else {
                  console.error(`Error: ${chart.output} not found at expected location`);
                  results.failed.push({
                    method: chart.method,
                    error: `Output file not found: ${chart.output}`
                  });
                  resolve(); // Continue with other charts
                }
              } catch (err) {
                console.error(`Error copying ${chart.output} to images directory:`, err);
                results.failed.push({
                  method: chart.method,
                  error: `Failed to copy chart to images directory: ${err.message}`
                });
                resolve(); // Continue with other charts
              }
            } else {
              const errorMsg = `${chart.method} chart generation failed with code ${code}`;
              console.error(errorMsg);
              console.error(`Error output: ${stderrData}`);
              results.failed.push({
                method: chart.method,
                error: errorMsg,
                details: stderrData
              });
              // Continue with other charts instead of failing completely
              resolve();
            }
          });
          
          python.on('error', (err) => {
            clearTimeout(timeout);
            console.error(`Error spawning Python process: ${err}`);
            results.failed.push({
              method: chart.method,
              error: err.message
            });
            resolve(); // Continue with other charts
          });
        });
      } catch (error) {
        console.error(`Error during ${chart.method} chart generation:`, error);
        results.failed.push({
          method: chart.method,
          error: error.message
        });
        // Continue with the next chart
      }
    }
    
    // Set success to false if any charts failed
    if (results.failed.length > 0) {
      results.success = false;
      results.message = 'Some charts failed to generate';
    } else {
      results.message = 'All charts generated successfully';
    }
    
    // Ensure we're sending a proper JSON response
    console.log('Sending generate/all response:', JSON.stringify(results, null, 2));
    res.status(200).json(results);
  } catch (error) {
    console.error('Error generating all charts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate charts', 
      error: error.message 
    });
  }
});

// Add a stop endpoint to the server
app.get('/api/stop', (req, res) => {
  console.log('Received request to stop the server');
  res.send('Server is shutting down');
  
  // Allow response to be sent before shutting down
  setTimeout(() => {
    console.log('Shutting down server...');
    process.exit(0);
  }, 1000);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error handler caught:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message || 'Unknown error occurred',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Add a new endpoint for risk metrics calculation
app.post('/api/calculate-risk-metrics', async (req, res) => {
  console.log('Received risk metrics calculation request');
  
  try {
    const { portfolio } = req.body;
    
    if (!portfolio || !portfolio.assets || portfolio.assets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio data'
      });
    }
    
    console.log(`Calculating risk metrics for portfolio: ${portfolio.name}`);
    
    // Create temporary input file for Python script
    const timestamp = Date.now();
    const inputFile = path.join(__dirname, 'temp', `risk_metrics_input_${timestamp}.json`);
    const outputFile = path.join(__dirname, 'temp', `risk_metrics_output_${timestamp}.json`);
    
    // Prepare portfolio data for Python
    const portfolioData = {
      portfolio: {
        name: portfolio.name,
        assets: portfolio.assets.map(asset => ({
          symbol: asset.symbol,
          name: asset.name,
          quantity: asset.quantity,
          price: asset.price,
          assetClass: asset.assetClass
        }))
      },
      lookbackYears: 5, // Default lookback for risk metrics
      calculateMetrics: ['volatility', 'sharpe_ratio', 'beta', 'max_drawdown', 'sortino_ratio', 'treynor_ratio', 'calmar_ratio']
    };
    
    // Write input file
    fs.writeFileSync(inputFile, JSON.stringify(portfolioData, null, 2));
    
    // Run Python script to calculate risk metrics
    const pythonScript = path.join(__dirname, 'calculate_risk_metrics.py');
    const pythonExecutable = getPythonExecutable();
    const pythonCommand = `"${pythonExecutable}" "${pythonScript}" --input "${inputFile}" --output "${outputFile}"`;
    
    console.log('Running Python risk metrics calculation...');
    console.log('Command:', pythonCommand);
    
    exec(pythonCommand, { timeout: 30000 }, (error, stdout, stderr) => {
      try {
        // Clean up input file
        if (fs.existsSync(inputFile)) {
          fs.unlinkSync(inputFile);
        }
        
        if (error) {
          console.error('Python script error:', error);
          console.error('stderr:', stderr);
          console.error('stdout:', stdout);
          
          // Return fallback values if Python fails
          return res.json({
            success: true,
            fallback: true,
            results: {
              volatility: 18.2,
              sharpeRatio: 1.32,
              beta: 0.85,
              maxDrawdown: 15.3,
              sortinoRatio: 1.2,
              downsideDeviation: 10.5,
              treynorRatio: 0.1,
              calmarRatio: 0.86
            },
            message: 'Used fallback values due to calculation error'
          });
        }
        
        // Read Python output
        if (!fs.existsSync(outputFile)) {
          throw new Error('Python script did not generate output file');
        }
        
        const outputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        
        // Clean up output file
        fs.unlinkSync(outputFile);
        
        console.log('Risk metrics calculation completed successfully');
        
        res.json({
          success: true,
          fallback: false,
          results: outputData.riskMetrics,
          portfolioValue: outputData.portfolioValue,
          calculationTime: outputData.calculationTime
        });
        
      } catch (processingError) {
        console.error('Error processing Python output:', processingError);
        
        // Clean up files
        try {
          if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
        
        // Return fallback values
        res.json({
          success: true,
          fallback: true,
          results: {
            volatility: 18.2,
            sharpeRatio: 1.32,
            beta: 0.85,
            maxDrawdown: 15.3,
            sortinoRatio: 1.2,
            downsideDeviation: 10.5,
            treynorRatio: 0.1,
            calmarRatio: 0.86
          },
          message: 'Used fallback values due to processing error'
        });
      }
    });
    
  } catch (error) {
    console.error('Risk metrics calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Portfolio Backtesting endpoint
app.post('/api/backtest-portfolio', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { spawn } = require('child_process');

    const { portfolio, startDate, endDate, rebalancing, benchmarkSymbols, riskFreeRate } = req.body || {};

    if (!portfolio || !portfolio.assets || portfolio.assets.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid portfolio data' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required (YYYY-MM-DD)' });
    }

    // If TIINGO_API_KEY is present, prefetch daily prices to ensure model gets robust data
    let priceMap = null;
    try {
      if (process.env.TIINGO_API_KEY) {
        const syms = portfolio.assets.map(a => a.symbol);
        priceMap = await tiingo.fetchMultiple(syms, startDate, endDate);
      }
    } catch (e) {
      // Non-fatal; fall back to yfinance in Python
      priceMap = null;
    }

    const inputPayload = {
      portfolio: {
        name: portfolio.name || 'Portfolio',
        assets: portfolio.assets.map(a => ({ symbol: a.symbol, quantity: a.quantity, price: a.price }))
      },
      startDate,
      endDate,
      rebalancing: rebalancing || 'none',
      benchmarkSymbols: Array.isArray(benchmarkSymbols) ? benchmarkSymbols : [],
      riskFreeRate: typeof riskFreeRate === 'number' ? riskFreeRate : 0.02
    };

    if (priceMap) {
      inputPayload.priceMap = priceMap;
    }

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const ts = Date.now();
    const inputFile = path.join(tempDir, `backtest_input_${ts}.json`);
    const outputFile = path.join(tempDir, `backtest_output_${ts}.json`);
    fs.writeFileSync(inputFile, JSON.stringify(inputPayload, null, 2));

    const python = spawn(getPythonExecutable(), [
      path.join(__dirname, 'backtest_portfolio.py'),
      '--input', inputFile,
      '--output', outputFile
    ]);

    let stderr = '';
    python.stderr.on('data', (d) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      try { python.kill('SIGTERM'); } catch {}
    }, 60000);

    python.on('close', (code) => {
      clearTimeout(timeout);
      try { if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile); } catch {}
      if (code !== 0) {
        return res.status(500).json({ success: false, error: 'Backtest failed', details: stderr });
      }
      if (!fs.existsSync(outputFile)) {
        return res.status(500).json({ success: false, error: 'Backtest produced no output' });
      }
      try {
        const json = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        fs.unlinkSync(outputFile);
        return res.json({ success: true, results: json });
      } catch (e) {
        return res.status(500).json({ success: false, error: 'Failed to parse backtest output', details: e.message });
      }
    });

    python.on('error', (err) => {
      try { if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile); } catch {}
      return res.status(500).json({ success: false, error: 'Failed to start Python process', details: err.message });
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal error', details: err.message });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`VaR Analysis API running on http://0.0.0.0:${PORT}`);
  console.log(`Also accessible at http://localhost:${PORT} and http://192.168.1.106:${PORT}`);
  console.log(`Server started at ${new Date().toISOString()}`);
  console.log('Available endpoints:');
  console.log('  POST /api/run-var - Run VaR analysis');
  console.log('  GET /api/stress-periods - Get stress periods');
  console.log('  GET /api/latest-charts - Get latest charts');
});

module.exports = app; // For testing 
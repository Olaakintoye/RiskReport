const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { spawn } = require('child_process');

// Import API routers
const stressTestRouter = require('./api/stress-test-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://10.211.17.86:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from images directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Register API routes
app.use('/api/stress-test', stressTestRouter);

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'VaR Analysis API is running'
  });
});

// API endpoint to get latest chart paths
app.get('/api/latest-charts', (req, res) => {
  try {
    const imagesDir = path.join(__dirname, 'images');
    
    if (!fs.existsSync(imagesDir)) {
      return res.json({
        success: true,
        charts: {
          parametric: { path: '/images/parametric_var.png', lastModified: new Date().toISOString() },
          historical: { path: '/images/historical_var.png', lastModified: new Date().toISOString() },
          monteCarlo: { path: '/images/monte_carlo_var.png', lastModified: new Date().toISOString() }
        }
      });
    }
    
    const files = fs.readdirSync(imagesDir);
    
    // Find the most recent chart for each method
    const getLatestChart = (method) => {
      const methodFiles = files.filter(file => file.includes(method) && file.endsWith('.png'));
      if (methodFiles.length === 0) {
        return { path: `/images/${method}_var.png`, lastModified: new Date().toISOString() };
      }
      
      // Sort by modification time, most recent first
      const sortedFiles = methodFiles
        .map(file => ({
          file,
          path: `/images/${file}`,
          stats: fs.statSync(path.join(imagesDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
      
      return {
        path: sortedFiles[0].path,
        lastModified: sortedFiles[0].stats.mtime.toISOString()
      };
    };
    
    res.json({
      success: true,
      charts: {
        parametric: getLatestChart('parametric'),
        historical: getLatestChart('historical'),
        monteCarlo: getLatestChart('monte_carlo')
      }
    });
  } catch (error) {
    console.error('Error fetching latest charts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest charts'
    });
  }
});

// Ensure the images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// Ensure the temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Copy the Python script to the server directory
const pythonScript = path.join(__dirname, 'var_analysis.py');
if (!fs.existsSync(pythonScript)) {
  fs.copyFileSync(path.join(__dirname, '../Py.py'), pythonScript);
}

// Make stress test calculator executable
const stressTestScript = path.join(__dirname, 'stress_test_calculator.py');
if (fs.existsSync(stressTestScript)) {
  fs.chmodSync(stressTestScript, '755');
}

// ==========================================
// VaR ANALYSIS API ENDPOINT  
// ==========================================

// Define predefined stress periods
const STRESS_PERIODS = {
  'gfc': '2008-09-01:2009-03-31', // Global Financial Crisis
  'covid': '2020-02-15:2020-04-15', // COVID-19 Crash
  'dotcom': '2000-03-01:2002-10-15', // Dot-com Bubble Burst
  'black_monday': '1987-10-01:1987-10-30', // Black Monday
  'volmageddon': '2018-02-01:2018-02-15' // Volmageddon
};

// Main VaR analysis endpoint
app.post('/api/run-var', async (req, res) => {
  try {
    console.log('🔄 VaR Analysis - Received request body:', JSON.stringify(req.body, null, 2));
    
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
      stressPeriod
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
    
    // Prepare Python script arguments (ensure charts are generated)
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
      // Note: NO --skip-chart flag to ensure charts are generated
    ];
    
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
    
    // Run the Python script with a timeout
    const python = spawn(pythonExecutable, args);
    
    let dataString = '';
    let errorString = '';
    
    // Set a timeout for the Python process (30 seconds should be enough)
    const timeout = setTimeout(() => {
      python.kill('SIGTERM');
      console.error('❌ Python process timed out after 30 seconds');
      
      // Clean up temporary files
      if (portfolioDataPath && fs.existsSync(portfolioDataPath)) {
        fs.unlinkSync(portfolioDataPath);
      }
      
      res.status(408).json({ 
        error: 'VaR analysis timed out', 
        details: 'Python process exceeded 30 second limit',
        method: varMethod
      });
    }, 30000); // 30 second timeout
    
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
      clearTimeout(timeout); // Clear the timeout since process completed
      
      if (code !== 0) {
        console.error(`❌ Python script exited with code ${code}`);
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
        
        return res.status(500).json({ 
          error: 'Error running VaR analysis', 
          details: errorString,
          method: varMethod
        });
      }
      
      try {
        // Check if image and JSON were generated
        const imageUrl = `/images/${outputFilename}`;
        
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
        if (fs.existsSync(jsonOutputFilename)) {
          const jsonData = fs.readFileSync(jsonOutputFilename, 'utf8');
          results = JSON.parse(jsonData);
          
          // Copy JSON to images directory with timestamp
          fs.copyFileSync(
            jsonOutputFilename,
            path.join(imagesDir, jsonOutputFilename)
          );
          
          // Also copy to standard filename based on method
          const standardJsonFilename = varMethod === 'parametric' 
            ? 'parametric_var.json' 
            : varMethod === 'historical' 
              ? 'historical_var.json' 
              : 'monte_carlo_var.json';
              
          fs.copyFileSync(
            jsonOutputFilename,
            path.join(imagesDir, standardJsonFilename)
          );
          
          // Clean up original file
          fs.unlinkSync(jsonOutputFilename);
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
        
        console.log(`✅ ${varMethod} VaR analysis completed successfully`);
        console.log(`📊 Chart URL being returned: ${imageUrl}`);
        console.log(`📄 JSON URL being returned: /images/${jsonOutputFilename}`);
        
        // Return the results
        res.json({
          success: true,
          results,
          chartUrl: imageUrl,
          jsonUrl: `/images/${jsonOutputFilename}`,
          method: varMethod,
          processOutput: dataString
        });
      } catch (err) {
        console.error('Error parsing Python output:', err);
        res.status(500).json({ 
          error: 'Error parsing results', 
          output: dataString,
          details: err.message,
          method: varMethod
        });
      }
    });
    
    // Handle Python process errors
    python.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ Python process error:', error);
      
      // Clean up temporary files
      if (portfolioDataPath && fs.existsSync(portfolioDataPath)) {
        fs.unlinkSync(portfolioDataPath);
      }
      
      res.status(500).json({ 
        error: 'Failed to start Python process', 
        details: error.message,
        method: varMethod
      });
    });
    
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

// ==========================================
// LEGACY VaR ANALYSIS ENDPOINTS
// ==========================================

// DISABLED: API endpoint to generate VaR chart separately (was causing URL conflicts)
// Charts are now generated directly by the main VaR analysis endpoint
app.post('/api/generate-var-chart-DISABLED', async (req, res) => {
  try {
    const params = req.body;
    console.log('🎨 Generating VaR chart with parameters:', params);
    
    // Extract parameters
    const confidenceLevel = params.confidenceLevel || '0.95';
    const timeHorizon = params.timeHorizon || 1;
    const numSimulations = params.numSimulations || 10000;
    const contractSize = params.contractSize || 50;
    const numContracts = params.numContracts || 10;
    const lookbackPeriod = params.lookbackPeriod || 5;
    const varMethod = params.varMethod || 'monte-carlo';
    
    // Path to Python script
    const pythonScript = path.join(__dirname, 'var_analysis.py');
    
    // Output file for the chart
    const methodPrefix = varMethod.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const outputFile = `${methodPrefix}_var_chart_${Date.now()}.png`;
    
    // Command-line arguments for chart generation only
    const args = [
      '--confidence', String(confidenceLevel),
      '--horizon', String(timeHorizon),
      '--simulations', String(numSimulations),
      '--contract-size', String(contractSize),
      '--contracts', String(numContracts),
      '--output', outputFile,
      '--method', varMethod,
      '--lookback', String(lookbackPeriod)
      // No --skip-chart flag, so chart will be generated
    ];
    
    console.log('Generating chart with Python script args:', args);
    
    // Use virtual environment Python interpreter
    const pythonCmd = getPythonExecutable();
    
    console.log('🐍 Using Python executable:', pythonCmd);
    
    // Run the Python script for chart generation
    const python = spawn(pythonCmd, [pythonScript, ...args]);
    
    let dataString = '';
    let errorString = '';
    
    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorString += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Chart generation failed with code:', code);
        console.error('Error output:', errorString);
        return res.status(500).json({ 
          error: 'Chart generation failed',
          details: errorString,
          code: code
        });
      }
      
      try {
        // Copy chart to public directory
        const outputFilePath = path.join(__dirname, outputFile);
        const publicPath = path.join(__dirname, 'public', outputFile);
        
        if (fs.existsSync(outputFilePath)) {
          fs.copyFileSync(outputFilePath, publicPath);
          fs.unlinkSync(outputFilePath); // Clean up original
          
          res.json({
            success: true,
            message: 'Chart generated successfully',
            chartUrl: `/images/${outputFile}`,
            method: varMethod
          });
        } else {
          res.status(500).json({ 
            error: 'Chart file not found after generation'
          });
        }
      } catch (chartError) {
        console.error('Error processing chart:', chartError);
        res.status(500).json({ 
          error: 'Error processing chart',
          details: chartError.message
        });
      }
    });
    
  } catch (error) {
    console.error('Error in chart generation:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Helper function to get the correct Python executable
function getPythonExecutable() {
  const pythonExecutable = path.join(__dirname, '..', 'venv', 'bin', 'python3');
  const fallbackPython = 'python3'; // Fallback to system python if venv not found
  
  // Check if virtual environment Python exists
  return fs.existsSync(pythonExecutable) ? pythonExecutable : fallbackPython;
}

// Function to generate initial charts
async function generateInitialCharts() {
  console.log('📊 Generating initial charts...');
  
  const methods = ['parametric', 'historical', 'monte-carlo'];
  
  for (const method of methods) {
    try {
      const outputFile = `${method}_var.png`;
      const outputPath = path.join(__dirname, outputFile);
      
      // Skip if file already exists
      if (fs.existsSync(outputPath)) {
        console.log(`✅ ${method} chart already exists, skipping...`);
        continue;
      }
      
      console.log(`🔄 Generating ${method} chart...`);
      
      const args = [
        '--confidence', '0.95',
        '--horizon', '1',
        '--simulations', '10000',
        '--contract-size', '50',
        '--contracts', '10',
        '--output', outputFile,
        '--method', method,
        '--lookback', '5'
      ];
      
      const python = spawn(getPythonExecutable(), [path.join(__dirname, 'var_analysis.py'), ...args]);
      
      await new Promise((resolve, reject) => {
        python.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ ${method} chart generated successfully`);
            resolve();
          } else {
            console.error(`❌ Failed to generate ${method} chart`);
            reject(new Error(`Python script failed with code ${code}`));
          }
        });
      });
      
    } catch (error) {
      console.error(`❌ Error generating ${method} chart:`, error.message);
    }
  }
}

// Function to copy charts to public directory
function copyChartsToPublic() {
  console.log('📂 Copying charts to public directory...');
  
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  
  const chartFiles = fs.readdirSync(__dirname).filter(file => 
    file.endsWith('.png') && file.includes('var')
  );
  
  chartFiles.forEach(file => {
    const sourcePath = path.join(__dirname, file);
    const destPath = path.join(publicDir, file);
    
    try {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${file} to public directory`);
    } catch (error) {
      console.error(`❌ Failed to copy ${file}:`, error.message);
    }
  });
}

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Risk Analysis Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .method { color: #0066cc; font-weight: bold; }
          .new { color: #00cc00; }
          .legacy { color: #cc6600; }
        </style>
      </head>
      <body>
        <h1>🏗️ Risk Analysis Server</h1>
        <p>Server running on port ${PORT}</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        
        <h2>🔄 New Structured Stress Test API</h2>
        <div class="endpoint">
          <span class="method new">GET</span> /api/stress-test/test - Test endpoint
        </div>
        <div class="endpoint">
          <span class="method new">GET</span> /api/stress-test/portfolios - Get all portfolios
        </div>
        <div class="endpoint">
          <span class="method new">GET</span> /api/stress-test/portfolios/:id - Get specific portfolio
        </div>
        <div class="endpoint">
          <span class="method new">GET</span> /api/stress-test/scenarios - Get all scenarios
        </div>
        <div class="endpoint">
          <span class="method new">GET</span> /api/stress-test/scenarios/:id - Get specific scenario
        </div>
        <div class="endpoint">
          <span class="method new">POST</span> /api/stress-test/run - Run stress test
        </div>
        <div class="endpoint">
          <span class="method new">GET</span> /api/stress-test/history - Get stress test history
        </div>
        
        <h2>📊 Legacy VaR Analysis API</h2>
        <div class="endpoint">
          <span class="method legacy">POST</span> /api/generate-var-chart - Generate VaR chart
        </div>
        <div class="endpoint">
          <span class="method legacy">POST</span> /api/run-var - Run VaR analysis
        </div>
        <div class="endpoint">
          <span class="method legacy">GET</span> /api/charts - List available charts
        </div>
        
        <h2>🔧 System Endpoints</h2>
        <div class="endpoint">
          <span class="method">GET</span> /api/health - Health check
        </div>
        
        <h2>📋 Usage Examples</h2>
        <h3>Stress Test (New API)</h3>
        <pre>
POST /api/stress-test/run
{
  "scenarioId": "TMPL0006",
  "portfolioId": "income-portfolio",
  "options": {
    "confidenceLevel": 0.95,
    "timeHorizon": 1
  }
}
        </pre>
        
        <h3>VaR Analysis (Legacy)</h3>
        <pre>
POST /api/generate-var-chart
{
  "confidenceLevel": "0.95",
  "timeHorizon": 1,
  "numSimulations": 10000,
  "varMethod": "monte-carlo"
}
        </pre>
      </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Server accessible from all network interfaces (0.0.0.0:${PORT})`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
  console.log(`📊 API routes registered at /api/*`);
  console.log(`🔄 New Stress Test API at /api/stress-test/*`);
  
  console.log(`\n🧪 TEST ENDPOINTS:`);
  console.log(`  - Main: http://localhost:${PORT}/`);
  console.log(`  - Health: http://localhost:${PORT}/api/health`);
  console.log(`  - Stress Test: http://localhost:${PORT}/api/stress-test/test`);
  console.log(`  - React Native: http://192.168.1.106:${PORT}/`);
  
  console.log(`\n🔄 STRESS TEST API ENDPOINTS:`);
  console.log(`  - GET /api/stress-test/portfolios`);
  console.log(`  - GET /api/stress-test/scenarios`);
  console.log(`  - POST /api/stress-test/run`);
  
  // Generate initial charts (non-blocking)
  generateInitialCharts().catch(error => {
    console.log('⚠️  Chart generation had some issues, but server is still running');
  });
  
  // Copy charts to public directory
  copyChartsToPublic();
  
  console.log(`\n✅ Server is ready! Visit http://localhost:${PORT}/ to view the API documentation.`);
  console.log(`📱 React Native app can now connect to http://192.168.1.106:${PORT}/`);
}); 
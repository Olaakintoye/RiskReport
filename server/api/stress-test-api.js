const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const router = express.Router();

// ==========================================
// STRUCTURED STRESS TESTING API
// ==========================================

/**
 * Get all portfolios with asset details for stress testing
 */
router.get('/portfolios', async (req, res) => {
  try {
    console.log('📊 API: Getting portfolios for stress testing...');
    
    // Mock portfolio data - in real implementation, this would come from database
    const portfolios = [
      {
        id: 'income-portfolio',
        name: 'Income Portfolio',
        totalValue: 250000,
        assets: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc',
            assetType: 'equity',
            assetClass: 'Large Cap Growth',
            sector: 'Technology',
            marketCap: 'Large',
            geography: 'US',
            quantity: 100,
            price: 150.00,
            value: 15000,
            weight: 0.06,
            beta: 1.2,
            duration: 0,
            creditRating: null
          },
          {
            symbol: 'MSFT',
            name: 'Microsoft Corp',
            assetType: 'equity',
            assetClass: 'Large Cap Growth',
            sector: 'Technology',
            marketCap: 'Large',
            geography: 'US',
            quantity: 80,
            price: 300.00,
            value: 24000,
            weight: 0.096,
            beta: 1.1,
            duration: 0,
            creditRating: null
          },
          {
            symbol: 'AGG',
            name: 'iShares Core US Aggregate Bond ETF',
            assetType: 'bond',
            assetClass: 'Government Bonds',
            sector: 'Fixed Income',
            marketCap: null,
            geography: 'US',
            quantity: 2000,
            price: 105.00,
            value: 210000,
            weight: 0.84,
            beta: 0.1,
            duration: 6.5,
            creditRating: 'AAA'
          }
        ],
        riskMetrics: {
          beta: 0.25,
          volatility: 0.08,
          sharpeRatio: 0.85,
          maxDrawdown: -0.12
        },
        assetAllocation: {
          'equity': 0.156,
          'bond': 0.84,
          'cash': 0.004
        }
      },
      {
        id: 'growth-portfolio',
        name: 'Growth Portfolio',
        totalValue: 500000,
        assets: [
          {
            symbol: 'TSLA',
            name: 'Tesla Inc',
            assetType: 'equity',
            assetClass: 'Large Cap Growth',
            sector: 'Consumer Discretionary',
            marketCap: 'Large',
            geography: 'US',
            quantity: 500,
            price: 200.00,
            value: 100000,
            weight: 0.2,
            beta: 2.0,
            duration: 0,
            creditRating: null
          },
          {
            symbol: 'NVDA',
            name: 'NVIDIA Corp',
            assetType: 'equity',
            assetClass: 'Large Cap Growth',
            sector: 'Technology',
            marketCap: 'Large',
            geography: 'US',
            quantity: 300,
            price: 400.00,
            value: 120000,
            weight: 0.24,
            beta: 1.8,
            duration: 0,
            creditRating: null
          },
          {
            symbol: 'QQQ',
            name: 'Invesco QQQ Trust',
            assetType: 'equity',
            assetClass: 'Large Cap Growth',
            sector: 'Technology',
            marketCap: 'Large',
            geography: 'US',
            quantity: 1000,
            price: 280.00,
            value: 280000,
            weight: 0.56,
            beta: 1.5,
            duration: 0,
            creditRating: null
          }
        ],
        riskMetrics: {
          beta: 1.65,
          volatility: 0.22,
          sharpeRatio: 1.2,
          maxDrawdown: -0.35
        },
        assetAllocation: {
          'equity': 1.0,
          'bond': 0.0,
          'cash': 0.0
        }
      },
      {
        id: 'balanced-portfolio',
        name: 'Balanced Portfolio',
        totalValue: 1000000,
        assets: [
          {
            symbol: 'SPY',
            name: 'SPDR S&P 500 ETF',
            assetType: 'equity',
            assetClass: 'Large Cap Blend',
            sector: 'Diversified',
            marketCap: 'Large',
            geography: 'US',
            quantity: 1500,
            price: 400.00,
            value: 600000,
            weight: 0.6,
            beta: 1.0,
            duration: 0,
            creditRating: null
          },
          {
            symbol: 'TLT',
            name: 'iShares 20+ Year Treasury Bond ETF',
            assetType: 'bond',
            assetClass: 'Government Bonds',
            sector: 'Fixed Income',
            marketCap: null,
            geography: 'US',
            quantity: 2000,
            price: 100.00,
            value: 200000,
            weight: 0.2,
            beta: -0.3,
            duration: 17.5,
            creditRating: 'AAA'
          },
          {
            symbol: 'GLD',
            name: 'SPDR Gold Shares',
            assetType: 'commodity',
            assetClass: 'Precious Metals',
            sector: 'Commodities',
            marketCap: null,
            geography: 'Global',
            quantity: 1000,
            price: 200.00,
            value: 200000,
            weight: 0.2,
            beta: 0.1,
            duration: 0,
            creditRating: null
          }
        ],
        riskMetrics: {
          beta: 0.65,
          volatility: 0.12,
          sharpeRatio: 0.95,
          maxDrawdown: -0.18
        },
        assetAllocation: {
          'equity': 0.6,
          'bond': 0.2,
          'commodity': 0.2
        }
      }
    ];

    res.json({
      success: true,
      portfolios: portfolios,
      count: portfolios.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting portfolios:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get specific portfolio by ID
 */
router.get('/portfolios/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    console.log(`📊 API: Getting portfolio ${portfolioId} for stress testing...`);
    
    // Get all portfolios and find the specific one
    const portfoliosResponse = await new Promise((resolve, reject) => {
      router.handle({ method: 'GET', url: '/portfolios' }, { 
        json: resolve, 
        status: (code) => ({ json: reject })
      });
    });
    
    const portfolio = portfoliosResponse.portfolios.find(p => p.id === portfolioId);
    
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: `Portfolio ${portfolioId} not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      portfolio: portfolio,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting portfolio:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get all scenarios for stress testing
 */
router.get('/scenarios', async (req, res) => {
  try {
    console.log('📊 API: Getting scenarios for stress testing...');
    
    // Template scenarios with structured IDs
    const scenarios = [
      {
        id: 'TMPL0001',
        name: '2008 Financial Crisis',
        description: 'Simulate the market conditions from the 2008 global financial crisis',
        category: 'crisis',
        type: 'template',
        severity: 'extreme',
        factors: {
          equity: -45,
          rates: -200,
          credit: 350,
          fx: -15,
          commodity: -30,
          volatility: 150
        },
        icon: 'trending-down',
        color: '#dc2626'
      },
      {
        id: 'TMPL0002',
        name: 'Fed Rate Hike +100bps',
        description: 'Federal Reserve increases interest rates by 100 basis points',
        category: 'rates',
        type: 'template',
        severity: 'moderate',
        factors: {
          equity: -8,
          rates: 100,
          credit: 75,
          fx: 5,
          commodity: -3,
          volatility: 25
        },
        icon: 'bank',
        color: '#f59e0b'
      },
      {
        id: 'TMPL0003',
        name: 'Oil Price Shock +50%',
        description: 'Crude oil prices surge 50% due to supply disruption',
        category: 'commodity',
        type: 'template',
        severity: 'moderate',
        factors: {
          equity: -5,
          rates: 25,
          credit: 15,
          fx: -3,
          commodity: 50,
          volatility: 30
        },
        icon: 'oil',
        color: '#10b981'
      },
      {
        id: 'TMPL0004',
        name: 'Technology Sector Correction',
        description: 'Technology stocks decline 25% due to regulatory concerns',
        category: 'sector',
        type: 'template',
        severity: 'moderate',
        factors: {
          equity: -12,
          rates: -15,
          credit: 30,
          fx: -2,
          commodity: 0,
          volatility: 40
        },
        icon: 'laptop',
        color: '#3b82f6'
      },
      {
        id: 'TMPL0005',
        name: 'COVID-19 Pandemic Crash',
        description: 'Simulate the March 2020 market crash from COVID-19 pandemic',
        category: 'crisis',
        type: 'template',
        severity: 'extreme',
        factors: {
          equity: -34,
          rates: -150,
          credit: 200,
          fx: -8,
          commodity: -77,
          volatility: 200
        },
        icon: 'pulse',
        color: '#7c2d12'
      },
      {
        id: 'TMPL0006',
        name: 'Market Decline -25%',
        description: 'Broad equity market decline of 25% with minimal other factor impacts',
        category: 'crisis',
        type: 'template',
        severity: 'severe',
        factors: {
          equity: -25,
          rates: 0,
          credit: 0,
          fx: 0,
          commodity: 0,
          volatility: 50
        },
        icon: 'trending-down',
        color: '#dc2626'
      },
      {
        id: 'TMPL0007',
        name: 'Credit Crisis +350bps',
        description: 'Corporate credit spreads widen 350 basis points',
        category: 'credit',
        type: 'template',
        severity: 'severe',
        factors: {
          equity: -15,
          rates: -50,
          credit: 350,
          fx: 0,
          commodity: 0,
          volatility: 60
        },
        icon: 'alert-triangle',
        color: '#ef4444'
      },
      {
        id: 'TMPL0008',
        name: 'Geopolitical Shock',
        description: 'Major geopolitical event causing flight to quality',
        category: 'geopolitical',
        type: 'template',
        severity: 'moderate',
        factors: {
          equity: -12,
          rates: -25,
          credit: 100,
          fx: 8,
          commodity: 15,
          volatility: 80
        },
        icon: 'globe',
        color: '#8b5cf6'
      }
    ];

    res.json({
      success: true,
      scenarios: scenarios,
      count: scenarios.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting scenarios:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get specific scenario by ID
 */
router.get('/scenarios/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    console.log(`📊 API: Getting scenario ${scenarioId} for stress testing...`);
    
    // Get all scenarios and find the specific one
    const scenariosResponse = await new Promise((resolve, reject) => {
      router.handle({ method: 'GET', url: '/scenarios' }, { 
        json: resolve, 
        status: (code) => ({ json: reject })
      });
    });
    
    const scenario = scenariosResponse.scenarios.find(s => s.id === scenarioId);
    
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: `Scenario ${scenarioId} not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      scenario: scenario,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting scenario:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Main stress testing endpoint
 */
router.post('/run', async (req, res) => {
  try {
    const { scenarioId, portfolioId, options = {} } = req.body;
    
    console.log('🔄 API: Running structured stress test...');
    console.log(`   Scenario: ${scenarioId}`);
    console.log(`   Portfolio: ${portfolioId}`);
    console.log(`   Options:`, options);
    
    // Validate required parameters
    if (!scenarioId || !portfolioId) {
      return res.status(400).json({
        success: false,
        error: 'scenarioId and portfolioId are required',
        timestamp: new Date().toISOString()
      });
    }

    // Get portfolio data
    const portfolioResponse = await fetch(`http://localhost:3000/api/stress-test/portfolios/${portfolioId}`);
    const portfolioData = await portfolioResponse.json();
    
    if (!portfolioData.success) {
      return res.status(404).json({
        success: false,
        error: `Portfolio ${portfolioId} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Get scenario data
    const scenarioResponse = await fetch(`http://localhost:3000/api/stress-test/scenarios/${scenarioId}`);
    const scenarioData = await scenarioResponse.json();
    
    if (!scenarioData.success) {
      return res.status(404).json({
        success: false,
        error: `Scenario ${scenarioId} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Prepare data for Python calculation
    const stressTestData = {
      scenario: scenarioData.scenario,
      portfolio: portfolioData.portfolio,
      options: {
        confidenceLevel: options.confidenceLevel || 0.95,
        timeHorizon: options.timeHorizon || 1,
        includeGreeks: options.includeGreeks || false,
        includeFactorAttribution: options.includeFactorAttribution || true,
        ...options
      },
      timestamp: new Date().toISOString()
    };

    // Create temporary files for Python script
    const timestamp = Date.now();
    const inputFile = path.join(__dirname, '..', 'temp', `stress_test_input_${timestamp}.json`);
    const outputFile = path.join(__dirname, '..', 'temp', `stress_test_output_${timestamp}.json`);
    
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write input data
    fs.writeFileSync(inputFile, JSON.stringify(stressTestData, null, 2));

    // Run Python stress test calculation
    const pythonScript = path.join(__dirname, '..', 'stress_test_calculator.py');
    const pythonArgs = [
      pythonScript,
      '--input', inputFile,
      '--output', outputFile,
      '--verbose'
    ];

    // Use virtual environment Python interpreter
    const pythonExecutable = path.join(__dirname, '..', '..', 'venv', 'bin', 'python3');
    const fallbackPython = 'python3'; // Fallback to system python if venv not found
    
    // Check if virtual environment Python exists
    const pythonCmd = fs.existsSync(pythonExecutable) ? pythonExecutable : fallbackPython;

    console.log('🐍 Running Python stress test calculation...');
    console.log('Python executable:', pythonCmd);
    console.log('Command:', `${pythonCmd} ${pythonArgs.join(' ')}`);

    const pythonProcess = spawn(pythonCmd, pythonArgs);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Python script failed:', stderr);
        return res.status(500).json({
          success: false,
          error: 'Stress test calculation failed',
          details: stderr,
          timestamp: new Date().toISOString()
        });
      }

      try {
        // Read results from output file
        const results = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        
        // Clean up temporary files
        fs.unlinkSync(inputFile);
        fs.unlinkSync(outputFile);
        
        console.log('✅ Stress test calculation completed successfully');
        console.log('Results:', {
          portfolioValue: results.portfolioValue,
          stressedValue: results.stressedValue,
          totalImpact: results.totalImpact,
          totalImpactPercent: results.totalImpactPercent
        });

        res.json({
          success: true,
          results: results,
          metadata: {
            scenarioId,
            portfolioId,
            executionTime: Date.now() - timestamp,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('❌ Error reading results:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to read calculation results',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

  } catch (error) {
    console.error('❌ Error in stress test API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get stress test history
 */
router.get('/history', async (req, res) => {
  try {
    const { portfolioId, scenarioId, limit = 10 } = req.query;
    
    console.log('📊 API: Getting stress test history...');
    
    // Mock history data - in real implementation, this would come from database
    const history = [
      {
        id: 'run_1',
        scenarioId: 'TMPL0006',
        portfolioId: 'income-portfolio',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        results: {
          portfolioValue: 250000,
          stressedValue: 225000,
          totalImpact: -25000,
          totalImpactPercent: -10.0
        }
      },
      {
        id: 'run_2',
        scenarioId: 'TMPL0001',
        portfolioId: 'growth-portfolio',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        results: {
          portfolioValue: 500000,
          stressedValue: 275000,
          totalImpact: -225000,
          totalImpactPercent: -45.0
        }
      }
    ];

    // Filter by portfolio or scenario if specified
    let filteredHistory = history;
    if (portfolioId) {
      filteredHistory = filteredHistory.filter(h => h.portfolioId === portfolioId);
    }
    if (scenarioId) {
      filteredHistory = filteredHistory.filter(h => h.scenarioId === scenarioId);
    }

    // Apply limit
    filteredHistory = filteredHistory.slice(0, parseInt(limit));

    res.json({
      success: true,
      history: filteredHistory,
      count: filteredHistory.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting stress test history:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 
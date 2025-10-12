import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
            price: 150,
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
            price: 300,
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
            price: 105,
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

    // Return mock stress test results
    const mockResults = {
      success: true,
      portfolioValue: 250000,
      stressedValue: 187500,
      totalImpact: -62500,
      totalImpactPercent: -25.0,
      metadata: {
        scenarioId: scenarioId,
        scenarioName: `Market Decline Scenario`,
        portfolioId: portfolioId,
        portfolioName: `Portfolio ${portfolioId}`,
        calculationTime: new Date().toISOString(),
        assetsCount: 4
      },
      assetResults: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc',
          current_value: 75000,
          stressed_value: 56250,
          impact_value: -18750,
          impact_percent: -25.0,
          contribution_to_portfolio: -7.5,
          factor_contributions: {
            equity: -18750,
            rates: 0,
            credit: 0,
            fx: 0,
            commodity: 0
          }
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corp',
          current_value: 50000,
          stressed_value: 37500,
          impact_value: -12500,
          impact_percent: -25.0,
          contribution_to_portfolio: -5.0,
          factor_contributions: {
            equity: -12500,
            rates: 0,
            credit: 0,
            fx: 0,
            commodity: 0
          }
        },
        {
          symbol: 'AGG',
          name: 'iShares Core US Aggregate Bond ETF',
          current_value: 75000,
          stressed_value: 73500,
          impact_value: -1500,
          impact_percent: -2.0,
          contribution_to_portfolio: -0.6,
          factor_contributions: {
            equity: 0,
            rates: -1500,
            credit: 0,
            fx: 0,
            commodity: 0
          }
        },
        {
          symbol: 'GLD',
          name: 'SPDR Gold Shares',
          current_value: 50000,
          stressed_value: 42500,
          impact_value: -7500,
          impact_percent: -15.0,
          contribution_to_portfolio: -3.0,
          factor_contributions: {
            equity: 0,
            rates: 0,
            credit: 0,
            fx: 0,
            commodity: -7500
          }
        }
      ],
      assetClassImpacts: {
        equity: { current_value: 125000, impact_value: -31250, impact_percent: -25.0, weight: 0.5 },
        bond: { current_value: 75000, impact_value: -1500, impact_percent: -2.0, weight: 0.3 },
        commodity: { current_value: 50000, impact_value: -7500, impact_percent: -15.0, weight: 0.2 }
      },
      scenarioFactors: {
        equity: -25.0,
        rates: 2.0,
        credit: 1.0,
        fx: 5.0,
        commodity: -15.0
      },
      riskMetrics: {
        concentration: 0.3,
        diversification: 0.7,
        coverage: 95,
        tailRisk: -8.5,
        volatilityImpact: 0.22
      },
      greeks: {
        delta: 0.65,
        gamma: 0.02,
        theta: -0.01,
        vega: 0.15,
        rho: 0.08
      },
      factorAttribution: {
        equity: -31250,
        rates: 1000,
        credit: 500,
        fx: 2500,
        commodity: -7500
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Returning mock stress test results');
    return res.json(mockResults);

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
    
    // Mock history data
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
      }
    ];

    // Filter by portfolioId and scenarioId if provided
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

export default router;
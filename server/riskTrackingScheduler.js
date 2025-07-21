const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://qlyqxlzlxdqboxpxpdjp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required for the risk tracking scheduler');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Risk Tracking Scheduler
 * 
 * This service runs daily at market close to:
 * 1. Calculate portfolio risk metrics for all active portfolios
 * 2. Store metrics in the database with historical tracking
 * 3. Check risk thresholds and trigger alerts
 * 4. Update portfolio performance data
 * 
 * Schedule:
 * - Daily: 6:00 PM EST (after US market close)
 * - Weekend: Once on Sunday for weekly summary
 * - Month-end: Additional calculations for monthly reports
 */

class RiskTrackingScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRunTime = null;
  }

  /**
   * Calculate risk metrics for a single portfolio
   */
  async calculatePortfolioRiskMetrics(portfolio) {
    try {
      console.log(`Calculating risk metrics for portfolio: ${portfolio.name} (${portfolio.id})`);

      // Get portfolio holdings
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select(`
          *,
          assets:asset_id (symbol, name, asset_type)
        `)
        .eq('portfolio_id', portfolio.id)
        .gt('quantity', 0);

      if (holdingsError) {
        throw new Error(`Failed to fetch holdings: ${holdingsError.message}`);
      }

      if (!holdings || holdings.length === 0) {
        console.log(`No holdings found for portfolio ${portfolio.id}, skipping`);
        return;
      }

      // Prepare portfolio data for Python script
      const portfolioData = {
        portfolio_id: portfolio.id,
        portfolio_name: portfolio.name,
        base_currency: portfolio.base_currency || 'USD',
        assets: holdings.map(holding => ({
          symbol: holding.assets.symbol,
          name: holding.assets.name,
          quantity: parseFloat(holding.quantity),
          price: parseFloat(holding.current_price || 0),
          market_value: parseFloat(holding.market_value || 0),
          weight: parseFloat(holding.weight_percent || 0) / 100
        })),
        total_value: holdings.reduce((sum, h) => sum + parseFloat(h.market_value || 0), 0),
        calculation_date: new Date().toISOString().split('T')[0],
        methodology: 'parametric',
        confidence_levels: [0.90, 0.95, 0.99],
        time_horizons: [1, 5, 10, 22] // 1 day, 1 week, 2 weeks, 1 month
      };

      // Save input data temporarily
      const inputFile = path.join(__dirname, 'temp', `risk_input_${portfolio.id}_${Date.now()}.json`);
      const outputFile = path.join(__dirname, 'temp', `risk_output_${portfolio.id}_${Date.now()}.json`);

      await fs.mkdir(path.dirname(inputFile), { recursive: true });
      await fs.writeFile(inputFile, JSON.stringify(portfolioData, null, 2));

      // Run Python risk calculation
      const pythonResults = await this.runPythonRiskCalculation(inputFile, outputFile);

      // Store results in database
      await this.storeRiskMetrics(portfolio.id, pythonResults);

      // Clean up temporary files
      await fs.unlink(inputFile).catch(() => {});
      await fs.unlink(outputFile).catch(() => {});

      console.log(`✅ Risk metrics calculated and stored for portfolio ${portfolio.id}`);

    } catch (error) {
      console.error(`❌ Error calculating risk metrics for portfolio ${portfolio.id}:`, error);
    }
  }

  /**
   * Run Python risk calculation script
   */
  async runPythonRiskCalculation(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'calculate_risk_metrics.py');
      const pythonProcess = spawn('python3', [
        pythonScript,
        '--input', inputFile,
        '--output', outputFile,
        '--skip-chart' // Don't generate charts for scheduled runs
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', async (code) => {
        if (code === 0) {
          try {
            const results = JSON.parse(await fs.readFile(outputFile, 'utf8'));
            resolve(results);
          } catch (error) {
            reject(new Error(`Failed to parse Python output: ${error.message}`));
          }
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      // Set timeout for long-running calculations
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python calculation timed out after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Store calculated risk metrics in the database
   */
  async storeRiskMetrics(portfolioId, results) {
    const today = new Date().toISOString().split('T')[0];
    
    // Store individual risk metrics
    const riskMetrics = [
      {
        portfolio_id: portfolioId,
        metric_type: 'volatility',
        value: results.volatility / 100, // Store as decimal
        confidence_level: null,
        time_horizon: 252, // Annualized
        calculation_date: today,
        methodology: 'parametric',
        parameters: { annualized: true }
      },
      {
        portfolio_id: portfolioId,
        metric_type: 'sharpe_ratio',
        value: results.sharpeRatio,
        confidence_level: null,
        time_horizon: 252,
        calculation_date: today,
        methodology: 'parametric',
        parameters: { risk_free_rate: 0.02 }
      },
      {
        portfolio_id: portfolioId,
        metric_type: 'beta',
        value: results.beta,
        confidence_level: null,
        time_horizon: 252,
        calculation_date: today,
        methodology: 'parametric',
        parameters: { benchmark: 'SPY' }
      },
      {
        portfolio_id: portfolioId,
        metric_type: 'max_drawdown',
        value: results.maxDrawdown / 100,
        confidence_level: null,
        time_horizon: null,
        calculation_date: today,
        methodology: 'historical',
        parameters: { lookback_days: 252 }
      }
    ];

    // Add VaR metrics for different confidence levels if available
    if (results.varResults) {
      Object.entries(results.varResults).forEach(([confidenceLevel, varData]) => {
        riskMetrics.push({
          portfolio_id: portfolioId,
          metric_type: 'var',
          value: varData.varPercentage / 100,
          confidence_level: parseFloat(confidenceLevel),
          time_horizon: 1,
          calculation_date: today,
          methodology: 'parametric',
          parameters: { 
            var_value: varData.varValue,
            distribution: 'normal'
          }
        });

        riskMetrics.push({
          portfolio_id: portfolioId,
          metric_type: 'cvar',
          value: varData.cvarPercentage / 100,
          confidence_level: parseFloat(confidenceLevel),
          time_horizon: 1,
          calculation_date: today,
          methodology: 'parametric',
          parameters: {
            cvar_value: varData.cvarValue,
            distribution: 'normal'
          }
        });
      });
    }

    // Upsert risk metrics (replace if same portfolio/metric/date exists)
    const { error: metricsError } = await supabase
      .from('risk_metrics')
      .upsert(riskMetrics, {
        onConflict: 'portfolio_id,metric_type,confidence_level,time_horizon,calculation_date'
      });

    if (metricsError) {
      throw new Error(`Failed to store risk metrics: ${metricsError.message}`);
    }

    // Store portfolio performance data
    await this.storePortfolioPerformance(portfolioId, results);

    // Check risk thresholds and trigger alerts
    await this.checkRiskThresholds(portfolioId, results);
  }

  /**
   * Store daily portfolio performance data
   */
  async storePortfolioPerformance(portfolioId, results) {
    const today = new Date().toISOString().split('T')[0];

    // Get portfolio current value
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('current_value')
      .eq('id', portfolioId)
      .single();

    // Get previous day's performance for comparison
    const { data: previousPerformance } = await supabase
      .from('portfolio_performance')
      .select('total_value')
      .eq('portfolio_id', portfolioId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const currentValue = parseFloat(portfolio?.current_value || 0);
    const previousValue = parseFloat(previousPerformance?.total_value || currentValue);
    const dailyReturn = previousValue > 0 ? (currentValue - previousValue) / previousValue : 0;

    const performanceData = {
      portfolio_id: portfolioId,
      date: today,
      total_value: currentValue,
      daily_return: dailyReturn,
      cumulative_return: results.annualReturn ? results.annualReturn / 100 : null,
      benchmark_return: null, // Could be fetched from market data API
      alpha: null, // Could be calculated with benchmark data
      beta: results.beta,
      sharpe_ratio: results.sharpeRatio,
      volatility: results.volatility / 100,
      max_drawdown: results.maxDrawdown / 100
    };

    const { error } = await supabase
      .from('portfolio_performance')
      .upsert(performanceData, {
        onConflict: 'portfolio_id,date'
      });

    if (error) {
      throw new Error(`Failed to store performance data: ${error.message}`);
    }
  }

  /**
   * Check risk thresholds and trigger alerts
   */
  async checkRiskThresholds(portfolioId, results) {
    // Get user's risk preferences
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select(`
        *,
        profiles:user_id (*)
      `)
      .eq('id', portfolioId)
      .single();

    if (!portfolio) return;

    const alerts = [];

    // Check VaR threshold (default 5%)
    const varThreshold = portfolio.risk_profile?.var_95 || 0.05;
    if (results.varResults?.['0.95']?.varPercentage / 100 > varThreshold) {
      alerts.push({
        user_id: portfolio.user_id,
        portfolio_id: portfolioId,
        alert_type: 'var_breach',
        condition_type: 'above',
        threshold_value: varThreshold,
        current_value: results.varResults['0.95'].varPercentage / 100,
        message: `Portfolio VaR (${(results.varResults['0.95'].varPercentage).toFixed(2)}%) exceeds threshold (${(varThreshold * 100).toFixed(2)}%)`,
        is_triggered: true,
        triggered_at: new Date().toISOString()
      });
    }

    // Check volatility threshold (default 25%)
    const volatilityThreshold = 0.25;
    if (results.volatility / 100 > volatilityThreshold) {
      alerts.push({
        user_id: portfolio.user_id,
        portfolio_id: portfolioId,
        alert_type: 'performance',
        condition_type: 'above',
        threshold_value: volatilityThreshold,
        current_value: results.volatility / 100,
        message: `Portfolio volatility (${results.volatility.toFixed(2)}%) is high`,
        is_triggered: true,
        triggered_at: new Date().toISOString()
      });
    }

    // Check Sharpe ratio threshold (default < 0.5 is concerning)
    if (results.sharpeRatio < 0.5) {
      alerts.push({
        user_id: portfolio.user_id,
        portfolio_id: portfolioId,
        alert_type: 'performance',
        condition_type: 'below',
        threshold_value: 0.5,
        current_value: results.sharpeRatio,
        message: `Low Sharpe ratio (${results.sharpeRatio.toFixed(2)}) indicates poor risk-adjusted returns`,
        is_triggered: true,
        triggered_at: new Date().toISOString()
      });
    }

    // Insert alerts if any
    if (alerts.length > 0) {
      const { error } = await supabase
        .from('alerts')
        .insert(alerts);

      if (error) {
        console.error('Failed to create alerts:', error);
      } else {
        console.log(`Created ${alerts.length} risk alerts for portfolio ${portfolioId}`);
      }
    }
  }

  /**
   * Get all active portfolios for risk calculation
   */
  async getActivePortfolios() {
    const { data: portfolios, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to fetch portfolios: ${error.message}`);
    }

    return portfolios || [];
  }

  /**
   * Main daily risk calculation job
   */
  async runDailyRiskCalculation() {
    if (this.isRunning) {
      console.log('Risk calculation already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      console.log('🚀 Starting daily risk calculation job...');

      const portfolios = await this.getActivePortfolios();
      console.log(`Found ${portfolios.length} active portfolios to process`);

      // Process portfolios in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < portfolios.length; i += batchSize) {
        const batch = portfolios.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(portfolio => this.calculatePortfolioRiskMetrics(portfolio))
        );

        // Small delay between batches
        if (i + batchSize < portfolios.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const duration = (new Date() - startTime) / 1000;
      console.log(`✅ Daily risk calculation completed in ${duration}s`);
      this.lastRunTime = new Date();

    } catch (error) {
      console.error('❌ Daily risk calculation failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduler
   */
  start() {
    console.log('🔄 Starting Risk Tracking Scheduler...');

    // Daily calculation at 6:00 PM EST (after US market close)
    // This runs Monday-Friday
    cron.schedule('0 18 * * 1-5', () => {
      console.log('⏰ Daily risk calculation triggered');
      this.runDailyRiskCalculation();
    }, {
      timezone: "America/New_York"
    });

    // Weekly summary on Sunday at 10:00 AM EST
    cron.schedule('0 10 * * 0', () => {
      console.log('⏰ Weekly risk summary triggered');
      this.runWeeklyRiskSummary();
    }, {
      timezone: "America/New_York"
    });

    // Monthly calculation on the last day of the month at 7:00 PM EST
    cron.schedule('0 19 28-31 * *', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Only run if tomorrow is the first day of next month
      if (tomorrow.getDate() === 1) {
        console.log('⏰ Month-end risk calculation triggered');
        this.runMonthEndCalculation();
      }
    }, {
      timezone: "America/New_York"
    });

    console.log('✅ Risk Tracking Scheduler started successfully');
    console.log('📅 Schedule:');
    console.log('   - Daily: 6:00 PM EST (Mon-Fri)');
    console.log('   - Weekly: 10:00 AM EST (Sunday)');
    console.log('   - Monthly: 7:00 PM EST (Last day of month)');
  }

  /**
   * Weekly risk summary calculation
   */
  async runWeeklyRiskSummary() {
    try {
      console.log('📊 Running weekly risk summary...');
      
      // Get portfolios and calculate weekly performance metrics
      const portfolios = await this.getActivePortfolios();
      
      for (const portfolio of portfolios) {
        // Get last week's performance data
        const { data: weeklyData } = await supabase
          .from('portfolio_performance')
          .select('*')
          .eq('portfolio_id', portfolio.id)
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (weeklyData && weeklyData.length > 0) {
          // Calculate weekly metrics
          const weeklyReturn = weeklyData.reduce((sum, day) => sum + (day.daily_return || 0), 0);
          const avgVolatility = weeklyData.reduce((sum, day) => sum + (day.volatility || 0), 0) / weeklyData.length;
          
          console.log(`📈 Portfolio ${portfolio.name}: Weekly return ${(weeklyReturn * 100).toFixed(2)}%, Avg volatility ${(avgVolatility * 100).toFixed(2)}%`);
        }
      }

    } catch (error) {
      console.error('❌ Weekly risk summary failed:', error);
    }
  }

  /**
   * Month-end risk calculation with additional metrics
   */
  async runMonthEndCalculation() {
    try {
      console.log('📊 Running month-end risk calculation...');
      
      // Run standard daily calculation
      await this.runDailyRiskCalculation();
      
      // Add month-end specific calculations here
      // Such as monthly performance reports, correlation analysis, etc.
      
    } catch (error) {
      console.error('❌ Month-end calculation failed:', error);
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    console.log('⏹️ Stopping Risk Tracking Scheduler...');
    // Cron jobs are automatically stopped when the process exits
  }
}

// Create and export scheduler instance
const riskTracker = new RiskTrackingScheduler();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping risk tracker...');
  riskTracker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping risk tracker...');
  riskTracker.stop();
  process.exit(0);
});

module.exports = riskTracker;

// Start scheduler if this file is run directly
if (require.main === module) {
  riskTracker.start();
} 
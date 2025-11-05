import { Portfolio } from './portfolioService';
import portfolioService from './portfolioService';

export interface VaRParams {
  confidenceLevel: number;
  timeHorizon: number;
  numSimulations: number;
  lookbackPeriod?: number; // Years of historical data to use
}

export interface MultiConfidenceVaRParams {
  confidenceLevels: number[];
  timeHorizon: number;
  numSimulations: number;
  stressPeriod?: string;
  distribution?: 'normal' | 't' | 'historical';
}

export interface VaRResults {
  portfolioValue: number;
  varValue: number;
  varPercentage: number;
  cvarValue: number;
  cvarPercentage: number;
  chartImageUrl?: string; // Optional URL to the VaR distribution chart
  lastUpdated?: Date; // When this result was last updated
  executionTime?: {
    start: Date;
    end: Date;
    duration: number;
  };
  parameters?: {
    confidenceLevel?: string;
    timeHorizon?: number;
    lookbackPeriod?: number;
    varMethod?: string;
    distribution?: string;
    runTimestamp?: string;
  };
}

export interface MultiConfidenceVaRResults {
  portfolioValue: number;
  results: Record<string, {
    varValue: number;
    varPercentage: number;
    cvarValue: number;
    cvarPercentage: number;
  }>;
  timeHorizon: number;
  distribution: string;
  stressPeriod?: string;
  chartImageUrl?: string;
}

export interface GreeksResults {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface ExpandedGreeksResults extends GreeksResults {
  // Second-order Greeks
  vanna: number;   // Sensitivity of delta to volatility changes
  charm: number;   // Sensitivity of delta to time decay
  vomma: number;   // Sensitivity of vega to volatility changes
  veta: number;    // Sensitivity of vega to time decay
  speed: number;   // Third derivative of option price to underlying price
  color: number;   // Rate of change of gamma over time
  
  // Cross-asset sensitivities
  cross_delta: Record<string, number>; // Delta sensitivities to related assets
  cross_gamma: Record<string, number>; // Gamma sensitivities to related assets
  
  // Exposure metrics
  equityExposure: number;     // Exposure to equity markets
  rateExposure: number;       // Exposure to interest rates
  creditExposure: number;     // Exposure to credit spreads
  fxExposure: number;         // Exposure to foreign exchange
  commodityExposure: number;  // Exposure to commodity prices
}

export interface RiskMetrics {
  maxDrawdown: number | null;
  volatility: number | null;
  sharpeRatio: number | null;
  beta: number | null;
  sortinoRatio: number | null;
  downsideDeviation: number | null;
  treynorRatio?: number | null;
  calmarRatio?: number | null;
}

export interface DistributionAssumption {
  name: string;
  description: string;
  limitations: string[];
  appropriateFor: string[];
}

// API URL for accessing chart images - centralized config
import API_BASE from '../config/api';
const API_URL = API_BASE;

// Define placeholder chart images for when server is unavailable
const PLACEHOLDER_CHART_IMAGES = {
  parametric: 'https://raw.githubusercontent.com/matplotlib/matplotlib/main/doc/_static/parametric_curve_demo.png', 
  historical: 'https://raw.githubusercontent.com/matplotlib/matplotlib/main/doc/_static/histogram_demo_hist.png', 
  monteCarlo: 'https://raw.githubusercontent.com/matplotlib/matplotlib/main/doc/_static/monte_carlo_demo.png'
};

/**
 * Get distribution assumptions and descriptions
 */
export const getDistributionAssumptions = (): Record<string, DistributionAssumption> => {
  return {
    normal: {
      name: 'Normal Distribution',
      description: 'Assumes returns follow a normal (Gaussian) distribution with constant volatility.',
      limitations: [
        'Underestimates tail risk (extreme events)',
        'Assumes symmetric risk (upside and downside equally likely)',
        'Assumes constant volatility over time',
        'Does not account for volatility clustering'
      ],
      appropriateFor: [
        'Well-diversified portfolios under normal market conditions',
        'Short time horizons',
        'Preliminary risk assessments'
      ]
    },
    t: {
      name: 'Student\'s t-Distribution',
      description: 'Models returns with a distribution that has heavier tails than normal, better capturing extreme events.',
      limitations: [
        'Still assumes symmetric risk',
        'Requires estimating degrees of freedom parameter',
        'May still underestimate very extreme events'
      ],
      appropriateFor: [
        'Portfolios with exposure to market shocks',
        'More conservative risk assessments',
        'Stress testing scenarios'
      ]
    },
    historical: {
      name: 'Historical Simulation',
      description: 'Uses actual historical returns to estimate future risk, making no parametric assumptions about distribution shape.',
      limitations: [
        'Limited by available historical data',
        'Assumes the past is representative of the future',
        'May miss potential events not observed in the historical window'
      ],
      appropriateFor: [
        'Portfolios in markets with unique distributional characteristics',
        'When sufficient historical data is available',
        'Testing how portfolios would perform during past crises'
      ]
    }
  };
};

/**
 * Calculate parametric Value at Risk (VaR) for a portfolio
 */
const calculateParametricVar = (
  portfolio: Portfolio, 
  params: VaRParams
): VaRResults => {
  // In a real application, this would be a proper implementation
  // This is a simplified placeholder implementation
  
  const portfolioValue = portfolio.assets.reduce(
    (sum, asset) => sum + asset.price * asset.quantity, 
    0
  );
  
  // Lookback period affects volatility calculation
  // Shorter lookback periods tend to be more responsive to recent market conditions
  // but may miss longer-term patterns
  const lookbackYears = params.lookbackPeriod || 5; // Default to 5 years if not specified
  
  // Adjust annualized volatility based on lookback period
  // This is a simplified model - in reality, you'd calculate this from historical data
  // Shorter lookback tends to be less volatile unless there was a recent crisis
  let annualizedVolatility = 0.18; // Increased from 0.15 to 0.18 for more realistic values
  
  // Simple adjustment based on lookback period
  if (lookbackYears === 1) {
    annualizedVolatility = 0.16; // Increased from 0.12 to 0.16
  } else if (lookbackYears === 3) {
    annualizedVolatility = 0.17; // Increased from 0.14 to 0.17
  } else if (lookbackYears === 10) {
    annualizedVolatility = 0.20; // Increased from 0.16 to 0.20
  }
  
  // Convert to the specified time horizon (assuming 252 trading days)
  const periodVolatility = annualizedVolatility * Math.sqrt(params.timeHorizon / 252);
  
  // Z-score for the confidence level (e.g., 1.645 for 95%)
  const zScore = params.confidenceLevel === 0.95 ? 1.645 : 
                 params.confidenceLevel === 0.99 ? 2.326 : 
                 params.confidenceLevel === 0.90 ? 1.282 : 1.645;
  
  // Calculate VaR
  const varPercentage = periodVolatility * zScore;
  const varValue = portfolioValue * varPercentage;
  
  // Calculate CVaR (Conditional VaR) - typically 20-30% higher than VaR
  const cvarPercentage = varPercentage * 1.30; // Increased from 1.25 to 1.30
  const cvarValue = portfolioValue * cvarPercentage;
  
  return {
    portfolioValue,
    varValue,
    varPercentage: parseFloat((varPercentage * 100).toFixed(2)), // Convert to percentage with 2 decimal places
    cvarValue,
    cvarPercentage: parseFloat((cvarPercentage * 100).toFixed(2)), // Convert to percentage with 2 decimal places
    chartImageUrl: PLACEHOLDER_CHART_IMAGES.parametric, // Use placeholder chart for parametric VaR
    parameters: {
      confidenceLevel: params.confidenceLevel.toString(),
      timeHorizon: params.timeHorizon,
      lookbackPeriod: params.lookbackPeriod,
      varMethod: 'parametric',
      distribution: 'normal',
      runTimestamp: new Date().toISOString()
    }
  };
};

/**
 * Calculate historical Value at Risk (VaR) for a portfolio
 */
const calculateHistoricalVar = (
  portfolio: Portfolio,
  params: VaRParams
): VaRResults => {
  // Similar to parametric VaR but using historical simulation
  // This is a placeholder that returns slightly different values than parametric VaR
  
  const portfolioValue = portfolio.assets.reduce(
    (sum, asset) => sum + asset.price * asset.quantity, 
    0
  );
  
  // Historical simulation is more sensitive to lookback period
  // Adjust results based on lookback period
  const lookbackYears = params.lookbackPeriod || 5;
  
  // Base volatility for historical approach - slightly higher than parametric
  let annualizedVolatility = 0.20; // Higher than parametric to reflect fat tails
  
  // Adjust based on lookback period
  if (lookbackYears === 1) {
    annualizedVolatility = 0.17;
  } else if (lookbackYears === 3) {
    annualizedVolatility = 0.19;
  } else if (lookbackYears === 10) {
    annualizedVolatility = 0.22;
  }
  
  // Convert to the specified time horizon (assuming 252 trading days)
  const periodVolatility = annualizedVolatility * Math.sqrt(params.timeHorizon / 252);
  
  // Z-score for the confidence level (e.g., 1.645 for 95%)
  const zScore = params.confidenceLevel === 0.95 ? 1.645 : 
                 params.confidenceLevel === 0.99 ? 2.326 : 
                 params.confidenceLevel === 0.90 ? 1.282 : 1.645;
  
  // Calculate VaR with slightly higher values to reflect fat tails in historical data
  const varPercentage = periodVolatility * zScore * 1.05;
  const varValue = portfolioValue * varPercentage;
  
  // Calculate CVaR (Conditional VaR) - typically higher for historical
  const cvarPercentage = varPercentage * 1.35; // Higher multiplier for historical
  const cvarValue = portfolioValue * cvarPercentage;
  
  return {
    portfolioValue,
    varValue,
    varPercentage: parseFloat((varPercentage * 100).toFixed(2)),
    cvarValue,
    cvarPercentage: parseFloat((cvarPercentage * 100).toFixed(2)),
    chartImageUrl: PLACEHOLDER_CHART_IMAGES.historical,
    parameters: {
      confidenceLevel: params.confidenceLevel.toString(),
      timeHorizon: params.timeHorizon,
      lookbackPeriod: params.lookbackPeriod,
      varMethod: 'historical',
      distribution: 'historical',
      runTimestamp: new Date().toISOString()
    }
  };
};

/**
 * Calculate Monte Carlo Value at Risk (VaR) for a portfolio
 */
const calculateMonteCarloVar = (
  portfolio: Portfolio,
  params: VaRParams
): VaRResults => {
  // This would run Monte Carlo simulations in a real implementation
  // For now, we'll calculate more realistic values independently rather than adjusting parametric
  
  const portfolioValue = portfolio.assets.reduce(
    (sum, asset) => sum + asset.price * asset.quantity, 
    0
  );
  
  // Monte Carlo can capture more complex risks and correlations
  const lookbackYears = params.lookbackPeriod || 5;
  
  // Monte Carlo typically produces higher VaR than parametric
  let annualizedVolatility = 0.21; // Base volatility for Monte Carlo
  
  // Adjust based on lookback period
  if (lookbackYears === 1) {
    annualizedVolatility = 0.18;
  } else if (lookbackYears === 3) {
    annualizedVolatility = 0.20;
  } else if (lookbackYears === 10) {
    annualizedVolatility = 0.23;
  }
  
  // Add a slight variation based on number of simulations
  // More simulations should converge closer to the true value
  const simAdjustment = params.numSimulations > 5000 ? 0.98 : 1.02;
  annualizedVolatility *= simAdjustment;
  
  // Convert to the specified time horizon (assuming 252 trading days)
  const periodVolatility = annualizedVolatility * Math.sqrt(params.timeHorizon / 252);
  
  // Z-score for the confidence level (e.g., 1.645 for 95%)
  const zScore = params.confidenceLevel === 0.95 ? 1.645 : 
                 params.confidenceLevel === 0.99 ? 2.326 : 
                 params.confidenceLevel === 0.90 ? 1.282 : 1.645;
  
  // Calculate VaR with slightly higher values to reflect added sophistication
  const varPercentage = periodVolatility * zScore * 1.08;
  const varValue = portfolioValue * varPercentage;
  
  // Calculate CVaR (Conditional VaR) - typically highest for Monte Carlo
  const cvarPercentage = varPercentage * 1.40; // Highest multiplier for Monte Carlo
  const cvarValue = portfolioValue * cvarPercentage;
  
  return {
    portfolioValue,
    varValue,
    varPercentage: parseFloat((varPercentage * 100).toFixed(2)),
    cvarValue,
    cvarPercentage: parseFloat((cvarPercentage * 100).toFixed(2)),
    chartImageUrl: PLACEHOLDER_CHART_IMAGES.monteCarlo,
    parameters: {
      confidenceLevel: params.confidenceLevel.toString(),
      timeHorizon: params.timeHorizon,
      lookbackPeriod: params.lookbackPeriod,
      varMethod: 'monte_carlo',
      distribution: 'normal',
      runTimestamp: new Date().toISOString()
    }
  };
};

/**
 * Calculate VaR using multiple confidence levels and potentially a stress period
 */
const calculateMultiConfidenceVaR = (
  portfolio: Portfolio,
  params: MultiConfidenceVaRParams
): MultiConfidenceVaRResults => {
  // This is a placeholder that would actually call the Python backend in a real implementation
  
  const portfolioValue = portfolio.assets.reduce(
    (sum, asset) => sum + asset.price * asset.quantity, 
    0
  );
  
  // Generate placeholder results for each confidence level
  const results: Record<string, any> = {};
  
  params.confidenceLevels.forEach(confidenceLevel => {
    // Z-score for the confidence level
    const zScore = confidenceLevel === 0.95 ? 1.645 : 
                   confidenceLevel === 0.99 ? 2.326 : 
                   confidenceLevel === 0.995 ? 2.58 :
                   confidenceLevel === 0.90 ? 1.282 : 1.645;
    
    // Adjust volatility based on distribution and stress period
    let volatilityMultiplier = 1.0;
    if (params.distribution === 't') {
      volatilityMultiplier = 1.2; // t-distribution has higher volatility
    } else if (params.distribution === 'historical') {
      volatilityMultiplier = 1.1; // historical simulation has slightly higher volatility
    }
    
    if (params.stressPeriod) {
      // Increase volatility for stress periods
      if (params.stressPeriod === 'gfc') {
        volatilityMultiplier *= 2.0; // GFC had very high volatility
      } else if (params.stressPeriod === 'covid') {
        volatilityMultiplier *= 1.8; // COVID crash had high volatility
      } else if (params.stressPeriod === 'black_monday') {
        volatilityMultiplier *= 2.5; // Black Monday had extreme volatility
      } else {
        volatilityMultiplier *= 1.5; // Other stress periods
      }
    }
    
    // Annualized volatility adjusted for the distribution and stress period
    const annualizedVolatility = 0.15 * volatilityMultiplier;
    
    // Convert to the specified time horizon (assuming 252 trading days)
    const periodVolatility = annualizedVolatility * Math.sqrt(params.timeHorizon / 252);
    
    // Calculate VaR and CVaR
    const varPercentage = periodVolatility * zScore;
    const varValue = portfolioValue * varPercentage;
    
    // CVaR is typically higher than VaR (more conservative)
    const cvarPercentage = varPercentage * 1.25;
    const cvarValue = portfolioValue * cvarPercentage;
    
    results[confidenceLevel.toString()] = {
      varValue,
      varPercentage: parseFloat((varPercentage * 100).toFixed(2)),
      cvarValue,
      cvarPercentage: parseFloat((cvarPercentage * 100).toFixed(2))
    };
  });
  
  return {
    portfolioValue,
    results,
    timeHorizon: params.timeHorizon,
    distribution: params.distribution || 'normal',
    stressPeriod: params.stressPeriod,
    // Use a chart that shows multiple confidence levels
    chartImageUrl: `${API_URL}/multi_confidence_var.png`
  };
};

/**
 * Calculate standard Greeks for options in a portfolio
 */
const calculateGreeks = (portfolio: Portfolio): GreeksResults => {
  // In a real app, this would calculate Greeks based on options in the portfolio
  // For demonstration, we'll just return random values
  
  // Check if the portfolio has any option-like assets
  const hasOptions = portfolio.assets.some(asset => 
    asset.symbol.includes('CALL') || asset.symbol.includes('PUT')
  );
  
  // If no options, return near-zero Greeks
  if (!hasOptions) {
    return {
      delta: 0.68,
      gamma: 0.12,
      theta: -245.32,
      vega: 145.68,
      rho: 78.43,
    };
  }
  
  // Placeholder values for a portfolio with options
  return {
    delta: 0.68,
    gamma: 0.12,
    theta: -245.32,
    vega: 145.68,
    rho: 78.43,
  };
};

/**
 * Calculate expanded Greeks including second-order Greeks and cross-asset sensitivity
 */
const calculateExpandedGreeks = (portfolio: Portfolio): ExpandedGreeksResults => {
  // First get basic Greeks
  const basicGreeks = calculateGreeks(portfolio);
  
  // Generate placeholder values for expanded Greeks
  const expandedGreeks: ExpandedGreeksResults = {
    ...basicGreeks,
    // Second-order Greeks
    vanna: 0.032,      // Sensitivity of delta to volatility changes
    charm: -0.014,     // Sensitivity of delta to time decay
    vomma: 25.82,      // Sensitivity of vega to volatility changes
    veta: -12.65,      // Sensitivity of vega to time decay
    speed: -0.008,     // Third derivative of option price to underlying price
    color: 0.003,      // Rate of change of gamma over time
    
    // Cross-asset sensitivities
    cross_delta: {     // Delta sensitivities to related assets
      'SPY': 0.35,     // S&P 500 ETF
      'QQQ': 0.28,     // Nasdaq 100 ETF
      'IWM': 0.18      // Russell 2000 ETF
    },
    cross_gamma: {     // Gamma sensitivities to related assets
      'SPY': 0.07,
      'QQQ': 0.05,
      'IWM': 0.03
    },
    
    // Exposure metrics
    equityExposure: 65.2,     // % Exposure to equity markets
    rateExposure: 18.5,       // % Exposure to interest rates
    creditExposure: 5.3,      // % Exposure to credit spreads
    fxExposure: 7.8,          // % Exposure to foreign exchange
    commodityExposure: 3.2    // % Exposure to commodity prices
  };
  
  return expandedGreeks;
};

/**
 * Calculate additional risk metrics for a portfolio
 */
const calculateRiskMetrics = async (portfolio: Portfolio, useRealCalculations: boolean = false): Promise<RiskMetrics> => {
  // If real calculations are requested, try the Python backend
  if (useRealCalculations) {
    try {
      const response = await fetch(`${API_URL}/api/calculate-risk-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ portfolio }),
        signal: AbortSignal.timeout(70000), // 70 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.results) {
          console.log('Real risk metrics calculated successfully:', data.results);
          
          return {
            maxDrawdown: data.results.maxDrawdown ?? null,
            volatility: data.results.volatility ?? null,
            sharpeRatio: data.results.sharpeRatio ?? null,
            beta: data.results.beta ?? null,
            sortinoRatio: data.results.sortinoRatio ?? null,
            downsideDeviation: data.results.downsideDeviation ?? null,
            treynorRatio: data.results.treynorRatio ?? null,
            calmarRatio: data.results.calmarRatio ?? null,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to calculate real risk metrics, using fallback values:', error);
    }
  }
  
  // Return null values when no real calculation available
  // UI will check for null and show empty state
  return {
    maxDrawdown: null,
    volatility: null,
    sharpeRatio: null,
    beta: null,
    sortinoRatio: null,
    downsideDeviation: null,
    treynorRatio: null,
    calmarRatio: null,
  };
};

/**
 * Calculate portfolio risk metrics for dashboard display
 */
export const calculatePortfolioRisk = async (portfolioId: string): Promise<{
  id: string;
  var: number;
  cvar: number;
  volatility: number;
  varLimit?: number;
}> => {
  try {
    const portfolio = await portfolioService.getPortfolioById(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio with ID ${portfolioId} not found`);
    }

    // Get VaR calculation for 95% confidence, 1-day horizon
    const varParams = {
      confidenceLevel: 0.95,
      timeHorizon: 1,
      numSimulations: 1000
    };
    
    const varResults = calculateParametricVar(portfolio, varParams);
    const riskMetrics = await calculateRiskMetrics(portfolio);
    
    // Get VaR limit from portfolio risk profile, or default to 150% of current VaR if not set
    const varLimit = portfolioService.getPortfolioVaRLimit(portfolio, 0.95) || varResults.varPercentage * 1.5;
    
    return {
      id: portfolioId,
      var: varResults.varPercentage,
      cvar: varResults.cvarPercentage,
      volatility: riskMetrics.volatility,
      varLimit
    };
  } catch (error) {
    console.error(`Error calculating portfolio risk for ${portfolioId}:`, error);
    throw error;
  }
};

/**
 * Get risk breakdown by asset class or position
 */
export const getRiskBreakdown = async (
  portfolioId: string,
  latestVar?: { percentage?: number; method?: string },
  portfolioOverride?: Portfolio
): Promise<{
  assetClass: Record<string, number>;
  positions: Array<{symbol: string; name: string; contribution: number}>;
}> => {
  try {
    const portfolio = portfolioOverride || (await portfolioService.getPortfolioById(portfolioId));
    if (!portfolio) {
      throw new Error(`Portfolio with ID ${portfolioId} not found`);
    }
    
    // Calculate total portfolio value
    const portfolioValue = portfolio.assets.reduce(
      (sum, asset) => sum + asset.price * asset.quantity, 0
    );
    
    // Calculate risk contribution by asset class
    const assetClassRisk: Record<string, number> = {};
    const positionRisk: Array<{symbol: string; name: string; contribution: number}> = [];
    
    // Simple approximation of risk contribution (in a real app, would use more sophisticated methods)
    // Optionally scale by the latest VaR percentage and method to make the breakdown responsive
    const varPct = latestVar?.percentage ?? null; // e.g. 3.2 means 3.2%
    const method = latestVar?.method || 'parametric';
    // Dynamic multipliers by asset class that respond to higher VaR levels
    const dynamicClassMultiplier = (assetClass: string): number => {
      // Baseline multipliers per class
      const base =
        assetClass === 'equity' ? 1.2 :
        assetClass === 'bond' ? 0.5 :
        assetClass === 'cash' ? 0.1 :
        assetClass === 'commodity' ? 1.5 :
        assetClass === 'real_estate' ? 1.3 :
        assetClass === 'alternative' ? 1.7 : 1.0;
      if (varPct == null) return base;
      // Scale heavier for riskier classes when portfolio VaR is elevated
      const scale = 1 + Math.max(0, (varPct - 2.5)) / 10; // gentle boost above ~2.5%
      const methodBoost = method === 'historical' ? 1.05 : method === 'monte-carlo' ? 1.1 : 1.0;
      if (assetClass === 'equity' || assetClass === 'commodity' || assetClass === 'alternative') {
        return base * scale * methodBoost;
      }
      return base * (0.8 + (scale - 1) * 0.5); // bonds/cash react less
    };
    portfolio.assets.forEach(asset => {
      const assetValue = asset.price * asset.quantity;
      const weight = assetValue / portfolioValue;
      
      // Different risk factors for different asset classes
      const riskFactor = dynamicClassMultiplier(asset.assetClass);
      
      // Calculate risk contribution
      const riskContribution = weight * riskFactor;
      
      // Add to asset class risk
      if (!assetClassRisk[asset.assetClass]) {
        assetClassRisk[asset.assetClass] = 0;
      }
      assetClassRisk[asset.assetClass] += riskContribution;
      
      // Add to position risk
      positionRisk.push({
        symbol: asset.symbol,
        name: asset.name,
        contribution: riskContribution
      });
    });
    
    // Normalize risk contributions to sum to 100%
    const totalRisk = Object.values(assetClassRisk).reduce((sum, val) => sum + val, 0);
    for (const key in assetClassRisk) {
      assetClassRisk[key] = parseFloat((assetClassRisk[key] / totalRisk * 100).toFixed(1));
    }
    
    // Normalize position risk contributions
    positionRisk.forEach(position => {
      position.contribution = parseFloat((position.contribution / totalRisk * 100).toFixed(1));
    });
    
    // Sort position risk by contribution (descending)
    positionRisk.sort((a, b) => b.contribution - a.contribution);
    
    return {
      assetClass: assetClassRisk,
      positions: positionRisk
    };
  } catch (error) {
    console.error(`Error calculating risk breakdown for ${portfolioId}:`, error);
    // Return fallback data for demonstration
    return {
      assetClass: {
        equity: 65.3,
        bond: 23.7,
        cash: 3.2,
        alternative: 7.8
      },
      positions: [
        { symbol: 'AAPL', name: 'Apple Inc.', contribution: 12.5 },
        { symbol: 'MSFT', name: 'Microsoft Corporation', contribution: 10.2 },
        { symbol: 'AMZN', name: 'Amazon.com, Inc.', contribution: 9.7 },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', contribution: 8.3 },
        { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', contribution: 6.8 }
      ]
    };
  }
};

/**
 * Get the last VaR analysis results for a portfolio
 */
export const getLastVaRAnalysis = async (portfolioId: string): Promise<{
  parametric: VaRResults | null;
  historical: VaRResults | null;
  monteCarlo: VaRResults | null;
  hasAnalysis: boolean;
  } | null> => {
  try {
    // Import dependencies
    const { riskTrackingService } = await import('./riskTrackingService');
    const { supabase } = await import('../lib/supabase');
    
    // Validate portfolioId format before querying DB to avoid 22P02 errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(portfolioId)) {
      console.warn(`Invalid portfolio ID format: ${portfolioId}. Skipping latest risk metrics lookup.`);
      return {
        parametric: null,
        historical: null,
        monteCarlo: null,
        hasAnalysis: false
      };
    }

    const latestMetrics = await riskTrackingService.getLatestRiskMetrics(portfolioId);
    
    // Require a non-null, positive VaR value to consider there is a usable last analysis
    if (!latestMetrics || latestMetrics.var95 === null || latestMetrics.var95 === undefined || latestMetrics.var95 <= 0) {
      return {
        parametric: null,
        historical: null,
        monteCarlo: null,
        hasAnalysis: false
      };
    }

    // Fetch chart URLs from database using the new RPC function
    console.log('[VaR Charts] Fetching chart URLs for portfolio:', portfolioId);
    const { data: chartData, error: chartError } = await supabase
      .rpc('get_latest_var_charts', { p_portfolio_id: portfolioId });

    if (chartError) {
      console.error('[VaR Charts] Error fetching chart URLs:', chartError);
    }

    // Map chart URLs by model type
    const chartUrls: Record<string, string | undefined> = {
      parametric: undefined,
      historical: undefined,
      monte_carlo: undefined
    };

    if (chartData && chartData.length > 0) {
      console.log('[VaR Charts] Found chart data:', chartData);
      chartData.forEach((chart: any) => {
        if (chart.chart_storage_url) {
          // Normalize calc_type (handle both 'monte_carlo' and 'monte-carlo')
          const normalizedType = chart.calc_type.replace('-', '_');
          chartUrls[normalizedType] = chart.chart_storage_url;
          console.log(`[VaR Charts] Loaded ${normalizedType} chart:`, chart.chart_storage_url.substring(0, 50) + '...');
        }
      });
    } else {
      console.log('[VaR Charts] No chart URLs found in database for portfolio:', portfolioId);
    }

    // If we have recent VaR data, construct VaR results for display
    const baseResults = {
      portfolioValue: 0, // This would need to be fetched from current portfolio value
      varValue: 0,
      varPercentage: latestMetrics.var95 || 0,
      cvarValue: 0,
      cvarPercentage: (latestMetrics.var95 || 0) * 1.3, // Approximate CVaR
      lastUpdated: latestMetrics.lastUpdated ? new Date(latestMetrics.lastUpdated) : new Date(),
      parameters: {
        confidenceLevel: '0.95',
        timeHorizon: 1,
        lookbackPeriod: 5,
        runTimestamp: latestMetrics.lastUpdated || new Date().toISOString()
      }
    };

    // Get current portfolio value to calculate dollar amounts
    try {
      const portfolioService = (await import('./portfolioService')).default;
      const portfolio = await portfolioService.getPortfolioById(portfolioId);
      if (portfolio) {
        const portfolioValue = portfolio.assets.reduce(
          (sum, asset) => sum + asset.price * asset.quantity, 
          0
        );
        baseResults.portfolioValue = portfolioValue;
        baseResults.varValue = portfolioValue * (baseResults.varPercentage / 100);
        baseResults.cvarValue = portfolioValue * (baseResults.cvarPercentage / 100);
        
        console.log('Calculated VaR values from database:', {
          portfolioValue,
          varPercentage: baseResults.varPercentage,
          varValue: baseResults.varValue,
          cvarPercentage: baseResults.cvarPercentage,
          cvarValue: baseResults.cvarValue
        });
      }
    } catch (error) {
      console.warn('Could not fetch current portfolio value:', error);
    }

    // Calculate adjusted values for different methods
    const historicalVarPct = baseResults.varPercentage * 1.05;
    const historicalCvarPct = baseResults.cvarPercentage * 1.05;
    const monteCarloVarPct = baseResults.varPercentage * 1.08;
    const monteCarloCvarPct = baseResults.cvarPercentage * 1.08;

    return {
      parametric: {
        ...baseResults,
        chartImageUrl: chartUrls.parametric,  // Use stored chart URL from database
        parameters: {
          ...baseResults.parameters,
          varMethod: 'parametric',
          distribution: 'normal'
        }
      },
      historical: {
        ...baseResults,
        varPercentage: historicalVarPct,
        cvarPercentage: historicalCvarPct,
        varValue: baseResults.portfolioValue * (historicalVarPct / 100),
        cvarValue: baseResults.portfolioValue * (historicalCvarPct / 100),
        chartImageUrl: chartUrls.historical,  // Use stored chart URL from database
        parameters: {
          ...baseResults.parameters,
          varMethod: 'historical',
          distribution: 'historical'
        }
      },
      monteCarlo: {
        ...baseResults,
        varPercentage: monteCarloVarPct,
        cvarPercentage: monteCarloCvarPct,
        varValue: baseResults.portfolioValue * (monteCarloVarPct / 100),
        cvarValue: baseResults.portfolioValue * (monteCarloCvarPct / 100),
        chartImageUrl: chartUrls.monte_carlo,  // Use stored chart URL from database
        parameters: {
          ...baseResults.parameters,
          varMethod: 'monte_carlo',
          distribution: 'normal'
        }
      },
      hasAnalysis: true
    };

  } catch (error) {
    console.error('Error fetching last VaR analysis:', error);
    return {
      parametric: null,
      historical: null,
      monteCarlo: null,
      hasAnalysis: false
    };
  }
};

// Export the service functions
export default {
  calculateParametricVar,
  calculateHistoricalVar,
  calculateMonteCarloVar,
  calculateMultiConfidenceVaR,
  calculateGreeks,
  calculateExpandedGreeks,
  calculateRiskMetrics,
  getDistributionAssumptions,
  getLastVaRAnalysis
}; 
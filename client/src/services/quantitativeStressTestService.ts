import { Portfolio, Asset } from './portfolioService';
import tiingoService from './tiingoService';

// ==========================================
// QUANTITATIVE STRESS TESTING SERVICE
// ==========================================

/**
 * Asset classification and metadata
 */
interface AssetMetadata {
  symbol: string;
  sector: string;
  industry: string;
  marketCap: 'large' | 'mid' | 'small' | 'micro';
  geography: 'us' | 'international' | 'emerging';
  assetType: 'equity' | 'bond' | 'commodity' | 'real_estate' | 'alternative' | 'cash';
  duration?: number; // For bonds
  creditRating?: string; // For bonds
  underlyingIndex?: string; // For ETFs
}

/**
 * Factor sensitivities (betas) for each asset
 */
interface FactorSensitivities {
  equity: number;        // Equity market beta
  rates: number;         // Interest rate sensitivity (duration for bonds)
  credit: number;        // Credit spread sensitivity
  fx: number;           // Currency sensitivity
  commodity: number;    // Commodity sensitivity
  volatility: number;   // Volatility sensitivity (for options/complex instruments)
}

/**
 * Scenario factors with proper quantitative definitions
 */
interface ScenarioFactors {
  equity: number;        // Equity market shock (% change in broad market)
  rates: number;         // Interest rate shock (basis points change in 10Y Treasury)
  credit: number;        // Credit spread shock (basis points change in IG/HY spreads)
  fx: number;           // USD strength shock (% change in DXY)
  commodity: number;    // Commodity price shock (% change in commodity index)
  volatility?: number;  // Volatility shock (% change in VIX)
}

/**
 * Position-level stress test result
 */
interface PositionStressResult {
  symbol: string;
  assetClass: string;
  currentValue: number;
  stressedValue: number;
  impact: number;        // $ impact
  impactPercent: number; // % impact
  factorContributions: Record<string, number>; // Breakdown by factor
}

/**
 * Portfolio-level stress test result  
 */
interface PortfolioStressResult {
  portfolioValue: number;
  stressedValue: number;
  totalImpact: number;
  totalImpactPercent: number;
  positionResults: PositionStressResult[];
  assetClassImpacts: Record<string, { impact: number; impactPercent: number }>;
  factorAttribution: Record<string, number>;
  riskMetrics: {
    concentration: number;
    diversification: number;
    leverageEffect: number;
  };
}

/**
 * Asset classification database (in production, this would come from external data provider)
 */
const ASSET_CLASSIFICATIONS: Record<string, Partial<AssetMetadata>> = {
  // Equity ETFs
  'SPY': { sector: 'Broad Market', industry: 'Large Cap Equity', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'S&P 500' },
  'QQQ': { sector: 'Technology', industry: 'Large Cap Growth', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'NASDAQ-100' },
  'IWM': { sector: 'Broad Market', industry: 'Small Cap Equity', marketCap: 'small', geography: 'us', assetType: 'equity', underlyingIndex: 'Russell 2000' },
  'VTI': { sector: 'Broad Market', industry: 'Total Stock Market', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Total Stock Market' },
  'SCHD': { sector: 'Dividend', industry: 'Dividend ETF', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Dow Jones US Dividend 100' },
  
  // Bond ETFs
  'TLT': { sector: 'Government', industry: 'Treasury Bonds', geography: 'us', assetType: 'bond', duration: 17, creditRating: 'AAA' },
  'IEF': { sector: 'Government', industry: 'Treasury Bonds', geography: 'us', assetType: 'bond', duration: 7, creditRating: 'AAA' },
  'SHY': { sector: 'Government', industry: 'Treasury Bonds', geography: 'us', assetType: 'bond', duration: 2, creditRating: 'AAA' },
  'LQD': { sector: 'Corporate', industry: 'Investment Grade Corporate', geography: 'us', assetType: 'bond', duration: 8, creditRating: 'BBB' },
  'HYG': { sector: 'Corporate', industry: 'High Yield Corporate', geography: 'us', assetType: 'bond', duration: 4, creditRating: 'BB' },
  'VCIT': { sector: 'Corporate', industry: 'Intermediate Corporate', geography: 'us', assetType: 'bond', duration: 6, creditRating: 'A' },
  
  // Real Estate
  'VNQ': { sector: 'Real Estate', industry: 'REITs', geography: 'us', assetType: 'real_estate', underlyingIndex: 'MSCI US REIT' },
  'SCHH': { sector: 'Real Estate', industry: 'REITs', geography: 'us', assetType: 'real_estate', underlyingIndex: 'Dow Jones US REIT' },
  
  // Commodities
  'GLD': { sector: 'Precious Metals', industry: 'Gold', geography: 'us', assetType: 'commodity' },
  'SLV': { sector: 'Precious Metals', industry: 'Silver', geography: 'us', assetType: 'commodity' },
  'USO': { sector: 'Energy', industry: 'Oil', geography: 'us', assetType: 'commodity' },
  
  // International
  'EFA': { sector: 'Broad Market', industry: 'Developed Markets', marketCap: 'large', geography: 'international', assetType: 'equity' },
  'EEM': { sector: 'Broad Market', industry: 'Emerging Markets', marketCap: 'large', geography: 'emerging', assetType: 'equity' },
  
  // Individual Stocks (major holdings examples)
  'AAPL': { sector: 'Technology', industry: 'Consumer Electronics', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'MSFT': { sector: 'Technology', industry: 'Software', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'GOOGL': { sector: 'Technology', industry: 'Internet Services', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'AMZN': { sector: 'Consumer Discretionary', industry: 'E-commerce', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'TSLA': { sector: 'Consumer Discretionary', industry: 'Electric Vehicles', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'JPM': { sector: 'Financials', industry: 'Banking', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'JNJ': { sector: 'Healthcare', industry: 'Pharmaceuticals', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'WMT': { sector: 'Consumer Staples', industry: 'Retail', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'PG': { sector: 'Consumer Staples', industry: 'Personal Products', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'V': { sector: 'Financials', industry: 'Payment Processing', marketCap: 'large', geography: 'us', assetType: 'equity' }
};

/**
 * Factor sensitivity models based on asset characteristics
 */
function calculateFactorSensitivities(metadata: AssetMetadata): FactorSensitivities {
  const sensitivities: FactorSensitivities = {
    equity: 0,
    rates: 0,
    credit: 0,
    fx: 0,
    commodity: 0,
    volatility: 0
  };

  switch (metadata.assetType) {
    case 'equity':
      // Equity sensitivity based on market cap and sector
      sensitivities.equity = calculateEquityBeta(metadata);
      sensitivities.rates = calculateRatesSensitivityForEquity(metadata);
      sensitivities.fx = metadata.geography === 'international' ? 0.6 : 
                        metadata.geography === 'emerging' ? 0.8 : 0.1;
      sensitivities.volatility = 0.8; // Most equities have positive vol sensitivity
      break;
      
    case 'bond':
      sensitivities.rates = -(metadata.duration || 5); // Duration as rate sensitivity
      sensitivities.credit = calculateCreditSensitivity(metadata);
      sensitivities.fx = metadata.geography !== 'us' ? 0.7 : 0.05;
      break;
      
    case 'real_estate':
      sensitivities.equity = 0.6; // REITs correlated with equity markets
      sensitivities.rates = -0.8; // REITs sensitive to rates (but less than duration)
      sensitivities.credit = 0.3; // Some credit sensitivity
      break;
      
    case 'commodity':
      sensitivities.commodity = 1.0; // Direct commodity exposure
      sensitivities.fx = -0.4; // Commodities often inversely correlated with USD
      sensitivities.rates = -0.2; // Some negative correlation with rates
      break;
      
    case 'cash':
      sensitivities.rates = 0.05; // Slight positive rate sensitivity
      break;
  }

  return sensitivities;
}

/**
 * Calculate equity beta based on asset characteristics
 */
function calculateEquityBeta(metadata: AssetMetadata): number {
  let beta = 1.0; // Start with market beta
  
  // Adjust for market cap
  if (metadata.marketCap === 'small') beta *= 1.3;
  else if (metadata.marketCap === 'mid') beta *= 1.1;
  else if (metadata.marketCap === 'large') beta *= 0.95;
  
  // Adjust for sector
  const sectorBetas: Record<string, number> = {
    'Technology': 1.2,
    'Financials': 1.15,
    'Consumer Discretionary': 1.1,
    'Energy': 1.25,
    'Healthcare': 0.9,
    'Consumer Staples': 0.8,
    'Utilities': 0.7,
    'Real Estate': 0.9,
    'Dividend': 0.85 // Dividend-focused strategies tend to be lower beta
  };
  
  beta *= (sectorBetas[metadata.sector] || 1.0);
  
  // Adjust for geography
  if (metadata.geography === 'emerging') beta *= 1.4;
  else if (metadata.geography === 'international') beta *= 0.8;
  
  return Math.round(beta * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate rates sensitivity for equity assets
 */
function calculateRatesSensitivityForEquity(metadata: AssetMetadata): number {
  // High-dividend and utility stocks are more rate-sensitive
  if (metadata.sector === 'Utilities') return -0.6;
  if (metadata.sector === 'Real Estate') return -0.5;
  if (metadata.sector === 'Dividend') return -0.4;
  if (metadata.sector === 'Financials') return 0.3; // Banks benefit from higher rates
  if (metadata.sector === 'Technology') return -0.2; // Growth stocks hurt by higher rates
  
  return -0.1; // Default slight negative sensitivity
}

/**
 * Calculate credit sensitivity for bonds
 */
function calculateCreditSensitivity(metadata: AssetMetadata): number {
  if (!metadata.creditRating) return 0;
  
  const creditSensitivities: Record<string, number> = {
    'AAA': 0.1,
    'AA': 0.2,
    'A': 0.4,
    'BBB': 0.6,
    'BB': 1.2,
    'B': 1.8,
    'CCC': 2.5
  };
  
  return creditSensitivities[metadata.creditRating] || 0.5;
}

/**
 * Get enhanced asset metadata by combining stored data with real-time lookups
 */
async function getAssetMetadata(symbol: string): Promise<AssetMetadata> {
  // Start with stored classification
  const storedData = ASSET_CLASSIFICATIONS[symbol] || {};
  
  try {
    // Get additional metadata from Tiingo
    const metadata = await tiingoService.getMetadata(symbol);
    
    return {
      symbol,
      sector: storedData.sector || 'Unknown',
      industry: storedData.industry || metadata.name || 'Unknown',
      marketCap: storedData.marketCap || 'large',
      geography: storedData.geography || 'us',
      assetType: storedData.assetType || 'equity',
      duration: storedData.duration,
      creditRating: storedData.creditRating,
      underlyingIndex: storedData.underlyingIndex
    };
  } catch (error) {
    console.warn(`Could not fetch metadata for ${symbol}, using defaults`);
    return {
      symbol,
      sector: storedData.sector || 'Unknown',
      industry: storedData.industry || 'Unknown',
      marketCap: storedData.marketCap || 'large',
      geography: storedData.geography || 'us',
      assetType: storedData.assetType || 'equity',
      duration: storedData.duration,
      creditRating: storedData.creditRating,
      underlyingIndex: storedData.underlyingIndex
    };
  }
}

/**
 * Main quantitative stress testing function
 */
export async function runQuantitativeStressTest(
  portfolio: Portfolio,
  scenarioFactors: ScenarioFactors
): Promise<PortfolioStressResult> {
  
  console.log('🎯 QUANTITATIVE STRESS TEST STARTING');
  console.log('=====================================');
  console.log('Scenario Factors:', scenarioFactors);
  console.log('Portfolio:', portfolio);
  console.log('Portfolio assets count:', portfolio.assets?.length || 0);
  
  // CRITICAL: Check if portfolio has assets
  if (!portfolio || !portfolio.assets || portfolio.assets.length === 0) {
    console.error('❌ PORTFOLIO ERROR: No assets found in portfolio');
    throw new Error('Portfolio has no assets to stress test');
  }
  
  // Step 1: Get current portfolio value and enhanced metadata
  const positionResults: PositionStressResult[] = [];
  let totalPortfolioValue = 0;
  let totalStressedValue = 0;
  
  console.log('\n📊 ANALYZING PORTFOLIO POSITIONS:');
  
  for (const asset of portfolio.assets) {
    console.log(`\n🔍 Analyzing ${asset.symbol}...`);
    console.log(`   Asset data:`, asset);
    
    try {
      // Get enhanced asset metadata
      const metadata = await getAssetMetadata(asset.symbol);
      console.log(`   Classification: ${metadata.assetType} | ${metadata.sector} | ${metadata.industry}`);
      
      // Calculate factor sensitivities
      const sensitivities = calculateFactorSensitivities(metadata);
      console.log(`   Factor Sensitivities:`, sensitivities);
      
      // CRITICAL: Check if sensitivities are all zero
      const hasSensitivity = Object.values(sensitivities).some(val => Math.abs(val) > 0.001);
      if (!hasSensitivity) {
        console.warn(`⚠️  ${asset.symbol} has zero sensitivities across all factors!`);
      }
      
      // Get current market price
      let currentPrice = asset.price;
      try {
        const realtimeData = await tiingoService.getRealTimePrice(asset.symbol);
        currentPrice = realtimeData.tngoLast || realtimeData.last || asset.price;
      } catch (error) {
        console.warn(`   Using stored price for ${asset.symbol}: $${currentPrice}`);
      }
      
      const currentValue = currentPrice * asset.quantity;
      totalPortfolioValue += currentValue;
      
      console.log(`   Position value: ${asset.quantity} × $${currentPrice} = $${currentValue}`);
      
      // Calculate position-level stress impact
      const factorContributions: Record<string, number> = {};
      let totalPositionImpact = 0;
      
      // CRITICAL: Check scenario factors and sensitivities
      console.log(`   Calculating impacts for each factor:`);
      
      // Apply each scenario factor with corresponding sensitivity
      Object.entries(scenarioFactors).forEach(([factor, shock]) => {
        if (shock !== 0 && sensitivities[factor as keyof FactorSensitivities] !== 0) {
          const sensitivity = sensitivities[factor as keyof FactorSensitivities];
          let factorImpact = 0;
          
          if (factor === 'rates') {
            // For rates, shock is in basis points, sensitivity is duration/rate sensitivity
            factorImpact = currentValue * (shock / 10000) * sensitivity;
          } else {
            // For other factors, shock is in percentage points
            factorImpact = currentValue * (shock / 100) * sensitivity;
          }
          
          factorContributions[factor] = factorImpact;
          totalPositionImpact += factorImpact;
          
          console.log(`     ${factor.toUpperCase()}: shock=${shock}, sensitivity=${sensitivity}, impact=$${factorImpact.toFixed(2)}`);
        } else {
          factorContributions[factor] = 0;
          console.log(`     ${factor.toUpperCase()}: no impact (shock=${shock}, sensitivity=${sensitivities[factor as keyof FactorSensitivities] || 0})`);
        }
      });
      
      const stressedValue = currentValue + totalPositionImpact;
      totalStressedValue += stressedValue;
      
      const positionResult: PositionStressResult = {
        symbol: asset.symbol,
        assetClass: metadata.assetType,
        currentValue,
        stressedValue,
        impact: totalPositionImpact,
        impactPercent: (totalPositionImpact / currentValue) * 100,
        factorContributions
      };
      
      positionResults.push(positionResult);
      
      console.log(`   POSITION RESULT: $${currentValue.toFixed(2)} → $${stressedValue.toFixed(2)} (${positionResult.impactPercent.toFixed(2)}%)`);
      
    } catch (assetError) {
      console.error(`❌ Error processing asset ${asset.symbol}:`, assetError);
      // Add zero-impact result for failed asset
      const currentValue = asset.price * asset.quantity;
      totalPortfolioValue += currentValue;
      totalStressedValue += currentValue;
      
      positionResults.push({
        symbol: asset.symbol,
        assetClass: asset.assetClass || 'unknown',
        currentValue,
        stressedValue: currentValue,
        impact: 0,
        impactPercent: 0,
        factorContributions: {}
      });
    }
  }
  
  // Step 2: Calculate portfolio-level aggregations
  console.log('\n📈 PORTFOLIO-LEVEL AGGREGATION:');
  
  const totalImpact = totalStressedValue - totalPortfolioValue;
  const totalImpactPercent = totalPortfolioValue > 0 ? (totalImpact / totalPortfolioValue) * 100 : 0;
  
  console.log(`Total Portfolio Value: $${totalPortfolioValue.toFixed(2)}`);
  console.log(`Total Stressed Value: $${totalStressedValue.toFixed(2)}`);
  console.log(`Total Impact: $${totalImpact.toFixed(2)} (${totalImpactPercent.toFixed(2)}%)`);
  
  // CRITICAL: Check for zero impact issue
  if (Math.abs(totalImpactPercent) < 0.001 && Object.values(scenarioFactors).some(val => Math.abs(val) > 0.1)) {
    console.error('❌ ZERO IMPACT DETECTED! Non-zero scenario factors but zero portfolio impact.');
    console.error('This suggests an issue with factor sensitivities or calculation logic.');
    
    // Debug each position
    console.error('📊 Position-by-position debug:');
    positionResults.forEach(pos => {
      console.error(`   ${pos.symbol}: impact=${pos.impact}, contributions=`, pos.factorContributions);
    });
  }
  
  // Calculate asset class impacts
  const assetClassImpacts: Record<string, { impact: number; impactPercent: number }> = {};
  
  positionResults.forEach(position => {
    if (!assetClassImpacts[position.assetClass]) {
      assetClassImpacts[position.assetClass] = { impact: 0, impactPercent: 0 };
    }
    assetClassImpacts[position.assetClass].impact += position.impact;
  });
  
  // Calculate asset class impact percentages
  Object.keys(assetClassImpacts).forEach(assetClass => {
    const classPositions = positionResults.filter(p => p.assetClass === assetClass);
    const classValue = classPositions.reduce((sum, p) => sum + p.currentValue, 0);
    assetClassImpacts[assetClass].impactPercent = 
      classValue > 0 ? (assetClassImpacts[assetClass].impact / classValue) * 100 : 0;
  });
  
  // Calculate factor attribution
  const factorAttribution: Record<string, number> = {};
  Object.keys(scenarioFactors).forEach(factor => {
    factorAttribution[factor] = positionResults.reduce(
      (sum, position) => sum + (position.factorContributions[factor] || 0), 0
    );
  });
  
  // Calculate risk metrics
  const positions = positionResults.map(p => p.currentValue);
  const concentration = calculateConcentration(positions);
  const diversification = calculateDiversification(positionResults);
  const leverageEffect = 1.0; // Placeholder for leverage calculation
  
  console.log('\n📊 RISK METRICS:');
  console.log(`Concentration (HHI): ${concentration.toFixed(3)}`);
  console.log(`Diversification Score: ${diversification.toFixed(3)}`);
  
  const result: PortfolioStressResult = {
    portfolioValue: totalPortfolioValue,
    stressedValue: totalStressedValue,
    totalImpact,
    totalImpactPercent,
    positionResults,
    assetClassImpacts,
    factorAttribution,
    riskMetrics: {
      concentration,
      diversification,
      leverageEffect
    }
  };
  
  console.log('\n✅ QUANTITATIVE STRESS TEST COMPLETED');
  console.log('Final result summary:', {
    totalImpact: result.totalImpact,
    totalImpactPercent: result.totalImpactPercent,
    assetClassCount: Object.keys(result.assetClassImpacts).length,
    factorCount: Object.keys(result.factorAttribution).length
  });
  
  return result;
}

/**
 * Calculate portfolio concentration using Herfindahl-Hirschman Index
 */
function calculateConcentration(positions: number[]): number {
  const totalValue = positions.reduce((sum, value) => sum + value, 0);
  if (totalValue === 0) return 0;
  
  const hhi = positions.reduce((sum, value) => {
    const weight = value / totalValue;
    return sum + (weight * weight);
  }, 0);
  
  return hhi;
}

/**
 * Calculate portfolio diversification score
 */
function calculateDiversification(positions: PositionStressResult[]): number {
  // Count unique asset classes
  const assetClasses = new Set(positions.map(p => p.assetClass));
  const numAssetClasses = assetClasses.size;
  
  // Calculate equal-weight benchmark
  const equalWeight = 1 / positions.length;
  const actualConcentration = calculateConcentration(positions.map(p => p.currentValue));
  
  // Diversification score: lower concentration = higher diversification
  return Math.max(0, 1 - actualConcentration) * Math.min(1, numAssetClasses / 4);
}

/**
 * Convert scenario factors to standardized format
 */
export function convertScenarioToFactors(scenarioFactorChanges: Record<string, number>): ScenarioFactors {
  return {
    equity: scenarioFactorChanges.equity || 0,
    rates: scenarioFactorChanges.rates || 0,
    credit: scenarioFactorChanges.credit || 0,
    fx: scenarioFactorChanges.fx || 0,
    commodity: scenarioFactorChanges.commodity || 0,
    volatility: scenarioFactorChanges.volatility || 0
  };
}

export default {
  runQuantitativeStressTest,
  convertScenarioToFactors,
  getAssetMetadata,
  calculateFactorSensitivities
}; 
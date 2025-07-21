import tiingoService, { TiingoHistoricalPrice } from './tiingoService';
import { Portfolio } from './portfolioService';
import { LegacyScenario, LegacyScenarioRun } from './scenarioService';
import { GreeksResults } from './riskService';

// Historical events with date ranges for scenario testing
export const HISTORICAL_EVENTS = [
  { id: 'gfc', name: '2008 Global Financial Crisis', startDate: '2008-09-15', endDate: '2009-03-09' },
  { id: 'covid', name: 'COVID-19 Crash', startDate: '2020-02-19', endDate: '2020-03-23' },
  { id: 'dotcom', name: 'Dot-com Bubble Burst', startDate: '2000-03-10', endDate: '2002-10-09' },
  { id: 'black_monday', name: 'Black Monday (1987)', startDate: '1987-10-19', endDate: '1987-10-19' },
  { id: '2018_correction', name: '2018 Market Correction', startDate: '2018-01-26', endDate: '2018-02-08' }
];

/**
 * Run a historical scenario on a portfolio using real market data
 * @param portfolioId Portfolio ID to analyze
 * @param startDate Scenario start date
 * @param endDate Scenario end date
 * @returns Promise with scenario run results
 */
export const runHistoricalScenario = async (
  portfolio: Portfolio,
  startDate: string,
  endDate: string,
  scenarioName: string
): Promise<LegacyScenarioRun> => {
  try {
    // Get historical data for each asset in the portfolio
    const assetDataPromises = portfolio.assets.map(async (asset) => {
      try {
        const historicalPrices = await tiingoService.getHistoricalData(
          asset.symbol,
          startDate,
          endDate
        );
        return {
          asset,
          historicalPrices
        };
      } catch (error) {
        console.error(`Error fetching data for ${asset.symbol}:`, error);
        // Return asset with empty price data if fetch fails
        return {
          asset,
          historicalPrices: []
        };
      }
    });

    const assetsWithData = await Promise.all(assetDataPromises);

    // Calculate portfolio values before and after the scenario
    const beforeValue = calculatePortfolioValueAtDate(assetsWithData, startDate);
    const afterValue = calculatePortfolioValueAtDate(assetsWithData, endDate);

    // Calculate impact by asset class
    const assetClassImpacts = calculateAssetClassImpacts(assetsWithData, startDate, endDate);

    // Calculate factor attribution (simplified)
    const factorAttribution = calculateFactorAttribution(assetsWithData, startDate, endDate);

    // Generate simulated Greeks data
    const greeksBefore = generateSimulatedGreeks();
    const greeksAfter = adjustGreeksBasedOnImpact(greeksBefore, (afterValue - beforeValue) / beforeValue);

    // Create the scenario run
    const scenarioRun: LegacyScenarioRun = {
      id: Date.now().toString(),
      scenarioId: 'historical_' + startDate.replace(/-/g, ''),
      scenarioName,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      portfolioValue: beforeValue,
      impact: ((afterValue - beforeValue) / beforeValue) * 100,
      impactValue: afterValue - beforeValue,
      assetClassImpacts,
      factorAttribution,
      greeksBefore,
      greeksAfter
    };

    return scenarioRun;
  } catch (error) {
    console.error('Error running historical scenario:', error);
    throw error;
  }
};

/**
 * Calculate portfolio value at a specific date using historical prices
 */
function calculatePortfolioValueAtDate(
  assetsWithData: Array<{ asset: any, historicalPrices: TiingoHistoricalPrice[] }>,
  date: string
): number {
  let totalValue = 0;

  assetsWithData.forEach(({ asset, historicalPrices }) => {
    // Find the closest price date (exact or before the target date)
    const priceData = findClosestPriceData(historicalPrices, date);

    if (priceData) {
      totalValue += priceData.adjClose * asset.quantity;
    } else {
      // If no historical data found, use the current price
      totalValue += asset.price * asset.quantity;
    }
  });

  return totalValue;
}

/**
 * Find the price data closest to the target date
 */
function findClosestPriceData(
  priceData: TiingoHistoricalPrice[],
  targetDate: string
): TiingoHistoricalPrice | null {
  if (!priceData || priceData.length === 0) {
    return null;
  }

  // Sort by date (descending)
  const sortedData = [...priceData].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Find the first price data on or before the target date
  const targetTimestamp = new Date(targetDate).getTime();
  return sortedData.find(data => new Date(data.date).getTime() <= targetTimestamp) || sortedData[0];
}

/**
 * Calculate impact by asset class
 */
function calculateAssetClassImpacts(
  assetsWithData: Array<{ asset: any, historicalPrices: TiingoHistoricalPrice[] }>,
  startDate: string,
  endDate: string
): Record<string, number> {
  const assetClassValues: Record<string, { before: number, after: number }> = {};

  // Calculate before and after values for each asset class
  assetsWithData.forEach(({ asset, historicalPrices }) => {
    const assetClass = asset.assetClass || 'other';
    
    if (!assetClassValues[assetClass]) {
      assetClassValues[assetClass] = { before: 0, after: 0 };
    }

    const beforePrice = findClosestPriceData(historicalPrices, startDate)?.adjClose || asset.price;
    const afterPrice = findClosestPriceData(historicalPrices, endDate)?.adjClose || asset.price;

    assetClassValues[assetClass].before += beforePrice * asset.quantity;
    assetClassValues[assetClass].after += afterPrice * asset.quantity;
  });

  // Calculate percentage change for each asset class
  const impacts: Record<string, number> = {};
  Object.entries(assetClassValues).forEach(([assetClass, { before, after }]) => {
    if (before > 0) {
      impacts[assetClass] = ((after - before) / before) * 100;
    } else {
      impacts[assetClass] = 0;
    }
  });

  return impacts;
}

/**
 * Calculate factor attribution (simplified version)
 */
function calculateFactorAttribution(
  assetsWithData: Array<{ asset: any, historicalPrices: TiingoHistoricalPrice[] }>,
  startDate: string,
  endDate: string
): Record<string, number> {
  // In a real implementation, this would use regression analysis
  // to determine how much each factor contributed to price changes
  // For this example, we'll create approximate factor attributions

  // Calculate total impact value
  let beforeValue = 0;
  let afterValue = 0;

  assetsWithData.forEach(({ asset, historicalPrices }) => {
    const beforePrice = findClosestPriceData(historicalPrices, startDate)?.adjClose || asset.price;
    const afterPrice = findClosestPriceData(historicalPrices, endDate)?.adjClose || asset.price;

    beforeValue += beforePrice * asset.quantity;
    afterValue += afterPrice * asset.quantity;
  });

  const totalImpact = afterValue - beforeValue;

  // Simplified factor attribution
  return {
    equity: totalImpact * 0.6, // Assume 60% of impact is from equity
    rates: totalImpact * 0.15, // 15% from interest rates
    credit: totalImpact * 0.1, // 10% from credit spreads
    fx: totalImpact * 0.05, // 5% from currency effects
    commodity: totalImpact * 0.1 // 10% from commodity prices
  };
}

/**
 * Generate simulated Greek values
 */
function generateSimulatedGreeks(): GreeksResults {
  return {
    delta: parseFloat((Math.random() * 0.5 + 0.2).toFixed(2)),
    gamma: parseFloat((Math.random() * 0.1 + 0.05).toFixed(2)),
    theta: parseFloat((-(Math.random() * 200 + 100)).toFixed(2)),
    vega: parseFloat((Math.random() * 100 + 50).toFixed(2)),
    rho: parseFloat((Math.random() * 50 + 40).toFixed(2))
  };
}

/**
 * Adjust Greeks based on portfolio impact
 */
function adjustGreeksBasedOnImpact(
  beforeGreeks: GreeksResults,
  impactPercentage: number
): GreeksResults {
  // Convert impact to absolute value for calculation
  const absImpact = Math.abs(impactPercentage);
  
  // Apply different adjustments depending on whether market went up or down
  const direction = impactPercentage >= 0 ? 1 : -1;
  
  return {
    delta: parseFloat((beforeGreeks.delta * (1 + direction * absImpact * 0.1)).toFixed(2)),
    gamma: parseFloat((beforeGreeks.gamma * (1 + direction * absImpact * -0.05)).toFixed(2)),
    theta: parseFloat((beforeGreeks.theta * (1 + direction * absImpact * -0.08)).toFixed(2)),
    vega: parseFloat((beforeGreeks.vega * (1 + direction * absImpact * 0.15)).toFixed(2)),
    rho: parseFloat((beforeGreeks.rho * (1 + direction * absImpact * 0.1)).toFixed(2))
  };
}

/**
 * Get data needed for a real-time stress test using intelligent factor mapping
 * @param portfolio Portfolio to analyze
 * @param factorChanges Changes to apply to risk factors
 * @returns Promise with updated portfolio values
 */
export const simulateRealTimeStressTest = async (
  portfolio: Portfolio,
  factorChanges: {
    equity: number;
    rates: number;
    credit: number;
    fx: number;
    commodity: number;
  }
): Promise<{
  originalValue: number;
  stressedValue: number;
  assetClassImpacts: Record<string, number>;
}> => {
  try {
    console.log('🧪 STRESS TEST DEBUG:');
    console.log('Factor changes:', factorChanges);
    
    // Get latest prices
    const tickers = portfolio.assets.map(asset => asset.symbol);
    console.log('📊 Getting prices for tickers:', tickers);
    
    const latestPrices = await tiingoService.getBatchRealTimePrices(tickers);
    console.log('💰 Latest prices received:', latestPrices);
    
    // Calculate original portfolio value with latest prices
    let originalValue = 0;
    portfolio.assets.forEach(asset => {
      // Use tngoLast instead of last for more reliable price data
      const price = latestPrices[asset.symbol]?.tngoLast || latestPrices[asset.symbol]?.last || asset.price;
      const value = price * asset.quantity;
      originalValue += value;
      console.log(`  ${asset.symbol}: ${asset.quantity} × $${price} = $${value.toFixed(2)}`);
    });
    
    console.log('📈 Original portfolio value:', originalValue.toFixed(2));
    
    // Apply stress factors to get stressed values by asset class - INTELLIGENT MAPPING
    const assetsByClass: Record<string, { original: number, stressed: number }> = {};
    portfolio.assets.forEach(asset => {
      const assetClass = asset.assetClass || 'other';
      // Use tngoLast instead of last for more reliable price data
      const price = latestPrices[asset.symbol]?.tngoLast || latestPrices[asset.symbol]?.last || asset.price;
      const value = price * asset.quantity;
      
      if (!assetsByClass[assetClass]) {
        assetsByClass[assetClass] = { original: 0, stressed: 0 };
      }
      
      assetsByClass[assetClass].original += value;
      
      // INTELLIGENT FACTOR MAPPING - Only apply relevant factors to each asset class
      let stressMultiplier = 1;
      switch (assetClass) {
        case 'equity':
          // Equity only responds to equity market factors
          stressMultiplier = 1 + (factorChanges.equity / 100);
          break;
        case 'bond':
          // Bonds primarily respond to interest rates and credit
          stressMultiplier = 1 + (factorChanges.rates / 100) + (factorChanges.credit / 100);
          break;
        case 'cash':
          // Cash responds to FX and inflation (minimal impact)
          stressMultiplier = 1 + (factorChanges.fx / 100) * 0.1;
          break;
        case 'commodity':
          // Commodities respond to commodity factors
          stressMultiplier = 1 + (factorChanges.commodity / 100);
          break;
        case 'real_estate':
          // Real estate responds to interest rates (inverse) and some equity factors
          stressMultiplier = 1 - (factorChanges.rates / 100) * 0.5 + (factorChanges.equity / 100) * 0.3;
          break;
        case 'alternative':
          // Alternative investments respond to equity and credit factors
          stressMultiplier = 1 + (factorChanges.equity / 100) * 0.6 + (factorChanges.credit / 100) * 0.4;
          break;
        default:
          // Other asset classes (including crypto): no impact from irrelevant factors
          stressMultiplier = 1;
      }
      
      console.log(`🎯 ${asset.symbol} (${assetClass}): multiplier = ${stressMultiplier.toFixed(4)}`);
      console.log(`   Original value: $${value.toFixed(2)}`);
      console.log(`   Stressed value: $${(value * stressMultiplier).toFixed(2)}`);
      
      assetsByClass[assetClass].stressed += value * stressMultiplier;
    });
    
    // Calculate total stressed value
    let stressedValue = 0;
    const assetClassImpacts: Record<string, number> = {};
    
    console.log('\n📊 ASSET CLASS SUMMARY:');
    Object.entries(assetsByClass).forEach(([assetClass, { original, stressed }]) => {
      stressedValue += stressed;
      const impact = ((stressed - original) / original) * 100;
      assetClassImpacts[assetClass] = impact;
      console.log(`  ${assetClass}: $${original.toFixed(2)} → $${stressed.toFixed(2)} (${impact.toFixed(2)}%)`);
    });
    
    console.log(`\n💹 TOTAL IMPACT: $${originalValue.toFixed(2)} → $${stressedValue.toFixed(2)}`);
    console.log(`📉 Overall impact: ${(((stressedValue - originalValue) / originalValue) * 100).toFixed(2)}%`);
    
    return {
      originalValue,
      stressedValue,
      assetClassImpacts
    };
  } catch (error) {
    console.error('Error in stress test simulation:', error);
    throw error;
  }
};

const realScenarioService = {
  runHistoricalScenario,
  simulateRealTimeStressTest,
  HISTORICAL_EVENTS
};

export default realScenarioService; 
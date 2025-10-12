/**
 * Factor Relevance Service
 * 
 * Intelligent filtering of risk factors based on portfolio composition
 * Only includes factors that are materially relevant to the portfolio's asset classes
 */

import { Portfolio } from './portfolioService';

export type RiskFactor = 'equity' | 'rates' | 'credit' | 'fx' | 'commodity' | 'volatility';
export type AssetClass = 'equity' | 'bond' | 'commodity' | 'real_estate' | 'alternative' | 'cash';

/**
 * Define which factors are relevant to each asset class
 * This is the core mapping that drives intelligent factor filtering
 * 
 * Note: Volatility is NOT included for plain equities because:
 * - Volatility measures risk/uncertainty, not direct P&L impact
 * - Stock price changes are captured by the 'equity' factor
 * - Volatility is only relevant for derivatives (options, VIX products, etc.)
 */
export const FACTOR_RELEVANCE_MAP: Record<AssetClass, RiskFactor[]> = {
  equity: ['equity'], // Plain stocks/ETFs only respond to equity market movements
  bond: ['rates', 'credit'], // Bonds respond to interest rates and credit spreads
  commodity: ['commodity', 'fx'], // Commodities respond to commodity prices and FX
  real_estate: ['equity', 'rates'], // REITs respond to equity markets and interest rates
  cash: ['rates'], // Cash only responds to interest rates (minimally)
  alternative: ['equity', 'credit', 'volatility'] // Alternatives may include options/derivatives with volatility exposure
};

/**
 * Materiality threshold: Only include factors if portfolio has this % exposure
 * to asset classes that respond to that factor
 */
const MATERIALITY_THRESHOLD = 0.05; // 5% threshold

/**
 * Portfolio composition summary
 */
export interface PortfolioComposition {
  assetClassWeights: Record<AssetClass, number>;
  totalValue: number;
  assetCount: number;
}

/**
 * Factor relevance result
 */
export interface FactorRelevance {
  factor: RiskFactor;
  isRelevant: boolean;
  exposurePercent: number; // % of portfolio exposed to this factor
  relevantAssetClasses: AssetClass[]; // Which asset classes drive this factor's relevance
}

/**
 * Analyze portfolio composition to calculate asset class weights
 */
export function analyzePortfolioComposition(portfolio: Portfolio): PortfolioComposition {
  const totalValue = portfolio.assets.reduce((sum, asset) => 
    sum + (asset.price * asset.quantity), 0
  );
  
  const assetClassWeights: Record<AssetClass, number> = {
    equity: 0,
    bond: 0,
    commodity: 0,
    real_estate: 0,
    alternative: 0,
    cash: 0
  };
  
  // Calculate weight for each asset class
  portfolio.assets.forEach(asset => {
    const assetValue = asset.price * asset.quantity;
    const weight = totalValue > 0 ? assetValue / totalValue : 0;
    const assetClass = (asset.assetClass || 'equity') as AssetClass;
    
    if (assetClassWeights[assetClass] !== undefined) {
      assetClassWeights[assetClass] += weight;
    }
  });
  
  return {
    assetClassWeights,
    totalValue,
    assetCount: portfolio.assets.length
  };
}

/**
 * Calculate factor exposure based on portfolio composition
 * Returns the % of portfolio value that is exposed to each factor
 */
export function calculateFactorExposures(composition: PortfolioComposition): Record<RiskFactor, number> {
  const exposures: Record<RiskFactor, number> = {
    equity: 0,
    rates: 0,
    credit: 0,
    fx: 0,
    commodity: 0,
    volatility: 0
  };
  
  // For each asset class, add its weight to all relevant factors
  Object.entries(composition.assetClassWeights).forEach(([assetClass, weight]) => {
    const relevantFactors = FACTOR_RELEVANCE_MAP[assetClass as AssetClass] || [];
    
    relevantFactors.forEach(factor => {
      exposures[factor] += weight;
    });
  });
  
  return exposures;
}

/**
 * Determine which factors are relevant to the portfolio
 * A factor is relevant if portfolio has >= MATERIALITY_THRESHOLD exposure
 */
export function getRelevantFactors(portfolio: Portfolio): RiskFactor[] {
  const composition = analyzePortfolioComposition(portfolio);
  const exposures = calculateFactorExposures(composition);
  
  const relevantFactors: RiskFactor[] = [];
  
  Object.entries(exposures).forEach(([factor, exposure]) => {
    if (exposure >= MATERIALITY_THRESHOLD) {
      relevantFactors.push(factor as RiskFactor);
    }
  });
  
  return relevantFactors;
}

/**
 * Get detailed relevance information for all factors
 */
export function analyzeFactorRelevance(portfolio: Portfolio): FactorRelevance[] {
  const composition = analyzePortfolioComposition(portfolio);
  const exposures = calculateFactorExposures(composition);
  
  const allFactors: RiskFactor[] = ['equity', 'rates', 'credit', 'fx', 'commodity', 'volatility'];
  
  return allFactors.map(factor => {
    const exposure = exposures[factor];
    const isRelevant = exposure >= MATERIALITY_THRESHOLD;
    
    // Find which asset classes contribute to this factor's relevance
    const relevantAssetClasses: AssetClass[] = [];
    Object.entries(composition.assetClassWeights).forEach(([assetClass, weight]) => {
      const factorsForAssetClass = FACTOR_RELEVANCE_MAP[assetClass as AssetClass] || [];
      if (factorsForAssetClass.includes(factor) && weight > 0.01) { // >1% weight
        relevantAssetClasses.push(assetClass as AssetClass);
      }
    });
    
    return {
      factor,
      isRelevant,
      exposurePercent: Math.round(exposure * 1000) / 10, // Round to 1 decimal
      relevantAssetClasses
    };
  });
}

/**
 * Filter scenario factors to only include relevant ones
 * Returns a new object with only relevant factors
 */
export function filterScenarioFactors(
  scenarioFactors: Record<string, number>,
  portfolio: Portfolio
): Record<string, number> {
  const relevantFactors = getRelevantFactors(portfolio);
  const filteredFactors: Record<string, number> = {};
  
  relevantFactors.forEach(factor => {
    if (scenarioFactors[factor] !== undefined) {
      filteredFactors[factor] = scenarioFactors[factor];
    }
  });
  
  return filteredFactors;
}

/**
 * Check if a specific factor is relevant to the portfolio
 */
export function isFactorRelevant(factor: RiskFactor, portfolio: Portfolio): boolean {
  const relevantFactors = getRelevantFactors(portfolio);
  return relevantFactors.includes(factor);
}

/**
 * Get a human-readable explanation of factor relevance
 */
export function getFactorRelevanceExplanation(
  factor: RiskFactor,
  portfolio: Portfolio
): string {
  const composition = analyzePortfolioComposition(portfolio);
  const exposures = calculateFactorExposures(composition);
  const exposure = exposures[factor];
  
  if (exposure < MATERIALITY_THRESHOLD) {
    return `This factor is not shown because your portfolio has minimal exposure (<${MATERIALITY_THRESHOLD * 100}%) to asset classes affected by ${factor}.`;
  }
  
  // Find which asset classes contribute
  const contributingClasses: string[] = [];
  Object.entries(composition.assetClassWeights).forEach(([assetClass, weight]) => {
    const factorsForAssetClass = FACTOR_RELEVANCE_MAP[assetClass as AssetClass] || [];
    if (factorsForAssetClass.includes(factor) && weight > 0.01) {
      contributingClasses.push(`${assetClass} (${Math.round(weight * 100)}%)`);
    }
  });
  
  return `This factor affects ${Math.round(exposure * 100)}% of your portfolio through: ${contributingClasses.join(', ')}.`;
}

/**
 * Get summary statistics for factor relevance
 */
export function getRelevanceSummary(portfolio: Portfolio): {
  totalFactors: number;
  relevantFactors: number;
  irrelevantFactors: number;
  relevantFactorNames: RiskFactor[];
  composition: PortfolioComposition;
} {
  const composition = analyzePortfolioComposition(portfolio);
  const relevantFactors = getRelevantFactors(portfolio);
  const allFactors: RiskFactor[] = ['equity', 'rates', 'credit', 'fx', 'commodity', 'volatility'];
  
  return {
    totalFactors: allFactors.length,
    relevantFactors: relevantFactors.length,
    irrelevantFactors: allFactors.length - relevantFactors.length,
    relevantFactorNames: relevantFactors,
    composition
  };
}

/**
 * Validate that scenario factors match portfolio relevance
 * Useful for warning users about irrelevant stress scenarios
 */
export function validateScenarioRelevance(
  scenarioFactors: Record<string, number>,
  portfolio: Portfolio
): {
  isRelevant: boolean;
  warnings: string[];
  matchPercent: number;
} {
  const relevantFactors = getRelevantFactors(portfolio);
  const warnings: string[] = [];
  
  // Check if scenario has factors not relevant to portfolio
  let relevantCount = 0;
  let totalNonZeroFactors = 0;
  
  Object.entries(scenarioFactors).forEach(([factor, value]) => {
    if (Math.abs(value) > 0.01) { // Non-zero factor
      totalNonZeroFactors++;
      
      if (relevantFactors.includes(factor as RiskFactor)) {
        relevantCount++;
      } else {
        warnings.push(
          `Scenario includes ${factor} shock, but your portfolio has minimal exposure to ${factor}.`
        );
      }
    }
  });
  
  const matchPercent = totalNonZeroFactors > 0 
    ? (relevantCount / totalNonZeroFactors) * 100 
    : 100;
  
  const isRelevant = matchPercent >= 50; // At least 50% of factors should be relevant
  
  if (!isRelevant) {
    warnings.push(
      'This scenario may not be appropriate for your portfolio composition. Consider selecting a different scenario.'
    );
  }
  
  return {
    isRelevant,
    warnings,
    matchPercent: Math.round(matchPercent)
  };
}

export default {
  analyzePortfolioComposition,
  calculateFactorExposures,
  getRelevantFactors,
  analyzeFactorRelevance,
  filterScenarioFactors,
  isFactorRelevant,
  getFactorRelevanceExplanation,
  getRelevanceSummary,
  validateScenarioRelevance,
  FACTOR_RELEVANCE_MAP
};


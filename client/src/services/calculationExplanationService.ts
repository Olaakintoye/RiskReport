/**
 * Calculation Explanation Service
 * 
 * Provides detailed explanations for stress test calculations to help users
 * understand how results are computed, including beta calculations, factor
 * contributions, and impact percentages.
 */

import { Asset } from './portfolioService';
import { AssetMetadata } from './assetClassificationService';

export interface CalculationExplanation {
  title: string;
  summary: string;
  formula: string;
  example: string;
  factors: string[];
}

/**
 * Test function to verify the explanation service is working
 */
export function getTestExplanation(): CalculationExplanation {
  console.log('getTestExplanation called - service is working!');
  return {
    title: "Test Explanation",
    summary: "This is a test explanation to verify the service is working correctly.",
    formula: "Test = Working",
    example: "Service is functioning properly",
    factors: ["Service loaded", "Functions available", "Modal should display"]
  };
}

/**
 * Generate explanation for portfolio impact calculation
 */
export function getPortfolioImpactExplanation(
  results: any,
  scenarioFactors: any
): CalculationExplanation {
  console.log('getPortfolioImpactExplanation called with results:', results);
  console.log('scenarioFactors:', scenarioFactors);
  
  // Simple test to ensure function is working
  if (!results) {
    console.log('No results provided, returning fallback explanation');
    return {
      title: "How Portfolio Impact is Calculated",
      summary: "Unable to generate explanation - no data provided.",
      formula: "Portfolio Impact = Market Shock × Average Portfolio Beta",
      example: "Calculation requires portfolio data",
      factors: ["Data not available"]
    };
  }
  
  try {
    const totalImpact = results?.totalImpactPercent || 0;
    const portfolioValue = results?.portfolioValue || 0;
    const stressedValue = results?.stressedValue || portfolioValue;
    
    // Calculate average beta across all positions
    const positionResults = results?.positionResults || [];
    const totalWeightedBeta = positionResults.reduce((sum: number, pos: any) => {
      const weight = (pos?.currentValue || 0) / (portfolioValue || 1);
      const beta = (pos?.impactPercent || 0) / (scenarioFactors?.equity || 1);
      return sum + (beta * weight);
    }, 0);
    
    const avgBeta = totalWeightedBeta || 1.0;
    const marketShock = scenarioFactors?.equity || 0;
    
    const explanation = {
      title: "How Portfolio Impact is Calculated",
      summary: `Your portfolio has an average beta of ${avgBeta.toFixed(2)}, which means it typically moves ${(avgBeta * 100 - 100).toFixed(0)}% more than the overall market. In this ${marketShock}% market scenario, your portfolio is expected to move by ${totalImpact.toFixed(2)}%.`,
      formula: "Portfolio Impact = Market Shock × Average Portfolio Beta",
      example: `${marketShock}% × ${avgBeta.toFixed(2)} = ${totalImpact.toFixed(2)}%`,
      factors: [
        `Portfolio Value: $${portfolioValue.toLocaleString()}`,
        `Stressed Value: $${stressedValue.toLocaleString()}`,
        `Average Beta: ${avgBeta.toFixed(2)} (weighted by position size)`,
        `Market Shock: ${marketShock}%`,
        `Result: ${totalImpact.toFixed(2)}% impact`
      ]
    };
    
    console.log('Generated explanation:', explanation);
    return explanation;
  } catch (error) {
    console.error('Error generating portfolio impact explanation:', error);
    return {
      title: "How Portfolio Impact is Calculated",
      summary: "Unable to generate detailed explanation due to missing data.",
      formula: "Portfolio Impact = Market Shock × Average Portfolio Beta",
      example: "Calculation requires portfolio and scenario data",
      factors: ["Data not available"]
    };
  }
}

/**
 * Generate explanation for asset class impact
 */
export function getAssetClassImpactExplanation(
  assetClass: string,
  results: any
): CalculationExplanation {
  try {
    const assetClassImpacts = results?.assetClassImpacts || {};
    const impact = assetClassImpacts[assetClass] || { impact: 0, impactPercent: 0 };
    const portfolioValue = results?.portfolioValue || 0;
    
    // Find positions in this asset class
    const positionResults = results?.positionResults || [];
    const classPositions = positionResults.filter((pos: any) => pos?.assetClass === assetClass);
    const classValue = classPositions.reduce((sum: number, pos: any) => sum + (pos?.currentValue || 0), 0);
    const classWeight = portfolioValue > 0 ? (classValue / portfolioValue) * 100 : 0;
    
    const impactPercent = impact?.impactPercent || impact?.impact_percent || 0;
    
    return {
      title: `${assetClass.charAt(0).toUpperCase() + assetClass.slice(1)} Asset Class Impact`,
      summary: `Your ${assetClass} holdings represent ${classWeight.toFixed(1)}% of your portfolio and experienced a ${impactPercent.toFixed(2)}% impact in this stress scenario.`,
      formula: "Asset Class Impact = Sum of Individual Position Impacts",
      example: `${classPositions.length} ${assetClass} positions = ${impactPercent.toFixed(2)}% total impact`,
      factors: [
        `Asset Class: ${assetClass}`,
        `Number of Positions: ${classPositions.length}`,
        `Class Value: $${classValue.toLocaleString()}`,
        `Portfolio Weight: ${classWeight.toFixed(1)}%`,
        `Total Impact: ${impactPercent.toFixed(2)}%`
      ]
    };
  } catch (error) {
    console.error('Error generating asset class explanation:', error);
    return {
      title: `${assetClass.charAt(0).toUpperCase() + assetClass.slice(1)} Asset Class Impact`,
      summary: "Unable to generate detailed explanation due to missing data.",
      formula: "Asset Class Impact = Sum of Individual Position Impacts",
      example: "Calculation requires asset class data",
      factors: ["Data not available"]
    };
  }
}

/**
 * Generate explanation for factor attribution
 */
export function getFactorAttributionExplanation(
  factor: string,
  results: any
): CalculationExplanation {
  try {
    const factorAttribution = results?.factorAttribution || {};
    const impact = factorAttribution[factor] || 0;
    const totalImpact = results?.totalImpact || results?.totalImpactValue || 0;
    const impactPercent = totalImpact !== 0 ? (Math.abs(impact) / Math.abs(totalImpact)) * 100 : 0;
    
    const factorDescriptions: Record<string, string> = {
      equity: "Equity market movements affect stock prices directly",
      rates: "Interest rate changes affect bond prices and some equity sectors",
      credit: "Credit spread changes affect corporate bond prices",
      fx: "Currency movements affect international investments",
      commodity: "Commodity price changes affect commodity investments",
      volatility: "Volatility changes affect options and derivatives"
    };
    
    return {
      title: `${factor.charAt(0).toUpperCase() + factor.slice(1)} Factor Attribution`,
      summary: `The ${factor} factor contributed $${Math.abs(impact).toLocaleString()} (${impactPercent.toFixed(1)}% of total impact) to your portfolio's stress test result. ${factorDescriptions[factor] || 'This factor affects your portfolio based on asset composition.'}`,
      formula: "Factor Impact = Sum of Position Sensitivities × Factor Shock",
      example: `${factor} factor: $${Math.abs(impact).toLocaleString()} (${impactPercent.toFixed(1)}% of total)`,
      factors: [
        `Factor: ${factor}`,
        `Factor Impact: $${Math.abs(impact).toLocaleString()}`,
        `Total Portfolio Impact: $${Math.abs(totalImpact).toLocaleString()}`,
        `Contribution: ${impactPercent.toFixed(1)}%`,
        `Description: ${factorDescriptions[factor] || 'Risk factor affecting portfolio'}`
      ]
    };
  } catch (error) {
    console.error('Error generating factor attribution explanation:', error);
    return {
      title: `${factor.charAt(0).toUpperCase() + factor.slice(1)} Factor Attribution`,
      summary: "Unable to generate detailed explanation due to missing data.",
      formula: "Factor Impact = Sum of Position Sensitivities × Factor Shock",
      example: "Calculation requires factor data",
      factors: ["Data not available"]
    };
  }
}

/**
 * Generate explanation for individual asset impact
 */
export function getAssetImpactExplanation(
  asset: Asset,
  metadata: AssetMetadata,
  positionResult: any,
  scenarioFactors: any
): CalculationExplanation {
  const impact = positionResult.impactPercent;
  const currentValue = positionResult.currentValue;
  const stressedValue = positionResult.stressedValue;
  
  // Calculate beta for this asset
  const marketShock = scenarioFactors.equity || 0;
  const beta = marketShock !== 0 ? impact / marketShock : 1.0;
  
  return {
    title: `How ${asset.symbol} Impact is Calculated`,
    summary: `${asset.symbol} has an equity beta of ${beta.toFixed(2)}, which means it typically moves ${(beta * 100 - 100).toFixed(0)}% more than the overall market. In this ${marketShock}% market scenario, ${asset.symbol} is expected to move by ${impact.toFixed(2)}%.`,
    formula: "Asset Impact = Market Shock × Asset Beta",
    example: `${marketShock}% × ${beta.toFixed(2)} = ${impact.toFixed(2)}%`,
    factors: [
      `Asset: ${asset.symbol}`,
      `Asset Type: ${metadata.assetType}`,
      `Sector: ${metadata.sector}`,
      `Market Cap: ${metadata.marketCap}`,
      `Calculated Beta: ${beta.toFixed(2)}`,
      `Current Value: $${currentValue.toLocaleString()}`,
      `Stressed Value: $${stressedValue.toLocaleString()}`,
      `Impact: ${impact.toFixed(2)}%`
    ]
  };
}

/**
 * Generate explanation for beta calculation
 */
export function getBetaCalculationExplanation(
  metadata: AssetMetadata
): CalculationExplanation {
  let baseBeta = 1.0;
  let marketCapAdjustment = 1.0;
  let sectorAdjustment = 1.0;
  let geographyAdjustment = 1.0;
  
  // Market cap adjustment
  if (metadata.marketCap === 'small') marketCapAdjustment = 1.3;
  else if (metadata.marketCap === 'mid') marketCapAdjustment = 1.1;
  else if (metadata.marketCap === 'large') marketCapAdjustment = 0.95;
  
  // Sector adjustment
  const sectorBetas: Record<string, number> = {
    'Technology': 1.2,
    'Financials': 1.15,
    'Consumer Discretionary': 1.1,
    'Energy': 1.25,
    'Healthcare': 0.9,
    'Consumer Staples': 0.8,
    'Utilities': 0.7,
    'Real Estate': 0.9,
    'Dividend': 0.85
  };
  sectorAdjustment = sectorBetas[metadata.sector] || 1.0;
  
  // Geography adjustment
  if (metadata.geography === 'emerging') geographyAdjustment = 1.4;
  else if (metadata.geography === 'international') geographyAdjustment = 0.8;
  
  const finalBeta = baseBeta * marketCapAdjustment * sectorAdjustment * geographyAdjustment;
  
  return {
    title: "How Beta is Calculated",
    summary: `Beta measures how much an asset moves relative to the market. ${metadata.symbol} has a beta of ${finalBeta.toFixed(2)}, meaning it typically moves ${(finalBeta * 100 - 100).toFixed(0)}% more than the overall market.`,
    formula: "Beta = Base × Market Cap × Sector × Geography",
    example: `1.0 × ${marketCapAdjustment} × ${sectorAdjustment} × ${geographyAdjustment} = ${finalBeta.toFixed(2)}`,
    factors: [
      `Base Beta: 1.0 (market baseline)`,
      `Market Cap Adjustment: ${marketCapAdjustment} (${metadata.marketCap} cap)`,
      `Sector Adjustment: ${sectorAdjustment} (${metadata.sector})`,
      `Geography Adjustment: ${geographyAdjustment} (${metadata.geography})`,
      `Final Beta: ${finalBeta.toFixed(2)}`
    ]
  };
}

/**
 * Generate explanation for factor contributions in asset breakdown
 */
export function getAssetFactorContributionsExplanation(
  asset: Asset,
  factorContributions: Record<string, number>
): CalculationExplanation {
  const totalContributions = Object.values(factorContributions).reduce((sum, val) => sum + Math.abs(val), 0);
  
  return {
    title: `Factor Contributions for ${asset.symbol}`,
    summary: `This shows how each risk factor contributed to ${asset.symbol}'s stress test impact. The factors are calculated based on the asset's characteristics and sensitivities.`,
    formula: "Factor Impact = Asset Value × Factor Shock × Factor Sensitivity",
    example: `Each factor's contribution to ${asset.symbol}'s total impact`,
    factors: Object.entries(factorContributions)
      .filter(([_, value]) => Math.abs(value) > 0.01)
      .map(([factor, value]) => 
        `${factor}: ${value.toFixed(2)}% (${((Math.abs(value) / totalContributions) * 100).toFixed(1)}% of total)`
      )
  };
}

/**
 * Get explanation for why certain factors are not shown
 */
export function getFactorFilteringExplanation(
  shownFactors: string[],
  totalFactors: string[]
): CalculationExplanation {
  const hiddenFactors = totalFactors.filter(f => !shownFactors.includes(f));
  
  return {
    title: "Why Some Factors Are Not Shown",
    summary: `Only factors relevant to your portfolio's asset classes are displayed. Factors with minimal or no impact on your holdings are hidden to reduce noise.`,
    formula: "Factor Relevance = Portfolio Exposure × Factor Sensitivity",
    example: `Showing ${shownFactors.length} of ${totalFactors.length} factors`,
    factors: [
      `Shown Factors: ${shownFactors.join(', ')}`,
      `Hidden Factors: ${hiddenFactors.join(', ')}`,
      `Reason: Only factors with >5% portfolio exposure are shown`,
      `Benefit: Cleaner, more relevant results`
    ]
  };
}

export default {
  getPortfolioImpactExplanation,
  getAssetClassImpactExplanation,
  getFactorAttributionExplanation,
  getAssetImpactExplanation,
  getBetaCalculationExplanation,
  getAssetFactorContributionsExplanation,
  getFactorFilteringExplanation
};

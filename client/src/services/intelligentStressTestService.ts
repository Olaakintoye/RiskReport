import { Portfolio } from './portfolioService';

// Enhanced asset class definitions
export type AssetClass = 'equity' | 'bond' | 'cash' | 'commodity' | 'real_estate' | 'alternative' | 'crypto';

// Stress factor categories
export interface StressFactor {
  id: string;
  name: string;
  category: 'market' | 'credit' | 'liquidity' | 'operational' | 'geopolitical';
  relevantAssetClasses: AssetClass[];
  impactIntensity: number; // 0-1 scale
}

// Portfolio composition analysis
export interface PortfolioComposition {
  assetClassWeights: Record<AssetClass, number>;
  dominantAssetClasses: AssetClass[];
  concentrationLevel: 'low' | 'medium' | 'high';
  crossAssetExposure: boolean;
  totalValue: number;
}

// Intelligent stress test configuration
export interface IntelligentStressConfig {
  portfolio: Portfolio;
  stressIntensity: 'mild' | 'moderate' | 'severe' | 'extreme';
  selectedFactors?: string[]; // Allow manual override
  timeHorizon: number;
  confidenceLevel: number;
}

// Stress test results
export interface IntelligentStressResults {
  originalValue: number;
  stressedValue: number;
  totalImpact: number;
  factorContributions: Record<string, {
    impact: number;
    relevance: number;
    description: string;
  }>;
  assetClassImpacts: Record<AssetClass, number>;
  recommendedActions: string[];
}

// Define stress factors with their asset class relevance
const STRESS_FACTORS: StressFactor[] = [
  // Equity-focused factors
  {
    id: 'equity_crash',
    name: 'Equity Market Crash',
    category: 'market',
    relevantAssetClasses: ['equity'],
    impactIntensity: 0.9
  },
  {
    id: 'volatility_spike',
    name: 'Volatility Spike',
    category: 'market',
    relevantAssetClasses: ['equity', 'alternative'],
    impactIntensity: 0.8
  },
  {
    id: 'sector_rotation',
    name: 'Sector Rotation',
    category: 'market',
    relevantAssetClasses: ['equity'],
    impactIntensity: 0.6
  },
  
  // Bond-focused factors
  {
    id: 'interest_rate_shock',
    name: 'Interest Rate Shock',
    category: 'market',
    relevantAssetClasses: ['bond', 'real_estate'],
    impactIntensity: 0.9
  },
  {
    id: 'credit_spread_widening',
    name: 'Credit Spread Widening',
    category: 'credit',
    relevantAssetClasses: ['bond'],
    impactIntensity: 0.8
  },
  {
    id: 'inflation_surge',
    name: 'Inflation Surge',
    category: 'market',
    relevantAssetClasses: ['bond', 'cash'],
    impactIntensity: 0.7
  },
  
  // Commodity-focused factors
  {
    id: 'commodity_crash',
    name: 'Commodity Price Crash',
    category: 'market',
    relevantAssetClasses: ['commodity'],
    impactIntensity: 0.9
  },
  {
    id: 'energy_shock',
    name: 'Energy Price Shock',
    category: 'geopolitical',
    relevantAssetClasses: ['commodity', 'equity'],
    impactIntensity: 0.8
  },
  
  // Real Estate-focused factors
  {
    id: 'real_estate_crash',
    name: 'Real Estate Market Crash',
    category: 'market',
    relevantAssetClasses: ['real_estate'],
    impactIntensity: 0.9
  },
  
  // Cross-asset factors
  {
    id: 'liquidity_crisis',
    name: 'Liquidity Crisis',
    category: 'liquidity',
    relevantAssetClasses: ['equity', 'bond', 'alternative', 'real_estate'],
    impactIntensity: 0.8
  },
  {
    id: 'currency_crisis',
    name: 'Currency Crisis',
    category: 'market',
    relevantAssetClasses: ['equity', 'bond', 'commodity'],
    impactIntensity: 0.7
  },
  {
    id: 'geopolitical_shock',
    name: 'Geopolitical Shock',
    category: 'geopolitical',
    relevantAssetClasses: ['equity', 'commodity', 'alternative'],
    impactIntensity: 0.6
  }
];

/**
 * Analyze portfolio composition to understand asset class weights and concentration
 */
export const analyzePortfolioComposition = (portfolio: Portfolio): PortfolioComposition => {
  const totalValue = portfolio.assets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0);
  
  // Calculate asset class weights
  const assetClassWeights: Record<AssetClass, number> = {} as Record<AssetClass, number>;
  
  portfolio.assets.forEach(asset => {
    const assetValue = asset.price * asset.quantity;
    const weight = assetValue / totalValue;
    
    if (!assetClassWeights[asset.assetClass as AssetClass]) {
      assetClassWeights[asset.assetClass as AssetClass] = 0;
    }
    // Round to reasonable precision to avoid extremely long decimals
    assetClassWeights[asset.assetClass as AssetClass] += parseFloat(weight.toFixed(6));
  });
  
  // Identify dominant asset classes (>20% allocation)
  const dominantAssetClasses = Object.entries(assetClassWeights)
    .filter(([_, weight]) => weight > 0.2)
    .map(([assetClass, _]) => assetClass as AssetClass);
  
  // Determine concentration level
  const maxWeight = Math.max(...Object.values(assetClassWeights));
  const concentrationLevel = 
    maxWeight > 0.8 ? 'high' :
    maxWeight > 0.5 ? 'medium' : 'low';
  
  // Check for cross-asset exposure
  const crossAssetExposure = Object.keys(assetClassWeights).length > 2;
  
  return {
    assetClassWeights,
    dominantAssetClasses,
    concentrationLevel,
    crossAssetExposure,
    totalValue
  };
};

/**
 * Select relevant stress factors based on portfolio composition
 */
export const selectRelevantStressFactors = (
  composition: PortfolioComposition,
  stressIntensity: 'mild' | 'moderate' | 'severe' | 'extreme'
): StressFactor[] => {
  const relevantFactors: StressFactor[] = [];
  
  // Get factors that are relevant to the portfolio's asset classes
  STRESS_FACTORS.forEach(factor => {
    const relevanceScore = factor.relevantAssetClasses.reduce((score, assetClass) => {
      return score + (composition.assetClassWeights[assetClass] || 0);
    }, 0);
    
    // Include factor if it has meaningful relevance (>10% portfolio exposure)
    if (relevanceScore > 0.1) {
      relevantFactors.push(factor);
    }
  });
  
  // Add mandatory cross-asset factors for severe/extreme scenarios
  if (stressIntensity === 'severe' || stressIntensity === 'extreme') {
    const liquidityCrisis = STRESS_FACTORS.find(f => f.id === 'liquidity_crisis');
    if (liquidityCrisis && !relevantFactors.includes(liquidityCrisis)) {
      relevantFactors.push(liquidityCrisis);
    }
  }
  
  return relevantFactors;
};

/**
 * Calculate stress impact for each factor based on portfolio composition
 */
export const calculateFactorImpacts = (
  composition: PortfolioComposition,
  factors: StressFactor[],
  stressIntensity: 'mild' | 'moderate' | 'severe' | 'extreme'
): Record<string, { impact: number; relevance: number; description: string }> => {
  const intensityMultipliers = {
    mild: 0.5,
    moderate: 1.0,
    severe: 1.5,
    extreme: 2.0
  };
  
  const factorImpacts: Record<string, { impact: number; relevance: number; description: string }> = {};
  
  factors.forEach(factor => {
    // Calculate relevance based on asset class weights
    const relevance = factor.relevantAssetClasses.reduce((score, assetClass) => {
      return score + (composition.assetClassWeights[assetClass] || 0);
    }, 0);
    
    // Calculate impact based on factor intensity, relevance, and stress intensity
    const baseImpact = factor.impactIntensity * relevance * intensityMultipliers[stressIntensity];
    
    // Apply concentration adjustment
    const concentrationAdjustment = 
      composition.concentrationLevel === 'high' ? 1.2 :
      composition.concentrationLevel === 'medium' ? 1.1 : 1.0;
    
    const impact = baseImpact * concentrationAdjustment;
    
    factorImpacts[factor.id] = {
      impact: Math.round(impact * 10000) / 100, // Convert to percentage with 2 decimals
      relevance: Math.round(relevance * 100),
      description: generateFactorDescription(factor, relevance, stressIntensity)
    };
  });
  
  return factorImpacts;
};

/**
 * Generate descriptive text for factor impact
 */
const generateFactorDescription = (
  factor: StressFactor,
  relevance: number,
  intensity: 'mild' | 'moderate' | 'severe' | 'extreme'
): string => {
  const relevanceText = relevance > 0.7 ? 'High' : relevance > 0.4 ? 'Medium' : 'Low';
  const intensityText = intensity.charAt(0).toUpperCase() + intensity.slice(1);
  
  return `${relevanceText} relevance to portfolio. ${intensityText} stress scenario impact.`;
};

/**
 * Run intelligent stress test based on portfolio composition
 */
export const runIntelligentStressTest = async (
  config: IntelligentStressConfig
): Promise<IntelligentStressResults> => {
  // Analyze portfolio composition
  const composition = analyzePortfolioComposition(config.portfolio);
  
  // Select relevant stress factors
  const relevantFactors = config.selectedFactors 
    ? STRESS_FACTORS.filter(f => config.selectedFactors!.includes(f.id))
    : selectRelevantStressFactors(composition, config.stressIntensity);
  
  // Calculate factor impacts
  const factorContributions = calculateFactorImpacts(
    composition, 
    relevantFactors, 
    config.stressIntensity
  );
  
  // Calculate overall portfolio impact
  let totalImpact = 0;
  const assetClassImpacts: Record<AssetClass, number> = {} as Record<AssetClass, number>;
  
  // Apply impacts by asset class
  Object.entries(composition.assetClassWeights).forEach(([assetClass, weight]) => {
    let assetClassImpact = 0;
    
    relevantFactors.forEach(factor => {
      if (factor.relevantAssetClasses.includes(assetClass as AssetClass)) {
        const factorImpact = factorContributions[factor.id].impact;
        assetClassImpact += factorImpact * weight;
      }
    });
    
    assetClassImpacts[assetClass as AssetClass] = assetClassImpact;
    totalImpact += assetClassImpact * weight;
  });
  
  const stressedValue = composition.totalValue * (1 - totalImpact / 100);
  
  // Generate recommendations
  const recommendedActions = generateRecommendations(composition, factorContributions, config.stressIntensity);
  
  return {
    originalValue: composition.totalValue,
    stressedValue,
    totalImpact: totalImpact,
    factorContributions,
    assetClassImpacts,
    recommendedActions
  };
};

/**
 * Generate actionable recommendations based on stress test results
 */
const generateRecommendations = (
  composition: PortfolioComposition,
  factorContributions: Record<string, { impact: number; relevance: number; description: string }>,
  intensity: 'mild' | 'moderate' | 'severe' | 'extreme'
): string[] => {
  const recommendations: string[] = [];
  
  // High concentration warning
  if (composition.concentrationLevel === 'high') {
    recommendations.push('Consider diversifying across more asset classes to reduce concentration risk');
  }
  
  // Specific recommendations based on dominant factors
  const topFactors = Object.entries(factorContributions)
    .sort(([,a], [,b]) => b.impact - a.impact)
    .slice(0, 3);
  
  topFactors.forEach(([factorId, factorData]) => {
    const factor = STRESS_FACTORS.find(f => f.id === factorId);
    if (factor && factorData.impact > 5) { // Only for significant impacts
      recommendations.push(getFactorSpecificRecommendation(factor, factorData.impact));
    }
  });
  
  // General hedging recommendations for severe scenarios
  if (intensity === 'severe' || intensity === 'extreme') {
    recommendations.push('Consider implementing hedging strategies for tail risk protection');
    recommendations.push('Review portfolio liquidity and ensure adequate cash reserves');
  }
  
  return recommendations;
};

/**
 * Get factor-specific recommendations
 */
const getFactorSpecificRecommendation = (factor: StressFactor, impact: number): string => {
  const baseRecommendations: Record<string, string> = {
    equity_crash: 'Consider reducing equity exposure or adding defensive sectors',
    volatility_spike: 'Consider volatility hedging through options or VIX instruments',
    interest_rate_shock: 'Review duration risk and consider rate hedging strategies',
    credit_spread_widening: 'Consider reducing credit risk or diversifying credit quality',
    liquidity_crisis: 'Ensure adequate liquidity buffers and review position sizes',
    commodity_crash: 'Consider reducing commodity exposure or adding defensive alternatives',
    real_estate_crash: 'Review real estate allocations and geographic diversification'
  };
  
  return baseRecommendations[factor.id] || 'Review exposure to this risk factor';
};

const intelligentStressTestService = {
  analyzePortfolioComposition,
  selectRelevantStressFactors,
  runIntelligentStressTest
};

export default intelligentStressTestService; 
/**
 * Structured Stress Test Service
 * ==============================
 * 
 * This service provides a clean interface to the new structured stress testing API
 * that uses proper quantitative finance methodologies with Python backend.
 */

import displayNameService from './displayNameService';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface Asset {
  symbol: string;
  name: string;
  assetType: 'equity' | 'bond' | 'commodity' | 'reit' | 'cash';
  assetClass: string;
  sector: string;
  marketCap?: string;
  geography?: string;
  quantity: number;
  price: number;
  value: number;
  weight: number;
  beta?: number;
  duration?: number;
  creditRating?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  assets: Asset[];
  riskMetrics: {
    beta: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  assetAllocation: Record<string, number>;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'template' | 'custom' | 'regulatory' | 'historical';
  severity: 'low' | 'moderate' | 'severe' | 'extreme';
  factors: {
    equity: number;
    rates: number;
    credit: number;
    fx: number;
    commodity: number;
    volatility: number;
  };
  icon?: string;
  color?: string;
}

export interface StressTestOptions {
  confidenceLevel?: number;
  timeHorizon?: number;
  includeGreeks?: boolean;
  includeFactorAttribution?: boolean;
  includeCoverage?: boolean;
  includeRiskMetrics?: boolean;
}

export interface AssetResult {
  symbol: string;
  name: string;
  assetType: string;
  assetClass: string;
  sector: string;
  quantity: number;
  price: number;
  current_value: number;
  stressed_value: number;
  impact_value: number;
  impact_percent: number;
  factor_contributions: {
    equity: number;
    rates: number;
    credit: number;
    fx: number;
    commodity: number;
  };
  weight: number;
  contribution_to_portfolio: number;
}

export interface StressTestResult {
  portfolioValue: number;
  stressedValue: number;
  totalImpact: number;
  totalImpactPercent: number;
  assetClassImpacts: Record<string, {
    current_value: number;
    stressed_value: number;
    impact_value: number;
    impact_percent: number;
    weight: number;
  }>;
  factorAttribution: Record<string, number>;
  riskMetrics: {
    concentration: number;
    diversification: number;
    coverage: number;
    tailRisk: number;
    volatilityImpact: number;
  };
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
  };
  assetResults: AssetResult[];
  scenarioFactors: Record<string, number>;
  metadata: {
    calculationTime: string;
    scenarioName: string;
    scenarioId: string;
    portfolioName: string;
    portfolioId: string;
    assetsCount: number;
  };
}

export interface StressTestResponse {
  success: boolean;
  results: StressTestResult;
  error?: string;
  metadata: {
    scenarioId: string;
    portfolioId: string;
    executionTime: number;
    timestamp: string;
  };
}

export interface StressTestHistoryItem {
  id: string;
  scenarioId: string;
  portfolioId: string;
  timestamp: string;
  results: {
    portfolioValue: number;
    stressedValue: number;
    totalImpact: number;
    totalImpactPercent: number;
  };
}

// ==========================================
// STRUCTURED STRESS TEST SERVICE
// ==========================================

export class StructuredStressTestService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:3000/api/stress-test';
  }

  // ==========================================
  // PORTFOLIO METHODS
  // ==========================================

  /**
   * Get all portfolios
   */
  async getPortfolios(): Promise<Portfolio[]> {
    try {
      const response = await fetch(`${this.baseUrl}/portfolios`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch portfolios');
      }
      
      return data.portfolios;
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      throw error;
    }
  }

  /**
   * Get specific portfolio by ID
   */
  async getPortfolio(portfolioId: string): Promise<Portfolio> {
    try {
      const response = await fetch(`${this.baseUrl}/portfolios/${portfolioId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch portfolio');
      }
      
      return data.portfolio;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      throw error;
    }
  }

  // ==========================================
  // SCENARIO METHODS
  // ==========================================

  /**
   * Get all scenarios
   */
  async getScenarios(): Promise<Scenario[]> {
    try {
      const response = await fetch(`${this.baseUrl}/scenarios`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch scenarios');
      }
      
      return data.scenarios;
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      throw error;
    }
  }

  /**
   * Get specific scenario by ID
   */
  async getScenario(scenarioId: string): Promise<Scenario> {
    try {
      const response = await fetch(`${this.baseUrl}/scenarios/${scenarioId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch scenario');
      }
      
      return data.scenario;
    } catch (error) {
      console.error('Error fetching scenario:', error);
      throw error;
    }
  }

  // ==========================================
  // STRESS TEST METHODS
  // ==========================================

  /**
   * Run stress test with structured API
   */
  async runStressTest(
    scenarioId: string,
    portfolioId: string,
    options: StressTestOptions = {}
  ): Promise<StressTestResult> {
    try {
      console.log('🔄 Running structured stress test...');
      console.log(`   Scenario: ${scenarioId}`);
      console.log(`   Portfolio: ${portfolioId}`);
      console.log(`   Options:`, options);

      const response = await fetch(`${this.baseUrl}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId,
          portfolioId,
          options: {
            confidenceLevel: 0.95,
            timeHorizon: 1,
            includeGreeks: true,
            includeFactorAttribution: true,
            includeCoverage: true,
            includeRiskMetrics: true,
            ...options
          }
        }),
      });

      const data: StressTestResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Stress test failed');
      }

      console.log('✅ Structured stress test completed successfully');
      console.log(`   Total Impact: ${(data.results.totalImpactPercent || 0).toFixed(2)}%`);
      console.log(`   Portfolio Value: $${(data.results.portfolioValue || 0).toLocaleString()}`);
      console.log(`   Stressed Value: $${(data.results.stressedValue || 0).toLocaleString()}`);
      
      // Enhance results with proper display names
      const enhancedResults = await this.enhanceResultsWithDisplayNames(data.results, scenarioId, portfolioId);
      
      return enhancedResults;
      
    } catch (error) {
      console.error('❌ Error running structured stress test:', error);
      throw error;
    }
  }

  /**
   * Enhance stress test results with proper display names
   */
  private async enhanceResultsWithDisplayNames(
    results: StressTestResult,
    scenarioId: string,
    portfolioId: string
  ): Promise<StressTestResult> {
    try {
      // Get display names from our service
      const scenarioName = await displayNameService.getScenarioDisplayName(scenarioId);
      const portfolioName = await displayNameService.getPortfolioDisplayName(portfolioId);

      // Return enhanced results with proper names
      return {
        ...results,
        metadata: {
          ...results.metadata,
          scenarioName,
          portfolioName,
          scenarioId,
          portfolioId
        }
      };
    } catch (error) {
      console.error('Error enhancing results with display names:', error);
      // Return original results if enhancement fails
      return results;
    }
  }

  /**
   * Get stress test history
   */
  async getStressTestHistory(
    portfolioId?: string,
    scenarioId?: string,
    limit: number = 10
  ): Promise<StressTestHistoryItem[]> {
    try {
      const params = new URLSearchParams();
      if (portfolioId) params.append('portfolioId', portfolioId);
      if (scenarioId) params.append('scenarioId', scenarioId);
      params.append('limit', limit.toString());

      const response = await fetch(`${this.baseUrl}/history?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch stress test history');
      }
      
      return data.history;
    } catch (error) {
      console.error('Error fetching stress test history:', error);
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/stress-test', '')}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Error testing API connection:', error);
      return false;
    }
  }

  /**
   * Get API status
   */
  async getApiStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/stress-test', '')}/health`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting API status:', error);
      throw error;
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    const safeValue = value || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeValue);
  }

  /**
   * Format percentage value
   */
  formatPercentage(value: number): string {
    const safeValue = value || 0;
    return `${safeValue >= 0 ? '+' : ''}${safeValue.toFixed(2)}%`;
  }

  /**
   * Get scenario severity color
   */
  getScenarioSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return '#22c55e';
      case 'moderate': return '#f59e0b';
      case 'severe': return '#ef4444';
      case 'extreme': return '#dc2626';
      default: return '#6b7280';
    }
  }

  /**
   * Get asset type color
   */
  getAssetTypeColor(assetType: string): string {
    switch (assetType) {
      case 'equity': return '#3b82f6';
      case 'bond': return '#10b981';
      case 'commodity': return '#f59e0b';
      case 'reit': return '#8b5cf6';
      case 'cash': return '#6b7280';
      default: return '#6b7280';
    }
  }

  /**
   * Calculate portfolio concentration
   */
  calculateConcentration(assets: Asset[]): number {
    const weights = assets.map(asset => asset.weight);
    return weights.reduce((sum, weight) => sum + weight * weight, 0);
  }

  /**
   * Get top contributors to portfolio impact
   */
  getTopContributors(assetResults: AssetResult[], count: number = 5): AssetResult[] {
    return assetResults
      .sort((a, b) => Math.abs(b.contribution_to_portfolio) - Math.abs(a.contribution_to_portfolio))
      .slice(0, count);
  }

  /**
   * Calculate factor impact summary
   */
  calculateFactorImpactSummary(factorAttribution: Record<string, number>) {
    const total = Object.values(factorAttribution).reduce((sum, val) => sum + Math.abs(val), 0);
    
    return Object.entries(factorAttribution).map(([factor, impact]) => ({
      factor,
      impact,
      percentage: total > 0 ? (Math.abs(impact) / total) * 100 : 0
    })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

export const structuredStressTestService = new StructuredStressTestService(); 
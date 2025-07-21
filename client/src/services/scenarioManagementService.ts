import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portfolio } from './portfolioService';
import quantitativeStressTestService from './quantitativeStressTestService';

// ==========================================
// SCENARIO MANAGEMENT SYSTEM
// ==========================================

/**
 * Scenario ID Structure:
 * Templates: TMPLxxxx (e.g., TMPL0001, TMPL0002)
 * Custom: CUSTxxxx (e.g., CUST0001, CUST0002)
 * Historical: HISTxxxx (e.g., HIST0001, HIST0002)
 * Regulatory: REGLxxxx (e.g., REGL0001, REGL0002)
 */

export enum ScenarioCategory {
  MARKET_CRISIS = 'crisis',
  INTEREST_RATES = 'rates',
  POLICY_CHANGES = 'policy',
  SECTOR_SPECIFIC = 'sector',
  GEOPOLITICAL = 'geopolitical',
  COMMODITY_SHOCK = 'commodity',
  CREDIT_EVENTS = 'credit',
  CUSTOM = 'custom',
  HISTORICAL = 'historical',
  REGULATORY = 'regulatory'
}

export enum ScenarioType {
  TEMPLATE = 'template',
  CUSTOM = 'custom',
  HISTORICAL = 'historical',
  REGULATORY = 'regulatory'
}

export interface ScenarioFactorChanges {
  equity: number;        // Percentage change in equity markets
  rates: number;         // Basis points change in interest rates
  credit: number;        // Basis points change in credit spreads
  fx: number;           // Percentage change in FX (USD strength)
  commodity: number;    // Percentage change in commodity prices
  volatility?: number;  // Percentage change in volatility (VIX)
  correlation?: number; // Change in cross-asset correlations
}

export interface ScenarioMetadata {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  type: ScenarioType;
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  timeHorizon: number;  // Days
  confidence: number;   // 0-1 scale
  tags: string[];
  regulatory?: {
    framework: string;  // e.g., 'CCAR', 'Basel III', 'Solvency II'
    year: number;
    jurisdiction: string;
  };
  historical?: {
    startDate: string;
    endDate: string;
    eventName: string;
  };
  created: string;
  updated: string;
  createdBy: string;
  version: number;
}

export interface Scenario {
  metadata: ScenarioMetadata;
  factorChanges: ScenarioFactorChanges;
  icon: string;
  color: string;
  isActive: boolean;
  usageCount: number;
  lastUsed?: string;
}

export interface ScenarioRun {
  id: string;
  scenarioId: string;
  portfolioId: string;
  timestamp: string;
  results: {
    portfolioValue: number;
    stressedValue: number;
    totalImpact: number;
    totalImpactPercent: number;
    assetClassImpacts: Record<string, { impact: number; impactPercent: number }>;
    factorAttribution: Record<string, number>;
    riskMetrics: {
      concentration: number;
      diversification: number;
      leverageEffect: number;
    };
    positionResults: Array<{
      symbol: string;
      assetClass: string;
      currentValue: number;
      stressedValue: number;
      impact: number;
      impactPercent: number;
      factorContributions: Record<string, number>;
    }>;
  };
  duration: number; // Execution time in ms
  status: 'completed' | 'failed' | 'in_progress';
  error?: string;
}

// ==========================================
// TEMPLATE SCENARIOS DATABASE
// ==========================================

export const TEMPLATE_SCENARIOS: Record<string, Scenario> = {
  'TMPL0001': {
    metadata: {
      id: 'TMPL0001',
      name: '2008 Financial Crisis',
      description: 'Simulate the market conditions from the 2008 global financial crisis with credit freeze and equity collapse',
      category: ScenarioCategory.MARKET_CRISIS,
      type: ScenarioType.TEMPLATE,
      severity: 'extreme',
      timeHorizon: 365,
      confidence: 0.95,
      tags: ['crisis', 'credit', 'equity', 'historical', 'systemic'],
      historical: {
        startDate: '2008-09-15',
        endDate: '2009-03-09',
        eventName: 'Lehman Brothers Collapse'
      },
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -45,
      rates: -200,
      credit: 350,
      fx: -15,
      commodity: -30,
      volatility: 150,
      correlation: 0.8
    },
    icon: 'trending-down',
    color: '#dc2626',
    isActive: true,
    usageCount: 0
  },

  'TMPL0002': {
    metadata: {
      id: 'TMPL0002',
      name: 'Fed Rate Hike +100bps',
      description: 'Federal Reserve increases interest rates by 100 basis points with market adjustment',
      category: ScenarioCategory.INTEREST_RATES,
      type: ScenarioType.TEMPLATE,
      severity: 'moderate',
      timeHorizon: 90,
      confidence: 0.85,
      tags: ['rates', 'fed', 'monetary', 'duration'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -8,
      rates: 100,
      credit: 75,
      fx: 5,
      commodity: -3,
      volatility: 25
    },
    icon: 'bank',
    color: '#f59e0b',
    isActive: true,
    usageCount: 0
  },

  'TMPL0003': {
    metadata: {
      id: 'TMPL0003',
      name: 'Oil Price Shock +50%',
      description: 'Crude oil prices surge 50% due to supply disruption or geopolitical tension',
      category: ScenarioCategory.COMMODITY_SHOCK,
      type: ScenarioType.TEMPLATE,
      severity: 'moderate',
      timeHorizon: 180,
      confidence: 0.75,
      tags: ['oil', 'commodity', 'inflation', 'geopolitical'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -5,
      rates: 25,
      credit: 15,
      fx: -3,
      commodity: 50,
      volatility: 30
    },
    icon: 'oil',
    color: '#10b981',
    isActive: true,
    usageCount: 0
  },

  'TMPL0004': {
    metadata: {
      id: 'TMPL0004',
      name: 'Technology Sector Correction',
      description: 'Technology stocks decline 25% due to regulatory concerns or valuation reset',
      category: ScenarioCategory.SECTOR_SPECIFIC,
      type: ScenarioType.TEMPLATE,
      severity: 'moderate',
      timeHorizon: 60,
      confidence: 0.70,
      tags: ['tech', 'sector', 'valuation', 'growth'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -12,
      rates: -15,
      credit: 30,
      fx: -2,
      commodity: 0,
      volatility: 40
    },
    icon: 'laptop',
    color: '#3b82f6',
    isActive: true,
    usageCount: 0
  },

  'TMPL0005': {
    metadata: {
      id: 'TMPL0005',
      name: 'COVID-19 Pandemic Crash',
      description: 'Simulate the March 2020 market crash from COVID-19 pandemic and global lockdowns',
      category: ScenarioCategory.MARKET_CRISIS,
      type: ScenarioType.TEMPLATE,
      severity: 'extreme',
      timeHorizon: 30,
      confidence: 0.90,
      tags: ['pandemic', 'lockdown', 'liquidity', 'crash'],
      historical: {
        startDate: '2020-02-19',
        endDate: '2020-03-23',
        eventName: 'COVID-19 Market Crash'
      },
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -34,
      rates: -150,
      credit: 200,
      fx: -8,
      commodity: -77,
      volatility: 200
    },
    icon: 'pulse',
    color: '#7c2d12',
    isActive: true,
    usageCount: 0
  },

  'TMPL0006': {
    metadata: {
      id: 'TMPL0006',
      name: 'Market Decline -25%',
      description: 'Broad equity market decline of 25% with minimal other factor impacts',
      category: ScenarioCategory.MARKET_CRISIS,
      type: ScenarioType.TEMPLATE,
      severity: 'severe',
      timeHorizon: 90,
      confidence: 0.80,
      tags: ['equity', 'correction', 'broad market'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -25,
      rates: 0,
      credit: 0,
      fx: 0,
      commodity: 0,
      volatility: 50
    },
    icon: 'trending-down',
    color: '#dc2626',
    isActive: true,
    usageCount: 0
  },

  'TMPL0007': {
    metadata: {
      id: 'TMPL0007',
      name: 'Credit Crisis +350bps',
      description: 'Corporate credit spreads widen 350 basis points amid default concerns',
      category: ScenarioCategory.CREDIT_EVENTS,
      type: ScenarioType.TEMPLATE,
      severity: 'severe',
      timeHorizon: 180,
      confidence: 0.75,
      tags: ['credit', 'spreads', 'default', 'corporate'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -15,
      rates: -50,
      credit: 350,
      fx: 0,
      commodity: 0,
      volatility: 60
    },
    icon: 'alert-triangle',
    color: '#ef4444',
    isActive: true,
    usageCount: 0
  },

  'TMPL0008': {
    metadata: {
      id: 'TMPL0008',
      name: 'Geopolitical Shock',
      description: 'Major geopolitical event causing flight to quality and risk-off sentiment',
      category: ScenarioCategory.GEOPOLITICAL,
      type: ScenarioType.TEMPLATE,
      severity: 'moderate',
      timeHorizon: 30,
      confidence: 0.65,
      tags: ['geopolitical', 'flight to quality', 'risk-off'],
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -12,
      rates: -25,
      credit: 100,
      fx: 8,
      commodity: 15,
      volatility: 80
    },
    icon: 'globe',
    color: '#8b5cf6',
    isActive: true,
    usageCount: 0
  }
};

// ==========================================
// REGULATORY SCENARIOS DATABASE
// ==========================================

export const REGULATORY_SCENARIOS: Record<string, Scenario> = {
  'REGL0001': {
    metadata: {
      id: 'REGL0001',
      name: 'CCAR Severely Adverse Scenario',
      description: 'Federal Reserve CCAR severely adverse scenario for stress testing',
      category: ScenarioCategory.REGULATORY,
      type: ScenarioType.REGULATORY,
      severity: 'severe',
      timeHorizon: 365,
      confidence: 1.0,
      tags: ['ccar', 'fed', 'regulatory', 'banking'],
      regulatory: {
        framework: 'CCAR',
        year: 2024,
        jurisdiction: 'US'
      },
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -40,
      rates: -200,
      credit: 400,
      fx: -10,
      commodity: -20,
      volatility: 120
    },
    icon: 'shield-check',
    color: '#059669',
    isActive: true,
    usageCount: 0
  },

  'REGL0002': {
    metadata: {
      id: 'REGL0002',
      name: 'Basel III Stress Test',
      description: 'Basel III standardized stress scenario for international banks',
      category: ScenarioCategory.REGULATORY,
      type: ScenarioType.REGULATORY,
      severity: 'severe',
      timeHorizon: 365,
      confidence: 1.0,
      tags: ['basel', 'international', 'banking', 'capital'],
      regulatory: {
        framework: 'Basel III',
        year: 2024,
        jurisdiction: 'International'
      },
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      createdBy: 'system',
      version: 1
    },
    factorChanges: {
      equity: -35,
      rates: -150,
      credit: 300,
      fx: -15,
      commodity: -25,
      volatility: 100
    },
    icon: 'building',
    color: '#0369a1',
    isActive: true,
    usageCount: 0
  }
};

// ==========================================
// STORAGE KEYS
// ==========================================

const STORAGE_KEYS = {
  SCENARIOS: 'scenarios_v2',
  SCENARIO_RUNS: 'scenario_runs_v2',
  CUSTOM_SCENARIOS: 'custom_scenarios_v2',
  SCENARIO_COUNTER: 'scenario_counter_v2',
  SCENARIO_METADATA: 'scenario_metadata_v2'
};

// ==========================================
// SCENARIO MANAGEMENT SERVICE
// ==========================================

export class ScenarioManagementService {
  private static instance: ScenarioManagementService;
  private customScenarioCounter: number = 1;

  private constructor() {}

  static getInstance(): ScenarioManagementService {
    if (!ScenarioManagementService.instance) {
      ScenarioManagementService.instance = new ScenarioManagementService();
    }
    return ScenarioManagementService.instance;
  }

  /**
   * Initialize the scenario management system
   */
  async initialize(): Promise<void> {
    try {
      // Load custom scenario counter
      const counter = await AsyncStorage.getItem(STORAGE_KEYS.SCENARIO_COUNTER);
      this.customScenarioCounter = counter ? parseInt(counter) : 1;

      // Ensure all template scenarios are stored
      await this.syncTemplateScenarios();

      console.log('✅ Scenario Management System initialized');
    } catch (error) {
      console.error('❌ Error initializing scenario management:', error);
    }
  }

  /**
   * Sync template scenarios to storage
   */
  private async syncTemplateScenarios(): Promise<void> {
    const allTemplates = { ...TEMPLATE_SCENARIOS, ...REGULATORY_SCENARIOS };
    await AsyncStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(allTemplates));
  }

  /**
   * Generate next available custom scenario ID
   */
  private async generateCustomScenarioId(): Promise<string> {
    const id = `CUST${this.customScenarioCounter.toString().padStart(4, '0')}`;
    this.customScenarioCounter++;
    await AsyncStorage.setItem(STORAGE_KEYS.SCENARIO_COUNTER, this.customScenarioCounter.toString());
    return id;
  }

  /**
   * Get all scenarios (templates + custom)
   */
  async getAllScenarios(): Promise<Record<string, Scenario>> {
    try {
      const templates = await AsyncStorage.getItem(STORAGE_KEYS.SCENARIOS);
      const custom = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_SCENARIOS);

      const templateScenarios = templates ? JSON.parse(templates) : {};
      const customScenarios = custom ? JSON.parse(custom) : {};

      return { ...templateScenarios, ...customScenarios };
    } catch (error) {
      console.error('Error loading scenarios:', error);
      return {};
    }
  }

  /**
   * Get scenario by ID
   */
  async getScenarioById(id: string): Promise<Scenario | null> {
    const scenarios = await this.getAllScenarios();
    return scenarios[id] || null;
  }

  /**
   * Get scenarios by category
   */
  async getScenariosByCategory(category: ScenarioCategory): Promise<Scenario[]> {
    const scenarios = await this.getAllScenarios();
    return Object.values(scenarios).filter(s => s.metadata.category === category);
  }

  /**
   * Get scenarios by type
   */
  async getScenariosByType(type: ScenarioType): Promise<Scenario[]> {
    const scenarios = await this.getAllScenarios();
    return Object.values(scenarios).filter(s => s.metadata.type === type);
  }

  /**
   * Create custom scenario
   */
  async createCustomScenario(
    name: string,
    description: string,
    category: ScenarioCategory,
    factorChanges: ScenarioFactorChanges,
    options: {
      severity?: 'mild' | 'moderate' | 'severe' | 'extreme';
      timeHorizon?: number;
      confidence?: number;
      tags?: string[];
      icon?: string;
      color?: string;
    } = {}
  ): Promise<Scenario> {
    try {
      const id = await this.generateCustomScenarioId();
      const now = new Date().toISOString();

      const scenario: Scenario = {
        metadata: {
          id,
          name,
          description,
          category,
          type: ScenarioType.CUSTOM,
          severity: options.severity || 'moderate',
          timeHorizon: options.timeHorizon || 90,
          confidence: options.confidence || 0.75,
          tags: options.tags || ['custom'],
          created: now,
          updated: now,
          createdBy: 'user',
          version: 1
        },
        factorChanges,
        icon: options.icon || 'edit',
        color: options.color || '#6366f1',
        isActive: true,
        usageCount: 0
      };

      // Save to custom scenarios
      const existingCustom = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_SCENARIOS);
      const customScenarios = existingCustom ? JSON.parse(existingCustom) : {};
      customScenarios[id] = scenario;
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_SCENARIOS, JSON.stringify(customScenarios));

      return scenario;
    } catch (error) {
      console.error('Error creating custom scenario:', error);
      throw error;
    }
  }

  /**
   * Update scenario
   */
  async updateScenario(id: string, updates: Partial<Scenario>): Promise<Scenario> {
    try {
      const scenario = await this.getScenarioById(id);
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      const updatedScenario = {
        ...scenario,
        ...updates,
        metadata: {
          ...scenario.metadata,
          ...updates.metadata,
          updated: new Date().toISOString(),
          version: scenario.metadata.version + 1
        }
      };

      // Save based on type
      if (scenario.metadata.type === ScenarioType.CUSTOM) {
        const customScenarios = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_SCENARIOS);
        const scenarios = customScenarios ? JSON.parse(customScenarios) : {};
        scenarios[id] = updatedScenario;
        await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_SCENARIOS, JSON.stringify(scenarios));
      }

      return updatedScenario;
    } catch (error) {
      console.error('Error updating scenario:', error);
      throw error;
    }
  }

  /**
   * Delete custom scenario
   */
  async deleteScenario(id: string): Promise<void> {
    try {
      const scenario = await this.getScenarioById(id);
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      if (scenario.metadata.type !== ScenarioType.CUSTOM) {
        throw new Error('Cannot delete template scenarios');
      }

      const customScenarios = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_SCENARIOS);
      const scenarios = customScenarios ? JSON.parse(customScenarios) : {};
      delete scenarios[id];
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_SCENARIOS, JSON.stringify(scenarios));
    } catch (error) {
      console.error('Error deleting scenario:', error);
      throw error;
    }
  }

  /**
   * Run scenario on portfolio
   */
  async runScenario(scenarioId: string, portfolioId: string): Promise<ScenarioRun> {
    try {
      const startTime = Date.now();
      
      // Get scenario
      const scenario = await this.getScenarioById(scenarioId);
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      // Get portfolio
      const portfolioService = await import('./portfolioService');
      const portfolio = await portfolioService.default.getPortfolioById(portfolioId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Convert scenario factors to quantitative format
      const scenarioFactors = quantitativeStressTestService.convertScenarioToFactors(scenario.factorChanges);

      // Run quantitative stress test
      const results = await quantitativeStressTestService.runQuantitativeStressTest(portfolio, scenarioFactors);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Create scenario run
      const scenarioRun: ScenarioRun = {
        id: `RUN_${Date.now()}`,
        scenarioId,
        portfolioId,
        timestamp: new Date().toISOString(),
        results,
        duration,
        status: 'completed'
      };

      // Save scenario run
      await this.saveScenarioRun(scenarioRun);

      // Update usage count
      await this.updateScenarioUsage(scenarioId);

      return scenarioRun;
    } catch (error) {
      console.error('Error running scenario:', error);
      
      // Create failed scenario run
      const failedRun: ScenarioRun = {
        id: `RUN_${Date.now()}`,
        scenarioId,
        portfolioId,
        timestamp: new Date().toISOString(),
        results: {
          portfolioValue: 0,
          stressedValue: 0,
          totalImpact: 0,
          totalImpactPercent: 0,
          assetClassImpacts: {},
          factorAttribution: {},
          riskMetrics: { concentration: 0, diversification: 0, leverageEffect: 0 },
          positionResults: []
        },
        duration: 0,
        status: 'failed',
        error: error.message
      };

      await this.saveScenarioRun(failedRun);
      throw error;
    }
  }

  /**
   * Save scenario run
   */
  private async saveScenarioRun(run: ScenarioRun): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.SCENARIO_RUNS);
      const runs = existing ? JSON.parse(existing) : [];
      runs.unshift(run); // Add to beginning
      
      // Keep only last 100 runs
      const trimmedRuns = runs.slice(0, 100);
      
      await AsyncStorage.setItem(STORAGE_KEYS.SCENARIO_RUNS, JSON.stringify(trimmedRuns));
    } catch (error) {
      console.error('Error saving scenario run:', error);
    }
  }

  /**
   * Update scenario usage count
   */
  private async updateScenarioUsage(scenarioId: string): Promise<void> {
    try {
      const scenario = await this.getScenarioById(scenarioId);
      if (scenario) {
        scenario.usageCount++;
        scenario.lastUsed = new Date().toISOString();
        await this.updateScenario(scenarioId, scenario);
      }
    } catch (error) {
      console.error('Error updating scenario usage:', error);
    }
  }

  /**
   * Get scenario runs
   */
  async getScenarioRuns(limit?: number): Promise<ScenarioRun[]> {
    try {
      const runs = await AsyncStorage.getItem(STORAGE_KEYS.SCENARIO_RUNS);
      const allRuns = runs ? JSON.parse(runs) : [];
      return limit ? allRuns.slice(0, limit) : allRuns;
    } catch (error) {
      console.error('Error loading scenario runs:', error);
      return [];
    }
  }

  /**
   * Get scenario runs by scenario ID
   */
  async getScenarioRunsByScenarioId(scenarioId: string): Promise<ScenarioRun[]> {
    const runs = await this.getScenarioRuns();
    return runs.filter(run => run.scenarioId === scenarioId);
  }

  /**
   * Get scenario runs by portfolio ID
   */
  async getScenarioRunsByPortfolioId(portfolioId: string): Promise<ScenarioRun[]> {
    const runs = await this.getScenarioRuns();
    return runs.filter(run => run.portfolioId === portfolioId);
  }

  /**
   * Delete scenario run
   */
  async deleteScenarioRun(runId: string): Promise<void> {
    try {
      const runs = await this.getScenarioRuns();
      const updatedRuns = runs.filter(run => run.id !== runId);
      await AsyncStorage.setItem(STORAGE_KEYS.SCENARIO_RUNS, JSON.stringify(updatedRuns));
    } catch (error) {
      console.error('Error deleting scenario run:', error);
    }
  }

  /**
   * Clear all scenario runs
   */
  async clearScenarioRuns(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCENARIO_RUNS, JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing scenario runs:', error);
    }
  }

  /**
   * Get scenario statistics
   */
  async getScenarioStatistics(): Promise<{
    totalScenarios: number;
    templateScenarios: number;
    customScenarios: number;
    totalRuns: number;
    mostUsedScenarios: Array<{ id: string; name: string; usageCount: number }>;
  }> {
    try {
      const scenarios = await this.getAllScenarios();
      const runs = await this.getScenarioRuns();

      const allScenarios = Object.values(scenarios);
      const templateCount = allScenarios.filter(s => s.metadata.type === ScenarioType.TEMPLATE).length;
      const customCount = allScenarios.filter(s => s.metadata.type === ScenarioType.CUSTOM).length;

      const mostUsed = allScenarios
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(s => ({
          id: s.metadata.id,
          name: s.metadata.name,
          usageCount: s.usageCount
        }));

      return {
        totalScenarios: allScenarios.length,
        templateScenarios: templateCount,
        customScenarios: customCount,
        totalRuns: runs.length,
        mostUsedScenarios: mostUsed
      };
    } catch (error) {
      console.error('Error getting scenario statistics:', error);
      return {
        totalScenarios: 0,
        templateScenarios: 0,
        customScenarios: 0,
        totalRuns: 0,
        mostUsedScenarios: []
      };
    }
  }
}

// Export singleton instance
export const scenarioManager = ScenarioManagementService.getInstance();

// Export default service
export default scenarioManager; 
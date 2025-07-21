import AsyncStorage from '@react-native-async-storage/async-storage';
import { scenarioManager, ScenarioManagementService, ScenarioType, ScenarioCategory, Scenario, ScenarioRun } from './scenarioManagementService';
import displayNameService from './displayNameService';

// ==========================================
// LEGACY SCENARIO SERVICE
// ==========================================

/**
 * Legacy scenario service to maintain backward compatibility
 * while transitioning to the new structured scenario management system
 */
export interface LegacyScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  factorChanges: {
    equity: number;
    rates: number;
    credit: number;
    fx: number;
    commodity: number;
  };
  isCustom?: boolean;
}

/**
 * Legacy scenario run interface for backward compatibility
 */
export interface LegacyScenarioRun {
  id: string;
  scenarioId: string;
  scenarioName: string;
  date: string;
  time: string;
  portfolioId: string;
  portfolioName: string;
  portfolioValue: number;
  impact: number;
  impactValue: number;
  assetClassImpacts: Record<string, number>;
  factorAttribution: Record<string, number>;
  greeksBefore: GreeksResults;
  greeksAfter: GreeksResults;
}

export interface GreeksResults {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface ScenarioFactorChanges {
  equity: number;
  rates: number;
  credit: number;
  fx: number;
  commodity: number;
}

// ==========================================
// LEGACY SCENARIO SERVICE WRAPPER
// ==========================================

class LegacyScenarioService {
  private scenarioManager: ScenarioManagementService;
  private initialized: boolean = false;

  constructor() {
    this.scenarioManager = scenarioManager;
  }

  /**
   * Initialize the scenario management system
   */
  private async initializeScenarios(): Promise<void> {
    if (!this.initialized) {
      await this.scenarioManager.initialize();
      
      // Preload scenario names for faster display
      await displayNameService.preloadScenarioNames();
      
      this.initialized = true;
      console.log('✅ Legacy Scenario Service initialized with new management system');
    }
  }

  /**
   * Get all scenarios in legacy format
   */
  async getScenarios(): Promise<LegacyScenario[]> {
    await this.initializeScenarios();
    
    const allScenarios: LegacyScenario[] = [];
    
    try {
      // First, try to get scenarios from the structured stress test API
      const response = await fetch('http://localhost:3000/api/stress-test/scenarios');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.scenarios) {
          console.log('✅ Loading scenarios from structured stress test API');
          const structuredScenarios = data.scenarios.map((scenario: any) => this.convertStructuredScenarioToLegacyFormat(scenario));
          allScenarios.push(...structuredScenarios);
        }
      }
    } catch (error) {
      console.log('⚠️ Structured stress test API not available, will use legacy system only');
    }
    
    // Always also get scenarios from the legacy scenario management system
    try {
      const scenarios = await this.scenarioManager.getAllScenarios();
      const legacyScenarios = Object.values(scenarios).map(this.convertToLegacyFormat);
      
      // Merge with structured scenarios, avoiding duplicates by ID
      const existingIds = new Set(allScenarios.map(s => s.id));
      const newLegacyScenarios = legacyScenarios.filter(s => !existingIds.has(s.id));
      allScenarios.push(...newLegacyScenarios);
      
      console.log(`✅ Merged scenarios: ${allScenarios.length} total (${allScenarios.length - newLegacyScenarios.length} from API, ${newLegacyScenarios.length} from legacy)`);
    } catch (error) {
      console.error('❌ Error loading scenarios from legacy system:', error);
    }
    
    return allScenarios;
  }

  /**
   * Get scenario by ID in legacy format
   */
  async getScenarioById(id: string): Promise<LegacyScenario | null> {
    await this.initializeScenarios();
    
    const scenario = await this.scenarioManager.getScenarioById(id);
    return scenario ? this.convertToLegacyFormat(scenario) : null;
  }

  /**
   * Get template scenarios
   */
  async getPredefinedScenarios(): Promise<LegacyScenario[]> {
    await this.initializeScenarios();
    
    const scenarios = await this.scenarioManager.getScenariosByType(ScenarioType.TEMPLATE);
    return scenarios.map(this.convertToLegacyFormat);
  }

  /**
   * Get custom scenarios
   */
  async getCustomScenarios(): Promise<LegacyScenario[]> {
    await this.initializeScenarios();
    
    const scenarios = await this.scenarioManager.getScenariosByType(ScenarioType.CUSTOM);
    return scenarios.map(this.convertToLegacyFormat);
  }

  /**
   * Create a new custom scenario
   */
  async createScenario(
    name: string,
    description: string,
    factorChanges: ScenarioFactorChanges,
    options: {
      icon?: string;
      color?: string;
      category?: ScenarioCategory;
    } = {}
  ): Promise<LegacyScenario> {
    await this.initializeScenarios();
    
    const scenario = await this.scenarioManager.createCustomScenario(
      name,
      description,
      options.category || ScenarioCategory.CUSTOM,
      factorChanges,
      {
        icon: options.icon || 'edit',
        color: options.color || '#6366f1'
      }
    );
    
    return this.convertToLegacyFormat(scenario);
  }

  /**
   * Update a scenario
   */
  async updateScenario(id: string, updates: Partial<LegacyScenario>): Promise<LegacyScenario> {
    await this.initializeScenarios();
    
    const scenario = await this.scenarioManager.updateScenario(id, {
      factorChanges: updates.factorChanges,
      icon: updates.icon,
      color: updates.color
    });
    
    return this.convertToLegacyFormat(scenario);
  }

  /**
   * Delete a scenario
   */
  async deleteScenario(id: string): Promise<void> {
    await this.initializeScenarios();
    return this.scenarioManager.deleteScenario(id);
  }

  /**
   * Run a scenario on a portfolio
   */
  async runScenario(scenarioId: string, portfolioId: string): Promise<LegacyScenarioRun> {
    await this.initializeScenarios();
    
    try {
      // First, try to use the structured stress test API
      const response = await fetch('http://localhost:3000/api/stress-test/run', {
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
            includeRiskMetrics: true
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.results) {
          console.log('✅ Scenario run completed via structured stress test API');
          return await this.convertStructuredRunToLegacyFormat(data.results, data.metadata);
        }
      }
    } catch (error) {
      console.log('⚠️ Structured stress test API not available, falling back to legacy system:', error);
    }
    
    // Fallback to legacy scenario management system
    const run = await this.scenarioManager.runScenario(scenarioId, portfolioId);
    return await this.convertRunToLegacyFormat(run);
  }

  /**
   * Run scenario with fresh data (alias for runScenario)
   */
  async runScenarioWithFreshData(scenarioId: string, portfolioId: string): Promise<LegacyScenarioRun> {
    console.log('🔄 RUNNING SCENARIO WITH FRESH PORTFOLIO DATA');
    console.log('Scenario ID:', scenarioId);
    console.log('Portfolio ID:', portfolioId);
    
    return this.runScenario(scenarioId, portfolioId);
  }

  /**
   * Get all scenario runs in legacy format
   */
  async getScenarioRuns(): Promise<LegacyScenarioRun[]> {
    await this.initializeScenarios();
    
    const runs = await this.scenarioManager.getScenarioRuns();
    return await Promise.all(runs.map(run => this.convertRunToLegacyFormat(run)));
  }

  /**
   * Get scenario run by ID
   */
  async getScenarioRunById(id: string): Promise<LegacyScenarioRun | null> {
    await this.initializeScenarios();
    
    const runs = await this.scenarioManager.getScenarioRuns();
    const run = runs.find(r => r.id === id);
    return run ? await this.convertRunToLegacyFormat(run) : null;
  }

  /**
   * Delete scenario run
   */
  async deleteScenarioRun(id: string): Promise<void> {
    await this.initializeScenarios();
    return this.scenarioManager.deleteScenarioRun(id);
  }

  /**
   * Clear all scenario runs
   */
  async clearScenarioRuns(): Promise<void> {
    await this.initializeScenarios();
    return this.scenarioManager.clearScenarioRuns();
  }

  /**
   * Get recent scenarios for dashboard
   */
  async getRecentScenarios(): Promise<Array<{
    id: string;
    name: string;
    portfolioName: string;
    impactValue: number;
    runDate: string;
  }>> {
    await this.initializeScenarios();
    
    const runs = await this.scenarioManager.getScenarioRuns(5);
    
    // Convert to dashboard format with display names
    return await Promise.all(runs.map(async (run) => {
      const scenarioName = await displayNameService.getScenarioDisplayName(run.scenarioId);
      const portfolioName = await displayNameService.getPortfolioDisplayName(run.portfolioId);
      
      return {
        id: run.id,
        name: scenarioName,
        portfolioName: portfolioName,
        impactValue: run.results.totalImpactPercent,
        runDate: run.timestamp
      };
    }));
  }

  /**
   * Reset to default scenarios (no-op in new system)
   */
  async resetToDefaultScenarios(): Promise<void> {
    await this.initializeScenarios();
    // New system auto-syncs templates, so this is a no-op
    console.log('✅ Template scenarios are auto-synced in new system');
  }

  /**
   * Refresh predefined scenarios (no-op in new system)
   */
  async refreshPredefinedScenarios(): Promise<void> {
    await this.initializeScenarios();
    // New system auto-syncs templates, so this is a no-op
    console.log('✅ Template scenarios are auto-synced in new system');
  }

  // ==========================================
  // CONVERSION UTILITIES
  // ==========================================

  /**
   * Convert new scenario format to legacy format
   */
  private convertToLegacyFormat(scenario: Scenario): LegacyScenario {
    // Ensure factorChanges exists with default values
    const defaultFactorChanges = {
      equity: 0,
      rates: 0,
      credit: 0,
      fx: 0,
      commodity: 0
    };
    
    const factorChanges = scenario.factorChanges || defaultFactorChanges;
    
    return {
      id: scenario.metadata.id,
      name: scenario.metadata.name || 'Unnamed Scenario',
      description: scenario.metadata.description || '',
      icon: scenario.icon || 'pulse',
      color: scenario.color || '#6366f1',
      factorChanges: {
        equity: factorChanges.equity || 0,
        rates: factorChanges.rates || 0,
        credit: factorChanges.credit || 0,
        fx: factorChanges.fx || 0,
        commodity: factorChanges.commodity || 0
      },
      isCustom: scenario.metadata.type === ScenarioType.CUSTOM
    };
  }

  /**
   * Convert structured API scenario to legacy format
   */
  private convertStructuredScenarioToLegacyFormat(scenario: any): LegacyScenario {
    const factorChanges = {
      equity: scenario.factors?.equity || 0,
      rates: scenario.factors?.rates || 0,
      credit: scenario.factors?.credit || 0,
      fx: scenario.factors?.fx || 0,
      commodity: scenario.factors?.commodity || 0
    };
    
    return {
      id: scenario.id,
      name: scenario.name || 'Unnamed Scenario',
      description: scenario.description || '',
      icon: scenario.icon || 'pulse',
      color: scenario.color || '#6366f1',
      factorChanges,
      isCustom: scenario.type === 'custom'
    };
  }

  /**
   * Convert new scenario run format to legacy format
   */
  private async convertRunToLegacyFormat(run: ScenarioRun): Promise<LegacyScenarioRun> {
    const timestamp = new Date(run.timestamp);
    const date = timestamp.toISOString().split('T')[0];
    const time = timestamp.toTimeString().split(' ')[0].substring(0, 5);

    // Convert asset class impacts format
    const assetClassImpacts: Record<string, number> = {};
    Object.entries(run.results.assetClassImpacts).forEach(([assetClass, data]) => {
      assetClassImpacts[assetClass] = data.impactPercent;
    });

    // Generate mock Greeks (legacy requirement)
    const greeksBefore = this.generateMockGreeks();
    const greeksAfter = this.adjustGreeksBasedOnImpact(greeksBefore, run.results.totalImpactPercent);

    // Get display names for scenario and portfolio
    const scenarioName = await displayNameService.getScenarioDisplayName(run.scenarioId);
    const portfolioName = await displayNameService.getPortfolioDisplayName(run.portfolioId);

    return {
      id: run.id,
      scenarioId: run.scenarioId,
      scenarioName: scenarioName,
      date,
      time,
      portfolioId: run.portfolioId,
      portfolioName: portfolioName,
      portfolioValue: run.results.portfolioValue,
      impact: run.results.totalImpactPercent,
      impactValue: run.results.totalImpact,
      assetClassImpacts,
      factorAttribution: run.results.factorAttribution,
      greeksBefore,
      greeksAfter
    };
  }

  /**
   * Convert structured API run result to legacy format
   */
  private async convertStructuredRunToLegacyFormat(results: any, metadata: any): Promise<LegacyScenarioRun> {
    const timestamp = new Date();
    const date = timestamp.toISOString().split('T')[0];
    const time = timestamp.toTimeString().split(' ')[0].substring(0, 5);

    // Convert asset class impacts format
    const assetClassImpacts: Record<string, number> = {};
    if (results.assetClassImpacts) {
      Object.entries(results.assetClassImpacts).forEach(([assetClass, data]: [string, any]) => {
        assetClassImpacts[assetClass] = data.impactPercent || 0;
      });
    }

    // Generate mock Greeks (legacy requirement)
    const greeksBefore = this.generateMockGreeks();
    const greeksAfter = this.adjustGreeksBasedOnImpact(greeksBefore, results.totalImpactPercent || 0);

    // Get display names for scenario and portfolio
    const scenarioName = await displayNameService.getScenarioDisplayName(metadata.scenarioId);
    const portfolioName = await displayNameService.getPortfolioDisplayName(metadata.portfolioId);

    return {
      id: `RUN_${Date.now()}`,
      scenarioId: metadata.scenarioId,
      scenarioName: scenarioName,
      date,
      time,
      portfolioId: metadata.portfolioId,
      portfolioName: portfolioName,
      portfolioValue: results.portfolioValue || 0,
      impact: results.totalImpactPercent || 0,
      impactValue: results.totalImpact || 0,
      assetClassImpacts,
      factorAttribution: results.factorAttribution || {},
      greeksBefore,
      greeksAfter
    };
  }

  /**
   * Generate mock Greeks for legacy compatibility
   */
  private generateMockGreeks(): GreeksResults {
    return {
      delta: parseFloat((Math.random() * 0.5 + 0.2).toFixed(2)),
      gamma: parseFloat((Math.random() * 0.1 + 0.05).toFixed(2)),
      theta: parseFloat((-(Math.random() * 200 + 100)).toFixed(2)),
      vega: parseFloat((Math.random() * 100 + 50).toFixed(2)),
      rho: parseFloat((Math.random() * 50 + 40).toFixed(2))
    };
  }

  /**
   * Adjust Greeks based on scenario impact
   */
  private adjustGreeksBasedOnImpact(greeks: GreeksResults, impactPercent: number): GreeksResults {
    const factor = Math.abs(impactPercent) / 100;
    
    return {
      delta: parseFloat((greeks.delta * (1 + factor * 0.1)).toFixed(2)),
      gamma: parseFloat((greeks.gamma * (1 + factor * 0.15)).toFixed(2)),
      theta: parseFloat((greeks.theta * (1 - factor * 0.1)).toFixed(2)),
      vega: parseFloat((greeks.vega * (1 + factor * 0.2)).toFixed(2)),
      rho: parseFloat((greeks.rho * (1 + factor * 0.05)).toFixed(2))
    };
  }
}

// ==========================================
// EXPORT LEGACY SERVICE
// ==========================================

const legacyScenarioService = new LegacyScenarioService();

export { legacyScenarioService as default };

// Also export the modern service for direct access
export { scenarioManager }; 

// Export commonly used methods as named exports for easier importing
export const getRecentScenarios = () => legacyScenarioService.getRecentScenarios();
export const getScenarios = () => legacyScenarioService.getScenarios();
export const getScenarioById = (id: string) => legacyScenarioService.getScenarioById(id);
export const runScenario = (scenarioId: string, portfolioId: string) => legacyScenarioService.runScenario(scenarioId, portfolioId);
export const runScenarioWithFreshData = (scenarioId: string, portfolioId: string) => legacyScenarioService.runScenarioWithFreshData(scenarioId, portfolioId);
export const createScenario = (name: string, description: string, factorChanges: ScenarioFactorChanges, options?: any) => legacyScenarioService.createScenario(name, description, factorChanges, options);
export const updateScenario = (id: string, updates: Partial<LegacyScenario>) => legacyScenarioService.updateScenario(id, updates);
export const deleteScenario = (id: string) => legacyScenarioService.deleteScenario(id);
export const getScenarioRuns = () => legacyScenarioService.getScenarioRuns();
export const clearScenarioRuns = () => legacyScenarioService.clearScenarioRuns(); 
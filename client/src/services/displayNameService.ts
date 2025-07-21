import portfolioService, { Portfolio } from './portfolioService';
import { scenarioManager, TEMPLATE_SCENARIOS, REGULATORY_SCENARIOS } from './scenarioManagementService';

// ==========================================
// DISPLAY NAME SERVICE
// ==========================================

/**
 * Service to handle mapping between backend IDs and frontend display names
 * Backend keeps technical IDs, frontend displays human-readable names
 */
class DisplayNameService {
  private static instance: DisplayNameService;
  private portfolioCache: Map<string, string> = new Map();
  private scenarioCache: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): DisplayNameService {
    if (!DisplayNameService.instance) {
      DisplayNameService.instance = new DisplayNameService();
    }
    return DisplayNameService.instance;
  }

  // ==========================================
  // PORTFOLIO NAME RESOLUTION
  // ==========================================

  /**
   * Get portfolio display name from ID
   */
  async getPortfolioDisplayName(portfolioId: string): Promise<string> {
    try {
      // Check cache first
      if (this.portfolioCache.has(portfolioId)) {
        return this.portfolioCache.get(portfolioId)!;
      }

      // Fetch from service
      const portfolio = await portfolioService.getPortfolioById(portfolioId);
      if (portfolio) {
        this.portfolioCache.set(portfolioId, portfolio.name);
        return portfolio.name;
      }

      // Fallback to ID if not found
      return portfolioId;
    } catch (error) {
      console.error('Error getting portfolio display name:', error);
      return portfolioId;
    }
  }

  /**
   * Get multiple portfolio display names
   */
  async getPortfolioDisplayNames(portfolioIds: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const id of portfolioIds) {
      results[id] = await this.getPortfolioDisplayName(id);
    }
    
    return results;
  }

  /**
   * Update portfolio name in cache
   */
  updatePortfolioDisplayName(portfolioId: string, name: string): void {
    this.portfolioCache.set(portfolioId, name);
  }

  // ==========================================
  // SCENARIO NAME RESOLUTION
  // ==========================================

  /**
   * Get scenario display name from ID
   */
  async getScenarioDisplayName(scenarioId: string): Promise<string> {
    try {
      // Check cache first
      if (this.scenarioCache.has(scenarioId)) {
        return this.scenarioCache.get(scenarioId)!;
      }

      // Check template scenarios
      if (TEMPLATE_SCENARIOS[scenarioId]) {
        const name = TEMPLATE_SCENARIOS[scenarioId].metadata.name;
        this.scenarioCache.set(scenarioId, name);
        return name;
      }

      // Check regulatory scenarios
      if (REGULATORY_SCENARIOS[scenarioId]) {
        const name = REGULATORY_SCENARIOS[scenarioId].metadata.name;
        this.scenarioCache.set(scenarioId, name);
        return name;
      }

      // Check custom scenarios
      const scenario = await scenarioManager.getScenarioById(scenarioId);
      if (scenario) {
        const name = scenario.metadata.name;
        this.scenarioCache.set(scenarioId, name);
        return name;
      }

      // Fallback to ID if not found
      return scenarioId;
    } catch (error) {
      console.error('Error getting scenario display name:', error);
      return scenarioId;
    }
  }

  /**
   * Get multiple scenario display names
   */
  async getScenarioDisplayNames(scenarioIds: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const id of scenarioIds) {
      results[id] = await this.getScenarioDisplayName(id);
    }
    
    return results;
  }

  /**
   * Update scenario name in cache
   */
  updateScenarioDisplayName(scenarioId: string, name: string): void {
    this.scenarioCache.set(scenarioId, name);
  }

  // ==========================================
  // CACHE MANAGEMENT
  // ==========================================

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.portfolioCache.clear();
    this.scenarioCache.clear();
  }

  /**
   * Clear portfolio cache
   */
  clearPortfolioCache(): void {
    this.portfolioCache.clear();
  }

  /**
   * Clear scenario cache
   */
  clearScenarioCache(): void {
    this.scenarioCache.clear();
  }

  // ==========================================
  // BULK OPERATIONS
  // ==========================================

  /**
   * Pre-populate portfolio cache
   */
  async preloadPortfolioNames(): Promise<void> {
    try {
      const portfolios = await portfolioService.getPortfolios();
      portfolios.forEach(portfolio => {
        this.portfolioCache.set(portfolio.id, portfolio.name);
      });
    } catch (error) {
      console.error('Error preloading portfolio names:', error);
    }
  }

  /**
   * Pre-populate scenario cache
   */
  async preloadScenarioNames(): Promise<void> {
    try {
      // Load template scenarios
      Object.entries(TEMPLATE_SCENARIOS).forEach(([id, scenario]) => {
        this.scenarioCache.set(id, scenario.metadata.name);
      });

      // Load regulatory scenarios
      Object.entries(REGULATORY_SCENARIOS).forEach(([id, scenario]) => {
        this.scenarioCache.set(id, scenario.metadata.name);
      });

      // Load custom scenarios
      const customScenarios = await scenarioManager.getAllScenarios();
      Object.entries(customScenarios).forEach(([id, scenario]) => {
        this.scenarioCache.set(id, scenario.metadata.name);
      });
    } catch (error) {
      console.error('Error preloading scenario names:', error);
    }
  }

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  /**
   * Format display name for stress test results
   */
  formatStressTestDisplayName(scenarioId: string, portfolioId: string): string {
    const scenarioName = this.scenarioCache.get(scenarioId) || scenarioId;
    const portfolioName = this.portfolioCache.get(portfolioId) || portfolioId;
    return `${scenarioName} on ${portfolioName}`;
  }

  /**
   * Get short display name (for UI space constraints)
   */
  getShortDisplayName(fullName: string, maxLength: number = 20): string {
    if (fullName.length <= maxLength) {
      return fullName;
    }
    return fullName.substring(0, maxLength - 3) + '...';
  }
}

// Export singleton instance
export const displayNameService = DisplayNameService.getInstance();
export default displayNameService; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scenarioManager, TEMPLATE_SCENARIOS, REGULATORY_SCENARIOS } from './scenarioManagementService';

// ==========================================
// SCENARIO MIGRATION SERVICE
// ==========================================

/**
 * Migration mapping from old IDs to new structured IDs
 */
const LEGACY_TO_NEW_ID_MAPPING: Record<string, string> = {
  // Old predefined scenario IDs to new template IDs
  '1': 'TMPL0001',  // 2008 Financial Crisis
  '2': 'TMPL0002',  // Fed +100bps
  '3': 'TMPL0003',  // Oil Price Shock
  '4': 'TMPL0004',  // Tech Sector Correction
  '5': 'TMPL0001',  // Lehman Brothers Collapse (duplicate of 2008 crisis)
  '6': 'TMPL0005',  // COVID-19 Pandemic Crash
  '7': 'TMPL0006',  // Market decline - 25%
  '8': 'TMPL0007',  // Credit Crisis +350bps (if exists)
  '9': 'TMPL0008',  // Geopolitical Shock (if exists)
};

/**
 * Reverse mapping for quick lookup
 */
const NEW_TO_LEGACY_ID_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_TO_NEW_ID_MAPPING).map(([old, new_]) => [new_, old])
);

interface LegacyScenarioRun {
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
  greeksBefore: any;
  greeksAfter: any;
}

/**
 * Scenario Migration Service
 */
export class ScenarioMigrationService {
  private static instance: ScenarioMigrationService;

  private constructor() {}

  static getInstance(): ScenarioMigrationService {
    if (!ScenarioMigrationService.instance) {
      ScenarioMigrationService.instance = new ScenarioMigrationService();
    }
    return ScenarioMigrationService.instance;
  }

  /**
   * Run complete migration from old scenario system to new structured system
   */
  async runMigration(): Promise<void> {
    console.log('🔄 Starting scenario migration...');
    
    try {
      // Step 1: Initialize new scenario management system
      await scenarioManager.initialize();
      
      // Step 2: Migrate scenario runs
      await this.migrateScenarioRuns();
      
      // Step 3: Clean up old storage keys (optional)
      await this.cleanupOldStorage();
      
      console.log('✅ Scenario migration completed successfully');
    } catch (error) {
      console.error('❌ Scenario migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate scenario runs from old format to new format
   */
  private async migrateScenarioRuns(): Promise<void> {
    console.log('🔄 Migrating scenario runs...');
    
    try {
      // Get old scenario runs
      const oldRunsJson = await AsyncStorage.getItem('scenario_runs');
      if (!oldRunsJson) {
        console.log('ℹ️  No old scenario runs found to migrate');
        return;
      }
      
      const oldRuns: LegacyScenarioRun[] = JSON.parse(oldRunsJson);
      console.log(`Found ${oldRuns.length} old scenario runs to migrate`);
      
      // Convert to new format
      const migratedRuns = await Promise.all(
        oldRuns.map(async (oldRun) => {
          return this.convertLegacyRunToNewFormat(oldRun);
        })
      );
      
      // Save migrated runs
      await AsyncStorage.setItem('scenario_runs_v2', JSON.stringify(migratedRuns));
      
      console.log(`✅ Successfully migrated ${migratedRuns.length} scenario runs`);
    } catch (error) {
      console.error('❌ Error migrating scenario runs:', error);
      throw error;
    }
  }

  /**
   * Convert legacy scenario run to new format
   */
  private async convertLegacyRunToNewFormat(legacyRun: LegacyScenarioRun): Promise<any> {
    // Map old scenario ID to new structured ID
    const newScenarioId = LEGACY_TO_NEW_ID_MAPPING[legacyRun.scenarioId] || legacyRun.scenarioId;
    
    // Convert timestamp
    const timestamp = new Date(`${legacyRun.date} ${legacyRun.time}`).toISOString();
    
    // Convert asset class impacts format
    const assetClassImpacts: Record<string, { impact: number; impactPercent: number }> = {};
    Object.entries(legacyRun.assetClassImpacts).forEach(([assetClass, impactPercent]) => {
      const impact = (legacyRun.portfolioValue * impactPercent) / 100;
      assetClassImpacts[assetClass] = {
        impact,
        impactPercent
      };
    });
    
    // Create new format scenario run
    return {
      id: legacyRun.id,
      scenarioId: newScenarioId,
      portfolioId: legacyRun.portfolioId,
      timestamp,
      results: {
        portfolioValue: legacyRun.portfolioValue,
        stressedValue: legacyRun.portfolioValue + legacyRun.impactValue,
        totalImpact: legacyRun.impactValue,
        totalImpactPercent: legacyRun.impact,
        assetClassImpacts,
        factorAttribution: legacyRun.factorAttribution,
        riskMetrics: {
          concentration: 0.25, // Default value
          diversification: 0.75, // Default value
          leverageEffect: 1.0 // Default value
        },
        positionResults: [] // Empty for legacy runs
      },
      duration: 1000, // Default duration
      status: 'completed' as const
    };
  }

  /**
   * Clean up old storage keys (optional)
   */
  private async cleanupOldStorage(): Promise<void> {
    console.log('🧹 Cleaning up old storage keys...');
    
    const oldKeys = [
      'scenarios',
      'scenario_runs',
      'scenarios_version',
      'predefined_scenarios_version'
    ];
    
    for (const key of oldKeys) {
      try {
        const exists = await AsyncStorage.getItem(key);
        if (exists) {
          await AsyncStorage.removeItem(key);
          console.log(`✅ Removed old storage key: ${key}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to remove old storage key ${key}:`, error);
      }
    }
  }

  /**
   * Get new scenario ID from legacy ID
   */
  getLegacyToNewIdMapping(legacyId: string): string {
    return LEGACY_TO_NEW_ID_MAPPING[legacyId] || legacyId;
  }

  /**
   * Get legacy scenario ID from new ID (for backward compatibility)
   */
  getNewToLegacyIdMapping(newId: string): string {
    return NEW_TO_LEGACY_ID_MAPPING[newId] || newId;
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      // Check if old scenario runs exist
      const oldRuns = await AsyncStorage.getItem('scenario_runs');
      const newRuns = await AsyncStorage.getItem('scenario_runs_v2');
      
      // Migration needed if old runs exist but new runs don't
      return oldRuns !== null && newRuns === null;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Force migration (for testing/debugging)
   */
  async forceMigration(): Promise<void> {
    console.log('🔄 Force migration requested...');
    
    // Clear new storage first
    await AsyncStorage.multiRemove([
      'scenarios_v2',
      'scenario_runs_v2',
      'custom_scenarios_v2',
      'scenario_counter_v2',
      'scenario_metadata_v2'
    ]);
    
    // Run migration
    await this.runMigration();
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    migrationNeeded: boolean;
    oldRunsCount: number;
    newRunsCount: number;
    oldScenariosCount: number;
    newScenariosCount: number;
  }> {
    try {
      const oldRunsJson = await AsyncStorage.getItem('scenario_runs');
      const newRunsJson = await AsyncStorage.getItem('scenario_runs_v2');
      const oldScenariosJson = await AsyncStorage.getItem('scenarios');
      const newScenariosJson = await AsyncStorage.getItem('scenarios_v2');
      
      const oldRuns = oldRunsJson ? JSON.parse(oldRunsJson) : [];
      const newRuns = newRunsJson ? JSON.parse(newRunsJson) : [];
      const oldScenarios = oldScenariosJson ? JSON.parse(oldScenariosJson) : [];
      const newScenarios = newScenariosJson ? JSON.parse(newScenariosJson) : {};
      
      return {
        migrationNeeded: await this.isMigrationNeeded(),
        oldRunsCount: oldRuns.length,
        newRunsCount: newRuns.length,
        oldScenariosCount: oldScenarios.length,
        newScenariosCount: Object.keys(newScenarios).length
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      return {
        migrationNeeded: false,
        oldRunsCount: 0,
        newRunsCount: 0,
        oldScenariosCount: 0,
        newScenariosCount: 0
      };
    }
  }
}

// Export singleton instance
export const scenarioMigration = ScenarioMigrationService.getInstance();

// Export mapping functions for quick access
export const getLegacyToNewId = (legacyId: string): string => {
  return LEGACY_TO_NEW_ID_MAPPING[legacyId] || legacyId;
};

export const getNewToLegacyId = (newId: string): string => {
  return NEW_TO_LEGACY_ID_MAPPING[newId] || newId;
};

export default scenarioMigration; 
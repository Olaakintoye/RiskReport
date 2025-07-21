import portfolioService from './portfolioService';
import { scenarioManager } from './scenarioManagementService';
import { scenarioMigration } from './scenarioMigrationService';

// ==========================================
// ENHANCED SERVICE INITIALIZATION
// ==========================================

/**
 * Initialize all services with the new structured system
 */
export const initializeAllServices = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing all services with new structured system...');
    
    // Step 1: Check if migration is needed
    const migrationNeeded = await scenarioMigration.isMigrationNeeded();
    
    if (migrationNeeded) {
      console.log('🔄 Migration needed - starting scenario migration...');
      await scenarioMigration.runMigration();
    } else {
      console.log('✅ No migration needed - initializing scenario management...');
      await scenarioManager.initialize();
    }
    
    // Step 2: Get migration status for logging
    const migrationStatus = await scenarioMigration.getMigrationStatus();
    console.log('📊 Migration Status:', {
      migrationNeeded: migrationStatus.migrationNeeded,
      oldRuns: migrationStatus.oldRunsCount,
      newRuns: migrationStatus.newRunsCount,
      oldScenarios: migrationStatus.oldScenariosCount,
      newScenarios: migrationStatus.newScenariosCount
    });
    
    // Step 3: Get scenario statistics
    const scenarioStats = await scenarioManager.getScenarioStatistics();
    console.log('📈 Scenario Statistics:', {
      totalScenarios: scenarioStats.totalScenarios,
      templates: scenarioStats.templateScenarios,
      custom: scenarioStats.customScenarios,
      totalRuns: scenarioStats.totalRuns
    });
    
    console.log('✅ All services initialized successfully with new structured system');
    
    // Log available scenarios
    console.log('📋 Available Scenarios:');
    const allScenarios = await scenarioManager.getAllScenarios();
    Object.values(allScenarios).forEach(scenario => {
      console.log(`   ${scenario.metadata.id}: ${scenario.metadata.name} (${scenario.metadata.type})`);
    });
    
  } catch (error) {
    console.error('❌ Error initializing services:', error);
    throw error;
  }
};

/**
 * Force migration (for testing/debugging)
 */
export const forceMigration = async (): Promise<void> => {
  try {
    console.log('🔄 Force migration requested...');
    await scenarioMigration.forceMigration();
    console.log('✅ Force migration completed');
  } catch (error) {
    console.error('❌ Force migration failed:', error);
    throw error;
  }
};

/**
 * Get system status
 */
export const getSystemStatus = async (): Promise<{
  portfolioCount: number;
  scenarioCount: number;
  runCount: number;
  migrationStatus: any;
}> => {
  try {
    const portfolios = await portfolioService.getPortfolios();
    const scenarios = await scenarioManager.getAllScenarios();
    const runs = await scenarioManager.getScenarioRuns();
    const migrationStatus = await scenarioMigration.getMigrationStatus();
    
    return {
      portfolioCount: portfolios.length,
      scenarioCount: Object.keys(scenarios).length,
      runCount: runs.length,
      migrationStatus
    };
  } catch (error) {
    console.error('Error getting system status:', error);
    return {
      portfolioCount: 0,
      scenarioCount: 0,
      runCount: 0,
      migrationStatus: null
    };
  }
};

/**
 * Reset all data (for testing/debugging)
 */
export const resetAllData = async (): Promise<void> => {
  try {
    console.log('⚠️  Resetting all data...');
    
    // Clear all storage
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.default.multiRemove([
      // Old storage keys
      'scenarios',
      'scenario_runs',
      'scenarios_version',
      'predefined_scenarios_version',
      // New storage keys
      'scenarios_v2',
      'scenario_runs_v2',
      'custom_scenarios_v2',
      'scenario_counter_v2',
      'scenario_metadata_v2',
      // Portfolio keys
      'portfolios',
      'portfolios_version'
    ]);
    
    // Reinitialize
    await initializeAllServices();
    
    console.log('✅ All data reset and reinitialized');
  } catch (error) {
    console.error('❌ Error resetting data:', error);
    throw error;
  }
};

/**
 * Create sample data for testing
 */
export const createSampleData = async (): Promise<void> => {
  try {
    console.log('🎯 Creating sample data...');
    
    // Create sample custom scenario
    const sampleScenario = await scenarioManager.createCustomScenario(
      'Sample Custom Scenario',
      'A sample custom scenario for testing the new structured system',
      'custom' as any,
      {
        equity: -15,
        rates: 50,
        credit: 100,
        fx: -5,
        commodity: 10
      },
      {
        severity: 'moderate',
        timeHorizon: 60,
        tags: ['sample', 'test', 'custom']
      }
    );
    
    console.log('✅ Sample data created:', {
      sampleScenarioId: sampleScenario.metadata.id,
      sampleScenarioName: sampleScenario.metadata.name
    });
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
};

// Export default initialization function
export default initializeAllServices; 
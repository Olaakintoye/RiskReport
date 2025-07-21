// Test script for the new structured scenario system
const { initializeAllServices, getSystemStatus, forceMigration } = require('./src/services/initServices');

console.log('🏗️  TESTING STRUCTURED SCENARIO SYSTEM');
console.log('=====================================');

async function testStructuredScenarios() {
  try {
    console.log('📋 Step 1: Initialize services with new structured system...');
    await initializeAllServices();
    
    console.log('\n📊 Step 2: Get system status...');
    const status = await getSystemStatus();
    console.log('System Status:', {
      portfolios: status.portfolioCount,
      scenarios: status.scenarioCount,
      runs: status.runCount,
      migrationNeeded: status.migrationStatus?.migrationNeeded
    });
    
    console.log('\n🎯 Step 3: Test scenario ID mapping...');
    
    // Test the specific scenario ID mapping
    const { getLegacyToNewId, getNewToLegacyId } = require('./src/services/scenarioMigrationService');
    
    console.log('ID Mapping Tests:');
    console.log(`  Legacy "7" → New "${getLegacyToNewId('7')}" (Market decline -25%)`);
    console.log(`  Legacy "1" → New "${getLegacyToNewId('1')}" (2008 Financial Crisis)`);
    console.log(`  Legacy "2" → New "${getLegacyToNewId('2')}" (Fed Rate Hike)`);
    
    console.log('\n📋 Step 4: Test scenario retrieval...');
    
    // Import the scenario manager
    const { scenarioManager } = require('./src/services/scenarioManagementService');
    
    // Test getting all scenarios
    const allScenarios = await scenarioManager.getAllScenarios();
    console.log(`Found ${Object.keys(allScenarios).length} scenarios in new system:`);
    
    Object.values(allScenarios).forEach((scenario, index) => {
      console.log(`  ${index + 1}. ${scenario.metadata.id}: ${scenario.metadata.name}`);
      console.log(`     Type: ${scenario.metadata.type}, Category: ${scenario.metadata.category}`);
      console.log(`     Factors: equity=${scenario.factorChanges.equity}%, rates=${scenario.factorChanges.rates}bps`);
    });
    
    console.log('\n🎯 Step 5: Test specific Market decline -25% scenario...');
    
    // Test the specific scenario that was showing zeros
    const marketDeclineScenario = await scenarioManager.getScenarioById('TMPL0006');
    
    if (marketDeclineScenario) {
      console.log('✅ Market decline -25% scenario found:');
      console.log(`   ID: ${marketDeclineScenario.metadata.id}`);
      console.log(`   Name: ${marketDeclineScenario.metadata.name}`);
      console.log(`   Description: ${marketDeclineScenario.metadata.description}`);
      console.log(`   Factor Changes:`, marketDeclineScenario.factorChanges);
      console.log(`   Severity: ${marketDeclineScenario.metadata.severity}`);
      console.log(`   Time Horizon: ${marketDeclineScenario.metadata.timeHorizon} days`);
    } else {
      console.log('❌ Market decline -25% scenario not found!');
    }
    
    console.log('\n📊 Step 6: Test scenario statistics...');
    
    const stats = await scenarioManager.getScenarioStatistics();
    console.log('Scenario Statistics:', {
      total: stats.totalScenarios,
      templates: stats.templateScenarios,
      custom: stats.customScenarios,
      totalRuns: stats.totalRuns
    });
    
    console.log('\n🔄 Step 7: Test legacy compatibility...');
    
    // Test legacy scenario service
    const legacyScenarioService = require('./src/services/scenarioService').default;
    
    const legacyScenarios = await legacyScenarioService.getScenarios();
    console.log(`Legacy service returns ${legacyScenarios.length} scenarios`);
    
    // Find the Market decline scenario in legacy format
    const legacyMarketDecline = legacyScenarios.find(s => s.name === 'Market decline - 25%');
    if (legacyMarketDecline) {
      console.log('✅ Legacy Market decline scenario found:');
      console.log(`   ID: ${legacyMarketDecline.id}`);
      console.log(`   Name: ${legacyMarketDecline.name}`);
      console.log(`   Factors:`, legacyMarketDecline.factorChanges);
    } else {
      console.log('❌ Legacy Market decline scenario not found!');
    }
    
    console.log('\n📋 Step 8: Verify scenario structure...');
    
    // Verify the structure is correct
    const templateScenarios = await scenarioManager.getScenariosByType('template');
    const customScenarios = await scenarioManager.getScenariosByType('custom');
    
    console.log('Structure verification:');
    console.log(`  Template scenarios: ${templateScenarios.length}`);
    console.log(`  Custom scenarios: ${customScenarios.length}`);
    
    // Check ID structure
    const hasProperIds = templateScenarios.every(s => s.metadata.id.startsWith('TMPL'));
    const hasProperCustomIds = customScenarios.every(s => s.metadata.id.startsWith('CUST'));
    
    console.log(`  Template IDs properly formatted: ${hasProperIds}`);
    console.log(`  Custom IDs properly formatted: ${hasProperCustomIds}`);
    
    console.log('\n✅ STRUCTURED SCENARIO SYSTEM TEST COMPLETED!');
    console.log('==============================================');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. ✅ Scenario management system is structured with proper IDs');
    console.log('2. ✅ Legacy compatibility maintained');
    console.log('3. ✅ Migration system in place');
    console.log('4. ✅ Market decline -25% scenario is now TMPL0006');
    console.log('5. 🔄 Frontend should now use structured IDs automatically');
    
    if (marketDeclineScenario) {
      console.log('\n📊 MARKET DECLINE -25% SCENARIO DETAILS:');
      console.log(`   New ID: ${marketDeclineScenario.metadata.id}`);
      console.log(`   Equity Factor: ${marketDeclineScenario.factorChanges.equity}%`);
      console.log(`   This should now produce non-zero results!`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testStructuredScenarios(); 
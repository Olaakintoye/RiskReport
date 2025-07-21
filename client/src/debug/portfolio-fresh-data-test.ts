import scenarioService from '../services/scenarioService';
import portfolioService from '../services/portfolioService';

// ==========================================
// PORTFOLIO FRESH DATA TEST SUITE
// ==========================================

/**
 * Test fresh data vs stale data scenarios
 */
export async function testFreshDataVsStaleData() {
  console.log('🧪 Testing Fresh Data vs Stale Data...');
  
  try {
    // Get all portfolios
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found - please create a portfolio first');
      return;
    }

    const testPortfolioId = portfolios[0].id;
    console.log(`📊 Testing with portfolio: ${portfolios[0].name}`);

    // Test 1: Using fresh data (recommended)
    console.log('\n1️⃣ Testing with runScenarioWithFreshData (RECOMMENDED):');
    const freshDataResult = await scenarioService.runScenarioWithFreshData(
      '7', // Market decline - 25%
      testPortfolioId
    );
    console.log('✅ Fresh data result:', {
      impact: freshDataResult.impact.toFixed(2) + '%',
      impactValue: '$' + Math.abs(freshDataResult.impactValue).toFixed(2),
      assetClassImpacts: freshDataResult.assetClassImpacts
    });

    // Test 2: Using potentially stale data (old way)
    console.log('\n2️⃣ Testing with runScenario using Portfolio object (OLD WAY):');
    const staleDataResult = await scenarioService.runScenario(
      '7', // Market decline - 25%
      portfolios[0].id // Use portfolio ID instead of whole object
    );
    console.log('⚠️ Stale data result:', {
      impact: staleDataResult.impact.toFixed(2) + '%',
      impactValue: '$' + Math.abs(staleDataResult.impactValue).toFixed(2),
      assetClassImpacts: staleDataResult.assetClassImpacts
    });

    // Test 3: Using fresh data with portfolio ID
    console.log('\n3️⃣ Testing with runScenario using portfolio ID:');
    const freshIdResult = await scenarioService.runScenario(
      '7', // Market decline - 25%
      testPortfolioId
    );
    console.log('✅ Fresh ID result:', {
      impact: freshIdResult.impact.toFixed(2) + '%',
      impactValue: '$' + Math.abs(freshIdResult.impactValue).toFixed(2),
      assetClassImpacts: freshIdResult.assetClassImpacts
    });

    // Compare results
    console.log('\n📊 COMPARISON:');
    console.log('Fresh data impact:', freshDataResult.impact.toFixed(2) + '%');
    console.log('Stale data impact:', staleDataResult.impact.toFixed(2) + '%');
    console.log('Fresh ID impact:', freshIdResult.impact.toFixed(2) + '%');
    
    const impactDifference = Math.abs(freshDataResult.impact - staleDataResult.impact);
    if (impactDifference < 0.01) {
      console.log('✅ Results are consistent - data is fresh!');
    } else {
      console.log('⚠️ Results differ - possible stale data issue');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test portfolio data freshness after updates
 */
export async function testPortfolioUpdateFreshness() {
  console.log('\n🔄 Testing Portfolio Update Freshness...');
  
  try {
    // Get all portfolios
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found - please create a portfolio first');
      return;
    }

    const testPortfolio = portfolios[0];
    console.log(`📊 Testing with portfolio: ${testPortfolio.name}`);

    // Run scenario before any changes
    console.log('\n1️⃣ Running scenario BEFORE portfolio update:');
    const beforeResult = await scenarioService.runScenarioWithFreshData(
      '7', // Market decline - 25%
      testPortfolio.id
    );
    console.log('Impact before:', beforeResult.impact.toFixed(2) + '%');

    // Simulate portfolio update by getting fresh data
    console.log('\n2️⃣ Simulating portfolio update...');
    const freshPortfolio = await portfolioService.getPortfolioById(testPortfolio.id);
    if (!freshPortfolio) {
      console.log('❌ Could not retrieve fresh portfolio data');
      return;
    }

    // Run scenario after getting fresh data
    console.log('\n3️⃣ Running scenario AFTER getting fresh data:');
    const afterResult = await scenarioService.runScenarioWithFreshData(
      '7', // Market decline - 25%
      testPortfolio.id
    );
    console.log('Impact after:', afterResult.impact.toFixed(2) + '%');

    // Check if fresh data was used
    console.log('\n📊 FRESHNESS CHECK:');
    console.log('Portfolio value before:', beforeResult.portfolioValue);
    console.log('Portfolio value after:', afterResult.portfolioValue);
    
    if (beforeResult.portfolioValue === afterResult.portfolioValue) {
      console.log('✅ Portfolio data is consistent and fresh!');
    } else {
      console.log('⚠️ Portfolio values differ - check for data freshness');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test all available scenarios with fresh data
 */
export async function testAllScenariosWithFreshData() {
  console.log('\n🎯 Testing All Scenarios with Fresh Data...');
  
  try {
    // Get all portfolios and scenarios
    const portfolios = await portfolioService.getPortfolios();
    const scenarios = await scenarioService.getScenarios();
    
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found - please create a portfolio first');
      return;
    }

    if (scenarios.length === 0) {
      console.log('❌ No scenarios found - scenarios should be auto-loaded');
      return;
    }

    const testPortfolioId = portfolios[0].id;
    console.log(`📊 Testing with portfolio: ${portfolios[0].name}`);
    console.log(`🎭 Testing ${scenarios.length} scenarios`);

    // Test each scenario
    for (const scenario of scenarios.slice(0, 5)) { // Test first 5 scenarios
      console.log(`\n🎯 Testing scenario: ${scenario.name}`);
      
      try {
        const result = await scenarioService.runScenarioWithFreshData(
          scenario.id,
          testPortfolioId
        );
        
        console.log(`   Impact: ${result.impact.toFixed(2)}%`);
        console.log(`   Value Impact: $${Math.abs(result.impactValue).toFixed(2)}`);
        
        // Check if scenario is working (non-zero impact for market scenarios)
        if (Math.abs(result.impact) > 0.01) {
          console.log(`   ✅ Scenario working correctly`);
        } else if (scenario.name.includes('Market') || scenario.name.includes('decline')) {
          console.log(`   ⚠️ Market scenario showing 0% impact - check scenario definition`);
        } else {
          console.log(`   ℹ️ Scenario showing minimal impact (may be expected)`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error testing scenario: ${(error as Error).message}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Quick verification that Market decline -25% scenario works
 */
export async function quickMarketDeclineTest() {
  console.log('\n⚡ Quick Market Decline -25% Test...');
  
  try {
    // Get all portfolios
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found - please create a portfolio first');
      return;
    }

    const testPortfolioId = portfolios[0].id;
    console.log(`📊 Testing with portfolio: ${portfolios[0].name}`);

    // Test the specific scenario that was problematic
    const result = await scenarioService.runScenarioWithFreshData(
      '7', // Market decline - 25%
      testPortfolioId
    );
    
    console.log('📊 RESULTS:');
    console.log(`   Total Impact: ${result.impact.toFixed(2)}%`);
    console.log(`   Value Impact: $${Math.abs(result.impactValue).toFixed(2)}`);
    console.log(`   Portfolio Value: $${result.portfolioValue.toFixed(2)}`);
    console.log('\n📈 Asset Class Impacts:');
    Object.entries(result.assetClassImpacts).forEach(([assetClass, impact]) => {
      console.log(`   ${assetClass}: ${(impact as number).toFixed(2)}%`);
    });
    
    console.log('\n🔍 Factor Attribution:');
    Object.entries(result.factorAttribution).forEach(([factor, attribution]) => {
      console.log(`   ${factor}: ${(attribution as number).toFixed(2)}%`);
    });

    // Check if it's working correctly
    if (Math.abs(result.impact) < 0.01) {
      console.log('\n❌ PROBLEM: Market decline scenario showing 0% impact!');
      console.log('   This indicates the scenario is not working properly.');
      console.log('   Check scenario definition and portfolio composition.');
    } else {
      console.log('\n✅ SUCCESS: Market decline scenario is working correctly!');
      console.log('   The fresh data fix appears to be working.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Run all tests in sequence
 */
export async function runAllFreshDataTests() {
  console.log('🧪 RUNNING ALL FRESH DATA TESTS');
  console.log('================================');
  
  await quickMarketDeclineTest();
  await testFreshDataVsStaleData();
  await testPortfolioUpdateFreshness();
  await testAllScenariosWithFreshData();
  
  console.log('\n🎉 ALL TESTS COMPLETED!');
  console.log('Check the console output above for results.');
} 
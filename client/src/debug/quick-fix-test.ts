import scenarioService from '../services/scenarioService';
import portfolioService from '../services/portfolioService';

// ==========================================
// QUICK FIX TEST - VERIFY SCENARIO ID FIX
// ==========================================

/**
 * Quick test to verify the scenario ID fix is working
 */
export async function quickFixTest() {
  console.log('🚀 QUICK FIX TEST - VERIFYING SCENARIO ID FIX');
  console.log('===============================================');
  
  try {
    // Step 1: Check if the scenario exists
    console.log('1️⃣ Checking if "Market decline - 25%" scenario exists...');
    const scenarios = await scenarioService.getScenarios();
    const marketDeclineScenario = scenarios.find(s => s.name === 'Market decline - 25%');
    
    if (!marketDeclineScenario) {
      console.log('❌ "Market decline - 25%" scenario not found!');
      console.log('Available scenarios:', scenarios.map(s => `${s.id}: ${s.name}`));
      return;
    }
    
    console.log('✅ Found "Market decline - 25%" scenario:');
    console.log(`   ID: ${marketDeclineScenario.id}`);
    console.log(`   Name: ${marketDeclineScenario.name}`);
    console.log(`   Factor changes:`, marketDeclineScenario.factorChanges);
    
    // Step 2: Get a test portfolio
    console.log('\n2️⃣ Getting test portfolio...');
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found');
      return;
    }
    
    const testPortfolio = portfolios[0];
    console.log(`✅ Using portfolio: ${testPortfolio.name}`);
    console.log(`   Assets: ${testPortfolio.assets.length}`);
    console.log(`   Portfolio composition:`);
    testPortfolio.assets.forEach(asset => {
      console.log(`     ${asset.symbol} (${asset.assetClass}): ${asset.quantity} × $${asset.price}`);
    });
    
    // Step 3: Run the scenario with the correct ID
    console.log('\n3️⃣ Running scenario with correct ID...');
    const result = await scenarioService.runScenarioWithFreshData(
      marketDeclineScenario.id, // Use the actual ID from the scenario
      testPortfolio.id
    );
    
    console.log('🎉 SUCCESS! Scenario ran successfully!');
    console.log(`   Total Impact: ${result.impact.toFixed(2)}%`);
    console.log(`   Impact Value: $${Math.abs(result.impactValue).toFixed(2)}`);
    console.log(`   Portfolio Value: $${result.portfolioValue.toFixed(2)}`);
    
    console.log('\n📊 Asset Class Impacts:');
    Object.entries(result.assetClassImpacts).forEach(([assetClass, impact]) => {
      console.log(`   ${assetClass}: ${impact.toFixed(2)}%`);
    });
    
    // Step 4: Check if the results make sense
    console.log('\n4️⃣ Checking if results make sense...');
    
    const hasNonZeroImpact = Math.abs(result.impact) > 0.01;
    const hasEquityImpact = result.assetClassImpacts.equity && Math.abs(result.assetClassImpacts.equity) > 0.01;
    const hasRealEstateImpact = result.assetClassImpacts.real_estate && Math.abs(result.assetClassImpacts.real_estate) > 0.01;
    
    if (hasNonZeroImpact && hasEquityImpact) {
      console.log('✅ EXCELLENT! The scenario is working correctly!');
      console.log('   - Total impact is non-zero');
      console.log('   - Equity assets are impacted (as expected for equity market decline)');
      if (hasRealEstateImpact) {
        console.log('   - Real estate assets are also impacted (correlated effect)');
      }
    } else {
      console.log('⚠️  The scenario ran but impact is still zero or minimal');
      console.log('   - This might indicate another issue with the calculation');
    }
    
  } catch (error) {
    console.error('❌ Quick fix test failed:', error);
  }
}

/**
 * Test all predefined scenarios to make sure IDs are correct
 */
export async function testAllScenarioIds() {
  console.log('\n🔍 TESTING ALL SCENARIO IDS');
  console.log('===========================');
  
  try {
    const scenarios = await scenarioService.getScenarios();
    const portfolios = await portfolioService.getPortfolios();
    
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found');
      return;
    }
    
    const testPortfolioId = portfolios[0].id;
    
    console.log(`Testing ${scenarios.length} scenarios with portfolio: ${portfolios[0].name}`);
    
    for (const scenario of scenarios) {
      console.log(`\n🎯 Testing scenario: ${scenario.name} (ID: ${scenario.id})`);
      
      try {
        const result = await scenarioService.runScenarioWithFreshData(scenario.id, testPortfolioId);
        const impact = Math.abs(result.impact);
        
        if (impact > 0.01) {
          console.log(`   ✅ Working: ${impact.toFixed(2)}% impact`);
        } else {
          console.log(`   ⚠️  Minimal impact: ${impact.toFixed(2)}%`);
        }
        
             } catch (error) {
         console.log(`   ❌ Error: ${(error as Error).message}`);
       }
    }
    
  } catch (error) {
    console.error('❌ Test all scenario IDs failed:', error);
  }
}

// Export the quick test function
export default quickFixTest; 
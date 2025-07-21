// Debug the specific Market decline -25% scenario
const scenarioService = require('./src/services/scenarioService.ts');
const portfolioService = require('./src/services/portfolioService.ts');

console.log('🎯 DEBUGGING MARKET DECLINE -25% SCENARIO');
console.log('==========================================');

async function debugMarketDeclineScenario() {
  try {
    // Get the Income Portfolio (the one user is testing)
    console.log('📊 Getting portfolios...');
    const portfolios = await portfolioService.getPortfolios();
    console.log(`Found ${portfolios.length} portfolios`);
    
    // Find Income Portfolio or use first one
    let targetPortfolio = portfolios.find(p => p.name.toLowerCase().includes('income'));
    if (!targetPortfolio) {
      targetPortfolio = portfolios[0];
    }
    
    if (!targetPortfolio) {
      console.log('❌ No portfolios found');
      return;
    }
    
    console.log(`🎯 Testing portfolio: ${targetPortfolio.name}`);
    console.log(`   Assets: ${targetPortfolio.assets.length}`);
    console.log(`   Portfolio ID: ${targetPortfolio.id}`);
    
    // Debug portfolio assets
    console.log('\n📈 Portfolio Assets:');
    targetPortfolio.assets.forEach((asset, index) => {
      const value = asset.price * asset.quantity;
      console.log(`   ${index + 1}. ${asset.symbol} (${asset.assetClass}): ${asset.quantity} × $${asset.price} = $${value.toFixed(2)}`);
    });
    
    const totalValue = targetPortfolio.assets.reduce((sum, asset) => sum + (asset.price * asset.quantity), 0);
    console.log(`   TOTAL VALUE: $${totalValue.toFixed(2)}`);
    
    // Test the specific Market decline -25% scenario (ID: '7')
    console.log('\n🎯 Running Market decline -25% scenario...');
    
    try {
      const result = await scenarioService.runScenarioWithFreshData('7', targetPortfolio.id);
      
      console.log('\n📊 SCENARIO RESULT:');
      console.log('================');
      console.log(`Portfolio Value: $${result.portfolioValue.toFixed(2)}`);
      console.log(`Impact: ${result.impact.toFixed(2)}%`);
      console.log(`Impact Value: $${result.impactValue.toFixed(2)}`);
      
      console.log('\n📈 Asset Class Impacts:');
      Object.entries(result.assetClassImpacts).forEach(([assetClass, impact]) => {
        console.log(`   ${assetClass}: ${impact.toFixed(2)}%`);
      });
      
      console.log('\n🎯 Factor Attribution:');
      Object.entries(result.factorAttribution).forEach(([factor, attribution]) => {
        console.log(`   ${factor}: $${attribution.toFixed(2)}`);
      });
      
      // Check if result is all zeros
      const hasNonZeroImpact = Math.abs(result.impact) > 0.01;
      const hasNonZeroFactors = Object.values(result.factorAttribution).some(val => Math.abs(val) > 1);
      
      if (!hasNonZeroImpact && !hasNonZeroFactors) {
        console.log('\n❌ PROBLEM IDENTIFIED: All results are zero!');
        console.log('This suggests an issue in the quantitative stress testing calculations.');
      } else {
        console.log('\n✅ Results look reasonable');
      }
      
    } catch (scenarioError) {
      console.log('\n❌ ERROR running scenario:');
      console.error(scenarioError);
      console.log('\nThis error is causing the zero results in the UI.');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugMarketDeclineScenario()
  .then(() => {
    console.log('\n✅ Debug completed');
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
  }); 
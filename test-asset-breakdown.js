const axios = require('axios');

// Test the enhanced asset breakdown functionality
async function testAssetBreakdown() {
  try {
    console.log('🧪 Testing Enhanced Asset Breakdown...');
    
    // Use existing portfolio and scenario IDs from the API
    const portfolioId = 'income-portfolio';  // This exists in the API
    const scenarioId = 'TMPL0006';           // This exists in the API
    
    console.log('📊 Test Portfolio ID:', portfolioId);
    console.log('🎯 Test Scenario ID:', scenarioId);

    // Test the stress test API
    console.log('\n🔄 Testing Stress Test API...');
    
    const response = await axios.post('http://localhost:3000/api/stress-test/run', {
      scenarioId: scenarioId,
      portfolioId: portfolioId,
      options: {
        confidenceLevel: 0.95,
        timeHorizon: 1
      }
    });

    if (response.data.success) {
      console.log('✅ Stress test completed successfully!');
      
      const results = response.data.results;
      console.log(`\n📈 Portfolio Results:`);
      console.log(`   Current Value: $${results.portfolioValue.toLocaleString()}`);
      console.log(`   Stressed Value: $${results.stressedValue.toLocaleString()}`);
      console.log(`   Total Impact: ${results.totalImpactPercent.toFixed(2)}% (${results.totalImpact >= 0 ? '+' : ''}$${results.totalImpact.toLocaleString()})`);
      
      console.log(`\n🏪 Asset Breakdown Results:`);
      console.log(`   Total Assets: ${results.assetResults.length}`);
      
      // Check if enhanced asset breakdown data is present
      const hasEnhancedData = results.assetResults.every(asset => 
        asset.assetIdentification && asset.stressImpact
      );
      
      if (hasEnhancedData) {
        console.log('✅ Enhanced asset breakdown data is present!');
        
        results.assetResults.forEach((asset, index) => {
          console.log(`\n   ${index + 1}. ${asset.symbol} (${asset.name})`);
          console.log(`      Asset Type: ${asset.assetIdentification.assetType}`);
          console.log(`      Asset Class: ${asset.assetIdentification.assetClass}`);
          console.log(`      Current Value: $${asset.assetIdentification.currentValue.toLocaleString()}`);
          console.log(`      Portfolio Weight: ${(asset.assetIdentification.portfolioWeight * 100).toFixed(1)}%`);
          console.log(`      Impact: ${asset.stressImpact.percentageImpact.toFixed(2)}% (${asset.stressImpact.absoluteImpact >= 0 ? '+' : ''}$${asset.stressImpact.absoluteImpact.toLocaleString()})`);
          console.log(`      Price Change: ${asset.stressImpact.priceChangePercent.toFixed(2)}%`);
          
          // Show factor contributions
          const significantFactors = Object.entries(asset.stressImpact.factorBreakdown)
            .filter(([_, value]) => Math.abs(value) > 0.01)
            .map(([factor, value]) => `${factor}: ${value.toFixed(2)}%`);
          
          if (significantFactors.length > 0) {
            console.log(`      Factor Contributions: ${significantFactors.join(', ')}`);
          }
        });
        
        console.log('\n🎉 SUCCESS: Asset Breakdown feature is working!');
        console.log('\n📱 TO SEE THE ASSET BREAKDOWN IN THE APP:');
        console.log('   1. Open the app and go to Scenarios screen');
        console.log('   2. Select a portfolio (e.g., Income Portfolio)');
        console.log('   3. Click "View Detailed Asset Breakdown" button');
        console.log('   4. In the popup, click the "Asset Breakdown" tab (4th tab)');
        console.log('   5. You will see detailed individual asset impact analysis!');
        
      } else {
        console.log('❌ Enhanced asset breakdown data is missing!');
        console.log('Available asset data keys:', Object.keys(results.assetResults[0] || {}));
      }
      
    } else {
      console.log('❌ Stress test failed:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAssetBreakdown(); 
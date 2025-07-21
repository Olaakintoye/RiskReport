import scenarioService from '../services/scenarioService';
import portfolioService from '../services/portfolioService';
import quantitativeStressTestService from '../services/quantitativeStressTestService';

// ==========================================
// QUANTITATIVE STRESS TEST DEBUG
// ==========================================

/**
 * Test the new quantitative stress testing engine
 */
export async function testQuantitativeStressEngine() {
  console.log('🚀 TESTING QUANTITATIVE STRESS TESTING ENGINE');
  console.log('==============================================');
  
  try {
    // Get test portfolio
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found');
      return;
    }
    
    const portfolio = portfolios[0];
    console.log(`📊 Testing with portfolio: ${portfolio.name}`);
    console.log(`   Assets: ${portfolio.assets.length}`);
    
    // Test Market decline -25% scenario factors
    const scenarioFactors = {
      equity: -25,    // 25% equity market decline
      rates: 0,       // No rate change
      credit: 0,      // No credit spread change
      fx: 0,          // No FX change
      commodity: 0,   // No commodity change
      volatility: 50  // VIX spike (50% increase)
    };
    
    console.log('\n🎯 Testing scenario factors:', scenarioFactors);
    
    // Run quantitative stress test directly
    const result = await quantitativeStressTestService.runQuantitativeStressTest(portfolio, scenarioFactors);
    
    console.log('\n📊 QUANTITATIVE STRESS TEST RESULTS:');
    console.log('=====================================');
    console.log(`Portfolio Value: $${result.portfolioValue.toFixed(2)}`);
    console.log(`Stressed Value: $${result.stressedValue.toFixed(2)}`);
    console.log(`Total Impact: $${result.totalImpact.toFixed(2)} (${result.totalImpactPercent.toFixed(2)}%)`);
    
    console.log('\n📈 Asset Class Impacts:');
    Object.entries(result.assetClassImpacts).forEach(([assetClass, data]) => {
      console.log(`   ${assetClass}: ${data.impactPercent.toFixed(2)}% ($${data.impact.toFixed(2)})`);
    });
    
    console.log('\n🎯 Factor Attribution:');
    Object.entries(result.factorAttribution).forEach(([factor, attribution]) => {
      if (Math.abs(attribution) > 1) {
        console.log(`   ${factor}: $${attribution.toFixed(2)}`);
      }
    });
    
    console.log('\n🏪 Position-Level Results:');
    result.positionResults.forEach(position => {
      console.log(`   ${position.symbol} (${position.assetClass}):`);
      console.log(`     Value: $${position.currentValue.toFixed(2)} → $${position.stressedValue.toFixed(2)}`);
      console.log(`     Impact: ${position.impactPercent.toFixed(2)}%`);
      
      // Show factor contributions for this position
      const significantFactors = Object.entries(position.factorContributions)
        .filter(([_, value]) => Math.abs(value) > 1)
        .map(([factor, value]) => `${factor}: $${value.toFixed(2)}`);
      
      if (significantFactors.length > 0) {
        console.log(`     Factors: ${significantFactors.join(', ')}`);
      }
    });
    
    console.log('\n📊 Risk Metrics:');
    console.log(`   Concentration (HHI): ${result.riskMetrics.concentration.toFixed(3)}`);
    console.log(`   Diversification: ${result.riskMetrics.diversification.toFixed(3)}`);
    
    // Validate results make sense
    console.log('\n✅ RESULT VALIDATION:');
    const hasNonZeroImpact = Math.abs(result.totalImpactPercent) > 0.1;
    const hasEquityImpact = result.assetClassImpacts.equity && Math.abs(result.assetClassImpacts.equity.impactPercent) > 1;
    const equityImpactReasonable = result.assetClassImpacts.equity && 
      result.assetClassImpacts.equity.impactPercent >= -30 && 
      result.assetClassImpacts.equity.impactPercent <= -15;
    
    if (hasNonZeroImpact) {
      console.log('✅ Total impact is non-zero (' + result.totalImpactPercent.toFixed(2) + '%)');
    } else {
      console.log('❌ Total impact is still zero or minimal');
    }
    
    if (hasEquityImpact) {
      console.log('✅ Equity assets are impacted (' + result.assetClassImpacts.equity.impactPercent.toFixed(2) + '%)');
    } else {
      console.log('❌ Equity assets show no impact');
    }
    
    if (equityImpactReasonable) {
      console.log('✅ Equity impact is reasonable for -25% market stress');
    } else {
      console.log('⚠️  Equity impact seems unusual for -25% market stress');
    }
    
  } catch (error) {
    console.error('❌ Quantitative stress test failed:', error);
  }
}

/**
 * Test asset metadata and factor sensitivity calculations
 */
export async function testAssetClassification() {
  console.log('\n🔍 TESTING ASSET CLASSIFICATION & SENSITIVITIES');
  console.log('================================================');
  
  try {
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found');
      return;
    }
    
    const portfolio = portfolios[0];
    
    console.log('Asset Analysis:');
    for (const asset of portfolio.assets) {
      console.log(`\n📊 ${asset.symbol}:`);
      
      // Get metadata
      const metadata = await quantitativeStressTestService.getAssetMetadata(asset.symbol);
      console.log(`   Type: ${metadata.assetType}`);
      console.log(`   Sector: ${metadata.sector}`);
      console.log(`   Industry: ${metadata.industry}`);
      console.log(`   Market Cap: ${metadata.marketCap}`);
      console.log(`   Geography: ${metadata.geography}`);
      
      if (metadata.duration) {
        console.log(`   Duration: ${metadata.duration} years`);
      }
      if (metadata.creditRating) {
        console.log(`   Credit Rating: ${metadata.creditRating}`);
      }
      
      // Calculate sensitivities
      const sensitivities = quantitativeStressTestService.calculateFactorSensitivities(metadata);
      console.log('   Factor Sensitivities:');
      Object.entries(sensitivities).forEach(([factor, sensitivity]) => {
        if (Math.abs(sensitivity) > 0.01) {
          console.log(`     ${factor}: ${sensitivity.toFixed(3)}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Asset classification test failed:', error);
  }
}

/**
 * Compare old vs new stress testing approaches
 */
export async function compareStressTestingApproaches() {
  console.log('\n⚖️  COMPARING OLD VS NEW STRESS TESTING');
  console.log('=========================================');
  
  try {
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found');
      return;
    }
    
    const portfolio = portfolios[0];
    
    // Test with Market decline -25% scenario
    console.log('🎯 Running Market decline -25% scenario...');
    
    // Method 1: New quantitative approach
    console.log('\n1️⃣ NEW QUANTITATIVE APPROACH:');
    const scenarioFactors = {
      equity: -25,
      rates: 0,
      credit: 0,
      fx: 0,
      commodity: 0
    };
    
    const quantResult = await quantitativeStressTestService.runQuantitativeStressTest(portfolio, scenarioFactors);
    console.log(`   Total Impact: ${quantResult.totalImpactPercent.toFixed(2)}%`);
    console.log(`   Impact Value: $${Math.abs(quantResult.totalImpact).toFixed(2)}`);
    console.log('   Asset Class Impacts:');
    Object.entries(quantResult.assetClassImpacts).forEach(([assetClass, data]) => {
      console.log(`     ${assetClass}: ${data.impactPercent.toFixed(2)}%`);
    });
    
    // Method 2: Full scenario service (should now use quantitative engine)
    console.log('\n2️⃣ FULL SCENARIO SERVICE (with quantitative engine):');
    const scenarioResult = await scenarioService.runScenario('7', portfolio.id); // Market decline -25%
    console.log(`   Total Impact: ${scenarioResult.impact.toFixed(2)}%`);
    console.log(`   Impact Value: $${Math.abs(scenarioResult.impactValue).toFixed(2)}`);
    console.log('   Asset Class Impacts:');
    Object.entries(scenarioResult.assetClassImpacts).forEach(([assetClass, impact]) => {
      console.log(`     ${assetClass}: ${impact.toFixed(2)}%`);
    });
    
    // Compare results
    console.log('\n📊 COMPARISON:');
    const impactDiff = Math.abs(quantResult.totalImpactPercent - scenarioResult.impact);
    console.log(`Impact difference: ${impactDiff.toFixed(2)} percentage points`);
    
    if (impactDiff < 0.1) {
      console.log('✅ Results are consistent between approaches');
    } else {
      console.log('⚠️  Results differ significantly - check integration');
    }
    
  } catch (error) {
    console.error('❌ Comparison test failed:', error);
  }
}

/**
 * Test different scenario types
 */
export async function testDifferentScenarios() {
  console.log('\n🎭 TESTING DIFFERENT SCENARIO TYPES');
  console.log('===================================');
  
  try {
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found');
      return;
    }
    
    const portfolio = portfolios[0];
    
    const testScenarios = [
      {
        name: 'Market decline -25%',
        factors: { equity: -25, rates: 0, credit: 0, fx: 0, commodity: 0 }
      },
      {
        name: 'Rate shock +200bps',
        factors: { equity: 0, rates: 200, credit: 0, fx: 0, commodity: 0 }
      },
      {
        name: 'Credit crisis +350bps',
        factors: { equity: -15, rates: -50, credit: 350, fx: 0, commodity: 0 }
      },
      {
        name: 'Commodity shock +50%',
        factors: { equity: -5, rates: 0, credit: 0, fx: 0, commodity: 50 }
      }
    ];
    
    for (const scenario of testScenarios) {
      console.log(`\n🎯 Testing: ${scenario.name}`);
      
      const result = await quantitativeStressTestService.runQuantitativeStressTest(portfolio, scenario.factors);
      
      console.log(`   Total Impact: ${result.totalImpactPercent.toFixed(2)}% ($${result.totalImpact.toFixed(2)})`);
      
      // Show which asset classes are most impacted
      const sortedImpacts = Object.entries(result.assetClassImpacts)
        .sort((a, b) => Math.abs(b[1].impactPercent) - Math.abs(a[1].impactPercent))
        .slice(0, 3);
      
      console.log('   Top impacted asset classes:');
      sortedImpacts.forEach(([assetClass, data]) => {
        if (Math.abs(data.impactPercent) > 0.1) {
          console.log(`     ${assetClass}: ${data.impactPercent.toFixed(2)}%`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Different scenarios test failed:', error);
  }
}

/**
 * Run all quantitative stress test debugging
 */
export async function runAllQuantStressDebug() {
  console.log('🧪 COMPREHENSIVE QUANTITATIVE STRESS TEST DEBUG');
  console.log('===============================================');
  
  await testAssetClassification();
  await testQuantitativeStressEngine();
  await compareStressTestingApproaches();
  await testDifferentScenarios();
  
  console.log('\n🎉 ALL QUANTITATIVE STRESS TEST DEBUG COMPLETED!');
  console.log('The new engine should now provide proper risk-based calculations.');
} 
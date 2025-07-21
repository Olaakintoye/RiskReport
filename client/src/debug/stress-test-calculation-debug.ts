import scenarioService from '../services/scenarioService';
import portfolioService from '../services/portfolioService';
import realScenarioService from '../services/realScenarioService';

// ==========================================
// STRESS TEST CALCULATION DEBUG
// ==========================================

/**
 * Debug the stress test calculation step by step
 */
export async function debugStressTestCalculation() {
  console.log('🔍 DEBUGGING STRESS TEST CALCULATION');
  console.log('====================================');
  
  try {
    // Get the first portfolio
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found');
      return;
    }
    
    const portfolio = portfolios[0];
    console.log(`📊 Testing with portfolio: ${portfolio.name}`);
    console.log('Portfolio assets:');
    portfolio.assets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.symbol} (${asset.assetClass}): ${asset.quantity} × $${asset.price} = $${(asset.quantity * asset.price).toFixed(2)}`);
    });
    
    // Test factor changes for Market decline -25%
    const factorChanges = {
      equity: -25,
      rates: 0,
      credit: 0,
      fx: 0,
      commodity: 0
    };
    
    console.log('\n🎯 Testing factor changes:', factorChanges);
    
    // Call the stress test function directly
    const result = await realScenarioService.simulateRealTimeStressTest(portfolio, factorChanges);
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('Original Value:', result.originalValue.toFixed(2));
    console.log('Stressed Value:', result.stressedValue.toFixed(2));
    console.log('Overall Impact:', (((result.stressedValue - result.originalValue) / result.originalValue) * 100).toFixed(2) + '%');
    
    console.log('\n🏷️ Asset Class Impacts:');
    Object.entries(result.assetClassImpacts).forEach(([assetClass, impact]) => {
      console.log(`  ${assetClass}: ${impact.toFixed(2)}%`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

/**
 * Test the factor calculation logic manually
 */
export async function testFactorCalculationLogic() {
  console.log('\n🧮 TESTING FACTOR CALCULATION LOGIC');
  console.log('===================================');
  
  const factorChanges = {
    equity: -25,
    rates: 0,
    credit: 0,
    fx: 0,
    commodity: 0
  };
  
  const testAssets = [
    { symbol: 'SCHD', assetClass: 'equity', price: 89.12, quantity: 300 },
    { symbol: 'VCIT', assetClass: 'bond', price: 27.32, quantity: 400 },
    { symbol: 'VNQ', assetClass: 'real_estate', price: 81.96, quantity: 150 }
  ];
  
  console.log('Test assets:');
  testAssets.forEach(asset => {
    console.log(`  ${asset.symbol} (${asset.assetClass}): ${asset.quantity} × $${asset.price} = $${(asset.quantity * asset.price).toFixed(2)}`);
  });
  
  console.log('\nCalculating stress multipliers:');
  
  testAssets.forEach(asset => {
    let stressMultiplier = 1;
    
    switch (asset.assetClass) {
      case 'equity':
        stressMultiplier = 1 + (factorChanges.equity / 100);
        break;
      case 'bond':
        stressMultiplier = 1 + (factorChanges.rates / 100) + (factorChanges.credit / 100);
        break;
      case 'real_estate':
        stressMultiplier = 1 - (factorChanges.rates / 100) * 0.5 + (factorChanges.equity / 100) * 0.3;
        break;
      default:
        stressMultiplier = 1;
    }
    
    const originalValue = asset.price * asset.quantity;
    const stressedValue = originalValue * stressMultiplier;
    const impact = ((stressedValue - originalValue) / originalValue) * 100;
    
    console.log(`  ${asset.symbol}:`);
    console.log(`    Factor calculation: ${getFactorCalculationString(asset.assetClass, factorChanges)}`);
    console.log(`    Stress multiplier: ${stressMultiplier.toFixed(4)}`);
    console.log(`    Original value: $${originalValue.toFixed(2)}`);
    console.log(`    Stressed value: $${stressedValue.toFixed(2)}`);
    console.log(`    Impact: ${impact.toFixed(2)}%`);
  });
}

/**
 * Helper function to show factor calculation string
 */
function getFactorCalculationString(assetClass: string, factorChanges: any): string {
  switch (assetClass) {
    case 'equity':
      return `1 + (${factorChanges.equity}/100) = 1 + ${factorChanges.equity/100} = ${1 + factorChanges.equity/100}`;
    case 'bond':
      return `1 + (${factorChanges.rates}/100) + (${factorChanges.credit}/100) = 1 + ${factorChanges.rates/100} + ${factorChanges.credit/100} = ${1 + factorChanges.rates/100 + factorChanges.credit/100}`;
    case 'real_estate':
      return `1 - (${factorChanges.rates}/100) * 0.5 + (${factorChanges.equity}/100) * 0.3 = 1 - ${factorChanges.rates/100 * 0.5} + ${factorChanges.equity/100 * 0.3} = ${1 - factorChanges.rates/100 * 0.5 + factorChanges.equity/100 * 0.3}`;
    default:
      return '1 (no impact)';
  }
}

/**
 * Test the scenario service integration
 */
export async function testScenarioServiceIntegration() {
  console.log('\n🔗 TESTING SCENARIO SERVICE INTEGRATION');
  console.log('======================================');
  
  try {
    // Get the first portfolio
    const portfolios = await portfolioService.getPortfolios();
    if (portfolios.length === 0) {
      console.log('❌ No portfolios found');
      return;
    }
    
    const portfolioId = portfolios[0].id;
    console.log(`📊 Testing with portfolio: ${portfolios[0].name}`);
    
    // Test the scenario service runScenario function
    const result = await scenarioService.runScenario('7', portfolioId); // Market decline - 25%
    
    console.log('\n📊 SCENARIO SERVICE RESULTS:');
    console.log('Portfolio Value:', result.portfolioValue.toFixed(2));
    console.log('Impact:', result.impact.toFixed(2) + '%');
    console.log('Impact Value:', result.impactValue.toFixed(2));
    
    console.log('\n🏷️ Asset Class Impacts:');
    Object.entries(result.assetClassImpacts).forEach(([assetClass, impact]) => {
      console.log(`  ${assetClass}: ${impact.toFixed(2)}%`);
    });
    
    console.log('\n🔍 Factor Attribution:');
    Object.entries(result.factorAttribution).forEach(([factor, attribution]) => {
      console.log(`  ${factor}: ${attribution}`);
    });
    
  } catch (error) {
    console.error('❌ Scenario service test failed:', error);
  }
}

/**
 * Run all debug tests
 */
export async function runAllStressTestDebug() {
  console.log('🧪 RUNNING ALL STRESS TEST DEBUG TESTS');
  console.log('=======================================');
  
  await testFactorCalculationLogic();
  await debugStressTestCalculation();
  await testScenarioServiceIntegration();
  
  console.log('\n🎉 ALL DEBUG TESTS COMPLETED!');
} 
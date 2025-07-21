import { Portfolio } from '../services/portfolioService';
import scenarioService from '../services/scenarioService';
import { simulateRealTimeStressTest } from '../services/realScenarioService';

/**
 * Debug function to check if scenarios are properly defined
 */
export const debugScenarios = async () => {
  console.log('🔍 DEBUG: Checking available scenarios...');
  
  try {
    const scenarios = await scenarioService.getScenarios();
    const predefinedScenarios = await scenarioService.getPredefinedScenarios();
    const customScenarios = await scenarioService.getCustomScenarios();
    
    console.log(`\n📊 SCENARIO SUMMARY:`);
    console.log(`Total scenarios: ${scenarios.length}`);
    console.log(`Predefined scenarios: ${predefinedScenarios.length}`);
    console.log(`Custom scenarios: ${customScenarios.length}`);
    
    console.log(`\n📋 PREDEFINED SCENARIOS:`);
    predefinedScenarios.forEach(scenario => {
      console.log(`  - ${scenario.name} (ID: ${scenario.id})`);
      console.log(`    Description: ${scenario.description}`);
      console.log(`    Factor Changes:`, scenario.factorChanges);
      
      // Check if all factors are zero
      const factors = scenario.factorChanges;
      const allZero = Object.values(factors).every(val => val === 0 || val === undefined);
      if (allZero) {
        console.log('    ⚠️  WARNING: All factors are zero - this scenario will have no impact!');
      }
    });
    
    if (customScenarios.length > 0) {
      console.log(`\n🔧 CUSTOM SCENARIOS:`);
      customScenarios.forEach(scenario => {
        console.log(`  - ${scenario.name} (ID: ${scenario.id})`);
        console.log(`    Description: ${scenario.description}`);
        console.log(`    Factor Changes:`, scenario.factorChanges);
      });
    }
    
    // Look specifically for the "Market decline - 25%" scenario
    const marketDeclineScenario = scenarios.find(s => s.name === 'Market decline - 25%');
    if (marketDeclineScenario) {
      console.log('\n✅ Found "Market decline - 25%" scenario:', marketDeclineScenario);
    } else {
      console.log('\n❌ "Market decline - 25%" scenario not found!');
      console.log('Available scenario names:', scenarios.map(s => s.name));
      console.log('\n💡 Try running: scenarioService.refreshPredefinedScenarios()');
    }
    
  } catch (error) {
    console.error('Error loading scenarios:', error);
  }
};

/**
 * Debug function to test stress calculation with known inputs
 */
export const debugStressCalculation = async () => {
  console.log('\n🧪 DEBUG: Testing stress calculation with known inputs...');
  
  // Create a simple test portfolio
  const testPortfolio: Portfolio = {
    id: 'test-portfolio',
    name: 'Test Portfolio',
    description: 'Test portfolio for debugging',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assets: [
      {
        id: '1',
        symbol: 'TEST_EQUITY',
        name: 'Test Equity Asset',
        quantity: 100,
        price: 100, // $10,000 total
        assetClass: 'equity'
      },
      {
        id: '2',
        symbol: 'TEST_BOND',
        name: 'Test Bond Asset',
        quantity: 100,
        price: 50, // $5,000 total
        assetClass: 'bond'
      }
    ]
  };
  
  // Test with -25% equity factor
  const testFactors = {
    equity: -25,
    rates: 0,
    credit: 0,
    fx: 0,
    commodity: 0
  };
  
  console.log('Test Portfolio:', testPortfolio.name);
  console.log('Test Assets:');
  testPortfolio.assets.forEach(asset => {
    console.log(`  - ${asset.symbol} (${asset.assetClass}): ${asset.quantity} × $${asset.price} = $${asset.quantity * asset.price}`);
  });
  console.log('Total Portfolio Value: $', testPortfolio.assets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0));
  
  console.log('\nTest Factor Changes:', testFactors);
  
  try {
    const result = await simulateRealTimeStressTest(testPortfolio, testFactors);
    
    console.log('\n📊 STRESS TEST RESULTS:');
    console.log('Original Value:', result.originalValue);
    console.log('Stressed Value:', result.stressedValue);
    console.log('Total Impact:', ((result.stressedValue - result.originalValue) / result.originalValue * 100).toFixed(2) + '%');
    console.log('Asset Class Impacts:', result.assetClassImpacts);
    
    // Expected results:
    // - Equity: $10,000 → $7,500 (-25%)
    // - Bond: $5,000 → $5,000 (0%)
    // - Total: $15,000 → $12,500 (-16.67%)
    
    const expectedEquityImpact = -25;
    const expectedBondImpact = 0;
    const actualEquityImpact = result.assetClassImpacts.equity || 0;
    const actualBondImpact = result.assetClassImpacts.bond || 0;
    
    console.log('\n✅ VALIDATION:');
    console.log(`Equity Impact: Expected ${expectedEquityImpact}%, Got ${actualEquityImpact.toFixed(2)}% ${Math.abs(actualEquityImpact - expectedEquityImpact) < 0.1 ? '✅' : '❌'}`);
    console.log(`Bond Impact: Expected ${expectedBondImpact}%, Got ${actualBondImpact.toFixed(2)}% ${Math.abs(actualBondImpact - expectedBondImpact) < 0.1 ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Error in stress test calculation:', error);
  }
};

/**
 * Debug function to test the specific Income Portfolio scenario
 */
export const debugIncomePortfolioScenario = async () => {
  console.log('\n🏠 DEBUG: Testing Income Portfolio with Market decline - 25%...');
  
  // Try to get the actual Income Portfolio from storage first
  let incomePortfolio: Portfolio;
  const incomePortfolioId = 'c3d4e5f6-g7h8-9012-cdef-345678901234';
  
  try {
    const portfolioService = await import('../services/portfolioService').then(module => module.default);
    const storedPortfolio = await portfolioService.getPortfolioById(incomePortfolioId);
    
    if (storedPortfolio) {
      incomePortfolio = storedPortfolio;
      console.log('✅ Using actual Income Portfolio from storage');
    } else {
      console.log('⚠️  Income Portfolio not found in storage, using fallback data');
      // Fallback to hardcoded data if not found
      incomePortfolio = {
        id: incomePortfolioId,
        name: 'Income Portfolio',
        description: 'Focused on dividend income and yield',
        createdAt: '2023-03-05T12:00:00Z',
        updatedAt: '2023-09-10T12:00:00Z',
        assets: [
          {
            id: 'c3d4e5f6-g7h8-9012-cdef-345678901235',
            symbol: 'SCHD',
            name: 'Schwab US Dividend Equity ETF',
            quantity: 300,
            price: 72.10,
            assetClass: 'equity'
          },
          {
            id: 'c3d4e5f6-g7h8-9012-cdef-345678901236',
            symbol: 'VCIT',
            name: 'Vanguard Intermediate-Term Corporate Bond ETF',
            quantity: 400,
            price: 78.50,
            assetClass: 'bond'
          },
          {
            id: 'c3d4e5f6-g7h8-9012-cdef-345678901237',
            symbol: 'VNQ',
            name: 'Vanguard Real Estate ETF',
            quantity: 150,
            price: 80.25,
            assetClass: 'real_estate'
          }
        ]
      };
    }
  } catch (error) {
    console.error('Error loading portfolio from storage:', error);
    // Use fallback data
    incomePortfolio = {
      id: incomePortfolioId,
      name: 'Income Portfolio',
      description: 'Focused on dividend income and yield',
      createdAt: '2023-03-05T12:00:00Z',
      updatedAt: '2023-09-10T12:00:00Z',
      assets: [
        {
          id: 'c3d4e5f6-g7h8-9012-cdef-345678901235',
          symbol: 'SCHD',
          name: 'Schwab US Dividend Equity ETF',
          quantity: 300,
          price: 72.10,
          assetClass: 'equity'
        }
      ]
    };
  }
  
  console.log('Income Portfolio composition:');
  let totalValue = 0;
  incomePortfolio.assets.forEach(asset => {
    const value = asset.quantity * asset.price;
    totalValue += value;
    console.log(`  - ${asset.symbol} (${asset.assetClass}): ${asset.quantity} × $${asset.price} = $${value.toFixed(2)}`);
  });
  console.log(`Total Portfolio Value: $${totalValue.toFixed(2)}`);
  
  // Test with Market decline -25% factors
  const marketDeclineFactors = {
    equity: -25,
    rates: 0,
    credit: 0,
    fx: 0,
    commodity: 0
  };
  
  console.log('\nApplying Market decline - 25% scenario...');
  console.log('Factor Changes:', marketDeclineFactors);
  
  try {
    const result = await simulateRealTimeStressTest(incomePortfolio, marketDeclineFactors);
    
    console.log('\n📊 ACTUAL RESULTS:');
    console.log('Original Value:', result.originalValue);
    console.log('Stressed Value:', result.stressedValue);
    console.log('Total Impact:', ((result.stressedValue - result.originalValue) / result.originalValue * 100).toFixed(2) + '%');
    console.log('Asset Class Impacts:', result.assetClassImpacts);
    
    // Calculate expected results manually:
    const equityValue = 300 * 72.10; // $21,630
    const bondValue = 400 * 78.50;   // $31,400
    const realEstateValue = 150 * 80.25; // $12,037.50
    
    console.log('\n📐 EXPECTED CALCULATIONS:');
    console.log(`Equity: $${equityValue} × 0.75 = $${equityValue * 0.75} (25% decline)`);
    console.log(`Bond: $${bondValue} × 1.0 = $${bondValue} (no change)`);
    console.log(`Real Estate: $${realEstateValue} × 0.925 = $${realEstateValue * 0.925} (7.5% decline from equity correlation)`);
    
    const expectedStressedValue = (equityValue * 0.75) + bondValue + (realEstateValue * 0.925);
    const expectedTotalImpact = ((expectedStressedValue - totalValue) / totalValue * 100);
    
    console.log(`Expected Total Impact: ${expectedTotalImpact.toFixed(2)}%`);
    console.log(`Actual Total Impact: ${((result.stressedValue - result.originalValue) / result.originalValue * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('❌ Error in Income Portfolio stress test:', error);
  }
};

/**
 * Quick fix function to refresh scenarios if "Market decline - 25%" is missing
 */
export const fixMissingMarketDeclineScenario = async () => {
  console.log('🔧 QUICK FIX: Refreshing predefined scenarios...');
  
  try {
    await scenarioService.refreshPredefinedScenarios();
    
    // Verify the fix worked
    const scenarios = await scenarioService.getScenarios();
    const marketDeclineScenario = scenarios.find(s => s.name === 'Market decline - 25%');
    
    if (marketDeclineScenario) {
      console.log('✅ SUCCESS: "Market decline - 25%" scenario is now available!');
      console.log('Scenario details:', marketDeclineScenario);
    } else {
      console.log('❌ STILL MISSING: "Market decline - 25%" scenario not found after refresh');
    }
    
  } catch (error) {
    console.error('❌ Error during quick fix:', error);
  }
};

/**
 * Reset all scenarios to defaults (removes custom scenarios)
 */
export const resetScenariosToDefaults = async () => {
  console.log('🔄 RESET: Resetting all scenarios to defaults...');
  
  try {
    await scenarioService.resetToDefaultScenarios();
    
    // Verify the reset worked
    const scenarios = await scenarioService.getScenarios();
    console.log(`✅ SUCCESS: Reset complete. Now have ${scenarios.length} scenarios:`);
    scenarios.forEach(s => console.log(`  - ${s.name}`));
    
  } catch (error) {
    console.error('❌ Error during reset:', error);
  }
};

/**
 * Test the fresh data functionality specifically
 */
export const testFreshDataFunctionality = async () => {
  console.log('\n🔄 TESTING FRESH DATA FUNCTIONALITY...');
  
  const incomePortfolioId = 'c3d4e5f6-g7h8-9012-cdef-345678901234';
  const marketDeclineScenarioId = '7'; // Market decline - 25%
  
  try {
    // Test 1: Use the fresh data function
    console.log('\n📊 Test 1: Using runScenarioWithFreshData (recommended)...');
    const freshResult = await scenarioService.runScenarioWithFreshData(marketDeclineScenarioId, incomePortfolioId);
    
    console.log('✅ Fresh Data Result:');
    console.log(`  Portfolio: ${freshResult.portfolioName}`);
    console.log(`  Total Impact: ${freshResult.impact.toFixed(2)}%`);
    console.log(`  Asset Class Impacts:`, freshResult.assetClassImpacts);
    
    // Test 2: Compare with potentially stale data
    const portfolioService = await import('../services/portfolioService').then(module => module.default);
    const portfolioData = await portfolioService.getPortfolioById(incomePortfolioId);
    
    if (portfolioData) {
      console.log('\n📊 Test 2: Using runScenario with Portfolio object (may use stale data)...');
      const staleResult = await scenarioService.runScenario(marketDeclineScenarioId, portfolioData.id);
      
      console.log('⚠️  Stale Data Result:');
      console.log(`  Portfolio: ${staleResult.portfolioName}`);
      console.log(`  Total Impact: ${staleResult.impact.toFixed(2)}%`);
      console.log(`  Asset Class Impacts:`, staleResult.assetClassImpacts);
      
      // Compare results
      console.log('\n🔍 COMPARISON:');
      const impactDifference = Math.abs(freshResult.impact - staleResult.impact);
      if (impactDifference < 0.01) {
        console.log('✅ Results are identical - portfolio data is current');
      } else {
        console.log('⚠️  Results differ - portfolio may have been updated since last UI refresh');
        console.log(`   Impact difference: ${impactDifference.toFixed(2)}%`);
      }
    }
    
    // Recommendation
    console.log('\n💡 RECOMMENDATION:');
    console.log('✅ Always use scenarioService.runScenarioWithFreshData(scenarioId, portfolioId)');
    console.log('✅ Or pass portfolioId string to scenarioService.runScenario()');
    console.log('❌ Avoid passing Portfolio objects to prevent stale data issues');
    
    return freshResult;
    
  } catch (error) {
    console.error('❌ Error testing fresh data functionality:', error);
    return null;
  }
};

/**
 * Run all debug functions
 */
export const runFullDebugSuite = async () => {
  console.log('🚀 STARTING FULL STRESS TEST DEBUG SUITE...\n');
  
  await debugScenarios();
  await debugStressCalculation();
  await debugIncomePortfolioScenario();
  await testFreshDataFunctionality();
  
  console.log('\n✅ DEBUG SUITE COMPLETE');
  
  // Check if Market decline scenario is missing and suggest fix
  const scenarios = await scenarioService.getScenarios();
  const marketDeclineScenario = scenarios.find(s => s.name === 'Market decline - 25%');
  if (!marketDeclineScenario) {
    console.log('\n🔧 QUICK FIX AVAILABLE:');
    console.log('Run: fixMissingMarketDeclineScenario()');
  }
};

export default {
  debugScenarios,
  debugStressCalculation,
  debugIncomePortfolioScenario,
  fixMissingMarketDeclineScenario,
  resetScenariosToDefaults,
  testFreshDataFunctionality,
  runFullDebugSuite
}; 
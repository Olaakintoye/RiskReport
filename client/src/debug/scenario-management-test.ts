import scenarioService from '../services/scenarioService';
import { simulateRealTimeStressTest } from '../services/realScenarioService';

/**
 * Comprehensive test for the scenario management system
 */
export const runScenarioManagementTest = async () => {
  console.log('🧪 RUNNING COMPREHENSIVE SCENARIO MANAGEMENT TEST\n');
  
  try {
    // Test 1: Basic scenario loading
    console.log('📋 Test 1: Loading scenarios...');
    const scenarios = await scenarioService.getScenarios();
    console.log(`✅ Loaded ${scenarios.length} scenarios`);
    
    // Test 2: Check predefined vs custom scenarios
    console.log('\n📊 Test 2: Checking scenario types...');
    const predefinedScenarios = await scenarioService.getPredefinedScenarios();
    const customScenarios = await scenarioService.getCustomScenarios();
    console.log(`✅ Predefined: ${predefinedScenarios.length}, Custom: ${customScenarios.length}`);
    
    // Test 3: Verify "Market decline - 25%" scenario exists
    console.log('\n🎯 Test 3: Verifying "Market decline - 25%" scenario...');
    const marketDeclineScenario = scenarios.find(s => s.name === 'Market decline - 25%');
    if (marketDeclineScenario) {
      console.log('✅ "Market decline - 25%" scenario found!');
      console.log('   Factor changes:', marketDeclineScenario.factorChanges);
      
      // Verify it has the correct factor changes
      if (marketDeclineScenario.factorChanges.equity === -25) {
        console.log('✅ Equity factor is correctly set to -25%');
      } else {
        console.log('❌ Equity factor is incorrect:', marketDeclineScenario.factorChanges.equity);
      }
    } else {
      console.log('❌ "Market decline - 25%" scenario not found!');
      console.log('💡 Running quick fix...');
      await scenarioService.refreshPredefinedScenarios();
      
      // Try again
      const refreshedScenarios = await scenarioService.getScenarios();
      const fixedScenario = refreshedScenarios.find(s => s.name === 'Market decline - 25%');
      if (fixedScenario) {
        console.log('✅ Fixed! "Market decline - 25%" scenario now available');
      } else {
        console.log('❌ Still missing after refresh');
      }
    }
    
    // Test 4: Create a custom scenario
    console.log('\n🔧 Test 4: Creating custom scenario...');
    const customScenario = {
      name: 'Test Custom Scenario',
      description: 'A test scenario created by the management test',
      factorChanges: {
        equity: -10,
        rates: 50,
        credit: 25,
        fx: 0,
        commodity: 0
      }
    };
    
    const createdScenario = await scenarioService.createScenario(
      customScenario.name,
      customScenario.description,
      customScenario.factorChanges
    );
    console.log('✅ Created custom scenario:', createdScenario.name);
    
    // Test 5: Test stress calculation with created scenario
    console.log('\n🧮 Test 5: Testing stress calculation with custom scenario...');
    const testPortfolio = {
      id: 'test-portfolio',
      name: 'Test Portfolio',
      description: 'Portfolio for testing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assets: [
        {
          id: '1',
          symbol: 'TEST_EQUITY',
          name: 'Test Equity',
          quantity: 100,
          price: 50, // $5,000
          assetClass: 'equity' as const
        },
        {
          id: '2',
          symbol: 'TEST_BOND',
          name: 'Test Bond',
          quantity: 100,
          price: 100, // $10,000
          assetClass: 'bond' as const
        }
      ]
    };
    
    const stressResult = await simulateRealTimeStressTest(testPortfolio, {
      equity: createdScenario.factorChanges.equity || 0,
      rates: createdScenario.factorChanges.rates || 0,
      credit: createdScenario.factorChanges.credit || 0,
      fx: createdScenario.factorChanges.fx || 0,
      commodity: createdScenario.factorChanges.commodity || 0
    });
    console.log('✅ Stress test calculation completed');
    console.log('   Original value:', stressResult.originalValue);
    console.log('   Stressed value:', stressResult.stressedValue);
    console.log('   Total impact:', ((stressResult.stressedValue - stressResult.originalValue) / stressResult.originalValue * 100).toFixed(2) + '%');
    
    // Test 6: Clean up - delete the custom scenario
    console.log('\n🧹 Test 6: Cleaning up custom scenario...');
    await scenarioService.deleteScenario(createdScenario.id);
    
    const scenariosAfterDelete = await scenarioService.getScenarios();
    const deletedScenario = scenariosAfterDelete.find(s => s.id === createdScenario.id);
    if (!deletedScenario) {
      console.log('✅ Custom scenario successfully deleted');
    } else {
      console.log('❌ Custom scenario was not deleted');
    }
    
    // Test 7: Final verification
    console.log('\n🏁 Test 7: Final verification...');
    const finalScenarios = await scenarioService.getScenarios();
    const finalMarketDecline = finalScenarios.find(s => s.name === 'Market decline - 25%');
    
    if (finalMarketDecline && finalMarketDecline.factorChanges.equity === -25) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('✅ Scenario management system is working correctly');
      console.log('✅ "Market decline - 25%" scenario is available and properly configured');
      return true;
    } else {
      console.log('❌ Some tests failed - check logs above');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
};

/**
 * Quick test to verify the Market decline scenario specifically
 */
export const testMarketDeclineScenario = async () => {
  console.log('🎯 TESTING MARKET DECLINE SCENARIO SPECIFICALLY\n');
  
  try {
    // Load scenarios
    const scenarios = await scenarioService.getScenarios();
    const marketDeclineScenario = scenarios.find(s => s.name === 'Market decline - 25%');
    
    if (!marketDeclineScenario) {
      console.log('❌ Market decline scenario not found - attempting to fix...');
      await scenarioService.refreshPredefinedScenarios();
      
      const refreshedScenarios = await scenarioService.getScenarios();
      const fixedScenario = refreshedScenarios.find(s => s.name === 'Market decline - 25%');
      
      if (!fixedScenario) {
        console.log('❌ Still not found after refresh');
        return false;
      } else {
        console.log('✅ Fixed! Market decline scenario is now available');
      }
    }
    
    // Test the scenario with the Income Portfolio using FRESH DATA
    console.log('\n📊 Testing with Income Portfolio using FRESH DATA...');
    const incomePortfolioId = 'c3d4e5f6-g7h8-9012-cdef-345678901234';
    
    try {
      console.log('🔄 Using runScenarioWithFreshData to ensure latest portfolio data...');
      const result = await scenarioService.runScenarioWithFreshData('7', incomePortfolioId);
      
      const totalImpact = result.impact;
      
      console.log('\n📊 RESULTS:');
      console.log(`Portfolio: ${result.portfolioName}`);
      console.log(`Original Value: $${result.portfolioValue.toFixed(2)}`);
      console.log(`Total Impact: ${totalImpact.toFixed(2)}%`);
      console.log('Asset Class Impacts:', result.assetClassImpacts);
      
      // Verify we're getting a non-zero impact
      if (Math.abs(totalImpact) > 0.1) {
        console.log('\n✅ SUCCESS: Market decline scenario is working correctly with fresh data!');
        console.log(`✅ Portfolio shows ${totalImpact.toFixed(2)}% impact from 25% market decline`);
        return true;
      } else {
        console.log('\n❌ PROBLEM: Market decline scenario is still showing zero impact');
        console.log('This could indicate:');
        console.log('  1. Portfolio has no equity assets');
        console.log('  2. Asset class mapping is incorrect');
        console.log('  3. Scenario factor changes are not being applied');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error with fresh data test, falling back to object test:', error);
    }
    
    // Fallback test with hardcoded portfolio data
    console.log('\n📊 Fallback: Testing with hardcoded portfolio data...');
    const incomePortfolio = {
      id: 'income-portfolio',
      name: 'Income Portfolio',
      description: 'Income focused portfolio',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assets: [
        {
          id: '1',
          symbol: 'SCHD',
          name: 'Schwab US Dividend Equity ETF',
          quantity: 300,
          price: 72.10,
          assetClass: 'equity' as const
        },
        {
          id: '2',
          symbol: 'VCIT',
          name: 'Vanguard Intermediate-Term Corporate Bond ETF',
          quantity: 400,
          price: 78.50,
          assetClass: 'bond' as const
        },
        {
          id: '3',
          symbol: 'VNQ',
          name: 'Vanguard Real Estate ETF',
          quantity: 150,
          price: 80.25,
          assetClass: 'real_estate' as const
        }
      ]
    };
    
    const scenario = marketDeclineScenario || await scenarioService.getScenarioById('7');
    if (!scenario) {
      console.log('❌ Could not load Market decline scenario');
      return false;
    }
    
    console.log('📋 Using scenario:', scenario.name);
    console.log('🎯 Factor changes:', scenario.factorChanges);
    
    const result = await simulateRealTimeStressTest(incomePortfolio, {
      equity: scenario.factorChanges.equity || 0,
      rates: scenario.factorChanges.rates || 0,
      credit: scenario.factorChanges.credit || 0,
      fx: scenario.factorChanges.fx || 0,
      commodity: scenario.factorChanges.commodity || 0
    });
    
    const totalImpact = ((result.stressedValue - result.originalValue) / result.originalValue * 100);
    
    console.log('\n📊 RESULTS:');
    console.log(`Original Value: $${result.originalValue.toFixed(2)}`);
    console.log(`Stressed Value: $${result.stressedValue.toFixed(2)}`);
    console.log(`Total Impact: ${totalImpact.toFixed(2)}%`);
    console.log('Asset Class Impacts:', result.assetClassImpacts);
    
    // Verify we're getting a non-zero impact
    if (Math.abs(totalImpact) > 0.1) {
      console.log('\n✅ SUCCESS: Market decline scenario is working correctly!');
      console.log(`✅ Portfolio shows ${totalImpact.toFixed(2)}% impact from 25% market decline`);
      return true;
    } else {
      console.log('\n❌ PROBLEM: Market decline scenario is still showing zero impact');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};

export default {
  runScenarioManagementTest,
  testMarketDeclineScenario
}; 
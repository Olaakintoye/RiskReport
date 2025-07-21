#!/usr/bin/env node

/**
 * Structured Stress Test API Test Script
 * ======================================
 * 
 * This script tests the new structured stress test API to ensure proper functionality.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================

const API_BASE_URL = 'http://localhost:3000/api/stress-test';
const TEST_OUTPUT_DIR = path.join(__dirname, 'test-output');

// Ensure output directory exists
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const log = (message, level = 'info') => {
  const timestamp = new Date().toISOString();
  const emoji = {
    info: '📊',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[level] || '📊';
  
  console.log(`${emoji} [${timestamp}] ${message}`);
};

const saveTestResults = (testName, results) => {
  const filePath = path.join(TEST_OUTPUT_DIR, `${testName}_${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  log(`Test results saved to: ${filePath}`, 'debug');
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// API TEST FUNCTIONS
// ==========================================

/**
 * Test API health and connectivity
 */
async function testApiHealth() {
  try {
    log('Testing API health and connectivity...');
    
    const response = await axios.get('http://localhost:3000/api/health');
    
    if (response.data.status === 'healthy') {
      log('API health check passed', 'success');
      log(`Services status: ${JSON.stringify(response.data.services)}`, 'debug');
      return true;
    } else {
      log('API health check failed', 'error');
      return false;
    }
  } catch (error) {
    log(`API health check failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Test fetching portfolios
 */
async function testGetPortfolios() {
  try {
    log('Testing portfolio retrieval...');
    
    const response = await axios.get(`${API_BASE_URL}/portfolios`);
    
    if (response.data.success) {
      const portfolios = response.data.portfolios;
      log(`Successfully retrieved ${portfolios.length} portfolios`, 'success');
      
      // Validate portfolio structure
      portfolios.forEach((portfolio, index) => {
        if (!portfolio.id || !portfolio.name || !portfolio.assets) {
          log(`Portfolio ${index} missing required fields`, 'error');
          return false;
        }
        
        log(`Portfolio ${index + 1}: ${portfolio.name} (${portfolio.assets.length} assets, $${portfolio.totalValue.toLocaleString()})`, 'debug');
      });
      
      saveTestResults('portfolios', portfolios);
      return portfolios;
    } else {
      log('Failed to retrieve portfolios', 'error');
      return null;
    }
  } catch (error) {
    log(`Error retrieving portfolios: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test fetching specific portfolio
 */
async function testGetPortfolio(portfolioId) {
  try {
    log(`Testing specific portfolio retrieval: ${portfolioId}...`);
    
    const response = await axios.get(`${API_BASE_URL}/portfolios/${portfolioId}`);
    
    if (response.data.success) {
      const portfolio = response.data.portfolio;
      log(`Successfully retrieved portfolio: ${portfolio.name}`, 'success');
      log(`Assets: ${portfolio.assets.length}, Total Value: $${portfolio.totalValue.toLocaleString()}`, 'debug');
      
      // Validate asset structure
      portfolio.assets.forEach((asset, index) => {
        if (!asset.symbol || !asset.assetType || asset.value === undefined) {
          log(`Asset ${index} missing required fields`, 'error');
        }
      });
      
      saveTestResults(`portfolio_${portfolioId}`, portfolio);
      return portfolio;
    } else {
      log(`Failed to retrieve portfolio: ${portfolioId}`, 'error');
      return null;
    }
  } catch (error) {
    log(`Error retrieving portfolio ${portfolioId}: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test fetching scenarios
 */
async function testGetScenarios() {
  try {
    log('Testing scenario retrieval...');
    
    const response = await axios.get(`${API_BASE_URL}/scenarios`);
    
    if (response.data.success) {
      const scenarios = response.data.scenarios;
      log(`Successfully retrieved ${scenarios.length} scenarios`, 'success');
      
      // Validate scenario structure
      scenarios.forEach((scenario, index) => {
        if (!scenario.id || !scenario.name || !scenario.factors) {
          log(`Scenario ${index} missing required fields`, 'error');
          return false;
        }
        
        log(`Scenario ${index + 1}: ${scenario.id} - ${scenario.name} (${scenario.severity})`, 'debug');
      });
      
      saveTestResults('scenarios', scenarios);
      return scenarios;
    } else {
      log('Failed to retrieve scenarios', 'error');
      return null;
    }
  } catch (error) {
    log(`Error retrieving scenarios: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test fetching specific scenario
 */
async function testGetScenario(scenarioId) {
  try {
    log(`Testing specific scenario retrieval: ${scenarioId}...`);
    
    const response = await axios.get(`${API_BASE_URL}/scenarios/${scenarioId}`);
    
    if (response.data.success) {
      const scenario = response.data.scenario;
      log(`Successfully retrieved scenario: ${scenario.name}`, 'success');
      log(`Factors: ${JSON.stringify(scenario.factors)}`, 'debug');
      
      saveTestResults(`scenario_${scenarioId}`, scenario);
      return scenario;
    } else {
      log(`Failed to retrieve scenario: ${scenarioId}`, 'error');
      return null;
    }
  } catch (error) {
    log(`Error retrieving scenario ${scenarioId}: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Test running stress test
 */
async function testRunStressTest(scenarioId, portfolioId, testName = 'default') {
  try {
    log(`Testing stress test execution: ${scenarioId} on ${portfolioId}...`);
    
    const requestData = {
      scenarioId,
      portfolioId,
      options: {
        confidenceLevel: 0.95,
        timeHorizon: 1,
        includeGreeks: true,
        includeFactorAttribution: true,
        includeCoverage: true,
        includeRiskMetrics: true
      }
    };
    
    log(`Request data: ${JSON.stringify(requestData, null, 2)}`, 'debug');
    
    const startTime = Date.now();
    const response = await axios.post(`${API_BASE_URL}/run`, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000 // 60 seconds timeout
    });
    const executionTime = Date.now() - startTime;
    
    if (response.data.success) {
      const results = response.data.results;
      log(`Stress test completed successfully in ${executionTime}ms`, 'success');
      log(`Portfolio Impact: ${results.totalImpactPercent.toFixed(2)}% (${results.totalImpact >= 0 ? '+' : ''}$${results.totalImpact.toLocaleString()})`, 'info');
      log(`Portfolio Value: $${results.portfolioValue.toLocaleString()} → $${results.stressedValue.toLocaleString()}`, 'info');
      
      // Validate results structure
      if (!results.assetResults || !results.factorAttribution || !results.riskMetrics) {
        log('Results missing required fields', 'error');
        return null;
      }
      
      // Log key metrics
      log(`Assets analyzed: ${results.assetResults.length}`, 'debug');
      log(`Asset class impacts: ${Object.keys(results.assetClassImpacts).length}`, 'debug');
      log(`Risk metrics - Concentration: ${(results.riskMetrics.concentration * 100).toFixed(1)}%`, 'debug');
      log(`Risk metrics - Coverage: ${(results.riskMetrics.coverage * 100).toFixed(0)}%`, 'debug');
      
      // Factor attribution
      const factorImpacts = Object.entries(results.factorAttribution)
        .map(([factor, impact]) => `${factor}: ${impact.toFixed(2)}%`)
        .join(', ');
      log(`Factor attribution: ${factorImpacts}`, 'debug');
      
      // Top asset contributors
      const topAssets = results.assetResults
        .sort((a, b) => Math.abs(b.contribution_to_portfolio) - Math.abs(a.contribution_to_portfolio))
        .slice(0, 3)
        .map(asset => `${asset.symbol}: ${asset.contribution_to_portfolio.toFixed(2)}%`)
        .join(', ');
      log(`Top contributors: ${topAssets}`, 'debug');
      
      saveTestResults(`stress_test_${testName}`, {
        request: requestData,
        response: response.data,
        executionTime,
        timestamp: new Date().toISOString()
      });
      
      return results;
    } else {
      log(`Stress test failed: ${response.data.error}`, 'error');
      return null;
    }
  } catch (error) {
    log(`Error running stress test: ${error.message}`, 'error');
    if (error.response) {
      log(`Server response: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return null;
  }
}

/**
 * Test stress test history
 */
async function testGetStressTestHistory() {
  try {
    log('Testing stress test history retrieval...');
    
    const response = await axios.get(`${API_BASE_URL}/history?limit=5`);
    
    if (response.data.success) {
      const history = response.data.history;
      log(`Successfully retrieved ${history.length} history items`, 'success');
      
      history.forEach((item, index) => {
        log(`History ${index + 1}: ${item.scenarioId} on ${item.portfolioId} (${item.results.totalImpactPercent.toFixed(2)}%)`, 'debug');
      });
      
      saveTestResults('stress_test_history', history);
      return history;
    } else {
      log('Failed to retrieve stress test history', 'error');
      return null;
    }
  } catch (error) {
    log(`Error retrieving stress test history: ${error.message}`, 'error');
    return null;
  }
}

// ==========================================
// COMPREHENSIVE TEST SUITE
// ==========================================

/**
 * Run comprehensive test suite
 */
async function runComprehensiveTests() {
  log('🚀 Starting Comprehensive Structured Stress Test API Tests');
  log('='.repeat(60));
  
  const testResults = {
    startTime: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };
  
  // Test 1: API Health
  log('\n1️⃣ Testing API Health...');
  const healthResult = await testApiHealth();
  testResults.tests.push({ name: 'API Health', passed: healthResult });
  
  if (!healthResult) {
    log('❌ API health check failed - stopping tests', 'error');
    return;
  }
  
  // Test 2: Portfolio Retrieval
  log('\n2️⃣ Testing Portfolio Retrieval...');
  const portfolios = await testGetPortfolios();
  testResults.tests.push({ name: 'Portfolio Retrieval', passed: !!portfolios });
  
  if (!portfolios || portfolios.length === 0) {
    log('❌ No portfolios available - stopping tests', 'error');
    return;
  }
  
  // Test 3: Specific Portfolio
  log('\n3️⃣ Testing Specific Portfolio Retrieval...');
  const portfolio = await testGetPortfolio(portfolios[0].id);
  testResults.tests.push({ name: 'Specific Portfolio', passed: !!portfolio });
  
  // Test 4: Scenario Retrieval
  log('\n4️⃣ Testing Scenario Retrieval...');
  const scenarios = await testGetScenarios();
  testResults.tests.push({ name: 'Scenario Retrieval', passed: !!scenarios });
  
  if (!scenarios || scenarios.length === 0) {
    log('❌ No scenarios available - stopping tests', 'error');
    return;
  }
  
  // Test 5: Specific Scenario
  log('\n5️⃣ Testing Specific Scenario Retrieval...');
  const scenario = await testGetScenario(scenarios[0].id);
  testResults.tests.push({ name: 'Specific Scenario', passed: !!scenario });
  
  // Test 6: Stress Test Execution (Market Decline -25%)
  log('\n6️⃣ Testing Stress Test Execution - Market Decline -25%...');
  const marketDeclineScenario = scenarios.find(s => s.id === 'TMPL0006');
  const incomePortfolio = portfolios.find(p => p.id === 'income-portfolio');
  
  if (marketDeclineScenario && incomePortfolio) {
    const stressTestResult = await testRunStressTest(
      marketDeclineScenario.id,
      incomePortfolio.id,
      'market_decline_income'
    );
    testResults.tests.push({ name: 'Stress Test - Market Decline', passed: !!stressTestResult });
  } else {
    log('❌ Required scenario or portfolio not found', 'error');
    testResults.tests.push({ name: 'Stress Test - Market Decline', passed: false });
  }
  
  // Test 7: Stress Test Execution (2008 Financial Crisis)
  log('\n7️⃣ Testing Stress Test Execution - 2008 Financial Crisis...');
  const crisisScenario = scenarios.find(s => s.id === 'TMPL0001');
  const growthPortfolio = portfolios.find(p => p.id === 'growth-portfolio');
  
  if (crisisScenario && growthPortfolio) {
    const stressTestResult = await testRunStressTest(
      crisisScenario.id,
      growthPortfolio.id,
      'financial_crisis_growth'
    );
    testResults.tests.push({ name: 'Stress Test - Financial Crisis', passed: !!stressTestResult });
  } else {
    log('❌ Required scenario or portfolio not found', 'error');
    testResults.tests.push({ name: 'Stress Test - Financial Crisis', passed: false });
  }
  
  // Test 8: Stress Test History
  log('\n8️⃣ Testing Stress Test History...');
  const history = await testGetStressTestHistory();
  testResults.tests.push({ name: 'Stress Test History', passed: !!history });
  
  // Test 9: Multiple Portfolio Tests
  log('\n9️⃣ Testing Multiple Portfolio Combinations...');
  let multiTestsPassed = 0;
  const multiTestsTotal = Math.min(portfolios.length, 3);
  
  for (let i = 0; i < multiTestsTotal; i++) {
    const testPortfolio = portfolios[i];
    const testScenario = scenarios[i % scenarios.length];
    
    log(`Testing ${testScenario.name} on ${testPortfolio.name}...`);
    const result = await testRunStressTest(
      testScenario.id,
      testPortfolio.id,
      `multi_test_${i}`
    );
    
    if (result) {
      multiTestsPassed++;
    }
    
    // Small delay between tests
    await delay(1000);
  }
  
  testResults.tests.push({
    name: 'Multiple Portfolio Tests',
    passed: multiTestsPassed === multiTestsTotal,
    details: `${multiTestsPassed}/${multiTestsTotal} tests passed`
  });
  
  // Calculate summary
  testResults.summary.total = testResults.tests.length;
  testResults.summary.passed = testResults.tests.filter(t => t.passed).length;
  testResults.summary.failed = testResults.summary.total - testResults.summary.passed;
  testResults.endTime = new Date().toISOString();
  
  // Results Summary
  log('\n📊 TEST RESULTS SUMMARY');
  log('='.repeat(60));
  log(`Total Tests: ${testResults.summary.total}`);
  log(`Passed: ${testResults.summary.passed}`, 'success');
  log(`Failed: ${testResults.summary.failed}`, testResults.summary.failed > 0 ? 'error' : 'success');
  log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  
  // Individual test results
  testResults.tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌';
    const details = test.details ? ` (${test.details})` : '';
    log(`${status} ${index + 1}. ${test.name}${details}`);
  });
  
  // Save comprehensive results
  saveTestResults('comprehensive_test_results', testResults);
  
  log('\n✅ Test suite completed!');
  log(`Results saved to: ${TEST_OUTPUT_DIR}`);
  
  return testResults;
}

// ==========================================
// MAIN EXECUTION
// ==========================================

if (require.main === module) {
  runComprehensiveTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  testApiHealth,
  testGetPortfolios,
  testGetPortfolio,
  testGetScenarios,
  testGetScenario,
  testRunStressTest,
  testGetStressTestHistory,
  runComprehensiveTests
}; 
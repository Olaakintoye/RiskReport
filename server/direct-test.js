const axios = require('axios');

// Portfolio data
const portfolio = {
  id: 'test-portfolio-1',
  name: 'Test Portfolio',
  assets: [
    { symbol: 'AAPL', name: 'Apple Inc.', quantity: 100, price: 175.50 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', quantity: 50, price: 325.75 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 25, price: 135.60 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', quantity: 30, price: 128.90 }
  ]
};

// Calculate expected portfolio value
const expectedValue = portfolio.assets.reduce(
  (sum, asset) => sum + (asset.price * asset.quantity), 
  0
);

console.log(`Expected portfolio value: $${expectedValue.toFixed(2)}`);

// Send a direct request with the portfolio
async function testDirect() {
  try {
    console.log('Sending direct request...');
    
    const response = await axios.post('http://localhost:3001/api/run-var', {
      confidenceLevel: '0.95',
      timeHorizon: '1',
      numSimulations: '10000',
      lookbackPeriod: '5',
      varMethod: 'monte-carlo',
      distribution: 'normal',
      portfolio: portfolio
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.success) {
      console.log('Response success!');
      console.log('Portfolio value:', response.data.results.portfolioValue);
      
      if (Math.abs(response.data.results.portfolioValue - expectedValue) < 0.01) {
        console.log('✅ Portfolio value matches expected value!');
      } else {
        console.log('❌ Portfolio value does not match expected value!');
        console.log(`Expected: ${expectedValue}, Got: ${response.data.results.portfolioValue}`);
      }
    } else {
      console.error('Error:', response.data.error);
    }
  } catch (error) {
    console.error('Request error:', error.message);
    if (error.response) {
      console.error('Server response data:', error.response.data);
      console.error('Server response status:', error.response.status);
    }
  }
}

testDirect(); 
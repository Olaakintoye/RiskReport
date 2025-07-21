const axios = require('axios');
const fs = require('fs');

// Sample portfolio data
const samplePortfolio = {
  id: 'test-portfolio-1',
  name: 'Test Portfolio',
  assets: [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 100,
      price: 175.50,
      assetClass: 'Equity'
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      quantity: 50,
      price: 325.75,
      assetClass: 'Equity'
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      quantity: 25,
      price: 135.60,
      assetClass: 'Equity'
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      quantity: 30,
      price: 128.90,
      assetClass: 'Equity'
    }
  ]
};

// Calculate the expected portfolio value for verification
const expectedPortfolioValue = samplePortfolio.assets.reduce(
  (sum, asset) => sum + asset.price * asset.quantity, 
  0
);

console.log(`Expected portfolio value: $${expectedPortfolioValue.toFixed(2)}`);

// Run the test
async function runTest() {
  try {
    console.log('Sending request to server with portfolio data...');
    
    const requestData = {
      params: {
        confidenceLevel: '0.95',
        timeHorizon: '1',
        numSimulations: '10000',
        lookbackPeriod: '5',
        varMethod: 'monte-carlo',
        distribution: 'normal',
        portfolio: samplePortfolio
      }
    };
    
    console.log('Request data:', JSON.stringify(requestData, null, 2));
    
    const response = await axios.post('http://localhost:3001/api/run-var', requestData, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.success) {
      console.log('VaR analysis completed successfully!');
      console.log('Portfolio Value from server:', response.data.results.portfolioValue);
      console.log('VaR (95%):', response.data.results.var);
      console.log('VaR as % of portfolio:', response.data.results.varPercentage.toFixed(2) + '%');
      console.log('CVaR (95%):', response.data.results.cvar);
      console.log('CVaR as % of portfolio:', response.data.results.cvarPercentage.toFixed(2) + '%');
      
      // Verify the portfolio value matches our expectation
      if (Math.abs(response.data.results.portfolioValue - expectedPortfolioValue) < 0.01) {
        console.log('✅ Portfolio value matches expected value!');
      } else {
        console.log('❌ Portfolio value does not match expected value!');
        console.log(`Expected: ${expectedPortfolioValue}, Got: ${response.data.results.portfolioValue}`);
      }
      
      // Save the chart URL for verification
      if (response.data.chartUrl) {
        console.log('Chart URL:', `http://localhost:3001${response.data.chartUrl}`);
      }
    } else {
      console.error('Error:', response.data.error);
    }
  } catch (error) {
    console.error('Error making request:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

runTest(); 
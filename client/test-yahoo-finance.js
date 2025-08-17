// Simple test script for Yahoo Finance service
const axios = require('axios');

async function testYahooFinance() {
  try {
    console.log('Testing Yahoo Finance API...');
    
    // Test different endpoints
    const endpoints = [
      'https://query1.finance.yahoo.com/v8/finance/chart/',
      'https://query2.finance.yahoo.com/v8/finance/chart/',
      'https://query1.finance.yahoo.com/v7/finance/chart/',
      'https://query2.finance.yahoo.com/v7/finance/chart/'
    ];
    
    const symbols = ['AAPL', 'MSFT', 'GOOGL']; // Use simpler symbols
    
    for (const baseUrl of endpoints) {
      try {
        console.log(`\nTrying endpoint: ${baseUrl}`);
        
        const url = `${baseUrl}${symbols.join(',')}`;
        console.log('Fetching from:', url);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
          },
          params: {
            interval: '1d',
            range: '1d',
            includePrePost: false,
            includeAdjustedClose: false,
            includeExtHoursData: false,
          },
          timeout: 10000,
        });
        
        console.log('Response status:', response.status);
        
        if (response.data && response.data.chart && response.data.chart.result) {
          const result = response.data.chart.result[0];
          console.log('✅ SUCCESS! Chart result keys:', Object.keys(result));
          
          if (result.meta) {
            console.log('Meta data:', {
              symbols: result.meta.symbols,
              previousClose: result.meta.previousClose,
              regularMarketPrice: result.meta.regularMarketPrice
            });
          }
          
          if (result.indicators && result.indicators.quote) {
            const quote = result.indicators.quote[0];
            console.log('Quote data keys:', Object.keys(quote));
            console.log('Sample close price:', quote.close && quote.close[0]);
          }
          
          // Found working endpoint, break
          break;
        } else {
          console.log('❌ No chart data in response');
        }
        
      } catch (endpointError) {
        console.log(`❌ Endpoint failed: ${endpointError.message}`);
      }
    }
    
    console.log('\nTest completed!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testYahooFinance();

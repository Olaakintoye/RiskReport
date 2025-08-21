// Test script for real market data service
console.log('🧪 Testing Real Market Data Service...\n');

// Test a few key symbols to verify we're getting real data
const testSymbols = [
  '^GSPC',  // S&P 500
  '^DJI',   // Dow Jones
  'AAPL',   // Apple
  'BTC-USD' // Bitcoin
];

async function testRealMarketData() {
  try {
    console.log('📡 Testing real market data fetching...\n');
    
    // Test individual symbols first
    for (const symbol of testSymbols) {
      console.log(`Testing ${symbol}...`);
      
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const result = data.chart?.result?.[0];
          
          if (result) {
            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice;
            const previousClose = meta.previousClose;
            const change = currentPrice - previousClose;
            const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
            
            console.log(`✅ ${symbol}: $${currentPrice.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)} | ${changePercent.toFixed(2)}%)`);
          } else {
            console.log(`❌ ${symbol}: No data in response`);
          }
        } else {
          console.log(`❌ ${symbol}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${symbol}: ${error.message}`);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n📊 Summary:');
    console.log('- S&P 500 (^GSPC) should show current market price');
    console.log('- Dow Jones (^DJI) should show current market price');
    console.log('- Apple (AAPL) should show current stock price');
    console.log('- Bitcoin (BTC-USD) should show current crypto price');
    
    console.log('\n🔍 Verify these prices match current market data:');
    console.log('- Check Yahoo Finance, Google Finance, or your trading app');
    console.log('- S&P 500 should be around current market level');
    console.log('- Prices should be realistic, not mock values');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRealMarketData();



// Simple test for mock market data service
const mockService = require('./src/services/mockMarketDataService.ts');

async function testMockService() {
  try {
    console.log('Testing Mock Market Data Service...\n');
    
    // Test getting market indicators
    console.log('Getting market indicators...');
    const indicators = await mockService.getMarketIndicators();
    
    console.log('✅ Success! Got', indicators.length, 'indicators');
    console.log('Sample indicators:');
    
    indicators.slice(0, 3).forEach(indicator => {
      console.log(`  ${indicator.symbol}: ${indicator.name} - ${indicator.value} (${indicator.change >= 0 ? '+' : ''}${indicator.changePercent.toFixed(2)}%)`);
    });
    
    // Test getting specific quotes
    console.log('\nTesting getQuotes...');
    const quotes = await mockService.getQuotes(['SPX', 'VIX', 'BTC']);
    console.log('✅ Got', quotes.length, 'quotes for specific symbols');
    
    // Test multiple calls to see price changes
    console.log('\nTesting price changes...');
    const firstCall = await mockService.getMarketIndicators();
    await new Promise(resolve => setTimeout(resolve, 100));
    const secondCall = await mockService.getMarketIndicators();
    
    const spx1 = firstCall.find(i => i.symbol === 'SPX');
    const spx2 = secondCall.find(i => i.symbol === 'SPX');
    
    if (spx1 && spx2) {
      console.log(`SPX price changed: ${spx1.value} → ${spx2.value} (${spx2.change >= 0 ? '+' : ''}${spx2.change.toFixed(2)})`);
    }
    
    console.log('\n✅ Mock service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testMockService();



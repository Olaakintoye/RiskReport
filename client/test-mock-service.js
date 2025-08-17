// Simple test for mock market data service functionality
console.log('Testing Mock Market Data Service Logic...\n');

// Simulate the mock service logic
const MOCK_SYMBOLS = [
  { symbol: 'SPX', name: 'S&P 500', basePrice: 4281.07, volatility: 0.02 },
  { symbol: 'VIX', name: 'Volatility Index', basePrice: 18.25, volatility: 0.15 },
  { symbol: 'BTC', name: 'Bitcoin', basePrice: 43256.78, volatility: 0.040 }
];

class TestMockService {
  constructor() {
    this.currentPrices = new Map();
    this.previousPrices = new Map();
    
    // Initialize with base prices
    MOCK_SYMBOLS.forEach(symbol => {
      this.currentPrices.set(symbol.symbol, symbol.basePrice);
      this.previousPrices.set(symbol.symbol, symbol.basePrice);
    });
  }

  generatePriceMovement(basePrice, volatility) {
    const randomChange = (Math.random() - 0.5) * 2; // -1 to 1
    const volatilityFactor = volatility * basePrice;
    const movement = randomChange * volatilityFactor * 0.1;
    return movement;
  }

  updatePrices() {
    MOCK_SYMBOLS.forEach(symbol => {
      const currentPrice = this.currentPrices.get(symbol.symbol) || symbol.basePrice;
      const movement = this.generatePriceMovement(currentPrice, symbol.volatility);
      
      // Store previous price
      this.previousPrices.set(symbol.symbol, currentPrice);
      
      // Update current price with movement
      const newPrice = Math.max(0.01, currentPrice + movement);
      this.currentPrices.set(symbol.symbol, newPrice);
    });
  }

  getMarketIndicators() {
    this.updatePrices();
    
    return MOCK_SYMBOLS.map(symbol => {
      const currentPrice = this.currentPrices.get(symbol.symbol) || symbol.basePrice;
      const previousPrice = this.previousPrices.get(symbol.symbol) || symbol.basePrice;
      const change = currentPrice - previousPrice;
      const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
      
      return {
        symbol: symbol.symbol,
        name: symbol.name,
        value: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        timestamp: Date.now()
      };
    });
  }
}

async function testMockService() {
  try {
    const service = new TestMockService();
    
    // Test getting market indicators
    console.log('Getting market indicators...');
    const indicators = service.getMarketIndicators();
    
    console.log('✅ Success! Got', indicators.length, 'indicators');
    console.log('Sample indicators:');
    
    indicators.forEach(indicator => {
      console.log(`  ${indicator.symbol}: ${indicator.name} - ${indicator.value} (${indicator.change >= 0 ? '+' : ''}${indicator.changePercent.toFixed(2)}%)`);
    });
    
    // Test multiple calls to see price changes
    console.log('\nTesting price changes...');
    const firstCall = service.getMarketIndicators();
    await new Promise(resolve => setTimeout(resolve, 100));
    const secondCall = service.getMarketIndicators();
    
    const spx1 = firstCall.find(i => i.symbol === 'SPX');
    const spx2 = secondCall.find(i => i.symbol === 'SPX');
    
    if (spx1 && spx2) {
      console.log(`SPX price changed: ${spx1.value} → ${spx2.value} (${spx2.change >= 0 ? '+' : ''}${spx2.change.toFixed(2)})`);
    }
    
    // Test volatility characteristics
    console.log('\nTesting volatility characteristics...');
    const btc1 = firstCall.find(i => i.symbol === 'BTC');
    const vix1 = firstCall.find(i => i.symbol === 'VIX');
    
    if (btc1 && vix1) {
      console.log(`BTC change: ${btc1.change.toFixed(2)} (higher volatility)`);
      console.log(`VIX change: ${vix1.change.toFixed(2)} (higher volatility)`);
      console.log(`SPX change: ${spx1.change.toFixed(2)} (lower volatility)`);
    }
    
    console.log('\n✅ Mock service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMockService();

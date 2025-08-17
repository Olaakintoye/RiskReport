// Test script for number formatting
console.log('🧪 Testing Number Formatting...\n');

// Sample market data to test formatting
const testData = [
  { symbol: '^GSPC', name: 'S&P 500', value: 6456.39, changePercent: -0.19 },
  { symbol: '^DJI', name: 'Dow Jones', value: 44907.87, changePercent: -0.01 },
  { symbol: 'AAPL', name: 'Apple Inc.', value: 232.31, changePercent: -0.20 },
  { symbol: 'BTC-USD', name: 'Bitcoin', value: 117964.98, changePercent: -0.35 },
  { symbol: 'EURUSD=X', name: 'EUR/USD', value: 1.0845, changePercent: 0.15 },
  { symbol: 'GC=F', name: 'Gold Futures', value: 2022.13, changePercent: 0.25 },
  { symbol: '^TNX', name: '10Y Treasury', value: 4.365, changePercent: 0.08 }
];

// Format value function (same as in component)
function formatValue(indicator) {
  const value = indicator.value;
  
  // Handle different asset types with appropriate formatting
  if (indicator.symbol.includes('USD') || indicator.symbol.includes('=')) {
    // Currencies and forex pairs - 4 decimal places
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 4, 
      maximumFractionDigits: 4 
    });
  } else if (indicator.symbol.includes('BTC') || indicator.symbol.includes('ETH') || indicator.symbol.includes('BNB') || indicator.symbol.includes('ADA') || indicator.symbol.includes('SOL') || indicator.symbol.includes('DOT')) {
    // Cryptocurrencies - 2 decimal places with commas
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  } else if (indicator.symbol.includes('^GSPC') || indicator.symbol.includes('^DJI') || indicator.symbol.includes('^IXIC') || indicator.symbol.includes('^RUT')) {
    // Major indices - 2 decimal places with commas
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  } else if (indicator.symbol.includes('AAPL') || indicator.symbol.includes('MSFT') || indicator.symbol.includes('GOOGL') || indicator.symbol.includes('AMZN') || indicator.symbol.includes('TSLA') || indicator.symbol.includes('NVDA')) {
    // Tech stocks - 2 decimal places with commas
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  } else if (indicator.symbol.includes('^TNX')) {
    // Treasury yields - 3 decimal places
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 3, 
      maximumFractionDigits: 3 
    });
  } else if (indicator.symbol.includes('^VIX')) {
    // VIX volatility - 2 decimal places
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  } else if (indicator.symbol.includes('GC=') || indicator.symbol.includes('SI=') || indicator.symbol.includes('CL=') || indicator.symbol.includes('BZ=') || indicator.symbol.includes('NG=') || indicator.symbol.includes('ZC=')) {
    // Commodities - 2 decimal places with commas
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  } else {
    // Default - 2 decimal places with commas
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }
}

// Test the formatting
console.log('📊 Number Formatting Examples:\n');

testData.forEach(indicator => {
  const formattedValue = formatValue(indicator);
  const formattedChange = indicator.changePercent.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  console.log(`${indicator.symbol} (${indicator.name}):`);
  console.log(`  Value: ${formattedValue}`);
  console.log(`  Change: ${indicator.changePercent >= 0 ? '+' : ''}${formattedChange}%`);
  console.log('');
});

console.log('✅ Number formatting test completed!');
console.log('\n🔍 Key improvements:');
console.log('- Large numbers now have comma separators (e.g., 44,907.87)');
console.log('- Consistent decimal places for each asset type');
console.log('- Professional financial number formatting');
console.log('- Better readability for users');


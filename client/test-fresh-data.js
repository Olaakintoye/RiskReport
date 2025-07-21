// Simple test script to verify portfolio fresh data fix
const { runAllFreshDataTests } = require('./src/debug/portfolio-fresh-data-test');

console.log('🧪 TESTING PORTFOLIO FRESH DATA FIX');
console.log('==================================');

// Run the tests
runAllFreshDataTests()
  .then(() => {
    console.log('\n✅ Test suite completed successfully!');
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
  }); 
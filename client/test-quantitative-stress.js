// Test script for the new quantitative stress testing engine
const { runAllQuantStressDebug } = require('./src/debug/quantitative-stress-test-debug.ts');

console.log('🎯 TESTING QUANTITATIVE STRESS TESTING ENGINE');
console.log('=============================================');
console.log('This test verifies the new quantitative approach to stress testing');
console.log('which replaces mock calculations with proper risk factor sensitivities.\n');

// Run the quantitative stress test debugging
runAllQuantStressDebug()
  .then(() => {
    console.log('\n✅ Quantitative stress test suite completed successfully!');
    console.log('The engine should now provide real risk-based calculations.');
  })
  .catch((error) => {
    console.error('\n❌ Quantitative stress test suite failed:', error);
    console.error('This indicates an issue with the new stress testing engine.');
  }); 
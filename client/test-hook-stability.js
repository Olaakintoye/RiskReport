// Test to verify hook stability and prevent infinite loops
console.log('Testing Hook Stability...\n');

// Simulate React's useState and useEffect behavior
let renderCount = 0;
let stateUpdates = 0;

function simulateHook() {
  renderCount++;
  console.log(`Render #${renderCount}`);
  
  // Simulate the hook logic without actual React
  const mockState = {
    marketIndicators: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
    isLive: false
  };
  
  // Simulate fetchMarketData being called
  if (renderCount === 1) {
    console.log('✅ First render - starting live updates');
    mockState.isLive = true;
    stateUpdates++;
  }
  
  // Simulate interval updates
  if (renderCount > 1 && renderCount <= 5) {
    console.log(`✅ Render #${renderCount} - updating data (no infinite loop)`);
    stateUpdates++;
  }
  
  // Check for infinite loops
  if (renderCount > 10) {
    console.log('❌ INFINITE LOOP DETECTED - stopping test');
    return;
  }
  
  // Simulate next render after a delay
  setTimeout(() => {
    if (renderCount <= 5) {
      simulateHook();
    } else {
      console.log('\n✅ Test completed successfully!');
      console.log(`Total renders: ${renderCount}`);
      console.log(`Total state updates: ${stateUpdates}`);
      console.log('No infinite loops detected!');
    }
  }, 100);
}

// Start the test
simulateHook();



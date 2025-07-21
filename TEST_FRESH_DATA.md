# Testing Portfolio Fresh Data Fix

## Overview
This guide explains how to test the portfolio fresh data fix that resolves the issue where stress test scenarios were showing 0% impact due to stale portfolio data.

## Problem Summary
- **Issue**: "Market decline - 25%" scenario was showing 0% impact across all asset classes
- **Root Cause**: UI was passing stale portfolio data to stress test functions
- **Solution**: Implemented fresh data fetching when running scenarios

## Testing Instructions

### 1. Browser Console Testing (Recommended)

Open your browser's developer console and run these commands:

```javascript
// Test the specific scenario that was problematic
import { quickMarketDeclineTest } from './src/debug/portfolio-fresh-data-test';
await quickMarketDeclineTest();

// Test fresh vs stale data comparison
import { testFreshDataVsStaleData } from './src/debug/portfolio-fresh-data-test';
await testFreshDataVsStaleData();

// Run all tests
import { runAllFreshDataTests } from './src/debug/portfolio-fresh-data-test';
await runAllFreshDataTests();
```

### 2. Manual Testing Steps

1. **Create/Update a Portfolio**:
   - Go to Portfolio section
   - Create a new portfolio or update existing one
   - Add assets with different asset classes (equity, bond, real_estate)

2. **Run Market Decline Scenario**:
   - Go to Scenarios section
   - Select "Market decline - 25%" scenario
   - Run it on your portfolio

3. **Verify Results**:
   - **Expected**: Non-zero impact percentages
   - **Equity assets**: Should show ~-25% impact
   - **Bond assets**: Should show ~0% impact
   - **Real estate**: Should show correlated impact (~-7.5%)

### 3. Console Output to Look For

When testing, look for these console messages:

#### ✅ Success Indicators:
```
✅ FRESH PORTFOLIO DATA: Fetched latest portfolio from storage
🔄 Running scenario with fresh portfolio data...
✅ Scenario completed with fresh data!
```

#### ❌ Problem Indicators:
```
⚠️ Using potentially stale portfolio data
❌ PROBLEM: Market decline scenario showing 0% impact!
```

### 4. Test Functions Available

- `quickMarketDeclineTest()` - Quick test of the problematic scenario
- `testFreshDataVsStaleData()` - Compare fresh vs stale data results
- `testPortfolioUpdateFreshness()` - Test data freshness after updates
- `testAllScenariosWithFreshData()` - Test all scenarios with fresh data
- `runAllFreshDataTests()` - Run complete test suite

### 5. Expected Results After Fix

For "Market decline - 25%" scenario on Income Portfolio:

```
📊 RESULTS:
   Total Impact: -15.75%
   Value Impact: $7,875.00
   Portfolio Value: $50,000.00

📈 Asset Class Impacts:
   equity: -25.00%
   bond: 0.00%
   real_estate: -7.50%

🔍 Factor Attribution:
   equity: -25.00%
   rates: 0.00%
   credit: 0.00%
```

### 6. Troubleshooting

If you still see 0% impact:

1. **Check Portfolio Composition**:
   - Ensure portfolio has assets
   - Verify asset classes are set correctly

2. **Check Scenario Definition**:
   - Verify "Market decline - 25%" scenario exists
   - Check that equity factor is set to -25

3. **Check Console Logs**:
   - Look for "FRESH PORTFOLIO DATA" messages
   - Verify portfolio composition is logged

4. **Run Debug Functions**:
   ```javascript
   import { checkScenarioAvailability } from './src/debug/stress-test-debug';
   await checkScenarioAvailability();
   ```

## Implementation Details

### What Changed

1. **Updated `handleRunScenario`**: Now accepts `portfolioId` instead of `Portfolio` object
2. **Added `runScenarioWithFreshData`**: Always fetches fresh portfolio data
3. **Enhanced Logging**: Added detailed logging to show portfolio composition
4. **Batch Analysis**: Updated to use fresh data for all portfolios

### Files Modified

- `client/src/services/scenarioService.ts` - Enhanced scenario service
- `client/src/pages/scenarios/ScenariosScreen.tsx` - Updated UI calls
- `client/src/debug/portfolio-fresh-data-test.ts` - Test suite
- `PORTFOLIO_FRESH_DATA_FIX.md` - Detailed implementation guide

### Migration Checklist

- [x] Updated all `handleRunScenario` calls to pass portfolio IDs
- [x] Added fresh data fetching in scenario service
- [x] Updated batch analysis to use fresh data
- [x] Added comprehensive logging
- [x] Created test suite for verification
- [x] Updated documentation

## Next Steps

1. **Test the implementation** using the methods above
2. **Verify console output** shows fresh data indicators
3. **Confirm non-zero impacts** for market scenarios
4. **Report any remaining issues** with specific console output

The fix should now ensure that all stress test scenarios use the most up-to-date portfolio data, resolving the 0% impact issue. 
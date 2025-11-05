# Fix Auto VaR Calculations - Complete Implementation Plan

## Problem

New portfolios are showing VaR calculations (1.87%, $2 Total VaR, and full VaR table) even though no analysis has been run. This is because:

1. **`calculateRiskMetrics()` is called automatically** when portfolio loads (line 421 in RiskReportScreen.tsx)
2. **Client-side VaR calculations run immediately** via `calculateParametricVar()`, `calculateHistoricalVar()`, `calculateMonteCarloVar()`
3. **Hardcoded fallback values** are applied when calculations return zero (lines 294-313)
4. **No database check** to see if VaR analysis has actually been performed

## Solution

### Phase 1: Database Functions (SQL)
Create functions to check if analysis exists before displaying calculated values.

### Phase 2: Code Changes (TypeScript)
1. Check database for existing analysis FIRST
2. Only display values if analysis exists in database
3. Remove automatic client-side calculations
4. Remove hardcoded fallback values

---

## Phase 1: SQL Changes

### File: `fix-auto-var-calculations.sql`

Run this in Supabase to create helper functions:

```sql
-- Function to check if portfolio has VaR analysis
CREATE OR REPLACE FUNCTION portfolio_has_var_analysis(p_portfolio_id UUID)
RETURNS BOOLEAN

-- Function to get analysis count  
CREATE OR REPLACE FUNCTION get_var_analysis_count(p_portfolio_id UUID)
RETURNS INTEGER

-- Function to get latest analysis date
CREATE OR REPLACE FUNCTION get_latest_var_analysis_date(p_portfolio_id UUID)
RETURNS TIMESTAMPTZ
```

---

## Phase 2: Code Changes

### 1. Update `loadLastVaRAnalysis()` Function

**File**: `client/src/pages/risk-report/redesigned/RiskReportScreen.tsx`

**Current Problem** (lines 544-592):
- Function exists but may not be setting `hasLoadedLastAnalysis` correctly
- Still allows client-side calculations to show

**Solution**: Update to properly check database and set state:

```typescript
const loadLastVaRAnalysis = async (portfolioId: string) => {
  try {
    console.log('[VaR] Loading last analysis for portfolio:', portfolioId);
    
    // Check if analysis exists in database
    const lastAnalysis = await riskService.getLastVaRAnalysis(portfolioId);
    
    if (lastAnalysis && lastAnalysis.hasAnalysis) {
      console.log('[VaR] Found existing analysis in database');
      
      // Set VaR results from database
      setVarResults({
        parametric: lastAnalysis.parametric,
        historical: lastAnalysis.historical,
        monteCarlo: lastAnalysis.monteCarlo
      });
      
      setHasLoadedLastAnalysis(true);
    } else {
      console.log('[VaR] No analysis found in database');
      
      // Set all to null - no analysis exists
      setVarResults({
        parametric: null,
        historical: null,
        monteCarlo: null
      });
      
      setHasLoadedLastAnalysis(false);
    }
  } catch (error) {
    console.error('[VaR] Error loading last analysis:', error);
    
    // On error, assume no analysis
    setVarResults({
      parametric: null,
      historical: null,
      monteCarlo: null
    });
    
    setHasLoadedLastAnalysis(false);
  }
};
```

### 2. Remove Automatic Client-Side Calculations

**File**: `client/src/pages/risk-report/redesigned/RiskReportScreen.tsx`

**Lines 472-506**: Update `calculateRiskMetrics()` function

**Remove this code**:
```typescript
const calculateRiskMetrics = async (portfolio: Portfolio) => {
  try {
    // Calculate portfolio value
    const portfolioValue = portfolio.assets.reduce(
      (sum, asset) => sum + asset.price * asset.quantity,
      0
    );
    
    // Calculate VaR using service functions
    const parametricResults = riskService.calculateParametricVar(portfolio, DEFAULT_VAR_PARAMS);
    const historicalResults = riskService.calculateHistoricalVar(portfolio, DEFAULT_VAR_PARAMS);
    const monteCarloResults = riskService.calculateMonteCarloVar(portfolio, DEFAULT_VAR_PARAMS);
    
    // Set VaR results
    setVarResults({
      parametric: parametricResults,
      historical: historicalResults,
      monteCarlo: monteCarloResults
    });
    
    // Calculate risk metrics
    const metrics = await riskService.calculateRiskMetrics(portfolio);
    setRiskMetrics(metrics);
    
    // Calculate Greeks
    const greeksResults = riskService.calculateGreeks(portfolio);
    setGreeks(greeksResults);
  } catch (error) {
    console.error('Error calculating risk metrics:', error);
  }
};
```

**Replace with** (only load from database):
```typescript
const calculateRiskMetrics = async (portfolio: Portfolio) => {
  try {
    console.log('[RiskMetrics] Loading risk metrics for portfolio');
    
    // Only calculate non-VaR metrics (Greeks, etc.)
    // VaR values should ONLY come from database via loadLastVaRAnalysis
    
    // Calculate risk metrics (now returns null for metrics without analysis)
    const metrics = await riskService.calculateRiskMetrics(portfolio);
    setRiskMetrics(metrics);
    
    // Calculate Greeks (optional, can be removed if not needed)
    const greeksResults = riskService.calculateGreeks(portfolio);
    setGreeks(greeksResults);
    
    console.log('[RiskMetrics] Risk metrics loaded:', {
      hasMetrics: !!metrics,
      volatility: metrics?.volatility,
      sharpe: metrics?.sharpeRatio
    });
  } catch (error) {
    console.error('Error calculating risk metrics:', error);
  }
};
```

### 3. Remove Fallback Values from Old RiskReportScreen

**File**: `client/src/pages/risk-report/RiskReportScreen.tsx` (if still in use)

**Lines 288-313**: Remove hardcoded fallback values

**Delete this code**:
```typescript
// Only use fallback values if the calculated values are exactly zero
if (parametricResults.varPercentage === 0) {
  parametricResults.varPercentage = 1.78;
  parametricResults.varValue = portfolioValue * (parametricResults.varPercentage / 100);
  parametricResults.cvarPercentage = 2.31;
  parametricResults.cvarValue = portfolioValue * (parametricResults.cvarPercentage / 100);
}

if (historicalResults.varPercentage === 0) {
  historicalResults.varPercentage = 1.95;
  historicalResults.varValue = portfolioValue * (historicalResults.varPercentage / 100);
  historicalResults.cvarPercentage = 2.63;
  historicalResults.cvarValue = portfolioValue * (historicalResults.cvarPercentage / 100);
}

if (monteCarloResults.varPercentage === 0) {
  monteCarloResults.varPercentage = 2.14;
  monteCarloResults.varValue = portfolioValue * (monteCarloResults.varPercentage / 100);
  monteCarloResults.cvarPercentage = 2.99;
  monteCarloResults.cvarValue = portfolioValue * (monteCarloResults.cvarPercentage / 100);
}
```

**Replace with**:
```typescript
// Don't set VaR results from client-side calculations
// Only load from database via loadLastVaRAnalysis
console.log('[VaR] Skipping client-side calculations - load from database only');
```

### 4. Update `getLastVaRAnalysis()` in riskService

**File**: `client/src/services/riskService.ts`

**Lines 727-858**: Ensure it returns null when no database results exist

**Key changes**:
- Line 750: Check if `var95` is actually > 0 (not just non-null)
- Return `hasAnalysis: false` if no real data

```typescript
export const getLastVaRAnalysis = async (portfolioId: string): Promise<{
  parametric: VaRResults | null;
  historical: VaRResults | null;
  monteCarlo: VaRResults | null;
  hasAnalysis: boolean;
} | null> => {
  try {
    const { riskTrackingService } = await import('./riskTrackingService');
    
    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(portfolioId)) {
      console.warn(`Invalid portfolio ID format: ${portfolioId}`);
      return {
        parametric: null,
        historical: null,
        monteCarlo: null,
        hasAnalysis: false
      };
    }

    const latestMetrics = await riskTrackingService.getLatestRiskMetrics(portfolioId);
    
    // Check if we have REAL VaR data (not null AND > 0)
    if (!latestMetrics || !latestMetrics.var95 || latestMetrics.var95 <= 0) {
      console.log('[getLastVaRAnalysis] No valid VaR data in database');
      return {
        parametric: null,
        historical: null,
        monteCarlo: null,
        hasAnalysis: false
      };
    }

    // If we have real VaR data, construct results
    // ... rest of existing code to build VaR results from database
    
    return {
      parametric: { /* from database */ },
      historical: { /* from database */ },
      monteCarlo: { /* from database */ },
      hasAnalysis: true
    };

  } catch (error) {
    console.error('Error fetching last VaR analysis:', error);
    return {
      parametric: null,
      historical: null,
      monteCarlo: null,
      hasAnalysis: false
    };
  }
};
```

---

## Expected Behavior After Fix

### Before Fix
```
New Portfolio Created
  ↓
RiskReportScreen loads
  ↓
calculateRiskMetrics() called
  ↓
calculateParametricVar() runs → 1.87%
calculateHistoricalVar() runs → 2.18%
calculateMonteCarloVar() runs → 2.30%
  ↓
All values displayed immediately
  ↓
User confused: "I haven't run analysis!"
```

### After Fix
```
New Portfolio Created
  ↓
RiskReportScreen loads
  ↓
loadLastVaRAnalysis() called
  ↓
Query database for existing analysis
  ↓
No results found in `results` or `risk_metrics` tables
  ↓
hasAnalysis = false
  ↓
varResults = { parametric: null, historical: null, monteCarlo: null }
  ↓
UI checks: parametricVaR && parametricVaR.varPercentage > 0
  ↓
Shows "—" and "Run analysis"
  ↓
User clicks "Run VaR Analysis"
  ↓
Analysis runs via Python backend
  ↓
Results saved to database
  ↓
loadLastVaRAnalysis() loads real values
  ↓
Real values displayed
```

---

## Files to Modify

1. ✅ `fix-auto-var-calculations.sql` - Database functions (NEW)
2. `client/src/pages/risk-report/redesigned/RiskReportScreen.tsx`
   - Update `loadLastVaRAnalysis()` (lines 544-592)
   - Update `calculateRiskMetrics()` (lines 472-506)
   - Ensure `hasLoadedLastAnalysis` state is used correctly
3. `client/src/pages/risk-report/RiskReportScreen.tsx` (old version, if used)
   - Remove fallback values (lines 294-313)
   - Update `calculateRiskMetrics()` (lines 280-330)
4. `client/src/services/riskService.ts`
   - Update `getLastVaRAnalysis()` to check var95 > 0 (lines 750-758)

---

## Testing Checklist

### Test 1: New Portfolio (No Analysis)
- [ ] Create new portfolio with positions
- [ ] Navigate to Risk Report
- [ ] **Expected**: VaR cards show "—" and "Run analysis"
- [ ] **Expected**: VaR table not displayed OR shows empty state
- [ ] **Expected**: "Total VaR" shows $0 or is hidden
- [ ] **Expected**: Risk Overview metrics show "—" and "Run analysis"

### Test 2: After Running Analysis
- [ ] Click "Run VaR Analysis"
- [ ] Select parameters and run
- [ ] Wait for completion
- [ ] **Expected**: Real values appear from database
- [ ] **Expected**: VaR table shows all three methods
- [ ] **Expected**: "Total VaR" shows actual calculated value
- [ ] **Expected**: Risk Overview shows real metrics

### Test 3: Portfolio with Existing Analysis
- [ ] Navigate to portfolio that has historical analysis
- [ ] **Expected**: Values load from database immediately
- [ ] **Expected**: All metrics display correctly
- [ ] **Expected**: "Last analyzed: [date]" shown

---

## SQL Migration Steps

1. **Backup** (optional but recommended):
```sql
-- Backup results table
CREATE TABLE results_backup AS SELECT * FROM results;
```

2. **Run the migration**:
```sql
-- In Supabase SQL Editor, run:
fix-auto-var-calculations.sql
```

3. **Verify functions created**:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%var_analysis%';
```

4. **Test functions**:
```sql
-- Replace with actual portfolio ID
SELECT 
  portfolio_has_var_analysis('your-portfolio-uuid'),
  get_var_analysis_count('your-portfolio-uuid');
```

---

## Summary

This fix ensures that:
- ✅ No automatic VaR calculations run on page load
- ✅ Values only display if they exist in database
- ✅ New portfolios show empty states correctly
- ✅ "Run analysis" prompts user to take action
- ✅ After analysis, real database values display
- ✅ No more confusing calculated/mock values

**The key principle**: VaR values should ONLY come from the database after a user explicitly runs analysis via the Python backend.


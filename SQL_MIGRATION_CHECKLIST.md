# SQL Migration Checklist

## Scripts to Run in Supabase

### ✅ Already Run (From Previous Implementation)

1. **`risk-tracking-enum-compatible.sql`**
   - Status: ✅ Completed
   - Purpose: Risk metrics table with VaR integration
   - Result: Trigger captures VaR results automatically

### 🔄 New Script to Run

2. **`check-portfolio-has-analysis.sql`**
   - Status: ⏳ Ready to run
   - Purpose: Helper functions to check if portfolio has analysis
   - Functions created:
     - `portfolio_has_var_analysis(UUID)` → boolean
     - `get_var_analysis_count(UUID)` → integer
     - `get_latest_var_analysis_date(UUID)` → timestamp

## How to Run

### In Supabase Dashboard

1. Open **SQL Editor**
2. Click **New Query**
3. Copy contents of `check-portfolio-has-analysis.sql`
4. Click **Run**
5. Verify success messages appear

### Expected Output

```
NOTICE: ✅ Portfolio VaR analysis check functions created successfully

Available functions:
  - portfolio_has_var_analysis(portfolio_id) → boolean
  - get_var_analysis_count(portfolio_id) → integer
  - get_latest_var_analysis_date(portfolio_id) → timestamp

Usage example:
  SELECT portfolio_has_var_analysis('your-portfolio-id');
```

## Verification Queries

After running the script, verify it worked:

```sql
-- Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'portfolio_has_var_analysis',
    'get_var_analysis_count',
    'get_latest_var_analysis_date'
  );

-- Should return 3 rows
```

## Test the Functions

```sql
-- Test with a portfolio ID from your database
SELECT 
  portfolio_has_var_analysis('your-portfolio-uuid') as has_analysis,
  get_var_analysis_count('your-portfolio-uuid') as analysis_count,
  get_latest_var_analysis_date('your-portfolio-uuid') as latest_date;
```

## Complete Implementation Status

| Component | Status | File/Script |
|-----------|--------|-------------|
| Portfolio User Isolation | ✅ Done | `safe-portfolio-migration.sql` |
| Scenario Run Isolation | ✅ Done | Code changes in `scenarioManagementService.ts` |
| Risk Metrics Table | ✅ Done | `risk-tracking-enum-compatible.sql` |
| VaR Auto-Capture Trigger | ✅ Done | `risk-tracking-enum-compatible.sql` |
| Mock Data Removal (Charts) | ✅ Done | `TimeSeriesCard.tsx`, `riskTrackingService.ts` |
| Mock Data Removal (Metrics) | ✅ Done | `riskService.ts`, `RiskOverview.tsx` |
| Analysis Check Functions | 🔄 Run Now | `check-portfolio-has-analysis.sql` |

## What Happens After Running SQL

1. **Three new functions available** for checking portfolio analysis status
2. **No breaking changes** - functions are additive only
3. **No data modified** - functions are read-only
4. **Immediately usable** - can be called from client code

## Optional: Using the Functions in TypeScript

```typescript
// Future enhancement - example usage
import { supabase } from '@/lib/supabase';

async function checkPortfolioAnalysis(portfolioId: string) {
  const { data, error } = await supabase.rpc('portfolio_has_var_analysis', {
    p_portfolio_id: portfolioId
  });
  
  if (data) {
    console.log('Portfolio has VaR analysis');
  } else {
    console.log('Portfolio needs VaR analysis');
  }
}
```

## Summary

- **Scripts to run**: 1 (check-portfolio-has-analysis.sql)
- **Time to run**: < 1 minute
- **Risk level**: Low (read-only functions)
- **Required permissions**: SQL Editor access in Supabase

---

**Note**: The main functionality (removing mock data) is already complete in the TypeScript code changes. The SQL script is optional and adds helper functions for future enhancements.


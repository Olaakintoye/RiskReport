# VaR Chart Storage and Retrieval - SQL Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the VaR chart storage and retrieval system in Supabase. This fixes the issue where "Previous Analysis Loaded" shows blank chart placeholders by properly retrieving stored chart URLs from the database.

## Problem Fixed

**Before**: The frontend `getLastVaRAnalysis()` function returned `chartImageUrl: undefined` even though charts were being saved to Supabase Storage.

**After**: Charts are properly retrieved from the database and displayed when switching between portfolios.

## Implementation Steps

### Step 1: Apply Database Migration

Run the following migration file in your Supabase SQL Editor:

**File**: `supabase/migrations/20250928000007_var_chart_retrieval.sql`

This migration includes:
- ✅ Adds `user_id` column to `results` table
- ✅ Creates indexes for efficient queries
- ✅ Enables RLS (Row Level Security) on `results` table
- ✅ Creates RLS policies for user isolation
- ✅ Creates `get_latest_var_charts()` function to retrieve chart URLs
- ✅ Creates `cleanup_old_var_charts()` function to remove old charts
- ✅ Creates trigger for automatic cleanup on new chart insertion
- ✅ Creates `latest_var_charts_view` for easy querying

**To Apply**:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20250928000007_var_chart_retrieval.sql`
3. Paste and run
4. Verify success messages in output

### Step 2: Update Storage Bucket Policies

Run the updated storage policies:

**File**: `supabase/create-var-charts-bucket.sql`

This updates:
- ✅ Adds service role upload policy for backend API
- ✅ Adds portfolio-based viewing policy
- ✅ Maintains public viewing for easy access
- ✅ Ensures users can only manage their own charts

**To Apply**:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/create-var-charts-bucket.sql`
3. Paste and run
4. Verify policies are created in Storage → Policies tab

### Step 3: Verify Database Schema

After running migrations, verify the following:

#### Check `results` table has required columns:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'results' 
  AND column_name IN ('user_id', 'chart_storage_url', 'var_percentage', 'cvar_percentage', 'portfolio_value')
ORDER BY column_name;
```

Expected output:
- `chart_storage_url` (text)
- `cvar_percentage` (numeric)
- `portfolio_value` (numeric)
- `user_id` (uuid)
- `var_percentage` (numeric)

#### Check RLS is enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'results';
```

Expected: `rowsecurity = true`

#### Check RLS policies exist:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'results';
```

Expected policies:
- "Users can view results for their portfolios" (SELECT)
- "Service role can insert VaR results" (INSERT)
- "Users can insert their own VaR results" (INSERT)

#### Check function exists:
```sql
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'get_latest_var_charts';
```

Expected: Function with argument `p_portfolio_id`

### Step 4: Test Chart Retrieval

Test the RPC function manually:

```sql
-- Replace with your actual portfolio ID
SELECT * FROM get_latest_var_charts('your-portfolio-id-here');
```

Expected columns:
- `calc_type` (parametric, historical, or monte_carlo)
- `chart_storage_url` (full Supabase Storage URL)
- `var_percentage`
- `cvar_percentage`
- `portfolio_value`
- `created_at`
- `confidence`
- `horizon_days`

### Step 5: Verify Data Flow

#### Check existing results with charts:
```sql
SELECT 
  calc_type,
  COUNT(*) as chart_count,
  COUNT(DISTINCT portfolio_id) as portfolio_count,
  MIN(created_at) as earliest_chart,
  MAX(created_at) as latest_chart
FROM results
WHERE chart_storage_url IS NOT NULL
GROUP BY calc_type
ORDER BY calc_type;
```

#### View latest charts per portfolio:
```sql
SELECT * FROM latest_var_charts_view
ORDER BY portfolio_id, calc_type, created_at DESC;
```

### Step 6: Backend Configuration

Ensure the backend is properly configured to save charts with user_id:

**File**: `risk_engine/services/supabase_io.py`

The `save_var_result()` function should include:
```python
result_data = {
    'portfolio_id': portfolio_id,
    'calc_type': calc_type,
    'chart_storage_url': chart_url,
    'user_id': user_id,  # ✅ Required for RLS
    # ... other fields
}
```

### Step 7: Frontend Integration

The frontend has been updated to fetch chart URLs:

**File**: `client/src/services/riskService.ts`

The `getLastVaRAnalysis()` function now:
1. Fetches VaR metrics from `risk_metrics` table
2. Calls `get_latest_var_charts()` RPC function
3. Maps chart URLs to each VaR model
4. Returns complete VaR results with chart URLs

## User Isolation & Security

### How User Isolation Works

1. **Results Table RLS**:
   - Users can only SELECT results for portfolios they own
   - Service role can INSERT results (backend API)
   - Users can INSERT results for their own portfolios

2. **Storage Bucket Policies**:
   - Charts stored at: `var-charts/{user_id}/{portfolio_id}/{method}_{timestamp}.png`
   - Users can upload to their own folder
   - Anyone can view charts (public bucket)
   - Portfolio-based viewing policy provides additional security
   - Users can only update/delete their own charts

3. **RPC Function Security**:
   - `get_latest_var_charts()` verifies user owns the portfolio
   - Raises exception if portfolio doesn't belong to user
   - `SECURITY DEFINER` allows function to query across tables

### Security Flow

```
User Request → Frontend
    ↓
Calls getLastVaRAnalysis(portfolioId)
    ↓
Supabase RPC: get_latest_var_charts(portfolioId)
    ↓
Function checks: portfolio.user_id = auth.uid()
    ↓
If valid: Returns chart URLs for that portfolio
If invalid: Raises "Access denied" exception
    ↓
Frontend displays charts
```

## Automatic Cleanup

### How Cleanup Works

When a new VaR analysis is run:
1. Charts are uploaded to Supabase Storage
2. Results are saved to `results` table with `chart_storage_url`
3. Trigger `auto_cleanup_old_var_charts` fires
4. Old charts for the same portfolio+model are deleted
5. Only the latest chart per portfolio+model is kept

### Manual Cleanup

To manually clean up old charts:
```sql
SELECT cleanup_old_var_charts();
```

Returns: Count of deleted records

## Troubleshooting

### Issue: No charts appear after switching portfolios

**Check 1**: Verify charts exist in database
```sql
SELECT portfolio_id, calc_type, chart_storage_url
FROM results
WHERE chart_storage_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

**Check 2**: Test RPC function with your portfolio ID
```sql
SELECT * FROM get_latest_var_charts('your-portfolio-id');
```

**Check 3**: Verify user owns the portfolio
```sql
SELECT id, name, user_id
FROM portfolios
WHERE id = 'your-portfolio-id';
```

### Issue: "Access denied" error when calling RPC function

**Cause**: User doesn't own the portfolio

**Solution**: Verify the portfolio belongs to the authenticated user:
```sql
SELECT p.id, p.name, p.user_id, auth.uid() as current_user
FROM portfolios p
WHERE p.id = 'your-portfolio-id';
```

### Issue: Charts not being saved to database

**Check 1**: Verify backend is passing `user_id` to `save_var_result()`

**Check 2**: Check Supabase logs for errors:
- Dashboard → Logs → API Logs
- Look for INSERT errors on `results` table

**Check 3**: Verify service role key is set in backend:
```bash
# In risk_engine/.env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Issue: Old charts not being cleaned up

**Check**: Verify trigger exists and is active
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'auto_cleanup_old_var_charts';
```

**Manual cleanup**:
```sql
SELECT cleanup_old_var_charts();
```

## Testing Checklist

After implementation, verify:

- [ ] Run VaR analysis on a test portfolio
- [ ] Check `results` table has new records with `chart_storage_url`
- [ ] Verify `user_id` is populated in `results` table
- [ ] Switch to another portfolio and back
- [ ] Confirm charts reload from database (check browser/app logs)
- [ ] Verify only latest chart per portfolio+model exists
- [ ] Test with multiple users to ensure isolation works
- [ ] Check Supabase Storage to see uploaded charts

## Database Functions Reference

### get_latest_var_charts(portfolio_id)

**Purpose**: Retrieves the latest chart URL for each VaR model type for a portfolio

**Parameters**:
- `p_portfolio_id` (UUID): Portfolio ID

**Returns**: Table with columns:
- `calc_type` (TEXT): Model type (parametric, historical, monte_carlo)
- `chart_storage_url` (TEXT): Full Supabase Storage URL
- `var_percentage` (NUMERIC): VaR percentage
- `cvar_percentage` (NUMERIC): CVaR percentage
- `portfolio_value` (NUMERIC): Portfolio value at analysis time
- `created_at` (TIMESTAMPTZ): When analysis was run
- `confidence` (NUMERIC): Confidence level (0.90, 0.95, 0.99)
- `horizon_days` (INTEGER): Time horizon in days

**Security**: Verifies user owns the portfolio before returning data

**Example**:
```sql
SELECT * FROM get_latest_var_charts('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
```

### cleanup_old_var_charts()

**Purpose**: Deletes old chart records, keeping only the latest per portfolio+model

**Parameters**: None

**Returns**: INTEGER (count of deleted records)

**Usage**:
```sql
SELECT cleanup_old_var_charts();
```

**Note**: Automatically called by trigger on new chart insertion

## Summary

This implementation ensures:
- ✅ Charts persist across portfolio switches
- ✅ "Previous Analysis Loaded" displays actual charts
- ✅ User isolation enforced at database level
- ✅ Automatic cleanup prevents storage bloat
- ✅ Proper mapping: user_id → portfolio_id → results → chart_storage_url
- ✅ Efficient queries with proper indexes
- ✅ Secure access through RLS policies

## Support

If you encounter issues:
1. Check Supabase Dashboard → Logs → API Logs
2. Check browser/app console for frontend errors
3. Verify all migrations were applied successfully
4. Test RPC function directly in SQL Editor
5. Verify environment variables are set correctly

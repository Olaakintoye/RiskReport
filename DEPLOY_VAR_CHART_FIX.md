# Quick Deployment Guide - VaR Chart Storage Fix

## 🚀 Quick Start (5 Minutes)

This guide provides the fastest path to deploy the VaR chart storage and retrieval fix.

## Prerequisites
- Access to Supabase Dashboard
- Supabase project: `qlyqxlzlxdqboxpxpdjp`

## Step 1: Apply SQL Migration (2 minutes)

1. Open [Supabase SQL Editor](https://app.supabase.com/project/qlyqxlzlxdqboxpxpdjp/sql)
2. Click "New Query"
3. Copy entire contents of `supabase/migrations/20250928000007_var_chart_retrieval.sql`
4. Paste into SQL Editor
5. Click "Run" (bottom right)
6. Wait for success messages (look for green checkmarks)

**Expected Output:**
```
✅ Added user_id column to results table
✅ Created RLS policies for results table
✅ Created trigger for automatic chart cleanup
========================================
   VAR CHART RETRIEVAL MIGRATION COMPLETE
========================================
Total Results: X
Results with Charts: Y
...
```

## Step 2: Update Storage Policies (1 minute)

1. In same SQL Editor, click "New Query"
2. Copy entire contents of `supabase/create-var-charts-bucket.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify no errors

**Verify in Dashboard:**
- Go to Storage → var-charts → Policies
- Should see policies:
  - "Users can upload VaR charts to their own folder"
  - "Service role can upload charts"
  - "Anyone can view VaR charts"
  - "Users can view charts for their portfolios"

## Step 3: Redeploy Backend (if needed)

If backend is already deployed with latest code:
- ✅ No action needed (changes in `supabase_io.py` already included)

If backend needs redeployment:
```bash
cd risk_engine
git pull origin main
# Railway will auto-deploy, or manually:
railway up
```

## Step 4: Rebuild Mobile App (if needed)

If running dev server:
```bash
cd client
npm install
npx expo start --clear
```

If deploying to production:
- Changes are in JavaScript (TypeScript compiled)
- Standard deployment process applies

## Step 5: Verify Deployment (2 minutes)

### Test in SQL Editor:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'results';
-- Should show: rowsecurity = true

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'get_latest_var_charts';
-- Should return: get_latest_var_charts

-- Test with a portfolio ID (replace with actual ID)
SELECT * FROM get_latest_var_charts('your-portfolio-id-here');
-- Should return chart URLs for each model (if analysis has been run)
```

### Test in Mobile App:
1. Login to app
2. Navigate to Risk Report
3. Select a portfolio that has previous VaR analysis
4. **Expected**: See "Previous Analysis Loaded" with actual chart images
5. Switch to another portfolio and back
6. **Expected**: Charts reload from database

## Verification Checklist

- [ ] SQL migration applied successfully
- [ ] Storage policies updated
- [ ] RLS enabled on `results` table
- [ ] Function `get_latest_var_charts()` exists
- [ ] Charts display when switching portfolios
- [ ] No errors in browser/app console
- [ ] User isolation works (test with multiple users if possible)

## Rollback Plan (If Needed)

If issues occur, rollback SQL changes:

```sql
-- Disable RLS
ALTER TABLE results DISABLE ROW LEVEL SECURITY;

-- Drop function
DROP FUNCTION IF EXISTS get_latest_var_charts(UUID);

-- Drop trigger
DROP TRIGGER IF EXISTS auto_cleanup_old_var_charts ON results;

-- Drop policies
DROP POLICY IF EXISTS "Users can view results for their portfolios" ON results;
DROP POLICY IF EXISTS "Service role can insert VaR results" ON results;
DROP POLICY IF EXISTS "Users can insert their own VaR results" ON results;
```

Frontend/Backend will gracefully handle missing function (will show blank charts but no errors).

## Common Issues

### Issue: "function get_latest_var_charts does not exist"
**Solution**: Rerun migration SQL

### Issue: "Access denied" when calling function
**Solution**: User doesn't own portfolio - verify portfolio ownership

### Issue: Charts still showing as undefined
**Solution**: 
1. Check browser console for errors
2. Verify portfolio has previous analysis
3. Test SQL function directly

## Support

For detailed documentation, see:
- `VAR_CHART_STORAGE_FIX_COMPLETE.md` - Full implementation details
- `Sql.md` - Complete SQL guide with troubleshooting

## Success Criteria

✅ **Deployment Successful** when:
1. SQL migration runs without errors
2. Function `get_latest_var_charts()` callable
3. Charts display when switching portfolios
4. "Previous Analysis Loaded" shows actual images
5. Automatic cleanup working (only latest charts kept)

---

**Estimated Deployment Time**: 5-10 minutes

**Risk Level**: Low (graceful degradation if issues occur)

**Testing Required**: Yes (verify with real portfolio data)

**User Impact**: Positive (fixes blank chart issue)


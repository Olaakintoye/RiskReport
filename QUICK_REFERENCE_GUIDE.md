# Risk Tracking Implementation - Quick Reference Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Run the SQL Script (5 minutes)
```bash
1. Open Supabase dashboard
2. Go to SQL Editor
3. Open file: risk-tracking-user-isolation.sql
4. Click "Run" (all at once)
5. Verify success messages appear
```

### Step 2: Restart Your App
```bash
# Just close and reopen the app
# Services will load the new functionality
```

### Step 3: Test It!
```bash
1. Open Risk Report page
2. Run VaR Analysis
3. Check Risk Tracking section
4. See new data point appear! ✨
```

---

## 📋 What You Get

### 4 Metric Tabs
- **VaR Tab**: Value at Risk percentages
- **Volatility Tab**: Portfolio volatility
- **Sharpe Tab**: Risk-adjusted returns
- **Beta Tab**: Market sensitivity

### 5 Timeframes
- **1m**: Last 30 days (weekly aggregation)
- **3m**: Last 90 days (weekly aggregation)
- **6m**: Last 180 days (bi-weekly aggregation)
- **1y**: Last 365 days (monthly aggregation)
- **all**: Last 3 years (monthly aggregation)

### Automatic Features
- ✅ VaR results auto-saved to risk_metrics
- ✅ Historical tracking starts immediately
- ✅ User isolation enforced automatically
- ✅ Charts update in real-time

---

## 🔍 SQL Quick Commands

### Check if migration ran successfully
```sql
-- Verify risk_metrics table exists
SELECT COUNT(*) FROM risk_metrics;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'risk_metrics';

-- View sample data
SELECT * FROM risk_metrics LIMIT 5;
```

### Get latest VaR for your portfolio
```sql
SELECT * FROM get_latest_risk_metrics('your-portfolio-id');
```

### Get VaR time series
```sql
SELECT * FROM get_risk_metrics_timeseries(
  'your-portfolio-id',
  'var',
  90  -- last 90 days
);
```

### Get aggregated metrics
```sql
SELECT * FROM get_aggregated_risk_metrics(
  'your-portfolio-id',
  'var',
  '3m'  -- 3 month timeframe
);
```

### View all your risk metrics
```sql
SELECT * FROM v_latest_portfolio_metrics
WHERE user_id = auth.uid();
```

---

## 🧪 Testing Checklist

### Basic Test (5 minutes)
- [ ] Run SQL script
- [ ] Open Risk Report
- [ ] Run VaR Analysis (any method)
- [ ] Open Risk Tracking section
- [ ] Verify VaR tab shows data point
- [ ] Switch timeframes (1m, 3m, etc.)
- [ ] Switch tabs (VaR, Volatility, etc.)

### User Isolation Test (10 minutes)
- [ ] Log in as User A
- [ ] Create portfolio "Test A"
- [ ] Run VaR Analysis
- [ ] Note the VaR value
- [ ] Log out
- [ ] Log in as User B
- [ ] Verify "Test A" portfolio is NOT visible
- [ ] Create portfolio "Test B"
- [ ] Run VaR Analysis
- [ ] Verify only "Test B" data shows

### Complete Flow Test (15 minutes)
- [ ] Create new portfolio
- [ ] Add positions
- [ ] Run Parametric VaR
- [ ] Check VaR tab - should show 1 point
- [ ] Run Historical VaR
- [ ] Check VaR tab - should show 2 points
- [ ] Run Monte Carlo VaR
- [ ] Check VaR tab - should show 3 points
- [ ] Switch to 1m timeframe
- [ ] Verify all 3 points visible
- [ ] Run VaR again next day
- [ ] Verify trend line appears

---

## ⚠️ Troubleshooting

### "No data in Risk Tracking"

**Check 1**: Did the SQL script run?
```sql
SELECT COUNT(*) FROM risk_metrics;
-- Should return > 0 if you've run VaR
```

**Check 2**: Is the trigger installed?
```sql
SELECT tgname FROM pg_trigger 
WHERE tgname = 'trigger_save_var_to_risk_metrics';
-- Should return 1 row
```

**Check 3**: Did VaR actually save to results?
```sql
SELECT * FROM results 
WHERE portfolio_id = 'your-portfolio-id' 
ORDER BY created_at DESC LIMIT 5;
-- Should show recent VaR runs
```

**Fix**: Re-run the migration section of the SQL script

---

### "Can't see other user's data"

**This is correct!** 🎉 The system is working as designed.

RLS is preventing you from accessing other users' data.

To verify isolation is working:
```sql
-- As service_role, you can see all data:
SELECT portfolio_id, metric_type, value 
FROM risk_metrics 
ORDER BY created_at DESC LIMIT 10;

-- As regular user, you only see yours
-- (automatically filtered by RLS)
```

---

### "Chart shows no trend line"

**Issue**: Need at least 2 data points for a trend

**Solution**: Run VaR analysis multiple times

Quick test:
1. Run Parametric VaR → 1st point
2. Run Historical VaR → 2nd point
3. Chart should now show a line

---

### "Timeframe shows empty"

**Check 1**: Do you have data in that date range?
```sql
SELECT 
  calculation_date,
  metric_type,
  value
FROM risk_metrics
WHERE portfolio_id = 'your-portfolio-id'
  AND calculation_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY calculation_date;
```

**Check 2**: Are you looking at the right metric tab?
- VaR tab needs VaR data
- Volatility tab needs volatility data
- etc.

---

## 📊 Understanding the Data

### VaR Values
- Stored as **decimals** (0.05 = 5%)
- Displayed as **percentages** (5%)
- Formula: VaR = Portfolio Value × VaR%

### Confidence Levels
- 95% confidence (0.95): Most common
- 99% confidence (0.99): More conservative
- Both tracked separately in database

### Time Horizons
- 1-day: Daily risk
- 10-day: 2-week risk
- 30-day: Monthly risk

### Calculation Methods
- **Parametric**: Assumes normal distribution
- **Historical**: Uses actual historical returns
- **Monte Carlo**: Simulates thousands of scenarios

All 3 methods tracked independently!

---

## 🎯 Common Use Cases

### Monitor daily VaR trend
```typescript
const history = await riskTrackingService.getRiskMetricHistory(
  portfolioId,
  'var',
  0.95,  // 95% confidence
  1,     // 1-day horizon
  30     // last 30 days
);
```

### Compare VaR methods
```sql
SELECT 
  calculation_method,
  AVG(value * 100) as avg_var_pct
FROM risk_metrics
WHERE portfolio_id = 'xxx'
  AND metric_type = 'var'
  AND calculation_date >= CURRENT_DATE - 30
GROUP BY calculation_method;
```

### Find highest risk days
```sql
SELECT 
  calculation_date,
  value * 100 as var_pct,
  calculation_method
FROM risk_metrics
WHERE portfolio_id = 'xxx'
  AND metric_type = 'var'
ORDER BY value DESC
LIMIT 10;
```

### Export risk history
```sql
SELECT 
  calculation_date as date,
  metric_type,
  value * 100 as percentage,
  confidence_level,
  time_horizon,
  calculation_method
FROM risk_metrics
WHERE portfolio_id = 'xxx'
ORDER BY calculation_date DESC;
```

---

## 🔧 Maintenance

### Monthly Cleanup (recommended)
```sql
-- Keep last 365 days of data
SELECT cleanup_old_risk_metrics(365);
```

### Check storage usage
```sql
SELECT 
  COUNT(*) as total_metrics,
  COUNT(*) * 400 / 1024 as approx_kb
FROM risk_metrics;
```

### Verify data quality
```sql
SELECT 
  metric_type,
  COUNT(*) as count,
  MIN(value) as min_value,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(calculation_date) as earliest,
  MAX(calculation_date) as latest
FROM risk_metrics
GROUP BY metric_type;
```

---

## 📞 Support Queries

### "How many users have risk data?"
```sql
SELECT COUNT(DISTINCT p.user_id)
FROM risk_metrics rm
JOIN portfolios p ON p.id = rm.portfolio_id;
```

### "How many VaR runs today?"
```sql
SELECT COUNT(*)
FROM risk_metrics
WHERE metric_type = 'var'
  AND calculation_date = CURRENT_DATE;
```

### "Most active portfolios"
```sql
SELECT 
  portfolio_id,
  COUNT(*) as num_calculations
FROM risk_metrics
WHERE calculation_date >= CURRENT_DATE - 30
GROUP BY portfolio_id
ORDER BY num_calculations DESC
LIMIT 10;
```

---

## 🎓 Key Concepts

### Why Automatic VaR Save?
- ✅ No code changes needed
- ✅ Guaranteed capture of every VaR run
- ✅ Historical tracking from day 1
- ✅ Database-level reliability

### Why RLS?
- ✅ Cannot be bypassed by client code
- ✅ Works automatically on all queries
- ✅ Database enforces security
- ✅ No user can access other's data

### Why Triggers?
- ✅ Automatic execution
- ✅ Can't forget to save
- ✅ Atomic with VaR save
- ✅ No extra API calls needed

### Why Aggregation?
- ✅ Smooth charts (not too cluttered)
- ✅ Meaningful periods (weekly/monthly)
- ✅ Fast queries
- ✅ Easy to interpret

---

## 📚 Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `risk-tracking-user-isolation.sql` | Main migration | Run once in Supabase |
| `RISK_TRACKING_IMPLEMENTATION.md` | Full documentation | Understand architecture |
| `RISK_TRACKING_ARCHITECTURE_DIAGRAM.md` | Visual diagrams | See data flow |
| `QUICK_REFERENCE_GUIDE.md` | This file | Quick lookup |
| `FINAL_IMPLEMENTATION_SUMMARY.md` | Complete summary | Overview of everything |

---

## ✅ Success Indicators

You know it's working when:
- ✅ SQL script runs with no errors
- ✅ risk_metrics table has data
- ✅ VaR tab shows data points after VaR run
- ✅ Charts update immediately
- ✅ Other users can't see your data
- ✅ Timeframes switch smoothly
- ✅ All 4 tabs work
- ✅ Trigger fires automatically

---

## 🎉 You're Done When...

- [x] SQL script executed successfully
- [x] Verification queries return data
- [x] RLS policies are active
- [x] Trigger is installed
- [x] App shows Risk Tracking section
- [x] VaR analysis creates data points
- [x] Charts display correctly
- [x] User isolation tested
- [x] Multiple timeframes tested
- [x] All 4 tabs tested

**Congratulations! Risk Tracking is now fully integrated! 🚀**

---

**Need Help?**
- Check `RISK_TRACKING_IMPLEMENTATION.md` for detailed explanations
- Review `FINAL_IMPLEMENTATION_SUMMARY.md` for complete overview
- See `RISK_TRACKING_ARCHITECTURE_DIAGRAM.md` for visual reference


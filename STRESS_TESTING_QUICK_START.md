# Stress Testing Improvements - Quick Start Guide

## 🚀 How to Use the Enhanced Stress Testing

### In the App

The enhanced stress testing is now automatically active. Simply:

1. **Navigate to Stress Testing**
   - Go to Scenarios or Stress Testing screen
   - Select a portfolio
   - Choose a stress scenario

2. **View Factor Attribution**
   - Click on "Factors" tab in results
   - Notice: Only relevant factors are shown
   - See info notice explaining filtered factors

3. **Check Classification Coverage**
   - Look at console logs when running stress tests
   - See classification source for each asset (hardcoded/api/fallback)
   - Coverage percentage reported

---

## 🧪 Quick Testing Checklist

### Test 1: Equity-Only Portfolio
**Setup:** Create portfolio with only stocks/equity ETFs (SPY, AAPL, QQQ)

**Run:** Any stress test scenario

**Expected Results:**
- ✅ Factor Attribution shows only: `EQUITY`
- ✅ UI notice: "Showing 1 of 6 factors..."
- ✅ No volatility, commodity, credit, or FX factors shown
- ✅ **Note:** Volatility is NOT shown for plain stocks because it measures risk/uncertainty, not P&L. Price changes are captured by the equity factor.

---

### Test 2: Bond-Only Portfolio
**Setup:** Create portfolio with only bonds (AGG, TLT, LQD)

**Run:** Interest rate shock scenario

**Expected Results:**
- ✅ Factor Attribution shows only: `RATES`, `CREDIT`
- ✅ UI notice: "Showing 2 of 6 factors..."
- ✅ No equity or commodity factors shown

---

### Test 3: Balanced Portfolio
**Setup:** Mix of stocks, bonds, REITs, commodities

**Run:** Market crash scenario

**Expected Results:**
- ✅ Multiple factors shown (equity, rates, credit, commodity)
- ✅ Each factor has material contribution
- ✅ UI notice shows relevant count

---

### Test 4: Uncommon Symbols
**Setup:** Add unusual/unknown ticker symbols

**Run:** Any stress test

**Expected Results:**
- ✅ Fallback classification applies
- ✅ Console shows classification source
- ✅ No errors, calculation completes
- ✅ Coverage % may be lower

---

## 📊 What Changed - User Perspective

### Before
```
Factor Attribution:
- Equity: -$2,500 (20%)
- Rates: $0 (0%)          ← Noise
- Credit: $0 (0%)         ← Noise
- FX: $0 (0%)             ← Noise
- Commodity: $0 (0%)      ← Noise
- Volatility: $0 (0%)     ← Noise (volatility doesn't affect plain stocks)
```

### After
```
Factor Attribution:
ℹ️ Showing 1 of 6 factors. Only factors relevant
   to your portfolio's asset classes are displayed.

- Equity: -$2,500 (20%)
```

**Result:** Cleaner, more relevant information! ✨

**Why no volatility?** Volatility measures how much prices fluctuate (risk/uncertainty), not the actual change in value. For plain stocks and ETFs, the price change itself is captured by the equity factor. Volatility is only relevant for options, VIX products, and other derivatives where volatility directly affects the instrument's value.

---

## 🔍 Console Debugging

Open React Native debugger to see detailed logs:

```
🎯 QUANTITATIVE STRESS TEST STARTING
=====================================

🔍 ANALYZING FACTOR RELEVANCE:
Portfolio composition: {equity: 1.0, bond: 0, ...}
Relevant factors (1/6): ['equity']
  ✓ equity: 100% portfolio exposure via equity
  ✗ rates: 0% (below 5% threshold, will be filtered out)
  ✗ credit: 0% (below 5% threshold, will be filtered out)
  ✗ fx: 0% (below 5% threshold, will be filtered out)
  ✗ commodity: 0% (below 5% threshold, will be filtered out)
  ✗ volatility: 0% (not applicable to plain stocks/ETFs)

📊 ANALYZING PORTFOLIO POSITIONS:

🔍 Analyzing SPY...
   Classification: equity | Broad Market | Large Cap Equity [hardcoded]
   Factor Sensitivities: {equity: 0.95, volatility: 0.8, ...}

📈 CLASSIFICATION COVERAGE:
  Hardcoded: 3/3
  API Lookup: 0/3
  Fallback: 0/3
  Overall Coverage: 100%

💡 CALCULATING FACTOR ATTRIBUTION (relevant factors only):
  equity: $-2500.00

✅ QUANTITATIVE STRESS TEST COMPLETED
```

---

## 🐛 Troubleshooting

### Issue: All factors still showing zeros

**Cause:** Using old stress test service

**Fix:** Ensure you're using `quantitativeStressTestService`, not the old mock service

---

### Issue: Classification errors for symbols

**Cause:** Symbol might need API key or not exist

**Fix:** Check that Tiingo API key is configured. Fallback will apply but with generic classification.

---

### Issue: Factor filtering not working

**Cause:** Portfolio might have mixed composition

**Solution:** This is expected! If portfolio has 10% bonds, rates/credit factors will show. Threshold is 5% exposure.

---

## 📈 Advanced: Custom Factor Mappings

To customize which factors apply to which assets, edit:

**File:** `client/src/services/factorRelevanceService.ts`

```typescript
export const FACTOR_RELEVANCE_MAP: Record<AssetClass, RiskFactor[]> = {
  equity: ['equity', 'volatility'],
  bond: ['rates', 'credit'],
  // ... customize as needed
};
```

Change the 5% materiality threshold:

```typescript
const MATERIALITY_THRESHOLD = 0.05; // Change this value
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Stress tests run without errors
- [ ] Only relevant factors show in results
- [ ] UI notice appears when factors are filtered
- [ ] Classification coverage >90% for your portfolios
- [ ] Console logs show detailed analysis
- [ ] Asset breakdown cards show correct classifications
- [ ] Factor attribution sums correctly

---

## 🎓 Understanding Factor Relevance

### Why filter factors?

**Before:** A 100% equity portfolio would show:
- Equity impact: -20%
- Rates impact: 0%
- Credit impact: 0%
- Commodity impact: 0%

This creates confusion - why show factors with zero impact?

**After:** Same portfolio shows:
- Equity impact: -20%
- Volatility impact: -1%

Much cleaner! Only factors that actually affect the portfolio.

### Asset Class → Factor Mapping

| Portfolio Type | Relevant Factors | Why? |
|----------------|------------------|------|
| **100% Stocks** | equity | Stocks respond to market movements (price changes). Volatility is NOT included - it measures risk/uncertainty, not P&L. |
| **100% Bonds** | rates, credit | Bonds respond to interest rates and credit spreads |
| **100% Gold** | commodity, fx | Commodities respond to commodity prices and currency |
| **100% Options/Derivatives** | equity, credit, volatility | Volatility IS relevant here because option values depend on implied volatility |
| **Mixed** | Multiple | Depends on asset class weights |

### The 5% Rule

A factor is only relevant if your portfolio has **>5% exposure** to asset classes that respond to that factor.

Example:
- 95% stocks, 5% bonds → Only shows equity (bond exposure too small)
- 90% stocks, 10% bonds → Shows equity, rates, credit (bond exposure material)

---

## 🚀 Next Steps

1. Run stress tests on your actual portfolios
2. Verify factor filtering works correctly
3. Check classification coverage for your symbols
4. Review console logs for any warnings
5. Test edge cases (100% single asset class)

---

## 📞 Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Verify asset classification for problematic symbols
3. Review factor relevance summary in logs
4. Check that portfolio.assets has correct assetClass values

---

**Last Updated:** January 2025
**Status:** ✅ Active
**Version:** 1.0.0


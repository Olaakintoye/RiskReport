# VaR Analysis Architecture Review

## Data Flow Overview

```
User Selects Portfolio
        ↓
RiskReportScreen.tsx (Frontend)
        ↓
runPythonVarAnalysis() - Prepares request
        ↓
HTTP POST → /api/run-var
        ↓
Railway (FastAPI) - app_wrapper.py
        ↓
legacy_run_var() - Extracts params & portfolio
        ↓
Calls appropriate VaR model:
  - Parametric.py
  - Historical.py
  - Monte Carlo Simulation.py
        ↓
calculate_var() - Wrapper function
        ↓
Fetches historical prices (yfinance)
        ↓
Calculates portfolio returns
        ↓
Runs VaR calculation
        ↓
Returns results to frontend
```

## Expected Data Structure

### Frontend → Backend Request:
```json
{
  "params": {
    "confidenceLevel": "0.95",
    "timeHorizon": "1",
    "numSimulations": "50000",
    "lookbackPeriod": "5",
    "varMethod": "parametric"
  },
  "portfolio": {
    "id": "portfolio-123",
    "name": "My Portfolio",
    "assets": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "quantity": 100,
        "price": 175.50,
        "assetClass": "equity"
      },
      {
        "symbol": "MSFT",
        "name": "Microsoft Corp.",
        "quantity": 50,
        "price": 380.00,
        "assetClass": "equity"
      }
    ]
  }
}
```

### Backend Processing:
1. Extract params from request
2. Convert string values to appropriate types:
   - `confidenceLevel`: string → float (0.95)
   - `timeHorizon`: string → int (1)
   - `numSimulations`: string → int (50000)
   - `lookbackPeriod`: string → int (5)
   - `varMethod`: string → mapped to model name

3. Extract portfolio assets:
   - Must have: `symbol`, `quantity`, `price`
   - Optional: `name`, `assetClass`

4. Pass to VaR model:
```python
calculate_var(
    portfolio_assets=[{...}, {...}],  # List of dicts
    confidence=0.95,                   # float
    horizon=1,                         # int
    lookback_years=5                   # int
)
```

### VaR Model Processing:
1. **Convert to DataFrame**: `pd.DataFrame(portfolio_assets)`
2. **Extract symbols**: `symbols = df['symbol'].tolist()`
3. **Fetch price data**: `yf.download(symbols, ...)`
4. **Calculate returns**: `price_data.pct_change()`
5. **Calculate weighted portfolio returns**:
   - For single asset: Direct returns
   - For multiple assets: `returns.dot(weights)`
6. **Run VaR calculation**: Model-specific algorithm
7. **Return standardized results**

## Current Issues & Fixes

### Issue 1: Single Asset Portfolio ✅ FIXED
**Problem**: When portfolio has 1 asset, `returns.dot(weights)` returns float instead of Series
**Solution**: Added special handling in `calculate_portfolio_returns()`
```python
if len(symbols) == 1:
    portfolio_returns = returns[symbols[0]]  # Returns Series
else:
    portfolio_returns = returns.dot(weights)  # Returns Series
```

### Issue 2: PORT Variable ✅ FIXED
**Problem**: Railway treating `$PORT` as literal string
**Solution**: Created `start.sh` script to properly expand environment variable

### Issue 3: Health Check Endpoint ✅ FIXED
**Problem**: App calling `/api/status` but Railway has `/health`
**Solution**: Updated `http.ts` to use `/health`

### Issue 4: Missing calculate_var Functions ✅ FIXED
**Problem**: VaR models had `parametric_var()`, `historical_var()`, etc. but app_wrapper imports `calculate_var()`
**Solution**: Added wrapper functions to all three VaR models

## Deployment Status

### Latest Commits:
1. `ea65114` - Fix Railway PORT variable
2. `14f2d04` - Fix single-asset portfolio calculation  ← **CRITICAL FIX**
3. `f9a2968` - Add calculate_var wrapper functions
4. `57d0588` - Fix health check endpoint
5. `c067f55` - Remove conflicting railway.json

### Railway Deployment:
- Health check: ✅ Responding
- Latest code: ⏳ May still be deploying commit 14f2d04

## Testing Checklist

### Single Asset Portfolio:
```bash
curl -X POST https://risktest1-production.up.railway.app/api/run-var \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"confidenceLevel": "0.95", "varMethod": "parametric"},
    "portfolio": {
      "assets": [{"symbol": "AAPL", "quantity": 100, "price": 175.50}]
    }
  }'
```

### Multi-Asset Portfolio:
```bash
curl -X POST https://risktest1-production.up.railway.app/api/run-var \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"confidenceLevel": "0.95", "varMethod": "parametric"},
    "portfolio": {
      "assets": [
        {"symbol": "AAPL", "quantity": 100, "price": 175.50},
        {"symbol": "MSFT", "quantity": 50, "price": 380.00}
      ]
    }
  }'
```

## Expected Response Format

```json
{
  "success": true,
  "results": {
    "var": 12456.78,
    "cvar": 15678.90,
    "portfolio_value": 36550.00,
    "var_percentage": 34.07,
    "confidence_level": 0.95,
    "time_horizon": 1,
    "lookback_years": 5,
    "stats": {
      "mean": 0.0012,
      "std_dev": 0.0234,
      "skewness": -0.123,
      "kurtosis": 3.456
    }
  },
  "chartUrl": "",
  "method": "parametric",
  "timestamp": "2025-10-07T23:30:00.000Z"
}
```

## Next Steps

1. ⏳ **Wait for Railway deployment** (2-3 minutes)
2. ✅ **Test single-asset portfolio**
3. ✅ **Test multi-asset portfolio**
4. ✅ **Test all three methods** (parametric, historical, monte_carlo)
5. ✅ **Verify results in app**

## Database Integration (Future Enhancement)

Currently, VaR calculations are computed on-demand. To store results:

### Required Changes:
1. **Supabase Schema**: Create `var_calculations` table
2. **Store Results**: Save calculation results with timestamp
3. **Historical Tracking**: Query past VaR values
4. **Caching**: Avoid recalculating recent data

### Schema Proposal:
```sql
CREATE TABLE var_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id TEXT NOT NULL,
  method TEXT NOT NULL,
  confidence_level NUMERIC NOT NULL,
  time_horizon INTEGER NOT NULL,
  var_value NUMERIC NOT NULL,
  cvar_value NUMERIC NOT NULL,
  portfolio_value NUMERIC NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  params JSONB
);
```


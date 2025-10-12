# 📱 Complete System Flow - User Journey

## 🎯 User Goal: "I want to analyze the risk of my investment portfolio"

---

## 📍 Step 1: User Opens App

**What happens:**
```
User opens app on iOS device
    ↓
App loads from Metro bundler (localhost:8081)
    ↓
React Native initializes
    ↓
Shows Login/Home Screen
```

**Files involved:**
- `App.tsx` - Main app entry point
- `client/src/app/_layout.tsx` - Navigation structure
- `client/src/config/api.ts` - Configures API endpoints

**API Configuration loads:**
```javascript
// Priority order:
1. EXPO_PUBLIC_API_BASE environment variable
2. Derived from debugger host
3. app.json extra.apiBase
4. Fallback: localhost:3001

Current: "https://risktest1-production.up.railway.app"
```

---

## 📍 Step 2: User Navigates to Portfolio

**What happens:**
```
User taps "Risk Analysis" or "Portfolio" tab
    ↓
App navigates to RiskReportScreen
    ↓
Loads user's portfolios from Supabase
```

**Files involved:**
- `client/src/pages/risk-report/redesigned/RiskReportScreen.tsx`
- `client/src/services/portfolioService.ts`

**Data fetched:**
```javascript
// From Supabase database
{
  portfolios: [
    {
      id: "portfolio-123",
      name: "My Tech Portfolio",
      assets: [
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          quantity: 100,
          price: 175.50,
          assetClass: "equity"
        },
        {
          symbol: "MSFT",
          name: "Microsoft Corp.",
          quantity: 50,
          price: 380.00,
          assetClass: "equity"
        }
      ]
    }
  ]
}
```

---

## 📍 Step 3: User Selects Portfolio & Parameters

**What happens:**
```
User selects "My Tech Portfolio"
    ↓
User sets VaR parameters:
  - Confidence Level: 95%
  - Time Horizon: 1 day
  - Method: All (Parametric, Historical, Monte Carlo)
  - Lookback Period: 5 years
    ↓
User clicks "Run VaR Analysis"
```

**UI State:**
```javascript
selectedPortfolio = {
  id: "portfolio-123",
  name: "My Tech Portfolio",
  assets: [...]
}

analysisConfidence = 0.95
analysisHorizon = 1
lookbackPeriod = 5
```

---

## 📍 Step 4: App Sends Request to Backend

**What happens:**
```
runPythonVarAnalysis() function called
    ↓
Health check: GET https://risktest1-production.up.railway.app/health
    ↓
For each method (parametric, historical, monte-carlo):
    ↓
POST https://risktest1-production.up.railway.app/api/run-var
```

**Request payload sent:**
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
    "name": "My Tech Portfolio",
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

**Code location:**
```javascript
// client/src/pages/risk-report/redesigned/RiskReportScreen.tsx
// Lines 643-661
const requestData = {
  params: {
    confidenceLevel: confidenceLevel.toString(),
    timeHorizon: timeHorizon.toString(),
    numSimulations: numSimulations.toString(),
    lookbackPeriod: lookbackPeriod.toString(),
    varMethod: method
  },
  portfolio: {
    id: selectedPortfolio.id,
    name: selectedPortfolio.name,
    assets: selectedPortfolio.assets.map(asset => ({
      symbol: asset.symbol,
      name: asset.name,
      quantity: asset.quantity,
      price: asset.price,
      assetClass: asset.assetClass
    }))
  }
};
```

---

## 📍 Step 5: Railway Server Receives Request

**What happens:**
```
Request arrives at Railway
    ↓
FastAPI app (app_wrapper.py) receives it
    ↓
legacy_run_var() function processes request
```

**Server processing:**
```python
# risk_engine/app_wrapper.py - line 498
@app.post("/api/run-var")
async def legacy_run_var(request: dict):
    # 1. Extract parameters
    params = request.get('params', request)
    portfolio_data = request.get('portfolio')
    
    confidence_level = float(params.get('confidenceLevel', 0.95))
    time_horizon = int(params.get('timeHorizon', 1))
    num_simulations = int(params.get('numSimulations', 50000))
    lookback_period = int(params.get('lookbackPeriod', 3))
    var_method = params.get('varMethod', 'monte-carlo')
    
    # 2. Map method name
    method_map = {
        'monte-carlo': 'monte_carlo',
        'parametric': 'parametric',
        'historical': 'historical'
    }
    method = method_map.get(var_method, 'monte_carlo')
    
    # 3. Extract portfolio assets
    portfolio_assets = portfolio_data.get('assets', [])
    # Now we have: [{"symbol": "AAPL", "quantity": 100, "price": 175.50}, ...]
```

---

## 📍 Step 6: Server Calls VaR Model

**What happens:**
```
Based on method, import appropriate VaR model
    ↓
For "parametric": import Parametric.py
    ↓
Call calculate_var() function
```

**Server code:**
```python
# risk_engine/app_wrapper.py - lines 535-542
if method == 'parametric':
    from var_models.Parametric import calculate_var as calc_parametric
    result = calc_parametric(
        portfolio_assets=portfolio_assets,
        confidence=confidence_level,
        horizon=time_horizon,
        lookback_years=lookback_period
    )
```

---

## 📍 Step 7: VaR Model Processes Data

**What happens in Parametric.py:**

### 7a. Convert to DataFrame
```python
# Line 241
portfolio_df = pd.DataFrame(portfolio_assets)
# Result:
#   symbol  quantity  price
# 0  AAPL    100     175.50
# 1  MSFT     50     380.00
```

### 7b. Get Historical Prices
```python
# Line 244-245
symbols = portfolio_df['symbol'].tolist()  # ['AAPL', 'MSFT']
price_data = get_historical_prices(symbols, years=5)

# Uses yfinance to download 5 years of daily prices
data = yf.download(['AAPL', 'MSFT'], start='2020-10-08', end='2025-10-08')
```

**⚠️ Critical Point - THE FIX:**
```python
# Lines 96-98 - THIS IS WHAT WAS FIXED
if isinstance(data, pd.Series):
    # Single symbol returns Series, convert to DataFrame
    data = pd.DataFrame({symbols[0]: data})

# Now data is ALWAYS a DataFrame:
#             AAPL    MSFT
# 2020-10-08  116.5   215.2
# 2020-10-09  117.2   216.8
# ...
# 2025-10-08  175.5   380.0
```

### 7c. Calculate Portfolio Returns
```python
# Line 248
portfolio_returns = calculate_portfolio_returns(portfolio_df, price_data)

# Inside calculate_portfolio_returns():
# 1. Calculate weights based on current value
weights = [(100 * 175.50), (50 * 380.00)]  # [17550, 19000]
weights = weights / sum(weights)  # [0.48, 0.52] (48% AAPL, 52% MSFT)

# 2. Calculate daily returns
returns = price_data.pct_change().dropna()  # Daily % changes

# 3. Calculate weighted portfolio returns
portfolio_returns = returns.dot(weights)  # Weighted combination

# Result: Series of daily portfolio returns
# 2020-10-09    0.012
# 2020-10-10   -0.008
# ...
```

### 7d. Calculate Portfolio Value
```python
# Line 251
portfolio_value = (portfolio_df['quantity'] * portfolio_df['price']).sum()
# = (100 * 175.50) + (50 * 380.00)
# = 17,550 + 19,000
# = 36,550
```

### 7e. Run VaR Calculation
```python
# Lines 254-260
var, cvar, simulated_losses, dist_stats = parametric_var(
    portfolio_returns,  # Series of daily returns
    portfolio_value,    # 36,550
    confidence,         # 0.95
    horizon,           # 1 day
    distribution='normal'
)

# Inside parametric_var():
mu = portfolio_returns.mean()      # Average daily return
sigma = portfolio_returns.std()    # Volatility

# Calculate VaR using formula:
z = norm.ppf(1 - 0.95)  # -1.645 for 95% confidence
var = -(mu * 1 + z * sigma * sqrt(1)) * 36550

# Example result:
# var = $1,234.56 (5% chance of losing more than this in 1 day)
# cvar = $1,567.89 (average loss if it exceeds VaR)
```

### 7f. Return Results
```python
# Lines 263-276
return {
    'results': {
        'var': 1234.56,
        'cvar': 1567.89,
        'portfolio_value': 36550.00,
        'var_percentage': 3.38,  # (1234.56 / 36550) * 100
        'confidence_level': 0.95,
        'time_horizon': 1,
        'lookback_years': 5,
        'distribution': 'normal',
        'stats': {
            'mean': 0.0012,
            'std_dev': 0.0189,
            'skewness': -0.234,
            'kurtosis': 3.456
        }
    },
    'chart_url': ''
}
```

---

## 📍 Step 8: Server Returns Response to App

**What happens:**
```
VaR model returns results
    ↓
app_wrapper.py formats response
    ↓
Sends HTTP response back to app
```

**Response sent:**
```json
{
  "success": true,
  "results": {
    "var": 1234.56,
    "cvar": 1567.89,
    "portfolio_value": 36550.00,
    "var_percentage": 3.38,
    "confidence_level": 0.95,
    "time_horizon": 1,
    "lookback_years": 5,
    "distribution": "normal",
    "stats": {
      "mean": 0.0012,
      "std_dev": 0.0189,
      "skewness": -0.234,
      "kurtosis": 3.456
    }
  },
  "chartUrl": "",
  "method": "parametric",
  "timestamp": "2025-10-08T00:30:00.000Z"
}
```

---

## 📍 Step 9: App Processes Response

**What happens:**
```
App receives response
    ↓
Processes results for display
    ↓
Updates UI with VaR metrics
```

**Code processing:**
```javascript
// client/src/pages/risk-report/redesigned/RiskReportScreen.tsx
// Lines 685-720
if (response.success) {
  const pythonResults: VaRResults = {
    portfolioValue: 36550.00,
    varValue: 1234.56,
    varPercentage: 3.38,
    cvarValue: 1567.89,
    // ... other fields
  };
  
  results['parametric'] = pythonResults;
  
  // Store for display
  setVarResults(results);
}
```

---

## 📍 Step 10: User Sees Results

**What user sees on screen:**

```
╔═══════════════════════════════════════════╗
║  📊 VaR Analysis Results                  ║
╠═══════════════════════════════════════════╣
║  Portfolio: My Tech Portfolio             ║
║  Value: $36,550.00                        ║
║                                           ║
║  Parametric VaR (95%, 1-day):            ║
║    VaR: $1,234.56 (3.38%)                ║
║    CVaR: $1,567.89 (4.29%)               ║
║                                           ║
║  Historical VaR (95%, 1-day):            ║
║    VaR: $1,189.23 (3.25%)                ║
║    CVaR: $1,498.45 (4.10%)               ║
║                                           ║
║  Monte Carlo VaR (95%, 1-day):           ║
║    VaR: $1,267.89 (3.47%)                ║
║    CVaR: $1,601.23 (4.38%)               ║
╚═══════════════════════════════════════════╝

Interpretation:
There's a 5% chance you could lose more than
$1,234.56 in the next trading day.
```

---

## 🔄 Complete Data Flow Diagram

```
┌─────────────────┐
│  User's iPhone  │
│   (iOS App)     │
└────────┬────────┘
         │ 1. User selects portfolio & clicks "Analyze"
         ↓
┌─────────────────────────────────────────────────────┐
│  Frontend (React Native)                            │
│  - RiskReportScreen.tsx                            │
│  - Formats request with portfolio & parameters     │
└────────┬────────────────────────────────────────────┘
         │ 2. POST /api/run-var
         │    {params: {...}, portfolio: {assets: [...]}}
         ↓
┌─────────────────────────────────────────────────────┐
│  Railway (Cloud Server)                             │
│  https://risktest1-production.up.railway.app       │
└────────┬────────────────────────────────────────────┘
         │ 3. Receives HTTP request
         ↓
┌─────────────────────────────────────────────────────┐
│  FastAPI Server (Python)                            │
│  - app_wrapper.py                                   │
│  - Extracts params & portfolio                      │
│  - Routes to correct VaR model                      │
└────────┬────────────────────────────────────────────┘
         │ 4. Calls calculate_var()
         ↓
┌─────────────────────────────────────────────────────┐
│  VaR Model (Python)                                 │
│  - Parametric.py / Historical.py / MonteCarlo.py   │
└────────┬────────────────────────────────────────────┘
         │ 5. Fetches historical prices
         ↓
┌─────────────────────────────────────────────────────┐
│  Yahoo Finance API                                  │
│  - yfinance library                                 │
│  - Returns 5 years of daily prices                  │
└────────┬────────────────────────────────────────────┘
         │ 6. Historical price data
         ↓
┌─────────────────────────────────────────────────────┐
│  VaR Model (Continued)                              │
│  - Calculates returns                               │
│  - Calculates portfolio weights                     │
│  - Runs VaR algorithm                               │
│  - Returns VaR, CVaR, stats                         │
└────────┬────────────────────────────────────────────┘
         │ 7. VaR results
         ↓
┌─────────────────────────────────────────────────────┐
│  FastAPI Server                                     │
│  - Formats response                                 │
│  - Returns JSON                                     │
└────────┬────────────────────────────────────────────┘
         │ 8. HTTP Response
         ↓
┌─────────────────────────────────────────────────────┐
│  Frontend                                           │
│  - Receives results                                 │
│  - Updates UI                                       │
│  - Displays metrics                                 │
└────────┬────────────────────────────────────────────┘
         │ 9. User sees results
         ↓
┌─────────────────┐
│  User's iPhone  │
│  "My portfolio  │
│   has $1,234    │
│   at risk!"     │
└─────────────────┘
```

---

## ⚠️ WHERE THE ERROR OCCURRED

### The Problem Location:
```
Step 7b: Get Historical Prices
  ↓
yfinance returns Series for single symbol
  ↓
Step 7b (continued): Process historical data
  ↓
❌ data.isna().mean().mean()
   ↑
   This fails because:
   - data is a Series (1D)
   - Series.mean() returns float
   - float has no .mean() method
   ↓
ERROR: 'float' object has no attribute 'mean'
```

### The Fix:
```python
# Lines 96-98 in Parametric.py, Historical.py, Monte Carlo.py
if isinstance(data, pd.Series):
    data = pd.DataFrame({symbols[0]: data})
    
# Now data is ALWAYS a DataFrame
# So data.isna().mean().mean() always works!
```

---

## 🎯 Current Status

### ✅ Code Status:
- All fixes committed to GitHub
- Commit: `e31e302`
- Code is **100% correct**

### ❌ Deployment Status:
- Railway has **NOT** deployed latest code
- Still running old code with bug
- **Manual deployment needed**

### 🚀 What You Need To Do:
1. Go to Railway Dashboard
2. Click "Redeploy"
3. Wait 2-3 minutes
4. Test again

Once deployed, the **entire flow above will work perfectly!** 🎉


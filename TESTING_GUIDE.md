# 🧪 VaR Calculation API - Testing Guide

Your VaR Calculation API is **LIVE** at: `https://risktest1-production.up.railway.app`

This guide will walk you through setting up test data and running your first VaR calculation.

---

## 📋 Prerequisites

- ✅ Railway API deployed and running
- ✅ Supabase project created
- ⏳ Database tables (we'll set these up)
- ⏳ Test user account
- ⏳ Test portfolio with positions

---

## 🚀 Step-by-Step Testing Process

### Step 1: Set Up Database Tables

You have 2 options:

#### **Option A: Supabase Dashboard (Easiest)**

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/sql)
2. Click **New query**
3. **Copy and paste** the entire contents of:
   ```
   supabase/migrations/20250928000000_risk_portfolio_schema.sql
   ```
4. Click **Run** (bottom right)
5. You should see "Success. No rows returned"
6. **Repeat** for the second migration file:
   ```
   supabase/migrations/20250928000001_row_level_security.sql
   ```
7. Done! Tables are created ✅

#### **Option B: Using psql (Advanced)**

If you have PostgreSQL client installed:

```bash
# Get your database password from Supabase Dashboard → Settings → Database
psql 'postgresql://postgres.qlyqxlzlxdqboxpxpdjp:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres' \
  -f supabase/migrations/20250928000000_risk_portfolio_schema.sql
  
psql 'postgresql://postgres.qlyqxlzlxdqboxpxpdjp:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres' \
  -f supabase/migrations/20250928000001_row_level_security.sql
```

---

### Step 2: Create a Test User

#### **Option A: Supabase Dashboard**

1. Go to [Authentication → Users](https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp/auth/users)
2. Click **Add user** → **Create new user**
3. Email: `test@riskreport.com`
4. Password: `Test123456!`
5. Click **Create user**
6. **Copy the User UID** (you'll need this)

#### **Option B: API Call**

```bash
curl -X POST 'https://qlyqxlzlxdqboxpxpdjp.supabase.co/auth/v1/signup' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@riskreport.com",
    "password": "Test123456!"
  }'
```

Save the `access_token` and `user.id` from the response.

---

### Step 3: Create Test Portfolio

Make the script executable and run it:

```bash
chmod +x setup-test-portfolio.sh
./setup-test-portfolio.sh
```

Enter your **User ID** when prompted.

This will create a portfolio with:
- **AAPL**: 100 shares @ $175.50 = $17,550
- **TSLA**: 50 shares @ $245.00 = $12,250  
- **MSFT**: 75 shares @ $380.00 = $28,500
- **Total**: ~$58,300

**Save the Portfolio ID** that's printed!

---

### Step 4: Run VaR Calculation

```bash
chmod +x test-var-calculation.sh
./test-var-calculation.sh
```

You'll need:
1. **JWT Token** (from Step 2 signup response, or from your app)
2. **Portfolio ID** (from Step 3)

The script will:
1. Start a Monte Carlo VaR calculation (50,000 simulations)
2. Poll for results every 2 seconds
3. Display the final VaR value when complete

**Expected output:**
```
🎉 Calculation completed!

💰 1-Day VaR (95%): $1,245.67

📈 This means there's a 5% chance of losing more than $1,245.67 in one day
```

---

## 🔍 Understanding the Results

### What You Get Back

```json
{
  "job_id": "calc_abc123",
  "status": "completed",
  "result": {
    "var_95": 1245.67,              // 95% VaR
    "var_99": 1876.45,              // 99% VaR  
    "expected_shortfall": 1520.33,  // Average loss beyond VaR
    "portfolio_value": 58300.00,
    "method": "monte_carlo",
    "confidence": 0.95,
    
    "asset_contributions": {
      "AAPL": 450.23,    // Apple contributes $450 to portfolio risk
      "TSLA": 620.12,    // Tesla contributes $620 (highest risk)
      "MSFT": 175.32     // Microsoft contributes $175
    },
    
    "charts": {
      "distribution": "https://supabase.../monte_carlo_var.png",
      "breakdown": "https://supabase.../asset_breakdown.png"
    },
    
    "statistics": {
      "mean_return": 0.0012,
      "std_dev": 0.0189,
      "skewness": -0.34,
      "kurtosis": 4.21
    }
  }
}
```

---

## 📊 Testing Different VaR Methods

### Parametric VaR (Fastest - assumes normal distribution)
```json
{
  "portfolio_id": "your-portfolio-id",
  "method": "parametric",
  "confidence": 0.95,
  "horizon_days": 1,
  "lookback_years": 3
}
```

### Historical VaR (Based on actual past returns)
```json
{
  "portfolio_id": "your-portfolio-id",
  "method": "historical",
  "confidence": 0.95,
  "horizon_days": 1,
  "lookback_years": 3
}
```

### Monte Carlo VaR (Most comprehensive)
```json
{
  "portfolio_id": "your-portfolio-id",
  "method": "monte_carlo",
  "confidence": 0.95,
  "horizon_days": 1,
  "num_simulations": 50000,
  "lookback_years": 3
}
```

---

## 🔗 API Endpoints

All available at: `https://risktest1-production.up.railway.app`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (no auth required) |
| `/docs` | GET | Interactive API documentation |
| `/calc/var` | POST | Single VaR calculation |
| `/calc/portfolio-var` | POST | Portfolio-wide VaR with correlations |
| `/jobs/{job_id}` | GET | Check calculation status |
| `/portfolios/{id}/results` | GET | Get historical results |

---

## 🐛 Troubleshooting

### "Tables don't exist"
Run the migrations (Step 1)

### "Unauthorized" / 401 error
Your JWT token expired. Generate a new one.

### "Portfolio not found" / 403 error
Make sure:
1. Portfolio ID is correct
2. User ID in portfolio matches your JWT token's user ID

### Calculation stays "processing"
Check Railway logs:
```bash
cd risk_engine
railway logs
```

### No market data
The API downloads data from Yahoo Finance. Check:
- Stock symbols are correct (AAPL, TSLA, etc.)
- Yahoo Finance is accessible
- Enough historical data exists (3 years default)

---

## 🎯 Next Steps

1. **Integrate with your React Native app** - Use the API endpoints
2. **Add more positions** - Test with different asset types
3. **Test real-time updates** - Supabase Realtime is enabled
4. **Try stress testing** - Coming soon
5. **Deploy to production** - Update environment variables

---

## 📞 Quick Reference

**API Base URL**: `https://risktest1-production.up.railway.app`

**Supabase URL**: `https://qlyqxlzlxdqboxpxpdjp.supabase.co`

**Anon Key** (for frontend):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM
```

**Service Role Key** (backend only, never expose):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk
```

---

Happy testing! 🚀


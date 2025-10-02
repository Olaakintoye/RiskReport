# 🚀 Deploy Risk Engine - Manual Steps

## ✅ What Was Fixed

Your app was crashing because:
1. Services were initializing before environment variables were loaded
2. No health check endpoint existed
3. Missing graceful error handling

**All fixed!** Your original VAR Python code is untouched.

---

## 📋 Deployment Steps

### Step 1: Login to Railway
```bash
railway login
```
This will open your browser - follow the prompts to authenticate.

### Step 2: Navigate to risk_engine
```bash
cd /Users/ola/Downloads/RiskReport.1/risk_engine
```

### Step 3: Link to Your Existing Project
```bash
railway link
```
When prompted:
- **Select project**: `risktest1`
- **Select environment**: `production`

### Step 4: Set Environment Variables

Copy and paste each command (one at a time):

```bash
railway variables set SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
```

```bash
railway variables set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk"
```

```bash
railway variables set SUPABASE_JWT_SECRET="hroFKe1jQvP2tniUe+/EZckNGxS8nta1x+BfkY9jOtqER90dMMqEteJZv7Ve7Ka5aG8Padj8+qrKNxktWCfWUA=="
```

```bash
railway variables set PORT="8000"
```

```bash
railway variables set LOG_LEVEL="INFO"
```

```bash
railway variables set PYTHONUNBUFFERED="1"
```

### Step 5: Deploy
```bash
railway up
```

This will build and deploy your fixed app!

---

## 🧪 Testing (After Deployment)

Wait 2-3 minutes for Railway to build and deploy, then test:

### Test Health Check
```bash
curl https://risktest1-production.up.railway.app/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-02...",
  "version": "1.0.0",
  "service": "VAR Calculation API",
  "config": {
    "supabase_configured": true,
    "jwt_configured": true,
    "python_version": "3.11..."
  }
}
```

### Test Root Endpoint
```bash
curl https://risktest1-production.up.railway.app/
```

### View Interactive API Docs
Open in browser:
```
https://risktest1-production.up.railway.app/docs
```

---

## 📊 Monitoring

### Check Deployment Status
```bash
railway status
```

### View Logs
```bash
railway logs
```

### Follow Logs in Real-Time
```bash
railway logs --follow
```

---

## 🎯 Key Changes Made

### 1. Fixed Startup Crash
**File**: `risk_engine/app_wrapper.py`
- Services now load lazily (only when needed)
- App starts even without env vars (limited mode)
- Added startup event that handles missing credentials gracefully

### 2. Added Health Endpoints
- `GET /` - API information
- `GET /health` - Health check with config status

### 3. Updated Supabase Service
**File**: `risk_engine/services/supabase_io.py`
- No longer crashes on missing env vars
- Warns and continues in limited mode
- Auto-initializes when credentials are available

### 4. Fixed Pandas Deprecation
**File**: `risk_engine/services/market_data.py`
- Updated `fillna(method='ffill')` → `ffill()`

---

## ❓ Troubleshooting

### If you get "Service: None"
This means the app isn't linked correctly. Make sure you're in the `risk_engine` directory when running `railway link`.

### If health check returns 502
Wait another minute - Railway is still deploying. Check logs with:
```bash
cd /Users/ola/Downloads/RiskReport.1/risk_engine
railway logs
```

### If you see "supabase_configured": false
Environment variables weren't set. Re-run Step 4 above.

---

## ✅ Success Criteria

You'll know it's working when:
1. ✅ `railway status` shows your service running
2. ✅ `/health` endpoint returns `"status": "healthy"`
3. ✅ `/health` shows `"supabase_configured": true`
4. ✅ `/docs` page loads in your browser
5. ✅ Logs show "VAR API Wrapper started successfully"

---

**Your original VAR calculation code remains unchanged - only infrastructure improvements!** 🎉


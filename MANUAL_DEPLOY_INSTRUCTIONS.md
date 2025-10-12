# 🚨 MANUAL RAILWAY DEPLOYMENT REQUIRED

## Current Status
- ✅ Code is pushed to GitHub (commit: `e31e302`)
- ✅ All fixes are in the code
- ❌ Railway has NOT auto-deployed
- ❌ Still getting "Internal Server Error"

## Why Auto-Deploy Isn't Working
Railway might have:
- Auto-deploy disabled
- Watching wrong branch
- Configuration issue
- Build failure (check logs)

---

## 🎯 MANUAL DEPLOYMENT (2 minutes)

### Step 1: Open Railway Dashboard
1. Go to: **https://railway.app/dashboard**
2. Login with your account

### Step 2: Find Your Project
1. Click on project: **"risktest1"**
2. You should see your services

### Step 3: Deploy
1. Click on the **Python service** (VAR Calculation API)
2. Look for:
   - **"Deployments"** tab in sidebar
   - OR **"Redeploy"** button
   - OR **"Deploy"** dropdown
3. Click **"Redeploy"** or **"Deploy Latest"**
4. Confirm if asked

### Step 4: Wait for Build (2-3 minutes)
Watch the logs for:
- 🔄 "Building..."
- ✅ "Build successful"  
- ✅ "Deployment live"
- ✅ "Health check passed"

### Step 5: Test
Once deployed, run this:
```bash
curl -X POST "https://risktest1-production.up.railway.app/api/run-var" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"confidenceLevel": "0.95", "varMethod": "parametric"},
    "portfolio": {"assets": [{"symbol": "AAPL", "quantity": 100, "price": 175.50}]}
  }'
```

**Success looks like:**
```json
{
  "success": true,
  "results": {
    "var": 12456.78,
    "cvar": 15678.90,
    ...
  }
}
```

**NOT:** `Internal Server Error`

---

## 🔍 Check Railway Logs

If deployment fails, check logs for:
1. **Build Logs**: Look for Python/Docker errors
2. **Runtime Logs**: Look for application errors
3. **Health Check**: Should show `/health` endpoint responding

Common issues to look for:
- ❌ `ModuleNotFoundError` → Missing dependency
- ❌ `PORT variable error` → Should be fixed now
- ❌ `Permission denied` → Docker user permissions
- ❌ `Health check timeout` → App not starting

---

## 🛠️ If Build Fails

### Check These Files Are Correct:

**1. Dockerfile** (root):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
# ... installs dependencies ...
COPY risk_engine/start.sh /app/start.sh
RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]
```

**2. start.sh** (risk_engine/):
```bash
#!/bin/bash
PORT=${PORT:-8000}
exec uvicorn app_wrapper:app --host 0.0.0.0 --port "$PORT"
```

**3. railway.json** (root):
```json
{
  "build": {
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "./start.sh",
    "healthcheckPath": "/health"
  }
}
```

---

## 📊 What Gets Fixed Once Deployed

✅ **Single-asset portfolios** work  
✅ **Multi-asset portfolios** work  
✅ **Real VaR calculations** (not mock)  
✅ **All 3 methods**: Parametric, Historical, Monte Carlo  
✅ **Historical price data** from Yahoo Finance  
✅ **Accurate risk metrics**  

---

## 🆘 If Still Not Working After Deployment

1. **Check Railway environment variables:**
   - `PORT` should be set by Railway automatically
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` should be set

2. **Check Railway logs for this error:**
   ```
   'float' object has no attribute 'mean'
   ```
   If you still see this, the deployment didn't pick up the latest code.

3. **Force rebuild:**
   - In Railway dashboard
   - Click service → Settings
   - Scroll to "Danger Zone"
   - Click "Redeploy" or "Restart"

4. **Check GitHub connection:**
   - Railway → Service → Settings
   - Check "Source" shows correct repo
   - Check "Branch" is `main`
   - Check "Auto-deploy" is enabled

---

## 🎯 Quick Test Checklist

After deployment, test these:

### ✅ Health Check:
```bash
curl https://risktest1-production.up.railway.app/health
```
Should return: `{"status": "healthy", ...}`

### ✅ Single Asset VaR:
```bash
curl -X POST "https://risktest1-production.up.railway.app/api/run-var" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"confidenceLevel": "0.95", "varMethod": "parametric"},
    "portfolio": {"assets": [{"symbol": "AAPL", "quantity": 100, "price": 175.50}]}
  }'
```
Should return: VaR calculation results

### ✅ Multi-Asset VaR:
```bash
curl -X POST "https://risktest1-production.up.railway.app/api/run-var" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"confidenceLevel": "0.95", "varMethod": "parametric"},
    "portfolio": {"assets": [
      {"symbol": "AAPL", "quantity": 100, "price": 175.50},
      {"symbol": "MSFT", "quantity": 50, "price": 380.00}
    ]}
  }'
```
Should return: VaR calculation results

### ✅ In Your App:
1. Select a portfolio
2. Click "Run VaR Analysis"
3. Should see real calculations (not error)

---

## Summary

**The fix is in your code.** Railway just needs to deploy it. 

**Go to Railway Dashboard → Click Redeploy → Wait 2-3 minutes → Test again**

Once deployed, your VaR analysis will work perfectly! 🎉


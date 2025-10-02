# Railway Manual Deployment Instructions

## Current Status
- ✅ Code is committed and pushed to GitHub (commit: 8d4856d)
- ✅ `/api/run-var` endpoint exists in `risk_engine/app_wrapper.py`
- ❌ Railway hasn't deployed the update automatically

## Manual Deployment Options

### Option 1: Railway Dashboard (Recommended)
1. Go to: https://railway.app/dashboard
2. Select project: **risktest1**
3. Click on the **VAR Calculation API** service
4. Click **"Deployments"** tab
5. Click **"Deploy"** or **"Redeploy"** button
6. Wait 2-3 minutes for build to complete

### Option 2: Railway CLI (if service is linked)
```bash
cd /Users/ola/Downloads/RiskReport.1/risk_engine
railway up
```

### Option 3: Force Rebuild via Git
```bash
cd /Users/ola/Downloads/RiskReport.1
git commit --allow-empty -m "Trigger Railway rebuild"
git push origin main
```

## Verify Deployment

After deployment, test the endpoint:

```bash
curl -X POST "https://risktest1-production.up.railway.app/api/run-var" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "confidenceLevel": "0.95",
      "timeHorizon": "1",
      "numSimulations": "50000",
      "varMethod": "monte-carlo"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "results": { ... },
  "method": "monte_carlo"
}
```

## Check Deployment Status

```bash
# Check if endpoint is available
curl -s https://risktest1-production.up.railway.app/ | python3 -m json.tool

# Should show:
# "legacy_run_var": "/api/run-var (POST) - Legacy compatibility endpoint"
```

## Troubleshooting

If Railway still shows old endpoints:
1. Check Railway is deploying from the correct branch (main)
2. Verify Railway root directory is set correctly
3. Check Railway build logs for errors
4. Ensure Dockerfile path is correct in railway.json

## Railway Configuration

Current setup:
- **Root Directory**: `risk_engine/`
- **Dockerfile**: `risk_engine/Dockerfile`  
- **Start Command**: `uvicorn app_wrapper:app --host 0.0.0.0 --port $PORT`
- **Health Check**: `/health`


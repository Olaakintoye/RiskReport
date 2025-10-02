# 🔧 Railway Deployment Troubleshooting

## ❌ Issue: "Cannot GET /" Error

You're seeing this because:
1. Railway deployed but the app isn't starting correctly
2. Missing environment variables
3. Accessing wrong endpoint

## ✅ Fix Steps

### Step 1: Check Which Directory Was Deployed

Your Railway service was deployed from the **ROOT directory**, not `risk_engine/`

This means Railway is looking for files in the wrong place!

### Step 2: Two Solutions

#### Solution A: Redeploy from risk_engine directory (RECOMMENDED)

```bash
# Navigate to risk_engine
cd risk_engine

# Link to your existing Railway project
railway link

# Select your project: risktest1
# Select environment: production

# Deploy from this directory
railway up

# Set environment variables
railway variables set SUPABASE_URL=https://qlyqxlzlxdqboxpxpdjp.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk
railway variables set SUPABASE_JWT_SECRET=hroFKe1jQvP2tniUe+/EZckNGxS8nta1x+BfkY9jOtqER90dMMqEteJZv7Ve7Ka5aG8Padj8+qrKNxktWCfWUA==
railway variables set PORT=8000
railway variables set LOG_LEVEL=INFO
```

#### Solution B: Update Railway Configuration

In your Railway Dashboard:
1. Settings → Build
2. Set **Root Directory** to: `risk_engine`
3. Redeploy

### Step 3: Test Correct Endpoint

Once fixed, test with `/health` not `/`:

```bash
curl https://risktest1-production.up.railway.app/health
```

NOT:
```bash
curl https://risktest1-production.up.railway.app/
```

## 📝 Why This Happened

Railway deployed from project root, but your app is in `risk_engine/` subdirectory.

The Dockerfile and app_wrapper.py are in `risk_engine/`, not root!


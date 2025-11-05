# Connection Health Report

**Generated:** $(date)

## Overview
This document provides a comprehensive health check of all system connections:
- Supabase Database
- Railway API Deployment
- Local Development Server

## Current Configuration

### Supabase
- **URL:** `https://qlyqxlzlxdqboxpxpdjp.supabase.co`
- **Status:** ✅ Connected
- **Services Tested:**
  - REST API: ✅ Operational
  - Storage API: ✅ Operational
  - Auth API: ⚠️ Requires API key in header

### Railway Deployment
- **Main URL:** `https://risktest1-production.up.railway.app`
- **Health Endpoint:** `/health`
- **API Status:** `/api/status`
- **VaR Calculation:** `/api/run-var`

### Local Development
- **Main Server:** `http://localhost:3001`
- **API Status:** `/api/status`
- **Stress Test API:** `/api/stress-test/test`

## Health Check Script

Run the automated health check:
```bash
node check-health.js
```

Or with Railway URLs:
```bash
export RAILWAY_MAIN_URL="https://risktest1-production.up.railway.app"
node check-health.js
```

## Manual Testing

### 1. Test Supabase Connection
```bash
curl -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM" \
  https://qlyqxlzlxdqboxpxpdjp.supabase.co/rest/v1/
```

### 2. Test Railway API
```bash
# Health check
curl https://risktest1-production.up.railway.app/health

# API Status
curl https://risktest1-production.up.railway.app/api/status

# VaR Calculation (single asset)
curl -X POST "https://risktest1-production.up.railway.app/api/run-var" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "confidenceLevel": "0.95",
      "varMethod": "parametric",
      "lookbackPeriod": "3"
    },
    "portfolio": {
      "assets": [
        {"symbol": "AAPL", "quantity": 100, "price": 175.50}
      ]
    }
  }'
```

### 3. Test Local Server
```bash
# Start local server first
npm run dev
# or
./start-all-servers.sh

# Then test
curl http://localhost:3001/api/status
curl http://localhost:3001/api/stress-test/test
```

## Connection Issues and Solutions

### Supabase Connection Issues
**Symptoms:**
- 401 Unauthorized errors
- "No API key found" messages

**Solutions:**
1. Verify API key in headers
2. Check Supabase project status: https://app.supabase.com
3. Ensure RLS policies are configured correctly
4. Verify network connectivity

### Railway Connection Issues
**Symptoms:**
- 500 Internal Server Error
- Timeout errors
- Service unavailable

**Solutions:**
1. Check Railway deployment status:
   ```bash
   railway login
   railway status
   ```
2. View Railway logs:
   ```bash
   railway logs
   ```
3. Verify environment variables in Railway dashboard
4. Check if auto-deploy is enabled
5. Manual redeploy if needed:
   ```bash
   railway up
   ```

### Local Server Issues
**Symptoms:**
- Connection refused
- ECONNREFUSED errors

**Solutions:**
1. Start the local server:
   ```bash
   npm run dev
   ```
2. Check if port 3001 is available:
   ```bash
   lsof -i :3001
   ```
3. Kill existing process if needed:
   ```bash
   kill -9 $(lsof -t -i:3001)
   ```
4. Check for dependency issues:
   ```bash
   npm install
   ```

## Monitoring Recommendations

### 1. Set Up Health Check Monitoring
- Use a service like UptimeRobot or Pingdom
- Monitor endpoints:
  - Railway: `https://risktest1-production.up.railway.app/health`
  - Supabase: `https://qlyqxlzlxdqboxpxpdjp.supabase.co/rest/v1/`

### 2. Log Monitoring
- Railway logs: `railway logs --follow`
- Supabase logs: Check Supabase dashboard

### 3. Performance Monitoring
- Track API response times
- Monitor error rates
- Set up alerts for failures

## Environment Variables Checklist

### Railway
- [x] `SUPABASE_URL`
- [x] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
- [ ] `TIINGO_API_KEY` (for market data)
- [x] `PORT`
- [x] `LOG_LEVEL`

### Local Development
- [ ] Create `.env.local` with development variables
- [ ] Configure API endpoints
- [ ] Set up test credentials

## Quick Commands Reference

```bash
# Run health check
node check-health.js

# Check Railway status
railway status

# View Railway logs
railway logs

# Start local servers
./start-all-servers.sh

# Test Supabase connection
curl https://qlyqxlzlxdqboxpxpdjp.supabase.co/rest/v1/

# Test Railway API
curl https://risktest1-production.up.railway.app/health

# Test local server
curl http://localhost:3001/api/status
```

## Last Health Check Results

Run `node check-health.js` to see the latest results.

**Key Metrics to Monitor:**
- Response time < 1000ms (good), < 3000ms (acceptable)
- Success rate > 95%
- Error rate < 5%
- Uptime > 99.9%

## Support Resources

- **Railway Dashboard:** https://railway.app/dashboard
- **Supabase Dashboard:** https://app.supabase.com
- **Railway CLI:** `railway help`
- **Health Check Script:** `node check-health.js --help`


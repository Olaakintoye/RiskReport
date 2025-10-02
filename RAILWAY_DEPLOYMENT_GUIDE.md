# Railway Deployment Guide - Risk Management System

## Overview

This guide covers deploying the Risk Management System to Railway with the new microservices architecture. You'll deploy two separate services:

1. **Risk Engine** (Python FastAPI) - Core risk calculations
2. **Legacy Server** (Node.js) - Backward compatibility and file serving

## Prerequisites

- Railway CLI installed: `npm install -g @railway/cli`
- Railway account and logged in: `railway login`
- Supabase project set up with migrations applied
- Environment variables ready

## Quick Deployment

### Option 1: Automated Script (Recommended)

```bash
# Make the script executable
chmod +x deploy-railway.sh

# Run the deployment script
./deploy-railway.sh
```

The script will prompt you to choose:
1. Deploy Risk Engine only (recommended for new deployments)
2. Deploy Legacy Server only (for backward compatibility)
3. Deploy both services

### Option 2: Manual Deployment

#### Deploy Risk Engine (Python FastAPI)

1. **Navigate to Risk Engine directory**
   ```bash
   cd risk_engine
   ```

2. **Initialize Railway project**
   ```bash
   railway init
   # Select "Create new project" and name it "risk-engine"
   ```

3. **Deploy the service**
   ```bash
   railway up --detach
   ```

4. **Configure environment variables**
   ```bash
   railway variables set SUPABASE_URL=https://qlyqxlzlxdqboxpxpdjp.supabase.co
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   railway variables set SUPABASE_JWT_SECRET=your-jwt-secret-here
   railway variables set TIINGO_API_KEY=your-tiingo-api-key-here
   railway variables set PORT=8000
   railway variables set LOG_LEVEL=INFO
   ```

#### Deploy Legacy Server (Optional)

1. **Navigate back to root directory**
   ```bash
   cd ..
   ```

2. **Initialize Railway project for legacy server**
   ```bash
   railway init
   # Select "Create new project" and name it "legacy-server"
   ```

3. **Deploy the legacy server**
   ```bash
   railway up --detach
   ```

4. **Configure environment variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   railway variables set SUPABASE_URL=https://qlyqxlzlxdqboxpxpdjp.supabase.co
   railway variables set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM
   railway variables set RISK_ENGINE_URL=https://your-risk-engine.railway.app
   ```

## Environment Variables Configuration

### Risk Engine Service

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) | ✅ | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...` |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification | ✅ | `your-jwt-secret` |
| `TIINGO_API_KEY` | Market data API key | ❌ | `your-tiingo-key` |
| `PORT` | Service port | ✅ | `8000` |
| `LOG_LEVEL` | Logging level | ❌ | `INFO` |

### Legacy Server Service

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Node environment | ✅ | `production` |
| `PORT` | Service port | ✅ | `3000` |
| `SUPABASE_URL` | Your Supabase project URL | ✅ | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Anonymous key (respects RLS) | ✅ | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...` |
| `RISK_ENGINE_URL` | Risk Engine service URL | ✅ | `https://risk-engine.railway.app` |

## Deployment Verification

### 1. Check Risk Engine Health

```bash
curl https://your-risk-engine.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. Check Legacy Server Health

```bash
curl https://your-legacy-server.railway.app/api/status
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "VaR Analysis API is running"
}
```

### 3. Test VaR Calculation

```bash
curl -X POST https://your-risk-engine.railway.app/calc/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "portfolio_id": "your-portfolio-id",
    "calc_type": "var_95",
    "confidence": 0.95,
    "horizon_days": 1,
    "n_sim": 50000,
    "method": "monte_carlo_t",
    "distribution": "t",
    "lookback_days": 1260
  }'
```

## Monitoring and Logs

### View Deployment Logs

```bash
# Risk Engine logs
cd risk_engine
railway logs

# Legacy Server logs
cd ..
railway logs
```

### Monitor Service Health

Railway provides built-in monitoring. Check your Railway dashboard for:
- Service uptime
- Response times
- Error rates
- Resource usage

## Scaling Configuration

### Automatic Scaling

Railway automatically scales based on traffic. For production workloads, consider:

```bash
# Set resource limits (via Railway dashboard)
# CPU: 2 vCPU
# Memory: 4GB
# Replicas: 1-3 (auto-scaling)
```

### Manual Scaling

```bash
# Scale Risk Engine
railway scale --replicas 2

# Check current scaling
railway status
```

## Custom Domain Setup

### 1. Add Custom Domain

```bash
railway domain add your-api.yourdomain.com
```

### 2. Configure DNS

Add CNAME record:
```
your-api.yourdomain.com -> your-project.railway.app
```

### 3. Update Frontend Configuration

Update your frontend environment variables:
```bash
EXPO_PUBLIC_RISK_ENGINE_URL=https://your-api.yourdomain.com
```

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Problem**: Docker build fails
**Solution**: Check Dockerfile paths and dependencies

```bash
# Verify Dockerfile exists
ls risk_engine/Dockerfile

# Check build logs
railway logs --build
```

#### 2. Environment Variable Issues

**Problem**: Service can't connect to Supabase
**Solution**: Verify environment variables

```bash
# List current variables
railway variables

# Test connection
railway run python -c "import os; print(os.getenv('SUPABASE_URL'))"
```

#### 3. Service Communication Issues

**Problem**: Legacy server can't reach Risk Engine
**Solution**: Check RISK_ENGINE_URL configuration

```bash
# Test connectivity
railway run curl $RISK_ENGINE_URL/health
```

#### 4. Memory/CPU Issues

**Problem**: Service crashes due to resource limits
**Solution**: Increase resource allocation in Railway dashboard

### Getting Help

1. **Railway Documentation**: https://docs.railway.app
2. **Railway Discord**: https://discord.gg/railway
3. **Project Issues**: Check GitHub issues in your repository

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Health checks passing
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Security review completed
- [ ] Load testing performed
- [ ] Error handling tested
- [ ] Documentation updated

## Cost Optimization

### Railway Pricing

- **Starter Plan**: $5/month per service
- **Pro Plan**: $20/month per service (higher limits)
- **Usage-based**: Additional charges for excess usage

### Optimization Tips

1. **Use sleep mode** for development environments
2. **Monitor resource usage** and right-size services
3. **Implement caching** to reduce computation costs
4. **Use efficient algorithms** in VaR calculations

## Next Steps

After successful deployment:

1. **Update Frontend**: Configure frontend to use new API endpoints
2. **Database Setup**: Run Supabase migrations if not done already
3. **Testing**: Perform end-to-end testing
4. **Monitoring**: Set up alerts and monitoring
5. **Documentation**: Update API documentation with new URLs

## Support

For deployment issues:
- Check Railway logs: `railway logs`
- Review environment variables: `railway variables`
- Test health endpoints
- Contact Railway support if needed

# Deploy VAR Models to Railway - Final Guide 🚀

## ✅ Ready to Deploy!

Your proven VAR models are now wrapped with modern infrastructure and ready for Railway deployment.

## 🎯 What You're Deploying

- **Your Original VAR Models**: Monte Carlo, Parametric, Historical, portfolio_var.py
- **Modern REST API**: FastAPI wrapper
- **Database**: Supabase integration
- **Authentication**: JWT-based security
- **Real-time**: Background job processing

## 📋 Pre-Deployment Checklist

- [x] VAR models packaged in `risk_engine/var_models/`
- [x] FastAPI wrapper created (`app_wrapper.py`)
- [x] Dockerfile updated
- [x] Supabase credentials configured
- [x] Requirements.txt updated
- [ ] Get Supabase Service Role Key
- [ ] Get Supabase JWT Secret

## 🚀 Deployment Steps

### Step 1: Get Missing Credentials

Go to your Supabase Dashboard (https://supabase.com):

1. **Service Role Key**:
   - Dashboard → Settings → API
   - Copy the `service_role` key (starts with `eyJ...`)

2. **JWT Secret**:
   - Dashboard → Settings → API
   - Copy the JWT Secret

### Step 2: Deploy to Railway

#### Option A: Automated (Recommended)

```bash
# From project root
./deploy-railway.sh

# Choose option 1: Deploy Risk Engine
```

Then run:
```bash
./setup-railway-env.sh

# Choose option 1: Setup Risk Engine
# Paste your Service Role Key and JWT Secret when prompted
```

#### Option B: Manual

```bash
# Navigate to risk_engine
cd risk_engine

# Deploy to Railway
railway up --detach

# Set environment variables
railway variables set SUPABASE_URL=https://qlyqxlzlxdqboxpxpdjp.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
railway variables set SUPABASE_JWT_SECRET=your-jwt-secret-here
railway variables set PORT=8000
railway variables set LOG_LEVEL=INFO
```

### Step 3: Verify Deployment

```bash
# Test health endpoint
curl https://your-service.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "version": "1.0.0",
  "models_available": ["parametric", "historical", "monte_carlo", "portfolio_var"]
}
```

## 🔍 Testing Your API

### 1. Get JWT Token

First, authenticate with Supabase from your frontend or use the Supabase client:

```javascript
const { data: { session } } = await supabase.auth.getSession()
const token = session.access_token
```

### 2. Test VaR Calculation

#### Monte Carlo VaR
```bash
curl -X POST https://your-service.railway.app/calc/var \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "portfolio_id": "your-portfolio-uuid",
    "method": "monte_carlo",
    "confidence": 0.95,
    "horizon_days": 1,
    "num_simulations": 50000,
    "lookback_years": 3
  }'
```

#### Portfolio VaR (Comprehensive)
```bash
curl -X POST https://your-service.railway.app/calc/portfolio-var \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "portfolio_id": "your-portfolio-uuid",
    "confidence": 0.95,
    "horizon_days": 1,
    "num_simulations": 50000,
    "lookback_years": 3
  }'
```

### 3. Check Job Status

```bash
curl https://your-service.railway.app/jobs/{job_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get Results

```bash
curl https://your-service.railway.app/portfolios/{portfolio_id}/results \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/calc/var` | Calculate VaR (parametric, historical, monte_carlo) |
| POST | `/calc/portfolio-var` | Calculate comprehensive portfolio VaR |
| GET | `/jobs/{job_id}` | Get job status |
| GET | `/portfolios/{portfolio_id}/results` | Get calculation results |

## 🔐 Environment Variables

Your Railway service needs these variables:

```bash
SUPABASE_URL=https://qlyqxlzlxdqboxpxpdjp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
PORT=8000
LOG_LEVEL=INFO
```

## 📱 Update Frontend

After deployment, update your frontend environment variables:

```bash
# client/.env or client/.env.production
EXPO_PUBLIC_RISK_ENGINE_URL=https://your-service.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://qlyqxlzlxdqboxpxpdjp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 🔄 Using the API from Frontend

```typescript
import { riskEngineClient } from './services/riskEngineClient'

// Calculate VaR
const response = await riskEngineClient.runVaRCalculation({
  portfolio_id: portfolioId,
  method: 'monte_carlo',
  confidence: 0.95,
  horizon_days: 1,
  n_sim: 50000,
  distribution: 't',
  lookback_days: 1260
})

console.log('Job started:', response.job_id)

// Poll for results or use real-time subscription
const job = await riskEngineClient.pollJobUntilComplete(response.job_id)
console.log('Calculation complete:', job)
```

## 🐛 Troubleshooting

### Issue: "SUPABASE_SERVICE_ROLE_KEY not set"
**Solution**: Run `./setup-railway-env.sh` and enter your service role key

### Issue: "JWT verification failed"
**Solution**: Make sure JWT_SECRET matches your Supabase project

### Issue: "Portfolio not found"
**Solution**: Ensure portfolio exists in Supabase and user has access

### Issue: "Module not found: var_models"
**Solution**: Redeploy - the Docker build should copy all var_models files

## 📈 Monitoring

### View Logs
```bash
railway logs
```

### Check Service Status
```bash
railway status
```

### Monitor Performance
- Railway Dashboard → Your Service → Metrics
- Check CPU, Memory, and Request metrics

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Health endpoint returns `{"status": "healthy"}`
- ✅ VaR calculation creates a job (returns job_id)
- ✅ Job status changes from "queued" → "running" → "completed"
- ✅ Results are saved in Supabase `results` table
- ✅ Frontend can retrieve and display results

## 📚 Additional Resources

- **Implementation Guide**: `VAR_MODELS_WRAPPER_IMPLEMENTATION.md`
- **Railway Deployment**: `RAILWAY_DEPLOYMENT_GUIDE.md`
- **Security Setup**: `SECURITY_SETUP.md`
- **Docker Analysis**: `DOCKER_VAR_MODELS_ANALYSIS.md`

## 🎉 You're Ready!

Your proven VAR calculation models are now:
- ✅ Production-ready
- ✅ API-accessible
- ✅ Database-integrated
- ✅ Securely authenticated
- ✅ Real-time capable

Deploy with confidence - your core VAR logic remains unchanged and battle-tested! 🚀




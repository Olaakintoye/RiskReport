# Risk Management System Deployment Guide

## Overview

This guide covers deploying the complete Risk Management System with the new architecture:
- **Frontend**: React Native/Expo app
- **Risk Engine**: Python FastAPI service for VaR calculations
- **Database**: Supabase with PostgreSQL
- **Legacy Server**: Node.js server (optional, for migration)

The system is designed for mass deployment with proper security, scalability, and real-time capabilities.

## Architecture Components

### 1. Risk Engine (Python FastAPI)
**Location**: `risk_engine/`
- **FastAPI** application for risk calculations
- **VaR Methods**: Parametric, Historical, Monte Carlo (Normal & t-distribution)
- **Stress Testing**: Historical scenarios and custom stress tests
- **Real-time**: Background job processing with status updates
- **Security**: JWT authentication with Supabase
- **Deployment**: Docker container on Railway/Cloud Run

### 2. Database (Supabase)
**Location**: `supabase/migrations/`
- **PostgreSQL** with Row Level Security (RLS)
- **Tables**: portfolios, positions, calc_jobs, results, stress_scenarios
- **Real-time**: WebSocket subscriptions for live updates
- **Security**: User-based data isolation with RLS policies
- **Backup**: Automated backups and point-in-time recovery

### 3. Frontend (React Native/Expo)
**Location**: `client/`
- **Cross-platform**: iOS, Android, and Web
- **Real-time UI**: Live updates via Supabase subscriptions
- **Offline Support**: Local caching and sync
- **Security**: JWT-based authentication
- **Deployment**: Expo EAS Build for app stores

### 4. Legacy Server (Node.js) - Optional
**Location**: `server/`
- **Migration Support**: Gradual transition from old API
- **File Serving**: Static chart images and legacy endpoints
- **Proxy**: Can forward requests to Risk Engine
- **Deployment**: Railway/Heroku for backward compatibility

## Deployment Steps

### Step 1: Setup Supabase Database

1. **Create Supabase Project**
   ```bash
   # Visit https://supabase.com and create a new project
   # Note down your project URL and anon key
   ```

2. **Run Database Migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Initialize Supabase in your project
   supabase init
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```

3. **Configure Row Level Security**
   ```sql
   -- The migrations already include RLS policies
   -- Verify they're applied correctly in your Supabase dashboard
   ```

### Step 2: Deploy Risk Engine (Python FastAPI)

#### Option A: Railway Deployment (Recommended)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Deploy Services**
   ```bash
   # Use the automated deployment script
   ./deploy-railway.sh
   
   # Or deploy manually:
   
   # Deploy Risk Engine (Python FastAPI)
   cd risk_engine
   railway up --detach
   
   # Deploy Legacy Server (Node.js) - Optional
   cd ..
   railway up --detach
   ```

4. **Configure Environment Variables**
   
   **For Risk Engine Service:**
   ```bash
   railway variables set SUPABASE_URL=https://your-project.supabase.co
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   railway variables set SUPABASE_JWT_SECRET=your-jwt-secret
   railway variables set TIINGO_API_KEY=your-tiingo-key
   railway variables set PORT=8000
   ```
   
   **For Legacy Server Service:**
   ```bash
   railway variables set SUPABASE_URL=https://your-project.supabase.co
   railway variables set SUPABASE_ANON_KEY=your-anon-key
   railway variables set RISK_ENGINE_URL=https://your-risk-engine.railway.app
   railway variables set PORT=3000
   ```

3. **Initialize Railway Project**
   ```bash
   cd /path/to/your/project
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Option 2: Manual Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t risk-report-server .
   ```

2. **Run locally for testing**
   ```bash
   docker run -p 3001:3001 risk-report-server
   ```

3. **Push to your container registry**
   ```bash
   docker tag risk-report-server your-registry/risk-report-server
   docker push your-registry/risk-report-server
   ```

## Environment Variables

Set these in your Railway dashboard or deployment platform:

### Required
- `PORT=3001` - Server port
- `NODE_ENV=production` - Environment mode

### Optional
- `TIINGO_API_KEY` - For enhanced financial data (optional)
- `CACHE_TTL=3600` - Cache timeout in seconds
- `DEFAULT_CONFIDENCE_LEVEL=0.95` - Default VaR confidence level

## API Endpoints

Once deployed, your server will expose:

- `POST /api/run-var` - Run VaR analysis
- `GET /api/status` - Health check
- `GET /api/stress-periods` - Available stress test periods
- `GET /api/latest-charts` - Get latest generated charts
- `POST /api/calculate-risk-metrics` - Calculate portfolio risk metrics
- `POST /api/backtest-portfolio` - Portfolio backtesting

## Health Monitoring

The application includes a health check endpoint at `/api/status` that Railway will use to monitor the service health.

## Resource Requirements

- **Memory**: 512MB minimum, 1GB recommended
- **CPU**: 0.5 vCPU minimum, 1 vCPU recommended
- **Storage**: 1GB for cache and temporary files

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Python dependencies in `requirements.txt`
   - Ensure Node.js packages are properly defined in `server/package.json`

2. **Memory Issues**
   - Increase Railway memory allocation
   - Consider optimizing Monte Carlo simulation parameters

3. **Timeout Issues**
   - Check Railway timeout settings
   - Verify Python script execution times

### Debugging

Check logs in Railway dashboard or use:
```bash
railway logs
```

## Local Testing

Before deploying, test locally:

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   cd server && npm install
   ```

2. **Start server**
   ```bash
   node server/var-api.js
   ```

3. **Test API**
   ```bash
   curl http://localhost:3001/api/status
   ```

## Security Considerations

- Non-root user in Docker container
- Only necessary ports exposed
- Environment variables for sensitive data
- Health checks for monitoring

## Performance Optimization

- Docker layer caching for faster builds
- Python package pre-compilation
- Optimized .dockerignore for smaller context
- Production-only Node.js dependencies

## Monitoring

Railway provides built-in monitoring, but you can also:
- Monitor `/api/status` endpoint
- Track VaR calculation performance
- Monitor memory and CPU usage
- Set up alerts for failures

## Next Steps

1. Deploy to Railway
2. Configure custom domain (optional)
3. Set up monitoring and alerts
4. Configure CORS for your frontend domain
5. Add API rate limiting if needed

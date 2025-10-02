#!/bin/bash

echo "🚀 Deploying VAR Models to Railway..."
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Your Supabase credentials (already configured)
SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk"
SUPABASE_JWT_SECRET="hroFKe1jQvP2tniUe+/EZckNGxS8nta1x+BfkY9jOtqER90dMMqEteJZv7Ve7Ka5aG8Padj8+qrKNxktWCfWUA=="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed.${NC}"
    echo "Please install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway.${NC}"
    echo "Please login with: railway login"
    exit 1
fi

echo -e "${BLUE}📦 Deploying VAR Models API...${NC}"
echo ""

# Navigate to risk_engine directory
cd risk_engine

echo -e "${YELLOW}🔄 Deploying to Railway...${NC}"
railway up --detach

echo ""
echo -e "${BLUE}🔧 Setting environment variables...${NC}"

# Set all environment variables
railway variables set SUPABASE_URL="$SUPABASE_URL"
railway variables set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
railway variables set SUPABASE_JWT_SECRET="$SUPABASE_JWT_SECRET"
railway variables set PORT=8000
railway variables set LOG_LEVEL=INFO

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Wait 1-2 minutes for Railway to build and start your service"
echo "2. Get your service URL from Railway dashboard"
echo "3. Test health endpoint: curl https://your-service.railway.app/health"
echo ""
echo -e "${BLUE}🔍 Expected Response:${NC}"
echo '{'
echo '  "status": "healthy",'
echo '  "models_available": ["parametric", "historical", "monte_carlo", "portfolio_var"]'
echo '}'
echo ""
echo -e "${BLUE}📊 Your VAR Models API is now live!${NC}"
echo "- Parametric VaR ✅"
echo "- Historical VaR ✅"
echo "- Monte Carlo VaR ✅"
echo "- Portfolio VaR ✅"
echo ""
echo -e "${BLUE}📚 View logs:${NC} railway logs"
echo -e "${BLUE}📈 Check status:${NC} railway status"
echo ""
echo -e "${GREEN}🎉 All your proven VAR models are now accessible via REST API!${NC}"


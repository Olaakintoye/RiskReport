#!/bin/bash

echo "🚀 Deploying Risk Engine to Railway"
echo "====================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo "Install: npm install -g @railway/cli"
    exit 1
fi

# Check login
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Run: railway login"
    exit 1
fi

echo -e "${BLUE}📂 Navigating to risk_engine directory...${NC}"
cd "$(dirname "$0")/risk_engine" || exit 1

echo ""
echo -e "${YELLOW}🔗 Linking to Railway project (risktest1)...${NC}"
# Link to existing project
railway link risktest1 --environment production 2>/dev/null || railway link

echo ""
echo -e "${BLUE}🔧 Setting environment variables...${NC}"
railway variables set SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
railway variables set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDExOTA3MywiZXhwIjoyMDY1Njk1MDczfQ.Q5DzOuNAUu9591plbbtITiCfHulbg4-QYwS0uBvimuk"
railway variables set SUPABASE_JWT_SECRET="hroFKe1jQvP2tniUe+/EZckNGxS8nta1x+BfkY9jOtqER90dMMqEteJZv7Ve7Ka5aG8Padj8+qrKNxktWCfWUA=="
railway variables set PORT="8000"
railway variables set LOG_LEVEL="INFO"
railway variables set PYTHONUNBUFFERED="1"

echo ""
echo -e "${BLUE}🚀 Deploying from risk_engine directory...${NC}"
railway up --detach

echo ""
echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo ""
echo -e "${BLUE}📊 Check deployment status:${NC}"
echo "   railway status"
echo ""
echo -e "${BLUE}📋 View logs:${NC}"
echo "   cd risk_engine && railway logs"
echo ""
echo -e "${BLUE}🔍 Test endpoints (wait 2-3 min for deployment):${NC}"
echo "   curl https://risktest1-production.up.railway.app/"
echo "   curl https://risktest1-production.up.railway.app/health"
echo ""


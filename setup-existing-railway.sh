#!/bin/bash

echo "🔧 Setting up Environment Variables for Existing Railway Service..."
echo "===================================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Your Supabase credentials
SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
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

echo -e "${BLUE}🔍 Current Railway project: risktest1${NC}"
echo ""
echo -e "${YELLOW}🔧 Setting environment variables...${NC}"

# Set all environment variables
railway variables set SUPABASE_URL="$SUPABASE_URL"
railway variables set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
railway variables set SUPABASE_JWT_SECRET="$SUPABASE_JWT_SECRET"
railway variables set PORT=8000
railway variables set LOG_LEVEL=INFO

echo ""
echo -e "${GREEN}✅ Environment Variables Set!${NC}"
echo ""
echo -e "${BLUE}📋 Service will restart automatically with new variables...${NC}"
echo ""
echo -e "${BLUE}🔍 Test your service:${NC}"
echo "Get your Railway URL from dashboard, then:"
echo "curl https://risktest1-production.up.railway.app/health"
echo ""
echo -e "${GREEN}🎉 Your VAR Models API is now configured!${NC}"


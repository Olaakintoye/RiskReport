#!/bin/bash

echo "🔧 Setting up Railway Environment Variables..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Your Supabase credentials
SUPABASE_URL="https://qlyqxlzlxdqboxpxpdjp.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM"

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

echo -e "${BLUE}📋 Environment Setup Options:${NC}"
echo "1. Setup Risk Engine Environment Variables"
echo "2. Setup Legacy Server Environment Variables"
echo "3. Setup Both Services"
echo ""

read -p "Select setup option (1-3): " choice

case $choice in
    1)
        echo -e "${YELLOW}🔧 Setting up Risk Engine environment variables...${NC}"
        
        # Prompt for missing variables
        read -p "Enter your Supabase Service Role Key: " SERVICE_ROLE_KEY
        read -p "Enter your Supabase JWT Secret: " JWT_SECRET
        read -p "Enter your Tiingo API Key (optional, press Enter to skip): " TIINGO_KEY
        
        # Set Risk Engine variables
        echo "Setting Supabase URL..."
        railway variables set SUPABASE_URL="$SUPABASE_URL"
        
        echo "Setting Service Role Key..."
        railway variables set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
        
        echo "Setting JWT Secret..."
        railway variables set SUPABASE_JWT_SECRET="$JWT_SECRET"
        
        if [ ! -z "$TIINGO_KEY" ]; then
            echo "Setting Tiingo API Key..."
            railway variables set TIINGO_API_KEY="$TIINGO_KEY"
        fi
        
        echo "Setting Port..."
        railway variables set PORT=8000
        
        echo "Setting Log Level..."
        railway variables set LOG_LEVEL=INFO
        
        echo -e "${GREEN}✅ Risk Engine environment variables set!${NC}"
        ;;
        
    2)
        echo -e "${YELLOW}🔧 Setting up Legacy Server environment variables...${NC}"
        
        # Prompt for Risk Engine URL
        read -p "Enter your Risk Engine URL (e.g., https://risk-engine.railway.app): " RISK_ENGINE_URL
        
        # Set Legacy Server variables
        echo "Setting Node Environment..."
        railway variables set NODE_ENV=production
        
        echo "Setting Port..."
        railway variables set PORT=3000
        
        echo "Setting Supabase URL..."
        railway variables set SUPABASE_URL="$SUPABASE_URL"
        
        echo "Setting Supabase Anon Key..."
        railway variables set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
        
        if [ ! -z "$RISK_ENGINE_URL" ]; then
            echo "Setting Risk Engine URL..."
            railway variables set RISK_ENGINE_URL="$RISK_ENGINE_URL"
        fi
        
        echo -e "${GREEN}✅ Legacy Server environment variables set!${NC}"
        ;;
        
    3)
        echo -e "${YELLOW}🔧 Setting up both services...${NC}"
        echo -e "${RED}⚠️  Make sure you're in the correct Railway project context!${NC}"
        echo "You'll need to run this script twice - once for each service."
        echo ""
        echo "1. First, switch to your Risk Engine project: railway link"
        echo "2. Run this script and choose option 1"
        echo "3. Then switch to your Legacy Server project: railway link"
        echo "4. Run this script and choose option 2"
        ;;
        
    *)
        echo -e "${RED}❌ Invalid option selected${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}📋 Current Environment Variables:${NC}"
railway variables

echo ""
echo -e "${GREEN}🎉 Environment Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Verify all variables are set correctly above"
echo "2. Deploy your service: railway up --detach"
echo "3. Check deployment status: railway status"
echo "4. View logs: railway logs"

echo ""
echo -e "${BLUE}🔍 Test Your Deployment:${NC}"
echo "Risk Engine: curl https://your-service.railway.app/health"
echo "Legacy Server: curl https://your-service.railway.app/api/status"




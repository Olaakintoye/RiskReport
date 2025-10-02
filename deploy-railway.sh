#!/bin/bash

echo "🚀 Deploying Risk Management System to Railway..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo -e "${BLUE}📋 Deployment Options:${NC}"
echo "1. Deploy Risk Engine (Python FastAPI) - Recommended"
echo "2. Deploy Legacy Server (Node.js) - For backward compatibility"
echo "3. Deploy Both Services"
echo ""

read -p "Select deployment option (1-3): " choice

case $choice in
    1)
        echo -e "${YELLOW}🔄 Deploying Risk Engine (Python FastAPI)...${NC}"
        
        # Create new Railway project for Risk Engine if it doesn't exist
        echo "Creating/connecting to Risk Engine project..."
        
        # Deploy Risk Engine
        cd risk_engine
        
        # Check if railway.json exists, if not create it
        if [ ! -f "railway.json" ]; then
            cp ../railway-risk-engine.json railway.json
        fi
        
        railway up --detach
        
        echo -e "${GREEN}✅ Risk Engine deployment initiated!${NC}"
        echo -e "${BLUE}🌐 Check your Railway dashboard for deployment status${NC}"
        echo ""
        echo -e "${BLUE}🔍 Risk Engine API Endpoints:${NC}"
        echo "  - Health: GET /health"
        echo "  - Calculate VaR: POST /calc/run"
        echo "  - Stress Test: POST /calc/stress-test"
        echo "  - Portfolio Data: GET /portfolios/{id}"
        echo "  - Job Status: GET /jobs/{id}"
        ;;
        
    2)
        echo -e "${YELLOW}🔄 Deploying Legacy Server (Node.js)...${NC}"
        
        # Deploy Legacy Server
        railway up --detach
        
        echo -e "${GREEN}✅ Legacy Server deployment initiated!${NC}"
        echo -e "${BLUE}🌐 Check your Railway dashboard for deployment status${NC}"
        echo ""
        echo -e "${BLUE}🔍 Legacy API Endpoints:${NC}"
        echo "  - Health: GET /api/status"
        echo "  - VaR Analysis: POST /api/run-var"
        echo "  - Stress Test: POST /api/stress-test/run"
        echo "  - Charts: GET /api/latest-charts"
        ;;
        
    3)
        echo -e "${YELLOW}🔄 Deploying Both Services...${NC}"
        
        # Deploy Risk Engine first
        echo "Deploying Risk Engine..."
        cd risk_engine
        
        if [ ! -f "railway.json" ]; then
            cp ../railway-risk-engine.json railway.json
        fi
        
        railway up --detach
        cd ..
        
        # Wait a moment
        sleep 2
        
        # Deploy Legacy Server
        echo "Deploying Legacy Server..."
        railway up --detach
        
        echo -e "${GREEN}✅ Both services deployment initiated!${NC}"
        echo -e "${BLUE}🌐 Check your Railway dashboard for deployment status${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ Invalid option selected${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Configure environment variables in Railway dashboard"
echo "2. Set up Supabase database (run migrations)"
echo "3. Update frontend environment variables"
echo "4. Test API endpoints"
echo ""
echo -e "${YELLOW}⚠️  Required Environment Variables:${NC}"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_ROLE_KEY (Risk Engine)"
echo "  - SUPABASE_ANON_KEY (Legacy Server)"
echo "  - SUPABASE_JWT_SECRET"
echo "  - TIINGO_API_KEY (optional)"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  - Deployment Guide: ./DEPLOYMENT.md"
echo "  - Security Setup: ./SECURITY_SETUP.md"
echo "  - Implementation Summary: ./MASS_DEPLOYMENT_IMPLEMENTATION.md"

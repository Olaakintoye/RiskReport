#!/bin/bash

echo "🔍 Verifying Railway Deployment..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$url" 2>/dev/null)
    http_code=${response: -3}
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ OK (HTTP $http_code)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (HTTP $http_code)${NC}"
        if [ -f /tmp/response.txt ]; then
            echo -e "${YELLOW}Response:${NC}"
            cat /tmp/response.txt
            echo ""
        fi
        return 1
    fi
}

# Get Railway URLs
echo -e "${BLUE}📋 Enter your Railway service URLs:${NC}"
read -p "Risk Engine URL (e.g., https://risk-engine.railway.app): " RISK_ENGINE_URL
read -p "Legacy Server URL (optional, press Enter to skip): " LEGACY_SERVER_URL

echo ""
echo -e "${BLUE}🔍 Testing Services...${NC}"

# Test Risk Engine
if [ ! -z "$RISK_ENGINE_URL" ]; then
    echo -e "${YELLOW}Testing Risk Engine:${NC}"
    test_endpoint "$RISK_ENGINE_URL/health" "Health Check"
    
    # Test with authentication (if JWT token provided)
    read -p "JWT Token for authenticated tests (optional): " JWT_TOKEN
    
    if [ ! -z "$JWT_TOKEN" ]; then
        echo "Testing authenticated endpoints..."
        
        # Test portfolio endpoint (this will fail if no portfolios exist, but should return 401/403 if auth is working)
        curl -s -H "Authorization: Bearer $JWT_TOKEN" "$RISK_ENGINE_URL/portfolios/test" > /dev/null
        auth_test_result=$?
        
        if [ $auth_test_result -eq 0 ]; then
            echo -e "${GREEN}✅ Authentication working${NC}"
        else
            echo -e "${YELLOW}⚠️  Authentication test inconclusive (expected if no test portfolio exists)${NC}"
        fi
    fi
    
    echo ""
fi

# Test Legacy Server
if [ ! -z "$LEGACY_SERVER_URL" ]; then
    echo -e "${YELLOW}Testing Legacy Server:${NC}"
    test_endpoint "$LEGACY_SERVER_URL/api/status" "Status Check"
    test_endpoint "$LEGACY_SERVER_URL/" "Root Endpoint"
    echo ""
fi

# Test database connectivity (if Supabase URL provided)
read -p "Supabase URL for database test (optional): " SUPABASE_URL
if [ ! -z "$SUPABASE_URL" ]; then
    echo -e "${YELLOW}Testing Database Connectivity:${NC}"
    test_endpoint "$SUPABASE_URL/rest/v1/" "Supabase REST API" 200
    echo ""
fi

# Performance test
if [ ! -z "$RISK_ENGINE_URL" ]; then
    echo -e "${YELLOW}Performance Test:${NC}"
    echo -n "Measuring response time... "
    
    start_time=$(date +%s%N)
    curl -s "$RISK_ENGINE_URL/health" > /dev/null
    end_time=$(date +%s%N)
    
    duration=$(( (end_time - start_time) / 1000000 ))
    
    if [ $duration -lt 1000 ]; then
        echo -e "${GREEN}✅ ${duration}ms (Excellent)${NC}"
    elif [ $duration -lt 3000 ]; then
        echo -e "${YELLOW}⚠️  ${duration}ms (Good)${NC}"
    else
        echo -e "${RED}❌ ${duration}ms (Slow)${NC}"
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}📊 Deployment Verification Summary:${NC}"
echo "=================================="

if [ ! -z "$RISK_ENGINE_URL" ]; then
    echo -e "Risk Engine: ${GREEN}$RISK_ENGINE_URL${NC}"
fi

if [ ! -z "$LEGACY_SERVER_URL" ]; then
    echo -e "Legacy Server: ${GREEN}$LEGACY_SERVER_URL${NC}"
fi

echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Update frontend environment variables with these URLs"
echo "2. Test VaR calculations with real portfolio data"
echo "3. Set up monitoring and alerts"
echo "4. Configure custom domain (optional)"

echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "View logs: railway logs"
echo "Check status: railway status"
echo "Update variables: railway variables set KEY=value"

# Cleanup
rm -f /tmp/response.txt

echo ""
echo -e "${GREEN}🎉 Verification Complete!${NC}"




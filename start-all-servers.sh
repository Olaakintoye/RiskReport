#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting all Risk Report servers...${NC}\n"

# Function to check if a port is in use
check_port() {
    local port=$1
    local process_name=$2
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use by $process_name${NC}"
        return 0
    else
        return 1
    fi
}

# Function to start a server
start_server() {
    local name=$1
    local dir=$2
    local command=$3
    local port=$4
    local process_name=$5
    
    echo -e "${BLUE}Starting $name...${NC}"
    
    if check_port $port "$process_name"; then
        echo -e "${GREEN}✅ $name is already running on port $port${NC}\n"
        return 0
    fi
    
    cd "$dir"
    eval "$command" &
    local pid=$!
    echo "Started $name with PID: $pid"
    
    # Wait a moment for server to start
    sleep 3
    
    # Check if the server is actually running
    if check_port $port "$process_name"; then
        echo -e "${GREEN}✅ $name started successfully on port $port${NC}\n"
    else
        echo -e "${RED}❌ Failed to start $name on port $port${NC}\n"
    fi
}

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Start VaR API Server (port 3001)
start_server "VaR API Server" "$SCRIPT_DIR/server" "node var-api.js" 3001 "VaR API"

# Start Main App Server (port 3000)
start_server "Main App Server" "$SCRIPT_DIR/server" "npm start" 3000 "Main App"

# Start Frontend Client (port varies - usually 19006 for Expo)
echo -e "${BLUE}Starting Frontend Client...${NC}"
cd "$SCRIPT_DIR/client"
npm start &
echo -e "${GREEN}✅ Frontend client starting...${NC}"
echo -e "${YELLOW}Note: Frontend will start on a port assigned by Expo (usually 19006)${NC}\n"

echo -e "${GREEN}🎉 All servers started!${NC}\n"

echo -e "${BLUE}Server Status:${NC}"
echo "• VaR API Server: http://localhost:3001"
echo "• Main App Server: http://localhost:3000"
echo "• Frontend Client: Check Expo output for the actual port"
echo ""

echo -e "${BLUE}To test VaR analysis:${NC}"
echo "node test-var-analysis.js"
echo ""

echo -e "${BLUE}To stop all servers:${NC}"
echo "./stop-all-servers.sh"
echo ""

echo -e "${YELLOW}Note: Servers are running in the background. Check terminal output for any errors.${NC}"
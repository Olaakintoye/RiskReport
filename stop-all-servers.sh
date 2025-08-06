#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping all Risk Report servers...${NC}\n"

# Function to stop processes on a port
stop_port() {
    local port=$1
    local name=$2
    
    echo -e "${BLUE}Stopping $name on port $port...${NC}"
    
    # Find processes using the port
    local pids=$(lsof -ti :$port)
    
    if [ -z "$pids" ]; then
        echo -e "${YELLOW}No processes found on port $port${NC}"
        return 0
    fi
    
    # Kill the processes
    for pid in $pids; do
        echo "Killing PID: $pid"
        kill $pid 2>/dev/null
        
        # Wait a moment and check if process is still running
        sleep 2
        if kill -0 $pid 2>/dev/null; then
            echo "Process $pid didn't stop gracefully, force killing..."
            kill -9 $pid 2>/dev/null
        fi
    done
    
    # Verify the port is free
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to stop all processes on port $port${NC}"
    else
        echo -e "${GREEN}✅ Successfully stopped $name${NC}"
    fi
    
    echo ""
}

# Stop servers
stop_port 3001 "VaR API Server"
stop_port 3000 "Main App Server"

# Stop any remaining node processes related to the project
echo -e "${BLUE}Stopping any remaining project-related processes...${NC}"

# Get the script directory to identify project processes
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Find and kill any node processes running from this project directory
pkill -f "$SCRIPT_DIR" 2>/dev/null || true

# Also stop any Expo/Metro processes
pkill -f "expo" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true

echo -e "${GREEN}🎉 All servers stopped!${NC}\n"

echo -e "${BLUE}Verification - Checking for remaining processes:${NC}"
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${RED}⚠️  Port 3000 still in use${NC}"
    lsof -i :3000
else
    echo -e "${GREEN}✅ Port 3000 is free${NC}"
fi

if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${RED}⚠️  Port 3001 still in use${NC}"
    lsof -i :3001
else
    echo -e "${GREEN}✅ Port 3001 is free${NC}"
fi

echo ""
echo -e "${BLUE}To start servers again:${NC}"
echo "./start-all-servers.sh"
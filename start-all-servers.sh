#!/bin/bash

echo "🚀 Starting All Risk Analysis Servers..."
echo "========================================"

# Function to check if server is running
check_server() {
    local port=$1
    local name=$2
    if lsof -i :$port >/dev/null 2>&1; then
        echo "✅ $name is already running on port $port"
        return 0
    else
        echo "❌ $name is not running on port $port"
        return 1
    fi
}

# Function to kill existing servers
kill_servers() {
    echo "🧹 Cleaning up existing servers..."
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "node.*var-api.js" 2>/dev/null || true
    sleep 2
}

# Kill any existing servers first
kill_servers

echo ""
echo "🔄 Starting Backend Servers..."

# Start VaR Analysis Server (Port 3001)
echo "Starting VaR Analysis Server on port 3001..."

./start-backend.sh &
sleep 3

# Start Stress Test Server (Port 3000)
echo "Starting Stress Test Server on port 3000..."
cd server && node server.js &
STRESS_SERVER_PID=$!
cd ..
sleep 3

echo ""
echo "🧪 Checking Server Status..."

# Check both servers
if check_server 3001 "VaR Analysis Server" && check_server 3000 "Stress Test Server"; then
    echo ""
    echo "🎉 ALL SERVERS STARTED SUCCESSFULLY!"
    echo "=================================="
    echo "✅ VaR Analysis API: http://localhost:3001/api/"
    echo "✅ Stress Test API: http://localhost:3000/api/"
    echo ""
    echo "📱 Your React Native app should now work without network errors!"
    echo ""
    echo "🔧 Available APIs:"
    echo "  - Parametric VaR: POST http://localhost:3001/api/run-var"
    echo "  - Historical VaR: POST http://localhost:3001/api/run-var"
    echo "  - Monte Carlo VaR: POST http://localhost:3001/api/run-var"
    echo "  - Stress Testing: POST http://localhost:3000/api/stress-test/run"
    echo ""
    echo "💡 To stop all servers: pkill -f 'node.*server'"
else
    echo ""
    echo "❌ SOME SERVERS FAILED TO START"
    echo "Please check the logs above for errors"
    exit 1
fi
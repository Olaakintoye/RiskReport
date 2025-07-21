#!/bin/bash

# Function to check if server is running
check_server() {
    if lsof -i :3001 >/dev/null 2>&1; then
        echo "✅ Backend server is already running on port 3001"
        return 0
    else
        echo "❌ Backend server is not running on port 3001"
        return 1
    fi
}

# Function to start server
start_server() {
    echo "🚀 Starting backend server with portfolio data support..."
    cd server && node var-api.js &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 3
    
    if check_server; then
        echo "✅ Backend server started successfully!"
        echo "💡 Server PID: $SERVER_PID"
        echo "🌐 API available at: http://192.168.1.106:3001/api/"
        echo "📊 Portfolio VaR analysis now supported!"
    else
        echo "❌ Failed to start backend server"
        exit 1
    fi
}

# Main logic
echo "🔍 Checking backend server status..."

if check_server; then
    echo "✨ No action needed - server is already running"
else
    start_server
fi

echo ""
echo "📋 Server status:"
echo "   - Local API: http://localhost:3001/api/"
echo "   - Network API: http://192.168.1.106:3001/api/"
echo "   - Health check: curl http://192.168.1.106:3001/api/charts"
echo "   - Portfolio VaR: Supported ✅" 
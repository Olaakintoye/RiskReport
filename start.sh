#!/bin/bash

# Start the server in the background
echo "Starting VaR calculation server with portfolio data support..."
cd server && node var-api.js &
SERVER_PID=$!

# Wait for the server to start
sleep 3

# Start the mobile app
echo "Starting React Native app..."
cd client && npm start

# When the mobile app is stopped, stop the server too
kill $SERVER_PID 
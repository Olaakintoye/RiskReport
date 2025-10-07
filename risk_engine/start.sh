#!/bin/bash
# Start script for Railway deployment
# Properly handles PORT environment variable

# Set default port if not provided
PORT=${PORT:-8000}

echo "Starting uvicorn on port $PORT..."
exec uvicorn app_wrapper:app --host 0.0.0.0 --port "$PORT"


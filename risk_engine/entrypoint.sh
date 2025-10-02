#!/bin/bash
# Entrypoint script for Railway deployment
# Uses PORT environment variable if set, otherwise defaults to 8000

PORT=${PORT:-8000}
echo "Starting VAR API on port $PORT"
exec uvicorn app_wrapper:app --host 0.0.0.0 --port "$PORT"


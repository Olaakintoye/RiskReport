# VAR Calculation API Dockerfile
# Wraps proven VAR models with modern infrastructure
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY risk_engine/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and VAR models from risk_engine directory
COPY risk_engine/ .

# Ensure var_models directory exists with all Python files
RUN mkdir -p var_models

# Copy and set executable permission for start script
COPY risk_engine/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Health check - Railway will check when the port is ready
# No need for explicit healthcheck as Railway detects when port is listening

# Run uvicorn via start script - properly handles PORT environment variable
CMD ["/app/start.sh"]

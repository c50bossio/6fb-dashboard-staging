#!/bin/bash

# Start script for Render deployment
echo "Starting 6FB AI Agent System Backend..."
echo "PORT: $PORT"
echo "Environment: $ENVIRONMENT"

# Install dependencies if needed
if [ ! -d ".venv" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Start the FastAPI server
echo "Starting FastAPI server on port $PORT"
exec uvicorn fastapi-server:app --host 0.0.0.0 --port $PORT
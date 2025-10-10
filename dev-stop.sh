#!/bin/bash
# Stop development servers

echo "🛑 Stopping development servers..."

# Kill Next.js frontend
pkill -f "next dev"

# Kill FastAPI backend
pkill -f "fastapi_backend"
pkill -f "uvicorn"

# Kill any node processes on port 9999
lsof -ti:9999 | xargs kill -9 2>/dev/null

# Kill any python processes on port 8001
lsof -ti:8001 | xargs kill -9 2>/dev/null

echo "✅ All development servers stopped"

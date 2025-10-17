#!/bin/bash
echo "🚀 Starting Customer Management System..."

# Start Redis if not running
if ! redis-cli ping >/dev/null 2>&1; then
    echo "Starting Redis..."
    redis-server --daemonize yes
fi

# Start FastAPI backend
echo "Starting FastAPI backend..."
uvicorn fastapi_backend:app --host 0.0.0.0 --port 8001 --reload &
FASTAPI_PID=$!

# Start Next.js frontend
echo "Starting Next.js frontend..."
npm run dev &
NEXTJS_PID=$!

echo "✅ Services started!"
echo "FastAPI: http://localhost:8001"
echo "Next.js: http://localhost:3000"
echo "API Docs: http://localhost:8001/docs"

# Wait for interrupt
trap "echo 'Stopping services...'; kill $FASTAPI_PID $NEXTJS_PID; exit" INT
wait

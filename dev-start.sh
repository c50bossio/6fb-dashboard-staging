#!/bin/bash
# Simple Development Startup Script (No Docker)
# Starts Next.js frontend and FastAPI backend

echo "🚀 Starting 6FB AI Agent System (Simple Mode)"
echo "============================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
    echo ""
fi

# Check if Python dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "🐍 Installing Python dependencies..."
    pip3 install -r requirements.txt
    echo ""
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "   Copy .env.example to .env.local and configure it"
    echo ""
fi

echo "✅ Starting services..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    pkill -f "next dev"
    pkill -f "fastapi_backend.py"
    exit 0
}

# Trap CTRL+C and cleanup
trap cleanup INT TERM

# Start Next.js frontend on port 9999 in background
echo "🌐 Starting Next.js frontend on http://localhost:9999"
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 2

# Start FastAPI backend on port 8001 in background
echo "⚡ Starting FastAPI backend on http://localhost:8001"
python3 fastapi_backend.py > /dev/null 2>&1 &
BACKEND_PID=$!

echo ""
echo "✨ Development servers running!"
echo ""
echo "   Frontend: http://localhost:9999"
echo "   Backend:  http://localhost:8001/docs"
echo ""
echo "Press CTRL+C to stop both services"
echo ""

# Wait for processes
wait $FRONTEND_PID $BACKEND_PID

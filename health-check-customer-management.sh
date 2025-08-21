#!/bin/bash
echo "🔍 Customer Management System Health Check"
echo "=========================================="

# Check database tables
echo "📊 Database Status:"
if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "✅ Supabase URL configured"
else
    echo "❌ Supabase URL not configured"
fi

# Check Redis
echo "🗄️  Redis Status:"
if redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running"
fi

# Check API endpoints (when running)
echo "🌐 API Status:"
if curl -f -s http://localhost:8001/health >/dev/null 2>&1; then
    echo "✅ FastAPI backend is running"
else
    echo "❌ FastAPI backend is not running"
fi

if curl -f -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Next.js frontend is running"
else
    echo "❌ Next.js frontend is not running"
fi

# Check components
echo "🎨 Components Status:"
COMPONENT_COUNT=$(find components/customers -name "*.js" 2>/dev/null | wc -l)
echo "Customer components: $COMPONENT_COUNT found"

API_COUNT=$(find app/api/customers -name "route.js" 2>/dev/null | wc -l)
echo "API routes: $API_COUNT found"

echo ""
echo "Health check complete!"

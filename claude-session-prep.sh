#!/bin/bash
# Claude Code Session Preparation Script
# Optimizes context for efficient development sessions

echo "🚀 Preparing Claude Code session..."

# 1. Clean git status (biggest context saver)
echo "📦 Cleaning git status..."
git add .
git commit -m "WIP: Claude Code session prep - $(date)"

# 2. Show current context size
echo "📊 Current repository context:"
echo "Modified files: $(git status --porcelain | wc -l)"
echo "Total files: $(find . -type f -name "*.js" -o -name "*.py" -o -name "*.md" | wc -l)"

# 3. Focus areas menu
echo ""
echo "🎯 Choose your session focus:"
echo "1. Frontend (Next.js, components, UI)"
echo "2. Backend (FastAPI, APIs, services)"  
echo "3. Database (Supabase, schemas, queries)"
echo "4. Authentication (OAuth, sessions)"
echo "5. Deployment (Docker, production)"
echo ""

# 4. Quick health check
echo "🔍 System health check:"
echo "Docker running: $(docker info >/dev/null 2>&1 && echo "✅" || echo "❌")"
echo "Services status:"
curl -s http://localhost:9999/api/health >/dev/null && echo "  Frontend: ✅" || echo "  Frontend: ❌"
curl -s http://localhost:8001/health >/dev/null && echo "  Backend: ✅" || echo "  Backend: ❌"

echo ""
echo "💡 Session Tips:"
echo "• Use specific file paths: '/app/api/auth/callback/route.js'"
echo "• Focus on ONE area per conversation"
echo "• Run 'node test-supabase-access.js' to test database"
echo "• Check 'CLAUDE.md' for quick reference"
echo ""
echo "Ready for Claude Code! 🎉"
# CLAUDE.md - BookedBarber AI System

Enterprise barbershop platform: Next.js 14 (port 9999) + FastAPI (port 8001) + Supabase PostgreSQL.

## 🚨 Core Rules
1. **NO MOCK DATA** - Always use real Supabase database
2. **FULL-STACK ONLY** - Complete features: DB schema → API → UI → tests
3. **TEST FIRST** - `node test-supabase-access.js` before development

## Quick Start
```bash
./docker-dev-start.sh              # Start dev environment
node test-supabase-access.js       # Test DB connection
npm run health                     # API health check
docker compose down                # Stop everything
```

## Essential Commands
```bash
npm run test:all                # Full test suite
npm run cleanup-test-data       # Clean test data
docker compose logs -f frontend # View logs
curl http://localhost:9999/api/health # Health check
```

## Key Files
- `fastapi_backend.py` - Main backend server
- `app/layout.js` - Root layout with providers
- `middleware.js` - Security & route protection
- `lib/supabase-query.js` - Database operations
- `lib/ai-orchestrator-enhanced.js` - AI model routing

## Required Env Vars
```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
PUSHER_APP_ID=
```

## Development Checklist
- [ ] Database schema with RLS policies
- [ ] Backend API endpoint 
- [ ] Frontend UI with error handling
- [ ] Tests written and passing
- [ ] Real data (no mocks)

## 🚀 Context Optimization

### Be Specific (Use exact file paths)
```bash
# ❌ "analyze the codebase"
# ✅ "check /app/api/auth/callback/route.js for OAuth issues"

# ❌ "review all components"  
# ✅ "examine /components/dashboard/UnifiedDashboard.js"
```

### Session Focus (Pick ONE per conversation)
1. **Frontend**: Next.js components, pages, UI
2. **Backend**: FastAPI endpoints, AI services  
3. **Database**: Supabase schemas, queries
4. **Authentication**: OAuth, sessions, middleware
5. **Deployment**: Docker, Vercel, production

### Git Context Management
```bash
# Clean git status (reduces context by 80%)
git add . && git commit -m "WIP: checkpoint"
```

---
**Production system**: Test all changes, no shortcuts, real data only.
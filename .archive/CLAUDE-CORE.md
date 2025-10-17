# CLAUDE-CORE.md

**Enterprise barbershop platform**: Next.js 14 (port 9999) + FastAPI (port 8001) + Supabase PostgreSQL.

## Core Rules
1. **NO MOCK DATA** - Always use real Supabase database
2. **FULL-STACK ONLY** - Complete features: DB schema → API → UI → tests
3. **MEMORY CRITICAL** - FastAPI has memory-managed OAuth system to prevent crashes

## Essential Commands
```bash
# Quick Start
./docker-dev-start.sh              # Start dev environment
npm run claude:health              # Test all connections
npm run dev                        # Next.js (port 9999)
python fastapi_backend.py          # API (port 8001)

# Essential Testing (Run before committing)
npm run test:all                   # Full test suite
npm run lint                       # ESLint check
npm run build                      # Production build + TypeScript check
```

## Key Architecture
```
app/api/           # Next.js API routes
components/ui/     # Base UI components  
lib/supabase-query.js     # Database operations
services/memory_manager.py # Critical OAuth management
routers/           # FastAPI feature routers
```

## Core Database Tables
- `profiles`, `barbershops`, `barbershop_staff`
- `customers`, `services`, `appointments`, `transactions`

## Subscription Model & Shop Assignment

### Two Subscription Types:
1. **Individual Barber Subscription**
   - Barber subscribes directly (solo practitioner)
   - Has `shop_id` directly in their `profiles` record
   - They ARE the barbershop

2. **Barbershop Subscription**  
   - Barbershop owner has the subscription
   - Owner has `shop_id` in their profile
   - Employee barbers linked via `barbershop_staff` table
   - Employees get shop access through `barbershop_staff` lookup

### Shop ID Resolution Logic:
1. Check `profiles.shop_id` first (individual barbers)
2. If null, check `barbershop_staff` table (employees)
3. Fallback to default shop for demos/testing

**CRITICAL**: Never assume all users have `shop_id` - always check both paths!

## Required Environment
```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

## Development Rules
- **ALWAYS** run tests before committing
- **NEVER** use mock data - integrate with real Supabase
- **MEMORY**: Be aware of OAuth memory management in FastAPI

---
**Full details**: See `CLAUDE-WORKFLOWS.md` and `CLAUDE-REFERENCE.md`
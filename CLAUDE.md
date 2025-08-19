# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference (Context Optimized)

**📖 For essential development info**: See [`CLAUDE-CORE.md`](./CLAUDE-CORE.md)  
**⚡ For development workflows**: See [`CLAUDE-WORKFLOWS.md`](./CLAUDE-WORKFLOWS.md)  
**🔧 For detailed commands & troubleshooting**: See [`CLAUDE-REFERENCE.md`](./CLAUDE-REFERENCE.md)  
**📚 For complete documentation index**: See [`docs/INDEX.md`](./docs/INDEX.md)

## Context Window Optimized Summary

**Enterprise barbershop platform**: Next.js 14 + FastAPI + Supabase PostgreSQL.

### Core Rules
1. **NO MOCK DATA** - Always use real Supabase database
2. **FULL-STACK ONLY** - Complete features: DB schema → API → UI → tests  
3. **MEMORY CRITICAL** - FastAPI has memory-managed OAuth system (`services/memory_manager.py`)
4. **100% FEATURE COMPLETION** - See "Definition of Done" below

### Essential Commands
```bash
# Quick Start
./docker-dev-start.sh        # Start everything (Redis, FastAPI, Next.js)
npm run claude:health        # Test all connections before starting work
npm run dev                  # Next.js (port 9999)
python fastapi_backend.py    # FastAPI (port 8001)

# Before Committing (MANDATORY)
npm run lint                # Check code quality
npm run build               # Verify production build + TypeScript
npm run test:all            # Run full test suite
```

### Key Files & Architecture
```
lib/supabase-query.js       # Database operations layer
services/memory_manager.py  # Critical OAuth management (prevents production crashes)
routers/                    # FastAPI feature modules (ai.py, auth.py, dashboard.py)
components/ui/              # Base UI components (use these, don't recreate)
middleware.js               # Security headers, auth bypass, admin protection
app/api/                    # Next.js API routes
```

### Environment Variables (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=           # For Claude integration
GOOGLE_AI_API_KEY=           # For Gemini integration
```

## 🎯 DEFINITION OF DONE - MANDATORY FOR ALL FEATURES

**EVERY feature must be 100% complete before considering it "done". This means:**

### Backend Requirements ✅
- [ ] Database schema created/updated with proper indexes and RLS policies
- [ ] API endpoints fully implemented with error handling
- [ ] Authentication & authorization properly configured
- [ ] Data validation on all inputs
- [ ] Proper error responses with meaningful messages
- [ ] Rate limiting where appropriate
- [ ] Webhook handlers if real-time updates needed

### Frontend Requirements ✅
- [ ] UI component created and styled (use existing `components/ui/`)
- [ ] Connected to API endpoints (not mocked)
- [ ] Loading states implemented
- [ ] Error states with user-friendly messages
- [ ] Success feedback to user
- [ ] Form validation with helpful error messages
- [ ] Responsive design for mobile/tablet/desktop
- [ ] Accessibility features (ARIA labels, keyboard nav)

### Integration Requirements ✅
- [ ] Frontend ↔ Backend fully connected
- [ ] Real-time updates via webhooks/subscriptions where needed
- [ ] Proper state management (context/store)
- [ ] Cache invalidation after mutations
- [ ] Optimistic updates where appropriate
- [ ] Retry logic for failed requests

### Data Flow Requirements ✅
- [ ] User action → API call → Database update → UI update (complete chain)
- [ ] Error handling at every step
- [ ] Rollback mechanisms for failed operations
- [ ] Audit logging for important actions

### Testing & Verification ✅
- [ ] Manual testing of happy path
- [ ] Manual testing of error cases
- [ ] Console free of errors
- [ ] Network tab shows successful API calls
- [ ] Database shows correct data
- [ ] Feature works end-to-end without manual intervention
- [ ] Run `npm run lint && npm run build` - MUST PASS
- [ ] Run `npm run test:all` - MUST PASS

## ⚠️ INCOMPLETE FEATURE EXAMPLES TO AVOID:

❌ **DON'T**: Create an API endpoint without the UI to use it
❌ **DON'T**: Build a form that doesn't actually submit data
❌ **DON'T**: Make a component that needs manual wiring
❌ **DON'T**: Implement auth checks in frontend only
❌ **DON'T**: Create webhooks without handlers
❌ **DON'T**: Build features that need "TODO: connect this later"
❌ **DON'T**: Leave console.log debugging statements
❌ **DON'T**: Skip error handling "for now"

## ✅ COMPLETE FEATURE EXAMPLES:

✅ **DO**: User clicks button → API called → Database updated → UI reflects change → User sees confirmation
✅ **DO**: Form validates → Submits → Handles errors → Shows success → Updates related data → Clears form
✅ **DO**: Webhook received → Data processed → Database updated → UI subscribers notified → Changes visible immediately

## 🔄 FEATURE IMPLEMENTATION WORKFLOW:

1. **Plan** - List ALL components needed (DB, API, UI, connections)
2. **Database** - Create tables, indexes, RLS policies in Supabase
3. **Backend** - Build API endpoints with full CRUD + error handling
4. **Frontend** - Create UI components with all states
5. **Connect** - Wire everything together
6. **Test** - Verify end-to-end functionality (`npm run test:all`)
7. **Polish** - Add loading states, error handling, feedback
8. **Verify** - Test all edge cases and run quality checks (`npm run lint && npm run build`)

## 🏗️ High-Level Architecture

### Multi-Tier System
- **Frontend**: Next.js 14 App Router (port 9999) with Tailwind CSS
- **Backend**: FastAPI (port 8001) with modular routers, fallback to simple HTTP server
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Caching**: Redis for AI responses (60-70% cost reduction)
- **Real-time**: Pusher WebSocket for live updates

### AI System Architecture
- **Multi-Model Support**: OpenAI GPT-5, Anthropic Claude Opus 4.1, Google Gemini 2.0
- **Agent Framework**: Master coach + specialist agents (financial, operations, brand, growth)
- **Memory System**: Persistent context across sessions with memory-managed OAuth
- **Caching Layer**: Redis-backed response caching for cost optimization

### Authentication Flow
- **Multi-Provider**: Google OAuth, email/password with MFA
- **Session Management**: Memory-optimized OAuth callbacks (prevents production crashes)
- **Role Hierarchy**: CLIENT → BARBER → SHOP_OWNER → ENTERPRISE_OWNER → SUPER_ADMIN
- **Middleware Protection**: `middleware.js` handles auth bypass and admin routes

### Data Flow Pattern
```
User Action → Next.js API Route → Supabase RLS → Database → Real-time Updates → UI Refresh
                     ↓
              FastAPI Router → AI Service → Redis Cache → Response
```

### Critical Production Considerations
- **Memory Management**: OAuth system specifically designed to handle memory pressure
- **Error Recovery**: Fallback mechanisms at every layer
- **Performance**: Bundle optimization, lazy loading, Redis caching
- **Security**: CSP headers, rate limiting, input validation, audit logging
- **Monitoring**: Sentry error tracking with memory monitoring

## 🛡️ SUPABASE DATABASE BEST PRACTICES - MANDATORY

**All database operations MUST follow these production-grade practices:**

### Row Level Security (RLS) - CRITICAL
```sql
-- 🚨 ALWAYS enable RLS on every table in public schema
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- ✅ Proper policy structure with role targeting
CREATE POLICY "policy_name" ON table_name
  FOR SELECT                    -- Specify operation type
  TO authenticated             -- Always specify role (never omit)
  USING ((SELECT auth.uid()) = user_id);  -- Wrap functions in SELECT

-- ❌ NEVER create policies without role targeting
-- ❌ NEVER use auth.uid() without SELECT wrapper
```

### Database Schema Design
```sql
-- ✅ Always include audit fields
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Your fields here
);

-- ✅ Create indexes for RLS policy columns
CREATE INDEX idx_table_user_id ON table_name(user_id);

-- ✅ Create update trigger for updated_at
CREATE TRIGGER set_updated_at 
  BEFORE UPDATE ON table_name 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Performance Optimization Rules
1. **Index RLS Policy Columns**: Always add indexes on columns used in RLS policies
2. **Wrap Functions in SELECT**: Use `(SELECT auth.uid())` not `auth.uid()`
3. **Add Explicit Filters**: Include `.eq('user_id', userId)` in queries even with RLS
4. **Use Security Definer Functions**: For complex queries crossing multiple tables
5. **Minimize Joins in RLS**: Rewrite policies to avoid table joins when possible

### Security Definer Functions (For Complex RLS)
```sql
-- ✅ Create in private schema (never exposed to API)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.user_has_role(target_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER  -- Bypasses RLS on lookup tables
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = target_role
  );
$$;

-- ✅ Use in RLS policies
CREATE POLICY "admin_only" ON sensitive_table
  TO authenticated
  USING ((SELECT private.user_has_role('admin')));
```

### Query Performance Patterns
```sql
-- ✅ Efficient policy (fetches user's teams once)
CREATE POLICY "team_access" ON documents
  TO authenticated  
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ❌ Inefficient policy (joins on each row)
CREATE POLICY "team_access_slow" ON documents  
  TO authenticated
  USING (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM team_members 
      WHERE team_id = documents.team_id  -- BAD: row-by-row join
    )
  );
```

### Database Testing Requirements
```sql
-- ✅ Every RLS policy MUST have pgTAP tests
BEGIN;
SELECT plan(3);

-- Test user can only see own data
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"user-uuid","role":"authenticated"}';

SELECT results_eq(
  'SELECT count(*) FROM table_name',
  ARRAY[2::bigint],
  'User sees only their records'
);

SELECT * FROM finish();
ROLLBACK;
```

### Monitoring & Observability
```sql
-- ✅ Enable query performance monitoring
-- Check slow queries regularly
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements 
WHERE total_time > 1000
ORDER BY total_time DESC;

-- ✅ Monitor cache hit rates (should be >99%)
SELECT 'table hit rate' as name,
  sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as ratio
FROM pg_statio_user_tables;
```

### Data Validation & Constraints
```sql
-- ✅ Always use proper constraints
CREATE TABLE users (
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ✅ Use domains for reusable constraints
CREATE DOMAIN email_type AS TEXT
  CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

### Migration Safety
```sql
-- ✅ Safe migrations pattern
BEGIN;
  -- Create new column as nullable first
  ALTER TABLE table_name ADD COLUMN new_field TEXT;
  
  -- Backfill data in batches
  UPDATE table_name SET new_field = 'default_value' WHERE new_field IS NULL;
  
  -- Add NOT NULL constraint after backfill
  ALTER TABLE table_name ALTER COLUMN new_field SET NOT NULL;
COMMIT;

-- ❌ NEVER drop columns in same migration as adding them
-- ❌ NEVER add NOT NULL columns without default values
```

### Supabase-Specific Patterns
```sql
-- ✅ Leverage auth.users properly
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  -- Never duplicate auth.users data here
  display_name TEXT,
  avatar_url TEXT
);

-- ✅ Use Supabase helper functions
SELECT auth.uid();           -- Current user ID
SELECT auth.jwt();           -- Full JWT claims  
SELECT auth.email();         -- Current user email

-- ✅ Proper real-time setup
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
```

### Error Handling & Logging
```sql
-- ✅ Use structured error handling
CREATE OR REPLACE FUNCTION safe_operation()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Operation logic here
  
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error details
    RAISE LOG 'Operation failed: % %', SQLERRM, SQLSTATE;
    -- Re-raise with user-friendly message
    RAISE EXCEPTION 'Operation failed. Please try again.';
END;
$$;

## 📝 Common Development Tasks

### Adding a New Feature
1. Check existing patterns in similar features
2. Use `lib/supabase-query.js` for database operations
3. Add router to `routers/` and register in `fastapi_backend.py`
4. Create UI in `components/` using existing `components/ui/` base components
5. Test with `npm run test:all` before committing

### Debugging Production Issues
1. Check memory_manager.py logs for OAuth issues
2. Use `npm run claude:health` to verify all services
3. Check Sentry for error tracking
4. Review Redis cache hits for AI cost optimization

### Before Any PR
```bash
npm run lint            # Must pass
npm run build           # Must pass
npm run test:all        # Must pass
npm run test:security:quick  # If security-related changes
```

---
**Production system**: Test all changes, no shortcuts, real data only.

> **Context Window Optimization**: This file has been optimized for Claude Code efficiency. See modular files above for complete details when needed.
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference (Context Optimized)

**📖 For essential development info**: See [`CLAUDE-CORE.md`](./CLAUDE-CORE.md)  
**⚡ For development workflows**: See [`CLAUDE-WORKFLOWS.md`](./CLAUDE-WORKFLOWS.md)  
**🔧 For detailed commands & troubleshooting**: See [`CLAUDE-REFERENCE.md`](./CLAUDE-REFERENCE.md)

## Context Window Optimized Summary

**Enterprise barbershop platform**: Next.js 14 (port 9999) + FastAPI (port 8001) + Supabase PostgreSQL with AI-powered agents, comprehensive onboarding system, and real-time booking features.

**Current Branch**: main (with active modifications)  
**Production URL**: bookedbarber.com  
**Development**: localhost:9999 (Next.js), localhost:8001 (Backend)

**Current Server Status** (as of latest startup):
- ✅ **Next.js Frontend**: Running on localhost:9999 (Ready in ~1200ms)
- ✅ **Backend**: Simple fallback server on localhost:8001 (FastAPI has dependency conflicts)  
- ✅ **Redis Cache**: Running on localhost:6379 (AI cost optimization)
- ⚠️ **FastAPI Full**: Not running (Supabase client TypeError - proxy parameter conflict)

### Core Rules
1. **NO MOCK DATA** - Always use real Supabase database
2. **FULL-STACK ONLY** - Complete features: DB schema → API → UI → tests  
3. **MEMORY CRITICAL** - FastAPI has memory-managed OAuth system (`services/memory_manager.py`)
4. **100% FEATURE COMPLETION** - See "Definition of Done" below
5. **🚨 VERIFY BEFORE ASSESS** - See mandatory verification protocol below

### Essential Commands
```bash
# Quick Start
./docker-dev-start.sh        # Start everything (Redis, FastAPI, Next.js)
npm run claude:health        # Test all connections before starting work (basic placeholder)
npm run dev                  # Next.js (port 9999)
python fastapi_backend.py    # FastAPI (port 8001)
npm run dev:full            # Run both frontend and backend concurrently
npm run dev:backend         # FastAPI backend only
npm run dev:docker          # Start via Docker
python simple_backend.py    # Fallback backend (when FastAPI has dependency issues)

# Before Committing (MANDATORY)
npm run lint                # Check code quality
npm run build               # Verify production build + TypeScript
npm run type-check          # TypeScript type checking only
npm run test:all            # Run full test suite (unit + integration + e2e)

# Testing Commands - Core
npm run test                # Run Jest unit tests
npm run test:watch          # Jest in watch mode
npm run test:ci             # CI-friendly test run with coverage
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only

# Testing Commands - E2E & Specialized
npm run test:e2e            # Run Playwright E2E tests
npm run test:e2e:headed     # E2E tests with browser UI
npm run test:e2e:debug      # Debug E2E tests
npm run test:e2e:ui         # Interactive test UI
npm run test:e2e:smoke      # Quick smoke tests
npm run test:e2e:critical   # Critical path tests only
npm run test:e2e:booking    # Booking flow tests
npm run test:e2e:payment    # Payment integration tests
npm run test:e2e:analytics  # Analytics dashboard tests
npm run test:e2e:mobile     # Mobile-specific tests
npm run test:e2e:cross-browser # Multi-browser testing

# Testing Commands - Quality & Performance
npm run test:security       # Full security test suite
npm run test:security:quick # Quick security scan
npm run test:performance    # Performance benchmarks
npm run test:accessibility  # Accessibility testing
npm run test:visual         # Visual regression tests
npm run test:production-ready # Production readiness validation

# Quality Assurance
npm run claude:validate     # Lint + type-check + build
npm run claude:pre-commit   # Full validation suite (lint + build + all tests)
npm run check:production    # Production readiness check
npm run report:generate     # Generate test reports
npm run report:serve        # Serve test reports
```

### Key Files & Architecture
```
# Core Infrastructure
lib/supabase-query.js         # Database operations layer
lib/dashboard-aggregation.js  # Dashboard data aggregation utilities
services/memory_manager.py    # Critical OAuth management (prevents production crashes)
middleware.js                 # Security headers, auth bypass, admin protection
fastapi_backend.py            # Main FastAPI app with router registration
simple_backend.py             # Fallback HTTP server for basic operations

# Context & State Management  
contexts/GlobalDashboardContext.js  # Multi-location dashboard state management
components/SupabaseAuthProvider.js  # Authentication context provider

# API Structure
app/api/                      # Next.js API routes (100+ endpoints)
app/api/v1/                  # Versioned API endpoints (auth, settings, notifications, billing)
app/api/auth/                # Authentication endpoints (login, OAuth callbacks)
app/api/calendar/            # Calendar integration (Google, Outlook sync)
app/api/bookings/            # Booking management and AI sync
app/api/payments/            # Stripe payment processing and Connect
app/api/cin7/                # Cin7 inventory integration
app/api/shop/                # Shop management (customers, barbers, revenue)
app/api/admin/               # Admin endpoints (subscriptions, knowledge base)
routers/                     # FastAPI feature modules (ai.py, auth.py, dashboard.py)

# Onboarding & User Experience
components/onboarding/EverboardingSystem.js      # Progressive feature discovery
components/onboarding/AdaptiveFlowEngine.js      # AI-powered onboarding adaptation
components/onboarding/ContextualGuidanceProvider.js # Smart contextual help
components/onboarding/LiveBookingPreview.js      # Real-time onboarding previews
services/SmartSuggestionsAPI.js                  # AI recommendations service
test-utils/smart-suggestions-mocks.js            # Testing utilities for suggestions

# Component Libraries
components/ui/               # Base UI components (use these, don't recreate)
components/booking/          # Booking flow components (PublicBookingFlow, ProgressiveAccountCreation)
components/modals/           # Modal components library
components/dashboard/        # Dashboard components (UnifiedDashboard, GlobalContextSelector)
components/customers/        # Customer management components (CustomerPortal)

# Docker & Testing
docker-compose.yml           # Docker services configuration
data/agent_system.db        # SQLite database for development
tests/                       # Comprehensive test suites (onboarding, adaptive, orchestrator)
```

### Shop ID Resolution Pattern (CRITICAL)
```javascript
// Two subscription models affect how shop_id is resolved:
// 1. Individual Barber: has shop_id directly in profiles table
// 2. Barbershop Employee: gets shop_id via barbershop_staff table

// Resolution logic (ALWAYS follow this order):
const shopId = profile.shop_id                    // Check individual barber first
  || profile.barbershop_id                        // Alternative field name
  || (await getStaffShopId(profile.id))          // Employee lookup
  || DEFAULT_SHOP_ID;                            // Fallback for demos

// NEVER assume all users have shop_id - always check both paths!
```

### Database Operation Patterns (CRITICAL)
```javascript
// ALWAYS use transactions for multi-table operations
const { data, error } = await supabase.rpc('transaction_wrapper', {
  operations: [...] 
})

// ALWAYS check for existing records before insert
const existing = await supabase
  .from('table')
  .select('id')
  .eq('unique_field', value)
  .single()

if (!existing) {
  // Safe to insert
}

// ALWAYS use proper error handling with user feedback
if (error) {
  console.error('Operation failed:', error)
  toast.error(error.message || 'Operation failed')
  return
}
```

### Authentication & RLS Critical Issues (MUST READ)
```javascript
// ❌ NEVER query protected tables without authentication
// This causes 400 Bad Request errors due to RLS policies
const { data: adminUser, error } = await supabase
  .from('users')  // RLS requires auth.uid() = user_id
  .select('id, email, role')
  .eq('email', 'user@example.com')

// ✅ ALWAYS use hardcoded fallbacks for development auth
if (!session && process.env.NODE_ENV === 'development') {
  const mockUser = {
    id: 'known-user-id',
    email: 'dev@example.com',
    // ... mock data
  }
  setUser(mockUser)
  setProfile(mockProfile)
  return
}

// ✅ ALWAYS include ALL dependencies in useEffect
useEffect(() => {
  if (selectedService) {
    loadAvailableSlots(selectedService.id, selectedDate)
  }
}, [selectedDate, selectedService]) // Must include selectedService!

// ❌ Missing dependencies cause infinite loops
useEffect(() => {
  // Uses selectedService but doesn't list it
}, [selectedDate]) // WRONG - causes "Maximum update depth exceeded"
```

### Environment Variables (Required)
```bash
# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Models (Required)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=           # For Claude integration
GOOGLE_AI_API_KEY=           # For Gemini integration

# Payments & Services
STRIPE_SECRET_KEY=           # Payment processing
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
SENDGRID_API_KEY=            # Email notifications
TWILIO_ACCOUNT_SID=          # SMS notifications

# Real-time (Optional but recommended)
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_APP_ID=
PUSHER_SECRET=
PUSHER_CLUSTER=us2
```

### Python Backend Setup
```bash
# Install Python dependencies (if using FastAPI backend)
pip install -r requirements.txt

# Start FastAPI backend separately
python fastapi_backend.py    # Runs on port 8001 (full AI features)

# Or use simple backend for basic operations
python simple_backend.py      # Fallback HTTP server (when dependencies fail)
```

### Backend Fallback Architecture
The system includes a **dual backend strategy** for reliability:

1. **Primary**: `fastapi_backend.py` - Full-featured with AI routers, Supabase integration, memory management
2. **Fallback**: `simple_backend.py` - Basic HTTP server when dependencies conflict or memory issues occur

**When to use fallback**:
- Supabase client dependency conflicts (TypeError with proxy parameter)  
- Memory pressure in production (OAuth callback loops)
- Rapid development when full AI features aren't needed

## 🧪 Testing Architecture

### Test Structure
```
tests/
├── unit/                    # Jest unit tests
├── integration/             # API integration tests
├── e2e/                     # Playwright end-to-end tests
├── security/                # Security scanning tests
├── performance/             # Performance benchmarks
└── nuclear/                 # High-impact scenario tests

__tests__/                   # Additional Jest tests
├── components/              # Component unit tests
├── api/                     # API route tests
└── production-ready/        # Production readiness tests
```

### Running Specific Test Suites
```bash
# Run single test file
npm test -- path/to/test.js

# Run tests matching pattern
npm test -- --testNamePattern="should handle"

# Debug specific E2E test
npx playwright test path/to/test.spec.js --debug

# Run E2E tests for specific feature
npm run test:e2e:booking     # Booking flow tests
npm run test:e2e:payment     # Payment integration tests
npm run test:e2e:analytics   # Analytics dashboard tests
npm run test:e2e:notifications # Notification system tests
npm run test:e2e:visual      # Visual regression tests
npm run test:e2e:errors      # Error handling tests

# Advanced test orchestration
bash scripts/run-e2e-tests.sh --smoke          # Quick smoke tests
bash scripts/run-e2e-tests.sh --critical-only  # Critical path only
bash scripts/run-e2e-tests.sh --full          # Complete test suite
bash scripts/run-e2e-tests.sh --suites booking # Specific test suites

# Test automation for onboarding enhancements  
npm test -- tests/onboarding-enhancement-system.spec.js
npm test -- tests/adaptive-flow-engine.spec.js
npm test -- tests/onboarding-test-orchestrator.spec.js

# Additional testing commands from package.json
npm run claude:health          # Health check for all services
npm run claude:setup           # Install deps + Playwright
npm run claude:test-setup      # Health check + smoke tests
```

## 🔒 SECURITY PHILOSOPHY - CRITICAL (READ THIS FIRST!)

### Appropriate Security for a Barbershop Booking App

**⚠️ IMPORTANT**: This is a barbershop booking application, NOT a banking or healthcare system.
We use Supabase authentication which provides sufficient security for our needs.

#### ❌ DO NOT ADD (These Break Authentication):
- **CSRF protection** - Causes token mismatch errors, breaks auth flow
- **Complex security headers** - Interferes with OAuth redirects
- **Additional authentication layers** - Conflicts with Supabase
- **Field-level encryption** - Unnecessary except for payment tokens
- **Enterprise security patterns** - Over-engineering for our use case
- **Custom session management** - Conflicts with Supabase sessions

#### ✅ WE RELY ON (This Is Sufficient):
- **Supabase JWT authentication** - Handles auth securely
- **Row Level Security (RLS)** - Database-level access control
- **Basic input validation** - Prevent XSS and injection
- **HTTPS everywhere** - Encrypted connections
- **Stripe for payments** - PCI compliance handled by Stripe
- **OAuth providers** - Google/GitHub handle their own security

#### 📊 WHY THIS IS SUFFICIENT:
- We handle appointment bookings, not financial transactions
- Customer data is protected by RLS policies
- OAuth and email auth prevent unauthorized access
- Industry standard for booking apps (Calendly, Booksy, etc.)
- Lower security complexity = fewer bugs = better UX

#### 🚨 IF A SECURITY AUDIT SUGGESTS MORE:
**REJECT IT.** Link to this section. We've tried complex security. It breaks authentication.
The CSRF token mismatch error was caused by over-engineering. Don't repeat this mistake.

**Real Security Risks for Our App:**
1. **Fake bookings** → Solved by requiring authentication
2. **Data leaks** → Solved by RLS policies
3. **Payment fraud** → Handled by Stripe
4. **Spam** → Basic rate limiting is enough

**Not Our Concerns:**
- Nation-state attacks
- Advanced persistent threats
- Regulatory compliance (HIPAA, SOX, etc.)
- Military-grade encryption

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
- **Multi-Model Support**: OpenAI GPT-4/5, Anthropic Claude Opus 4.1, Google Gemini 2.0
- **Agent Framework**: Master coach + specialist agents (financial, operations, brand, growth)
- **Memory System**: Persistent context across sessions with memory-managed OAuth
- **Caching Layer**: Redis-backed response caching (60-70% cost reduction)
- **Cost Tracking**: Per-token billing with usage monitoring in `lib/ai-config.js`
- **Agent Routers**: Modular FastAPI routers in `routers/ai.py`, `routers/agents.py`
- **Prompt Templates**: Structured prompts in `services/ai_service.py`

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

## 🔄 Current Development Context (January 2025)

### Recently Completed Features
- ✅ **Complete Onboarding System**: EverboardingSystem + AdaptiveFlowEngine + ContextualGuidance
- ✅ **Data Import Infrastructure**: Post-onboarding import via DataImportWidget
- ✅ **Smart Suggestions API**: AI-powered contextual recommendations

### Active Development (git status snapshot)
**Modified Core Files:**
- `components/dashboard/UnifiedDashboard.js` - Dashboard enhancements
- `components/onboarding/AdaptiveFlowEngine.js` - Onboarding flow improvements  
- `contexts/GlobalDashboardContext.js` - Multi-location state management
- `app/(protected)/barber/clients/page.js` - Client management updates

**New Untracked Features:**
- `app/(protected)/dashboard/import/` - Data import page
- `components/dashboard/DataImportWidget.js` - Post-onboarding import widget
- `components/onboarding/EverboardingProvider.js` - Progressive feature discovery
- `lib/integrations/` - New integration libraries
- Multiple database cleanup scripts for production data management

### Key Onboarding System Components
```javascript
// Everboarding - Progressive feature discovery post-onboarding
import EverboardingSystem from '@/components/onboarding/EverboardingSystem'
import { EverboardingProvider } from '@/components/onboarding/EverboardingProvider'

// Adaptive Flow - AI-powered dynamic onboarding steps
import { AdaptiveFlowEngine } from '@/components/onboarding/AdaptiveFlowEngine'

// Contextual Guidance - Smart help and tooltips
import ContextualTooltip from '@/components/onboarding/ContextualTooltip'
import ContextualGuidanceProvider from '@/components/onboarding/ContextualGuidanceProvider'

// Live Preview - Real-time booking preview during setup
import LiveBookingPreview from '@/components/onboarding/LiveBookingPreview'

// Data Import - Post-onboarding data import widget
import DataImportWidget from '@/components/dashboard/DataImportWidget'
```

### Production-Ready Development Patterns
```javascript
// Smart Suggestions Pattern - AI-powered recommendations
import { SmartSuggestionsAPI } from '@/services/SmartSuggestionsAPI'

// Global Context Pattern - use for multi-location features
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'

// Public API Pattern - no auth required endpoints
// Place in app/api/public/* for automatic auth bypass

// Dashboard Aggregation Pattern - combine data from multiple sources
import { aggregateDashboardData } from '@/lib/dashboard-aggregation'

// Fixed Supabase Query Pattern - avoid PostgREST relationship syntax
// ❌ DON'T use foreign key syntax like 'profiles:user_id'
const { data, error } = await supabase
  .from('barbershop_staff')
  .select('*, profiles:user_id(full_name, email)')  // BREAKS

// ✅ DO separate queries and merge in JavaScript
const staffData = await supabase
  .from('barbershop_staff')
  .select('*')
  .eq('barbershop_id', id)

const userIds = staffData.data.map(s => s.user_id)
const profilesData = await supabase
  .from('profiles')
  .select('id, full_name, email')
  .in('id', userIds)

// Merge data in JavaScript with lookup maps
```

### Critical Troubleshooting Knowledge
```javascript
// Common Issues & Solutions:

// 1. Database Query Errors (400 Bad Request)
// Cause: RLS policies preventing unauthenticated queries
// Solution: Use hardcoded fallbacks in development mode

// 2. Infinite Loop Errors ("Maximum update depth exceeded")  
// Cause: Incomplete useEffect dependency arrays
// Solution: Include ALL variables used in effect

// 3. PostgREST Foreign Key Syntax Errors
// Cause: Complex join syntax not supported consistently
// Solution: Use separate queries + JavaScript merging

// 4. Site Loading Issues (404 errors)
// Cause: Port conflicts or compilation errors
// Solution: Kill processes on port 9999, restart dev server
lsof -ti:9999 | xargs kill -9
npm run dev

// 5. Memory Issues with OAuth Callbacks
// Cause: Unbounded session storage in FastAPI
// Solution: Use memory_manager.py for OAuth operations

// 6. Data Import After Onboarding
// Location: Post-onboarding via DataImportWidget on dashboard
// Pattern: Complete onboarding first, then import existing data
// Files: components/dashboard/DataImportWidget.js
```

## 📝 Common Development Tasks

### Adding a New Feature
1. Check existing patterns in similar features
2. Use `lib/supabase-query.js` for database operations
3. Add router to `routers/` and register in `fastapi_backend.py`
4. Create UI in `components/` using existing `components/ui/` base components
5. If multi-location: integrate with `GlobalDashboardContext`
6. If onboarding-related: follow completed onboarding component patterns
7. Create database migration in `database/migrations/` if schema changes needed
8. Test with `npm run test:all` before committing

### Working with the Onboarding System
1. Onboarding flow is complete with AdaptiveFlowEngine for dynamic steps
2. EverboardingSystem handles progressive feature discovery post-onboarding
3. Data import is now a post-onboarding activity via DataImportWidget
4. Use ContextualGuidanceProvider for smart help throughout the flow
5. Test with scripts in `scripts/verify-onboarding-complete.js`

### Debugging Production Issues
1. Check memory_manager.py logs for OAuth issues
2. Use `npm run claude:health` to verify all services
3. Check Sentry for error tracking
4. Review Redis cache hits for AI cost optimization
5. For dashboard issues: check GlobalDashboardContext state

### Testing Specific Features
```bash
# Test booking flow
npm run test:e2e:booking

# Test global context
node scripts/test-global-context.js

# Test view modes
node scripts/test-view-modes.js

# Integration test for dashboard
npm test -- __tests__/integration/global-dashboard-context.test.js

# Run specific test files
npm test -- path/to/test.js
npm test -- --testNamePattern="should handle"

# Debug specific E2E test
npx playwright test path/to/test.spec.js --debug

# CI/CD Pipeline Tests
npm run ci:test              # CI-friendly test suite
npm run ci:full              # Complete CI validation
```

### Before Any PR
```bash
npm run lint            # Must pass
npm run build           # Must pass
npm run test:all        # Must pass
npm run test:security:quick  # If security-related changes
```

### Common Troubleshooting Scenarios
```bash
# Site not loading / 404 errors
lsof -ti:9999 | xargs kill -9  # Kill processes on port 9999
npm run dev                    # Restart development server

# Database query errors (400 Bad Request)
# Check SupabaseAuthProvider.js for RLS policy violations
# Solution: Use hardcoded fallbacks in development mode

# Infinite loop warnings ("Maximum update depth exceeded")
# Check useEffect dependency arrays in React components
# Solution: Include ALL variables used in the effect

# PostgREST/Supabase query failures
# Check for complex join syntax like 'table:foreign_key(fields)'
# Solution: Use separate queries and merge in JavaScript
```

### Utility Scripts & Database Management
```bash
# Database & Setup
node scripts/create-test-account.js        # Create test accounts
node scripts/setup-database.js             # Initialize database
node scripts/setup-supabase-database.js    # Supabase setup
node scripts/apply-rls-policies-direct.js  # Apply RLS policies
node scripts/execute-sql-direct.js         # Execute SQL directly

# Data Management
node scripts/cleanup-test-data.js          # Clean test data
node scripts/generate-comprehensive-data.js # Generate demo data
node scripts/fix-barbershop-associations.js # Fix data associations

# Production & Deployment
./scripts/deploy-production.sh             # Production deployment
./scripts/production-setup.js              # Production configuration
node scripts/verify-production-readiness.js # Pre-deployment check
node scripts/check-deployment.sh           # Post-deployment verification

# Development Tools
node scripts/fix-user-roles.js             # Fix user permissions
node scripts/diagnose-and-fix-rate-limits.js # Rate limit debugging
npm run check:production-readiness         # Full production check
```

## 🚨 CRITICAL KNOWN ISSUES & SOLUTIONS

### Common Runtime Errors
1. **"Maximum update depth exceeded"** → Missing useEffect dependencies
   - Solution: Include ALL variables used in the effect
2. **400 Bad Request on DB queries** → RLS policies blocking unauthenticated access
   - Solution: Use development fallbacks in SupabaseAuthProvider.js
3. **PostgREST foreign key syntax fails** → Complex joins not supported
   - Solution: Use separate queries and merge in JavaScript
4. **Port 9999 blocked** → Previous process still running
   - Solution: `lsof -ti:9999 | xargs kill -9`
5. **OAuth memory issues** → Unbounded session storage
   - Solution: Use memory_manager.py for all OAuth operations
6. **FastAPI Supabase client TypeError** → Proxy parameter conflict in dependencies
   - Solution: Use `python simple_backend.py` as fallback backend
   - Error: `Client.__init__() got an unexpected keyword argument 'proxy'`

## 🚨 VERIFY BEFORE ASSESS Protocol

**CRITICAL**: Before claiming any missing functionality, verify through code examination.

### Quick Verification Commands
```bash
# Check for specific integrations
grep -r "stripe" . --include="*.js" --include="*.py"
grep -r "sendgrid\|twilio" services/ --include="*.js"
ls -la app/api/payments/
ls -la services/*service*

# Check onboarding components
ls -la components/onboarding/
grep -r "EverboardingSystem\|AdaptiveFlowEngine" components/

# Verify database migrations
ls -la database/migrations/
cat database/migrations/004_data_import_schema.sql | head -20

# Test service health
npm run claude:health
python -c "import fastapi_backend; print('FastAPI OK')"
```

### Before Reporting Issues
1. **Check existing code** - Use grep/find to verify implementation
2. **Review git status** - Understand what's actively being modified
3. **Test locally** - Run `npm run claude:health` to verify services
4. **Document findings** - Include file paths and line numbers

---
**Production system**: Test all changes, no shortcuts, real data only.

> **Context Window Optimization**: This file has been optimized for Claude Code efficiency. See modular files above for complete details when needed.
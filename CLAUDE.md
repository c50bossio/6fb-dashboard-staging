# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Quick Start

**What this is**: Enterprise barbershop platform - Next.js 14 (port 9999) + FastAPI (port 8001) + Supabase  
**Production**: bookedbarber.com | **Development**: localhost:9999

```bash
# Start everything (RECOMMENDED)
./docker-dev-start.sh        # Starts all services with Docker
# OR manually:
npm run dev                  # Frontend only (port 9999)
python simple_backend.py     # Backend (port 8001) - use when FastAPI has issues

# Before ANY commit - MANDATORY
npm run lint                 # Must pass
npm run build               # Must pass (generates 300+ static pages)
npm run test:all            # Must pass

# Quick validation
npm run claude:validate      # Runs lint + type-check + build
```

## ⚠️ Critical Rules - READ FIRST

1. **NO MOCK DATA** - Always use real Supabase database
2. **100% FEATURE COMPLETION** - Every feature must work end-to-end (DB → API → UI → Tests)
3. **COMPLETE DEPENDENCY ARRAYS** - Missing deps cause infinite loops
4. **USE EXISTING COMPONENTS** - Check `components/ui/` before creating new ones
5. **SEPARATE QUERIES** - PostgREST foreign key syntax fails, use JavaScript merging

## 🏗️ Architecture Overview

### Stack: Next.js 14 (9999) + FastAPI (8001) + Supabase + Multi-AI
- **Frontend**: Next.js 14 App Router, SSR, TypeScript, path aliases
- **Backend**: FastAPI modular routers, memory management, WebSocket support
- **Database**: Supabase PostgreSQL + Auth + RLS + Real-time
- **AI**: Multi-provider (OpenAI, Anthropic, Google) with Redis caching (-60% costs)
- **Integrations**: Stripe Connect, Google Calendar, CIN7, SendGrid, Pusher
- **Production**: CloudFlare CDN → AWS ALB → Kubernetes (10K+ users)

### File Structure
```
app/
├── api/                     # Next.js API routes (100+ endpoints)
│   ├── auth/               # Authentication endpoints
│   ├── services/           # Service management
│   ├── cin7/              # CIN7 inventory integration
│   ├── stripe/            # Payment processing
│   └── ai/                # AI agent endpoints
├── (protected)/            # Authenticated pages (requires login)
│   ├── dashboard/         # Main dashboard with sub-pages
│   ├── shop/             # Shop management (products, services)
│   └── onboarding/       # Step-by-step onboarding flow
└── (public)/              # Public pages (no auth required)

components/
├── ui/                    # ⚠️ BASE COMPONENTS - USE THESE FIRST
├── dashboard/             # Dashboard features  
├── onboarding/           # Complete onboarding system
├── booking/              # Booking flow components
├── settings/             # Settings management (UnifiedSettingsInterface)
└── navigation/           # Multi-location navigation system

lib/
├── supabase-query.js     # ⚠️ CRITICAL - All DB operations
├── dashboard-aggregation.js # Dashboard data utilities
├── ai-config.js          # AI model configuration
├── financial-service.js  # Financial arrangements & Stripe Connect
└── utils.js              # Common utilities (cn, formatters)

services/
├── memory_manager.py     # ⚠️ CRITICAL - OAuth memory management
├── ai_service.py        # AI agent orchestration
├── SmartSuggestionsAPI.js # AI recommendations
├── shop_service.py       # Shop management backend
└── staff-service.js     # Staff management & payroll

routers/                  # FastAPI modules
├── ai.py                # AI endpoints
├── auth.py              # Authentication
├── dashboard.py         # Dashboard APIs
├── shop_management.py   # Shop operations
└── franchise.py         # Multi-location management
```


## 🔧 Common Tasks & Solutions

### Database Operations Pattern
```javascript
// ❌ NEVER - PostgREST syntax fails
const { data } = await supabase
  .from('barbershop_staff')
  .select('*, profiles:user_id(full_name, email)')

// ✅ ALWAYS - Separate queries + merge
const staff = await supabase.from('barbershop_staff').select('*')
const profiles = await supabase.from('profiles').select('*').in('id', userIds)
// Merge in JavaScript
```

### Shop ID Resolution (CRITICAL)
```javascript
// Two subscription models require different lookups:
const shopId = profile.shop_id           // Individual barber
  || profile.barbershop_id              // Alt field name  
  || (await getStaffShopId(profile.id)) // Employee via barbershop_staff
  || DEFAULT_SHOP_ID;                   // Fallback
```

### useEffect Dependencies (PREVENTS CRASHES)
```javascript
// ❌ WRONG - Causes "Maximum update depth exceeded"
useEffect(() => {
  if (selectedService) { /* uses selectedService */ }
}, [selectedDate]) // Missing dependency!

// ✅ CORRECT - Include ALL dependencies
useEffect(() => {
  if (selectedService) { /* uses selectedService */ }
}, [selectedDate, selectedService])
```

## 🚨 Known Issues & Fixes

| Issue | Solution |
|-------|----------|
| **"Maximum update depth exceeded"** | Add ALL useEffect dependencies |
| **400 Bad Request on queries** | RLS blocking - use service role key in dev |
| **PostgREST syntax errors** | Use separate queries + JS merge |
| **Port 9999 blocked** | `lsof -ti:9999 \| xargs kill -9` |
| **FastAPI TypeError with proxy** | Use `python simple_backend.py` instead |
| **OAuth memory issues** | Check `services/memory_manager.py` |
| **Build fails with missing component** | Check imports match actual file paths |
| **Settings duplication** | Use UnifiedSettingsInterface.js |

## 📋 Environment Variables

```bash
# Required - Database
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ Critical for dev

# Required - AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Required - Payments (production)
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Required - Notifications  
SENDGRID_API_KEY=SG...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# Optional - Features
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=us2
```

## 🧪 Commands & Testing

```bash
# Core development
npm run dev                    # Next.js dev server (port 9999)
./docker-dev-start.sh          # Start all services
npm run lint && npm run build  # Pre-commit validation

# Testing (Jest + Playwright)
npm run test:all               # Full test suite
npm run test:e2e:booking       # Booking flow
npm run test:e2e:payment       # Payment processing
npm run test:nuclear           # High-impact scenarios

# Database & setup
npm run setup-db              # Initialize schema
npm run cleanup-test-data     # Clean test data
npm run claude:health         # System health check

# Production & deployment
npm run deploy:production     # Full deployment
npm run performance:analyze  # Bundle analysis
```

## 🛠️ Troubleshooting & Debug Guide

### Port Conflicts & Service Issues
```bash
# Kill processes on default ports
sudo lsof -ti:9999 | xargs kill -9  # Frontend port
sudo lsof -ti:8001 | xargs kill -9  # Backend port

# Check service status
curl http://localhost:9999/api/health  # Frontend health
curl http://localhost:8001/health      # Backend health

# Docker troubleshooting
docker compose down && docker compose up --build
docker compose logs -f frontend        # View frontend logs
docker compose logs -f backend         # View backend logs
```

### Memory & Performance Issues
```bash
# Complete environment reset
rm -rf .next/ node_modules/ && npm install

# Memory issues (OAuth failures)
# Check memory_manager.py logs in FastAPI backend

# Performance profiling
npm run performance:analyze     # Bundle analysis
npm run performance:lighthouse  # Core Web Vitals
```

### Database & Authentication Debug
```bash
# Row Level Security debugging
# Use SUPABASE_SERVICE_ROLE_KEY in development
# Check RLS policies if getting 400 errors

# Supabase connection test
npx supabase status            # Check local Supabase
npx supabase db reset          # Reset local database
```

## 🛡️ Security Approach

**This is a barbershop app, not a bank.** We use:
- Supabase Auth (handles security)
- Row Level Security (database protection)
- Stripe (payment security)
- Basic input validation

**DO NOT ADD**: CSRF tokens, complex headers, custom sessions - they break auth.

## 📂 Recent Work & Patterns

### Production Deployment Focus (Latest)
- Settings deduplication with UnifiedSettingsInterface
- Mobile UI optimization and text overflow fixes
- Removed all mock/demo data for production
- Enterprise location management
- Service management with image support

### Critical Patterns to Follow
```javascript
// ✅ ALWAYS: Check user barbershop association
const barbershopId = await getUserBarbershop(userId);
if (!barbershopId) return { error: 'No barbershop found' };

// ✅ ALWAYS: Handle loading states properly
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

// ✅ ALWAYS: Clean up subscriptions
useEffect(() => {
  const subscription = supabase.from('table').on('*', callback).subscribe();
  return () => subscription.unsubscribe();
}, []);

// ✅ ALWAYS: Use try-catch in API routes
export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    // ... process request
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Key Components to Use
```javascript
// Dashboard - Multi-location support
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'

// Onboarding - Complete system
import { AdaptiveFlowEngine } from '@/components/onboarding/AdaptiveFlowEngine'
import EverboardingSystem from '@/components/onboarding/EverboardingSystem'

// Data Operations
import { aggregateDashboardData } from '@/lib/dashboard-aggregation'
import { SmartSuggestionsAPI } from '@/services/SmartSuggestionsAPI'
```

## 📊 Database Schema (Key Tables)

### Core Architecture Tables
```sql
-- Core user/shop relationship
profiles (id, email, shop_id, barbershop_id, role, subscription_tier)
barbershops (id, owner_id, name, address, business_hours)
barbershop_staff (barbershop_id, user_id, role, is_active)

-- Business operations
services (id, shop_id, name, price, duration_minutes, image_url)
appointments (id, barbershop_id, customer_id, service_id, date, status, barber_id)
customers (id, barbershop_id, name, email, phone, loyalty_points)

-- Enterprise features
organizations (id, name, tier, created_at) -- Multi-location management
organization_members (org_id, user_id, role, permissions)
financial_arrangements (barbershop_id, barber_id, arrangement_type, commission_rate)

-- Integration systems
settings_hierarchy (id, context_type, context_id, category, settings)
stripe_accounts (barbershop_id, account_id, onboarding_completed)
staff_invitations (id, barbershop_id, email, status, invitation_token)
```

### Key Patterns
- **Multi-Location**: Organizations manage multiple barbershops via `organization_id`
- **RBAC**: CLIENT → BARBER → SHOP_OWNER → ENTERPRISE_OWNER → SUPER_ADMIN hierarchy
- **AI Fallback**: OpenAI → Anthropic → Google with automatic provider switching

## 🏗️ Testing & Architecture

### Core Dependencies
- **AI**: OpenAI, Anthropic, Google (multi-provider with Redis caching -60% costs)
- **Infrastructure**: Supabase (DB/Auth), Sentry (monitoring), Pusher (real-time)
- **Business**: Stripe (payments), PostHog (analytics), FullCalendar (scheduling)
- **Testing**: Jest (unit), Playwright (E2E), 80%+ coverage requirement

## 🔍 Verification Protocol

Before claiming missing functionality:
```bash
# Check for existing implementation
grep -r "feature_name" . --include="*.js"
ls -la app/api/feature/
ls -la components/feature/

# Verify services running
npm run claude:health
python -c "import fastapi_backend; print('OK')"
lsof -i :9999  # Check if port is in use
lsof -i :8001  # Check backend port

# Check recent work
git status
git log --oneline -10
```

## 📋 Development Workflows

### Before Making Changes
1. Start dev environment: `./docker-dev-start.sh`
2. Check system health: `npm run claude:health`
3. Verify no lint/type errors: `npm run lint && npm run build`

### After Making Changes
1. Fix any linting issues: `npm run lint:fix`
2. Run full test suite: `npm run test:all`
3. Verify production build: `npm run build`
4. Check security if needed: `npm run test:security:quick`

### Feature Development Checklist
- [ ] Database schema with RLS policies
- [ ] Backend API endpoint (FastAPI router)
- [ ] Frontend UI with error handling
- [ ] Tests written and passing
- [ ] Real data integration (no mocks)
- [ ] Authentication/authorization implemented

## 🏗️ Core Subscription Model

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

## 🚀 Production Architecture

### Scale Targets
- **Users**: 10,000+ concurrent with auto-scaling
- **Performance**: <3s load times, 99.9% uptime
- **Multi-region**: AWS (primary), GCP (AI), Azure (enterprise)
- **Security**: AES-256 at rest, TLS 1.3 in transit

### Infrastructure Stack
- **Containers**: Kubernetes with 50-200 auto-scaling nodes
- **Database**: PostgreSQL Multi-AZ + Redis cluster + Elasticsearch
- **CDN**: CloudFlare global edge network
- **Storage**: S3 multi-region with versioned backups

## 🗄️ Database Patterns

### Multi-Tenant Strategy
- **Sharding**: By `franchise_id` for 10,000+ locations
- **RLS**: Row Level Security for tenant isolation
- **Extensions**: pgvector, pg_partman, timescaledb

### Critical Pattern
```javascript
// ❌ WRONG - Breaks RLS and performance
const { data } = await supabase
  .from('appointments')
  .select('*, customers(*), services(*)')

// ✅ CORRECT - Separate queries + JS merge
const appointments = await supabase.from('appointments').select('*')
const customerIds = appointments.map(apt => apt.customer_id)
const customers = await supabase.from('customers').select('*').in('id', customerIds)
```

## 📊 Monitoring & Compliance

### Production Stack
- **Errors**: Sentry for aggregation & alerting
- **Analytics**: PostHog (self-hosted, GDPR-compliant)
- **Health**: Prometheus + Grafana + `/api/health`
- **Performance**: Web Vitals + Core Performance Metrics

### Security & Compliance
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **GDPR**: Automated deletion, data portability, consent management
- **Auth**: Supabase Auth (JWT), MFA via TOTP, OAuth with PKCE
- **Retention**: 7 years (business), 30 days (logs)

### SLA Targets
- Page Load: <3s (95th percentile)
- API Response: <500ms (99th percentile) 
- Uptime: 99.9%
- DB Queries: <100ms (95th percentile)

## 🎯 Business Model Context

### Freemium Strategy: "Insights Free, Agents Paid"
- **Free**: Business insights, analytics, basic booking, reminders
- **Paid**: AI agents ($0.04/1K tokens), SMS ($0.01/msg), Email ($0.001/msg)
- **Strategy**: Just-in-time billing modals, strategic upgrade CTAs

### Implementation Approach
- Remove billing from onboarding → focus on value delivery
- "Launch Agent" buttons throughout dashboard trigger billing setup
- Value-first messaging shows ROI before payment requests

---
**Remember**: Complete features only. No mocks. Test everything. Real data only.
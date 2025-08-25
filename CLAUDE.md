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

```
app/
├── api/                     # Next.js API routes (100+ endpoints)
│   ├── auth/               # Authentication endpoints
│   ├── services/           # Service management
│   └── cin7/              # CIN7 inventory integration
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
└── settings/             # Settings management (UnifiedSettingsInterface)

lib/
├── supabase-query.js     # ⚠️ CRITICAL - All DB operations
├── dashboard-aggregation.js # Dashboard data utilities
├── ai-config.js          # AI model configuration
└── utils.js              # Common utilities (cn, formatters)

services/
├── memory_manager.py     # ⚠️ CRITICAL - OAuth memory management
├── ai_service.py        # AI agent orchestration
├── SmartSuggestionsAPI.js # AI recommendations
└── shop_service.py       # Shop management backend

routers/                  # FastAPI modules
├── ai.py                # AI endpoints
├── auth.py              # Authentication
├── dashboard.py         # Dashboard APIs
└── shop_management.py   # Shop operations
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

## 🧪 Testing Commands

```bash
# Core testing
npm run test                # Unit tests
npm run test:e2e           # E2E tests
npm run test:all           # Everything

# Specific features
npm run test:e2e:booking   # Booking flow
npm run test:e2e:payment   # Payments
npm run test:e2e:mobile    # Mobile tests

# Quick checks
npm run claude:health      # Service health
npm run claude:validate    # Lint + build
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

```sql
-- Core user/shop relationship
profiles (id, email, shop_id, barbershop_id, role, subscription_tier)
barbershops (id, owner_id, name, address, business_hours)
barbershop_staff (barbershop_id, user_id, role, is_active)

-- Business operations
services (id, shop_id, name, price, duration_minutes)
appointments (id, barbershop_id, customer_id, service_id, date, status)
customers (id, barbershop_id, name, email, phone)

-- Settings & config
settings_hierarchy (id, context_type, context_id, category, settings)
stripe_accounts (barbershop_id, account_id, onboarding_completed)
```

## 🧪 Testing Patterns

```bash
# Run specific test suites
npm run test:e2e:booking    # Booking flow
npm run test:e2e:payment    # Payment processing
npm run test:e2e:mobile     # Mobile responsiveness

# Debug failing tests
npm run test:e2e:debug      # Interactive debugging
npm run test:e2e:headed     # See browser execution

# Production readiness check
npm run check:production    # Validates all systems
npm run stripe:validate     # Verify Stripe config
npm run deploy:checklist    # Pre-deploy validation
```

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

## 📚 Additional Documentation

- **Core concepts**: See [`CLAUDE-CORE.md`](./CLAUDE-CORE.md)
- **Workflows**: See [`CLAUDE-WORKFLOWS.md`](./CLAUDE-WORKFLOWS.md)  
- **Detailed reference**: See [`CLAUDE-REFERENCE.md`](./CLAUDE-REFERENCE.md)

---
**Remember**: Complete features only. No mocks. Test everything. Real data only.
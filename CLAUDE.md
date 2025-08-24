# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Quick Start

**What this is**: Enterprise barbershop platform - Next.js 14 (port 9999) + FastAPI (port 8001) + Supabase  
**Production**: bookedbarber.com | **Development**: localhost:9999

```bash
# Start everything
./docker-dev-start.sh        # Recommended: starts all services
# OR manually:
npm run dev                  # Frontend only (port 9999)
python simple_backend.py     # Backend (port 8001) - use when FastAPI has issues

# Before ANY commit - MANDATORY
npm run lint                 # Must pass
npm run build               # Must pass  
npm run test:all            # Must pass
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
├── (protected)/            # Authenticated pages
└── (public)/              # Public pages

components/
├── ui/                    # ⚠️ BASE COMPONENTS - USE THESE
├── dashboard/             # Dashboard features  
├── onboarding/           # Complete onboarding system
└── booking/              # Booking flow components

lib/
├── supabase-query.js     # ⚠️ CRITICAL - All DB operations
├── dashboard-aggregation.js # Dashboard data utilities
└── ai-config.js          # AI model configuration

services/
├── memory_manager.py     # ⚠️ CRITICAL - OAuth memory management
├── ai_service.py        # AI agent orchestration
└── SmartSuggestionsAPI.js # AI recommendations

routers/                  # FastAPI modules
├── ai.py                # AI endpoints
├── auth.py              # Authentication
└── dashboard.py         # Dashboard APIs
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
| **400 Bad Request on queries** | RLS blocking - use dev fallbacks |
| **PostgREST syntax errors** | Use separate queries + JS merge |
| **Port 9999 blocked** | `lsof -ti:9999 \| xargs kill -9` |
| **FastAPI TypeError with proxy** | Use `python simple_backend.py` |
| **OAuth memory issues** | Check `services/memory_manager.py` |

## 📋 Environment Variables

```bash
# Required - Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Required - AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Required - Services  
STRIPE_SECRET_KEY=
SENDGRID_API_KEY=
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

## 📂 Current Work Context

### Active Modifications (from git status)
- Dashboard improvements (`components/dashboard/UnifiedDashboard.js`)
- Onboarding enhancements (multiple files removed/archived)
- Service management updates (`app/api/services/route.js`)
- Product management (`app/(protected)/shop/products/page.js`)
- Customer management (`app/(protected)/dashboard/customers/page.js`)

### Recently Completed
- ✅ Complete onboarding system with AdaptiveFlowEngine
- ✅ Data import infrastructure (post-onboarding)
- ✅ Smart suggestions API
- ✅ CIN7 inventory integration

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
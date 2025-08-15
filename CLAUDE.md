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
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview
Enterprise barbershop platform: Next.js 14 (port 9999) + FastAPI (port 8001) + Supabase PostgreSQL.

**Core Rules:**
1. **NO MOCK DATA** - Always use real Supabase database
2. **FULL-STACK ONLY** - Complete features: DB schema → API → UI → tests
3. **MEMORY CRITICAL** - FastAPI has memory-managed OAuth system to prevent crashes

## Quick Start Commands
```bash
# Development
./docker-dev-start.sh              # Start dev environment with Docker
npm run claude:health              # Test all system connections
npm run dev                        # Start Next.js (port 9999)
python fastapi_backend.py          # Start API (port 8001)

# Health checks
npm run health                     # API health check via curl
curl http://localhost:9999/api/health
curl http://localhost:8001/health

# Stop everything
docker compose down
```

## Essential Commands
```bash
# Testing (Run before committing)
npm run test:all                # Full test suite (Jest + Playwright)
npm run test                    # Unit tests only (Jest)
npm run test:e2e               # End-to-end tests (Playwright)
npm run test:security          # Security scanning suite
npm run test:nuclear           # High-impact nuclear test scenarios

# Development
npm run dev                    # Next.js dev server (port 9999)
npm run build                  # Production build + TypeScript check
npm run lint                   # ESLint check
npm run lint:fix              # Auto-fix linting issues

# Database Operations
npm run setup-db              # Initialize database schema
npm run cleanup-test-data     # Clean test data (supports --dry-run)
npm run seed:analytics        # Seed analytics data for testing

# Performance
npm run performance:analyze   # Bundle size analysis
npm run performance:lighthouse # Lighthouse performance test

# Docker & Deployment
npm run docker:dev            # Start with Docker Compose
npm run docker:stop           # Stop all Docker containers
npm run monitoring:start      # Start monitoring stack (Prometheus/Grafana)
npm run deploy:production     # Full production deployment
```

## Architecture Overview

### Key Files Structure
```
app/
├── layout.js                 # Root layout with providers
├── api/                      # Next.js API routes
├── dashboard/               # Main dashboard pages
└── (protected)/             # Protected routes

components/
├── ui/                      # Base UI components
├── dashboard/              # Dashboard-specific components
├── calendar/               # Calendar components
└── ai/                     # AI chat components

lib/
├── supabase-query.js       # Database operations
├── ai-orchestrator-enhanced.js  # AI model routing
├── auth-config.js          # Authentication config
└── stripe.js              # Payment processing

services/
├── notification_service.py # Notification handling
├── memory_manager.py       # Memory management
└── sentry_service.py       # Error monitoring
```

### Backend Architecture
- **FastAPI**: Main backend (`fastapi_backend.py`) with modular routers
- **Routers**: Feature-based in `/routers/` (auth.py, ai.py, dashboard.py, notifications.py)
- **Memory Management**: Production-critical OAuth session handling to prevent crashes
- **AI Integration**: Multi-model support (OpenAI, Anthropic, Google) with caching
- **Error Monitoring**: Sentry integration with memory tracking

### Frontend Architecture
- **Next.js 14**: App Router with TypeScript support and path aliases
- **Real-time**: Pusher WebSocket for live updates
- **State Management**: React hooks + Context patterns in `/contexts/`
- **Authentication**: Supabase Auth with middleware protection (`middleware.js`)
- **Testing**: Jest (unit) + Playwright (E2E) with comprehensive coverage

## Database Schema
Core tables in Supabase:
- `profiles` - User accounts and roles
- `barbershops` - Shop information
- `barbershop_staff` - Staff relationships
- `customers` - Customer data
- `services` - Service offerings
- `appointments` - Booking data with recurring support
- `transactions` - Payment records

## Required Environment Variables
```bash
# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# AI (Required)
OPENAI_API_KEY=

# Payments (Production)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Real-time (Optional)
PUSHER_APP_ID=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_KEY=
```

## Development Workflow

### Before Making Changes
1. Start dev environment: `./docker-dev-start.sh`
2. Check system health: `npm run claude:health` (tests all connections)
3. Verify no lint/type errors: `npm run lint && npm run build`

### After Making Changes
1. Fix any linting issues: `npm run lint:fix`
2. Run full test suite: `npm run test:all`
3. Verify production build: `npm run build`
4. Check security if needed: `npm run test:security:quick`

### Critical Rules
- **NEVER** use mock data - always integrate with real Supabase
- **ALWAYS** run tests before committing
- **MEMORY**: Be aware of OAuth memory management in FastAPI backend

### Feature Development Checklist
- [ ] Database schema with RLS policies
- [ ] Backend API endpoint (FastAPI router)
- [ ] Frontend UI with error handling
- [ ] Tests written and passing
- [ ] Real data integration (no mocks)
- [ ] Authentication/authorization implemented

## Common Patterns

### Adding New API Endpoints
1. Create router in `routers/` directory
2. Add route to `fastapi_backend.py`
3. Implement database queries in `lib/supabase-query.js`
4. Add frontend API calls in `lib/api.js`

### Adding New UI Components
1. Create in appropriate `components/` subdirectory
2. Use existing UI components from `components/ui/`
3. Follow Tailwind CSS patterns
4. Implement error boundaries for complex components

### Database Operations
- Always use `lib/supabase-query.js` functions
- Implement RLS policies for security
- Use real-time subscriptions for live updates
- Handle optimistic updates for better UX

## Testing Strategy
- **Jest**: Unit tests with 80% coverage threshold (`jest.config.js`)
- **Playwright**: E2E tests with HTML reports in `playwright-report/`
- **Security**: Comprehensive scanning with `npm run test:security`
- **Nuclear Tests**: High-impact scenarios for critical systems
- **Performance**: Lighthouse and bundle analysis tools

## Critical Dependencies & Performance
- **Memory Management**: `services/memory_manager.py` - Critical for OAuth stability
- **AI Caching**: Redis reduces AI API costs 60-70%
- **Error Monitoring**: Sentry integration with comprehensive tracking
- **Real-time**: Pusher WebSocket for live dashboard updates
- **Bundle Optimization**: Webpack analysis with `npm run performance:analyze`

## Deployment
- **Development**: Docker Compose
- **Production**: Vercel (recommended) or Docker
- **Monitoring**: Integrated Sentry error tracking
- **Analytics**: PostHog for user behavior

## Troubleshooting

### Common Issues
```bash
# Port conflicts (9999/8001)
sudo lsof -ti:9999 | xargs kill -9
sudo lsof -ti:8001 | xargs kill -9

# Docker issues
docker compose down && docker compose up --build

# Complete reset
rm -rf .next/ node_modules/ && npm install

# Memory issues (OAuth failures)
# Check memory_manager.py logs in FastAPI backend
```

### Debug Commands
```bash
# System health check
npm run claude:health

# View service logs
docker compose logs -f frontend
docker compose logs -f backend

# Individual health checks
curl http://localhost:9999/api/health
curl http://localhost:8001/health

# Test database connectivity
# (Note: test-supabase-access.js file not found - may need to be created)
```

## Security Notes
- Row Level Security (RLS) enabled on all tables
- API rate limiting implemented
- Input validation on all endpoints
- Secure session management
- Regular security scanning in CI/CD

## AI Features
- Multi-model support (OpenAI, Anthropic, Google)
- Voice assistant integration
- Proactive monitoring and alerts
- Memory persistence across sessions
- Multi-agent collaboration

## Freemium Strategy & Billing Model

### Pricing Philosophy: "Insights Free, Agents Paid"
The platform uses a strategic freemium model to maximize customer acquisition while generating revenue from AI agent actions.

### Free Tier (Customer Acquisition)
**Always Included (No Billing Setup Required):**
- Appointment confirmations & reminders (SMS/Email)
- AI Business Insights Dashboard
- AI Performance Analytics & Recommendations
- AI Alerts & Monitoring
- Basic booking system & staff scheduling

**Goal**: Hook users with valuable AI insights, create desire for AI agents to act on those insights.

### Paid Tiers (Revenue Generation)
**Usage-Based Billing (Just-in-Time Setup):**
- **AI Agents**: $0.04/1K tokens (Marketing, Revenue, Operations agents)
- **SMS Campaigns**: $0.01/message (competitive with Textedly)
- **Email Campaigns**: $0.001/message (66% cheaper than Mailchimp)
- **AI Automation**: Content generation, auto-responses, analysis requests

### Competitive Advantages
- **No monthly minimums** (vs competitors' $25-175/month base costs)
- **Smart Caching™** reduces AI costs by 60-70% automatically
- **Pay-per-use model** eliminates subscription friction
- **Industry-leading rates** for SMS/email
- **Unique AI features** no competitor offers

### Implementation Strategy
1. **Remove billing from onboarding** - Focus on value delivery
2. **Just-in-time billing modals** - Trigger when users want premium features
3. **Strategic upgrade CTAs** - "Launch Agent" buttons throughout dashboard
4. **Value-first messaging** - Show ROI before asking for payment

### Natural Upgrade Funnels
- **AI Dashboard**: Free insights → "Launch Agent" CTAs with cost estimates
- **Campaign Page**: Basic campaigns → AI-powered campaign agents
- **Throughout App**: "Let AI do this" suggestions trigger billing setup

### Revenue Model
- **Customer acquisition**: Free AI insights remove signup friction
- **Revenue generation**: AI agents that take action and drive business results
- **Expansion revenue**: More success → more AI usage → higher revenue

---
**Production system**: Test all changes, no shortcuts, real data only.
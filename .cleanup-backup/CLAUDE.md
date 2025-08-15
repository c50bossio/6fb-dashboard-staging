# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Enterprise barbershop management platform with advanced AI capabilities. Built as a production-ready system with dual architecture: Next.js frontend + FastAPI backend, designed for scalability and real-time operations.

## Architecture & Tech Stack

### Core Stack
- **Frontend**: Next.js 14 (App Router) on port 9999
- **Backend**: FastAPI Python on port 8001
- **Database**: Supabase PostgreSQL (production-only, no SQLite)
- **Deployment**: Docker + Vercel
- **Real-time**: Pusher WebSockets + Redis caching
- **Monitoring**: Sentry error tracking + PostHog analytics

### AI Integration
- **Primary**: GPT-5 (default model)
- **Secondary**: Claude Opus 4.1 (coding tasks), Gemini 2.0 (cost-effective)
- **Features**: Voice assistant, multi-agent collaboration, predictive analytics
- **Architecture**: `lib/ai-orchestrator-enhanced.js` manages model routing

## 🚨 Critical Rules

### 1. NO MOCK DATA POLICY
- **Always** use real Supabase database
- If data needed → Insert into database with proper schema
- If table missing → Create using `/database/*.sql` scripts
- Mock data breaks authentication and session management

### 2. FULL-STACK DEVELOPMENT
Every feature requires:
- Database schema (create in `/database/`)
- Backend API endpoint (FastAPI in `fastapi_backend.py`)
- Frontend UI (React components)
- Complete data flow validation
- Error handling + loading states
- Real-time updates (if applicable)

### 3. PRODUCTION MEMORY MANAGEMENT
- Use `services/memory_manager.py` for OAuth operations
- Always call `cleanup_oauth_session()` after auth operations
- Monitor memory with `get_memory_stats()` endpoint

## Development Commands

### Essential Commands
```bash
# Start development environment
./docker-dev-start.sh

# Health checks (run these first)
node test-supabase-access.js    # Database connectivity
npm run health                  # API health check
curl http://localhost:9999/api/health

# Stop everything
docker compose down
```

### Testing Commands
```bash
# Complete test suite
npm run test:all                # Unit + E2E tests
npm run test:e2e               # Playwright E2E tests
npm run test:security          # Security test suite
npm run test:nuclear           # Critical functionality tests

# Specific test types
npm run test:coverage          # Test coverage report
npm run test:cross-browser     # Cross-browser compatibility
npm run test:nuclear-e2e       # Nuclear settings E2E test
```

### Database Operations
```bash
# Database setup and seeding
npm run setup-db              # Initialize database
npm run seed-calendar          # Seed calendar data
npm run seed:analytics         # Seed analytics data
npm run migrate:recurring      # Run recurring migrations

# Database maintenance
npm run cleanup-test-data      # Clean test data
npm run cleanup-test-data:dry  # Dry run cleanup
```

### Performance & Security
```bash
# Performance testing
npm run performance:test       # Performance benchmarks
npm run performance:lighthouse # Lighthouse audit
npm run performance:analyze    # Bundle analysis

# Security testing
npm run test:security:quick    # Quick security scan
npm run test:security:pentest  # Penetration testing
npm run security:tools:install # Install security tools
```

### Deployment Commands
```bash
# Production deployment
npm run deploy:production      # Full production deploy
npm run deploy:build          # Build production containers
npm run deploy:check          # Deployment readiness check

# Monitoring
npm run monitoring:start      # Start monitoring stack
npm run backup:create         # Create system backup
```

## Key Architecture Components

### Authentication Flow
- **Entry**: `middleware.js` handles route protection
- **Session**: Supabase Auth with RLS policies
- **OAuth**: Google OAuth via `/app/auth/callback/route.js`
- **Memory**: `services/memory_manager.py` prevents OAuth loops

### AI System Architecture
- **Router**: `lib/ai-orchestrator-enhanced.js` - intelligent model selection
- **Providers**: `lib/ai-providers.js` - OpenAI, Anthropic, Google integrations
- **Cache**: `lib/ai-cache-manager.js` - response caching (60-70% cost reduction)
- **Voice**: `components/voice/` - voice personality system
- **Memory**: `lib/agentMemory.js` - conversation context management

### Database Layer
- **Client**: `lib/supabase/browser-client.js` (frontend)
- **Server**: `lib/supabase/server.js` (backend)
- **Queries**: `lib/supabase-query.js` (direct DB access)
- **Schemas**: `/database/*.sql` scripts

### Real-time Features
- **WebSockets**: Pusher configuration in `lib/pusher-client.js`
- **Live Updates**: Calendar, chat, notifications
- **Redis Cache**: Connection pooling and response caching

## Environment Configuration

### Required Variables (.env.local)
```bash
# Core Services
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GEMINI_API_KEY=

# Payment & Communication
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PUSHER_APP_ID=
NEXT_PUBLIC_PUSHER_KEY=
SENDGRID_API_KEY=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

## Service Integration Patterns

### Adding New AI Features
1. Define in `lib/ai-orchestrator-enhanced.js`
2. Add model-specific handlers in `lib/ai-providers.js`
3. Implement caching in `lib/ai-cache-manager.js`
4. Create frontend components in `components/ai/`
5. Add real-time updates via Pusher

### Database Schema Changes
1. Create migration in `/database/`
2. Update RLS policies for security
3. Modify `lib/supabase-query.js` queries
4. Update TypeScript interfaces (if using TypeScript)
5. Test with `node test-supabase-access.js`

### Real-time Feature Integration
1. Configure Pusher channels in `lib/pusher-client.js`
2. Add server-side triggers in FastAPI backend
3. Implement frontend listeners in components
4. Handle connection failures and reconnection
5. Test with network interruptions

## Common Issues & Solutions

### Authentication Issues
```bash
# Clear authentication state
npm run auth:reset
# Check OAuth memory usage
curl http://localhost:8001/api/memory/stats
# Cleanup stuck sessions
npm run cleanup-test-data
```

### Performance Issues
```bash
# Analyze bundle size
npm run performance:analyze
# Check memory leaks
npm run performance:test
# Redis cache status
docker compose logs redis
```

### Database Issues
```bash
# Test connectivity
node test-supabase-access.js
# Check RLS policies
npm run test:security:api
# Reset test data
npm run cleanup-test-data
```

## Feature Development Checklist

Before marking any feature complete:
- [ ] Database schema created with proper RLS
- [ ] Backend API endpoint implemented
- [ ] Frontend UI with loading/error states
- [ ] Real-time updates (if applicable)
- [ ] Error handling and validation
- [ ] Tests written and passing
- [ ] Security review completed
- [ ] Performance impact assessed
- [ ] Documentation updated

## Critical Files to Understand

### Core Architecture
- `fastapi_backend.py` - Main backend server with AI endpoints
- `app/layout.js` - Root layout with global providers
- `middleware.js` - Security and route protection
- `lib/supabase-query.js` - Database abstraction layer

### AI System
- `lib/ai-orchestrator-enhanced.js` - Model routing and management
- `services/memory_manager.py` - Memory management for AI operations
- `components/FloatingAIChat.js` - Main AI interface

### Business Logic
- `components/dashboard/UnifiedDashboard.js` - Main dashboard
- `app/api/` - All API routes
- `services/` - Business services (Python backend)

## Security Considerations

- All sensitive paths blocked in `middleware.js`
- RLS enabled on all database tables
- API rate limiting via `middleware/rate_limiting.py`
- Input validation on all endpoints
- Secure session management with Supabase Auth
- Environment variables properly scoped

## 🚀 Context Optimization for Claude Code

### Quick File Reference (Use these paths directly)
```bash
# Core Architecture Files
/app/layout.js                    # Next.js root layout
/fastapi_backend.py              # FastAPI main server  
/middleware.js                   # Security & routing
/components/ClientWrapper.js     # Auth wrapper
/lib/supabase/browser-client.js  # DB client

# Key API Routes
/app/api/auth/callback/route.js       # OAuth handling
/app/api/shop/products/route.js       # Products API
/app/api/marketing/campaigns/route.js # Marketing API

# Configuration
/package.json            # Scripts & dependencies
/docker-compose.yml     # Service architecture
/.env.local.example     # Environment vars
```

### Context-Efficient Commands
```bash
# Instead of: "analyze the codebase"
# Use: "check /app/api/auth/callback/route.js for OAuth issues"

# Instead of: "review all components"  
# Use: "examine /components/dashboard/UnifiedDashboard.js"

# Instead of: "look at the database"
# Use: "node test-supabase-access.js"
```

### Session Focus Areas (Pick ONE per conversation)
1. **Frontend**: Next.js components, pages, UI
2. **Backend**: FastAPI endpoints, AI services  
3. **Database**: Supabase schemas, queries
4. **Authentication**: OAuth, sessions, middleware
5. **Deployment**: Docker, Vercel, production

### Git Management for Context Efficiency
```bash
# Clean up git status (reduces context by 80%)
git add . && git commit -m "WIP: development checkpoint"

# Focus on specific changes
git diff --name-only HEAD~1  # See recent changes only
```

---

**Remember**: This is a production system with real users and data. Every change must be tested, secure, and maintain system reliability.
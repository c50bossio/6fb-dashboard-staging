# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview
Enterprise barbershop platform: Next.js 14 (port 9999) + FastAPI (port 8001) + Supabase PostgreSQL.

**Core Rules:**
1. **NO MOCK DATA** - Always use real Supabase database
2. **FULL-STACK ONLY** - Complete features: DB schema → API → UI → tests
3. **TEST FIRST** - Run `node test-supabase-access.js` before development

## Quick Start Commands
```bash
# Development
./docker-dev-start.sh              # Start dev environment
node test-supabase-access.js       # Test DB connection
npm run dev                        # Start Next.js (port 9999)
python fastapi_backend.py          # Start API (port 8001)

# Health checks
npm run health                     # API health check
curl http://localhost:9999/api/health

# Stop everything
docker compose down
```

## Essential Commands
```bash
# Testing
npm run test:all                # Full test suite
npm run test                    # Unit tests
npm run test:e2e               # End-to-end tests
npm run test:security          # Security tests

# Development
npm run dev                    # Next.js dev server
npm run build                  # Production build
npm run lint                   # ESLint check
npm run lint:fix              # Fix linting issues

# Database
npm run setup-db              # Setup database
npm run cleanup-test-data     # Clean test data
npm run seed:analytics        # Seed analytics data

# Docker
npm run docker:dev            # Start with Docker
npm run docker:stop           # Stop Docker containers

# Monitoring
npm run monitoring:start      # Start monitoring stack
npm run deploy:production     # Production deployment
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
- **FastAPI**: Main backend server with modular routers
- **Routers**: Organized by feature (auth.py, ai.py, dashboard.py)
- **Memory Management**: Critical OAuth session handling
- **Error Monitoring**: Sentry integration for production

### Frontend Architecture
- **Next.js 14**: App Router with TypeScript support
- **Real-time**: Pusher WebSocket connections
- **State Management**: React hooks + Context API
- **Authentication**: Supabase Auth with middleware protection

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
1. Test database connection: `node test-supabase-access.js`
2. Check system health: `npm run health`
3. Start dev environment: `./docker-dev-start.sh`

### After Making Changes
1. Run linting: `npm run lint:fix`
2. Run tests: `npm run test:all`
3. Check TypeScript: `npm run build`
4. Test production build works

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
- **Unit Tests**: Jest for business logic
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for user workflows
- **Security Tests**: Comprehensive security scanning

## Performance Considerations
- Redis caching reduces AI API costs 60-70%
- Memory management critical for OAuth stability
- Bundle analysis available: `npm run performance:analyze`
- Real-time updates via WebSocket connections

## Deployment
- **Development**: Docker Compose
- **Production**: Vercel (recommended) or Docker
- **Monitoring**: Integrated Sentry error tracking
- **Analytics**: PostHog for user behavior

## Troubleshooting

### Common Issues
```bash
# Port conflicts
sudo lsof -ti:9999 | xargs kill -9
sudo lsof -ti:8001 | xargs kill -9

# Docker issues
docker compose down && docker compose up --build

# Database connection issues
node test-supabase-access.js

# Clean restart
rm -rf .next/ node_modules/ && npm install
```

### Debug Commands
```bash
# View logs
docker compose logs -f frontend
docker compose logs -f backend

# Check system status
npm run health
curl http://localhost:9999/api/health
curl http://localhost:8001/health
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

---
**Production system**: Test all changes, no shortcuts, real data only.
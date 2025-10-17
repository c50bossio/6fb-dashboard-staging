# CLAUDE-REFERENCE.md

## Complete Command Reference

### Testing Commands
```bash
npm run test:all                # Full test suite (Jest + Playwright)
npm run test                    # Unit tests only (Jest)
npm run test:e2e               # End-to-end tests (Playwright)
npm run test:security          # Security scanning suite
npm run test:nuclear           # High-impact nuclear test scenarios
```

### Development Commands
```bash
npm run dev                    # Next.js dev server (port 9999)
npm run build                  # Production build + TypeScript check
npm run lint                   # ESLint check
npm run lint:fix              # Auto-fix linting issues
```

### Database Operations
```bash
npm run setup-db              # Initialize database schema
npm run cleanup-test-data     # Clean test data (supports --dry-run)
npm run seed:analytics        # Seed analytics data for testing
```

### Performance & Analysis
```bash
npm run performance:analyze   # Bundle size analysis
npm run performance:lighthouse # Lighthouse performance test
```

### Docker & Deployment
```bash
npm run docker:dev            # Start with Docker Compose
npm run docker:stop           # Stop all Docker containers
npm run monitoring:start      # Start monitoring stack (Prometheus/Grafana)
npm run deploy:production     # Full production deployment
```

## Architecture Details

### Backend Architecture
- **FastAPI**: Main backend (`fastapi_backend.py`) with modular routers
- **Routers**: Feature-based in `/routers/` (auth.py, ai.py, dashboard.py, notifications.py)
- **Memory Management**: Production-critical OAuth session handling
- **AI Integration**: Multi-model support (OpenAI, Anthropic, Google) with caching
- **Error Monitoring**: Sentry integration with memory tracking

### Frontend Architecture
- **Next.js 14**: App Router with TypeScript support and path aliases
- **Real-time**: Pusher WebSocket for live updates
- **State Management**: React hooks + Context patterns in `/contexts/`
- **Authentication**: Supabase Auth with middleware protection (`middleware.js`)
- **Testing**: Jest (unit) + Playwright (E2E) with comprehensive coverage

### Critical Dependencies & Performance
- **Memory Management**: `services/memory_manager.py` - Critical for OAuth stability
- **AI Caching**: Redis reduces AI API costs 60-70%
- **Error Monitoring**: Sentry integration with comprehensive tracking
- **Real-time**: Pusher WebSocket for live dashboard updates
- **Bundle Optimization**: Webpack analysis with `npm run performance:analyze`

## Environment Variables
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
```

### Security & Deployment
- Row Level Security (RLS) enabled on all tables
- API rate limiting implemented
- Input validation on all endpoints
- Secure session management
- **Development**: Docker Compose
- **Production**: Vercel (recommended) or Docker
- **Monitoring**: Integrated Sentry error tracking
- **Analytics**: PostHog for user behavior

### AI Features
- Multi-model support (OpenAI, Anthropic, Google)
- Voice assistant integration
- Proactive monitoring and alerts
- Memory persistence across sessions
- Multi-agent collaboration
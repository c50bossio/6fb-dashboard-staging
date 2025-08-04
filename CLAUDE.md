# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The 6FB AI Agent System is an enterprise-grade barbershop management platform powered by AI agents. It combines traditional booking management with advanced AI capabilities for business intelligence, customer insights, and operational automation.

**Architecture**: Full-stack application with Next.js frontend, FastAPI backend, and dual database support (SQLite for development, PostgreSQL for production).

## Key Technologies & Architecture

### Frontend Stack
- **Framework**: Next.js 14 (App Router) with React 18
- **Styling**: Tailwind CSS with Headless UI components
- **Calendar**: FullCalendar.io Premium with resource management
- **Charts**: Recharts for analytics visualization
- **Real-time**: Pusher for live updates and WebSocket connections

### Backend Stack
- **API**: Next.js API Routes + FastAPI Python backend
- **Database**: Supabase (PostgreSQL) for production, SQLite for development
- **Authentication**: Supabase Auth with OAuth provider support
- **AI Integration**: OpenAI GPT-4, Anthropic Claude, Google Gemini
- **Payment Processing**: Stripe with subscription management
- **Notifications**: Novu multi-channel notification system

### Development Infrastructure
- **Containerization**: Docker Compose with frontend:9999, backend:8001
- **Testing**: Triple-tool approach (Playwright + Puppeteer MCP + Computer Use AI)
- **Error Tracking**: Sentry integration
- **Analytics**: PostHog with session recording
- **Feature Flags**: Vercel Edge Config

## Common Development Commands

### Docker Development (Recommended)
```bash
# Start development environment
./docker-dev-start.sh

# Stop services
./docker-stop.sh

# View logs
docker compose logs -f

# Restart services
docker compose restart
```

### Manual Development
```bash
# Install dependencies
npm install

# Start frontend (port 9999)
npm run dev

# Start backend separately if needed
python main.py  # Simple HTTP server
# or
python fastapi_backend.py  # Full FastAPI server
```

### Testing Commands
```bash
# Run all tests
npm run test:all

# Unit tests with Jest
npm run test
npm run test:watch
npm run test:coverage

# E2E tests with Playwright
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:debug

# Cross-browser testing
npm run test:cross-browser

# Performance testing
playwright test --project=performance-tests

# Visual regression testing
playwright test --project=visual-tests

# Accessibility testing
playwright test --project=accessibility-tests
```

### Health Checks & Debugging
```bash
# Check application health
npm run health
# or
curl http://localhost:9999/api/health

# Environment validation
npm run check-env

# Database setup
npm run setup-db
```

## Architecture Patterns

### API Structure
- **Next.js API Routes**: `/app/api/` - Frontend API endpoints
- **FastAPI Backend**: Python services in `/services/` directory
- **Health Monitoring**: Comprehensive service health checks at `/api/health`

### Database Architecture
- **Development**: SQLite database (`agent_system.db`) for simplicity
- **Production**: PostgreSQL via Supabase with Row Level Security (RLS)
- **Schema Management**: Complete schemas in `/database/` directory
- **Migrations**: Supabase migrations for production deployments

### AI Agent System
- **Agent Types**: Master Coach, Financial, Client Acquisition, Operations, Brand, Growth, Strategic Mindset
- **Intelligence Services**: Located in `/services/` with real LLM integration
- **Context Management**: AI agents maintain business context across sessions
- **Multi-Model Support**: OpenAI, Anthropic, and Google AI integration

### Component Organization
```
components/
├── ai/              # AI chat and agent components
├── analytics/       # PostHog and analytics components
├── calendar/        # FullCalendar booking components
├── chat/           # Real-time chat components
├── notifications/   # Novu notification center
└── providers/      # Context providers and wrappers
```

### Authentication Flow
- **Provider**: Supabase Auth with OAuth support
- **Protected Routes**: `ProtectedRoute` component wrapper
- **User Roles**: CLIENT, BARBER, SHOP_OWNER, ENTERPRISE_OWNER, SUPER_ADMIN
- **Session Management**: Server-side session handling with middleware

## Environment Configuration

### Required Environment Variables
```bash
# Core Services (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Payment Processing
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Real-time Features
PUSHER_APP_ID=
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_CLUSTER=
```

### Optional Services
- **Sentry**: Error tracking and performance monitoring
- **PostHog**: Product analytics and session recording
- **Novu**: Multi-channel notification system
- **Vercel Edge Config**: Feature flag management

## Testing Strategy

### Triple-Tool Testing Approach
1. **Playwright**: Primary E2E testing framework with cross-browser support
2. **Puppeteer MCP Tools**: Quick debugging and Chrome-specific automation
3. **Computer Use AI**: Visual validation and UX analysis

### Test Categories
- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: API endpoint and database operation testing
- **E2E Tests**: Complete user workflow validation
- **Visual Regression**: Screenshot comparison testing
- **Performance Tests**: Core Web Vitals and load time monitoring
- **Accessibility Tests**: WCAG 2.2 AA compliance validation

### Test Configuration
- **Coverage Thresholds**: 85% minimum for components
- **Critical Components**: 95% coverage (e.g., NuclearInput.js)
- **Multi-Browser**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Parallel Execution**: Full parallelization for faster test runs

## Deployment & Production

### Docker Production Setup
```bash
# Production containers with PostgreSQL + Redis + Nginx
docker-compose -f docker-compose.prod.yml up -d
```

### Vercel Deployment (Recommended)
```bash
# Deploy to Vercel
vercel

# Environment-specific deployments
vercel --prod  # Production
vercel         # Preview/staging
```

### Health Monitoring
- **Health Endpoint**: `/api/health` with detailed service status
- **Service Dependencies**: Automatic health checks for all integrated services
- **Error Tracking**: Sentry integration for production error monitoring
- **Performance Monitoring**: PostHog analytics and Core Web Vitals

## Development Guidelines

### Code Quality Standards
- **Linting**: ESLint with Next.js configuration (never disable linting)
- **TypeScript**: Optional typing with IntelliSense support
- **Code Formatting**: Automatic formatting via ESLint --fix
- **Testing**: Comprehensive test coverage with triple-tool approach

### Security Practices
- **Authentication**: Row Level Security (RLS) on all database tables
- **API Security**: Rate limiting and input validation
- **Environment Variables**: Never commit secrets, use .env.local
- **CORS Configuration**: Proper CORS handling for API endpoints

### AI Integration Patterns
- **Multi-Model Support**: Graceful fallback between AI providers
- **Context Management**: Maintain business context across AI interactions
- **Real-time Intelligence**: AI-powered insights with live data updates
- **Error Handling**: Robust error handling for AI service failures

This system emphasizes enterprise-grade reliability, comprehensive testing, and advanced AI integration while maintaining developer productivity through Docker containerization and modern tooling.
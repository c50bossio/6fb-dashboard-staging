# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The 6FB AI Agent System is an enterprise-grade barbershop management platform powered by AI agents. It combines traditional booking management with advanced AI capabilities for business intelligence, customer insights, and operational automation.

**Architecture**: Full-stack application with Next.js 14 frontend (port 9999), FastAPI backend (port 8001), and dual database support (SQLite for development, PostgreSQL for production via Supabase).

**Important Note**: This is part of a larger monorepo structure at `/Users/bossio/` which includes multiple related projects. The main parent directory contains a comprehensive CLAUDE.md with universal guidelines that apply across all projects.

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
- **Notifications**: Internal notification system

### Development Infrastructure
- **Containerization**: Docker Compose with frontend:9999, backend:8001
- **Testing**: Triple-tool approach (Playwright + Puppeteer MCP + Computer Use AI)
- **Error Tracking**: Sentry integration
- **Analytics**: PostHog with session recording
- **Feature Flags**: Vercel Edge Config
- **Rate Limiting**: Middleware-based API protection with fallback to in-memory storage
- **Security**: GDPR compliance services and comprehensive audit logging

## Common Development Commands

### Docker Development (Recommended)
```bash
# Start development environment (creates data directory and handles containers)
./docker-dev-start.sh

# Stop services
./docker-stop.sh
# or
docker compose down

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Check service health
docker compose ps
```

### Manual Development
```bash
# Install dependencies
npm install

# Start frontend (port 9999)
npm run dev

# Start backend separately if needed
python main.py  # Simple HTTP server (port 8000)
# or
python fastapi_backend.py  # Full FastAPI server with AI endpoints (port 8000)
```

### Testing Commands
```bash
# Run all tests
npm run test:all

# Unit tests with Jest
npm run test
npm run test:watch
npm run test:coverage
npm run test:nuclear  # Critical component testing

# E2E tests with Playwright
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:debug
npm run test:nuclear-e2e  # Nuclear Input component E2E tests

# Cross-browser testing
npm run test:cross-browser

# Security testing
npm run test:security
npm run test:security:quick
npm run test:security:api
npm run test:security:gdpr

# Test utilities
npm run playwright:install
npm run playwright:install-deps
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

# Quality checks
npm run quality-check
npm run lint:fix
```

## Architecture Patterns

### API Structure
- **Next.js API Routes**: `/app/api/` - Frontend API endpoints with comprehensive routing (health, auth, etc.)
- **Primary Backend**: `/fastapi_backend.py` - Full-featured FastAPI server with middleware stack (used in Docker)
- **Fallback Backend**: `/main.py` - Simple HTTP server for deployment scenarios with limited dependencies
- **Health Monitoring**: Service health checks at both `/api/health` (Next.js) and `/health` (FastAPI)
- **Authentication**: Token-based auth with Supabase integration and development bypass for testing
- **Middleware Stack**: Rate limiting, security headers, and CORS handling

### Database Architecture
- **Development**: SQLite database stored in `/data/agent_system.db` (Docker volume mounted)
- **Production**: PostgreSQL via Supabase with Row Level Security (RLS)
- **Schema Management**: Complete schemas in `/database/` directory including multi-tenant, GDPR compliance
- **Migrations**: Supabase migrations for production deployments
- **Vector Storage**: pgvector extension support for RAG system embeddings

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
├── dashboard/       # Dashboard components (header, metrics, actions)
├── notifications/   # Internal notification center
├── providers/      # Context providers and wrappers
├── ui/             # Base UI components (Alert, Badge, Card, etc.)
└── [Critical]      # NuclearInput.js - bulletproof form input with 95% test coverage
```

### Key Components
- **NuclearInput.js**: Critical form input component with comprehensive error handling and 95% test coverage requirement
- **ProtectedRoute.js**: Authentication wrapper for secure pages
- **SupabaseAuthProvider.js**: Authentication context provider
- **ErrorBoundary.js**: Application-wide error handling

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
```bash
# Error Tracking & Analytics
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Internal Notification System
# (No external API keys required - handled internally)

# Feature Flags & AI Services
EDGE_CONFIG=
GOOGLE_AI_API_KEY=
```

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

## Critical Architecture Knowledge

### Database Schema Patterns
- **User Roles**: CLIENT, BARBER, SHOP_OWNER, ENTERPRISE_OWNER, SUPER_ADMIN
- **Multi-tenant Architecture**: Tenants table with Row Level Security (RLS)
- **Appointment System**: Complex booking state management with status tracking
- **AI Context Storage**: Vector embeddings for RAG system using pgvector extension
- **Payment Integration**: Stripe customer and subscription management

### Service Integration Patterns
- **AI Orchestrator**: Central service at `/services/ai_orchestrator_service.py` coordinates all AI agents
- **Vector Knowledge**: RAG system with embeddings stored in PostgreSQL
- **Real-time Updates**: Pusher integration for live dashboard updates
- **Notification Queue**: Async notification processing with multiple channels
- **Alert System**: Intelligent monitoring with configurable thresholds

### Critical Files & Locations
```
/app/api/health/route.js              # Comprehensive health checks for all services
/fastapi_backend.py                   # Full-featured FastAPI backend with AI endpoints
/main.py                              # Simple HTTP server for basic deployment
/services/ai_orchestrator_service.py  # Central AI coordination
/database/complete-schema.sql         # Full PostgreSQL schema with pgvector support
/components/NuclearInput.js           # Critical form component (95% coverage)
/playwright.config.js                 # Testing configuration with multi-browser support
/docker-compose.yml                   # Development container orchestration
/docker-dev-start.sh                  # Development environment startup script
/middleware/                          # Rate limiting and security middleware
/services/                            # AI agents, business logic, and integrations
```

### Development Workflow
1. **Environment Setup**: Use Docker development for consistency
2. **Database**: SQLite for dev, PostgreSQL for production via Supabase
3. **Testing**: Triple-tool approach mandatory for critical components
4. **Security**: Rate limiting, input validation, and comprehensive monitoring
5. **AI Integration**: Multi-model support with graceful fallbacks

### Production Considerations
- **Monitoring**: Comprehensive health checks at `/api/health`
- **Error Tracking**: Sentry integration for production error monitoring
- **Performance**: PostHog analytics with Core Web Vitals tracking
- **Infrastructure**: Kubernetes configs in `/infrastructure/kubernetes/`
- **Security**: GDPR compliance services and security audit logging

## Important Development Notes

### Docker Considerations
- **Frontend Port**: Always runs on 9999 (exposed as 9999:9999)
- **Backend Port**: FastAPI on 8000 internally, exposed as 8001:8000
- **Database Path**: SQLite stored in `/data/agent_system.db` with persistent volume
- **Volume Mounts**: Live code reloading enabled for components, app, lib, and public directories
- **Networks**: Services communicate via `agent-network` bridge
- **Health Checks**: Both frontend and backend have healthcheck configurations

### Backend Architecture
- **Primary Server**: `fastapi_backend.py` - Full FastAPI server with comprehensive AI endpoints (Docker default)
- **Fallback Server**: `main.py` - Minimal HTTP server for constrained deployment environments
- **AI Services**: Comprehensive integration with OpenAI, Anthropic, and Google AI with graceful fallbacks
- **Middleware Stack**: Rate limiting, security headers, and CORS handling with environment-based configuration
- **Service Integration**: Alert system, business recommendations engine, performance monitoring, and GDPR compliance
- **Dynamic Loading**: Services are imported dynamically with availability flags for graceful degradation

### Testing Philosophy
- **Nuclear Input Component**: Requires 95% test coverage due to critical nature
- **Triple-Tool Approach**: Playwright for E2E, Puppeteer for debugging, Computer Use for visual validation
- **Cross-Browser Testing**: Chrome, Firefox, Safari, and mobile variants
- **Security Testing**: Comprehensive GDPR, API security, and penetration testing suites

This system emphasizes enterprise-grade reliability, comprehensive testing, and advanced AI integration while maintaining developer productivity through Docker containerization and modern tooling.

## Project-Specific Important Notes

### Extensive Documentation & Guides
This project contains comprehensive documentation including:
- **Deployment Guides**: Multiple deployment strategies (Vercel, Docker, Render, Railway, DigitalOcean)
- **Setup Guides**: Authentication, Supabase, PostHog, Novu, and various integrations
- **Security Documentation**: GDPR compliance, security audits, and penetration testing reports
- **Performance Reports**: Load testing, cross-browser compatibility, and optimization guides
- **Integration Guides**: Calendars, payments, notifications, and third-party services

### Scripts & Automation
The `/scripts/` directory contains extensive automation including:
- **Database Management**: Setup, migration, and backup scripts
- **Security Tools**: Audit tools, vulnerability scanning, and compliance checking  
- **Testing Utilities**: Cross-browser testing, authentication testing, and integration testing
- **Deployment Automation**: Production deployment, environment setup, and monitoring
- **Development Tools**: User creation, database seeding, and debugging utilities

### Development Environment Variations
Multiple development setups are supported:
- **Docker (Recommended)**: Full containerization with SQLite for rapid development
- **Manual Setup**: Traditional npm/python setup for debugging
- **Production Docker**: Full stack with PostgreSQL, Redis, and Nginx
- **Cloud Deployment**: Vercel, Render, Railway with various database options

### Key Project Characteristics
- **Monorepo Structure**: Part of larger 6FB ecosystem with shared guidelines
- **Enterprise Focus**: GDPR compliance, security auditing, and comprehensive monitoring
- **AI-First Architecture**: Multiple AI providers with intelligent fallback strategies
- **Comprehensive Testing**: Security, performance, accessibility, and visual regression testing
- **Production Ready**: Full deployment automation and monitoring infrastructure
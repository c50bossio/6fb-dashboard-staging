# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The 6FB AI Agent System is an enterprise-grade barbershop management platform combining traditional booking management with advanced AI capabilities for business intelligence, customer insights, and operational automation. The system features a hierarchical barber operations structure that scales from individual barbers to multi-location enterprises.

**Architecture**: Full-stack application with Next.js 14 frontend (port 9999), FastAPI backend (port 8001), and Supabase PostgreSQL database for ALL environments (no SQLite, no mock data).

**Barber Operations Hierarchy**:
- **Individual Barbers**: Personal landing pages at `barbershop.com/barber-name`, custom services, pricing, and branding
- **Shop Owners**: Multi-barber management, financial oversight (commission/booth rent), product inventory
- **Enterprise Owners**: Multi-location management, cross-shop analytics, franchise operations

## 🚨 CRITICAL: SUPABASE PRODUCTION DATABASE RULE

**MANDATORY**: This application MUST use Supabase PostgreSQL as the database for ALL features. We are building for a REAL barbershop going live soon.

### Absolute Requirements:
- **USE SUPABASE ONLY**: PostgreSQL via Supabase for all data storage
- **NO MOCK DATA**: Never create fake data generators or fallbacks
- **NO SQLITE**: Not for production, not for development, not for testing
- **NO LOCAL DATABASES**: Always connect to Supabase, even during development
- **PRODUCTION READY**: Every feature must work with real Supabase tables

See `SUPABASE_PRODUCTION_RULE.md` for complete enforcement details.

## 🚨 CRITICAL: Full-Stack Development Protocol

**MANDATORY**: Every feature MUST be implemented as a complete full-stack solution. See `FULLSTACK_DEVELOPMENT_PROTOCOL.md` for detailed requirements.

### Key Rules:
- **NEVER create frontend without connecting backend**
- **NEVER create backend without frontend UI**
- **NEVER create APIs without corresponding dashboard representation**
- **ALWAYS implement complete user workflows**
- **ALWAYS test end-to-end functionality before marking complete**

This prevents half-done features and ensures every implementation provides immediate user value.

## 🚨 CRITICAL: NO MOCK DATA POLICY

**MANDATORY**: This application NEVER uses mock data. All data must come from real database operations.

### Absolute Rules:
- **NO MOCK DATA GENERATORS**: Never create `generateMock*()` functions
- **NO FALLBACK MOCK DATA**: APIs must query database, not return hardcoded data
- **DATABASE FIRST**: If database table doesn't exist, create it with proper schema
- **SEED TEST DATA**: Use database seed scripts to populate realistic test data
- **REAL QUERIES ONLY**: Every API endpoint must perform actual database operations

### When Database is Empty:
- **Create the missing tables** using proper SQL schema
- **Seed with realistic test data** using database insert operations  
- **Never generate mock objects** as a shortcut

### Enforcement:
- **Zero tolerance**: Mock data indicates incomplete implementation
- **Performance impact**: Mock data generation causes loading delays
- **Data integrity**: Only real database operations ensure consistent behavior

**If you need test data, create it in the database. If you need missing functionality, implement the real database operations.**

## Key Technologies & Architecture

### Frontend Stack
- **Framework**: Next.js 14 (App Router) with React 18
- **Styling**: Tailwind CSS with Headless UI components
- **Calendar**: FullCalendar.io Premium with resource management
- **Charts**: Recharts for analytics visualization
- **Real-time**: Pusher for live updates and WebSocket connections
- **Reviews**: Google Reviews embeds/widgets only (no internal reviews)

### Backend Stack
- **API**: Next.js API Routes + FastAPI Python backend
- **Database**: Supabase (PostgreSQL) for production, SQLite for development
- **Authentication**: Supabase Auth with OAuth provider support
- **AI Integration**: OpenAI GPT-5 (Default), Anthropic Claude Opus 4.1, Google Gemini 2.0
- **Payment Processing**: Stripe with subscription management
- **Notifications**: Internal notification system
- **Reviews**: Google My Business API integration (no internal review storage)

### Development Infrastructure
- **Containerization**: Docker Compose with frontend:9999, backend:8001
- **Testing**: Triple-tool approach (Playwright + Puppeteer MCP + Computer Use AI)
- **Error Tracking**: Sentry integration
- **Analytics**: PostHog with session recording
- **Feature Flags**: Vercel Edge Config
- **Rate Limiting**: Middleware-based API protection with fallback to in-memory storage
- **Security**: GDPR compliance services and comprehensive audit logging
- **MCP Integration**: Supabase MCP server configured in Claude Desktop with 19+ database tools

#### 🤖 Model Context Protocol (MCP) Setup
**Claude Desktop**: Full Supabase MCP server access configured with:
- **Server**: `@supabase/mcp-server-supabase@latest` 
- **Project**: `dfhqjdoydihajmjxniee.supabase.co`
- **Access**: Personal Access Token with read-only permissions
- **Tools**: 19+ database management and query tools

**Claude Code**: Direct database access via `lib/supabase-query.js` utility (bypasses MCP tool limitations)

## AI Model Configuration (Updated August 2025)

### Available Models
- **GPT-5** (OpenAI) - Default & Recommended
  - Most capable model with advanced reasoning
  - Best for complex business analysis and general queries
  - Variants: GPT-5, GPT-5-mini (faster), GPT-5-nano (lightweight)
  
- **Claude Opus 4.1** (Anthropic) - Released August 5, 2025
  - Superior for coding, technical analysis, and detailed research
  - 74.5% on SWE-bench Verified (state-of-the-art coding performance)
  - Best for software engineering and data analysis tasks
  
- **Gemini 2.0 Flash** (Google)
  - Most cost-effective option
  - Good balance of performance and price
  - Suitable for high-volume, simple queries

### Model Selection
Users can select their preferred AI model through:
1. Model selector dropdown in the AI chat interface
2. API endpoint: `GET /api/v1/ai/models` (list all available models)
3. Default model: GPT-5 (automatically selected for new sessions)

### API Endpoints
- `GET /api/v1/ai/models` - Get all available AI models
- `GET /api/v1/ai/models/{provider}` - Get models for specific provider

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

### Quick Development Workflow
```bash
# 1. Start development environment
./docker-dev-start.sh

# 2. Verify services are running
curl http://localhost:9999/api/health  # Frontend health
curl http://localhost:8001/health      # Backend health

# 3. Run tests before making changes
npm run test:nuclear    # Critical component tests
npm run test:e2e       # End-to-end tests

# 4. After making changes, run quality checks
npm run quality-check   # Linting and formatting
npm run test:all       # Full test suite
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

# Database access testing
node test-supabase-access.js  # Test Claude Code Supabase connection
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

#### 🔗 Claude Code Database Access
Claude Code has **direct Supabase database access** through a custom utility:

- **Location**: `lib/supabase-query.js` - Direct database query utility
- **Test Script**: `test-supabase-access.js` - Validates connection and functionality
- **Authentication**: Uses `SUPABASE_SERVICE_ROLE_KEY` for full database permissions
- **Capabilities**: Query tables, filter data, get schemas, execute read-only SQL
- **Tables Available**: 15+ tables including profiles, agents, tenants, notifications, analytics

**Usage Example:**
```javascript
import supabaseQuery from './lib/supabase-query.js'

// Query profiles table with filters
const profiles = await supabaseQuery.queryTable('profiles', { 
  select: 'id, email, role',
  filter: { role: 'user' },
  limit: 10 
})

// Get table schema
const schema = await supabaseQuery.getTableSchema('agents')
```

**Note**: This provides Claude Code with the same database access as the Supabase MCP server, bypassing MCP tool limitations.

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

## 🎯 Important Architectural Decisions

### Data Philosophy - STRICTLY ENFORCED
- **ZERO MOCK DATA**: System NEVER uses mock/fake data. All data comes from real database operations
- **DATABASE OPERATIONS ONLY**: Every API call must query actual database tables
- **CREATE MISSING TABLES**: If table doesn't exist, create proper SQL schema immediately  
- **SEED REALISTIC DATA**: Use database INSERT statements to populate test data, never hardcoded objects
- **EMPTY STATES**: Show loading/empty UI states when no data exists, never fake placeholder data
- **PERFORMANCE REQUIREMENT**: Mock data generation causes 10+ second loading delays - absolutely prohibited

### Reviews System
- **GOOGLE REVIEWS ONLY**: All reviews come from Google My Business/Google Reviews API
- **NO INTERNAL REVIEWS**: No reviews table in database, no custom review system
- **BENEFITS**: Better SEO, customer trust, Google handles verification/spam
- **IMPLEMENTATION**: Google Reviews widgets/embeds or Google My Business API

### Database Tables
**Required Tables**:
- `appointments` - Booking management and scheduling
- `transactions` - Financial tracking and commissions
- `barbershops` - Shop information
- `barbershop_staff` - Staff and barber management
- `customers` - Customer profiles
- `services` - Service catalog
- `barber_availability` - Schedule management

**NOT Required**:
- ❌ `reviews` - Use Google Reviews instead
- ❌ `ratings` - Part of Google Reviews
- ❌ Mock data tables - Use real data only

### Financial Models
- **Commission Model**: Barber receives percentage (e.g., 60%) of service revenue
- **Booth Rent Model**: Barber pays fixed weekly/monthly rent
- **Tips**: Can go 100% to barber or split with shop

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
- **Barber Customization**: Individual barber landing pages, services, and branding
- **Financial Arrangements**: Commission, booth rent, and hybrid payment models
- **Product Inventory**: POS system with inventory tracking and commission management
- **View Switching**: Shop owners can view barber dashboards (read-only)

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
/database/barber-operations-schema.sql # Barber hierarchy and customization schema
/components/NuclearInput.js           # Critical form component (95% coverage)
/playwright.config.js                 # Testing configuration with multi-browser support
/docker-compose.yml                   # Development container orchestration
/docker-dev-start.sh                  # Development environment startup script
/middleware/                          # Rate limiting and security middleware
/services/                            # AI agents, business logic, and integrations

# Barber Operations Files
/app/[barbershop]/[barber]/page.js   # Dynamic barber landing pages
/app/(protected)/barber/profile/     # Barber profile management
/components/barber-landing/          # Barber page components
/components/pos/                     # Point of sale components
```

### Common Development Patterns

#### Adding New API Endpoints
1. **Next.js API Route**: Create in `/app/api/[endpoint]/route.js`
2. **FastAPI Endpoint**: Add to `/fastapi_backend.py` or create service module
3. **Frontend Integration**: Add API call in `/lib/api.js`
4. **Type Safety**: Define interfaces in relevant component files
5. **Testing**: Add tests in `/__tests__/api/` directory

#### Creating New Components
1. **Component Location**: `/components/[category]/ComponentName.js`
2. **Styling**: Use Tailwind CSS classes with design system tokens
3. **State Management**: Use React hooks or context providers
4. **Accessibility**: Include ARIA labels and keyboard navigation
5. **Testing**: Add unit tests in `/__tests__/components/`

#### Database Operations
1. **Development**: SQLite operations via direct file access
2. **Production**: Supabase operations via `lib/supabase-query.js`
3. **Schema Changes**: Update `/database/complete-schema.sql`
4. **Migrations**: Use Supabase migration system for production

#### AI Integration
1. **Service Creation**: Add to `/services/` directory
2. **API Integration**: Import in `/fastapi_backend.py`
3. **Error Handling**: Use graceful fallbacks between providers
4. **Context Management**: Store conversation context for session continuity

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

## Troubleshooting Common Issues

### Docker Issues
```bash
# Container startup failures
docker compose down && docker compose up --build -d

# Database connection issues
rm -rf data/agent_system.db && ./docker-dev-start.sh

# Port conflicts
docker compose down && docker system prune -f
```

### Frontend Issues
```bash
# Build failures
rm -rf .next/ node_modules/ && npm install && npm run build

# Hot reload not working
docker compose restart frontend

# TypeScript errors
npx tsc --noEmit  # Check types without building
```

### Backend Issues
```bash
# FastAPI startup failures
docker compose logs backend  # Check error logs

# Database migration issues
python -c "import database.async_database_init; database.async_database_init.init_database()"

# AI service connection issues
curl http://localhost:8001/ai/health  # Check AI service status
```

### Database Access
```bash
# Test Supabase connection (Claude Code)
node test-supabase-access.js

# SQLite operations (Development)
sqlite3 data/agent_system.db ".tables"  # List tables
sqlite3 data/agent_system.db ".schema profiles"  # View schema
```

This system emphasizes enterprise-grade reliability, comprehensive testing, and advanced AI integration while maintaining developer productivity through Docker containerization and modern tooling.
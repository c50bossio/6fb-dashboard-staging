# Complete Setup & Deployment Guide

**6FB Barbershop Platform - Enterprise barbershop management solution**

Production: **bookedbarber.com** | Development: **localhost:9999**

Architecture: **Next.js 14** (port 9999) + **FastAPI** (port 8001) + **Supabase PostgreSQL**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Payment Integration (Stripe)](#payment-integration-stripe)
5. [Communication Services](#communication-services)
6. [AI Services Setup](#ai-services-setup)
7. [Development Workflow](#development-workflow)
8. [Testing & Validation](#testing--validation)
9. [Deployment Options](#deployment-options)
10. [Production Checklist](#production-checklist)
11. [Monitoring & Analytics](#monitoring--analytics)
12. [Troubleshooting](#troubleshooting)
13. [Security Configuration](#security-configuration)
14. [Architecture Reference](#architecture-reference)

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ (for FastAPI backend)
- Docker (recommended for development)
- Git

### Installation & Startup
```bash
# 1. Clone and install dependencies
git clone <repository>
cd "6FB AI Agent System"
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys (see Environment Configuration section)

# 3. Start development services
./docker-dev-start.sh          # All services with Docker (recommended)
# OR manually:
npm run dev                     # Frontend (port 9999)
python simple_backend.py       # Backend (port 8001)

# 4. Validate setup
npm run claude:health           # Check all services
npm run lint && npm run build  # Verify code quality
```

### First-Time Access
1. Navigate to `http://localhost:9999`
2. Sign up with test credentials or create new account
3. Complete onboarding flow to set up your barbershop

---

## Environment Configuration

### Core Required Variables

These variables are **mandatory** for system startup:

```bash
# Database (Required - System won't start without these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Services (At least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Payments (Required for production)
STRIPE_SECRET_KEY=sk_live_...           # or sk_test_... for testing
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
```

### Communication & Notifications

```bash
# SMS & Email Services
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Real-time Updates
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=us2

# Production Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Optional Integrations

```bash
# Google Services
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALENDAR_API_KEY=...

# Monitoring & Analytics
SENTRY_DSN=...
POSTHOG_API_KEY=...

# Inventory Management
CIN7_API_KEY=...
CIN7_API_URL=https://api.cin7.com

# Performance & Caching
REDIS_URL=redis://localhost:6379
```

---

## Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create new project
2. Copy your project URL and keys from Settings → API
3. Enable required extensions in SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2. Apply Database Migrations

```bash
# Apply dashboard and AI tables migration
./scripts/run-dashboard-migration.sh

# Or manually via Supabase SQL editor:
# Copy contents of migrations/create_dashboard_ai_tables.sql
```

### 3. Set Up Development Test Data

Create test accounts in Supabase Dashboard → Authentication → Users:

- **Barber**: `dev-barber@test.com` / `TestPass123!`
- **Shop Owner**: `dev-shop@test.com` / `TestPass123!`
- **Enterprise**: `dev-enterprise@test.com` / `TestPass123!`

Then add profiles in SQL Editor:

```sql
INSERT INTO profiles (id, email, full_name, role, onboarding_completed)
VALUES 
  ('<user-id>', 'dev-barber@test.com', 'Dev Barber', 'BARBER', false),
  ('<user-id>', 'dev-shop@test.com', 'Dev Shop Owner', 'SHOP_OWNER', false),
  ('<user-id>', 'dev-enterprise@test.com', 'Dev Enterprise', 'ENTERPRISE_OWNER', false);
```

### Key Database Tables

The platform uses these core tables:
- `profiles`, `barbershops`, `barbershop_staff` (user management)
- `customers`, `services`, `appointments` (business operations)
- `transactions`, `stripe_accounts` (payments)

---

## Payment Integration (Stripe)

### Development Setup

1. Create [Stripe account](https://dashboard.stripe.com/register)
2. Get API keys from Developers → API keys
3. Use test keys first (`sk_test_...` and `pk_test_...`)
4. Add to `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Enable Stripe Connect (For Barber Payouts)

1. In Stripe Dashboard: Connect → Settings → Get started
2. Choose "Express" account type
3. Configure platform:
   - Business name: Your barbershop platform
   - Platform type: Marketplace
   - Business model: Service marketplace

### Set Up Webhooks

1. Developers → Webhooks → Add endpoint
2. Add URL: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `account.updated`
   - `charge.succeeded`
   - `charge.failed`
   - `payout.created`
4. Copy webhook secret to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Test Payment Integration

Use these test cards:
- Success card: `4242 4242 4242 4242`
- Decline card: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

### Production Activation

1. Switch to live API keys in environment
2. Update webhook URLs to production domain
3. Complete Stripe platform activation (Connect → Settings → Platform settings)
4. Usually approved within 1-2 business days

---

## Communication Services

### SendGrid Email Setup

1. Create [SendGrid account](https://sendgrid.com)
2. Create API key with Mail Send permissions
3. Set up sender authentication (domain or single sender)
4. Add to environment:

```bash
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Twilio SMS Setup

1. Create [Twilio account](https://twilio.com)
2. Get Account SID and Auth Token from Console
3. Purchase phone number for SMS sending
4. Add to environment:

```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### Pusher Real-time Updates

1. Create [Pusher account](https://pusher.com)
2. Create new app in Pusher Channels
3. Get credentials from App Keys section
4. Add to environment:

```bash
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=us2
```

---

## AI Services Setup

### Multi-Provider Configuration

The platform supports multiple AI providers with automatic failover:

1. **OpenAI** (Primary)
2. **Anthropic** (Secondary)
3. **Google AI** (Fallback)

### API Key Setup

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google AI
GOOGLE_AI_API_KEY=...
```

### Cost Optimization

The platform includes Redis caching to reduce AI API costs by up to 60%. Configure Redis:

```bash
REDIS_URL=redis://localhost:6379
```

---

## Development Workflow

### Daily Development Commands

```bash
# Start development environment
./docker-dev-start.sh        # All services with Docker
# OR
npm run dev                   # Frontend only
python simple_backend.py     # Backend separately

# Code quality checks (run before commits)
npm run lint                  # ESLint validation
npm run build                 # Production build test
npm run test                  # Unit tests

# System validation
npm run claude:health         # Service connectivity check
npm run claude:validate       # Combined lint + build check
```

### Project Structure Navigation

```
app/                    # Next.js app directory
├── api/               # API routes (100+ endpoints)
├── dashboard/         # Dashboard pages
└── layout.js          # Root layout

components/            # React components
├── ui/               # Base UI components (use these first!)
├── dashboard/        # Dashboard-specific components
└── onboarding/       # Onboarding flow components

lib/                   # Utility libraries
├── supabase-query.js # Database operations
└── utils.js          # Common utilities

services/              # Business logic
├── memory_manager.py # Critical OAuth management
└── ai_service.py     # AI orchestration

database/              # Database schemas and migrations
scripts/               # Utility scripts
```

---

## Testing & Validation

### Essential Testing Commands

```bash
# Code quality
npm run lint                    # ESLint validation
npm run build                   # Production build test (300+ pages)
npm run test                    # Unit tests

# Integration testing
npm run test:e2e               # End-to-end tests
npm run test:e2e:booking       # Booking flow
npm run test:e2e:payment       # Payment processing
npm run test:e2e:mobile        # Mobile responsiveness

# System validation
npm run claude:health          # Service connectivity
npm run claude:validate        # Lint + build check
npm run check:production       # Production readiness
```

### Development Testing Workflow

1. Start dev server: `npm run dev`
2. Sign in with test accounts at localhost:9999/login
3. Test onboarding flows for each role
4. Verify dashboard features and API integration
5. Test payment flows with Stripe test cards
6. Validate mobile responsiveness

### Pre-Deployment Validation

```bash
# Complete validation suite
npm run lint && npm run build && npm run test:all
```

This command must pass before any production deployment.

---

## Deployment Options

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Add environment variables in Vercel dashboard:
# Project Settings → Environment Variables
```

### Alternative Platforms

The platform is compatible with:
- **Netlify**: Static site deployment with serverless functions
- **AWS Amplify**: Full-stack deployment with AWS integrations
- **Google Cloud Run**: Containerized deployment
- **Azure Static Web Apps**: Microsoft cloud deployment
- **Self-hosted Node.js**: Traditional server deployment

### Docker Deployment

```bash
# Build production image
docker build -t barbershop-platform .

# Run with environment file
docker run --env-file .env.production -p 9999:9999 barbershop-platform
```

---

## Production Checklist

Before going live, verify all items:

### Infrastructure
- [ ] All environment variables configured in hosting platform
- [ ] Database migrations applied
- [ ] SSL certificate configured
- [ ] Domain pointed to deployment
- [ ] CDN configured (recommended)

### Integrations
- [ ] Stripe webhooks updated with production URLs
- [ ] OAuth redirect URLs updated in auth providers
- [ ] SendGrid domain authentication configured
- [ ] Twilio phone number verified

### Monitoring
- [ ] Error monitoring configured (Sentry)
- [ ] Analytics configured (PostHog)
- [ ] Health check endpoints responding
- [ ] Log aggregation set up

### Security
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] API rate limiting configured
- [ ] HTTPS enforced
- [ ] Environment variables secured

### Testing
- [ ] All tests passing (`npm run test:all`)
- [ ] End-to-end tests validated
- [ ] Payment flows tested with live Stripe
- [ ] Mobile responsiveness verified

---

## Monitoring & Analytics

### Built-in Monitoring

The platform includes several monitoring endpoints:

- **Health Check**: `GET /api/health`
- **AI Performance**: `GET /api/ai/metrics`
- **System Status**: `npm run claude:health`

### External Services

- **Database**: Supabase dashboard metrics
- **Payments**: Stripe dashboard analytics
- **Errors**: Sentry error tracking
- **Performance**: Hosting platform analytics
- **AI Usage**: Provider dashboards (OpenAI/Anthropic/Google)

### Key Metrics to Track

1. **Performance Metrics**
   - Page load times (<3s target)
   - API response times (<500ms target)
   - Database query performance

2. **Business Metrics**
   - User engagement rates
   - Booking completion rates
   - Payment success rates
   - Revenue tracking

3. **System Health**
   - Error rates and types
   - Service uptime
   - Resource utilization

---

## Troubleshooting

### Common Issues & Solutions

#### Port Conflicts
```bash
# Kill processes on development ports
lsof -ti:9999 | xargs kill -9  # Kill Next.js
lsof -ti:8001 | xargs kill -9  # Kill FastAPI
```

#### Database Connection Issues
```bash
# Test Supabase connection
node test-supabase-access.js

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### Build Errors
```bash
# Clean and rebuild
rm -rf .next/ node_modules/
npm install
npm run dev
```

#### Docker Issues
```bash
# Reset Docker environment
docker compose down
docker compose up --build

# View logs
docker compose logs -f frontend
docker compose logs -f backend
```

### Debug Commands

```bash
# Filter logs for errors
npm run dev | grep -E "error|warning"

# Check system status
npm run health

# Validate production readiness
npm run check:production
```

### Performance Issues

#### Memory Issues
- Check `services/memory_manager.py` for OAuth memory management
- Monitor Node.js heap usage
- Consider increasing container memory limits

#### API Response Times
- Enable Redis caching for database queries
- Check Supabase connection pool settings
- Monitor slow query logs

---

## Security Configuration

### Database Security

The platform implements comprehensive database security:

- **Row Level Security (RLS)**: Enabled on all tables
- **User isolation**: Each user can only access their own data
- **API validation**: Input sanitization and validation
- **Connection security**: SSL/TLS encryption

### Authentication Security

- **Session management**: Secure sessions via Supabase Auth
- **Password policies**: Strong password requirements
- **OAuth integration**: Secure third-party authentication
- **API rate limiting**: Protection against abuse

### Security Checklist

- [ ] `.env.local` in `.gitignore`
- [ ] Supabase RLS policies active
- [ ] HTTPS enabled in production
- [ ] API rate limits configured
- [ ] Error tracking active (no sensitive data logged)
- [ ] Regular dependency updates scheduled

### Security Best Practices

1. **Environment Variables**: Never commit secrets to git
2. **API Security**: Validate all inputs, use proper HTTP status codes
3. **Database Access**: Use service role key only in secure environments
4. **Error Handling**: Log errors securely without exposing sensitive data

---

## Architecture Reference

### System Overview

```
Frontend (Next.js 14, Port 9999)
├── App Router with SSR/SSG
├── React 18 + Tailwind CSS
├── Real-time WebSocket (Pusher)
└── Authentication (Supabase Auth)

Backend (FastAPI, Port 8001)
├── Modular router architecture
├── AI service orchestration
├── OAuth memory management
└── WebSocket support

Database (Supabase PostgreSQL)
├── Real-time subscriptions
├── Row Level Security (RLS)
├── Built-in authentication
└── File storage

External Integrations
├── AI: OpenAI, Anthropic, Google
├── Payments: Stripe Connect
├── Communications: SendGrid, Twilio
├── Real-time: Pusher
└── Analytics: PostHog, Sentry
```

### Key Design Patterns

1. **Multi-tenant Architecture**: Organization-based data isolation
2. **Role-based Access Control**: CLIENT → BARBER → SHOP_OWNER → ENTERPRISE_OWNER
3. **Event-driven Updates**: Real-time synchronization across clients
4. **Microservice Integration**: Modular service architecture
5. **Caching Strategy**: Redis for AI responses and database queries

### Scalability Considerations

- **Database**: PostgreSQL with read replicas
- **Caching**: Redis cluster for high availability
- **CDN**: CloudFlare for static asset delivery
- **Auto-scaling**: Kubernetes deployment with horizontal pod autoscaling
- **Load balancing**: AWS Application Load Balancer

---

## Support Resources

### Documentation
- **API Reference**: `/docs/API_DOCUMENTATION.md`
- **Database Schema**: `/docs/DATABASE_SCHEMA.md`
- **Test Guide**: `/__tests__/production-ready/README.md`
- **Deployment Guide**: `/docs/DEPLOYMENT_GUIDE.md`

### Development Support
- **Health Checks**: Run `npm run claude:health`
- **System Validation**: Run `npm run claude:validate`
- **Error Logs**: Check Sentry dashboard
- **Performance Metrics**: PostHog analytics

### Community & Issues
- **GitHub Issues**: Report bugs and feature requests
- **Documentation Updates**: Submit PRs for doc improvements
- **Feature Requests**: Use GitHub Discussions

---

## Development Rules & Best Practices

### Critical Rules

1. **NO MOCK DATA** - Always use real Supabase database
2. **COMPLETE FEATURES** - Every feature must work end-to-end (DB → API → UI → Tests)
3. **TEST EVERYTHING** - Run `npm run lint && npm run build && npm run test:all` before commits
4. **USE EXISTING COMPONENTS** - Check `components/ui/` before creating new ones

### Code Quality Standards

- **ESLint**: All code must pass linting
- **TypeScript**: Use TypeScript for type safety
- **Testing**: Maintain 80%+ test coverage
- **Documentation**: Document all API endpoints and complex functions

### Deployment Standards

- **Environment Parity**: Development, staging, and production must be identical
- **Zero Downtime**: Use blue-green deployments
- **Rollback Strategy**: Always have a rollback plan
- **Monitoring**: Set up alerts for critical metrics

---

*This platform is production-ready with real authentication, live database connections, and comprehensive testing. No mock data is used anywhere in the system.*
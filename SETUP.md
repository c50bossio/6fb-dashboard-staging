# Complete Setup Guide - 6FB Barbershop Platform

Enterprise barbershop platform: **Next.js 14** (port 9999) + **FastAPI** (port 8001) + **Supabase PostgreSQL**

Production: **bookedbarber.com** | Development: **localhost:9999**

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (see Environment Setup below)
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Start development
./docker-dev-start.sh          # All services with Docker (recommended)
# OR manually:
npm run dev                     # Frontend (port 9999)
python simple_backend.py       # Backend (port 8001)

# 4. Validate setup
npm run claude:health           # Check all services
npm run lint && npm run build  # Verify code quality
```

## 📋 Environment Configuration

### Core Required Variables
```bash
# Database (Required - System won't start without these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI (At least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Payments (Required for production)
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for testing
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
```

### Communication & Notifications
```bash
# SMS & Email
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

# Performance
REDIS_URL=redis://localhost:6379
```

## 🗄️ Database Setup

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

## 💳 Stripe Payment Setup

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
- Success card: `4242 4242 4242 4242`
- Decline card: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

### Production Activation
1. Switch to live API keys in environment
2. Update webhook URLs to production domain
3. Complete Stripe platform activation (Connect → Settings → Platform settings)
4. Usually approved within 1-2 business days

## 🚀 Deployment Options

### Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod
# Add environment variables in Vercel dashboard
```

### Other Platforms
Compatible with: Netlify, AWS Amplify, Google Cloud Run, Azure Static Web Apps, Self-hosted Node.js

### Production Checklist
- [ ] All environment variables configured in hosting platform
- [ ] Database migrations applied
- [ ] SSL certificate configured
- [ ] Domain pointed to deployment
- [ ] Stripe webhooks updated with production URLs
- [ ] OAuth redirect URLs updated in auth providers
- [ ] Error monitoring configured (Sentry)
- [ ] Analytics configured (PostHog)

## 🧪 Testing & Validation

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

### Development Testing
1. Start dev server: `npm run dev`
2. Sign in with test accounts at localhost:9999/login
3. Test onboarding flows for each role
4. Verify dashboard features and API integration

## 🔧 Troubleshooting

### Common Issues
**Port conflicts:**
```bash
lsof -ti:9999 | xargs kill -9  # Kill Next.js
lsof -ti:8001 | xargs kill -9  # Kill FastAPI
```

**Database connection:**
```bash
node test-supabase-access.js   # Verify DB connection
```

**Build errors:**
```bash
rm -rf .next/ node_modules/
npm install
npm run dev
```

**Docker issues:**
```bash
docker compose down
docker compose up --build
```

### Debug Commands
```bash
npm run dev | grep -E "error|warning"  # Filter logs
docker compose logs -f frontend        # View frontend logs
docker compose logs -f backend         # View backend logs
npm run health                         # System status
```

## 🔐 Security Configuration

- Row Level Security (RLS) enabled on all database tables
- API rate limiting implemented
- Input validation and sanitization
- Secure session management via Supabase Auth
- Environment variables never committed to git

### Security Checklist
- [ ] `.env.local` in `.gitignore`
- [ ] Supabase RLS policies active
- [ ] HTTPS enabled in production
- [ ] API rate limits configured
- [ ] Error tracking active
- [ ] Regular dependency updates scheduled

## 🏗️ Architecture Quick Reference

```
app/api/           # Next.js API routes (100+ endpoints)
components/ui/     # Base UI components (use these first!)
lib/supabase-query.js    # All database operations
services/memory_manager.py # Critical OAuth management
routers/           # FastAPI feature modules
```

### Key Database Tables
- `profiles`, `barbershops`, `barbershop_staff` (user management)
- `customers`, `services`, `appointments` (business operations)
- `transactions`, `stripe_accounts` (payments)

## 🎯 First Steps After Deployment

1. **Create Admin Account**
   - Sign up through normal flow
   - Update role to `SUPER_ADMIN` in Supabase

2. **Configure First Barbershop**
   - Create barbershop via admin account
   - Add services and staff
   - Configure business settings

3. **Test Core Workflows**
   - Book appointment as customer
   - Process test payment
   - Verify notifications work
   - Check AI insights generation

## 📊 Monitoring

- **Database**: Supabase dashboard metrics
- **Payments**: Stripe dashboard
- **Errors**: Sentry dashboard
- **Performance**: Hosting platform analytics
- **AI Usage**: Provider dashboards (OpenAI/Anthropic)

## 🆘 Support Resources

- **Documentation**: `/docs` folder
- **API Reference**: `/docs/API_DOCUMENTATION.md`
- **Database Schema**: `/docs/DATABASE_SCHEMA.md`
- **Test Guide**: `/__tests__/production-ready/README.md`

---

## ⚡ Development Rules

1. **NO MOCK DATA** - Always use real Supabase database
2. **COMPLETE FEATURES** - Every feature must work end-to-end (DB → API → UI → Tests)
3. **TEST EVERYTHING** - Run `npm run lint && npm run build && npm run test:all` before commits
4. **USE EXISTING COMPONENTS** - Check `components/ui/` before creating new ones

**Remember**: This platform is production-ready with no mock data, real authentication, live database connections, and comprehensive testing.
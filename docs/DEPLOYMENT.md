# Production Deployment Guide

**6FB AI Agent System - Barbershop Management Platform**
**Last Updated**: October 9, 2025
**Version**: 0.9.0

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Vercel Deployment](#vercel-deployment-recommended)
5. [Docker Deployment](#docker-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security Checklist](#security-checklist)

---

## Prerequisites

### Required Accounts & Services

- **Supabase Account**: PostgreSQL database and authentication
- **Vercel Account**: Hosting and deployment (or Docker hosting)
- **Stripe Account**: Payment processing (required for POS system)
- **Twilio Account**: SMS notifications (optional but recommended)
- **Domain Name**: Custom domain for production (e.g., bookedbarber.com)

### Technical Requirements

- Node.js 18.19+ installed
- Git installed
- Access to DNS management (for domain configuration)
- Supabase project created with PostgreSQL database

### Estimated Setup Time

- **First-time deployment**: 2-3 hours
- **Subsequent deployments**: 5-10 minutes

---

## Environment Setup

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd "6FB AI Agent System"
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your production values:

```bash
# ========================================
# CORE SERVICES (REQUIRED)
# ========================================

# Supabase - Database & Authentication
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ========================================
# PAYMENT PROCESSING (REQUIRED FOR POS)
# ========================================

# Stripe - Use LIVE keys for production
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# ========================================
# AI SERVICES (REQUIRED FOR AI FEATURES)
# ========================================

# OpenAI - GPT models
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx

# Anthropic - Claude models
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx

# ========================================
# SMS NOTIFICATIONS (RECOMMENDED)
# ========================================

# Twilio - Customer notifications
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# ========================================
# MONITORING & ANALYTICS (OPTIONAL)
# ========================================

# Sentry - Error tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxx

# PostHog - Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ========================================
# ENVIRONMENT
# ========================================

NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Environment Variable Checklist

**Required (Production Blockers)**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY` (LIVE key)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (LIVE key)

**Recommended**:
- [ ] `OPENAI_API_KEY` (for AI features)
- [ ] `TWILIO_ACCOUNT_SID` (for SMS notifications)
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`

**Optional**:
- [ ] `NEXT_PUBLIC_SENTRY_DSN` (error tracking)
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` (analytics)

---

## Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: 6FB Barbershop System
   - **Database Password**: Strong password (save securely)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for database provisioning (2-3 minutes)

### Step 2: Get Supabase Credentials

1. In Supabase dashboard, go to **Settings → API**
2. Copy the following values:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Step 3: Run Database Schema

**Important**: Run schema files in the correct order.

#### Option A: Using Supabase SQL Editor (Recommended)

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Run the following schemas in order:

**Schema 1: Core Tables**
```sql
-- Copy contents from: database/complete-schema.sql
-- This creates: profiles, barbershops, services, appointments, customers, products, etc.
```

**Schema 2: Barber Operations**
```sql
-- Copy contents from: database/barber-operations-schema.sql
-- This creates: barber_customizations, financial_arrangements, product_sales, inventory_adjustments
```

**Schema 3: Enable Row Level Security (RLS)**
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_arrangements ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (see database/setup-rls-policies.sql for examples)
```

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Step 4: Create Initial Admin User

1. Go to **Authentication → Users** in Supabase dashboard
2. Click "Add user" → "Create new user"
3. Fill in:
   - **Email**: admin@yourdomain.com
   - **Password**: Strong password
   - **Auto Confirm User**: Yes
4. Click "Create user"

### Step 5: Create Initial Barbershop Record

Run this SQL in the SQL Editor:

```sql
-- Create initial barbershop
INSERT INTO barbershops (name, address, city, state, zip, country, phone, email, timezone)
VALUES (
  'Your Barbershop Name',
  '123 Main St',
  'Your City',
  'CA',
  '12345',
  'US',
  '+1234567890',
  'info@yourdomain.com',
  'America/Los_Angeles'
);

-- Link admin user to barbershop as shop owner
INSERT INTO barbershop_staff (barbershop_id, user_id, role, is_active)
SELECT
  (SELECT id FROM barbershops ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM auth.users WHERE email = 'admin@yourdomain.com' LIMIT 1),
  'SHOP_OWNER',
  true;
```

### Step 6: Verify Database Setup

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check initial data
SELECT * FROM barbershops;
SELECT * FROM barbershop_staff;
```

---

## Vercel Deployment (Recommended)

Vercel provides the easiest deployment with automatic HTTPS, global CDN, and seamless integration.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Initialize Project

```bash
# From project root directory
vercel

# Answer prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account/team
# - Link to existing project? No
# - What's your project's name? 6fb-barbershop
# - In which directory is your code located? ./
# - Want to override settings? No
```

### Step 4: Configure Environment Variables

**Option A: Via Vercel Dashboard**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add each variable from `.env.local`:
   - Click "Add"
   - Enter key name
   - Enter value
   - Select **Production** environment
   - Click "Save"
5. Repeat for all required variables

**Option B: Via Vercel CLI**

```bash
# Add environment variables one by one
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste value when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

# ... repeat for all variables
```

### Step 5: Deploy to Production

```bash
# Deploy to production
vercel --prod

# Output will show:
# ✅ Production: https://your-project.vercel.app
```

### Step 6: Configure Custom Domain

1. Go to **Settings → Domains** in Vercel dashboard
2. Click "Add"
3. Enter your domain: `bookedbarber.com`
4. Click "Add"
5. Vercel will provide DNS configuration instructions

**Update DNS Records** (in your domain registrar):

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

6. Wait for DNS propagation (5-60 minutes)
7. Vercel will automatically provision SSL certificate

### Step 7: Verify Deployment

```bash
# Test production deployment
curl https://yourdomain.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-09T10:30:00Z"}
```

---

## Docker Deployment

For self-hosted deployments or when Vercel is not available.

### Step 1: Build Docker Images

```bash
# Build frontend image
docker build -t 6fb-frontend:latest -f Dockerfile.frontend .

# Build backend image (if using FastAPI)
docker build -t 6fb-backend:latest -f Dockerfile.backend .
```

### Step 2: Create Docker Compose Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  frontend:
    image: 6fb-frontend:latest
    ports:
      - "9999:9999"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Step 3: Configure Nginx

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:9999;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Proxy to Next.js
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 4: Generate SSL Certificates

**Option A: Let's Encrypt (Free)**

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Copy to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/
```

**Option B: Use Cloudflare (Recommended for production)**

Cloudflare provides free SSL/TLS and DDoS protection.

### Step 5: Start Production Containers

```bash
# Load environment variables
source .env.local

# Start containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 6: Configure Auto-Restart

Create systemd service file: `/etc/systemd/system/6fb-barbershop.service`

```ini
[Unit]
Description=6FB Barbershop Management System
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/6FB AI Agent System
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.prod.yml down
User=root

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable 6fb-barbershop
sudo systemctl start 6fb-barbershop
```

---

## Post-Deployment Verification

### Step 1: Health Check

Test application health endpoint:

```bash
curl https://yourdomain.com/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-10-09T10:30:00Z",
  "version": "0.9.0",
  "services": {
    "database": "connected",
    "authentication": "configured"
  }
}
```

### Step 2: Authentication Test

Test login flow:

1. Navigate to `https://yourdomain.com/login`
2. Enter admin credentials created earlier
3. Verify successful login and redirect to dashboard
4. Check that user profile loads correctly

### Step 3: API Endpoint Tests

Test critical API endpoints:

```bash
# Login and get token
TOKEN="your-jwt-token-from-login"

# Test schedule API
curl https://yourdomain.com/api/shop/schedule \
  -H "Authorization: Bearer $TOKEN"

# Test customers API
curl https://yourdomain.com/api/shop/customers \
  -H "Authorization: Bearer $TOKEN"

# Test products API
curl https://yourdomain.com/api/shop/products \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4: Database Connectivity

Verify database connection:

```bash
# Check database from Supabase dashboard
# Go to: Table Editor → Select any table
# Should show data without errors
```

### Step 5: Critical Feature Tests

**Manual testing checklist**:

- [ ] User can log in successfully
- [ ] Schedule page loads with appointments
- [ ] Customer search returns results
- [ ] Products page shows inventory
- [ ] POS transaction can be created
- [ ] Inventory adjustment can be recorded
- [ ] Barber customization can be saved

### Step 6: Performance Verification

Test load times:

```bash
# Install wrk (load testing tool)
# macOS: brew install wrk
# Ubuntu: sudo apt-get install wrk

# Test homepage
wrk -t4 -c100 -d30s https://yourdomain.com

# Expected:
# Latency: <2s for 95th percentile
# Requests/sec: >100
```

---

## Monitoring & Maintenance

### Set Up Error Tracking (Sentry)

If using Sentry:

1. Go to [sentry.io](https://sentry.io)
2. Create new project (Next.js)
3. Copy DSN to `NEXT_PUBLIC_SENTRY_DSN`
4. Deploy with Sentry configuration

Sentry will automatically capture:
- JavaScript errors
- API errors
- Performance issues
- User context

### Set Up Analytics (PostHog)

If using PostHog:

1. Go to [app.posthog.com](https://app.posthog.com)
2. Create new project
3. Copy API key to `NEXT_PUBLIC_POSTHOG_KEY`
4. Deploy with PostHog configuration

PostHog tracks:
- Page views
- User actions
- Feature usage
- Conversion funnels

### Database Backups

**Enable automatic backups in Supabase**:

1. Go to Supabase dashboard → **Database → Backups**
2. Enable **Point-in-Time Recovery**
3. Set backup retention: 7 days minimum

**Manual backup**:

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or using pg_dump
pg_dump -h db.yourproject.supabase.co -U postgres -d postgres > backup.sql
```

### Application Logs

**View logs**:

```bash
# Vercel deployment
vercel logs --follow

# Docker deployment
docker-compose -f docker-compose.prod.yml logs -f frontend
```

**Log retention**:
- Vercel: 14 days (Hobby plan), 30+ days (Pro plan)
- Docker: Configure log rotation in `/etc/docker/daemon.json`

### Health Monitoring

Set up uptime monitoring using:

- **UptimeRobot** (free): [uptimerobot.com](https://uptimerobot.com)
- **Pingdom** (paid): [pingdom.com](https://pingdom.com)
- **Better Stack** (free tier): [betterstack.com](https://betterstack.com)

Configure alerts for:
- Website down (HTTP 500/503)
- Response time >3s
- SSL certificate expiring

---

## Troubleshooting

### Issue: 401 Unauthorized on API Requests

**Symptoms**: All API calls return 401 errors

**Possible Causes**:
1. Supabase credentials incorrect
2. User not authenticated
3. Session expired

**Solutions**:

```bash
# Verify Supabase credentials
curl https://yourproject.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"

# Should return 200 OK

# Check environment variables in Vercel
vercel env ls

# Re-deploy with correct variables
vercel --prod
```

### Issue: Database Connection Failed

**Symptoms**: Error message "Database connection failed"

**Possible Causes**:
1. Supabase project paused (inactive)
2. Incorrect database URL
3. Network connectivity issues

**Solutions**:

```bash
# Wake up paused project
# Go to Supabase dashboard → Project → Settings → Pause project → Resume

# Test database connectivity
curl https://yourproject.supabase.co/rest/v1/profiles \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

### Issue: Stripe Payments Not Working

**Symptoms**: POS transactions fail with payment errors

**Possible Causes**:
1. Using test keys in production
2. Webhook secret incorrect
3. Stripe webhook not configured

**Solutions**:

```bash
# Verify using LIVE keys
echo $STRIPE_SECRET_KEY
# Should start with: sk_live_

# Test Stripe connection
curl https://api.stripe.com/v1/payment_intents \
  -u sk_live_xxxxxxxxxxxxxxxxxxxxx: \
  -d "amount=1000" \
  -d "currency=usd"

# Configure Stripe webhook
# 1. Go to Stripe dashboard → Developers → Webhooks
# 2. Add endpoint: https://yourdomain.com/api/stripe/webhook
# 3. Select events: payment_intent.succeeded, payment_intent.failed
# 4. Copy webhook signing secret
```

### Issue: Slow Page Load Times

**Symptoms**: Pages take >5 seconds to load

**Possible Causes**:
1. Database queries not optimized
2. Large images not optimized
3. Too many API calls

**Solutions**:

```bash
# Check Vercel performance metrics
# Go to: Vercel dashboard → Analytics → Performance

# Optimize database queries
# Add indexes to frequently queried columns
CREATE INDEX idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX idx_customers_barbershop ON customers(barbershop_id);
CREATE INDEX idx_products_barbershop ON products(barbershop_id);

# Enable Next.js production optimizations
# Already enabled if NODE_ENV=production
```

### Issue: Build Fails on Vercel

**Symptoms**: Deployment fails during build step

**Possible Causes**:
1. Missing dependencies
2. TypeScript errors
3. Environment variables missing

**Solutions**:

```bash
# Test build locally
npm run build

# Fix any errors shown

# Verify all dependencies installed
npm install

# Check Vercel build logs
vercel logs
```

---

## Security Checklist

Before going live, verify all security measures:

### Application Security

- [ ] All environment variables use production values (not test keys)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is kept secret (never exposed to client)
- [ ] Stripe webhook secret configured correctly
- [ ] Row Level Security (RLS) enabled on all database tables
- [ ] API rate limiting configured
- [ ] CORS properly configured (only allow your domain)

### Database Security

- [ ] Database password is strong (20+ characters)
- [ ] RLS policies tested and working
- [ ] Service role key not used in client-side code
- [ ] Database backups enabled and tested
- [ ] No sensitive data in logs

### Authentication Security

- [ ] Password requirements enforced (min 8 characters)
- [ ] Email verification enabled (optional but recommended)
- [ ] Session expiration configured (default: 1 hour)
- [ ] Password reset flow tested

### Infrastructure Security

- [ ] HTTPS enabled (SSL certificate valid)
- [ ] Security headers configured:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=31536000`
- [ ] DDoS protection enabled (via Cloudflare or Vercel)
- [ ] Firewall rules configured (if self-hosted)

### Compliance

- [ ] Privacy policy posted (if required)
- [ ] Terms of service posted (if required)
- [ ] GDPR compliance measures (if serving EU users)
- [ ] PCI DSS compliance (Stripe handles most of this)

---

## Rollback Procedures

If issues occur in production, follow these rollback steps:

### Vercel Rollback

```bash
# View recent deployments
vercel list

# Rollback to previous deployment
vercel rollback <deployment-url>

# Or rollback via dashboard
# 1. Go to Deployments
# 2. Find last working deployment
# 3. Click "..." → "Promote to Production"
```

### Docker Rollback

```bash
# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Pull previous version
git checkout <previous-commit-hash>

# Rebuild and start
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Rollback

```bash
# Restore from backup
supabase db restore backup.sql

# Or restore to point-in-time
# Go to: Supabase dashboard → Database → Backups → Restore
```

---

## Performance Optimization

### Enable Caching

Add caching headers in `next.config.js`:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/shop/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
    ]
  },
}
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_appointments_date ON appointments(start_time);
CREATE INDEX idx_appointments_barber ON appointments(barber_id);
CREATE INDEX idx_customers_search ON customers USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_active ON products(barbershop_id, is_active);

-- Analyze tables for query optimization
ANALYZE appointments;
ANALYZE customers;
ANALYZE products;
```

### Image Optimization

Use Next.js Image component:

```javascript
import Image from 'next/image'

<Image
  src="/logo.png"
  width={200}
  height={100}
  alt="Logo"
  priority
/>
```

---

## Support & Resources

- **Feature Documentation**: See `docs/FEATURES.md`
- **API Reference**: See `docs/API_REFERENCE.md`
- **Changelog**: See `CHANGELOG.md`
- **GitHub Issues**: Report bugs and request features

---

*Last Updated: October 9, 2025*
*Version: 0.9.0 - Production Ready*

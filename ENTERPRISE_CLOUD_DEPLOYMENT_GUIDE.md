# 6FB AI Agent System - Enterprise Cloud Deployment Guide

## Overview
This guide covers deploying the enterprise-ready 6FB AI Agent System with all integrated SDKs (Supabase, Clerk, Sentry, LangChain, Stripe, Pusher) to cloud platforms.

## Architecture Overview
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel Edge   │────▶│  Railway/Render │────▶│    Supabase     │
│   (Frontend)    │     │    (Backend)    │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         │
         ├── Clerk Auth ─────────┤                        │
         ├── Stripe Payments ────┤                        │
         ├── Sentry Monitoring ──┤                        │
         └── Pusher Real-time ───┴────────────────────────┘
```

## Phase 1: Infrastructure Setup

### 1.1 Supabase (Database + Auth + Real-time)
```bash
# 1. Create new project at https://app.supabase.com
# Project name: 6fb-ai-agent-production
# Database password: Generate secure 32-char password

# 2. Run migration (SQL Editor)
# Copy contents from: scripts/supabase-migration.sql

# 3. Enable Row Level Security
# Go to Authentication > Policies > Enable RLS on all tables

# 4. Configure Auth Providers
# Authentication > Providers > Enable:
# - Email/Password
# - Google OAuth
# - Microsoft OAuth (for enterprise)

# 5. Get credentials
# Settings > API:
# - URL → NEXT_PUBLIC_SUPABASE_URL
# - anon key → NEXT_PUBLIC_SUPABASE_ANON_KEY  
# - service_role → SUPABASE_SERVICE_ROLE_KEY
```

### 1.2 Clerk (Enterprise Authentication)
```bash
# 1. Create application at https://dashboard.clerk.com
# Name: 6FB AI Agent Enterprise

# 2. Configure authentication
# - Email + Password
# - Google OAuth
# - Microsoft Azure AD (enterprise SSO)
# - Enable MFA
# - Session duration: 7 days

# 3. Setup webhooks
# Webhooks > Add endpoint:
# URL: https://[your-backend].railway.app/api/webhooks/clerk
# Events: user.*, session.*, organization.*

# 4. Configure redirects
# Paths:
# - Sign in: /sign-in
# - Sign up: /sign-up
# - After sign in: /dashboard
# - After sign up: /onboarding

# 5. Get API keys
# API Keys:
# - Publishable → NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - Secret → CLERK_SECRET_KEY
```

### 1.3 Stripe (Payments & Subscriptions)
```bash
# 1. Setup products at https://dashboard.stripe.com

# 2. Create subscription products:
# - Starter: $99/month (price_starter_monthly)
# - Professional: $299/month (price_pro_monthly)  
# - Enterprise: Custom (contact sales)

# 3. Configure customer portal
# Settings > Billing > Customer portal
# Enable: Subscription management, invoice history

# 4. Setup webhooks
# Webhooks > Add endpoint:
# URL: https://[your-frontend].vercel.app/api/stripe/webhook
# Events: 
# - checkout.session.completed
# - customer.subscription.*
# - invoice.*

# 5. Get keys
# - Publishable → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# - Secret → STRIPE_SECRET_KEY
# - Webhook secret → STRIPE_WEBHOOK_SECRET
```

### 1.4 Sentry (Error Tracking)
```bash
# 1. Create project at https://sentry.io
# Platform: Next.js

# 2. Configure settings
# - Enable performance monitoring
# - Set sample rate: 0.1 (10%)
# - Enable session replay
# - Configure alerts

# 3. Get DSN
# Settings > Client Keys:
# - DSN → NEXT_PUBLIC_SENTRY_DSN
# - Auth Token → SENTRY_AUTH_TOKEN
```

### 1.5 Pusher (Real-time)
```bash
# 1. Create app at https://dashboard.pusher.com
# Name: 6fb-ai-agent
# Cluster: Choose closest region

# 2. Get credentials
# App Keys:
# - app_id → PUSHER_APP_ID
# - key → NEXT_PUBLIC_PUSHER_KEY
# - secret → PUSHER_SECRET
# - cluster → NEXT_PUBLIC_PUSHER_CLUSTER
```

## Phase 2: Backend Deployment (Railway)

### 2.1 Railway Setup
```bash
# 1. Create new project at https://railway.app

# 2. Deploy from GitHub
# - Connect GitHub account
# - Select repository
# - Choose branch: main

# 3. Configure service
# - Root directory: /
# - Build command: pip install -r requirements.txt && pip install -r requirements-langchain.txt
# - Start command: uvicorn main_complex:app --host 0.0.0.0 --port $PORT --workers 4
```

### 2.2 Environment Variables
```bash
# Add all environment variables in Railway dashboard:

# Database
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]

# AI Services
OPENAI_API_KEY=[your-openai-key]
ANTHROPIC_API_KEY=[your-anthropic-key]

# Monitoring
SENTRY_DSN=[your-sentry-dsn]

# Real-time
PUSHER_APP_ID=[your-app-id]
PUSHER_KEY=[your-key]
PUSHER_SECRET=[your-secret]
PUSHER_CLUSTER=[your-cluster]

# Authentication
CLERK_SECRET_KEY=[your-clerk-secret]
CLERK_WEBHOOK_SECRET=[your-webhook-secret]

# Frontend URL (update after Vercel deployment)
FRONTEND_URL=https://[your-app].vercel.app
ALLOWED_ORIGINS=https://[your-app].vercel.app

# Python settings
PYTHONPATH=/app
PYTHONUNBUFFERED=1
```

### 2.3 Deploy and Get URL
```bash
# Railway will auto-deploy
# Get your backend URL: https://[your-app].railway.app
# Save this for frontend configuration
```

## Phase 3: Frontend Deployment (Vercel)

### 3.1 Vercel Setup
```bash
# 1. Import project at https://vercel.com/new
# - Import Git repository
# - Select the repository

# 2. Configure build settings
# Framework Preset: Next.js
# Root Directory: ./
# Build Command: npm run build
# Output Directory: .next
```

### 3.2 Environment Variables
```bash
# Add all variables in Vercel dashboard:

# Supabase
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[your-clerk-pub-key]
CLERK_SECRET_KEY=[your-clerk-secret]

# Stripe  
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your-stripe-pub-key]
STRIPE_SECRET_KEY=[your-stripe-secret]
STRIPE_WEBHOOK_SECRET=[your-webhook-secret]

# Sentry
NEXT_PUBLIC_SENTRY_DSN=[your-sentry-dsn]
SENTRY_AUTH_TOKEN=[your-sentry-token]

# Pusher
NEXT_PUBLIC_PUSHER_KEY=[your-pusher-key]
NEXT_PUBLIC_PUSHER_CLUSTER=[your-cluster]

# Backend API
NEXT_PUBLIC_API_URL=https://[your-backend].railway.app

# App URL
NEXT_PUBLIC_APP_URL=https://[your-app].vercel.app
```

### 3.3 Deploy
```bash
# Click Deploy
# Get your frontend URL: https://[your-app].vercel.app
```

## Phase 4: Post-Deployment Configuration

### 4.1 Update Backend CORS
```bash
# In Railway, update FRONTEND_URL environment variable:
FRONTEND_URL=https://[your-app].vercel.app
ALLOWED_ORIGINS=https://[your-app].vercel.app,https://[custom-domain].com
```

### 4.2 Configure Webhooks
```bash
# 1. Stripe webhook
# Update URL to: https://[your-app].vercel.app/api/stripe/webhook

# 2. Clerk webhook  
# Update URL to: https://[your-backend].railway.app/api/webhooks/clerk

# 3. Test webhooks
# Use Stripe CLI: stripe listen --forward-to https://[your-app].vercel.app/api/stripe/webhook
```

### 4.3 Domain Configuration
```bash
# 1. Add custom domain in Vercel
# Settings > Domains > Add
# Update DNS records as instructed

# 2. Add domain to Railway (optional)
# Settings > Domains > Generate Domain

# 3. Update environment variables with new domains
```

## Phase 5: Production Checklist

### 5.1 Security Verification
- [ ] All API keys in environment variables
- [ ] Webhook signature verification enabled
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Authentication required on all protected routes
- [ ] SSL certificates active

### 5.2 Performance Optimization
- [ ] Vercel Edge Functions configured
- [ ] Database indexes created
- [ ] Image optimization enabled
- [ ] API response caching configured
- [ ] Real-time connection pooling

### 5.3 Monitoring Setup
- [ ] Sentry alerts configured
- [ ] Vercel Analytics enabled
- [ ] Railway metrics monitored
- [ ] Supabase dashboard configured
- [ ] Uptime monitoring active

## Phase 6: Testing & Validation

### 6.1 Functional Tests
```bash
# 1. Authentication flow
- Sign up with email
- Sign in with Google
- MFA setup and verification
- Session persistence

# 2. Payment flow
- Subscribe to plan
- Update payment method
- Cancel subscription
- Webhook processing

# 3. AI Features
- Chat with business coach
- Generate insights
- Real-time updates
- Context preservation

# 4. Real-time features
- Live notifications
- Chat updates
- Dashboard metrics
- Collaborative features
```

### 6.2 Performance Benchmarks
```bash
# Target metrics:
- Page Load: < 2s (LCP)
- API Response: < 300ms (p95)
- Real-time Latency: < 100ms
- Error Rate: < 0.1%
```

## Phase 7: Scaling Strategy

### 7.1 Vertical Scaling
```bash
# Vercel
- Upgrade to Pro ($20/month per member)
- Increase function timeout limits
- Add team members

# Railway  
- Upgrade to Pro ($20/month)
- Increase CPU/RAM limits
- Enable autoscaling

# Supabase
- Upgrade to Pro ($25/month)
- Increase connection pool
- Enable read replicas
```

### 7.2 Horizontal Scaling
```bash
# Multi-region deployment
- Vercel: Auto edge deployment
- Railway: Deploy to multiple regions
- Supabase: Enable global edge functions

# Caching strategy
- Vercel: Edge caching
- Railway: Redis integration
- CDN: Cloudflare integration
```

## Troubleshooting

### Common Issues

#### CORS Errors
```bash
# Check Railway environment:
ALLOWED_ORIGINS=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app

# Verify in main_complex.py:
origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
```

#### Authentication Loops
```bash
# Verify Clerk configuration:
- Redirect URLs correct
- API keys match
- Webhook secret correct

# Check Supabase sync:
- User creation webhook working
- Service role key has permissions
```

#### Payment Webhook Failures
```bash
# Debug with Stripe CLI:
stripe listen --forward-to localhost:9999/api/stripe/webhook

# Verify:
- Webhook secret matches
- Signature verification working
- Idempotency handling
```

#### Real-time Connection Issues
```bash
# Check Pusher configuration:
- Cluster matches between frontend/backend
- Authentication endpoint working
- WebSocket connections allowed
```

## Maintenance

### Regular Tasks
```bash
# Weekly
- Review Sentry errors
- Check performance metrics
- Update dependencies
- Backup database

# Monthly  
- Security audit
- Cost optimization review
- Feature usage analytics
- User feedback review

# Quarterly
- Dependency major updates
- Infrastructure review
- Scaling assessment
- Disaster recovery test
```

### Monitoring Dashboards
```bash
# Vercel Analytics
https://vercel.com/[team]/[project]/analytics

# Railway Metrics
https://railway.app/project/[id]/service/[id]/metrics

# Supabase Dashboard
https://app.supabase.com/project/[id]/editor

# Sentry Performance
https://sentry.io/organizations/[org]/performance/

# Stripe Dashboard
https://dashboard.stripe.com/
```

## Cost Estimation

### Monthly Costs (Production)
```
Vercel Pro:        $20/month
Railway Pro:       $20/month  
Supabase Pro:      $25/month
Clerk Pro:         $25/month
Sentry Team:       $26/month
Pusher Starter:    $49/month
Stripe:            2.9% + $0.30 per transaction
------------------------
Total:             ~$165/month + transaction fees
```

### Scaling Costs
```
1-1000 users:      ~$165/month
1000-10k users:    ~$500/month
10k-100k users:    ~$2000/month
100k+ users:       Custom enterprise pricing
```

## Support Resources

### Documentation
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app
- Supabase: https://supabase.com/docs
- Clerk: https://clerk.com/docs
- Stripe: https://stripe.com/docs
- Sentry: https://docs.sentry.io
- Pusher: https://pusher.com/docs

### Community
- Discord: [Your Discord Server]
- Slack: [Your Slack Workspace]
- GitHub Issues: [Your Repo]/issues

### Emergency Contacts
- On-call: [Phone Number]
- Email: support@6fb-ai-agent.com
- Status Page: status.6fb-ai-agent.com

---

Last Updated: [Current Date]
Version: 1.0.0
Enterprise Cloud Deployment
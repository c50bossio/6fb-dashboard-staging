# 🚀 Production Deployment Guide - BookedBarber

## ✅ Current Status (August 13, 2025)

### 🎯 **PRODUCTION IS LIVE!**
- **URL**: https://bookedbarber.com
- **Status**: ✅ Operational
- **Environment**: Production with all services configured
- **Performance**: 589ms avg response time
- **Git**: Auto-deploy from `production` branch

### 🏗️ **STAGING ENVIRONMENT**
- **URL**: https://6fb-ai-dashboard-f62lshna2-6fb.vercel.app
- **Status**: ✅ Operational  
- **Environment**: Testing and development
- **Performance**: 1923ms avg response time
- **Git**: Auto-deploy from `staging` branch

---

## 🔧 Deployment Architecture

### **Branch Strategy**
```
production branch → bookedbarber.com (Live)
staging branch    → vercel.app (Testing)
main branch       → Development
```

### **Auto-Deployment Flow**
1. **Development**: Work on feature branches
2. **Staging**: Merge to `staging` → Auto-deploy to staging URL
3. **Production**: Merge `staging` to `production` → Auto-deploy to bookedbarber.com

### **Branch Protection Rules** ✅
- **Production**: Requires PR review, Vercel checks must pass
- **Staging**: Requires Vercel checks, allows force push for testing
- **Automatic**: Vercel status checks prevent broken deployments

## Current Status: ✅ READY FOR DEPLOYMENT

### Completed Features:
1. **Enhanced Onboarding Flow** - 5-step progressive disclosure system
2. **Custom Domain Management** - Free subdomains, domain purchase, existing domain connection
3. **Automated Email Support** - Provider-specific DNS instructions
4. **Full Backend Integration** - Complete Supabase database integration
5. **Comprehensive Testing** - All components tested and verified

## Pre-Deployment Requirements

### 1. Environment Variables Setup
```bash
# Create production .env file
cp .env.example .env.production

# Required variables:
NEXT_PUBLIC_SUPABASE_URL=https://dfhqjdoydihajmjxniee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your anon key]
SUPABASE_SERVICE_ROLE_KEY=[Your service role key]

# Email service (for domain setup emails)
SENDGRID_API_KEY=[Your SendGrid API key]
SENDGRID_FROM_EMAIL=support@bookedbarber.com

# Payment processing (for domain purchases)
STRIPE_SECRET_KEY=[Your Stripe secret key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[Your Stripe publishable key]

# Domain registrar API (optional - for automated registration)
NAMECHEAP_API_KEY=[Optional]
GODADDY_API_KEY=[Optional]
```

### 2. Database Verification
```bash
# Test database connection
node test-supabase-access.js

# Verify tables exist
- profiles (with onboarding fields)
- barbershops (with custom_domain field)
- onboarding_progress
- services
- bookings
```

### 3. Docker Deployment
```bash
# Build production containers
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify health
curl http://localhost:9999/api/health
curl http://localhost:8001/health
```

## Deployment Process

### Step 1: Staging Deployment (Recommended First)
```bash
# Deploy to staging for final testing
git checkout main
git pull origin main

# Deploy to Vercel staging
vercel --env preview

# Test staging deployment
# Visit: https://[your-staging-url].vercel.app/welcome
```

### Step 2: Production Build Verification
```bash
# Create production build locally
npm run build

# Test production build
npm run start

# Run production tests
npm run test:production
```

### Step 3: Production Deployment

#### Option A: Vercel Deployment (Recommended)
```bash
# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
# Go to: https://vercel.com/[your-team]/[your-project]/settings/environment-variables

# Add all required env variables for production
```

#### Option B: Docker Deployment
```bash
# Use production docker compose
docker-compose -f docker-compose.prod.yml up -d

# Or deploy to your cloud provider
# AWS ECS, Google Cloud Run, Azure Container Instances, etc.
```

#### Option C: Traditional VPS Deployment
```bash
# SSH to your server
ssh user@your-server.com

# Clone repository
git clone [your-repo]
cd 6FB-AI-Agent-System

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start npm --name "6fb-frontend" -- start
pm2 start python --name "6fb-backend" -- fastapi_backend.py

# Setup nginx reverse proxy
sudo nano /etc/nginx/sites-available/bookedbarber
```

### Step 4: DNS Configuration (For Custom Domain)
```bash
# Point your domain to deployment
# Vercel: Add custom domain in dashboard
# VPS: Configure A record to server IP

# Example DNS records:
A     @     76.76.21.21       # Your server IP
CNAME www   cname.vercel.com  # Or your deployment URL
```

### Step 5: SSL Certificate
```bash
# Vercel: Automatic SSL provisioning
# VPS: Use Certbot for Let's Encrypt
sudo certbot --nginx -d bookedbarber.com -d www.bookedbarber.com
```

## Post-Deployment Verification

### 1. Functional Testing
```bash
# Test OAuth login
curl https://your-domain.com/api/auth/callback

# Test onboarding API
curl https://your-domain.com/api/onboarding/save-progress

# Test domain verification
curl https://your-domain.com/api/domains/check-status?domain=test.com
```

### 2. Monitor Key Metrics
- Onboarding completion rate
- API response times
- Error rates
- Domain verification success

### 3. Setup Monitoring
```javascript
// Add to your monitoring service
const metrics = {
  'onboarding.started': 0,
  'onboarding.completed': 0,
  'onboarding.abandoned': 0,
  'domain.purchased': 0,
  'domain.verified': 0,
  'api.errors': 0
}
```

## Rollback Procedure

If issues occur after deployment:

```bash
# Vercel rollback
vercel rollback

# Docker rollback
docker-compose down
git checkout [previous-version]
docker-compose up -d

# Database rollback (if schema changed)
# Run from Supabase dashboard SQL editor
-- Revert onboarding fields if needed
ALTER TABLE profiles 
DROP COLUMN IF EXISTS onboarding_completed,
DROP COLUMN IF EXISTS onboarding_step;
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Errors
```bash
# Check Supabase service status
curl https://api.supabase.com/v1/projects/dfhqjdoydihajmjxniee/health

# Verify environment variables
node -e "console.log(process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Key set' : 'Key missing')"
```

#### 2. Email Delivery Issues
```bash
# Test SendGrid connection
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"test@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

#### 3. Domain Verification Failures
```bash
# Check DNS propagation
nslookup your-domain.com
dig your-domain.com

# Verify SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

## Performance Optimization

### 1. Enable Caching
```javascript
// Add to next.config.js
module.exports = {
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate' }
      ]
    }
  ]
}
```

### 2. Database Indexes
```sql
-- Add to Supabase SQL editor
CREATE INDEX idx_onboarding_user ON onboarding_progress(user_id);
CREATE INDEX idx_barbershops_domain ON barbershops(custom_domain);
CREATE INDEX idx_services_barbershop ON services(barbershop_id);
```

### 3. Image Optimization
```bash
# Already configured in Next.js
# Verify with:
npm run analyze
```

## Security Checklist

- [x] Environment variables secured
- [x] API endpoints authenticated
- [x] Input validation implemented
- [x] SQL injection prevention
- [x] XSS protection enabled
- [x] Rate limiting configured
- [ ] Content Security Policy headers
- [ ] HSTS enabled
- [ ] Security audit completed

## Launch Communication Template

### For Existing Users:
```
Subject: 🚀 New Feature: Custom Domains & Faster Onboarding!

Hi [Name],

We've just launched two exciting updates:

1. **Custom Domains** - Get your own professional domain (yourname.com) or use our free subdomain
2. **5-Minute Setup** - Our new onboarding gets you up and running 3x faster

Log in to explore the new features: [Login Link]

Best,
The BookedBarber Team
```

### For Support Team:
```
New Onboarding System - Quick Reference

Key Features:
- 5-step progressive flow
- Custom domain support (3 options)
- Automated email instructions
- Real-time preview

Common Issues:
- DNS propagation: Takes 1-48 hours
- Email delivery: Check spam folder
- Domain verification: Retry after 1 hour

Escalation: Tag #onboarding-help in Slack
```

## Success Metrics

Track these KPIs post-launch:

| Metric | Target | Measure |
|--------|--------|---------|
| Onboarding Completion | > 80% | Analytics |
| Time to Complete | < 5 min | Session tracking |
| Domain Adoption | > 50% | Database query |
| Support Tickets | < 5/day | Help desk |
| User Satisfaction | > 4.5/5 | Post-onboarding survey |

## Next Steps

1. **Immediate (Day 1)**:
   - Deploy to staging
   - Internal team testing
   - Fix any critical issues

2. **Short-term (Week 1)**:
   - Production deployment
   - Monitor metrics
   - Gather user feedback

3. **Long-term (Month 1)**:
   - Iterate based on feedback
   - Add advanced features
   - Optimize performance

## Support Resources

- **Documentation**: `/docs/onboarding-guide.md`
- **API Reference**: `/docs/api-reference.md`
- **Troubleshooting**: `/docs/troubleshooting.md`
- **Video Tutorials**: [Coming soon]

---

**Deployment Ready**: ✅ YES
**Estimated Deployment Time**: 2-4 hours
**Risk Level**: Low (comprehensive testing completed)
**Rollback Time**: < 5 minutes

*Last Updated: January 13, 2025*
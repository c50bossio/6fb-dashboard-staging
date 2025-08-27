# 🚀 Production Deployment Guide

## 6FB AI Agent System - Live Barbershop Platform

This guide will walk you through deploying the 6FB AI Agent System to production for live barbershop operations.

## 📋 Pre-Deployment Checklist

### ✅ System Requirements Met
- [x] All 8 critical bugs fixed and tested
- [x] Saturday morning rush scenarios validated
- [x] Customer booking journey confirmed working
- [x] Payment processing and Stripe integration tested
- [x] Mobile experience optimized
- [x] Real-time analytics working

### 🎯 Production Environment Setup

## 1️⃣ Database Setup (Supabase)

### Create Production Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose your region (closest to your users)
3. Set a strong database password
4. Wait for project initialization (2-3 minutes)

### Run Production Schema
```bash
# Connect to your Supabase SQL editor
# Copy and paste the contents of database/production-setup.sql
# Execute the entire script
```

### Configure Authentication
```sql
-- In Supabase Auth settings, enable:
-- ✅ Email confirmation
-- ✅ Phone confirmation (optional)
-- ✅ Password requirements
-- ✅ JWT expiry (24 hours recommended)
```

### Environment Variables
Create `.env.production` file:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Stripe Configuration (CRITICAL for payments)
STRIPE_SECRET_KEY=sk_live_...your-live-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...your-live-key
STRIPE_WEBHOOK_SECRET=whsec_...your-webhook-secret

# Application
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secure-secret-here
NODE_ENV=production

# Email Configuration
SENDGRID_API_KEY=SG...your-sendgrid-key
FROM_EMAIL=noreply@yourdomain.com

# SMS Configuration (optional)
TWILIO_ACCOUNT_SID=AC...your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

## 2️⃣ Application Deployment

### Option A: Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Push to GitHub if not already done
   git add .
   git commit -m "feat: production deployment preparation"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables (copy from `.env.production`)
   - Deploy

3. **Configure Domain**
   - Add your custom domain in Vercel dashboard
   - Update DNS records as instructed
   - Enable SSL (automatic with Vercel)

### Option B: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# ... set all other env vars
```

### Option C: AWS/Digital Ocean

```bash
# Build production bundle
npm run build

# Use Docker for deployment
docker build -t 6fb-system .
docker run -p 3000:3000 --env-file .env.production 6fb-system
```

## 3️⃣ Stripe Configuration

### Setup Stripe Connect
1. **Enable Connect in Stripe Dashboard**
   - Go to Connect settings
   - Enable Express accounts
   - Set up webhooks

2. **Configure Webhooks**
   ```
   Endpoint URL: https://yourdomain.com/api/webhooks/stripe
   
   Events to listen for:
   ✅ payment_intent.succeeded
   ✅ payment_intent.payment_failed  
   ✅ account.updated
   ✅ payout.paid
   ```

3. **Test Payments**
   ```bash
   # Use Stripe test cards
   # 4242424242424242 - Success
   # 4000000000000002 - Declined
   ```

## 4️⃣ DNS and SSL Setup

### Domain Configuration
```dns
# A Record
yourdomain.com → Your deployment IP

# CNAME Records  
www.yourdomain.com → yourdomain.com
api.yourdomain.com → yourdomain.com

# MX Record (for email)
yourdomain.com → Your email provider
```

### SSL Certificate
- **Vercel**: Automatic SSL
- **Railway**: Automatic SSL  
- **Self-hosted**: Use Let's Encrypt

## 5️⃣ Monitoring and Error Tracking

### Sentry Setup
```bash
# Install Sentry
npm install @sentry/nextjs

# Configure sentry.client.config.js
Sentry.init({
  dsn: "https://your-sentry-dsn",
  environment: "production"
});
```

### Uptime Monitoring
- **Pingdom**: Monitor uptime and performance
- **StatusCake**: Free uptime monitoring
- **Custom**: `/api/health` endpoint monitoring

## 6️⃣ Testing Production Environment

### Critical Test Scenarios

1. **Customer Booking Flow**
   ```bash
   # Test complete booking journey
   curl -X POST https://yourdomain.com/api/public/bookings/create \
     -H "Content-Type: application/json" \
     -d '{
       "barbershop_id": "test-shop",
       "service_id": "test-service", 
       "scheduled_at": "2025-01-20T10:00:00.000Z",
       "duration_minutes": 30,
       "price": 25.00,
       "customer_name": "John Doe",
       "customer_phone": "555-0123",
       "customer_email": "john@test.com"
     }'
   ```

2. **Payment Processing**
   - Test with real Stripe test cards
   - Verify webhook delivery
   - Confirm booking status updates

3. **Dashboard Analytics**  
   - Login as barbershop owner
   - Verify real-time data
   - Test mobile experience

## 7️⃣ Go-Live Checklist

### Pre-Launch (24 hours before)
- [ ] All environment variables configured
- [ ] Database schema deployed and tested
- [ ] SSL certificates valid
- [ ] Stripe webhooks configured and tested
- [ ] Email notifications working
- [ ] Error tracking configured
- [ ] Backup strategy in place
- [ ] Performance testing completed

### Launch Day
- [ ] DNS propagation complete
- [ ] All services responding (health check)
- [ ] First test booking completed successfully
- [ ] Payment processing confirmed working  
- [ ] Error monitoring active
- [ ] Team notified and ready for support

### Post-Launch (First 48 hours)
- [ ] Monitor error rates and performance
- [ ] Watch for any booking failures
- [ ] Verify analytics data accuracy
- [ ] Collect initial user feedback
- [ ] Document any issues for quick resolution

## 8️⃣ Performance Optimization

### Database Optimization
```sql
-- Monitor slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Ensure indexes are being used
EXPLAIN ANALYZE SELECT * FROM bookings 
WHERE barbershop_id = 'xxx' AND scheduled_at >= NOW();
```

### CDN Configuration
- Enable Vercel's Edge Network
- Optimize image delivery
- Cache static assets

### Monitoring Queries
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 🚨 Emergency Procedures

### Rollback Plan
```bash
# Quick rollback to previous version
vercel --prod --confirm rollback

# Database rollback (if needed)
# Restore from automated Supabase backup
```

### Critical Issue Response
1. **Immediately**: Check error tracking (Sentry)
2. **Within 5 min**: Assess impact and user reports
3. **Within 15 min**: Implement fix or rollback
4. **Within 1 hour**: Post-mortem and prevention plan

## 📊 Success Metrics

### Day 1 Targets
- ✅ 0 critical errors
- ✅ <2 second page load times
- ✅ 100% uptime
- ✅ 1+ successful booking

### Week 1 Targets  
- ✅ 10+ successful bookings
- ✅ 99.9% uptime
- ✅ <1 second average API response
- ✅ 0 payment failures

### Month 1 Targets
- ✅ 100+ bookings processed
- ✅ 5+ barbershops onboarded
- ✅ $1000+ revenue processed
- ✅ 4.5+ star average rating

## 📞 Support and Maintenance

### Regular Maintenance
- **Daily**: Monitor error rates and performance
- **Weekly**: Review analytics and user feedback  
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Performance optimization and feature planning

### Support Channels
- **Critical Issues**: Direct phone/text support
- **General Support**: Email support within 24 hours
- **Feature Requests**: Planned in monthly releases

---

## 🎉 You're Ready for Launch!

Your 6FB AI Agent System is now fully configured and ready for live barbershop operations. The system has been tested for Saturday morning rush scenarios and can handle real-world business traffic.

### Next Steps After Launch
1. Onboard your first barbershops
2. Gather user feedback and iterate
3. Monitor performance and scale as needed
4. Add advanced features based on business needs

**Good luck with your launch! 🚀**
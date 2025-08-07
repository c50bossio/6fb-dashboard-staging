# 6FB AI Agent System - Deployment Checklist

## Pre-Deployment Checklist

### Local Testing
- [ ] All tests passing (`npm test` and `pytest`)
- [ ] Build successful (`npm run build`)
- [ ] No console errors in development
- [ ] All environment variables documented
- [ ] Database migrations tested

### Security Audit
- [ ] No hardcoded API keys
- [ ] All sensitive data in environment variables
- [ ] CORS configuration reviewed
- [ ] Authentication flows tested
- [ ] Webhook signatures implemented

## Service Setup Checklist

### Supabase
- [ ] Project created
- [ ] Database migration executed
- [ ] RLS policies enabled
- [ ] Auth providers configured
- [ ] API keys saved securely

### Clerk
- [ ] Application created
- [ ] OAuth providers configured
- [ ] MFA enabled
- [ ] Webhooks configured
- [ ] API keys saved securely

### Stripe
- [ ] Products and prices created
- [ ] Customer portal configured
- [ ] Webhooks set up
- [ ] Test mode verified working
- [ ] API keys saved securely

### Sentry
- [ ] Project created
- [ ] DSN obtained
- [ ] Performance monitoring enabled
- [ ] Alert rules configured
- [ ] Auth token saved

### Pusher
- [ ] App created
- [ ] Cluster selected
- [ ] Credentials saved
- [ ] Test connection verified

## Deployment Checklist

### Backend (Railway)
- [ ] Repository connected
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] Health check endpoint working
- [ ] Deployment successful
- [ ] URL noted for frontend

### Frontend (Vercel)
- [ ] Repository imported
- [ ] Build settings configured
- [ ] Environment variables added (including backend URL)
- [ ] Deployment successful
- [ ] Custom domain configured (optional)

## Post-Deployment Checklist

### Configuration
- [ ] Update backend CORS with frontend URL
- [ ] Update all webhook URLs
- [ ] Test webhook endpoints
- [ ] Verify SSL certificates active

### Testing
- [ ] User registration flow
- [ ] User login flow (email + OAuth)
- [ ] Payment subscription flow
- [ ] AI chat functionality
- [ ] Real-time notifications
- [ ] Error tracking (trigger test error)

### Monitoring
- [ ] Sentry receiving errors
- [ ] Vercel Analytics active
- [ ] Railway metrics visible
- [ ] Uptime monitoring configured
- [ ] Alerts configured

### Documentation
- [ ] Update README with production URLs
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Share credentials with team (securely)

## Launch Checklist

### Soft Launch
- [ ] Deploy to production
- [ ] Test with internal team
- [ ] Monitor for 24 hours
- [ ] Fix any critical issues

### Public Launch
- [ ] Announce on social media
- [ ] Send launch email
- [ ] Monitor user signups
- [ ] Track error rates
- [ ] Be ready to scale

## Emergency Rollback Plan

### If Critical Issues Occur
1. [ ] Revert to previous deployment in Vercel
2. [ ] Revert to previous deployment in Railway
3. [ ] Restore database backup if needed
4. [ ] Communicate with users
5. [ ] Post-mortem analysis

## First Week Monitoring

### Daily Checks
- [ ] Error rate < 1%
- [ ] Response times < 500ms
- [ ] No payment failures
- [ ] User signups tracking
- [ ] Support tickets addressed

### Weekly Review
- [ ] Performance metrics review
- [ ] Cost analysis
- [ ] User feedback summary
- [ ] Feature usage analytics
- [ ] Planning next improvements

---

**Remember**: Take your time with each step. It's better to deploy correctly than to deploy quickly.
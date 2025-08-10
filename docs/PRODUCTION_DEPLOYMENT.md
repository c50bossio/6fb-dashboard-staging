# Production Deployment Guide for Barbershop System

## Overview
This guide provides comprehensive instructions for deploying the 6FB AI Agent System to a production barbershop environment with proper security, authentication, and reliability.

## Current Issues & Production Solutions

### 1. Authentication System ✅ FIXED

**Current Issue**: 
- Development uses bypassed authentication
- No proper user session management
- Missing role-based access control

**Production Solution Implemented**:
- `middleware/auth.js` - Full authentication middleware with:
  - Session-based authentication via Supabase Auth
  - Role-based access control (RBAC)
  - API key authentication for service accounts
  - Rate limiting per user/IP

**Implementation**:
```javascript
// Use in any API route
import { withAuth } from '@/middleware/auth'

export const GET = withAuth(handler, {
  requiredRoles: ['barber', 'shop_owner'],
  requireShop: true
})
```

### 2. Database Security ✅ FIXED

**Current Issue**:
- Service role key used directly (bypasses Row Level Security)
- No data isolation between shops
- Test data mixed with production data

**Production Solution**:
- Row Level Security (RLS) policies in Supabase
- Tenant isolation by shop_id
- Separate test flag for data segregation

**Database Setup**:
```sql
-- Enable RLS on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies for shop isolation
CREATE POLICY "Users can only see their shop's data" ON bookings
  FOR ALL USING (shop_id = auth.jwt() ->> 'shop_id');
```

### 3. Environment Configuration ✅ FIXED

**Current Issue**:
- Hard-coded development settings
- No environment-specific feature flags
- Missing production optimizations

**Production Solution**:
- `lib/config/environment.js` - Environment-aware configuration
- Feature flags for gradual rollout
- Automatic environment detection

**Environment Variables Required**:
```env
# Production .env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
INTERNAL_API_KEY=your-internal-api-key
STRIPE_SECRET_KEY=your-stripe-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

### 4. API Endpoints ✅ FIXED

**Current Issue**:
- Inconsistent error handling
- No input validation
- Missing rate limiting

**Production Solutions**:
- `route-production.js` - Full production endpoint with:
  - Zod schema validation
  - Comprehensive error handling
  - Rate limiting (100 req/min for reads, 200 for writes)
  - Timezone-aware scheduling
  - Business hours validation

- `route-flexible.js` - Environment-adaptive endpoint:
  - Auto-switches between dev/prod modes
  - Configurable authentication
  - Debug info in development only

### 5. Recurring Appointments ✅ WORKING

**Status**: Fully functional with timezone support
- RRule implementation with proper DTSTART
- Server-side expansion for performance
- Timezone conversion (UTC storage, local display)
- Modification types (this_only, this_and_future, all)

## Production Deployment Steps

### Step 1: Database Setup

```bash
# 1. Create production Supabase project
# 2. Run migrations
supabase migration up

# 3. Enable RLS
supabase db push --include-rls

# 4. Create initial admin user
supabase functions invoke create-admin \
  --body '{"email":"admin@barbershop.com","password":"secure-password"}'
```

### Step 2: Environment Configuration

```bash
# Copy production environment template
cp .env.production.template .env.production

# Update with your production values
# CRITICAL: Never commit .env files to git
```

### Step 3: Build & Deploy

```bash
# Install dependencies
npm ci --production

# Run production build
npm run build

# Run database migrations
npm run migrate:production

# Start production server
npm run start:production
```

### Step 4: Monitoring Setup

```javascript
// Health check endpoint
GET /api/health

// Expected response
{
  "status": "healthy",
  "database": "connected",
  "cache": "connected",
  "uptime": 1234567
}
```

### Step 5: Security Checklist

- [ ] Environment variables set correctly
- [ ] RLS policies enabled on all tables
- [ ] API rate limiting configured
- [ ] CORS settings restricted to your domain
- [ ] SSL/TLS certificate active
- [ ] Backup strategy in place
- [ ] Error logging to Sentry configured
- [ ] Session timeout configured (default: 1 hour)

## Testing Production Features

### 1. Test Authentication
```bash
# Get auth token
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token in requests
curl https://your-domain.com/api/appointments/availability \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Availability with Auth
```javascript
// Frontend code
const response = await fetch('/api/appointments/availability', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})
```

### 3. Test Rate Limiting
```bash
# Should return 429 after 100 requests/minute
for i in {1..150}; do
  curl https://your-domain.com/api/appointments/availability
done
```

## Migration Path

### Phase 1: Development (Current)
- Using `route.js` with bypassed auth
- Direct database access
- Test data mixed with real data

### Phase 2: Staging
1. Deploy `route-flexible.js` with `NODE_ENV=staging`
2. Enable authentication but allow test accounts
3. Keep rate limiting relaxed for testing

### Phase 3: Production
1. Deploy `route-production.js` 
2. Full authentication required
3. Strict rate limiting
4. RLS policies enforced
5. Monitoring and alerting active

## Quick Switch for Testing

To switch between development and production modes:

```javascript
// In route.js
export { GET, POST } from './route-flexible' // For gradual migration
// OR
export { GET, POST } from './route-production' // For full production
```

## Rollback Plan

If issues occur in production:

1. **Immediate**: Switch back to flexible route
2. **Database**: Restore from latest backup
3. **Config**: Revert environment variables
4. **Monitor**: Check error logs for root cause

## Support & Maintenance

### Daily Tasks
- Monitor error rates
- Check appointment booking success rate
- Review rate limit violations

### Weekly Tasks
- Database backup verification
- Security audit log review
- Performance metrics analysis

### Monthly Tasks
- Update dependencies
- Review and rotate API keys
- Capacity planning review

## Contact for Issues

For production issues:
1. Check error logs in Supabase dashboard
2. Review Sentry for application errors
3. Check rate limit headers in responses
4. Verify RLS policies are not blocking legitimate access

## Summary

The system is now production-ready with:
- ✅ Proper authentication and authorization
- ✅ Secure database access with RLS
- ✅ Environment-aware configuration
- ✅ Rate limiting and error handling
- ✅ Comprehensive monitoring
- ✅ Flexible deployment options

Choose the appropriate route file based on your deployment phase and gradually migrate from development to production configuration.
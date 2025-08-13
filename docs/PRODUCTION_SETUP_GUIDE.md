# Production Setup Guide

## ✅ Production Branch Created

The production branch has been created and pushed to GitHub.

## Next Steps for Vercel Production Configuration

### 1. Configure Production Branch in Vercel

1. Go to: https://vercel.com/c50bossios-projects/6fb-ai-dashboard/settings/git
2. Find "Production Branch" setting
3. Change from `staging` to `production`
4. Click "Save"

### 2. Add Production Domain

1. Go to: https://vercel.com/c50bossios-projects/6fb-ai-dashboard/settings/domains
2. Click "Add"
3. Add these domains:
   - `bookedbarber.com` → Connect to `production` branch
   - `www.bookedbarber.com` → Connect to `production` branch
4. Vercel will verify the existing DNS (already configured in Cloudflare)

### 3. Environment Variables for Production

Go to: https://vercel.com/c50bossios-projects/6fb-ai-dashboard/settings/environment-variables

Ensure these are set for "Production" environment:

```bash
# Core Services
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI Services
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Payment Processing (Production Keys)
STRIPE_SECRET_KEY=sk_live_...  # ⚠️ Use LIVE key, not test
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # ⚠️ Use LIVE key

# Analytics & Monitoring (Optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# Real-time Features (Optional)
PUSHER_APP_ID=your_pusher_id
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

### 4. Verify DNS Configuration

Your Cloudflare DNS is already configured correctly:
- `bookedbarber.com` → 76.76.21.21 (Vercel IP)
- `www.bookedbarber.com` → cname.vercel-dns.com

No changes needed!

### 5. Test Production Deployment

```bash
# Make a small change to test
echo "# Production Deployment Active" >> README.md
git add README.md
git commit -m "chore: Initial production deployment"
git push origin production
```

Watch deployment at: https://vercel.com/c50bossios-projects/6fb-ai-dashboard

## Deployment Workflow

### Feature Development
```bash
git checkout staging
git checkout -b feature/new-feature
# ... make changes ...
git push origin feature/new-feature
# Create PR to staging
```

### Deploy to Staging
```bash
git checkout staging
git merge feature/new-feature
git push origin staging
# Auto-deploys to staging.bookedbarber.com
```

### Deploy to Production
```bash
git checkout production
git merge staging
git push origin production
# Auto-deploys to bookedbarber.com
```

## Branch Protection (Recommended)

### For Production Branch:
1. Go to: https://github.com/c50bossio/6fb-dashboard-staging/settings/branches
2. Add rule for `production`
3. Enable:
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date
   - Include administrators

### For Staging Branch:
1. Add rule for `staging`
2. Enable:
   - Require status checks to pass
   - Allow direct pushes (for quick fixes)

## Monitoring URLs

- **Production**: https://bookedbarber.com
- **Production API**: https://bookedbarber.com/api/health
- **Staging**: https://staging.bookedbarber.com
- **Staging API**: https://staging.bookedbarber.com/api/health
- **Vercel Dashboard**: https://vercel.com/c50bossios-projects/6fb-ai-dashboard

## Rollback Process

If something goes wrong in production:

```bash
# Quick rollback to previous version
git checkout production
git revert HEAD
git push origin production

# Or rollback to specific commit
git checkout production
git reset --hard <commit-hash>
git push --force-with-lease origin production
```

## Environment Separation

| Environment | Branch | Domain | Purpose |
|------------|--------|--------|---------|
| Production | production | bookedbarber.com | Live customers |
| Staging | staging | staging.bookedbarber.com | Testing & QA |
| Preview | feature/* | *.vercel.app | Development |

## Security Checklist

- [ ] Production Stripe keys (not test keys)
- [ ] Different JWT secrets for production
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Environment variables marked as sensitive
- [ ] Branch protection enabled
- [ ] SSL certificates active
- [ ] Security headers configured

## Post-Deployment Verification

```bash
# Check production health
curl https://bookedbarber.com/api/health

# Check SSL certificate
curl -I https://bookedbarber.com

# Test critical paths
- User registration
- User login
- Payment processing
- Core features
```
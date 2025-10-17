# 📚 Vercel Deployment Guide

## 🚀 Quick Deployment (Recommended)

Run the automated deployment script:
```bash
./scripts/deploy-to-vercel.sh
```

This will:
1. ✅ Set up all environment variables from .env.production
2. ✅ Link your project to Vercel
3. ✅ Deploy to production
4. ✅ Provide your live URL

## 🔧 Manual Deployment Steps

### Option 1: Using Vercel CLI

```bash
# 1. Link your project (if not already linked)
vercel link

# 2. Deploy to production
vercel --prod

# 3. Set environment variables (after deployment)
vercel env pull .env.production
```

### Option 2: Using Vercel Dashboard

1. **Go to**: https://vercel.com/new
2. **Import Git Repository**: Select your GitHub repo
3. **Configure Project**:
   - Framework: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Environment Variables** (Add these from .env.production):

#### Critical Variables (MUST ADD):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
OPENAI_API_KEY
ANTHROPIC_API_KEY
JWT_SECRET_KEY
SECRET_KEY
```

#### Copy ALL Variables at Once:
You can copy all variables from your .env.production file and paste them in bulk in Vercel's environment variables section.

5. **Click Deploy**

## 🌐 Custom Domain Setup

After deployment, set up bookedbarber.com:

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Domains**
3. Add `bookedbarber.com`
4. Update your DNS records:
   - **A Record**: Point @ to `76.76.21.21`
   - **CNAME**: Point www to `cname.vercel-dns.com`

## ✅ Post-Deployment Checklist

- [ ] Visit your production URL
- [ ] Test user registration
- [ ] Test barbershop creation
- [ ] Test booking flow
- [ ] Test payment processing (use Stripe test card: 4242 4242 4242 4242)
- [ ] Verify SMS notifications (check Twilio logs)
- [ ] Verify email notifications (check SendGrid logs)
- [ ] Test AI chat features
- [ ] Check dashboard analytics

## 🔍 Verify Deployment

1. **Check Build Logs**:
   ```bash
   vercel logs
   ```

2. **Check Environment Variables**:
   ```bash
   vercel env ls
   ```

3. **Monitor Functions**:
   - Visit: https://vercel.com/[your-username]/[project-name]/functions

## 🚨 Troubleshooting

### If deployment fails:

1. **Check build logs**:
   ```bash
   vercel logs --since 1h
   ```

2. **Verify environment variables**:
   ```bash
   vercel env ls production
   ```

3. **Test locally first**:
   ```bash
   npm run build
   npm run start
   ```

### Common Issues:

- **Build Error**: Check if all dependencies are in package.json
- **Environment Variables**: Ensure no quotes in Vercel dashboard
- **API Routes 500**: Check Supabase and API keys are correct
- **Styles Missing**: Clear cache and redeploy

## 📱 Mobile Testing

After deployment, test on:
- iPhone Safari
- Android Chrome
- Tablet (iPad/Android)

## 🔒 Security Check

Verify after deployment:
- [ ] No API keys exposed in client code
- [ ] HTTPS is enforced
- [ ] CSP headers are active
- [ ] Rate limiting is working

## 📊 Monitoring

Set up monitoring:
1. **Vercel Analytics**: Enabled by default
2. **Error Tracking**: Configure Sentry (optional)
3. **Uptime Monitoring**: Use Vercel's built-in monitoring

## 🎯 Ready to Deploy!

Your system is configured and ready. Run:
```bash
./scripts/deploy-to-vercel.sh
```

Or deploy manually through the dashboard.

---

**Support**: If you encounter issues, check:
- Vercel Status: https://vercel-status.com
- Build Logs: `vercel logs`
- Environment Variables: `vercel env ls`
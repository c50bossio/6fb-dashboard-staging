# 🚀 BookedBarber.com Deployment Guide

## System Overview
The 6FB AI Agent System is a production-ready barbershop management platform with complete authentication, dashboard, and AI capabilities.

## ✅ Pre-Deployment Checklist

### 1. **Authentication System Status**
- [x] Login functionality tested and working
- [x] Registration multi-step form validated
- [x] Session management operational
- [x] Dashboard access control verified
- [x] CSP headers configured for React hydration
- [x] Production build tested on port 9999

### 2. **Database Configuration**
- [x] Supabase PostgreSQL configured
- [x] Authentication tables created
- [x] Row Level Security (RLS) enabled
- [x] API keys validated and working

### 3. **Application Status**
- [x] Next.js 14 production build successful
- [x] FastAPI backend operational
- [x] Docker containers configured
- [x] Environment variables documented

## 📋 Deployment Steps

### Step 1: Domain Configuration
```bash
# DNS Settings for bookedbarber.com
A Record: @ -> Your server IP
CNAME: www -> bookedbarber.com
CNAME: dashboard -> bookedbarber.com
```

### Step 2: Server Setup (Recommended: Vercel)

#### Option A: Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
cd "/Users/bossio/6FB AI Agent System"
vercel --prod

# Set environment variables in Vercel Dashboard
# Go to: https://vercel.com/dashboard/[project]/settings/environment-variables
```

#### Option B: Traditional VPS Deployment
```bash
# SSH into your server
ssh user@your-server-ip

# Clone repository
git clone https://github.com/your-repo/6fb-ai-agent-system.git
cd 6fb-ai-agent-system

# Install dependencies
npm install

# Build production
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "bookedbarber" -- start
pm2 save
pm2 startup
```

### Step 3: Environment Variables Setup

Create `.env.production` on your deployment platform:

```env
# Core Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://bookedbarber.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dfhqjdoydihajmjxniee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Configuration
NEXT_PUBLIC_API_URL=https://api.bookedbarber.com
FASTAPI_BASE_URL=https://api.bookedbarber.com

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Payment Processing
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Communications
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@bookedbarber.com

# Real-time Features
PUSHER_APP_ID=...
NEXT_PUBLIC_PUSHER_KEY=...
PUSHER_SECRET=...
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_SENTRY_DSN=...
```

### Step 4: SSL Certificate Setup

#### Vercel (Automatic)
SSL certificates are automatically provisioned by Vercel.

#### Traditional Setup (Let's Encrypt)
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d bookedbarber.com -d www.bookedbarber.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Step 5: Database Migration
```bash
# Run database migrations
npx supabase db push

# Seed initial data (optional)
node scripts/seed-production-data.js
```

### Step 6: Post-Deployment Testing

#### Test Authentication Flow
1. Navigate to https://bookedbarber.com
2. Click "Sign In" or go to https://bookedbarber.com/login
3. Test login with credentials:
   - Email: test@bookedbarber.com
   - Password: Test1234
4. Verify redirect to dashboard
5. Test logout functionality

#### Test Registration Flow
1. Go to https://bookedbarber.com/register
2. Complete 3-step registration:
   - Personal information
   - Business details
   - Plan selection
3. Verify email confirmation (if enabled)
4. Test login with new account

#### Test Core Features
- [ ] Dashboard loads with data
- [ ] Analytics display correctly
- [ ] Calendar functionality works
- [ ] AI chat responds
- [ ] Settings save properly

## 🔧 Production Configuration

### Nginx Configuration (if using traditional deployment)
```nginx
server {
    listen 80;
    server_name bookedbarber.com www.bookedbarber.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bookedbarber.com www.bookedbarber.com;

    ssl_certificate /etc/letsencrypt/live/bookedbarber.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookedbarber.com/privkey.pem;

    location / {
        proxy_pass http://localhost:9999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Performance Optimizations
```javascript
// next.config.js additions for production
module.exports = {
  images: {
    domains: ['bookedbarber.com', 'api.bookedbarber.com'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

## 📊 Monitoring & Maintenance

### Health Check Endpoints
- Frontend: https://bookedbarber.com/api/health
- Backend: https://api.bookedbarber.com/health
- Database: Check via Supabase Dashboard

### Monitoring Setup
1. **Uptime Monitoring**: Use UptimeRobot or Pingdom
2. **Error Tracking**: Configure Sentry
3. **Analytics**: Set up PostHog or Google Analytics
4. **Performance**: Monitor Core Web Vitals

### Backup Strategy
```bash
# Database backup (via Supabase Dashboard)
# Automatic daily backups included in Supabase

# Code backup
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### Issue: 500 Internal Server Error
```bash
# Check logs
pm2 logs bookedbarber
# or for Vercel
vercel logs
```

#### Issue: Database Connection Failed
- Verify Supabase URL and keys in environment variables
- Check Supabase service status
- Ensure IP whitelist includes server IP

#### Issue: Authentication Not Working
- Verify NEXT_PUBLIC_SUPABASE_URL is correct
- Check NEXT_PUBLIC_SUPABASE_ANON_KEY is valid
- Ensure cookies are enabled for session storage

#### Issue: Slow Performance
```bash
# Enable caching
npm run build
# Optimize images
next-optimized-images
# Enable CDN for static assets
```

## 📝 Launch Checklist

### Pre-Launch
- [ ] Domain DNS configured
- [ ] SSL certificate active
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Test user accounts created
- [ ] Email service configured (SendGrid)
- [ ] SMS service configured (Twilio)
- [ ] Payment processing tested (Stripe)

### Launch Day
- [ ] Deploy to production
- [ ] Test authentication flow
- [ ] Verify dashboard access
- [ ] Check API endpoints
- [ ] Monitor error logs
- [ ] Test mobile responsiveness
- [ ] Verify email notifications
- [ ] Check performance metrics

### Post-Launch
- [ ] Set up monitoring alerts
- [ ] Configure automated backups
- [ ] Document admin procedures
- [ ] Create user documentation
- [ ] Set up customer support channel
- [ ] Monitor user feedback
- [ ] Plan first updates

## 🎉 Congratulations!
Your BookedBarber.com platform is now live and ready to serve barbershops worldwide!

## Support & Maintenance
- Technical Issues: Check logs and error tracking
- Database: Monitor via Supabase Dashboard
- Performance: Use Vercel Analytics or similar
- Updates: Follow semantic versioning for releases

---
Last Updated: August 2025
Version: 1.0.0
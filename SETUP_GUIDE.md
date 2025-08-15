# BookedBarber AI System - Complete Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18.19+ 
- Docker Desktop
- Git

### 1. Clone & Install
```bash
git clone <repository-url>
cd "6FB AI Agent System"
npm install
```

### 2. Environment Setup
```bash
cp .env.local.example .env.local
```

Add your API keys to `.env.local`:
```bash
# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI (Required)
OPENAI_API_KEY=your_openai_key

# Payments (Required for production)
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public

# Optional but recommended
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=us2
```

### 3. Start Development
```bash
./docker-dev-start.sh
```

### 4. Verify Setup
- Frontend: http://localhost:9999
- Backend: http://localhost:8001
- Health Check: http://localhost:9999/api/health
- AI Testing: http://localhost:9999/ai-testing-dashboard

## 🔑 Getting API Keys

### Supabase (Database & Auth)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy URL and anon key

### OpenAI (AI Features)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Add billing method (required)

### Stripe (Payments)
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Get API keys from Developers → API keys
3. Use test keys for development

### Pusher (Real-time - Optional)
1. Go to [pusher.com](https://pusher.com)
2. Create new app
3. Get keys from App Keys tab

## 🗄️ Database Setup

### Required Tables
The system needs these Supabase tables:
- `profiles` - User accounts
- `barbershops` - Shop information  
- `barbershop_staff` - Staff relationships
- `customers` - Customer data
- `services` - Service offerings
- `appointments` - Booking data
- `transactions` - Payment records

### Auto-Setup
```bash
# Test database connection
node test-supabase-access.js

# Create missing tables (if needed)
npm run db:setup
```

## 🚀 Deployment Options

### Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod
```

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Railway
```bash
railway login
railway up
```

## 🧪 Testing

### Run All Tests
```bash
npm run test:all
```

### Test Individual Features
- Voice Assistant: `/test-voice`
- AI Predictions: `/test-predictions` 
- Multi-Agent: `/test-collaboration`
- Complete Dashboard: `/ai-testing-dashboard`

### Health Checks
```bash
curl http://localhost:9999/api/health
curl http://localhost:8001/health
```

## 🔧 Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Kill processes on ports
sudo lsof -ti:9999 | xargs kill -9
sudo lsof -ti:8001 | xargs kill -9
```

**Docker issues:**
```bash
docker compose down
docker compose up --build
```

**Frontend build errors:**
```bash
rm -rf .next/ node_modules/
npm install
npm run dev
```

**Database connection issues:**
```bash
node test-supabase-access.js
```

### Debug Commands
```bash
# View logs
docker compose logs -f frontend
docker compose logs -f backend

# Restart specific service
docker compose restart frontend

# Check system status
npm run health
```

## 📁 Project Structure

```
6FB AI Agent System/
├── app/                    # Next.js pages & API routes
├── components/             # React components
├── lib/                   # Utilities & configurations
├── services/              # Business logic services
├── database/              # Schema & migration files
├── scripts/               # Setup & utility scripts
├── docs/                  # Documentation
└── docker/                # Docker configurations
```

## 🔐 Security Checklist

- [ ] Environment variables set correctly
- [ ] Supabase RLS policies enabled
- [ ] API rate limiting configured
- [ ] HTTPS enabled in production
- [ ] Error tracking setup (Sentry)
- [ ] Backup strategy implemented

## 📊 Monitoring & Analytics

### Built-in Monitoring
- System health: `/api/health`
- AI performance: `/api/ai/metrics`
- Error tracking: Sentry integration
- User analytics: PostHog integration

### Key Metrics to Track
- Response times
- Error rates
- User engagement
- AI accuracy
- Revenue metrics

## 🆘 Support

### Documentation
- API Reference: `/docs/api`
- Component Library: `/docs/components`
- AI Features: See `AI_ENHANCEMENT_SUMMARY.md`

### Getting Help
- Check health endpoints first
- Review Docker logs
- Test database connection
- Verify environment variables

---

**Next Steps:**
1. Complete environment setup
2. Test all features work
3. Deploy to staging
4. Configure monitoring
5. Launch to production
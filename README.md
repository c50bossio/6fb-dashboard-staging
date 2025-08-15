# BookedBarber Platform - AI Agent System v2.0

Enterprise barbershop platform: Next.js 14 (port 9999) + FastAPI (port 8001) + Supabase PostgreSQL.

\![Next.js](https://img.shields.io/badge/Next.js-14.0-black)
\![Supabase](https://img.shields.io/badge/Supabase-Database-green)
\![Stripe](https://img.shields.io/badge/Stripe-Payments-blue)
\![AI Powered](https://img.shields.io/badge/AI-OpenAI%20%26%20Claude-purple)
\![Voice Enabled](https://img.shields.io/badge/Voice-Enabled-orange)
\![Predictive](https://img.shields.io/badge/Predictive-Analytics-red)

## 🚀 Features

### 🆕 AI Enhancements (v2.0)
Complete AI capabilities with voice interaction, proactive monitoring, multi-agent collaboration, learning system, and predictive analytics. See [AI_ENHANCEMENT_SUMMARY.md](./AI_ENHANCEMENT_SUMMARY.md) for technical details.

### Core Functionality
- **AI-Powered Chat**: Enhanced with RAG, memory, and multi-model support
- **Smart Scheduling**: Advanced calendar with drag-and-drop, resources, and recurring events
- **Payment Processing**: Complete Stripe integration with subscriptions
- **Real-time Updates**: Live dashboards and chat with WebSocket connections
- **Unified Notifications**: Multi-channel notifications (email, SMS, push, in-app)

### Enterprise Features
- **Authentication**: Secure auth with Supabase (supports OAuth providers)
- **Error Tracking**: Comprehensive error monitoring with Sentry
- **Analytics**: Product analytics with session recording via PostHog
- **Feature Flags**: Instant feature toggling with Vercel Edge Config
- **Database**: PostgreSQL with real-time subscriptions
- **File Storage**: Integrated file management with Supabase Storage

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS
- **Calendar**: FullCalendar.io (Premium)
- **Charts**: Recharts
- **Real-time**: Pusher JS

### Backend
- **API**: Next.js API Routes + FastAPI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **AI**: OpenAI + Anthropic SDKs
- **Notifications**: Novu
- **Real-time**: Pusher

### Infrastructure
- **Hosting**: Vercel (recommended)
- **Database**: Supabase Cloud
- **File Storage**: Supabase Storage
- **Error Tracking**: Sentry
- **Analytics**: PostHog
- **Feature Flags**: Vercel Edge Config

## 🚦 Getting Started

### Prerequisites
- Node.js 18.19+
- npm or yarn
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "6FB AI Agent System"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or with Docker
   ./docker-dev-start.sh
   ```

5. **Access the application**
   - Frontend: http://localhost:9999
   - API: http://localhost:8001
   - Health Check: http://localhost:9999/api/health

## 📝 Environment Setup

### Required API Keys

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

### Quick Links to Get API Keys:
- [Supabase](https://supabase.com) - Database & Auth
- [OpenAI](https://platform.openai.com) - GPT Models
- [Anthropic](https://console.anthropic.com) - Claude Models
- [Stripe](https://dashboard.stripe.com) - Payments
- [Sentry](https://sentry.io) - Error Tracking
- [Novu](https://web.novu.co) - Notifications
- [Pusher](https://dashboard.pusher.com) - Real-time
- [PostHog](https://app.posthog.com) - Analytics

### Database Setup

The system needs these Supabase tables:
- `profiles` - User accounts
- `barbershops` - Shop information  
- `barbershop_staff` - Staff relationships
- `customers` - Customer data
- `services` - Service offerings
- `appointments` - Booking data
- `transactions` - Payment records

**Auto-Setup:**
```bash
# Test database connection
node test-supabase-access.js

# Create missing tables (if needed)
npm run db:setup
```

## 🏗️ Project Structure

```
6FB AI Agent System/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── layout.js          # Root layout
├── components/            # React components
├── lib/                   # Utility libraries
├── hooks/                 # Custom React hooks
├── services/              # Business logic
├── database/              # Database schemas
├── scripts/               # Utility scripts
├── public/                # Static assets
└── docker/                # Docker configurations
```

## 🧪 Testing

### AI Feature Testing
Comprehensive testing dashboard: `http://localhost:9999/ai-testing-dashboard`

### Automated Testing
```bash
# Run all tests
npm run test:all

# AI integration tests
node scripts/test-ai-integration.js

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 🚀 Deployment

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

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for deployment best practices.

## 📊 Monitoring

- **Errors**: Check Sentry dashboard
- **Analytics**: View PostHog dashboard  
- **Health**: GET `/api/health`
- **AI Performance**: GET `/api/ai/metrics`
- **Logs**: Check Vercel/Docker logs

### Key Metrics to Track
Response times, error rates, user engagement, and revenue metrics.

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

## 🔐 Security

- Row Level Security (RLS) enabled on all database tables
- API rate limiting implemented
- Input validation and sanitization
- Secure session management
- Regular dependency updates

### Security Checklist
- [ ] Environment variables set correctly
- [ ] Supabase RLS policies enabled
- [ ] API rate limiting configured
- [ ] HTTPS enabled in production
- [ ] Error tracking setup (Sentry)
- [ ] Backup strategy implemented

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- Documentation: See `/docs` folder
- Issues: GitHub Issues
- Email: support@your-domain.com

---

Built with ❤️ by the 6FB team

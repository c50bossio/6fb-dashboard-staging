# 6FB AI Agent System - Enterprise Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18.19+ 
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "6FB AI Agent System"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

4. **Configure your API keys in `.env.local`**

## 🔑 API Keys & Configuration

### Required Services

#### 1. **Supabase** (Database & Auth)
- Go to [supabase.com](https://supabase.com)
- Create a new project
- Get your keys from Settings → API
- Add to `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

#### 2. **OpenAI** (AI Chat)
- Go to [platform.openai.com](https://platform.openai.com)
- Create an API key
- Add to `.env.local`:
  ```
  OPENAI_API_KEY=your_openai_api_key
  ```

#### 3. **Anthropic** (Claude AI)
- Go to [console.anthropic.com](https://console.anthropic.com)
- Create an API key
- Add to `.env.local`:
  ```
  ANTHROPIC_API_KEY=your_anthropic_api_key
  ```

#### 4. **Stripe** (Payments)
- Go to [dashboard.stripe.com](https://dashboard.stripe.com)
- Get your keys from Developers → API keys
- Create webhook endpoint for `http://localhost:9999/api/stripe/webhook`
- Add to `.env.local`:
  ```
  STRIPE_SECRET_KEY=your_stripe_secret_key
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
  STRIPE_WEBHOOK_SECRET=your_webhook_secret
  ```

#### 5. **Sentry** (Error Tracking)
- Go to [sentry.io](https://sentry.io)
- Create a new project (Next.js)
- Add to `.env.local`:
  ```
  SENTRY_AUTH_TOKEN=your_auth_token
  NEXT_PUBLIC_SENTRY_DSN=your_dsn
  ```

#### 6. **Novu** (Notifications)
- Go to [web.novu.co](https://web.novu.co)
- Create a new application
- Add to `.env.local`:
  ```
  NOVU_API_KEY=your_api_key
  NEXT_PUBLIC_NOVU_APP_IDENTIFIER=your_app_id
  ```

#### 7. **Pusher** (Real-time)
- Go to [dashboard.pusher.com](https://dashboard.pusher.com)
- Create a new app
- Add to `.env.local`:
  ```
  PUSHER_APP_ID=your_app_id
  NEXT_PUBLIC_PUSHER_KEY=your_key
  PUSHER_SECRET=your_secret
  NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster
  ```

#### 8. **PostHog** (Analytics)
- Go to [app.posthog.com](https://app.posthog.com)
- Create a new project
- Add to `.env.local`:
  ```
  NEXT_PUBLIC_POSTHOG_KEY=your_project_api_key
  NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
  ```

#### 9. **Vercel Edge Config** (Feature Flags)
- Go to your Vercel dashboard
- Create an Edge Config store
- Add to `.env.local`:
  ```
  EDGE_CONFIG=your_edge_config_connection_string
  ```

#### 10. **FullCalendar** (Premium Calendar)
- Using free trial license (already configured)
- For production, purchase license at [fullcalendar.io](https://fullcalendar.io/purchase)

## 🐳 Docker Development

### Start with Docker
```bash
# Start both frontend and backend
./docker-dev-start.sh

# Access the application
# Frontend: http://localhost:9999
# Backend API: http://localhost:8001

# View logs
docker-compose logs -f

# Stop services
./docker-stop.sh
```

### Manual Development
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd backend
python -m uvicorn fastapi_backend:app --reload --port 8001
```

## 📊 Database Setup

### Initialize Supabase Database
```sql
-- Run the schema files in order:
-- 1. /database/supabase-schema.sql
-- 2. /database/payment-schema.sql
-- 3. /database/notification-schema.sql
```

### Migrate from SQLite (if applicable)
```bash
python scripts/migrate-to-supabase.py
```

## 🧪 Testing

### Run all tests
```bash
npm run test:all
```

### Individual test suites
```bash
npm run test           # Unit tests
npm run test:e2e       # E2E tests with Playwright
npm run test:coverage  # Coverage report
```

## 🚀 Deployment

### Vercel Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` and follow prompts
3. Set environment variables in Vercel dashboard
4. Enable Edge Config for feature flags

### Docker Production
```bash
docker build -t 6fb-frontend -f Dockerfile.frontend .
docker build -t 6fb-backend -f Dockerfile.backend .
docker-compose -f docker-compose.prod.yml up -d
```

## 📱 Key Features & Usage

### 1. **AI Chat** (`/dashboard/chat`)
- Switch between OpenAI and Claude models
- Streaming responses
- Chat history stored in Supabase

### 2. **Bookings Calendar** (`/dashboard/bookings`)
- Drag-and-drop scheduling
- Resource management
- Recurring events

### 3. **Real-time Features** (`/dashboard/realtime`)
- Live dashboard metrics
- Real-time chat rooms
- Instant notifications

### 4. **Analytics** (`/dashboard/analytics`)
- User behavior tracking
- Revenue metrics
- Custom event tracking

### 5. **Feature Flags** (`/dashboard/feature-flags`)
- Instant feature toggling
- A/B testing
- Progressive rollouts

## 🔍 Monitoring & Debugging

### Sentry Dashboard
- View errors: [sentry.io](https://sentry.io)
- Performance monitoring
- User feedback

### PostHog Dashboard
- Analytics: [app.posthog.com](https://app.posthog.com)
- Session recordings
- Feature flag analytics

### Logs
```bash
# Docker logs
docker-compose logs -f

# PM2 logs (if using PM2)
pm2 logs

# Application logs
tail -f logs/app.log
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 9999
   lsof -ti:9999 | xargs kill -9
   
   # Kill process on port 8001
   lsof -ti:8001 | xargs kill -9
   ```

2. **Database connection issues**
   - Check Supabase service status
   - Verify connection string in `.env.local`
   - Ensure database migrations are run

3. **Authentication errors**
   - Clear browser cookies/storage
   - Check Supabase auth settings
   - Verify JWT secret configuration

4. **Payment webhook failures**
   - Use Stripe CLI for local testing
   - Verify webhook endpoint URL
   - Check webhook signing secret

## 📞 Support

- **Documentation**: Check `/docs` folder
- **Issues**: GitHub Issues
- **Community**: Discord/Slack (if applicable)

## 🎯 Next Steps

1. **Customize branding** in `/app/globals.css`
2. **Configure notification templates** in Novu dashboard
3. **Set up monitoring alerts** in Sentry
4. **Create custom analytics dashboards** in PostHog
5. **Define feature flag strategies** in Vercel Edge Config

---

Built with ❤️ using enterprise-grade tools for maximum stability and scalability.
# BookedBarber Platform - AI Agent System v2.0

**The complete enterprise barbershop management solution** - empowering barbershops with AI-driven customer insights, automated bookings, intelligent staff management, and seamless payment processing.

**Production**: [bookedbarber.com](https://bookedbarber.com) | **Development**: localhost:9999

## 🚀 Key Features

### AI-Powered Operations
- **Multi-Model AI**: OpenAI, Anthropic, Google AI with automatic failover
- **Smart Scheduling**: Drag-and-drop calendar with intelligent suggestions
- **Customer Insights**: AI-driven analytics and behavior predictions
- **Voice Assistant**: Natural language booking and management

### Business Management
- **Staff Management**: Complete hiring, payroll, and performance tracking
- **Payment Processing**: Stripe Connect integration with automatic splits
- **Inventory Integration**: CIN7 sync for product management
- **Real-time Updates**: Live dashboards with WebSocket connections

### Enterprise Scale
- **Multi-Location**: Organization management for chains and franchises
- **Role-Based Access**: CLIENT → BARBER → SHOP_OWNER → ENTERPRISE_OWNER
- **Financial Management**: Commission tracking, booth rent, hybrid arrangements
- **Unified Communications**: Email, SMS, push notifications

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

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (see SETUP.md for details)
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Start development
./docker-dev-start.sh          # All services (recommended)
# OR manually:
npm run dev                     # Frontend (port 9999)
python simple_backend.py       # Backend (port 8001)

# 4. Verify setup
npm run claude:health           # Check all services
npm run lint && npm run build  # Verify code quality
```

**📋 For complete setup instructions including database configuration, Stripe integration, and deployment options, see [SETUP.md](./SETUP.md)**

## 📊 System Architecture

- **Frontend**: Next.js 14 (App Router) on port 9999
- **Backend**: FastAPI on port 8001
- **Database**: Supabase PostgreSQL with real-time subscriptions
- **AI**: Multi-provider (OpenAI, Anthropic, Google) with Redis caching
- **Payments**: Stripe Connect for marketplace functionality
- **Real-time**: Pusher WebSocket integration

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

## 🧪 Testing & Deployment

```bash
# Run all tests
npm run test:all

# Production deployment (Vercel recommended)
vercel --prod
```

**📋 For complete testing procedures, deployment options, and production checklists, see [SETUP.md](./SETUP.md)**

## 📊 Monitoring

- **Errors**: Check Sentry dashboard
- **Analytics**: View PostHog dashboard  
- **Health**: GET `/api/health`
- **AI Performance**: GET `/api/ai/metrics`
- **Logs**: Check Vercel/Docker logs

### Key Metrics to Track
Response times, error rates, user engagement, and revenue metrics.

## 🔧 Troubleshooting

**Quick Fixes:**
```bash
# Port conflicts
sudo lsof -ti:9999 | xargs kill -9

# Reset environment
rm -rf .next/ node_modules/ && npm install

# Check system status
npm run health
```

**📋 For complete troubleshooting guide and debug commands, see [SETUP.md](./SETUP.md)**

## 🔐 Security

- Row Level Security (RLS) enabled on all database tables
- API rate limiting and input validation implemented
- Secure session management via Supabase Auth

**📋 For complete security configuration and checklist, see [SETUP.md](./SETUP.md)**

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

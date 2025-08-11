# System Architecture Documentation

## Overview

The 6FB AI Agent System is a full-stack application built with Next.js and FastAPI, using Supabase (PostgreSQL) as the primary database. The system supports a hierarchical barber operations model with real-time features and AI integration.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│                          Port: 9999                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Pages   │  │   API    │  │Components│  │  Hooks   │  │
│  │  (App    │  │  Routes  │  │  (React) │  │(Custom)  │  │
│  │  Router) │  │          │  │          │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                        │
│                        Port: 8001                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   API    │  │Services  │  │   AI     │  │WebSocket │  │
│  │Endpoints │  │ (Python) │  │ Agents   │  │ Handler  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Supabase (Prod)   │     │    Redis Cache      │
│    PostgreSQL        │     │     Port: 6379      │
│  - Auth              │     │  - Session Cache    │
│  - Realtime          │     │  - AI Response      │
│  - Storage           │     │    Cache            │
└─────────────────────┘     └─────────────────────┘
```

## Database Architecture

### Single Database Strategy
- **Production & Development**: Supabase PostgreSQL
- **No SQLite**: Eliminated dev/prod mismatches
- **Connection**: Direct Supabase client libraries

### Core Tables Structure

```sql
barbershops (Foundation)
├── services (Shop services)
├── barbershop_staff (Barber assignments)
├── customers (Client records)
├── appointments (Bookings)
├── transactions (Payments)
└── products (Inventory)

barber_customizations (Barber profiles)
├── barber_services (Individual services)
├── barber_availability (Schedules)
└── portfolio_images (Work samples)

financial_arrangements (Payment structures)
├── Commission rates
├── Booth rent
└── Product commissions

organizations (Multi-shop enterprises)
└── barbershops (Multiple locations)
```

### Table Relationships

1. **User Hierarchy**
   - `users` (auth.users) → base authentication
   - `profiles` → extended user data with roles
   - `barbershop_staff` → links barbers to shops
   - `financial_arrangements` → payment terms

2. **Booking Flow**
   - `customers` → `appointments` → `transactions`
   - `appointments` references `barbershops`, `services`, `users` (barber)
   - `transactions` tracks payments and commissions

3. **Product Sales**
   - `products` → `product_sales`
   - Commission tracking per barber
   - Inventory management

## Data Flow

### Appointment Booking Flow
```
1. Client visits barber landing page
   └── GET /api/public/barber/[shop]/[barber]
   
2. Client selects service and time
   └── POST /api/appointments/book
   
3. Appointment created in database
   └── INSERT INTO appointments
   
4. Real-time update via Supabase
   └── WebSocket notification
   
5. Barber receives notification
   └── UI updates automatically
```

### Financial Transaction Flow
```
1. Service completed
   └── UPDATE appointments SET status = 'completed'
   
2. Payment processed
   └── Stripe API → POST /api/payments
   
3. Transaction recorded
   └── INSERT INTO transactions
   
4. Commission calculated
   └── Based on financial_arrangements
   
5. Payout scheduled
   └── Stripe Connect transfer
```

## API Structure

### Next.js API Routes (`/app/api/`)
- `/auth/*` - Authentication endpoints
- `/shop/*` - Shop management
- `/barber/*` - Barber operations
- `/appointments/*` - Booking management
- `/products/*` - Inventory
- `/public/*` - Public-facing endpoints

### FastAPI Endpoints (`/fastapi_backend.py`)
- `/ai/*` - AI agent interactions
- `/analytics/*` - Business intelligence
- `/notifications/*` - Alert system
- `/websocket` - Real-time connections

## Authentication & Authorization

### Role-Based Access Control (RBAC)
```
SUPER_ADMIN
  └── ENTERPRISE_OWNER (multiple shops)
      └── SHOP_OWNER (single shop)
          └── BARBER (individual)
              └── CLIENT (customer)
```

### Row Level Security (RLS)
- Enforced at database level
- Policies based on user roles
- Automatic data isolation

## External Integrations

### Payment Processing
- **Stripe**: Main payment processor
- **Stripe Connect**: Split payments
- **Webhooks**: Payment status updates

### Communications
- **Pusher**: Real-time updates
- **SendGrid**: Email notifications
- **Twilio**: SMS notifications (planned)

### AI Services
- **OpenAI GPT-4**: Primary AI
- **Anthropic Claude**: Fallback AI
- **Google Gemini**: Additional AI option

### Reviews
- **Google Business Profile API**: Review fetching
- **No internal storage**: Live API calls
- **Automatic sync**: Rating updates

## Deployment Architecture

### Docker Containers
```yaml
services:
  frontend:
    - Next.js application
    - Port: 9999
    - Hot reload enabled
    
  backend:
    - FastAPI server
    - Port: 8001
    - Auto-restart on changes
    
  redis:
    - Cache layer
    - Port: 6379
    - Session storage
```

### Environment Configuration
- `.env.local`: Local development
- Environment variables in Docker
- Secrets in production (Vercel/Render)

## Security Measures

### Data Protection
- JWT authentication tokens
- Encrypted sensitive data
- HTTPS enforcement
- CORS configuration

### API Security
- Rate limiting middleware
- Input validation
- SQL injection prevention
- XSS protection

## Performance Optimization

### Caching Strategy
- Redis for session data
- AI response caching (60-70% cost reduction)
- Database query caching
- Static asset CDN

### Database Optimization
- Indexed foreign keys
- Materialized views for analytics
- Connection pooling
- Query optimization

## Monitoring & Logging

### Application Monitoring
- Health check endpoints
- Error tracking (Sentry)
- Performance metrics (PostHog)

### Database Monitoring
- Supabase dashboard
- Query performance tracking
- Storage usage alerts

## Disaster Recovery

### Backup Strategy
- Supabase automated backups
- Point-in-time recovery
- Cross-region replication (planned)

### Recovery Procedures
1. Database restoration from backup
2. Redis cache rebuild
3. Service health verification
4. Data integrity checks

## Future Enhancements

### Planned Improvements
- GraphQL API layer
- Microservices architecture
- Kubernetes deployment
- Multi-region support
- Enhanced caching with CDN

### Scalability Considerations
- Horizontal scaling ready
- Database sharding capability
- Load balancer compatible
- Stateless application design

---

*Last Updated: 2025-01-11*
*Version: 1.0*
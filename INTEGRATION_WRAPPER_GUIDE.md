# Google Calendar & Traft.com Integration Wrappers

This guide documents the integration wrapper system for connecting external calendar and booking platforms to the 6FB AI Agent System.

## Overview

The integration system provides lightweight wrappers that connect to existing Google Calendar and Traft.com accounts, normalizing appointment data for AI agent consumption. **This is not a full calendar or booking system** - it's designed to sync data from existing external systems.

## Architecture

```
External Systems → Integration Wrappers → Data Normalization → AI Context Builder → AI Agents
```

### Components

1. **Integration Services** - API wrappers for external platforms
2. **Data Normalization** - Unified data format for all platforms
3. **AI Context Builder** - Business insights and recommendations
4. **Connection UI** - Simple setup wizard for users
5. **Unified API** - Single endpoint for all integration data

## Supported Integrations

### Google Calendar
- **Type**: OAuth2 integration
- **Purpose**: Connect existing Google Calendar to sync appointments
- **Features**: 
  - Read-only access to calendar events
  - Automatic customer extraction from event details
  - Service categorization from event titles
  - Multi-calendar support

### Traft.com
- **Type**: API Key integration  
- **Purpose**: Connect existing Traft booking system
- **Features**:
  - Full appointment and customer data
  - Service pricing and duration
  - Multi-location support
  - Staff and customer management data

## File Structure

```
/services/integrations/
├── google-calendar-service.js    # Google Calendar API wrapper
├── trafft-service.js             # Traft.com API wrapper
├── data-normalization-service.js # Unified data format
└── ai-context-builder.js         # Business intelligence

/app/api/integrations/
├── google/
│   ├── auth/route.js             # OAuth flow
│   ├── callback/route.js         # OAuth callback
│   └── sync/route.js             # Data sync
├── trafft/
│   ├── auth/route.js             # API key auth
│   └── sync/route.js             # Data sync
├── list/route.js                 # List all integrations
└── data/route.js                 # Unified data endpoint

/components/integrations/
├── IntegrationConnectionWizard.js # Setup UI
└── IntegrationDataDashboard.js   # Data visualization

/database/
└── integration-schema.sql        # Database schema
```

## Database Schema

### Core Tables

```sql
-- Integration credentials and configuration
integrations (
    id, platform, barbershop_id, is_active,
    credentials, account_info, sync_schedule,
    last_sync_at, next_sync_at, metadata
)

-- Normalized appointment data from all platforms
appointments (
    id, integration_id, platform, platform_appointment_id,
    title, description, start_time, end_time, duration_minutes,
    location, status, attendees, metadata
)

-- Integration statistics
integration_stats (
    integration_id, total_appointments, total_customers,
    total_revenue, last_updated
)
```

## API Endpoints

### Authentication Endpoints

```javascript
// Google Calendar OAuth
POST /api/integrations/google/auth
GET  /api/integrations/google/callback
DELETE /api/integrations/google/auth

// Traft.com API Key
POST /api/integrations/trafft/auth
GET  /api/integrations/trafft/auth
DELETE /api/integrations/trafft/auth
```

### Data Sync Endpoints

```javascript
// Platform-specific sync
POST /api/integrations/google/sync
GET  /api/integrations/google/sync
POST /api/integrations/trafft/sync
GET  /api/integrations/trafft/sync

// Unified data access
GET  /api/integrations/data
POST /api/integrations/data  # Trigger sync all
PUT  /api/integrations/data  # Update data

// Integration management
GET  /api/integrations/list
POST /api/integrations/list  # Bulk operations
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install googleapis google-auth-library axios
```

### 2. Environment Variables

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:9999/api/integrations/google/callback

# Database
DATABASE_PATH=/path/to/agent_system.db

# App URL
NEXTAUTH_URL=http://localhost:9999
```

### 3. Database Setup

```bash
sqlite3 agent_system.db < database/integration-schema.sql
```

### 4. Google Cloud Console Setup

1. Create a new project in Google Cloud Console
2. Enable Calendar API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:9999/api/integrations/google/callback`
5. Add authorized origins: `http://localhost:9999`

## Usage Examples

### Connect Google Calendar

```javascript
// Frontend - trigger OAuth flow
const response = await fetch('/api/integrations/google/auth?barbershopId=default')
const { authUrl } = await response.json()
window.location.href = authUrl
```

### Connect Traft.com

```javascript
// Frontend - provide API credentials
const response = await fetch('/api/integrations/trafft/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    barbershopId: 'default',
    apiKey: 'your_api_key',
    apiSecret: 'your_api_secret'
  })
})
```

### Get Unified Data

```javascript
// Get all appointment data with AI context
const response = await fetch('/api/integrations/data?barbershopId=default&type=full')
const data = await response.json()

// Access normalized appointments
console.log(data.appointments.data)

// Access AI insights
console.log(data.context.recommendations)
```

### Trigger Sync

```javascript
// Sync all integrations
const response = await fetch('/api/integrations/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    barbershopId: 'default',
    syncType: 'incremental'
  })
})
```

## Data Normalization

All appointment data is normalized to a standard format:

```javascript
{
  id: "platform_appointmentId",
  platformId: "originalId",
  platform: "google_calendar|trafft",
  
  // Basic info
  title: "Service - Customer Name",
  description: "Notes or description",
  
  // Timing
  startTime: "2024-01-01T10:00:00Z",
  endTime: "2024-01-01T11:00:00Z",
  duration: 60,
  
  // Participants
  customer: {
    name: "Customer Name",
    email: "customer@email.com",
    phone: "+1234567890",
    id: "customerId"
  },
  
  staff: {
    name: "Staff Name",
    email: "staff@email.com",
    id: "staffId"
  },
  
  // Service details
  service: {
    name: "Haircut",
    price: 50.00,
    category: "hair",
    duration: 60
  },
  
  // Business context
  businessContext: {
    isNewCustomer: false,
    customerLifetimeValue: 250.00,
    paymentStatus: "paid"
  }
}
```

## AI Context Structure

The AI Context Builder provides structured insights:

```javascript
{
  // Business overview
  overview: {
    today: { appointments: 5, revenue: 300 },
    week: { appointments: 28, revenue: 1400 },
    upcoming: { count: 15, next24Hours: 3 }
  },
  
  // Customer insights
  customers: {
    total: 150,
    new: 12,
    retentionRate: 75.5,
    highValue: [/* top customers */]
  },
  
  // Service performance
  services: {
    popular: [/* most booked services */],
    highRevenue: [/* highest revenue services */]
  },
  
  // AI recommendations
  recommendations: [{
    type: "revenue",
    priority: "high",
    title: "Increase Average Ticket Value",
    description: "Current average ticket is $45. Consider premium services.",
    actions: ["Introduce premium packages", "Offer add-on services"]
  }]
}
```

## UI Components

### Connection Wizard

```jsx
import IntegrationConnectionWizard from '@/components/integrations/IntegrationConnectionWizard'

<IntegrationConnectionWizard 
  barbershopId="default"
  onConnectionComplete={(result) => {
    console.log('Integration connected:', result)
  }}
/>
```

### Data Dashboard

```jsx
import IntegrationDataDashboard from '@/components/integrations/IntegrationDataDashboard'

<IntegrationDataDashboard barbershopId="default" />
```

## Error Handling

### Common Issues

1. **Google OAuth Errors**
   - Check redirect URI configuration
   - Verify client ID and secret
   - Ensure Calendar API is enabled

2. **Traft API Errors**
   - Validate API credentials
   - Check base URL (if custom)
   - Verify API permissions

3. **Sync Failures**
   - Check network connectivity
   - Verify credentials haven't expired
   - Review API rate limits

### Debug Mode

Set environment variable for detailed logging:

```bash
DEBUG=integration:* npm run dev
```

## Security Considerations

1. **Credential Storage**: All credentials are stored as JSON strings in the database
2. **API Keys**: Traft API keys are stored securely and never exposed to frontend
3. **OAuth Tokens**: Google tokens include refresh tokens for automatic renewal
4. **HTTPS**: Use HTTPS in production for OAuth callbacks
5. **Scopes**: Request minimal required permissions

## Performance Optimization

1. **Sync Scheduling**: Configurable sync intervals (hourly, daily, manual)
2. **Incremental Sync**: Only fetch new/updated appointments since last sync
3. **Database Indexes**: Optimized queries for appointment lookups
4. **Caching**: Consider adding Redis for frequently accessed data

## Monitoring & Maintenance

### Health Checks

```javascript
// Check integration status
GET /api/integrations/list?barbershopId=default

// Check sync status
GET /api/integrations/google/sync?barbershopId=default
GET /api/integrations/trafft/sync?barbershopId=default
```

### Maintenance Tasks

1. **Token Refresh**: Google tokens are automatically refreshed
2. **Error Handling**: Failed syncs are logged with error details
3. **Data Cleanup**: Consider archiving old appointments periodically
4. **Statistics Updates**: Integration stats are updated after each sync

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Test Google Calendar connection (requires credentials)
npm run test:google

# Test Traft API connection (requires credentials)
npm run test:trafft
```

### Manual Testing

1. Connect Google Calendar with test account
2. Connect Traft with demo credentials
3. Verify data normalization
4. Test sync functionality
5. Validate AI context generation

## Limitations

1. **Google Calendar**: Limited business context (no pricing, customer history)
2. **Traft.com**: Depends on their API availability and rate limits
3. **Real-time Updates**: Polling-based sync, not real-time webhooks
4. **Data Retention**: Appointments are stored locally, consider data lifecycle

## Future Enhancements

1. **Webhook Support**: Real-time updates instead of polling
2. **More Platforms**: Square Appointments, Acuity, Calendly
3. **Two-way Sync**: Create appointments in external systems
4. **Advanced Analytics**: Machine learning insights
5. **Mobile Notifications**: Push notifications for upcoming appointments

## Support

For issues or questions:

1. Check this documentation
2. Review error logs in `/api/integrations/*` endpoints
3. Test credentials with external platform APIs directly
4. Verify database schema is up to date
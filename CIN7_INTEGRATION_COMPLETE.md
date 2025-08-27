# CIN7 Integration Complete Documentation

## 🚀 Overview

This document provides complete documentation for the production-ready CIN7 integration system for the 6FB AI Agent barbershop platform. The integration includes real-time inventory synchronization, webhook processing, booking system integration, and comprehensive error handling.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Components](#components)
3. [Installation & Setup](#installation--setup)
4. [Configuration](#configuration)
5. [API Endpoints](#api-endpoints)
6. [Real-time Features](#real-time-features)
7. [Booking Integration](#booking-integration)
8. [Testing](#testing)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

The CIN7 integration consists of several interconnected services:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CIN7 API      │◄──►│  Integration    │◄──►│  Supabase DB    │
│                 │    │  Services       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        ▼                        │
         │              ┌─────────────────┐                │
         │              │  Real-time      │                │
         └─────────────►│  Sync Service   │◄───────────────┘
                        └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Booking        │
                        │  Integration    │
                        └─────────────────┘
```

## 🧩 Components

### Core Services

1. **CIN7 Client** (`lib/cin7-client.js`)
   - Direct API communication with CIN7
   - Authentication and encryption handling
   - Rate limiting and error handling

2. **Production Sync Service** (`lib/cin7-production-sync-service.js`)
   - Batch processing with error recovery
   - Progressive retry strategies
   - Comprehensive data mapping

3. **Real-time Sync** (`lib/cin7-realtime-sync.js`)
   - Webhook processing
   - Live inventory updates
   - Event-driven architecture

4. **Booking Integration** (`lib/cin7-booking-integration.js`)
   - Service availability checking
   - Inventory reservations
   - Automated stock management

5. **Browser Sync** (`cin7-browser-sync.js`)
   - Alternative sync method using browser automation
   - Handles API access limitations
   - Full Supabase integration

### API Endpoints

- `GET/PUT/DELETE /api/cin7/credentials` - Credential management
- `GET/POST /api/cin7/sync` - Manual synchronization
- `POST /api/cin7/webhook` - Webhook receiver
- `GET /api/cin7/status` - Connection status

### Database Schema

#### CIN7 Connections Table
```sql
CREATE TABLE cin7_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  barbershop_id UUID REFERENCES barbershops(id),
  account_id TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  account_name TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_sync BOOLEAN DEFAULT false,
  sync_interval_minutes INTEGER DEFAULT 15,
  webhook_url TEXT,
  webhook_secret TEXT,
  last_sync TIMESTAMPTZ,
  last_sync_status VARCHAR(20),
  last_error TEXT,
  sync_settings JSONB DEFAULT '{"sync_products": true, "sync_stock": true}',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Inventory Extensions
```sql
ALTER TABLE inventory ADD COLUMN cin7_product_id TEXT;
ALTER TABLE inventory ADD COLUMN cin7_sku TEXT;
ALTER TABLE inventory ADD COLUMN cin7_barcode TEXT;
ALTER TABLE inventory ADD COLUMN cin7_last_sync TIMESTAMPTZ;
ALTER TABLE inventory ADD COLUMN cin7_sync_enabled BOOLEAN DEFAULT true;
```

## 🛠️ Installation & Setup

### Prerequisites

1. Node.js 18+ with ES modules support
2. Supabase project with RLS enabled
3. CIN7 account with API access
4. Environment variables configured

### Environment Variables

```env
# CIN7 Configuration
CIN7_API_URL=https://inventory.dearsystems.com
CIN7_WEBHOOK_SECRET=your-webhook-secret

# Encryption (required for production)
ENCRYPTION_KEY=your-32-character-encryption-key
ENCRYPTION_SALT=your-encryption-salt

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Database Setup

1. Run the CIN7 schema migration:
```bash
node scripts/setup-cin7-direct.js
```

2. Apply RLS policies and create indexes:
```sql
-- Enable RLS
ALTER TABLE cin7_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cin7_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_cin7_connections_barbershop_id ON cin7_connections(barbershop_id);
CREATE INDEX idx_cin7_sync_logs_connection_id ON cin7_sync_logs(connection_id);
CREATE INDEX idx_inventory_cin7_product ON inventory(cin7_product_id);
```

### Service Installation

1. Install dependencies:
```bash
npm install playwright @supabase/supabase-js
```

2. Initialize real-time sync service:
```javascript
import cin7RealtimeSync from '@/lib/cin7-realtime-sync.js'
await cin7RealtimeSync.initialize()
```

## ⚙️ Configuration

### CIN7 API Setup

1. **Get API Credentials**:
   - Login to CIN7 inventory management
   - Navigate to Settings → Integrations → API
   - Create new API application
   - Note Account ID and API Key

2. **Configure Webhooks**:
   - Set webhook URL: `https://your-domain.com/api/cin7/webhook`
   - Enable events: `Stock.Updated`, `Product.Modified`, `Sale.Completed`
   - Set webhook secret for security

### Sync Settings

Configure sync behavior per barbershop:
```json
{
  "auto_sync": true,
  "sync_interval_minutes": 15,
  "low_stock_alerts": true,
  "sync_products": true,
  "sync_stock_levels": true,
  "sync_purchase_orders": false
}
```

## 🔌 API Endpoints

### Credentials Management

#### Save/Update Credentials
```http
PUT /api/cin7/credentials
Content-Type: application/json

{
  "accountId": "your-account-id",
  "apiKey": "your-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Credentials saved successfully",
  "accountName": "Your Company Name",
  "timestamp": "2025-08-27T10:00:00Z"
}
```

#### Get Credentials Status
```http
GET /api/cin7/credentials
```

**Response:**
```json
{
  "hasCredentials": true,
  "credentials": {
    "maskedAccountId": "12345••••",
    "lastTested": "2025-08-27T10:00:00Z",
    "lastSynced": "2025-08-27T10:05:00Z",
    "apiVersion": "v2"
  }
}
```

### Synchronization

#### Manual Sync
```http
POST /api/cin7/sync
Content-Type: application/json

{
  "forceFullSync": false,
  "syncStockOnly": false,
  "retryFailedItems": true
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "productsProcessed": 150,
    "productsCreated": 5,
    "productsUpdated": 145,
    "stockUpdated": 150,
    "errorCount": 0,
    "timestamp": "2025-08-27T10:10:00Z"
  }
}
```

#### Get Sync Status
```http
GET /api/cin7/sync
```

**Response:**
```json
{
  "isConnected": true,
  "lastSync": "2025-08-27T10:10:00Z",
  "lastSyncStatus": "success",
  "inventoryCount": 150,
  "recentSyncs": [
    {
      "id": "sync-123",
      "sync_type": "manual",
      "status": "success",
      "items_synced": 150,
      "started_at": "2025-08-27T10:10:00Z",
      "completed_at": "2025-08-27T10:12:00Z"
    }
  ]
}
```

### Webhook Processing

#### Webhook Receiver
```http
POST /api/cin7/webhook
Content-Type: application/json
X-Cin7-Signature: sha256=webhook-signature

{
  "Type": "Stock.Updated",
  "ProductID": "12345",
  "Available": 25,
  "OnHand": 30,
  "Allocated": 5,
  "Timestamp": "2025-08-27T10:15:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "type": "Stock.Updated",
  "timestamp": "2025-08-27T10:15:00Z"
}
```

## ⚡ Real-time Features

### Automatic Synchronization

The system automatically:
- Syncs inventory every 15 minutes (configurable)
- Processes webhooks in real-time
- Updates booking availability instantly
- Triggers low stock alerts

### Event System

```javascript
// Listen for real-time updates
cin7RealtimeSync.on('inventoryChanged', (product) => {
  console.log(`Stock updated: ${product.name} = ${product.current_stock}`)
})

cin7RealtimeSync.on('lowStockAlert', (alert) => {
  console.log(`Low stock: ${alert.productName} (${alert.currentStock} left)`)
})

cin7RealtimeSync.on('webhookError', (error) => {
  console.error(`Webhook processing failed: ${error.error}`)
})
```

### Supabase Real-time

```javascript
// Subscribe to inventory changes
const supabase = createClient()
const channel = supabase
  .channel('inventory-updates')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'inventory' },
    (payload) => {
      console.log('Inventory updated:', payload.new)
    }
  )
  .subscribe()
```

## 📅 Booking Integration

### Service Availability Checking

```javascript
import Cin7BookingIntegration from '@/lib/cin7-booking-integration.js'

const bookingIntegration = new Cin7BookingIntegration()

// Check if service can be booked
const availability = await bookingIntegration.checkServiceAvailability(
  serviceId,
  appointmentDate,
  barbershopId
)

if (availability.isAvailable) {
  // Service can be booked
  console.log('Service available')
} else {
  // Show alternatives or notify of stock issues
  console.log('Insufficient inventory:', availability.insufficientStock)
  console.log('Alternatives:', availability.alternativeSuggestions)
}
```

### Inventory Reservations

```javascript
// Reserve inventory for confirmed appointment
const reservation = await bookingIntegration.reserveInventoryForAppointment(appointmentId)

// Release reservation when appointment is cancelled
await bookingIntegration.releaseInventoryReservation(appointmentId, false)

// Consume inventory when appointment is completed
await bookingIntegration.releaseInventoryReservation(appointmentId, true)
```

### Automatic Service Updates

The system automatically:
- Disables services when inventory is insufficient
- Re-enables services when stock is replenished
- Adjusts daily booking limits based on available stock
- Suggests alternative services when primary services are unavailable

## 🧪 Testing

### Comprehensive Test Suite

Run the complete integration test:
```bash
node scripts/test-cin7-integration-complete.js
```

This tests:
- Database schema and connectivity
- API authentication and endpoints
- Product and stock synchronization
- Webhook processing
- Booking system integration
- Error handling and recovery
- Performance and rate limiting

### Manual Testing

1. **Connection Test**:
```bash
curl -X GET "http://localhost:3000/api/cin7/status" \
  -H "Content-Type: application/json"
```

2. **Sync Test**:
```bash
curl -X POST "http://localhost:3000/api/cin7/sync" \
  -H "Content-Type: application/json" \
  -H "x-dev-bypass: true" \
  -d '{"forceFullSync": true}'
```

3. **Webhook Test**:
```bash
curl -X POST "http://localhost:3000/api/cin7/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Cin7-Signature: test-signature" \
  -d '{
    "Type": "Stock.Updated",
    "ProductID": "test-123",
    "Available": 50,
    "Timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
```

## 📊 Monitoring & Maintenance

### Health Checks

Monitor system health with:
- Database connectivity
- CIN7 API availability
- Webhook processing status
- Sync success rates
- Error frequency

### Performance Metrics

Track:
- Sync duration and throughput
- API response times
- Webhook processing speed
- Database query performance
- Memory usage

### Logs and Alerts

Key log events:
```
✅ Sync completed: 150 products updated
⚠️ Low stock warning: Product XYZ (3 remaining)
❌ Sync failed: API rate limit exceeded
🔔 Webhook processed: Stock.Updated for Product 123
```

Set up alerts for:
- Sync failures
- API connectivity issues
- High error rates
- Performance degradation

### Maintenance Tasks

#### Daily
- Review sync logs for errors
- Check inventory alert count
- Monitor API usage

#### Weekly
- Clean up old sync logs
- Review webhook retry queue
- Update test credentials

#### Monthly
- Rotate API keys
- Performance optimization review
- Update documentation

## 🐛 Troubleshooting

### Common Issues

#### 1. Sync Failures

**Symptoms**: Products not updating, sync status shows "failed"

**Causes**:
- Invalid API credentials
- Rate limiting
- Network connectivity

**Solutions**:
```bash
# Check credentials
curl -X GET "http://localhost:3000/api/cin7/credentials"

# Test connection
node -e "
const Cin7Client = require('./lib/cin7-client.js').Cin7Client;
const client = new Cin7Client('account-id', 'api-key');
client.testConnection().then(console.log);
"

# Reset and retry
curl -X POST "http://localhost:3000/api/cin7/sync" \
  -H "Content-Type: application/json" \
  -d '{"forceFullSync": true, "retryFailedItems": true}'
```

#### 2. Webhook Not Working

**Symptoms**: Real-time updates not happening

**Causes**:
- Webhook URL not accessible
- Signature verification failing
- CIN7 webhook not configured

**Solutions**:
```bash
# Test webhook endpoint
curl -X POST "http://localhost:3000/api/cin7/webhook" \
  -H "Content-Type: application/json" \
  -d '{"Type": "Test", "ProductID": "test"}'

# Check webhook logs
grep "webhook" /var/log/application.log

# Re-register webhooks
curl -X POST "http://localhost:3000/api/cin7/webhooks/register"
```

#### 3. Booking Integration Issues

**Symptoms**: Services showing as unavailable despite having stock

**Causes**:
- Service-product links missing
- Inventory reservations not released
- Stock calculation errors

**Solutions**:
```javascript
// Check service-product relationships
const { data: serviceProducts } = await supabase
  .from('service_products')
  .select('*, services(name), inventory(name, current_stock)')
  .eq('service_id', serviceId)

// Release stuck reservations
const bookingIntegration = new Cin7BookingIntegration()
await bookingIntegration.updateServiceAvailability(barbershopId)
```

#### 4. Performance Issues

**Symptoms**: Slow sync times, high memory usage

**Causes**:
- Large product catalog
- Inefficient queries
- Memory leaks

**Solutions**:
```bash
# Monitor memory usage
node --max-old-space-size=4096 scripts/test-cin7-integration-complete.js

# Enable query optimization
ENABLE_QUERY_LOGGING=true node server.js

# Use batch processing
curl -X POST "http://localhost:3000/api/cin7/sync" \
  -d '{"syncStockOnly": true, "batchSize": 25}'
```

### Debug Mode

Enable debug logging:
```env
DEBUG=cin7:*
NODE_ENV=development
```

This provides detailed logs for:
- API requests and responses
- Database queries
- Webhook processing
- Error stack traces

### Support Resources

1. **CIN7 API Documentation**: https://cin7.com/api-docs
2. **Supabase Documentation**: https://supabase.com/docs
3. **Error Code Reference**: See `lib/cin7-client.js` for error mappings
4. **Test Suite**: Run `scripts/test-cin7-integration-complete.js` for diagnostics

## 📈 Performance Optimization

### Batch Processing

- Process products in batches of 50-100
- Use progressive delays to respect rate limits
- Implement queue management for high-volume updates

### Caching Strategy

- Cache product data for 5 minutes
- Use Redis for distributed caching
- Implement cache invalidation on webhooks

### Database Optimization

- Use composite indexes on `(barbershop_id, cin7_product_id)`
- Implement connection pooling
- Use read replicas for reporting

## 🔐 Security Best Practices

### API Key Security

- Encrypt all stored credentials using AES-256-GCM
- Rotate keys monthly
- Use environment variables for secrets
- Implement key rotation without downtime

### Webhook Security

- Verify webhook signatures
- Use HTTPS for all webhook URLs
- Implement replay attack prevention
- Rate limit webhook endpoints

### Database Security

- Enable Row Level Security (RLS)
- Use least-privilege access
- Encrypt sensitive columns
- Regular security audits

## 🚀 Deployment

### Production Checklist

- [ ] All API keys rotated and encrypted
- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] Webhooks registered with CIN7
- [ ] Health monitoring configured
- [ ] Error alerting enabled
- [ ] Performance monitoring active
- [ ] Backup strategy implemented
- [ ] Documentation updated

### Scaling Considerations

- Use horizontal scaling for webhook processing
- Implement queue-based sync processing
- Use CDN for static resources
- Monitor and optimize database performance

---

## 📞 Support

For technical support or questions about the CIN7 integration:

1. Check the troubleshooting section above
2. Run the test suite for diagnostics
3. Review application logs
4. Contact the development team with specific error messages and reproduction steps

**Integration Version**: 2.0.0  
**Last Updated**: August 27, 2025  
**Compatibility**: CIN7 API v2, Supabase, Node.js 18+
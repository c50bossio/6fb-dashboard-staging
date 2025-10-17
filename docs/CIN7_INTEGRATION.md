# Cin7 Warehouse Integration

## Overview

The Cin7 integration allows barbershops to connect their warehouse inventory management system with the POS, enabling real-time inventory tracking and automated synchronization.

## Features

- ✅ **Multi-tenant Support**: Each user can connect their own Cin7 account
- ✅ **Real-time Sync**: Automatic inventory updates via webhooks
- ✅ **Secure Storage**: API credentials are encrypted at rest
- ✅ **Minimal UI**: Unobtrusive integration that doesn't clutter the interface
- ✅ **Manual & Auto Sync**: Choose between manual sync or automatic 15-minute intervals

## Setup Instructions

### 1. Database Setup

Run the setup script to create the necessary database tables:

```bash
node scripts/setup-cin7-tables.js
```

Or manually run the SQL in `database/cin7-schema.sql` in your Supabase SQL editor.

### 2. Environment Configuration

Add the encryption key to your `.env.local`:

```bash
# Generate a secure encryption key
openssl rand -base64 32

# Add to .env.local
ENCRYPTION_KEY=your_generated_key_here
NEXT_PUBLIC_APP_URL=http://localhost:9999  # or your production URL
```

### 3. Getting Cin7 API Credentials

1. Log into your Cin7 account at [inventory.dearsystems.com](https://inventory.dearsystems.com)
2. Navigate to **Settings** (gear icon)
3. Go to **Integrations & API** → **API v1**
4. Note your **Account ID**
5. Click **Add API Application** to create a new API key
6. Copy the generated **API Application Key**

### 4. Connecting Cin7 in the App

1. Navigate to the **Inventory** page (`/dashboard/inventory`)
2. Scroll to the bottom of the page
3. Click the subtle link: **"Advanced: Connect warehouse system"**
4. Enter your Cin7 Account ID and API Key
5. Click **Connect**

## API Endpoints

### Connect Cin7
```
POST /api/cin7/connect
Body: { accountId, apiKey }
```

### Disconnect Cin7
```
POST /api/cin7/disconnect
```

### Sync Inventory
```
POST /api/cin7/sync
```

### Check Status
```
GET /api/cin7/sync
```

## Database Schema

### cin7_connections
Stores encrypted API credentials and connection settings for each user.

### cin7_sync_logs
Tracks synchronization history and errors.

### inventory (extended)
Added Cin7-specific columns:
- `cin7_product_id`
- `cin7_sku`
- `cin7_barcode`
- `cin7_last_sync`

## Security

- **Encryption**: API keys are encrypted using AES-256-GCM before storage
- **Row Level Security**: Users can only access their own connections
- **Token Validation**: All API endpoints require authentication
- **Webhook Signatures**: Webhook payloads are validated for authenticity

## UI Design Philosophy

The integration follows a **minimal footprint** approach:

1. **Discovery**: Small, unobtrusive link at the bottom of inventory page
2. **Connection**: Simple modal with clear instructions
3. **Status**: Tiny indicator when connected (green dot + "Warehouse sync active")
4. **Actions**: Subtle "Sync now" link for manual synchronization

This design ensures the feature is available for the ~1% of users who need it without cluttering the interface for the 99% who don't.

## Sync Behavior

### Automatic Sync
- Runs every 15 minutes (configurable)
- Updates only changed items
- Logs all sync operations

### Manual Sync
- Triggered by clicking "Sync now"
- Full inventory refresh
- Shows loading state during sync

### Webhook Updates
- Real-time updates for critical changes
- Stock level changes
- Product modifications
- Sale completions

## Troubleshooting

### Connection Failed
- Verify Account ID and API Key are correct
- Check that API v1 is enabled in Cin7
- Ensure your Cin7 subscription includes API access

### Sync Errors
- Check `cin7_sync_logs` table for detailed error messages
- Verify network connectivity
- Ensure Cin7 API rate limits aren't exceeded

### Missing Products
- Products must exist in Cin7 first
- Run manual sync to fetch new products
- Check sync settings in the connection

## Future Enhancements

- [ ] Purchase order creation from low stock alerts
- [ ] Bi-directional sync (push sales to Cin7)
- [ ] Multiple warehouse location support
- [ ] Barcode scanning integration
- [ ] Automated reorder suggestions
- [ ] Stock transfer management

## Support

For issues or questions about the Cin7 integration:
1. Check the sync logs in the database
2. Review the error messages in browser console
3. Verify API credentials are still valid
4. Contact Cin7 support for API-specific issues
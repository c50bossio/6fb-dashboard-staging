# CIN7 Integration Guide: Transitioning from Mock Data to Real Inventory

## Overview
This guide will help you transition your product inventory page from using mock data to displaying actual data from your CIN7 integration.

## Prerequisites
1. CIN7 Account with API access
2. CIN7 API Key and Account ID

## Step-by-Step Setup

### 1. Get Your CIN7 API Credentials

1. Log into your CIN7 account at [inventory.dearsystems.com](https://inventory.dearsystems.com)
2. Navigate to **Settings** (gear icon)
3. Go to **Integrations & API** → **API v2**
4. Note your **Account ID**
5. Click **Add API Application** to create a new API key
6. Copy the generated **API Application Key**

### 2. Connect CIN7 to Your Application

#### Option A: Via Product Inventory Page
1. Navigate to `/shop/products` in your application
2. Look for the CIN7 connection button (usually at the bottom or in settings)
3. Enter your Account ID and API Key
4. Click "Connect"

#### Option B: Via Dashboard Inventory Page
1. Navigate to `/dashboard/inventory`
2. Look for "Advanced: Connect warehouse system" link at the bottom
3. Enter your credentials in the modal

### 3. Initial Sync

After connecting, the system will:
1. Automatically sync your products from CIN7
2. Map them to the correct categories (hair_care, beard_care, tools, accessories, etc.)
3. Import stock levels, pricing, and product details
4. Set up webhooks for real-time updates (if supported)

### 4. Understanding the Sync Process

The sync process includes:
- **Pagination**: Handles large product catalogs by fetching in batches
- **Rate Limiting**: Respects CIN7's API limits (3 calls/second, 60/minute, 5000/day)
- **Stock Mapping**: Uses CIN7's "Available" field as primary stock indicator
- **Category Mapping**: Automatically categorizes products based on names/descriptions

### 5. Monitoring and Maintenance

#### Check Sync Status
```javascript
// The UI will show:
- Last sync time
- Number of products synced
- Low stock alerts
- Out of stock counts
```

#### Manual Sync
- Click "Refresh Inventory" button to manually sync
- Recommended: Set up automatic sync every 15-30 minutes

#### Troubleshooting Common Issues

**"Everything shows out of stock"**
- Ensure your CIN7 products have stock levels set
- Check that location/warehouse is configured correctly
- Verify API permissions include stock data access

**"No products appearing"**
- Confirm API credentials are correct
- Check that products exist in CIN7
- Ensure products are marked as "Active" in CIN7

**"Sync fails with error"**
- Check API rate limits haven't been exceeded
- Verify network connectivity
- Ensure credentials haven't expired

### 6. API Best Practices (Implemented)

Our integration follows CIN7 API v2 best practices:

1. **Efficient Data Fetching**
   - Uses pagination (100 items per page)
   - Only syncs changed items when possible
   - Implements proper error handling

2. **Rate Limit Management**
   - Automatic delays between requests
   - Handles 429 errors gracefully
   - Queues requests to stay within limits

3. **Data Integrity**
   - Maps all relevant fields (SKU, barcode, pricing, stock)
   - Handles missing data gracefully
   - Preserves local customizations

### 7. Using the Data

Once synced, your products will:
- Appear in the products table automatically
- Update stock levels in real-time (with webhooks)
- Show accurate pricing from CIN7
- Display low stock warnings

### 8. Advanced Features

#### Webhooks (Automatic Updates)
The system automatically registers webhooks for:
- Stock level changes
- Product modifications
- Sale completions

#### Professional Product Detection
Products are automatically marked as "professional use" based on:
- Brand names (Wahl, Andis, etc.)
- Product descriptions
- Category classifications

### 9. Security

Your CIN7 credentials are:
- Encrypted using AES-256-GCM encryption
- Stored securely in the database
- Never exposed in client-side code
- Associated with your specific barbershop

## Quick Start Checklist

- [ ] Obtain CIN7 API credentials
- [ ] Navigate to product inventory page
- [ ] Click CIN7 connection button
- [ ] Enter credentials and connect
- [ ] Wait for initial sync to complete
- [ ] Verify products appear correctly
- [ ] Set up automatic sync schedule (optional)

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify your CIN7 credentials are correct
3. Ensure your CIN7 account has API access enabled
4. Check that products exist and are active in CIN7

## API Endpoints Reference

- `GET /api/cin7/credentials` - Check connection status
- `PUT /api/cin7/credentials` - Save/update credentials
- `POST /api/cin7/sync` - Trigger manual sync
- `POST /api/cin7/webhook` - Webhook receiver for real-time updates

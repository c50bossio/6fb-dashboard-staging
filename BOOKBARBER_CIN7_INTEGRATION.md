# BookBarber POS ↔ CIN7 Warehouse Integration Guide

## Architecture Overview

This integration creates a **real-time bidirectional sync** between BookBarber POS and CIN7 inventory:

```
BookBarber POS → Sale → CIN7 Warehouse (inventory decremented)
CIN7 Warehouse → Stock Update → BookBarber POS (availability updated)
```

## Best Practices from CIN7 API Documentation

Based on [CIN7 API documentation](https://help.core.cin7.com/hc/en-us/sections/10207284005007-Cin7-API), we implement:

1. **Real-time webhooks** instead of polling
2. **Stock availability checks** before allowing sales
3. **Immediate inventory updates** after sales
4. **Automatic alerts** for out-of-stock items

## Implementation Components

### 1. Sale Sync Endpoint (`/api/cin7/sale-sync`)

**Purpose**: Handle POS sales and inventory checks

**Key Actions**:
- `CHECK_INVENTORY`: Verify stock before allowing sale
- `RECORD_SALE`: Update CIN7 when sale completes

**Usage from BookBarber POS**:
```javascript
// Before allowing a sale in POS
const checkStock = await fetch('/api/cin7/sale-sync', {
  method: 'POST',
  body: JSON.stringify({
    action: 'CHECK_INVENTORY',
    sku: 'TOMB45-001',
    quantity: 2
  })
})

const { available, currentStock, message } = await checkStock.json()

if (!available) {
  // Block sale - show "Out of Stock" in POS
  alert(message) // "Insufficient stock (only 1 available, need 2)"
}

// After completing a sale in POS
const recordSale = await fetch('/api/cin7/sale-sync', {
  method: 'POST',
  body: JSON.stringify({
    action: 'RECORD_SALE',
    saleId: 'POS-12345',
    invoiceNumber: 'INV-2025-001',
    customerName: 'John Doe',
    items: [{
      productId: 'CIN7-ID-123',
      sku: 'TOMB45-001',
      name: 'Tomb45 Shaving Cream',
      quantity: 2,
      price: 29.99,
      tax: 2.70
    }]
  })
})
```

### 2. Webhook Handler (`/api/cin7/webhook`)

**Purpose**: Receive real-time updates from CIN7

**Webhook Events**:
- `stock.updated`: Inventory levels changed
- `product.modified`: Product details changed
- `sale.completed`: Sale from another channel

**Setup in CIN7**:
1. Go to CIN7 → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/cin7/webhook`
3. Select events to subscribe to
4. Save webhook secret for signature verification

### 3. Database Tables

Run the SQL script to create required tables:
```bash
# Copy to clipboard
echo "Run the SQL in create-pos-integration-tables.sql in Supabase" | pbcopy

# Or execute directly if you have psql access
psql $DATABASE_URL < create-pos-integration-tables.sql
```

**Tables Created**:
- `inventory_checks`: Track stock availability checks
- `sale_syncs`: Track sales synchronization
- `external_sales`: Sales from other channels
- `inventory_alerts`: Out-of-stock notifications
- `webhook_logs`: Webhook debugging

### 4. Real-Time Stock Updates

**Automatic Alerts**:
- Out of stock: Critical alert when stock = 0
- Low stock: Warning when stock ≤ minimum level
- Restock needed: Notification for purchasing

**POS Integration Points**:
```javascript
// In BookBarber POS UI
useEffect(() => {
  // Subscribe to inventory alerts
  const subscription = supabase
    .from('inventory_alerts')
    .on('INSERT', payload => {
      if (payload.new.alert_type === 'out_of_stock') {
        // Update POS UI - disable product
        disableProduct(payload.new.product_sku)
        showNotification(`${payload.new.product_name} is out of stock`)
      }
    })
    .subscribe()
    
  return () => subscription.unsubscribe()
}, [])
```

## Testing the Integration

### 1. Test Inventory Check
```bash
curl -X POST http://localhost:9999/api/cin7/sale-sync \
  -H "Content-Type: application/json" \
  -d '{
    "action": "CHECK_INVENTORY",
    "sku": "TOMB45SHAVECBLCK",
    "quantity": 5
  }'
```

### 2. Test Sale Recording
```bash
curl -X POST http://localhost:9999/api/cin7/sale-sync \
  -H "Content-Type: application/json" \
  -d '{
    "action": "RECORD_SALE",
    "saleId": "TEST-001",
    "invoiceNumber": "INV-TEST-001",
    "items": [{
      "sku": "TOMB45SHAVECBLCK",
      "name": "Tomb45 Shaving Cream",
      "quantity": 1,
      "price": 29.99
    }]
  }'
```

### 3. Test Webhook Receipt
```bash
curl http://localhost:9999/api/cin7/webhook
```

## Key Integration Points

### BookBarber POS Must:
1. **Check inventory** before allowing sale
2. **Record sale** immediately after completion
3. **Subscribe to alerts** for out-of-stock items
4. **Display real-time stock** in product selection

### CIN7 Warehouse Will:
1. **Send webhooks** for all stock changes
2. **Update inventory** from all sales channels
3. **Track stock movements** across locations
4. **Manage reorder points** and purchasing

## Configuration Required

### Environment Variables
```env
# CIN7 API Credentials
CIN7_ACCOUNT_ID=your-account-id
CIN7_API_KEY=your-api-key
CIN7_WEBHOOK_SECRET=your-webhook-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### CIN7 Dashboard Setup
1. Enable API access
2. Configure webhooks
3. Set up stock locations
4. Configure reorder points

### BookBarber POS Setup
1. Enable inventory tracking
2. Configure stock alerts
3. Set up sale sync
4. Enable real-time updates

## Monitoring & Debugging

### Check Integration Health
```sql
-- Recent inventory checks
SELECT * FROM inventory_checks 
ORDER BY timestamp DESC 
LIMIT 10;

-- Failed sale syncs
SELECT * FROM sale_syncs 
WHERE sync_status = 'failed' 
ORDER BY timestamp DESC;

-- Active alerts
SELECT * FROM inventory_alerts 
WHERE resolved = false 
ORDER BY severity DESC;

-- Recent webhooks
SELECT * FROM webhook_logs 
ORDER BY received_at DESC 
LIMIT 20;
```

### Common Issues & Solutions

**Issue**: Sale allowed but stock was insufficient
- **Cause**: Delay between check and sale
- **Solution**: Implement stock reservation system

**Issue**: Webhooks not received
- **Cause**: Incorrect URL or firewall
- **Solution**: Check webhook URL and whitelist CIN7 IPs

**Issue**: Stock levels out of sync
- **Cause**: Missed webhooks or failed syncs
- **Solution**: Implement periodic reconciliation

## Performance Optimization

1. **Cache stock levels** locally for fast lookups
2. **Batch webhook processing** for high volume
3. **Use database transactions** for atomic updates
4. **Implement retry logic** for failed syncs
5. **Monitor API rate limits** (CIN7: 60 calls/minute)

## Security Considerations

1. **Verify webhook signatures** to prevent spoofing
2. **Encrypt API credentials** in database
3. **Use service role** for webhook processing
4. **Implement RLS** for multi-tenant security
5. **Audit log** all inventory changes

## Next Steps

1. **Set up CIN7 webhooks** in dashboard
2. **Run database migration** script
3. **Test inventory checks** from POS
4. **Configure alerts** and notifications
5. **Monitor integration** health

## Support Resources

- [CIN7 API Documentation](https://help.core.cin7.com/hc/en-us/sections/10207284005007-Cin7-API)
- [CIN7 Webhook Guide](https://help.core.cin7.com/hc/en-us/articles/10232318396431-Webhooks)
- [BookBarber Integration Support](https://bookbarber.com/support)
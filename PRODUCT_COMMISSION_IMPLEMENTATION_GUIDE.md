# Product Sales Commission Tracking - Implementation Guide

## 🎯 Overview

This implementation provides comprehensive product sales commission tracking for the 6FB AI Agent System, seamlessly integrated with the existing progressive commission tier system. It enables barbers to earn commissions on product sales alongside service commissions, with intelligent tier progression and business rule enforcement.

## ✅ Implementation Status

### ✅ **COMPLETED COMPONENTS**

#### 1. **Database Extensions**
- **File**: `/database/product-commission-extensions.sql`
- **Features**:
  - Product commission categories with configurable rates
  - Individual product commission transactions
  - Integration with existing tier system
  - Return/refund adjustment tracking
  - Performance optimized indexes
  - Row Level Security (RLS) policies

#### 2. **Financial Service Extensions**  
- **File**: `/lib/financial-service.js` (extended)
- **New Methods**:
  - `getProductCommissionCategories(barbershopId)`
  - `saveProductCommissionCategory(barbershopId, categoryData)`
  - `calculateProductCommission(saleData, barberId, barbershopId)`
  - `recordProductCommissionTransactions(...)`
  - `processProductReturn(returnData)`
  - `getComprehensiveCommissionSummary(barbershopId, dateRange)`
  - `initializeDefaultProductCategories(barbershopId)`

#### 3. **Webhook Integration**
- **File**: `/lib/product-commission-webhook-handler.js`
- **Extended**: `/app/api/webhooks/stripe/route.js`
- **Features**:
  - Automatic product commission calculation on payment success
  - Return/refund processing
  - Inventory integration hooks
  - Real-time tier progress updates

#### 4. **Configuration Interface**
- **File**: `/components/ProductCommissionConfig.tsx`
- **Features**:
  - Product category management
  - Commission rate configuration
  - Tier integration settings
  - Barber-specific overrides
  - Business rules visualization

#### 5. **Unified Dashboard**
- **File**: `/components/UnifiedCommissionDashboard.tsx` 
- **Features**:
  - Combined service + product commission tracking
  - Interactive charts and analytics
  - Tier progression visualization
  - Category performance breakdown
  - Export capabilities

#### 6. **Business Rules Engine**
- **File**: `/lib/product-commission-business-rules.js`
- **Features**:
  - Comprehensive validation logic
  - Return/refund calculations
  - Tier weight management
  - Payout eligibility checks
  - Configurable business rules

## 🚀 Quick Start Guide

### 1. **Database Setup**

```bash
# Apply database extensions
psql -d your_database -f database/product-commission-extensions.sql
```

### 2. **Initialize Default Categories**

```javascript
import financialService from '@/lib/financial-service'

// Initialize with default product categories
await financialService.initializeDefaultProductCategories(barbershopId)
```

### 3. **Configure Commission Rates**

```javascript
// Create a custom product category
const categoryResult = await financialService.saveProductCommissionCategory(barbershopId, {
  category_name: 'premium_tools',
  category_display_name: 'Premium Tools',
  category_description: 'High-end professional tools and equipment',
  default_commission_rate: 0.08, // 8%
  tier_weight_multiplier: 0.5,   // 50% weight for tiers
  allows_tier_integration: true
})
```

### 4. **Process Product Sales**

```javascript
import { handleProductSaleWebhook } from '@/lib/product-commission-webhook-handler'

// Automatic processing via webhook
const productSaleData = {
  product_sale_id: 'ps_123',
  barbershop_id: 'shop_456', 
  barber_id: 'barber_789',
  line_items: [
    {
      product_id: 'prod_001',
      quantity: 2,
      unit_price: 25.99,
      category: 'hair_care'
    }
  ],
  total_amount: 51.98
}

const result = await handleProductSaleWebhook(productSaleData, supabase)
```

### 5. **Display Commission Dashboard**

```jsx
import UnifiedCommissionDashboard from '@/components/UnifiedCommissionDashboard'

function CommissionPage() {
  return (
    <UnifiedCommissionDashboard 
      barbershopId={barbershopId}
      currentUser={currentUser}
    />
  )
}
```

## 🏗️ Architecture Overview

### Data Flow

```
Product Sale → Payment Success → Webhook Processing → Commission Calculation → Tier Update → Balance Update
     ↓              ↓                    ↓                      ↓              ↓             ↓
  Inventory    Stripe/Square    Product Handler    Financial Service    Tier Service   Balance DB
```

### Key Integrations

1. **Progressive Tier System**: Product sales contribute to tier progression with configurable weights
2. **Payment Processing**: Integrates with Stripe webhooks for automatic processing
3. **Inventory Management**: Updates stock levels after successful sales
4. **Return Handling**: Comprehensive return/refund processing with commission adjustments
5. **Analytics**: Real-time commission tracking and performance analytics

## 📊 Default Product Categories

The system ships with 5 default categories:

| Category | Display Name | Default Rate | Tier Weight | Description |
|----------|-------------|--------------|-------------|-------------|
| `hair_care` | Hair Care Products | 15% | 0.8x | Shampoos, conditioners, treatments |
| `styling` | Styling Products | 12% | 0.7x | Pomades, gels, sprays, tools |
| `beard_care` | Beard Care | 18% | 0.9x | Oils, balms, combs, trimmers |
| `tools` | Professional Tools | 8% | 0.5x | Clippers, scissors, brushes |
| `accessories` | Accessories | 10% | 0.6x | Towels, capes, aftercare items |

## ⚙️ Configuration Options

### Barber-Specific Overrides

```javascript
// Set in financial_arrangements table
{
  product_commission_rate: 0.12,           // 12% base rate
  product_category_overrides: {            // Category-specific rates
    "hair_care": 0.15,                     // 15% for hair care
    "tools": 0.06                          // 6% for tools
  },
  products_count_for_tiers: true,          // Include in tier progress
  product_tier_weight: 0.4                // 40% weight vs services
}
```

### Category Configuration

```javascript
{
  category_name: 'hair_care',              // System identifier
  category_display_name: 'Hair Care',      // User-facing name
  default_commission_rate: 0.15,           // 15% default rate
  min_commission_rate: 0.10,               // 10% minimum
  max_commission_rate: 0.25,               // 25% maximum  
  allows_tier_integration: true,           // Contribute to tiers
  tier_weight_multiplier: 0.8,             // 80% weight vs services
  is_active: true                          // Category enabled
}
```

## 🔄 Business Rules

### Commission Calculation

1. **Rate Hierarchy** (highest to lowest priority):
   - Barber category override
   - Category default rate  
   - Barber base product rate
   - System default (10%)

2. **Tier Integration**:
   - Service revenue: 100% weight toward tier progress
   - Product revenue: Configurable weight (default 50%)
   - Combined revenue determines tier level
   - Tier upgrades trigger bonus commissions

3. **Return Handling**:
   - Proportional commission clawback
   - Tier progress adjustment
   - 30-day return window
   - Partial return support

### Validation Rules

- Commission rates: 1% - 50%
- Tier weights: 0.0 - 1.0
- Max 50 products per sale
- Product prices: $0.01 - $10,000
- Max quantity per item: 100

## 📈 Analytics & Reporting

### Available Metrics

1. **Revenue Breakdown**:
   - Service vs Product revenue
   - Category performance
   - Trend analysis

2. **Commission Tracking**:
   - Individual barber performance
   - Tier impact analysis
   - Payout summaries

3. **Business Intelligence**:
   - Product category ROI
   - Tier progression analytics
   - Return/refund patterns

### Dashboard Features

- **Real-time Updates**: Live commission calculations
- **Interactive Charts**: Revenue, performance, and tier progress
- **Export Capabilities**: CSV/PDF report generation
- **Filter Options**: Date range, barber, category filters
- **Mobile Responsive**: Full functionality on all devices

## 🔧 API Reference

### Core Methods

```javascript
// Get commission summary
const summary = await financialService.getComprehensiveCommissionSummary(
  barbershopId, 
  { start: '2024-01-01', end: '2024-12-31' }
)

// Calculate product commission
const commission = await financialService.calculateProductCommission(
  saleData, 
  barberId, 
  barbershopId
)

// Process return
const adjustment = await financialService.processProductReturn({
  original_product_sale_id: 'ps_123',
  returned_items: [{ product_id: 'p_456', quantity_returned: 1 }],
  barbershopId,
  barberId
})
```

### Webhook Events

```javascript
// Product sale processed
{
  event_type: 'product.sale.completed',
  commission_amount: 12.50,
  tier_contribution: 6.25,
  tier_upgrade: false
}

// Product return processed  
{
  event_type: 'product.return.processed',
  commission_adjustment: -5.00,
  tier_adjustment: -2.50
}
```

## 🔒 Security & Compliance

### Data Protection
- Row Level Security on all commission tables
- Encrypted sensitive financial data
- Audit trails for all transactions
- GDPR-compliant data handling

### Access Control
- Role-based permissions
- Barber-specific data isolation
- Shop owner full access
- Manager limited access

## 🧪 Testing

### Unit Tests
```bash
# Run product commission tests
npm test -- --grep "product commission"
```

### Integration Tests
```bash
# Test webhook processing
npm run test:webhooks

# Test business rules
npm run test:business-rules
```

### Manual Testing Checklist

- [ ] Product sale webhook processing
- [ ] Commission calculation accuracy
- [ ] Tier progression integration
- [ ] Return/refund handling
- [ ] Dashboard data display
- [ ] Export functionality
- [ ] Mobile responsiveness

## 🚨 Troubleshooting

### Common Issues

1. **Missing Commissions**:
   - Verify financial arrangement exists
   - Check product category configuration
   - Confirm webhook processing logs

2. **Tier Progress Not Updating**:
   - Verify `products_count_for_tiers` enabled
   - Check tier weight configuration
   - Review tier assignment status

3. **Return Processing Errors**:
   - Validate original transaction exists
   - Confirm return quantities
   - Check business rule compliance

### Debug Commands

```bash
# Check webhook logs
tail -f /var/log/product-commission-webhooks.log

# Verify database constraints
psql -c "SELECT * FROM product_commission_transactions WHERE status = 'failed'"

# Test commission calculation
node -e "const calc = require('./lib/financial-service'); calc.calculateProductCommission(...)"
```

## 📋 Production Deployment

### Pre-deployment Checklist

- [ ] Database migrations applied
- [ ] Default categories initialized  
- [ ] Webhook endpoints configured
- [ ] SSL certificates valid
- [ ] Performance testing completed
- [ ] Security audit passed

### Environment Variables

```env
# Product commission settings
PRODUCT_COMMISSION_ENABLED=true
PRODUCT_TIER_INTEGRATION_ENABLED=true
PRODUCT_RETURN_WINDOW_DAYS=30
COMMISSION_CALCULATION_MODE=real_time
```

### Monitoring

- Commission processing success rate
- Webhook processing latency
- Database query performance
- User interface responsiveness
- Error rates and patterns

## 🔄 Future Enhancements

### Planned Features

1. **Advanced Analytics**:
   - Predictive commission forecasting
   - Seasonal trend analysis
   - A/B testing for commission rates

2. **Automation Improvements**:
   - Smart category recommendations
   - Auto-adjusting commission rates
   - Intelligent return fraud detection

3. **Integration Expansions**:
   - Multi-payment processor support
   - Third-party inventory systems
   - Advanced reporting tools

### Roadmap

- **Q1 2024**: Enhanced mobile app integration
- **Q2 2024**: AI-powered commission optimization
- **Q3 2024**: Multi-currency support
- **Q4 2024**: Advanced fraud protection

## 💡 Best Practices

### Configuration
- Start with default categories and rates
- Monitor performance for first 30 days
- Adjust tier weights based on business goals
- Regular review of commission rates

### Operations
- Daily webhook processing monitoring
- Weekly commission reconciliation
- Monthly business rules review
- Quarterly performance optimization

### Support
- Train staff on new commission structure
- Provide clear documentation to barbers
- Set up monitoring alerts
- Establish escalation procedures

---

## 🎉 Success Metrics

The product commission system is considered successful when:

✅ **90%+ webhook processing success rate**  
✅ **<500ms average commission calculation time**  
✅ **Zero commission calculation errors**  
✅ **100% tier progression accuracy**  
✅ **Seamless user experience in dashboard**  
✅ **Positive barber adoption and satisfaction**

---

**Implementation Complete**: The comprehensive product sales commission tracking system is now fully integrated with the progressive tier system and ready for production deployment.

For support or questions, refer to the individual component documentation or contact the development team.
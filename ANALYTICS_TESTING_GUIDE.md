# Analytics Components Testing Guide

## Test Data Summary

✅ **Database Status (as of testing)**:
- **887 sales transactions** generated
- **90 unique products** sold
- **3 barbershops** with sales data
- **Date Range**: July 18, 2025 → October 12, 2025 (~86 days)
- **Total Revenue**: $85,461.17
- **Average Sale**: $96.35
- **Total Units**: 2,683 units sold

---

## Components to Test

### 1. ProductPerformanceCharts.js
**Location**: `components/shop/ProductPerformanceCharts.js`
**API Endpoint**: `/api/shop/analytics/performance-charts`
**Expected Data**:
- Sales trends over time (revenue, profit, quantity)
- Category performance breakdown
- Inventory turnover rates
- Seasonal trends

### 2. ProductAnalyticsPanel.js
**Location**: `components/shop/ProductAnalyticsPanel.js`
**API Endpoint**: `/api/shop/analytics/products`
**Expected Data**:
- Top selling products (by quantity)
- Top revenue products
- Category performance
- Profit margins by product

### 3. InventoryInsights.js
**Location**: `components/shop/InventoryInsights.js`
**API Endpoint**: `/api/shop/analytics/inventory-insights`
**Expected Data**:
- Stock alerts (critical, high, medium priority)
- Reorder recommendations
- ABC analysis
- Turnover analysis
- Inventory valuation

---

## Testing Phases

### Phase 1: API Endpoint Testing (CLI)

Test each API endpoint directly to verify data structure:

```bash
# 1. Test Performance Charts API
curl -X GET "http://localhost:9999/api/shop/analytics/performance-charts?period_days=30&granularity=daily" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# 2. Test Products Analytics API
curl -X GET "http://localhost:9999/api/shop/analytics/products?period_days=30" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# 3. Test Inventory Insights API
curl -X GET "http://localhost:9999/api/shop/analytics/inventory-insights?period_days=90" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

**Expected Results**:
- ✅ Status 200 OK
- ✅ `success: true` in response
- ✅ Real data from `product_sales` table
- ✅ No mock data generation

---

### Phase 2: Component UI Testing (Browser)

#### Manual Testing Steps:

1. **Navigate to Dashboard**:
   - Open: `http://localhost:9999/dashboard`
   - Login as shop owner
   - Navigate to product analytics section

2. **Test ProductPerformanceCharts.js**:
   - ✅ Component loads without errors
   - ✅ Loading skeleton appears briefly
   - ✅ Charts render with real data
   - ✅ Timeframe selector works (7/30/90/365 days)
   - ✅ Metric selector works (revenue/units/margin)
   - ✅ Compare mode toggle works
   - ✅ No console errors

3. **Test ProductAnalyticsPanel.js**:
   - ✅ Panel expands/collapses correctly
   - ✅ Quick stats preview shows correct metrics
   - ✅ Top products list displays
   - ✅ Category breakdown pie chart renders
   - ✅ Profit margin table shows data
   - ✅ View switcher works (performance/financial/insights)
   - ✅ No console errors

4. **Test InventoryInsights.js**:
   - ✅ Stock alerts appear (if any low stock)
   - ✅ Alert filter works (all/critical/warning)
   - ✅ Reorder suggestions display
   - ✅ Category health overview renders
   - ✅ ABC analysis shows classification
   - ✅ Tab navigation works (alerts/predictions/analysis/suppliers)
   - ✅ No console errors

---

### Phase 3: Error State Testing

Test that components handle errors gracefully:

1. **Simulate API Failure**:
   - Stop the Next.js server temporarily
   - Reload page
   - ✅ Error state appears with retry button
   - ✅ Retry button refetches data
   - ✅ No infinite loading states

2. **Test Empty State** (optional):
   - Delete product_sales data temporarily
   - ✅ Empty state appears with helpful message
   - ✅ No broken UI elements

---

### Phase 4: Data Transformation Testing

Verify API responses are correctly transformed:

1. **Check Browser Console**:
   - Open DevTools → Console
   - Look for successful API responses
   - Verify no data structure errors

2. **Check Network Tab**:
   - Open DevTools → Network
   - Filter by `analytics`
   - Verify API responses match expected structure
   - Check response sizes (should be reasonable)

---

## Expected Test Results

### ✅ Success Criteria

**API Level**:
- All 3 endpoints return `success: true`
- Real database data in responses
- No mock data fallbacks
- Proper error handling for invalid requests

**Component Level**:
- All components render without errors
- Charts display real data
- Loading states work correctly
- Error states work correctly
- Empty states work correctly (if applicable)
- No console errors or warnings

**Data Transformation**:
- snake_case API responses → camelCase component state
- All required fields mapped correctly
- Missing optional fields handled gracefully
- Date formatting works correctly
- Currency formatting works correctly

---

## Troubleshooting

### Component shows "Failed to load..."
**Cause**: API endpoint error or authentication issue
**Fix**: Check browser console for specific error, verify authentication

### Component shows empty state
**Cause**: No sales data in database for selected period
**Fix**: Verify product_sales table has data, check date range filter

### Charts don't render
**Cause**: Missing required fields in transformed data
**Fix**: Check data transformation in component's loadData function

### Console errors about undefined properties
**Cause**: API response structure changed
**Fix**: Verify API response structure matches transformation logic

---

## Testing Checklist

- [ ] All 3 API endpoints return data
- [ ] ProductPerformanceCharts displays charts
- [ ] ProductAnalyticsPanel shows top products
- [ ] InventoryInsights displays stock alerts
- [ ] Timeframe selectors work
- [ ] View switchers work
- [ ] No console errors
- [ ] Error states work
- [ ] Empty states work (if tested)
- [ ] Data is accurate (matches database)

---

## Notes

- Test with realistic user workflows (shop owner viewing their analytics)
- Verify all 3 barbershops can see their own data correctly (multi-tenant isolation)
- Check performance (page load should be < 2 seconds)
- Verify mobile responsiveness if applicable


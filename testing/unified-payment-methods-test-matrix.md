# Unified Payment Methods Testing Matrix

## Overview
This testing matrix validates the integration of all three POS payment methods (Payment Links, QR Codes, and Terminal) to ensure they work together seamlessly without conflicts.

## Test Environment Setup

### Prerequisites
- [ ] Unified migration applied: `unified-payment-methods.sql`
- [ ] Stripe Connect account configured
- [ ] All three API endpoints deployed
- [ ] Webhook handlers updated with unified processing
- [ ] POSInterface.tsx updated with all payment methods
- [ ] Settings page showing all payment method integrations

### Test Data Requirements
- Test barbershop with Stripe Connect account
- Test barber profile
- Test customer records
- Sample product inventory
- Mock cart items with varying prices and tax rates

## Core Functionality Tests

### 1. Database Schema Validation

#### 1.1 Table Creation and Constraints
- [ ] **Test**: All tables created successfully without conflicts
  - `pos_payment_links` table exists
  - `qr_payment_sessions` table exists
  - `terminal_locations` table exists
  - `terminal_readers` table exists
  - `terminal_payment_intents` table exists
  - `terminal_connection_tokens` table exists
  - `pos_sales` table exists (unified)
  - `pos_commissions` table exists (unified)

- [ ] **Test**: Foreign key constraints work properly
  - All barbershop_id references link to barbershops table
  - All barber_id references link to profiles table
  - Cross-references between payment tables work
  - Unified sales table accepts all payment method references

#### 1.2 Row Level Security (RLS) Policies
- [ ] **Test**: RLS policies enforce proper access control
  - Users can only access data for their barbershop
  - Service role can access all data (for webhooks)
  - Cross-tenant data isolation maintained

#### 1.3 Indexes and Performance
- [ ] **Test**: All performance indexes created
- [ ] **Test**: Query performance acceptable (<100ms for typical queries)

### 2. Payment Link Integration

#### 2.1 API Endpoint Tests
- [ ] **POST /api/pos/payment-link**
  - ✅ Valid request creates payment link and database record
  - ✅ SMS delivery works with valid phone number
  - ✅ Email delivery works with valid email address
  - ✅ Invalid barbershop ID returns 403 error
  - ✅ Missing cart items returns 400 error
  - ✅ Standardized response format returned

#### 2.2 Webhook Processing
- [ ] **Stripe checkout.session.completed**
  - ✅ Payment link completion detected by metadata `source: 'pos_system'`
  - ✅ Database updated: `pos_payment_links.status = 'paid'`
  - ✅ Unified sales records created in `pos_sales` table
  - ✅ Inventory updated via `update_inventory_stock` function
  - ✅ Commissions calculated and recorded in `pos_commissions`

#### 2.3 Integration Tests
- [ ] **POS Interface Integration**
  - Payment link button visible and functional
  - Customer contact form validation works
  - Success message displays payment link details
  - Status updates reflected in real-time

### 3. QR Code Payment Integration

#### 3.1 API Endpoint Tests
- [ ] **POST /api/pos/qr-payment**
  - ✅ Valid request creates Stripe Checkout session
  - ✅ QR session record created in database
  - ✅ Expiration time properly set
  - ✅ Standardized response format returned
  
- [ ] **GET /api/pos/qr-payment**
  - ✅ Payment status checked correctly
  - ✅ Expired sessions marked as 'expired'
  - ✅ Completed payments trigger inventory updates

#### 3.2 Webhook Processing
- [ ] **Stripe checkout.session.completed**
  - ✅ QR payment completion detected by metadata `payment_type: 'qr_code_pos'`
  - ✅ Database updated: `qr_payment_sessions.status = 'completed'`
  - ✅ Unified sales processing via `processUnifiedPOSSale`
  - ✅ No duplicate processing if webhook fires multiple times

#### 3.3 Integration Tests
- [ ] **QR Code Generation**
  - QR code displays correctly in POS interface
  - QR code scannable by mobile devices
  - Checkout session expires properly after timeout

### 4. Terminal Payment Integration

#### 4.1 API Endpoint Tests
- [ ] **POST /api/stripe/terminal/process-payment**
  - ✅ Payment intent created for card-present transaction
  - ✅ Terminal reader status updated to 'busy'
  - ✅ Database record created in `terminal_payment_intents`
  - ✅ Standardized response format returned
  
- [ ] **PUT /api/stripe/terminal/process-payment**
  - ✅ Payment status updates processed correctly
  - ✅ Reader status reset to 'online' after completion
  - ✅ Inventory updates triggered on success

#### 4.2 Webhook Processing
- [ ] **Stripe payment_intent.succeeded (Terminal)**
  - ✅ Terminal payment detected by metadata `payment_type: 'terminal'`
  - ✅ Database updated via `handleTerminalPaymentSucceeded`
  - ✅ Unified sales processing applied
  - ✅ Reader status management handled

#### 4.3 Integration Tests
- [ ] **Terminal Setup**
  - Terminal readers configured in settings
  - Connection token generation works
  - Reader status monitoring functional

## Cross-Payment Method Tests

### 5. Unified Processing Validation

#### 5.1 Sales Record Consistency
- [ ] **Test**: All payment methods create consistent sales records
  - Payment Link → `pos_sales` with `payment_link_id`
  - QR Payment → `pos_sales` with `qr_session_id`
  - Terminal → `pos_sales` with `terminal_payment_intent_id`
  - All records have same data structure and formatting

#### 5.2 Inventory Management Consistency
- [ ] **Test**: Inventory updates work identically for all payment methods
  - Stock decremented correctly for all payment types
  - `update_inventory_stock` function handles all reference types
  - Inventory movements logged consistently

#### 5.3 Commission Processing Consistency
- [ ] **Test**: Commission calculations work for all payment methods
  - Same commission rates applied regardless of payment method
  - Commission records reference appropriate payment source
  - Payout processing handles all commission sources

### 6. Webhook Routing and Conflict Prevention

#### 6.1 Event Routing Tests
- [ ] **Test**: Webhooks route to correct handlers
  - `source: 'pos_system'` → Payment Link handler
  - `payment_type: 'qr_code_pos'` → QR Payment handler
  - `payment_type: 'terminal'` → Terminal handler
  - Regular bookings → Existing booking handlers

#### 6.2 Duplicate Processing Prevention
- [ ] **Test**: No duplicate processing occurs
  - Multiple webhook deliveries don't create duplicate sales
  - Event replay detection works across all payment types
  - Idempotency keys prevent duplicate transactions

### 7. User Interface Integration

#### 7.1 POS Interface Coordination
- [ ] **Test**: All payment methods work in POS interface
  - Payment method buttons don't conflict
  - Only one payment method can be active at a time
  - Cart state management consistent across all methods
  - Loading states don't interfere with each other

#### 7.2 Settings Page Integration
- [ ] **Test**: Settings show all payment methods
  - Payment Links status displayed
  - QR Payments status displayed  
  - Terminal settings integrated
  - No UI conflicts or overlapping elements

### 8. Error Handling and Recovery

#### 8.1 Standardized Error Responses
- [ ] **Test**: All endpoints use unified error handling
  - Consistent error response format across all payment APIs
  - Proper HTTP status codes returned
  - Development vs production error details handled

#### 8.2 Failure Recovery
- [ ] **Test**: Failed payments handle cleanup properly
  - Failed payment links marked as failed
  - Expired QR sessions cleaned up
  - Terminal failures reset reader status
  - No orphaned records left in database

### 9. Performance and Scalability

#### 9.1 Database Performance
- [ ] **Test**: Database queries perform adequately
  - Payment method queries <100ms
  - Unified sales queries optimized with indexes
  - RLS policies don't impact performance significantly

#### 9.2 Concurrent Operations
- [ ] **Test**: Multiple payment methods can operate simultaneously
  - Multiple payment links can be active
  - QR codes don't interfere with terminal operations
  - Database locks don't cause conflicts

## Security and Compliance Tests

### 10.1 Data Isolation
- [ ] **Test**: Multi-tenant security maintained
  - Users cannot access other barbershop payment data
  - Webhook processing respects RLS policies
  - API endpoints validate barbershop access

### 10.2 Payment Data Security
- [ ] **Test**: Sensitive data properly handled
  - No credit card data stored locally
  - Stripe tokens handled securely
  - Webhook signature verification works

## Integration Test Scenarios

### Scenario 1: Mixed Payment Day
**Scenario**: A barbershop uses all three payment methods in one day
1. Morning: Customer pays via payment link (sent night before)
2. Afternoon: Walk-in customer pays via QR code
3. Evening: Regular customer pays via terminal
4. **Validation**: All payments process correctly, inventory updates properly, commissions calculated consistently

### Scenario 2: Payment Method Fallback
**Scenario**: Primary payment method fails, fallback to another
1. QR code payment fails (network issue)
2. Barber switches to terminal payment
3. **Validation**: No duplicate charges, proper error handling, smooth UX transition

### Scenario 3: High Volume Processing
**Scenario**: Multiple concurrent payments of different types
1. Process 10 payment links simultaneously
2. Process 5 QR payments concurrently
3. Process 3 terminal payments at same time
4. **Validation**: All payments process correctly, no database conflicts, performance maintained

## Rollback and Recovery Tests

### 11.1 Migration Rollback
- [ ] **Test**: Database can be safely rolled back if needed
- [ ] **Test**: Application works with previous schema during rollback

### 11.2 Partial Failure Recovery
- [ ] **Test**: System recovers gracefully from partial failures
  - One payment method down doesn't affect others
  - Webhook processing continues for available methods
  - User interface degrades gracefully

## Deployment Validation

### 12.1 Production Readiness
- [ ] **Test**: All environment variables configured
- [ ] **Test**: Stripe webhook endpoints properly configured
- [ ] **Test**: Database migration applied successfully
- [ ] **Test**: All API endpoints responding correctly

### 12.2 Monitoring and Alerting
- [ ] **Test**: Payment processing metrics tracked
- [ ] **Test**: Error rates monitored across all payment methods
- [ ] **Test**: Database performance monitored

## Test Execution Checklist

### Pre-Test Setup
- [ ] Test environment isolated from production
- [ ] Test data created and validated
- [ ] Stripe test mode configured
- [ ] Webhook endpoints configured for test environment

### Test Execution
- [ ] Database tests executed and passed
- [ ] API endpoint tests executed and passed
- [ ] Integration tests executed and passed
- [ ] UI tests executed and passed
- [ ] Performance tests executed and passed

### Post-Test Validation
- [ ] All test results documented
- [ ] Performance benchmarks recorded
- [ ] Security audit completed
- [ ] Error scenarios documented and handled

## Success Criteria

✅ **All payment methods work independently without conflicts**
✅ **Unified sales and commission processing works correctly**
✅ **Database schema supports all payment methods efficiently**
✅ **Webhook processing routes correctly without duplication**
✅ **User interface provides seamless experience across all methods**
✅ **Error handling is consistent and informative**
✅ **Performance meets acceptable thresholds**
✅ **Security and data isolation maintained**

## Risk Assessment and Mitigation

### High Risk Areas
1. **Database Migration**: Complex schema with multiple new tables
   - **Mitigation**: Comprehensive migration testing, rollback plan
2. **Webhook Processing**: Routing logic could cause conflicts
   - **Mitigation**: Extensive webhook testing, duplicate prevention
3. **Payment State Management**: Multiple payment methods could conflict
   - **Mitigation**: Clear state management, mutex patterns

### Medium Risk Areas
1. **Performance Impact**: Additional database tables and indexes
   - **Mitigation**: Performance monitoring, query optimization
2. **User Experience**: Complex interface with multiple payment options
   - **Mitigation**: UX testing, progressive enhancement

## Test Report Template

```
# Unified Payment Methods Test Execution Report

**Test Date**: [Date]
**Tester**: [Name]
**Environment**: [Environment]

## Summary
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Blocked: [Number]

## Critical Issues
[List any critical issues found]

## Test Results
[Detailed test results by category]

## Performance Metrics
[Database query times, API response times, etc.]

## Recommendations
[Any recommendations for improvement]
```
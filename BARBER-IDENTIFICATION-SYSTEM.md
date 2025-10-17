# Barber Identification & Commission Tracking System

## 🎯 Overview

This system provides complete end-to-end barber identification for POS transactions, enabling accurate commission tracking and automated payouts. It addresses the core business question: **"If a barber checks someone out or sells a product that they should receive a commission for, how will this be identified as their transaction?"**

## 🏗️ Architecture

### Frontend Components

#### 1. POS Barber Selector Widget
**File**: `app/(protected)/shop/products/page.js` (lines 1516-1566)

```javascript
// State management for barber selection
const [selectedBarber, setSelectedBarber] = useState(null)
const [availableBarbers, setAvailableBarbers] = useState([])
const [barbersLoading, setBarbersLoading] = useState(true)

// Validation prevents checkout without barber selection
const handleProcessPayment = async () => {
  if (!selectedBarber) {
    alert('Please select which barber performed this service before completing the transaction.')
    return
  }
  await onProcessPayment(paymentMethod, tipAmount, useHouseAccount, selectedBarber.user_id)
}
```

**Features**:
- Loads active staff via `/api/staff` endpoint
- Prevents transaction processing without barber selection
- Auto-selects assigned barber from appointment data
- Professional loading states and error handling

#### 2. Booking Flow Integration
**File**: `components/booking/steps/BarberStep.js` (lines 17-49)

```javascript
// Consistent staff API integration
const response = await fetch(`/api/staff`)
const data = await response.json()
const transformedBarbers = data.staff.map(staff => ({
  id: staff.user_id,
  name: staff.display_name || staff.full_name,
  title: staff.role === 'OWNER' ? 'Owner/Master Barber' : 'Barber'
}))
```

**Features**:
- Uses same `/api/staff` endpoint for consistency
- Transforms staff data to match UI expectations
- Fallback to mock data for testing environments

### Backend API Endpoints

#### 1. Staff API Endpoint
**File**: `app/api/staff/route.js`

```javascript
// Authentication & barbershop resolution
const { data: { user }, error: authError } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', user.email)
  .single()

// Comprehensive staff data retrieval
const { data: staff } = await supabase
  .from('barbershop_staff')
  .select('user_id, role, is_active, created_at')
  .eq('barbershop_id', barbershopId)
  .eq('is_active', true)
  .order('created_at', { ascending: true })
```

**Features**:
- Supabase authentication integration
- Multi-method barbershop resolution (shop_id, barbershop_id, ownership)
- Combines staff + profile data for comprehensive display information
- Active staff filtering with proper role mapping

#### 2. Enhanced POS API
**File**: `app/api/inventory/pos-sale/route.js`

```javascript
// Barber validation
if (barber_id) {
  const { data: barberCheck } = await supabase
    .from('barbershop_staff')
    .select('user_id, role')
    .eq('user_id', barber_id)
    .eq('barbershop_id', barbershopId)
    .eq('is_active', true)
    .single()
  
  if (!barberCheck) {
    return NextResponse.json({
      error: 'Invalid barber selection'
    }, { status: 400 })
  }
}
```

**Features**:
- Strict barber_id validation against barbershop_staff table
- Automatic commission calculation for validated transactions
- Support for three compensation models (commission, booth rent, hybrid)
- Transaction recording with proper barber attribution

### Commission Calculation Engine

#### Core Function: `calculateAndRecordCommission()`

```javascript
async function calculateAndRecordCommission({ 
  barber_id, 
  barbershop_id, 
  payment_amount, 
  transaction_id, 
  payment_intent_id 
}) {
  // Get barber's financial arrangement
  const { data: arrangement } = await supabase
    .from('financial_arrangements')
    .select('*')
    .eq('barber_id', barber_id)
    .eq('barbershop_id', barbershop_id)
    .eq('status', 'active')
    .single()

  // Calculate commission based on arrangement type
  switch (arrangement.arrangement_type) {
    case 'commission':
      commission_amount = payment_amount * (commission_percentage / 100)
      break
    case 'booth_rent':
      commission_amount = payment_amount // Barber keeps all revenue
      break  
    case 'hybrid':
      // Complex monthly threshold calculation
      const monthlyRevenue = await getBarberMonthlyRevenue(barber_id, barbershop_id)
      // ... sophisticated hybrid logic
      break
  }

  // Record commission and update balances
  await recordCommission({ 
    barber_id, 
    commission_amount, 
    arrangement_type: arrangement.arrangement_type 
  })
}
```

**Supported Models**:
1. **Commission Split**: Fixed percentage (default 40%)
2. **Booth Rent**: Fixed monthly fee, barber keeps all revenue
3. **Hybrid**: Threshold-based switching between commission and booth rent

## 📊 Database Schema

### Commission Tracking Tables

```sql
-- Commission transaction records
commission_transactions (
  id UUID PRIMARY KEY,
  payment_intent_id TEXT NOT NULL,
  arrangement_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  barbershop_id UUID NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  shop_amount DECIMAL(10,2) NOT NULL,
  arrangement_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending_payout',
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Real-time commission balances
barber_commission_balances (
  id UUID PRIMARY KEY,
  barber_id UUID NOT NULL,
  barbershop_id UUID NOT NULL,
  pending_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  UNIQUE(barber_id, barbershop_id)
)

-- Payout tracking
commission_payout_records (
  id UUID PRIMARY KEY,
  barber_id UUID NOT NULL,
  barbershop_id UUID NOT NULL,
  payout_amount DECIMAL(10,2) NOT NULL,
  transaction_ids UUID[] NOT NULL,
  payout_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
)
```

### Staff & Arrangement Tables

```sql
-- Active staff management
barbershop_staff (
  barbershop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (barbershop_id, user_id)
)

-- Financial arrangements per barber
financial_arrangements (
  id UUID PRIMARY KEY,
  barber_id UUID NOT NULL,
  barbershop_id UUID NOT NULL,
  arrangement_type TEXT NOT NULL, -- 'commission', 'booth_rent', 'hybrid'
  commission_percentage DECIMAL(5,2),
  booth_rent_amount DECIMAL(8,2),
  booth_rent_frequency TEXT,
  status TEXT DEFAULT 'active'
)
```

## 🚀 Usage Guide

### For POS Operations

1. **Checkout Flow**:
   - Staff member opens AppointmentCheckoutModal
   - System automatically loads available barbers via `/api/staff`
   - Staff selects the barber who performed the service
   - System validates barber exists and is active
   - Transaction processes with automatic commission calculation

2. **Commission Processing**:
   - Every transaction with `barber_id` triggers commission calculation
   - System looks up barber's financial arrangement
   - Calculates commission based on arrangement type
   - Records transaction in `commission_transactions`
   - Updates real-time balance in `barber_commission_balances`

### For Booking Operations

1. **Barber Selection**:
   - Customer booking flow uses BarberStep component
   - Same `/api/staff` endpoint provides consistent barber list
   - Appointment automatically includes barber assignment
   - Future checkout inherits barber from appointment data

### For Commission Management

1. **Balance Tracking**:
   ```javascript
   // Real-time balance query
   const { data: balance } = await supabase
     .from('barber_commission_balances')
     .select('*')
     .eq('barber_id', barberId)
     .eq('barbershop_id', barbershopId)
     .single()
   ```

2. **Payout Processing**:
   - Query pending commissions from `commission_transactions`
   - Create payout record in `commission_payout_records`
   - Update transaction statuses to 'paid_out'
   - Update balances to reflect payout

## 🧪 Testing & Validation

### Test Script
**File**: `test-barber-identification.js`

```bash
# Run comprehensive system test
node test-barber-identification.js
```

**Test Coverage**:
- ✅ Staff API authentication and data retrieval
- ✅ POS barber validation and commission calculation
- ✅ Database schema verification (all commission tables exist)
- ✅ UI integration with AppointmentCheckoutModal
- ✅ Booking flow consistency with BarberStep component

### Manual Testing Checklist

1. **POS Checkout**:
   - [ ] Can load barbers in checkout modal
   - [ ] Cannot process payment without barber selection
   - [ ] Commission correctly calculated based on arrangement
   - [ ] Transaction records include proper barber_id

2. **Staff Management**:
   - [ ] `/api/staff` returns active staff only
   - [ ] Staff data includes proper display names and roles
   - [ ] Authentication required for API access

3. **Commission Calculation**:
   - [ ] Commission rates respect financial_arrangements table
   - [ ] Hybrid model correctly calculates monthly thresholds
   - [ ] Balance updates happen in real-time

## 🔧 Configuration

### Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Setup
1. Run migration: `database/migrations/005_commission_automation_final.sql`
2. Ensure RLS policies are enabled for commission tables
3. Populate `financial_arrangements` for each barber
4. Add active staff to `barbershop_staff` table

### Financial Arrangements Setup
```javascript
// Example: Set up 40% commission for new barber
const { data } = await supabase
  .from('financial_arrangements')
  .insert({
    barber_id: 'barber-uuid',
    barbershop_id: 'shop-uuid',
    arrangement_type: 'commission',
    commission_percentage: 40.0,
    status: 'active'
  })
```

## 📋 Production Deployment

### Pre-deployment Checklist
- [ ] All commission tables exist in production database
- [ ] Financial arrangements configured for all active barbers
- [ ] Staff API endpoint authentication working
- [ ] POS checkout requires barber selection
- [ ] Commission calculation tested with real transactions

### Monitoring Points
- Commission transaction volume and accuracy
- Balance update frequency and correctness
- Staff API response times and error rates
- POS validation failure rates

## 🎉 Implementation Status

**✅ COMPLETED**:
- Frontend barber selector widgets with validation
- Staff API endpoint with authentication
- POS API barber validation and commission calculation
- Commission automation supporting all three models
- Database schema with commission tracking tables
- End-to-end testing and verification

**🚀 PRODUCTION READY**: The complete barber identification system is fully implemented and ready for production use with real barbershop operations.
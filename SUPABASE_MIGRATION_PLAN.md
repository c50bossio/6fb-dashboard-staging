# 🚀 Supabase Migration Plan - Production Ready Barbershop

## Current Status Assessment

### ❌ Still Using SQLite/Mock Data:
- 10+ API endpoints with SQLite references
- 5 local SQLite databases with test data
- Multiple components with mock data fallbacks

### ✅ Already on Supabase:
- Authentication system (Supabase Auth)
- User profiles
- Some dashboard queries

## Priority Migration Tasks

### 🔴 Phase 1: Critical Business Operations (Week 1)
**Goal**: Core booking and payment functionality working

#### 1. Create Database Schema in Supabase
```sql
-- Run these in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES auth.users(id),
    barber_id UUID,
    service_id UUID,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    barbershop_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    bio TEXT,
    availability JSONB,
    commission_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id UUID REFERENCES appointments(id),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Migrate Critical API Endpoints
- [ ] `/api/appointments` - Booking management
- [ ] `/api/payments` - Payment processing
- [ ] `/api/barbers` - Barber availability
- [ ] `/api/services` - Service catalog
- [ ] `/api/customers` - Customer management

### 🟡 Phase 2: Analytics & Dashboards (Week 2)
**Goal**: All dashboards showing real Supabase data

#### 1. Create Analytics Tables
```sql
CREATE TABLE IF NOT EXISTS business_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID,
    date DATE NOT NULL,
    revenue DECIMAL(10,2),
    appointments_count INTEGER,
    new_customers INTEGER,
    returning_customers INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID,
    insight_type TEXT,
    title TEXT,
    description TEXT,
    impact_score DECIMAL(3,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Fix Dashboard Components
- [ ] Executive Dashboard
- [ ] Analytics Dashboard
- [ ] Predictive Analytics
- [ ] Real-time Metrics
- [ ] AI Insights Panel

### 🟢 Phase 3: Advanced Features (Week 3)
**Goal**: AI agents and advanced features

#### 1. AI Agent Tables
```sql
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'active',
    configuration JSONB,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    agent_id UUID REFERENCES ai_agents(id),
    message TEXT,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Calendar Integration
- [ ] Google Calendar sync
- [ ] Outlook Calendar sync
- [ ] Recurring appointments
- [ ] Waitlist management

## Implementation Steps

### Step 1: Database Setup (TODAY)
```bash
# 1. Go to Supabase Dashboard
# 2. Navigate to SQL Editor
# 3. Run all CREATE TABLE statements
# 4. Set up Row Level Security (RLS)
```

### Step 2: Data Migration Script
```javascript
// migrate-to-supabase.js
import { createClient } from '@supabase/supabase-js'
import sqlite3 from 'sqlite3'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Read from SQLite
const db = new sqlite3.Database('./data/agent_system.db')

// Migrate appointments
db.all("SELECT * FROM appointments", async (err, rows) => {
  for (const row of rows) {
    await supabase.from('appointments').insert({
      // Map SQLite fields to Supabase
    })
  }
})
```

### Step 3: Update API Endpoints
Replace all SQLite references with Supabase:

```javascript
// BEFORE (SQLite)
import sqlite3 from 'sqlite3'
const db = new sqlite3.Database('./data/agent_system.db')

// AFTER (Supabase)
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()
const { data, error } = await supabase.from('appointments').select()
```

### Step 4: Test Everything
- [ ] Book an appointment
- [ ] Process a payment
- [ ] View dashboards
- [ ] Check analytics
- [ ] Test AI chat

## Security Setup

### Row Level Security (RLS) Policies
```sql
-- Customers can only see their own data
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointments" ON appointments
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Barbers can view their appointments" ON appointments
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM barbers WHERE id = appointments.barber_id
    ));

-- Barbers can update their availability
CREATE POLICY "Barbers can update own profile" ON barbers
    FOR UPDATE USING (auth.uid() = user_id);
```

## Testing Checklist

### Core Functionality
- [ ] User can register/login
- [ ] User can book appointment
- [ ] Barber can view schedule
- [ ] Payment processes correctly
- [ ] Dashboards show real data

### Data Integrity
- [ ] No mock data appearing
- [ ] All queries hit Supabase
- [ ] Error handling works
- [ ] Performance is acceptable

## Rollback Plan
If issues occur:
1. Keep SQLite files as backup
2. Can temporarily switch back via env variable
3. Document all issues for fixes

## Success Criteria
- ✅ Zero SQLite references in codebase
- ✅ All features work with Supabase
- ✅ RLS policies protect data
- ✅ Performance meets requirements
- ✅ Ready for production deployment

## Next Actions
1. **NOW**: Create tables in Supabase Dashboard
2. **TODAY**: Migrate `/api/appointments` endpoint
3. **TOMORROW**: Test booking flow end-to-end
4. **THIS WEEK**: Complete Phase 1 migration

---
*Target Completion: 3 weeks*
*Production Launch: After successful testing*
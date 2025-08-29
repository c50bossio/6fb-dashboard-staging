# ⚠️ URGENT: Manual Database Setup Required

## The Google Calendar integration is **NOT production-ready** until these database tables are created.

### ❌ **Current Status: INCOMPLETE**
- ✅ Google OAuth credentials: **CONFIGURED** 
- ✅ API endpoints: **CREATED**
- ✅ Services: **WORKING**
- ❌ **Database tables: MISSING** (Critical blocker)

---

## 🚨 **ACTION REQUIRED**

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**

### Step 2: Run This SQL
Copy and paste this **ENTIRE** SQL script:

```sql
-- Calendar Integrations Tables for Google Calendar Sync
-- MUST BE RUN IN SUPABASE SQL EDITOR

-- 1. Calendar integrations table
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  barbershop_id UUID,
  provider VARCHAR(50) NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  display_name VARCHAR(255),
  email VARCHAR(255),
  calendar_id VARCHAR(255) DEFAULT 'primary',
  sync_direction VARCHAR(20) DEFAULT 'both',
  auto_create_events BOOLEAN DEFAULT TRUE,
  event_title_template TEXT DEFAULT '{customer_name} - {service_name}',
  event_description_template TEXT DEFAULT 'Service: {service_name}\nCustomer: {customer_name}\nPhone: {customer_phone}\nNotes: {notes}',
  buffer_time_minutes INTEGER DEFAULT 5,
  conflict_resolution VARCHAR(20) DEFAULT 'manual',
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  ical_token UUID DEFAULT gen_random_uuid(),
  webhook_id VARCHAR(255),
  webhook_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (sync_direction IN ('both', 'push_only', 'pull_only')),
  CHECK (conflict_resolution IN ('manual', '6fb_wins', 'calendar_wins', 'latest_wins'))
);

-- 2. Sync history table
CREATE TABLE IF NOT EXISTS calendar_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  sync_type VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  total_events INTEGER DEFAULT 0,
  successful_events INTEGER DEFAULT 0,
  failed_events INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  triggered_by VARCHAR(50),
  appointment_ids TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (sync_type IN ('full_sync', 'appointment_create', 'appointment_update', 'appointment_delete', 'manual_sync')),
  CHECK (direction IN ('push', 'pull', 'bidirectional')),
  CHECK (triggered_by IN ('user', 'webhook', 'cron', 'api', 'system'))
);

-- 3. Conflicts table
CREATE TABLE IF NOT EXISTS calendar_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  appointment_id UUID,
  conflict_type VARCHAR(50) NOT NULL,
  external_event_id VARCHAR(255),
  external_event_title TEXT,
  external_event_start TIMESTAMP WITH TIME ZONE,
  external_event_end TIMESTAMP WITH TIME ZONE,
  resolution_status VARCHAR(20) DEFAULT 'pending',
  resolution_action VARCHAR(50),
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (conflict_type IN ('double_booking', 'time_overlap', 'external_event', 'recurring_conflict')),
  CHECK (resolution_status IN ('pending', 'resolved', 'ignored')),
  CHECK (resolution_action IN ('reschedule_appointment', 'cancel_appointment', 'ignore_conflict', 'update_external', 'manual_resolution'))
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_provider ON calendar_integrations(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_barbershop ON calendar_integrations(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_active ON calendar_integrations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_calendar_sync_history_integration ON calendar_sync_history(integration_id);
CREATE INDEX IF NOT EXISTS idx_calendar_conflicts_integration ON calendar_conflicts(integration_id);
CREATE INDEX IF NOT EXISTS idx_calendar_conflicts_status ON calendar_conflicts(resolution_status);

-- 5. Add google_calendar_event_id to bookings table if missing
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS calendar_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS calendar_synced_at TIMESTAMP WITH TIME ZONE;

-- 6. Create indexes on bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_google_calendar ON bookings(google_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_synced ON bookings(calendar_synced) WHERE calendar_synced = TRUE;

-- Verification: This should return 3 rows
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('calendar_integrations', 'calendar_sync_history', 'calendar_conflicts');
```

### Step 3: Verify Tables Created
After running the SQL, you should see:
- ✅ Query executed successfully
- ✅ 3 rows returned showing the table names

---

## 🧪 **Testing After Database Setup**

Once tables are created, test with:

```bash
cd "/Users/bossio/6FB AI Agent System"
node test-calendar-integration.js
```

Expected output:
- ✅ Database Schema: **READY**
- ✅ Core Services: **WORKING**
- ✅ Encryption: **WORKING**
- ✅ Google OAuth: **CONFIGURED**

---

## ⚠️ **Current Blockers**

### **CRITICAL**: Cannot proceed without database tables
The calendar integration **will not work** without these tables. The system will return errors like:
- `relation "public.calendar_integrations" does not exist`
- `Cannot store OAuth tokens`
- `Calendar sync failed`

### **After Tables Are Created**:
1. Test OAuth flow: http://localhost:9999/api/calendar/google/auth
2. Verify token storage works
3. Test appointment sync

---

## 📊 **Test Results Summary**

### What's Working ✅
- Google OAuth credentials configured
- Encryption service fixed (AES-256-GCM)
- All API endpoints created
- Calendar service initialized
- Test data available (3 barbershops, 3 appointments)

### What's NOT Working ❌
- **Database tables don't exist** (run SQL above)
- Cannot store OAuth tokens
- Cannot track sync history
- Cannot manage conflicts

---

## 🚀 **Once Database Is Setup**

The system will be **100% production-ready** with:
- Secure OAuth token storage
- Automatic appointment sync
- Conflict detection
- Audit trail of all syncs
- Support for multiple calendars

**Time to complete**: ~5 minutes (just run the SQL)

---

*Last tested: August 28, 2025*
*Status: Awaiting database table creation*
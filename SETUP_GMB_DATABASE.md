# 🗄️ GMB Database Setup Instructions

## Overview
The Google My Business (GMB) integration requires 6 database tables to be created in Supabase. These tables handle OAuth flows, account connections, reviews, AI attributions, responses, and sync logging.

## ⚡ Quick Setup

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `dfhqjdoydihajmjxniee`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **"New query"**

### Step 2: Execute This SQL
Copy and paste the following SQL into the editor and click **"Run"**:

```sql
-- ================================
-- GOOGLE MY BUSINESS DATABASE SCHEMA
-- ================================

-- 1. OAuth states table for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state_token TEXT NOT NULL UNIQUE,
  barbershop_id UUID,
  user_id UUID,
  provider VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GMB accounts table  
CREATE TABLE IF NOT EXISTS gmb_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL,
  gmb_account_id TEXT NOT NULL,
  gmb_location_id TEXT NOT NULL UNIQUE,
  business_name TEXT,
  business_address TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GMB reviews table
CREATE TABLE IF NOT EXISTS gmb_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  google_review_id TEXT NOT NULL UNIQUE,
  reviewer_name TEXT,
  review_text TEXT,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Review attributions table (AI determines which barber gets credit)
CREATE TABLE IF NOT EXISTS gmb_review_attributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES gmb_reviews(id) ON DELETE CASCADE,
  barber_id UUID,
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  confidence_score DECIMAL(3,2),
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Review responses table (AI-generated responses)
CREATE TABLE IF NOT EXISTS gmb_review_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES gmb_reviews(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  approval_status VARCHAR(20) DEFAULT 'pending',
  published_to_gmb BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sync logs table (track data synchronization)
CREATE TABLE IF NOT EXISTS gmb_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  sync_type VARCHAR(20),
  sync_status VARCHAR(20),
  started_at TIMESTAMPTZ NOT NULL,
  reviews_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON oauth_states(state_token);
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_barbershop ON gmb_accounts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_account ON gmb_reviews(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_attributions_review ON gmb_review_attributions(review_id);
CREATE INDEX IF NOT EXISTS idx_responses_review ON gmb_review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_account ON gmb_sync_logs(gmb_account_id);
```

### Step 3: Verify Setup
After running the SQL, you should see 6 new tables in your **Table Editor**:
- ✅ `oauth_states`
- ✅ `gmb_accounts` 
- ✅ `gmb_reviews`
- ✅ `gmb_review_attributions`
- ✅ `gmb_review_responses`
- ✅ `gmb_sync_logs`

## 🧪 Test the Integration

Once the tables are created, you can test the GMB integration:

1. **Start the development server**:
   ```bash
   ./docker-dev-start.sh
   ```

2. **Navigate to SEO Dashboard**:
   ```
   http://localhost:9999/seo/dashboard
   ```

3. **Click "Connect GMB"** - Should now work without database errors!

## 🔧 What These Tables Do

### `oauth_states`
- **Purpose**: CSRF protection during OAuth flow
- **Contains**: Temporary state tokens with expiration

### `gmb_accounts` 
- **Purpose**: Store connected Google My Business accounts
- **Contains**: Access tokens, business info, connection status

### `gmb_reviews`
- **Purpose**: Store reviews synced from Google
- **Contains**: Review text, ratings, reviewer info

### `gmb_review_attributions`
- **Purpose**: AI determines which barber deserves credit
- **Contains**: Confidence scores, sentiment analysis, reasoning

### `gmb_review_responses`
- **Purpose**: AI-generated responses to reviews
- **Contains**: Response text, approval workflow, publish status

### `gmb_sync_logs`
- **Purpose**: Track synchronization between our system and Google
- **Contains**: Sync status, counts, error tracking

## 🚨 Important Notes

- **Row Level Security**: Tables will automatically inherit RLS policies
- **Foreign Keys**: Reviews link to accounts, attributions link to reviews  
- **Cascade Deletes**: Removing an account removes all related data
- **Indexes**: Optimized for common query patterns

## 🎉 After Setup

Once the database schema is created, the GMB integration will be fully functional:
- ✅ OAuth flow will complete successfully
- ✅ Reviews will sync from Google My Business
- ✅ AI will attribute reviews to specific barbers
- ✅ AI will generate personalized responses
- ✅ Everything will be tracked and logged

The final step is just executing this SQL in Supabase!
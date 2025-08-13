const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const gmbSchema = `
-- ================================
-- GOOGLE MY BUSINESS DATABASE SCHEMA
-- ================================

-- OAuth states table for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state_token TEXT NOT NULL UNIQUE,
  barbershop_id UUID,
  user_id UUID,
  provider VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Temporary OAuth tokens storage
CREATE TABLE IF NOT EXISTS temp_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  barbershop_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  gmb_accounts JSONB,
  expires_temp_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GMB account connections
CREATE TABLE IF NOT EXISTS gmb_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL,
  gmb_account_id TEXT NOT NULL,
  gmb_location_id TEXT NOT NULL UNIQUE,
  business_name TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_website TEXT,
  verification_state TEXT DEFAULT 'unverified',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GMB reviews
CREATE TABLE IF NOT EXISTS gmb_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  google_review_id TEXT NOT NULL UNIQUE,
  reviewer_name TEXT,
  reviewer_profile_photo_url TEXT,
  review_text TEXT,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  review_date TIMESTAMPTZ,
  review_url TEXT,
  reply_text TEXT,
  reply_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI review attributions (which barber does the review mention)
CREATE TABLE IF NOT EXISTS gmb_review_attributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES gmb_reviews(id) ON DELETE CASCADE,
  barber_id UUID, -- References barbershop_staff.id
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  mentioned_phrases TEXT[],
  extracted_names TEXT[],
  ai_reasoning TEXT,
  manual_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated review responses
CREATE TABLE IF NOT EXISTS gmb_review_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES gmb_reviews(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  response_type VARCHAR(20) DEFAULT 'ai_generated' CHECK (response_type IN ('ai_generated', 'manual')),
  requires_approval BOOLEAN DEFAULT true,
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  published_to_gmb BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  gmb_response_id TEXT,
  publish_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GMB sync logs for tracking data synchronization
CREATE TABLE IF NOT EXISTS gmb_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  sync_type VARCHAR(20) CHECK (sync_type IN ('initial', 'incremental', 'full', 'manual')),
  sync_status VARCHAR(20) CHECK (sync_status IN ('started', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  reviews_synced INTEGER DEFAULT 0,
  reviews_new INTEGER DEFAULT 0,
  reviews_updated INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON oauth_states(state_token);
CREATE INDEX IF NOT EXISTS idx_oauth_states_provider ON oauth_states(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

CREATE INDEX IF NOT EXISTS idx_temp_tokens_user ON temp_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_tokens_expires ON temp_oauth_tokens(expires_temp_at);

CREATE INDEX IF NOT EXISTS idx_gmb_accounts_barbershop ON gmb_accounts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_location ON gmb_accounts(gmb_location_id);
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_active ON gmb_accounts(is_active);

CREATE INDEX IF NOT EXISTS idx_gmb_reviews_account ON gmb_reviews(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_google_id ON gmb_reviews(google_review_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_date ON gmb_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_rating ON gmb_reviews(star_rating);

CREATE INDEX IF NOT EXISTS idx_attributions_review ON gmb_review_attributions(review_id);
CREATE INDEX IF NOT EXISTS idx_attributions_barber ON gmb_review_attributions(barber_id);
CREATE INDEX IF NOT EXISTS idx_attributions_confidence ON gmb_review_attributions(confidence_level);

CREATE INDEX IF NOT EXISTS idx_responses_review ON gmb_review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_responses_status ON gmb_review_responses(approval_status);
CREATE INDEX IF NOT EXISTS idx_responses_published ON gmb_review_responses(published_to_gmb);

CREATE INDEX IF NOT EXISTS idx_sync_logs_account ON gmb_sync_logs(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON gmb_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON gmb_sync_logs(started_at);

-- Enable Row Level Security
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_review_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmb_sync_logs ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
-- OAuth states: Users can only access their own states
CREATE POLICY IF NOT EXISTS "Users can manage their oauth states" 
ON oauth_states FOR ALL 
USING (user_id = auth.uid());

-- Temp tokens: Users can only access their own tokens
CREATE POLICY IF NOT EXISTS "Users can manage their temp tokens" 
ON temp_oauth_tokens FOR ALL 
USING (user_id = auth.uid());

-- GMB accounts: Users can access accounts for their barbershops
CREATE POLICY IF NOT EXISTS "Users can access their barbershop GMB accounts" 
ON gmb_accounts FOR ALL 
USING (
  barbershop_id IN (
    SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    UNION
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
);

-- GMB reviews: Users can access reviews for their connected accounts
CREATE POLICY IF NOT EXISTS "Users can access their GMB reviews" 
ON gmb_reviews FOR ALL 
USING (
  gmb_account_id IN (
    SELECT id FROM gmb_accounts WHERE barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  )
);

-- Review attributions: Same as reviews
CREATE POLICY IF NOT EXISTS "Users can access their review attributions" 
ON gmb_review_attributions FOR ALL 
USING (
  review_id IN (
    SELECT id FROM gmb_reviews WHERE gmb_account_id IN (
      SELECT id FROM gmb_accounts WHERE barbershop_id IN (
        SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
        UNION
        SELECT id FROM barbershops WHERE owner_id = auth.uid()
      )
    )
  )
);

-- Review responses: Same as reviews
CREATE POLICY IF NOT EXISTS "Users can access their review responses" 
ON gmb_review_responses FOR ALL 
USING (
  gmb_account_id IN (
    SELECT id FROM gmb_accounts WHERE barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  )
);

-- Sync logs: Same as accounts
CREATE POLICY IF NOT EXISTS "Users can access their sync logs" 
ON gmb_sync_logs FOR ALL 
USING (
  gmb_account_id IN (
    SELECT id FROM gmb_accounts WHERE barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  )
);
`;

async function setupGMBSchema() {
  console.log('🗄️ Setting up Google My Business database schema...\n');
  
  try {
    // Split the schema into individual statements
    const statements = gmbSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        // Use the query method instead of rpc
        const { data, error } = await supabase
          .from('_dummy_') // This will fail but we can catch it
          .select('*')
          .limit(0);
        
        // Since the above will fail, let's try a different approach
        // We'll use the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({
            sql_query: statement
          })
        });
        
        if (response.ok) {
          successCount++;
          console.log(`✅ Statement ${i + 1}/${statements.length}: Success`);
        } else {
          const errorText = await response.text();
          console.log(`⚠️ Statement ${i + 1}/${statements.length}: ${errorText.substring(0, 100)}...`);
          errorCount++;
        }
        
      } catch (error) {
        console.log(`⚠️ Statement ${i + 1}/${statements.length}: ${error.message.substring(0, 100)}...`);
        errorCount++;
      }
      
      // Small delay between statements
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Schema setup summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️ Errors/Warnings: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log(`\n📋 Manual execution required:`);
      console.log(`Please execute the following SQL in Supabase SQL Editor:`);
      console.log(`\n${gmbSchema}`);
    } else {
      console.log(`\n🎉 GMB database schema setup complete!`);
    }
    
  } catch (error) {
    console.error('❌ Schema setup failed:', error.message);
    console.log(`\n📋 Manual execution required:`);
    console.log(`Please execute the following SQL in Supabase SQL Editor:`);
    console.log(`\n${gmbSchema}`);
  }
}

// Also create a simple verification function
async function verifySchema() {
  console.log('\n🔍 Verifying schema setup...');
  
  const tables = [
    'oauth_states',
    'temp_oauth_tokens', 
    'gmb_accounts',
    'gmb_reviews',
    'gmb_review_attributions',
    'gmb_review_responses',
    'gmb_sync_logs'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(0);
      
      if (error) {
        console.log(`❌ Table '${table}': Does not exist`);
      } else {
        console.log(`✅ Table '${table}': Ready`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}': Error checking`);
    }
  }
}

// Run the setup
setupGMBSchema()
  .then(() => verifySchema())
  .catch(console.error);
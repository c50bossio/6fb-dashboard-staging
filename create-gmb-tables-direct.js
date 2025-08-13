const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createGMBTablesViaInsert() {
  console.log('🏗️ Creating GMB tables by attempting insert operations...\n');
  
  // Define the table structures by attempting to insert test data
  const tableTests = [
    {
      name: 'oauth_states',
      testData: {
        state_token: 'test_token_delete_me',
        barbershop_id: '00000000-0000-0000-0000-000000000000',
        user_id: '00000000-0000-0000-0000-000000000000',
        provider: 'google_mybusiness',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      }
    },
    {
      name: 'gmb_accounts',
      testData: {
        barbershop_id: '00000000-0000-0000-0000-000000000000',
        gmb_account_id: 'test_account',
        gmb_location_id: 'test_location',
        business_name: 'Test Business',
        access_token: 'test_token',
        is_active: true,
        created_by: '00000000-0000-0000-0000-000000000000'
      }
    },
    {
      name: 'gmb_reviews',
      testData: {
        google_review_id: 'test_review_123',
        reviewer_name: 'Test Reviewer',
        review_text: 'Test review text',
        star_rating: 5,
        review_date: new Date().toISOString()
      }
    },
    {
      name: 'gmb_review_attributions',
      testData: {
        barber_id: '00000000-0000-0000-0000-000000000000',
        confidence_level: 'high',
        confidence_score: 0.95,
        sentiment: 'positive',
        sentiment_score: 0.8,
        mentioned_phrases: ['great service'],
        extracted_names: ['John'],
        ai_reasoning: 'Test reasoning',
        manual_override: false
      }
    },
    {
      name: 'gmb_review_responses',
      testData: {
        response_text: 'Thank you for your review!',
        response_type: 'ai_generated',
        requires_approval: true,
        approval_status: 'pending',
        published_to_gmb: false
      }
    },
    {
      name: 'gmb_sync_logs',
      testData: {
        sync_type: 'initial',
        sync_status: 'started',
        started_at: new Date().toISOString(),
        reviews_synced: 0,
        reviews_new: 0,
        reviews_updated: 0
      }
    }
  ];
  
  const results = [];
  
  for (const table of tableTests) {
    console.log(`📋 Testing table: ${table.name}`);
    
    try {
      // First, try to query the table to see if it exists
      const { data: existsData, error: existsError } = await supabase
        .from(table.name)
        .select('*')
        .limit(0);
      
      if (existsError) {
        console.log(`❌ ${table.name}: Does not exist (${existsError.message})`);
        results.push({ table: table.name, exists: false, error: existsError.message });
      } else {
        console.log(`✅ ${table.name}: Already exists`);
        results.push({ table: table.name, exists: true });
        
        // Clean up any test data if the table exists
        try {
          if (table.name === 'oauth_states') {
            await supabase.from(table.name).delete().eq('state_token', 'test_token_delete_me');
          } else if (table.name === 'gmb_accounts') {
            await supabase.from(table.name).delete().eq('gmb_account_id', 'test_account');
          } else if (table.name === 'gmb_reviews') {
            await supabase.from(table.name).delete().eq('google_review_id', 'test_review_123');
          }
        } catch (cleanupError) {
          console.log(`🧹 Cleanup note for ${table.name}: ${cleanupError.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${table.name}: Error checking (${error.message})`);
      results.push({ table: table.name, exists: false, error: error.message });
    }
  }
  
  console.log('\n📊 Summary of GMB tables:');
  let existingCount = 0;
  let missingCount = 0;
  
  results.forEach(result => {
    if (result.exists) {
      console.log(`   ✅ ${result.table}: Ready`);
      existingCount++;
    } else {
      console.log(`   ❌ ${result.table}: Missing`);
      missingCount++;
    }
  });
  
  console.log(`\n📈 Status: ${existingCount}/${results.length} tables exist`);
  
  if (missingCount > 0) {
    console.log(`\n🛠️ To create missing tables, execute this SQL in Supabase SQL Editor:`);
    console.log(`\n-- Copy and paste this into Supabase Dashboard → SQL Editor:`);
    
    // Provide simplified table creation SQL
    const simplifiedSQL = `
-- Essential GMB tables (simplified for manual creation)

-- 1. OAuth states table
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

-- 4. Review attributions table
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

-- 5. Review responses table
CREATE TABLE IF NOT EXISTS gmb_review_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES gmb_reviews(id) ON DELETE CASCADE,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  approval_status VARCHAR(20) DEFAULT 'pending',
  published_to_gmb BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sync logs table
CREATE TABLE IF NOT EXISTS gmb_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gmb_account_id UUID REFERENCES gmb_accounts(id) ON DELETE CASCADE,
  sync_type VARCHAR(20),
  sync_status VARCHAR(20),
  started_at TIMESTAMPTZ NOT NULL,
  reviews_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON oauth_states(state_token);
CREATE INDEX IF NOT EXISTS idx_gmb_accounts_barbershop ON gmb_accounts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_account ON gmb_reviews(gmb_account_id);
CREATE INDEX IF NOT EXISTS idx_attributions_review ON gmb_review_attributions(review_id);
CREATE INDEX IF NOT EXISTS idx_responses_review ON gmb_review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_account ON gmb_sync_logs(gmb_account_id);
`;
    
    console.log(simplifiedSQL);
  } else {
    console.log(`\n🎉 All GMB tables are ready! You can now test the OAuth flow.`);
  }
  
  return results;
}

// Run the test
createGMBTablesViaInsert()
  .catch(console.error);
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createOAuthStatesTable() {
  console.log('🔨 Creating oauth_states table...');
  
  // Check if table exists first
  const { data: existingTable, error: checkError } = await supabase
    .from('oauth_states')
    .select('*')
    .limit(1);
  
  if (!checkError) {
    console.log('✅ Table oauth_states already exists');
    return;
  }
  
  // Create the table using raw SQL
  const createTableSQL = `
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
    
    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON oauth_states(state_token);
    CREATE INDEX IF NOT EXISTS idx_oauth_states_provider ON oauth_states(provider);
    CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
  `;
  
  // Execute raw SQL using Supabase
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: createTableSQL
  });
  
  if (error) {
    // Try alternative approach - direct insert to test if table can be created
    console.log('⚠️ RPC approach failed, trying alternative...');
    
    // Since we can't create tables directly, let's at least verify the error
    console.error('Error details:', error);
    
    // Provide SQL for manual execution
    console.log('\n📋 Please execute this SQL in Supabase SQL Editor:');
    console.log(createTableSQL);
  } else {
    console.log('✅ Table oauth_states created successfully');
  }
}

createOAuthStatesTable().catch(console.error);
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createBookingLinksTables() {
  console.log('🚀 Creating booking links database tables...')
  
  const sql = `
    -- Essential Booking Links Tables
    CREATE TABLE IF NOT EXISTS booking_links (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      barber_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      services JSONB NOT NULL DEFAULT '[]',
      time_slots TEXT[] NOT NULL DEFAULT '{}',
      duration INTEGER NOT NULL DEFAULT 45,
      custom_price DECIMAL(10,2),
      discount INTEGER DEFAULT 0,
      expires_at TIMESTAMP WITH TIME ZONE,
      description TEXT,
      require_phone BOOLEAN DEFAULT true,
      require_email BOOLEAN DEFAULT true,
      allow_reschedule BOOLEAN DEFAULT true,
      send_reminders BOOLEAN DEFAULT true,
      active BOOLEAN DEFAULT true,
      qr_generated BOOLEAN DEFAULT false,
      qr_code_url TEXT,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      revenue DECIMAL(10,2) DEFAULT 0.00,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS link_analytics (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      session_id VARCHAR(255),
      user_agent TEXT,
      ip_address INET,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Enable RLS and create policies
    ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
    ALTER TABLE link_analytics ENABLE ROW LEVEL SECURITY;

    -- Grant permissions
    GRANT ALL ON booking_links TO authenticated, anon;
    GRANT ALL ON link_analytics TO authenticated, anon;

    -- Basic RLS policies (allow all for now, can be tightened later)
    CREATE POLICY IF NOT EXISTS "booking_links_all" ON booking_links FOR ALL USING (true);
    CREATE POLICY IF NOT EXISTS "link_analytics_all" ON link_analytics FOR ALL USING (true);
  `

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: sql })
    
    if (error) {
      console.error('❌ Error creating tables:', error)
      
      // Try alternative method - execute step by step
      console.log('🔄 Trying alternative method...')
      const statements = sql.split(';').filter(s => s.trim().length > 0)
      
      for (const statement of statements) {
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' })
          if (stmtError) {
            console.log('⚠️  Statement failed (may be expected):', statement.substring(0, 50) + '...')
            console.log('   Error:', stmtError.message)
          } else {
            console.log('✅ Statement executed:', statement.substring(0, 50) + '...')
          }
        } catch (e) {
          console.log('⚠️  Statement exception:', e.message)
        }
      }
    } else {
      console.log('✅ Tables created successfully')
    }

    // Test the tables
    const { data: testData, error: testError } = await supabase
      .from('booking_links')
      .select('*')
      .limit(1)

    if (testError) {
      console.error('❌ Error testing tables:', testError)
    } else {
      console.log('✅ Tables are working correctly')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createBookingLinksTables()
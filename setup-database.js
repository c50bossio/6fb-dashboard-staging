const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
  process.exit(1)
}

console.log('🚀 Setting up booking links database tables...')
console.log('📡 Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    // Test connection
    console.log('🔍 Testing Supabase connection...')
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (testError && testError.code !== '42P01') {
      console.error('❌ Connection test failed:', testError)
      return false
    }
    
    console.log('✅ Supabase connection successful')
    
    // Try to create tables using raw SQL via REST API
    console.log('📝 Creating booking_links table...')
    
    const createTableSQL = `
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
      
      ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "booking_links_all" ON booking_links;
      CREATE POLICY "booking_links_all" ON booking_links FOR ALL USING (true);
    `
    
    // Use the SQL editor endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: createTableSQL
      })
    })
    
    if (!response.ok) {
      console.log('⚠️  Direct SQL execution not available, using alternative approach...')
      
      // Alternative: Try to insert a test record to see if table exists
      const { data, error } = await supabase
        .from('booking_links')
        .select('id')
        .limit(1)
      
      if (error && error.code === '42P01') {
        console.log('📋 Table does not exist. Please create it manually in Supabase Dashboard:')
        console.log('')
        console.log('1. Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0])
        console.log('2. Click "SQL Editor" in the sidebar')
        console.log('3. Click "New Query"')
        console.log('4. Copy and paste this SQL:')
        console.log('')
        console.log('-- Booking Links Table')
        console.log(`CREATE TABLE IF NOT EXISTS booking_links (
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

ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "booking_links_all" ON booking_links;
CREATE POLICY "booking_links_all" ON booking_links FOR ALL USING (true);`)
        console.log('')
        console.log('5. Click "Run" to execute')
        console.log('6. Refresh your booking links page')
        
        return false
      } else {
        console.log('✅ booking_links table already exists!')
        return true
      }
    } else {
      console.log('✅ Tables created successfully via SQL execution!')
      return true
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    return false
  }
}

setupDatabase().then(success => {
  if (success) {
    console.log('')
    console.log('🎉 Database setup complete! You can now refresh the booking links page.')
  } else {
    console.log('')
    console.log('⚠️  Manual database setup required. Follow the instructions above.')
  }
  process.exit(success ? 0 : 1)
})
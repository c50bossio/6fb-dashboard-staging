const { execSync } = require('child_process')

console.log('🚀 Creating booking_links table in Supabase...')

const sql = `
-- Create booking_links table
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

-- Enable Row Level Security
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow all operations (for development)
DROP POLICY IF EXISTS "booking_links_all" ON booking_links;
CREATE POLICY "booking_links_all" ON booking_links FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_links_barber_id ON booking_links(barber_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_active ON booking_links(active);
CREATE INDEX IF NOT EXISTS idx_booking_links_created_at ON booking_links(created_at DESC);

-- Insert a sample booking link for testing
INSERT INTO booking_links (
  barber_id,
  name,
  url,
  services,
  time_slots,
  duration,
  description,
  active
) VALUES (
  '83980bc4-7363-4017-b6a7-8207e545a2a1',
  'Quick Cuts Special',
  'quick-cuts-promo',
  '["Haircut", "Beard Trim"]'::jsonb,
  ARRAY['9:00', '10:00', '11:00', '2:00', '3:00', '4:00'],
  45,
  'Special promotional link for quick haircuts and beard trims',
  true
) ON CONFLICT DO NOTHING;
`

console.log('📋 SQL to execute:')
console.log(sql)

console.log('')
console.log('🔧 To create this table:')
console.log('1. Go to https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee')
console.log('2. Click "SQL Editor"')  
console.log('3. Click "New Query"')
console.log('4. Copy and paste the SQL above')
console.log('5. Click "Run"')
console.log('')
console.log('✅ After running the SQL, refresh your booking links page!')
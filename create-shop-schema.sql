-- Create the foundational shop tables if they don't exist
-- This builds on the existing profile system

-- First, ensure we have the barbershops table
CREATE TABLE IF NOT EXISTS barbershops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(10),
  zip_code VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  website TEXT,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  total_clients INTEGER DEFAULT 0,
  monthly_revenue DECIMAL(10,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff relationship table (connects barbers to shops)
CREATE TABLE IF NOT EXISTS barbershop_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'BARBER',
  is_active BOOLEAN DEFAULT true,
  commission_rate DECIMAL(5,2) DEFAULT 60.00,
  financial_model VARCHAR(20) DEFAULT 'commission',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbershop_id, user_id)
);

-- Enable RLS
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_staff ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY IF NOT EXISTS "Shop owners can access their shops" ON barbershops
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Staff can view their shop info" ON barbershops
  FOR SELECT USING (
    id IN (SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Shop owners can manage their staff" ON barbershop_staff
  FOR ALL USING (
    barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
  );

-- Insert indexes for performance
CREATE INDEX IF NOT EXISTS idx_barbershops_owner ON barbershops(owner_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_shop ON barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_user ON barbershop_staff(user_id);
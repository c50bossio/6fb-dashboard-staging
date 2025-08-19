-- Migration: Add barbershop_id and organization_id to users table
-- Purpose: Properly associate users with their barbershops/organizations based on role

-- Add barbershop_id column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL;

-- Add organization_id column if it doesn't exist  
ALTER TABLE users
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_barbershop_id ON users(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Add comments to explain the columns
COMMENT ON COLUMN users.barbershop_id IS 'Direct barbershop association for shop owners and solo barbers';
COMMENT ON COLUMN users.organization_id IS 'Organization association for enterprise owners';

-- Create function to auto-create barbershop for new shop owners
CREATE OR REPLACE FUNCTION create_barbershop_for_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create barbershop for SHOP_OWNER role and if they don't have one
  IF NEW.role = 'SHOP_OWNER' AND NEW.barbershop_id IS NULL THEN
    INSERT INTO barbershops (
      id,
      owner_id,
      name,
      email,
      phone,
      booking_enabled,
      online_booking_enabled,
      website_enabled,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      COALESCE(NEW.shop_name, NEW.business_name, NEW.full_name || '''s Barbershop'),
      NEW.email,
      NEW.phone,
      true,
      true,
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO NEW.barbershop_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create barbershop on user insert/update
DROP TRIGGER IF EXISTS auto_create_barbershop ON users;
CREATE TRIGGER auto_create_barbershop
  BEFORE INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_barbershop_for_owner();

-- Update existing shop owners to have barbershops
DO $$
DECLARE
  user_record RECORD;
  new_barbershop_id UUID;
BEGIN
  -- Loop through all SHOP_OWNER users without barbershop_id
  FOR user_record IN 
    SELECT * FROM users 
    WHERE role = 'SHOP_OWNER' 
    AND barbershop_id IS NULL
  LOOP
    -- Check if they already own a barbershop
    SELECT id INTO new_barbershop_id
    FROM barbershops
    WHERE owner_id = user_record.id
    LIMIT 1;
    
    -- If no barbershop exists, create one
    IF new_barbershop_id IS NULL THEN
      INSERT INTO barbershops (
        owner_id,
        name,
        email,
        phone,
        booking_enabled,
        online_booking_enabled,
        website_enabled
      ) VALUES (
        user_record.id,
        COALESCE(user_record.shop_name, user_record.business_name, user_record.full_name || '''s Barbershop'),
        user_record.email,
        user_record.phone,
        true,
        true,
        true
      ) RETURNING id INTO new_barbershop_id;
    END IF;
    
    -- Update user with barbershop_id
    UPDATE users 
    SET barbershop_id = new_barbershop_id
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- Also update barbershop_staff relationships for employees
-- This ensures employee barbers are properly linked to their shops
INSERT INTO barbershop_staff (barbershop_id, user_id, role, is_active, created_at)
SELECT DISTINCT 
  b.shop_id as barbershop_id,
  u.id as user_id,
  'BARBER' as role,
  true as is_active,
  NOW() as created_at
FROM barbers b
INNER JOIN users u ON u.email = b.email
WHERE u.role = 'BARBER'
  AND NOT EXISTS (
    SELECT 1 FROM barbershop_staff bs 
    WHERE bs.user_id = u.id 
    AND bs.barbershop_id = b.shop_id::uuid
  )
ON CONFLICT DO NOTHING;
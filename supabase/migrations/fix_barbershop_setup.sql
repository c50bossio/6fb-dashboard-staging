-- Fix Barbershop Setup Migration
-- This script properly sets up barbershop associations for the system

-- Step 1: Add columns if they don't exist (safe to run multiple times)
DO $$
BEGIN
  -- Add barbershop_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'barbershop_id'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL;
  END IF;

  -- Add organization_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_barbershop_id ON users(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Step 3: Add column comments
COMMENT ON COLUMN users.barbershop_id IS 'Direct barbershop association for shop owners and solo barbers';
COMMENT ON COLUMN users.organization_id IS 'Organization association for enterprise owners';

-- Step 4: Fix the specific user (c50bossio@gmail.com) - Update role to SHOP_OWNER
UPDATE users 
SET role = 'SHOP_OWNER',
    subscription_status = 'active',
    onboarding_completed = false,
    onboarding_step = 0
WHERE email = 'c50bossio@gmail.com';

-- Step 5: Create barbershop for the user if they don't have one
DO $$
DECLARE
  user_id_var UUID;
  barbershop_id_var UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO user_id_var
  FROM users
  WHERE email = 'c50bossio@gmail.com';
  
  IF user_id_var IS NOT NULL THEN
    -- Check if user already has a barbershop
    SELECT id INTO barbershop_id_var
    FROM barbershops
    WHERE owner_id = user_id_var
    LIMIT 1;
    
    -- If no barbershop exists, create one
    IF barbershop_id_var IS NULL THEN
      INSERT INTO barbershops (
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
        user_id_var,
        'My Barbershop', -- Default name, user can change during onboarding
        'c50bossio@gmail.com',
        '',
        true,
        true,
        true,
        NOW(),
        NOW()
      ) RETURNING id INTO barbershop_id_var;
      
      RAISE NOTICE 'Created barbershop with ID: %', barbershop_id_var;
    END IF;
    
    -- Update user with barbershop_id
    UPDATE users 
    SET barbershop_id = barbershop_id_var
    WHERE id = user_id_var;
    
    RAISE NOTICE 'Updated user with barbershop_id: %', barbershop_id_var;
  END IF;
END $$;

-- Step 6: Create the auto-create trigger function
CREATE OR REPLACE FUNCTION create_barbershop_for_owner()
RETURNS TRIGGER AS $$
DECLARE
  new_barbershop_id UUID;
BEGIN
  -- Only create barbershop for SHOP_OWNER role and if they don't have one
  IF NEW.role = 'SHOP_OWNER' AND NEW.barbershop_id IS NULL THEN
    INSERT INTO barbershops (
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
      NEW.id,
      COALESCE(NEW.shop_name, NEW.business_name, CONCAT(NEW.full_name, '''s Barbershop')),
      NEW.email,
      COALESCE(NEW.phone, ''),
      true,
      true,
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO new_barbershop_id;
    
    NEW.barbershop_id := new_barbershop_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for auto-creating barbershop
DROP TRIGGER IF EXISTS auto_create_barbershop ON users;
CREATE TRIGGER auto_create_barbershop
  BEFORE INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_barbershop_for_owner();

-- Step 8: Process other existing SHOP_OWNER users
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
    AND email != 'c50bossio@gmail.com' -- Already handled above
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
        COALESCE(user_record.shop_name, user_record.business_name, CONCAT(user_record.full_name, '''s Barbershop')),
        user_record.email,
        COALESCE(user_record.phone, ''),
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

-- Step 9: Fix barbershop_staff relationships (using proper UUID casting)
INSERT INTO barbershop_staff (barbershop_id, user_id, role, is_active, created_at)
SELECT DISTINCT 
  b.shop_id::uuid as barbershop_id,  -- Proper UUID casting
  u.id as user_id,
  'BARBER' as role,
  true as is_active,
  NOW() as created_at
FROM barbers b
INNER JOIN users u ON u.email = b.email
WHERE u.role = 'BARBER'
  AND b.shop_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM barbershop_staff bs 
    WHERE bs.user_id = u.id 
    AND bs.barbershop_id = b.shop_id::uuid
  )
ON CONFLICT DO NOTHING;

-- Step 10: Verify the results
DO $$
DECLARE
  user_count INTEGER;
  shop_owner_count INTEGER;
  barbershop_count INTEGER;
  linked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users WHERE email = 'c50bossio@gmail.com';
  SELECT COUNT(*) INTO shop_owner_count FROM users WHERE email = 'c50bossio@gmail.com' AND role = 'SHOP_OWNER';
  SELECT COUNT(*) INTO barbershop_count FROM users WHERE email = 'c50bossio@gmail.com' AND barbershop_id IS NOT NULL;
  SELECT COUNT(*) INTO linked_count FROM barbershops b 
    INNER JOIN users u ON u.id = b.owner_id 
    WHERE u.email = 'c50bossio@gmail.com';
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Migration Results for c50bossio@gmail.com:';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'User exists: %', CASE WHEN user_count > 0 THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE 'Has SHOP_OWNER role: %', CASE WHEN shop_owner_count > 0 THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE 'Has barbershop_id: %', CASE WHEN barbershop_count > 0 THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE 'Owns a barbershop: %', CASE WHEN linked_count > 0 THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE '===========================================';
END $$;

-- Final check: Show the user's current state
SELECT 
  u.id,
  u.email,
  u.role,
  u.barbershop_id,
  u.subscription_status,
  u.onboarding_completed,
  u.onboarding_step,
  b.name as barbershop_name,
  b.id as owned_barbershop_id
FROM users u
LEFT JOIN barbershops b ON b.owner_id = u.id
WHERE u.email = 'c50bossio@gmail.com';
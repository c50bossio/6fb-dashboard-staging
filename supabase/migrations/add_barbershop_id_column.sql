-- Simple migration to add barbershop_id column to users table

-- Step 1: Add barbershop_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'barbershop_id'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added barbershop_id column to users table';
  ELSE
    RAISE NOTICE 'barbershop_id column already exists';
  END IF;
END $$;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_barbershop_id ON users(barbershop_id);

-- Step 3: Link the user to their barbershop
UPDATE users 
SET barbershop_id = 'c6261c6d-08e7-4e5f-89c3-ad3f3529caed'
WHERE email = 'c50bossio@gmail.com';

-- Step 4: Verify the update
SELECT 
  u.id,
  u.email,
  u.role,
  u.barbershop_id,
  u.subscription_status,
  b.name as barbershop_name
FROM users u
LEFT JOIN barbershops b ON b.id = u.barbershop_id
WHERE u.email = 'c50bossio@gmail.com';
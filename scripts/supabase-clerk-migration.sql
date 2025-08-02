-- Add Clerk fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for Clerk ID lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- Update RLS policies to work with Clerk
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new policies that work with both Supabase Auth and Clerk
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    auth.uid()::text = id::text 
    OR clerk_id = current_setting('app.current_clerk_id', true)
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    auth.uid()::text = id::text 
    OR clerk_id = current_setting('app.current_clerk_id', true)
  );

-- Function to set Clerk ID in session
CREATE OR REPLACE FUNCTION set_clerk_user_id(p_clerk_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_clerk_id', p_clerk_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_clerk_user_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_clerk_user_id(TEXT) TO anon;
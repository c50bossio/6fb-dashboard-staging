-- Fix missing database schema for 6FB AI Agent System
-- Run this in Supabase SQL Editor

-- 1. Create missing usage_events table
CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id uuid REFERENCES barbershops(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('ai_tokens', 'sms_sent', 'email_sent')),
  quantity integer NOT NULL DEFAULT 0,
  cost_usd decimal(10,4) NOT NULL DEFAULT 0,
  service_name text,
  metadata jsonb DEFAULT '{}',
  billing_period date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_barbershop_id ON usage_events(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_billing_period ON usage_events(billing_period);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at);

-- 2. Add missing booking_settings column to barbershops table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'barbershops' 
        AND column_name = 'booking_settings'
    ) THEN
        ALTER TABLE barbershops ADD COLUMN booking_settings jsonb DEFAULT '{}';
    END IF;
END $$;

-- 3. Enable RLS on usage_events table
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for usage_events
CREATE POLICY "Users can view their own usage events" ON usage_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage events" ON usage_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can access all usage events" ON usage_events
  FOR ALL USING (true);

-- 5. Grant necessary permissions
GRANT ALL ON usage_events TO authenticated;
GRANT ALL ON usage_events TO service_role;

-- Success message
SELECT 'Database schema fixes applied successfully!' as message;
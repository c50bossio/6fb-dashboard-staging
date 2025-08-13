-- Create Missing Domain Management Tables
-- Run this in Supabase Dashboard → SQL Editor
-- Date: January 13, 2025

-- 1. Domain purchases tracking table
CREATE TABLE IF NOT EXISTS domain_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending_payment',
  price DECIMAL(10,2),
  registration_years INTEGER DEFAULT 1,
  auto_renew BOOLEAN DEFAULT TRUE,
  stripe_session_id VARCHAR(255),
  registered_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Domain setup email tracking table
CREATE TABLE IF NOT EXISTS domain_setup_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  provider VARCHAR(50),
  email_sent_to VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_purchases_user ON domain_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_purchases_domain ON domain_purchases(domain);
CREATE INDEX IF NOT EXISTS idx_domain_purchases_status ON domain_purchases(status);
CREATE INDEX IF NOT EXISTS idx_domain_setup_emails_user ON domain_setup_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_setup_emails_domain ON domain_setup_emails(domain);

-- 4. Add RLS (Row Level Security) policies
ALTER TABLE domain_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_setup_emails ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own domain purchases
CREATE POLICY "Users can view own domain purchases" ON domain_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to see their own email history
CREATE POLICY "Users can view own domain emails" ON domain_setup_emails
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to manage all records
CREATE POLICY "Service role can manage domain purchases" ON domain_purchases
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage domain emails" ON domain_setup_emails
  FOR ALL USING (auth.role() = 'service_role');

-- 5. Grant permissions
GRANT ALL ON domain_purchases TO service_role;
GRANT ALL ON domain_setup_emails TO service_role;
GRANT SELECT ON domain_purchases TO authenticated;
GRANT SELECT ON domain_setup_emails TO authenticated;

-- Success message
SELECT 'Domain tables created successfully!' as message;
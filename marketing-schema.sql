-- Marketing Campaign System Database Schema
-- Creates all tables needed for white-label marketing platform

-- Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  billing_account_id UUID,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'failed')),
  audience_type TEXT DEFAULT 'all' CHECK (audience_type IN ('all', 'segment', 'custom')),
  audience_filters JSONB DEFAULT '{}',
  subject TEXT,
  message TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  final_cost DECIMAL(10,4) DEFAULT 0,
  audience_count INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing Billing Accounts Table
CREATE TABLE IF NOT EXISTS marketing_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
  account_name TEXT NOT NULL,
  stripe_customer_id TEXT,
  payment_method_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, account_name)
);

-- Customer Segments Table  
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB DEFAULT '{}',
  customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(created_by, name)
);

-- Marketing Billing Records Table
CREATE TABLE IF NOT EXISTS marketing_billing_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES marketing_campaigns(id),
  billing_account_id UUID REFERENCES marketing_accounts(id),
  stripe_payment_intent_id TEXT,
  amount_charged DECIMAL(10,4) NOT NULL,
  platform_fee DECIMAL(10,4) NOT NULL,
  service_cost DECIMAL(10,4) NOT NULL,
  recipients_count INTEGER NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for marketing campaigns
ALTER TABLE marketing_campaigns 
ADD CONSTRAINT fk_billing_account 
FOREIGN KEY (billing_account_id) 
REFERENCES marketing_accounts(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON marketing_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_billing_campaign ON marketing_billing_records(campaign_id);
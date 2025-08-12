-- Simple Marketing Tables for Testing
-- Apply this in Supabase SQL Editor manually

-- 1. Marketing Accounts Table (Simplified)
CREATE TABLE IF NOT EXISTS marketing_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    account_name TEXT NOT NULL,
    stripe_customer_id TEXT,
    payment_method_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Marketing Campaigns Table (Simplified)
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by TEXT NOT NULL,
    billing_account_id UUID REFERENCES marketing_accounts(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'failed')),
    subject TEXT,
    message TEXT NOT NULL,
    audience_type TEXT NOT NULL CHECK (audience_type IN ('all', 'segment', 'custom')),
    audience_count INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,4) DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Campaign Recipients Table (Simplified)
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    email_address TEXT,
    phone_number TEXT,
    full_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customer Segments Table (Simplified)
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB DEFAULT '{}'::jsonb,
    customer_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Custom Roles Table (For Permissions)
CREATE TABLE IF NOT EXISTS user_custom_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    can_view_shop_campaigns BOOLEAN DEFAULT false,
    can_manage_shop_campaigns BOOLEAN DEFAULT false,
    can_use_shop_billing BOOLEAN DEFAULT false,
    can_use_enterprise_billing BOOLEAN DEFAULT false,
    granted_by TEXT,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_owner_id ON marketing_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_segments_created_by ON customer_segments(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_roles_user_id ON user_custom_roles(user_id);

-- Insert test data
INSERT INTO marketing_accounts (id, owner_id, owner_type, account_name) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'test-shop-owner-1', 'shop', 'Main Marketing Account')
ON CONFLICT DO NOTHING;

INSERT INTO customer_segments (id, created_by, name, description, criteria) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'test-shop-owner-1', 'All Customers', 'All active customers', '{"active": true}'::jsonb),
('550e8400-e29b-41d4-a716-446655440003', 'test-shop-owner-1', 'VIP Customers', 'High-value customers', '{"vip": true}'::jsonb)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (Optional)
-- ALTER TABLE marketing_accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_custom_roles ENABLE ROW LEVEL SECURITY;
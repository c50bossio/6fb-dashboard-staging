-- Marketing Campaign System - Essential Tables for Supabase
-- Simplified schema focused on core functionality

-- Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Campaign basics
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled', 'failed')),
    
    -- Campaign content
    subject TEXT,
    message TEXT NOT NULL,
    html_content TEXT,
    
    -- Targeting
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    barbershop_id TEXT,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE,
    send_immediately BOOLEAN DEFAULT false,
    
    -- Tracking
    recipients_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    
    -- Billing
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    platform_fee DECIMAL(10,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Campaign Recipients Table
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    
    -- Recipient details
    customer_id TEXT,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    
    -- Delivery tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed', 'unsubscribed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    
    -- Provider tracking IDs
    message_id TEXT,
    provider_message_id TEXT,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing Billing Records Table
CREATE TABLE IF NOT EXISTS marketing_billing_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Billing details
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    campaign_id UUID REFERENCES marketing_campaigns(id),
    
    -- Cost breakdown
    service_type TEXT NOT NULL CHECK (service_type IN ('email', 'sms')),
    recipient_count INTEGER NOT NULL,
    base_cost DECIMAL(10,4) NOT NULL,
    markup_rate DECIMAL(5,2) NOT NULL,
    platform_fee DECIMAL(10,4) NOT NULL,
    total_charge DECIMAL(10,4) NOT NULL,
    
    -- Payment
    stripe_charge_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Billing period
    billing_month INTEGER,
    billing_year INTEGER
);

-- Customer Segments Table (for targeted campaigns)
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Segment details
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Segment criteria (stored as JSON)
    criteria JSONB NOT NULL DEFAULT '{}',
    
    -- Customer list cache
    customer_ids JSONB DEFAULT '[]',
    customer_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_calculated TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_owner ON marketing_campaigns(owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_scheduled ON marketing_campaigns(scheduled_for) WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_customer ON campaign_recipients(customer_id);

CREATE INDEX IF NOT EXISTS idx_billing_records_owner ON marketing_billing_records(owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_billing_records_campaign ON marketing_billing_records(campaign_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_billing_period ON marketing_billing_records(billing_year, billing_month);

CREATE INDEX IF NOT EXISTS idx_customer_segments_owner ON customer_segments(owner_id);

-- Row Level Security (RLS) for multi-tenant access
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;

-- Insert test data for validation
INSERT INTO marketing_campaigns (
    name, type, status, subject, message, owner_id, owner_type, 
    recipients_count, estimated_cost, platform_fee
) VALUES 
(
    'Welcome Email Series', 
    'email', 
    'completed', 
    'Welcome to Elite Cuts!', 
    'Thank you for choosing us for your grooming needs. Book your next appointment today!',
    'shop-001',
    'shop',
    125,
    0.125,
    0.350
),
(
    'Monthly SMS Promotion',
    'sms',
    'scheduled',
    'Limited Time Offer',
    'Get 25% off all services this week only! Call (555) 123-4567 to book.',
    'shop-001', 
    'shop',
    87,
    0.65,
    1.31
) ON CONFLICT DO NOTHING;

-- Confirm tables were created
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE '%marketing%' 
    OR table_name LIKE '%campaign%'
ORDER BY table_name;
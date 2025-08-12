-- ============================================
-- Marketing Campaign System - Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    barbershop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
    subject TEXT,
    message TEXT NOT NULL,
    recipients_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Campaign recipients table
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'unsubscribed')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    failed_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Marketing billing records table
CREATE TABLE IF NOT EXISTS marketing_billing_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
    recipients_count INTEGER NOT NULL,
    base_cost DECIMAL(10, 4) NOT NULL,
    markup_rate DECIMAL(5, 2) NOT NULL,
    platform_fee DECIMAL(10, 4) NOT NULL,
    total_charge DECIMAL(10, 4) NOT NULL,
    profit_margin DECIMAL(5, 2) NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customer segments table
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL DEFAULT '{}',
    customer_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Email unsubscribes table
CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    barbershop_id TEXT,
    reason TEXT,
    unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email, barbershop_id)
);

-- 6. SMS opt-outs table
CREATE TABLE IF NOT EXISTS sms_opt_outs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL,
    barbershop_id TEXT,
    opted_out_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(phone, barbershop_id)
);

-- 7. Campaign queue table
CREATE TABLE IF NOT EXISTS campaign_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    job_id TEXT UNIQUE,
    queue_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('sendgrid', 'twilio')),
    event_type TEXT NOT NULL,
    event_id TEXT UNIQUE,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON marketing_campaigns(owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON marketing_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_billing_owner ON marketing_billing_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_billing_campaign ON marketing_billing_records(campaign_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON email_unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_opt_outs_phone ON sms_opt_outs(phone);
CREATE INDEX IF NOT EXISTS idx_queue_status ON campaign_queue(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON webhook_events(processed);

-- Grant permissions (adjust based on your RLS needs)
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'Marketing tables created successfully!' as message;
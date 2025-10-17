-- ===============================================
-- FIX AND COMPLETE MARKETING BILLING TABLES
-- Run this in Supabase SQL Editor
-- ===============================================

-- First, add any missing columns to marketing_accounts
ALTER TABLE marketing_accounts 
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Drop the marketing_billing_records table if it exists with wrong schema
DROP TABLE IF EXISTS marketing_billing_records CASCADE;

-- Create marketing_billing_records table with correct schema
CREATE TABLE IF NOT EXISTS marketing_billing_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES marketing_accounts(id) ON DELETE CASCADE NOT NULL,  -- Fixed: using account_id instead of billing_account_id
    campaign_id UUID,
    invoice_id TEXT,
    
    -- Amounts
    amount_charged DECIMAL(10,4) NOT NULL DEFAULT 0,
    platform_fee DECIMAL(10,4) DEFAULT 0,
    service_cost DECIMAL(10,4) DEFAULT 0,
    
    -- Campaign metrics
    recipients_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    
    -- Payment details
    payment_status TEXT DEFAULT 'pending',
    payment_method_id UUID,
    stripe_charge_id TEXT,
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,
    
    -- Additional info
    description TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- Create marketing_campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES marketing_accounts(id) ON DELETE CASCADE NOT NULL,
    
    -- Campaign details
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'both')),
    subject TEXT,
    message TEXT NOT NULL,
    
    -- Recipients
    recipient_list JSONB,
    recipient_count INTEGER DEFAULT 0,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    -- Status tracking
    status TEXT DEFAULT 'draft',
    approval_status TEXT DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    
    -- Cost estimation
    estimated_cost DECIMAL(10,4),
    actual_cost DECIMAL(10,4),
    
    -- Performance metrics
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_records_account_id ON marketing_billing_records(account_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_campaign_id ON marketing_billing_records(campaign_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_payment_status ON marketing_billing_records(payment_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_account_id ON marketing_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON marketing_campaigns(scheduled_for);

-- Enable RLS on new tables
ALTER TABLE marketing_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_billing_records
CREATE POLICY "Users can view billing records for their accounts" ON marketing_billing_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM marketing_accounts 
            WHERE marketing_accounts.id = marketing_billing_records.account_id 
            AND marketing_accounts.owner_id = auth.uid()::text
        )
    );

-- RLS Policies for marketing_campaigns  
CREATE POLICY "Users can view campaigns for their accounts" ON marketing_campaigns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM marketing_accounts 
            WHERE marketing_accounts.id = marketing_campaigns.account_id 
            AND marketing_accounts.owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create campaigns for their accounts" ON marketing_campaigns
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM marketing_accounts 
            WHERE marketing_accounts.id = marketing_campaigns.account_id 
            AND marketing_accounts.owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update their own campaigns" ON marketing_campaigns
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM marketing_accounts 
            WHERE marketing_accounts.id = marketing_campaigns.account_id 
            AND marketing_accounts.owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete their own campaigns" ON marketing_campaigns
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM marketing_accounts 
            WHERE marketing_accounts.id = marketing_campaigns.account_id 
            AND marketing_accounts.owner_id = auth.uid()::text
        )
    );

-- Add comments for documentation
COMMENT ON TABLE marketing_billing_records IS 'Billing records for marketing campaigns';
COMMENT ON TABLE marketing_campaigns IS 'Marketing campaigns with email and SMS support';
COMMENT ON COLUMN marketing_accounts.last_used_at IS 'Last time this account was used to send a campaign';
COMMENT ON COLUMN marketing_billing_records.platform_fee IS 'Platform fee (20% of service cost)';
COMMENT ON COLUMN marketing_billing_records.service_cost IS 'Actual cost from service provider';

-- Success message
SELECT 'Marketing billing tables successfully created/updated!' as message;
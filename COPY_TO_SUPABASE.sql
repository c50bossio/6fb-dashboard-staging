-- ===============================================
-- MARKETING BILLING TABLES FOR SUPABASE
-- Copy and paste this entire script into Supabase SQL Editor
-- ===============================================

-- Marketing Accounts Table
CREATE TABLE IF NOT EXISTS marketing_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    barbershop_id TEXT,
    enterprise_id TEXT,
    account_name TEXT NOT NULL,
    description TEXT,
    provider TEXT NOT NULL DEFAULT 'sendgrid',
    sendgrid_from_email TEXT DEFAULT 'noreply@bookedbarber.com',
    sendgrid_from_name TEXT DEFAULT 'BookedBarber',
    twilio_phone_number TEXT,
    stripe_customer_id TEXT,
    billing_email TEXT,
    payment_method_id TEXT,
    monthly_spend_limit DECIMAL(10,2) DEFAULT 1000.00,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    total_campaigns_sent INTEGER DEFAULT 0,
    total_emails_sent INTEGER DEFAULT 0,
    total_sms_sent INTEGER DEFAULT 0,
    total_spent DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing Payment Methods Table
CREATE TABLE IF NOT EXISTS marketing_payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES marketing_accounts(id) ON DELETE CASCADE NOT NULL,
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    billing_address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_owner_id ON marketing_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_active ON marketing_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_account_id ON marketing_payment_methods(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON marketing_payment_methods(is_default, is_active);

-- Row Level Security (RLS) Policies
ALTER TABLE marketing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own marketing accounts
CREATE POLICY "Users can view their own marketing accounts" ON marketing_accounts
    FOR SELECT USING (owner_id = auth.uid()::text);

CREATE POLICY "Users can insert their own marketing accounts" ON marketing_accounts
    FOR INSERT WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY "Users can update their own marketing accounts" ON marketing_accounts
    FOR UPDATE USING (owner_id = auth.uid()::text);

CREATE POLICY "Users can delete their own marketing accounts" ON marketing_accounts
    FOR DELETE USING (owner_id = auth.uid()::text);

-- RLS Policy: Users can only see payment methods for their accounts
CREATE POLICY "Users can view payment methods for their accounts" ON marketing_payment_methods
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM marketing_accounts 
            WHERE marketing_accounts.id = marketing_payment_methods.account_id 
            AND marketing_accounts.owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert payment methods for their accounts" ON marketing_payment_methods
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM marketing_accounts 
            WHERE marketing_accounts.id = marketing_payment_methods.account_id 
            AND marketing_accounts.owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update payment methods for their accounts" ON marketing_payment_methods
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM marketing_accounts 
            WHERE marketing_accounts.id = marketing_payment_methods.account_id 
            AND marketing_accounts.owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete payment methods for their accounts" ON marketing_payment_methods
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM marketing_accounts 
            WHERE marketing_accounts.id = marketing_payment_methods.account_id 
            AND marketing_accounts.owner_id = auth.uid()::text
        )
    );

-- Comments
COMMENT ON TABLE marketing_accounts IS 'Marketing service accounts and billing configuration';
COMMENT ON TABLE marketing_payment_methods IS 'Stripe payment methods for marketing accounts';
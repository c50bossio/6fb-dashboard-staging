#!/usr/bin/env node

/**
 * Create Marketing Billing Tables in Supabase
 * 
 * Sets up all required tables for the marketing billing system
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
)

const createTableSQL = `
-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- MARKETING ACCOUNTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Account ownership
    owner_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    barbershop_id TEXT,
    enterprise_id TEXT,
    
    -- Account details
    account_name TEXT NOT NULL,
    description TEXT,
    
    -- Service provider configuration
    provider TEXT NOT NULL DEFAULT 'sendgrid',
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    
    -- SendGrid specific settings
    sendgrid_api_key_encrypted TEXT,
    sendgrid_from_email TEXT DEFAULT 'noreply@bookedbarber.com',
    sendgrid_from_name TEXT DEFAULT 'BookedBarber',
    sendgrid_template_id TEXT,
    
    -- Twilio specific settings
    twilio_account_sid TEXT,
    twilio_auth_token_encrypted TEXT,
    twilio_phone_number TEXT,
    
    -- Billing configuration
    stripe_customer_id TEXT,
    billing_email TEXT,
    payment_method_id TEXT,
    billing_address JSONB,
    
    -- Usage controls
    monthly_spend_limit DECIMAL(10,2) DEFAULT 1000.00,
    daily_send_limit INTEGER DEFAULT 10000,
    require_approval_above DECIMAL(10,2) DEFAULT 100.00,
    
    -- Account permissions
    authorized_users TEXT[],
    
    -- Status and configuration
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_method TEXT,
    verified_at TIMESTAMPTZ,
    
    -- Compliance settings
    include_unsubscribe_link BOOLEAN DEFAULT true,
    include_company_address BOOLEAN DEFAULT true,
    company_address TEXT,
    gdpr_compliant BOOLEAN DEFAULT true,
    
    -- Usage tracking
    total_campaigns_sent INTEGER DEFAULT 0,
    total_emails_sent INTEGER DEFAULT 0,
    total_sms_sent INTEGER DEFAULT 0,
    total_spent DECIMAL(10,4) DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- MARKETING PAYMENT METHODS TABLE  
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_payment_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_id UUID REFERENCES marketing_accounts(id) ON DELETE CASCADE NOT NULL,
    
    -- Stripe payment method details
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    
    -- Card details (for display only)
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Status
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Billing address
    billing_address JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- MARKETING CAMPAIGNS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Campaign ownership and billing
    created_by TEXT NOT NULL,
    billing_account_id UUID REFERENCES marketing_accounts(id) NOT NULL,
    
    -- Campaign details
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'pending_approval', 'approved', 'active', 'completed', 'failed', 'cancelled', 'paid', 'payment_failed')),
    
    -- Content
    subject TEXT,
    message TEXT NOT NULL,
    message_text TEXT,
    media_urls TEXT[],
    
    -- Sender details
    from_email TEXT,
    from_name TEXT,
    reply_to_email TEXT,
    
    -- Template and personalization
    template_id TEXT,
    personalization_data JSONB DEFAULT '{}'::jsonb,
    
    -- Audience targeting
    audience_type TEXT NOT NULL CHECK (audience_type IN ('all', 'segment', 'custom')),
    audience_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    audience_count INTEGER DEFAULT 0,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ,
    send_immediately BOOLEAN DEFAULT false,
    timezone TEXT DEFAULT 'UTC',
    
    -- Cost estimation and billing
    estimated_cost DECIMAL(10,4) DEFAULT 0,
    final_cost DECIMAL(10,4) DEFAULT 0,
    platform_fee DECIMAL(10,4) DEFAULT 0,
    service_cost DECIMAL(10,4) DEFAULT 0,
    
    -- Campaign execution
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_details TEXT,
    
    -- Performance metrics
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    delivery_rate DECIMAL(5,4) DEFAULT 0,
    open_rate DECIMAL(5,4) DEFAULT 0,
    click_rate DECIMAL(5,4) DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Campaign settings
    track_opens BOOLEAN DEFAULT true,
    track_clicks BOOLEAN DEFAULT true,
    include_unsubscribe BOOLEAN DEFAULT true,
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'shop', 'enterprise')),
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- CAMPAIGN RECIPIENTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE NOT NULL,
    
    -- Recipient details
    customer_id TEXT,
    email_address TEXT,
    phone_number TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    
    -- Personalization data for this recipient
    personalization_data JSONB DEFAULT '{}'::jsonb,
    
    -- Delivery tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'unsubscribed')),
    external_message_id TEXT,
    error_message TEXT,
    
    -- Engagement tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Delivery metadata
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- MARKETING BILLING RECORDS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_billing_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Campaign and account references
    campaign_id UUID REFERENCES marketing_campaigns(id) NOT NULL,
    billing_account_id UUID REFERENCES marketing_accounts(id) NOT NULL,
    
    -- Stripe transaction details
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'disputed', 'refunded')),
    
    -- Cost breakdown
    amount_charged DECIMAL(10,4) NOT NULL,
    platform_fee DECIMAL(10,4) NOT NULL,
    service_cost DECIMAL(10,4) NOT NULL,
    
    -- Volume metrics
    recipients_count INTEGER NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    -- Billing metadata
    billing_period TEXT,
    invoice_id TEXT,
    receipt_url TEXT,
    
    -- Refunds and disputes
    refund_amount DECIMAL(10,4) DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    
    -- Status tracking
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disputed', 'refunded', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- CUSTOMER SEGMENTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Ownership
    created_by TEXT NOT NULL,
    barbershop_id TEXT,
    enterprise_id TEXT,
    
    -- Segment details
    name TEXT NOT NULL,
    description TEXT,
    segment_type TEXT DEFAULT 'dynamic' CHECK (segment_type IN ('dynamic', 'static')),
    
    -- Segment criteria (JSON filter rules)
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Segment statistics
    customer_count INTEGER DEFAULT 0,
    email_count INTEGER DEFAULT 0,
    sms_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ,
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    auto_update BOOLEAN DEFAULT true,
    update_frequency INTEGER DEFAULT 24,
    
    -- Usage tracking
    campaigns_sent INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Visibility
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'shop', 'enterprise')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- EMAIL UNSUBSCRIBES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Email and optional customer reference
    email_address TEXT NOT NULL,
    customer_id TEXT,
    
    -- Unsubscribe context
    campaign_id UUID REFERENCES marketing_campaigns(id),
    barbershop_id TEXT,
    enterprise_id TEXT,
    unsubscribe_scope TEXT DEFAULT 'global' CHECK (unsubscribe_scope IN ('global', 'shop', 'enterprise', 'campaign')),
    
    -- Unsubscribe details
    reason TEXT,
    source TEXT DEFAULT 'email_link',
    user_agent TEXT,
    ip_address INET,
    
    -- Resubscribe tracking
    resubscribed_at TIMESTAMPTZ,
    resubscribed_by TEXT,
    resubscribe_source TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(email_address, unsubscribe_scope, barbershop_id, enterprise_id)
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Marketing Accounts Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_owner_id ON marketing_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_owner_type ON marketing_accounts(owner_type);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_barbershop_id ON marketing_accounts(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_enterprise_id ON marketing_accounts(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_active ON marketing_accounts(is_active);

-- Marketing Payment Methods Indexes  
CREATE INDEX IF NOT EXISTS idx_payment_methods_account_id ON marketing_payment_methods(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON marketing_payment_methods(is_default, is_active);

-- Marketing Campaigns Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_billing_account ON marketing_campaigns(billing_account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON marketing_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON marketing_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON marketing_campaigns(created_at);

-- Campaign Recipients Indexes
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_customer_id ON campaign_recipients(customer_id);
CREATE INDEX IF NOT EXISTS idx_recipients_email ON campaign_recipients(email_address);
CREATE INDEX IF NOT EXISTS idx_recipients_phone ON campaign_recipients(phone_number);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_recipients_sent_at ON campaign_recipients(sent_at);

-- Billing Records Indexes
CREATE INDEX IF NOT EXISTS idx_billing_records_campaign_id ON marketing_billing_records(campaign_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_account_id ON marketing_billing_records(billing_account_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_created_at ON marketing_billing_records(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_records_payment_status ON marketing_billing_records(payment_status);

-- Customer Segments Indexes
CREATE INDEX IF NOT EXISTS idx_segments_created_by ON customer_segments(created_by);
CREATE INDEX IF NOT EXISTS idx_segments_barbershop_id ON customer_segments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_segments_enterprise_id ON customer_segments(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_segments_active ON customer_segments(is_active);
CREATE INDEX IF NOT EXISTS idx_segments_auto_update ON customer_segments(auto_update);

-- Email Unsubscribes Indexes
CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON email_unsubscribes(email_address);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_customer_id ON email_unsubscribes(customer_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_campaign_id ON email_unsubscribes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_scope ON email_unsubscribes(unsubscribe_scope);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_active ON email_unsubscribes(is_active);
`;

async function createBillingTables() {
  console.log('🏗️  Creating marketing billing tables in Supabase...')

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: createTableSQL
    })

    if (error) {
      console.error('❌ Error creating tables:', error)
      
      console.log('🔄 Trying alternative approach...')
      
      const statements = createTableSQL.split(';').filter(stmt => stmt.trim())
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await supabase.rpc('exec_sql', {
              sql_query: statement + ';'
            })
          } catch (e) {
            console.log('⚠️  Statement skipped (might already exist):', statement.substring(0, 100) + '...')
          }
        }
      }
    } else {
      console.log('✅ All billing tables created successfully')
    }

    console.log('\n🔍 Verifying table creation...')
    
    const tables = [
      'marketing_accounts',
      'marketing_payment_methods', 
      'marketing_campaigns',
      'campaign_recipients',
      'marketing_billing_records',
      'customer_segments',
      'email_unsubscribes'
    ]

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`❌ Table '${table}' verification failed:`, error.message)
        } else {
          console.log(`✅ Table '${table}' exists`)
        }
      } catch (e) {
        console.log(`❌ Table '${table}' not accessible:`, e.message)
      }
    }

    console.log('\n✨ Marketing billing database setup completed!')

  } catch (error) {
    console.error('❌ Setup error:', error)
    process.exit(1)
  }
}

createBillingTables().catch(console.error)
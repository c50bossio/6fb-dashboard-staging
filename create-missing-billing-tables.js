const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMissingTables() {
  console.log('🚀 Creating missing marketing billing tables in Supabase...\n');
  
  const sql = `
-- ===============================================
-- MARKETING ACCOUNTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS marketing_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Account ownership
    owner_id TEXT NOT NULL, -- User ID who owns this account
    owner_type TEXT NOT NULL CHECK (owner_type IN ('barber', 'shop', 'enterprise')),
    barbershop_id TEXT, -- Reference to barbershop if applicable
    enterprise_id TEXT, -- Reference to enterprise if applicable
    
    -- Account details
    account_name TEXT NOT NULL,
    description TEXT,
    
    -- Service provider configuration
    provider TEXT NOT NULL DEFAULT 'sendgrid', -- sendgrid, mailgun, ses, etc.
    api_key_encrypted TEXT, -- Encrypted API key
    api_secret_encrypted TEXT, -- Encrypted API secret (if needed)
    
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
    stripe_customer_id TEXT, -- Stripe customer for billing
    billing_email TEXT,
    payment_method_id TEXT, -- Default payment method
    billing_address JSONB,
    
    -- Usage controls
    monthly_spend_limit DECIMAL(10,2) DEFAULT 1000.00,
    daily_send_limit INTEGER DEFAULT 10000,
    require_approval_above DECIMAL(10,2) DEFAULT 100.00, -- Require approval for campaigns above this cost
    
    -- Account permissions
    authorized_users TEXT[], -- Array of user IDs who can use this account
    
    -- Status and configuration
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_method TEXT, -- email, phone, manual
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
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES marketing_accounts(id) ON DELETE CASCADE NOT NULL,
    
    -- Stripe payment method details
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    
    -- Card details (for display only)
    card_brand TEXT, -- visa, mastercard, amex, etc.
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

-- Comments for documentation
COMMENT ON TABLE marketing_accounts IS 'Marketing service accounts and billing configuration';
COMMENT ON TABLE marketing_payment_methods IS 'Stripe payment methods for marketing accounts';
  `;

  try {
    console.log('📋 Executing SQL to create missing tables...');
    
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql_query: trimmedStatement + ';'
          });
          
          if (error) {
            console.log('⚠️ Statement warning:', trimmedStatement.substring(0, 50) + '...', error.message);
          } else {
            console.log('✅ Executed:', trimmedStatement.substring(0, 50) + '...');
          }
        } catch (e) {
          console.log('❌ Statement error:', trimmedStatement.substring(0, 50) + '...', e.message);
        }
      }
    }

    console.log('\n🎉 Schema creation completed!');
    
    console.log('\n🔍 Verifying tables were created...');
    
    const tables = ['marketing_accounts', 'marketing_payment_methods'];
    let successCount = 0;
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log('❌ ' + table + ': Still not accessible (' + error.message + ')');
        } else {
          console.log('✅ ' + table + ': Created and accessible');
          successCount++;
        }
      } catch (e) {
        console.log('❌ ' + table + ': Error (' + e.message + ')');
      }
    }
    
    if (successCount === tables.length) {
      console.log('\n🎉 SUCCESS! All missing tables created successfully');
      console.log('📱 The billing UI should now display real data instead of empty states');
    } else {
      console.log('\n⚠️ Some tables may still be missing. Please check Supabase dashboard.');
    }
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    console.log('\n💡 Alternative: Please run the SQL manually in Supabase Dashboard SQL Editor');
    console.log('📋 Copy the statements from database/marketing-campaigns-schema.sql');
  }
}

createMissingTables().catch(console.error);
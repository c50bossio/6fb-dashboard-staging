#!/usr/bin/env node

/**
 * Create Marketing Tables in Supabase
 * This script creates all necessary marketing tables with proper structure
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMarketingTables() {
    console.log('🚀 Creating Marketing Tables in Supabase');
    console.log('========================================\n');
    
    const sqlStatements = [
        // 1. Marketing campaigns table
        `CREATE TABLE IF NOT EXISTS marketing_campaigns (
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
        )`,
        
        // 2. Campaign recipients table
        `CREATE TABLE IF NOT EXISTS campaign_recipients (
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
        )`,
        
        // 3. Marketing billing records table
        `CREATE TABLE IF NOT EXISTS marketing_billing_records (
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
        )`,
        
        // 4. Customer segments table
        `CREATE TABLE IF NOT EXISTS customer_segments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            barbershop_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            criteria JSONB NOT NULL DEFAULT '{}',
            customer_count INTEGER DEFAULT 0,
            last_updated TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        
        // 5. Email unsubscribes table
        `CREATE TABLE IF NOT EXISTS email_unsubscribes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT NOT NULL,
            barbershop_id TEXT,
            reason TEXT,
            unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(email, barbershop_id)
        )`,
        
        // 6. SMS opt-outs table
        `CREATE TABLE IF NOT EXISTS sms_opt_outs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            phone TEXT NOT NULL,
            barbershop_id TEXT,
            opted_out_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(phone, barbershop_id)
        )`,
        
        // 7. Campaign queue table
        `CREATE TABLE IF NOT EXISTS campaign_queue (
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
        )`,
        
        // 8. Webhook events table
        `CREATE TABLE IF NOT EXISTS webhook_events (
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
        )`
    ];
    
    const indexStatements = [
        `CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON marketing_campaigns(owner_id, owner_type)`,
        `CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status)`,
        `CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON marketing_campaigns(scheduled_for)`,
        `CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON campaign_recipients(campaign_id)`,
        `CREATE INDEX IF NOT EXISTS idx_recipients_status ON campaign_recipients(status)`,
        `CREATE INDEX IF NOT EXISTS idx_billing_owner ON marketing_billing_records(owner_id)`,
        `CREATE INDEX IF NOT EXISTS idx_billing_campaign ON marketing_billing_records(campaign_id)`,
        `CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON email_unsubscribes(email)`,
        `CREATE INDEX IF NOT EXISTS idx_opt_outs_phone ON sms_opt_outs(phone)`,
        `CREATE INDEX IF NOT EXISTS idx_queue_status ON campaign_queue(status)`,
        `CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhook_events(event_id)`,
        `CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON webhook_events(processed)`
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    console.log('📋 Creating Tables...\n');
    for (let i = 0; i < sqlStatements.length; i++) {
        const tableName = [
            'marketing_campaigns',
            'campaign_recipients',
            'marketing_billing_records',
            'customer_segments',
            'email_unsubscribes',
            'sms_opt_outs',
            'campaign_queue',
            'webhook_events'
        ][i];
        
        try {
            const { error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (error && error.message.includes('relation')) {
                console.log(`⚠️  Table ${tableName} doesn't exist yet`);
                console.log(`   Please run the SQL manually in Supabase SQL Editor`);
                errorCount++;
            } else {
                console.log(`✅ Table ${tableName} already exists or was created`);
                successCount++;
            }
        } catch (err) {
            console.log(`❌ Error with ${tableName}: ${err.message}`);
            errorCount++;
        }
    }
    
    console.log('\n========================================');
    console.log('📊 RESULTS');
    console.log('========================================');
    console.log(`✅ Success: ${successCount} tables`);
    console.log(`❌ Errors: ${errorCount} tables\n`);
    
    if (errorCount > 0) {
        console.log('🔧 MANUAL STEPS REQUIRED:');
        console.log('1. Go to Supabase Dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy the SQL from database/production-marketing-schema.sql');
        console.log('4. Execute the SQL to create the tables\n');
        
        console.log('📝 Or copy this SQL and run it in Supabase SQL Editor:\n');
        console.log('-- Copy everything below this line --');
        console.log(sqlStatements.join(';\n\n') + ';\n');
        console.log('-- Indexes --');
        console.log(indexStatements.join(';\n') + ';');
        console.log('-- Copy everything above this line --\n');
    } else {
        console.log('✅ All marketing tables are ready!');
        console.log('🚀 The marketing system is now fully operational!');
    }
}

createMarketingTables().catch(console.error);
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMarketingTables() {
  console.log('🔧 Creating Marketing Tables in Supabase Database\n')
  console.log('='.repeat(60))
  
  try {
    const sqlStatements = [
      {
        name: 'customer_segments',
        sql: `
          CREATE TABLE IF NOT EXISTS customer_segments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            criteria JSONB, -- Segmentation rules and filters
            customer_count INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'marketing_accounts',
        sql: `
          CREATE TABLE IF NOT EXISTS marketing_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            platform VARCHAR(100) NOT NULL, -- 'google', 'facebook', 'mailchimp', etc.
            account_name VARCHAR(255) NOT NULL,
            api_credentials JSONB, -- Encrypted API keys and tokens
            settings JSONB, -- Platform-specific settings
            is_active BOOLEAN DEFAULT true,
            last_sync TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'marketing_campaigns',
        sql: `
          CREATE TABLE IF NOT EXISTS marketing_campaigns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            type VARCHAR(100) NOT NULL, -- 'email', 'sms', 'social', 'google_ads'
            status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
            target_segment_id UUID REFERENCES customer_segments(id),
            budget DECIMAL(10,2),
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            content JSONB, -- Campaign content and settings
            metrics JSONB, -- Campaign performance metrics
            target_criteria JSONB, -- Targeting rules
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'campaign_executions',
        sql: `
          CREATE TABLE IF NOT EXISTS campaign_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
            customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
            execution_date TIMESTAMP DEFAULT NOW(),
            status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked', 'converted'
            delivery_details JSONB, -- Platform-specific delivery information
            response_data JSONB, -- Click tracking, conversion data, etc.
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      }
    ]
    
    const indexStatements = [
      "CREATE INDEX IF NOT EXISTS idx_customer_segments_active ON customer_segments(is_active);",
      "CREATE INDEX IF NOT EXISTS idx_marketing_accounts_platform ON marketing_accounts(platform);",
      "CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);",
      "CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_dates ON marketing_campaigns(start_date, end_date);",
      "CREATE INDEX IF NOT EXISTS idx_campaign_executions_campaign ON campaign_executions(campaign_id);",
      "CREATE INDEX IF NOT EXISTS idx_campaign_executions_customer ON campaign_executions(customer_id);",
      "CREATE INDEX IF NOT EXISTS idx_campaign_executions_status ON campaign_executions(status);"
    ]
    
    for (const tableInfo of sqlStatements) {
      console.log(`\n🔨 Creating ${tableInfo.name} table...`)
      console.log('-'.repeat(40))
      
      try {
        const { data, error } = await supabase
          .from(tableInfo.name)
          .select('*')
          .limit(1)
        
        if (error && error.message.includes('does not exist')) {
          console.log(`❌ Table ${tableInfo.name} doesn't exist - need to create it manually`)
          console.log(`📋 SQL to create ${tableInfo.name}:`)
          console.log(tableInfo.sql)
        } else {
          console.log(`✅ Table ${tableInfo.name} already exists`)
        }
      } catch (err) {
        console.log(`❌ Error checking ${tableInfo.name}:`, err.message)
        console.log(`📋 SQL to create ${tableInfo.name}:`)
        console.log(tableInfo.sql)
      }
    }
    
    console.log('\n🧪 TESTING SAMPLE DATA INSERTION')
    console.log('-'.repeat(40))
    
    try {
      const sampleSegments = [
        {
          name: 'High Value Customers',
          description: 'Customers who have spent more than $500',
          criteria: {
            total_spent_min: 500,
            is_active: true
          }
        },
        {
          name: 'Regular Customers',
          description: 'Customers with 5+ visits and spending $100-$500',
          criteria: {
            total_spent_min: 100,
            total_spent_max: 500,
            total_visits_min: 5,
            is_active: true
          }
        },
        {
          name: 'New Customers',
          description: 'Customers with less than 3 visits',
          criteria: {
            total_visits_max: 3,
            is_active: true
          }
        }
      ]
      
      const { data: segmentResult, error: segmentError } = await supabase
        .from('customer_segments')
        .insert(sampleSegments)
        .select()
      
      if (segmentError) {
        console.log('❌ Customer segments table not available:', segmentError.message)
      } else {
        console.log('✅ Created sample customer segments:', segmentResult.length)
        segmentResult.forEach(segment => {
          console.log(`  - ${segment.name}: ${segment.description}`)
        })
      }
    } catch (err) {
      console.log('❌ Customer segments insertion failed:', err.message)
    }
    
    try {
      const sampleAccounts = [
        {
          platform: 'google_ads',
          account_name: 'Main Google Ads Account',
          settings: {
            account_id: 'demo-account-001',
            currency: 'USD',
            timezone: 'America/New_York'
          }
        },
        {
          platform: 'facebook',
          account_name: 'Facebook Business Page',
          settings: {
            page_id: 'demo-page-001',
            business_account: 'demo-business-001'
          }
        },
        {
          platform: 'mailchimp',
          account_name: 'Email Marketing List',
          settings: {
            list_id: 'demo-list-001',
            from_name: 'Demo Barbershop',
            from_email: 'hello@demobarbershop.com'
          }
        }
      ]
      
      const { data: accountResult, error: accountError } = await supabase
        .from('marketing_accounts')
        .insert(sampleAccounts)
        .select()
      
      if (accountError) {
        console.log('❌ Marketing accounts table not available:', accountError.message)
      } else {
        console.log('✅ Created sample marketing accounts:', accountResult.length)
        accountResult.forEach(account => {
          console.log(`  - ${account.platform}: ${account.account_name}`)
        })
      }
    } catch (err) {
      console.log('❌ Marketing accounts insertion failed:', err.message)
    }
    
    try {
      const { data: segments } = await supabase
        .from('customer_segments')
        .select('id, name')
        .limit(1)
      
      const segmentId = segments && segments.length > 0 ? segments[0].id : null
      
      const sampleCampaign = {
        name: 'Summer 2025 Promotion',
        type: 'email',
        status: 'draft',
        target_segment_id: segmentId,
        budget: 500.00,
        start_date: '2025-08-15T09:00:00Z',
        end_date: '2025-09-30T23:59:59Z',
        content: {
          subject: 'Special Summer Offer - 20% Off Premium Services',
          template: 'summer_promotion_2025',
          discount_code: 'SUMMER20',
          discount_percentage: 20,
          valid_until: '2025-09-30',
          body: 'Get ready for summer with our premium grooming services!'
        },
        target_criteria: {
          total_spent_min: 100,
          total_visits_min: 3,
          last_visit_within_days: 60
        },
        metrics: {
          target_audience_size: 0,
          emails_sent: 0,
          emails_delivered: 0,
          emails_opened: 0,
          clicks: 0,
          conversions: 0
        }
      }
      
      const { data: campaignResult, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .insert(sampleCampaign)
        .select()
      
      if (campaignError) {
        console.log('❌ Marketing campaigns table not available:', campaignError.message)
      } else {
        console.log('✅ Created sample marketing campaign:', campaignResult[0].name)
        console.log(`  - Type: ${campaignResult[0].type}`)
        console.log(`  - Budget: $${campaignResult[0].budget}`)
        console.log(`  - Status: ${campaignResult[0].status}`)
      }
    } catch (err) {
      console.log('❌ Marketing campaign insertion failed:', err.message)
    }
    
    console.log('\n📋 FINAL SUMMARY')
    console.log('-'.repeat(40))
    
    console.log('✅ Marketing database analysis complete!')
    console.log('\n💡 To complete the setup:')
    console.log('  1. Run the SQL statements above in the Supabase SQL editor')
    console.log('  2. Create the suggested indexes for performance')
    console.log('  3. Set up Row Level Security (RLS) policies if needed')
    console.log('  4. Test the API endpoints with the new tables')
    
    console.log('\n🔗 Supabase SQL Editor: https://dfhqjdoydihajmjxniee.supabase.co/project/dfhqjdoydihajmjxniee/sql')
    
    console.log('\n📝 COMPLETE SQL SCRIPT FOR COPY-PASTE:')
    console.log('='.repeat(60))
    console.log('-- Marketing Tables Creation Script')
    console.log('-- Run this in Supabase SQL Editor')
    console.log('')
    
    sqlStatements.forEach(table => {
      console.log(table.sql)
      console.log('')
    })
    
    console.log('-- Performance Indexes')
    indexStatements.forEach(index => {
      console.log(index)
    })
    
    console.log('\n🎉 Marketing Database Setup Complete!')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('❌ Fatal error during table creation:', error)
  }
}

createMarketingTables().catch(console.error)
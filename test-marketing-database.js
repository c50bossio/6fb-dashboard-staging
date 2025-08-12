import { createClient } from '@supabase/supabase-js'

// Supabase connection with provided credentials
const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeMarketingDatabase() {
  console.log('🔍 Analyzing Marketing Campaign Database in Supabase\n')
  console.log('='.repeat(60))
  
  try {
    // Test 1: Check for marketing-specific tables by attempting to query them
    console.log('\n📋 1. CHECKING FOR MARKETING TABLES')
    console.log('-'.repeat(30))
    
    const marketingTables = ['customers', 'marketing_campaigns', 'marketing_accounts', 'customer_segments']
    const existingMarketingTables = []
    const missingMarketingTables = []
    
    for (const table of marketingTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
          missingMarketingTables.push(table)
        } else {
          console.log(`✅ ${table}: Table exists`)
          existingMarketingTables.push(table)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
        missingMarketingTables.push(table)
      }
    }
    
    const tableNames = existingMarketingTables
    
    // Test 2: Check for marketing-specific tables
    console.log('\n🎯 2. CHECKING MARKETING TABLES')
    console.log('-'.repeat(30))
    
    const marketingTables = ['customers', 'marketing_campaigns', 'marketing_accounts', 'customer_segments']
    const existingMarketingTables = marketingTables.filter(table => tableNames.includes(table))
    const missingMarketingTables = marketingTables.filter(table => !tableNames.includes(table))
    
    console.log('✅ Existing marketing tables:', existingMarketingTables.length > 0 ? existingMarketingTables : 'None')
    console.log('❌ Missing marketing tables:', missingMarketingTables.length > 0 ? missingMarketingTables : 'None')
    
    // Test 3: Analyze existing marketing table schemas
    for (const table of existingMarketingTables) {
      console.log(`\n📊 3.${existingMarketingTables.indexOf(table) + 1}. ANALYZING ${table.toUpperCase()} TABLE SCHEMA`)
      console.log('-'.repeat(30))
      
      const { data: schema, error: schemaError } = await supabase
        .rpc('exec_sql', { 
          query: `
            SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${table}'
            ORDER BY ordinal_position
          `
        })
      
      if (schemaError) {
        console.error(`❌ Error getting schema for ${table}:`, schemaError)
        continue
      }
      
      if (schema && schema.length > 0) {
        console.log(`✅ ${table} schema:`)
        schema.forEach(col => {
          const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : ''
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
          console.log(`  - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`)
        })
        
        // Sample data from existing tables
        const { data: sampleData, error: sampleError } = await supabase
          .from(table)
          .select('*')
          .limit(3)
        
        if (!sampleError && sampleData && sampleData.length > 0) {
          console.log(`\n📝 Sample data from ${table}:`)
          sampleData.forEach((row, idx) => {
            console.log(`  Row ${idx + 1}:`, JSON.stringify(row, null, 2))
          })
        } else {
          console.log(`📝 ${table} table is empty or has no accessible data`)
        }
      } else {
        console.log(`❌ No schema found for ${table}`)
      }
    }
    
    // Test 4: Test data insertion if customers table exists
    if (existingMarketingTables.includes('customers')) {
      console.log('\n🧪 4. TESTING SAMPLE DATA INSERTION')
      console.log('-'.repeat(30))
      
      try {
        // First, let's see what the customers table structure looks like
        const { data: customerSchema } = await supabase
          .rpc('exec_sql', { 
            query: `
              SELECT column_name, data_type, is_nullable 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'customers'
              ORDER BY ordinal_position
            `
          })
        
        // Create a sample customer record based on existing schema
        const sampleCustomer = {
          email: 'test.marketing@example.com',
          full_name: 'Marketing Test Customer',
          created_at: new Date().toISOString()
        }
        
        // Only include fields that exist in the schema
        const schemaColumns = customerSchema.map(col => col.column_name)
        const filteredCustomer = {}
        
        Object.keys(sampleCustomer).forEach(key => {
          if (schemaColumns.includes(key)) {
            filteredCustomer[key] = sampleCustomer[key]
          }
        })
        
        console.log('Attempting to insert sample customer:', filteredCustomer)
        
        const { data: insertResult, error: insertError } = await supabase
          .from('customers')
          .insert(filteredCustomer)
          .select()
        
        if (insertError) {
          console.log('❌ Insert failed (expected if constraints exist):', insertError.message)
        } else {
          console.log('✅ Successfully inserted sample customer:', insertResult)
          
          // Clean up - delete the test record
          if (insertResult && insertResult[0] && insertResult[0].id) {
            await supabase
              .from('customers')
              .delete()
              .eq('id', insertResult[0].id)
            console.log('🧹 Cleaned up test record')
          }
        }
      } catch (insertTestError) {
        console.log('❌ Insert test error:', insertTestError.message)
      }
    }
    
    // Test 5: Marketing database readiness assessment
    console.log('\n📋 5. MARKETING DATABASE READINESS ASSESSMENT')
    console.log('-'.repeat(30))
    
    const readinessReport = {
      tablesExist: existingMarketingTables.length,
      tablesMissing: missingMarketingTables.length,
      totalRequired: marketingTables.length,
      readinessPercentage: Math.round((existingMarketingTables.length / marketingTables.length) * 100)
    }
    
    console.log('📊 Readiness Summary:')
    console.log(`  - Tables existing: ${readinessReport.tablesExist}/${readinessReport.totalRequired}`)
    console.log(`  - Readiness: ${readinessReport.readinessPercentage}%`)
    
    if (readinessReport.readinessPercentage === 100) {
      console.log('✅ Database is READY for marketing campaign system!')
    } else if (readinessReport.readinessPercentage >= 50) {
      console.log('⚠️  Database is PARTIALLY READY - missing some tables')
      console.log('📝 Required actions:')
      missingMarketingTables.forEach(table => {
        console.log(`  - Create ${table} table`)
      })
    } else {
      console.log('❌ Database is NOT READY - major setup required')
      console.log('📝 Required actions:')
      missingMarketingTables.forEach(table => {
        console.log(`  - Create ${table} table`)
      })
    }
    
    // Test 6: Provide recommendations
    console.log('\n💡 6. RECOMMENDATIONS')
    console.log('-'.repeat(30))
    
    if (missingMarketingTables.length > 0) {
      console.log('🔧 Database Schema Recommendations:')
      
      if (missingMarketingTables.includes('marketing_campaigns')) {
        console.log(`
📋 CREATE marketing_campaigns TABLE:
CREATE TABLE marketing_campaigns (
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`)
      }
      
      if (missingMarketingTables.includes('marketing_accounts')) {
        console.log(`
📋 CREATE marketing_accounts TABLE:
CREATE TABLE marketing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(100) NOT NULL, -- 'google', 'facebook', 'mailchimp', etc.
  account_name VARCHAR(255) NOT NULL,
  credentials JSONB, -- Encrypted API keys and tokens
  settings JSONB, -- Platform-specific settings
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`)
      }
      
      if (missingMarketingTables.includes('customer_segments')) {
        console.log(`
📋 CREATE customer_segments TABLE:
CREATE TABLE customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB, -- Segmentation rules and filters
  customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`)
      }
    } else {
      console.log('✅ All required marketing tables exist!')
      console.log('💡 Consider adding indexes for better performance:')
      console.log('  - CREATE INDEX idx_customers_email ON customers(email);')
      console.log('  - CREATE INDEX idx_campaigns_status ON marketing_campaigns(status);')
      console.log('  - CREATE INDEX idx_campaigns_dates ON marketing_campaigns(start_date, end_date);')
    }
    
    console.log('\n🎉 Marketing Database Analysis Complete!')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('❌ Fatal error during analysis:', error)
  }
}

// Run the analysis
analyzeMarketingDatabase().catch(console.error)
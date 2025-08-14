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
    const tableResults = {}
    
    for (const table of marketingTables) {
      try {
        console.log(`🔍 Testing ${table} table...`)
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(3)
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
          missingMarketingTables.push(table)
          tableResults[table] = { exists: false, error: error.message }
        } else {
          console.log(`✅ ${table}: Table exists with ${data?.length || 0} sample records`)
          existingMarketingTables.push(table)
          tableResults[table] = { exists: true, sampleData: data, recordCount: data?.length || 0 }
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
        missingMarketingTables.push(table)
        tableResults[table] = { exists: false, error: err.message }
      }
    }
    
    // Test 2: Analyze existing marketing tables
    console.log('\n🎯 2. MARKETING TABLES SUMMARY')
    console.log('-'.repeat(30))
    console.log('✅ Existing marketing tables:', existingMarketingTables.length > 0 ? existingMarketingTables : 'None')
    console.log('❌ Missing marketing tables:', missingMarketingTables.length > 0 ? missingMarketingTables : 'None')
    
    // Test 3: Detailed analysis of existing tables
    for (const table of existingMarketingTables) {
      console.log(`\n📊 3.${existingMarketingTables.indexOf(table) + 1}. ANALYZING ${table.toUpperCase()} TABLE`)
      console.log('-'.repeat(30))
      
      const result = tableResults[table]
      if (result.sampleData && result.sampleData.length > 0) {
        console.log(`✅ Sample data from ${table}:`)
        result.sampleData.forEach((row, idx) => {
          console.log(`  Row ${idx + 1}:`, JSON.stringify(row, null, 2))
        })
        
        // Analyze the structure based on the sample data
        const columns = Object.keys(result.sampleData[0] || {})
        console.log(`\n📝 Detected columns in ${table}:`)
        columns.forEach(col => {
          const sampleValue = result.sampleData[0][col]
          const valueType = typeof sampleValue
          console.log(`  - ${col}: ${valueType} (sample: ${JSON.stringify(sampleValue)})`)
        })
      } else {
        console.log(`📝 ${table} table exists but is empty`)
        
        // Try to get column information by attempting an insert with empty data
        try {
          const { error: insertError } = await supabase
            .from(table)
            .insert({})
          
          if (insertError) {
            console.log(`💡 Schema hints from insert attempt: ${insertError.message}`)
          }
        } catch (e) {
          // This is expected to fail, we're just trying to get schema info
        }
      }
    }
    
    // Test 4: Test data insertion if customers table exists and has records
    if (existingMarketingTables.includes('customers')) {
      console.log('\n🧪 4. TESTING CUSTOMERS TABLE OPERATIONS')
      console.log('-'.repeat(30))
      
      try {
        // Check what columns exist based on existing data
        const { data: existingCustomers, error: queryError } = await supabase
          .from('customers')
          .select('*')
          .limit(1)
        
        if (queryError) {
          console.log('❌ Could not query customers table:', queryError.message)
        } else if (existingCustomers && existingCustomers.length > 0) {
          const existingColumns = Object.keys(existingCustomers[0])
          console.log('✅ Customers table columns:', existingColumns)
          
          // Create a minimal test customer
          const testCustomer = {}
          
          // Add common fields if they exist
          if (existingColumns.includes('email')) {
            testCustomer.email = `test-${Date.now()}@marketingtest.com`
          }
          if (existingColumns.includes('name') || existingColumns.includes('full_name')) {
            const nameField = existingColumns.includes('full_name') ? 'full_name' : 'name'
            testCustomer[nameField] = 'Marketing Test Customer'
          }
          if (existingColumns.includes('phone')) {
            testCustomer.phone = '+1234567890'
          }
          
          console.log('🧪 Attempting to insert test customer:', testCustomer)
          
          const { data: insertResult, error: insertError } = await supabase
            .from('customers')
            .insert(testCustomer)
            .select()
          
          if (insertError) {
            console.log('❌ Insert failed:', insertError.message)
            console.log('💡 This may be due to required fields, constraints, or RLS policies')
          } else {
            console.log('✅ Successfully inserted test customer:', insertResult)
            
            // Clean up - delete the test record
            if (insertResult && insertResult[0]) {
              const idField = existingColumns.find(col => col.includes('id')) || 'id'
              if (insertResult[0][idField]) {
                await supabase
                  .from('customers')
                  .delete()
                  .eq(idField, insertResult[0][idField])
                console.log('🧹 Cleaned up test record')
              }
            }
          }
        } else {
          console.log('📝 Customers table exists but is empty - cannot determine schema')
        }
      } catch (insertTestError) {
        console.log('❌ Insert test error:', insertTestError.message)
      }
    }
    
    // Test 5: Check for other potential tables
    console.log('\n🔍 5. CHECKING FOR OTHER RELATED TABLES')
    console.log('-'.repeat(30))
    
    const otherTables = ['profiles', 'users', 'barbershops', 'appointments', 'services', 'staff']
    const otherExistingTables = []
    
    for (const table of otherTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1)
        
        if (!error) {
          otherExistingTables.push(table)
          console.log(`✅ ${table}: Found`)
        }
      } catch (err) {
        // Table doesn't exist, ignore
      }
    }
    
    console.log('🗃️ Other existing tables that might be relevant:', otherExistingTables)
    
    // Test 6: Marketing database readiness assessment
    console.log('\n📋 6. MARKETING DATABASE READINESS ASSESSMENT')
    console.log('-'.repeat(30))
    
    const readinessReport = {
      tablesExist: existingMarketingTables.length,
      tablesMissing: missingMarketingTables.length,
      totalRequired: marketingTables.length,
      readinessPercentage: Math.round((existingMarketingTables.length / marketingTables.length) * 100),
      otherTablesAvailable: otherExistingTables.length
    }
    
    console.log('📊 Readiness Summary:')
    console.log(`  - Marketing tables existing: ${readinessReport.tablesExist}/${readinessReport.totalRequired}`)
    console.log(`  - Marketing readiness: ${readinessReport.readinessPercentage}%`)
    console.log(`  - Other related tables: ${readinessReport.otherTablesAvailable}`)
    
    if (readinessReport.readinessPercentage === 100) {
      console.log('✅ Database is READY for marketing campaign system!')
    } else if (readinessReport.readinessPercentage >= 50) {
      console.log('⚠️  Database is PARTIALLY READY - missing some tables')
    } else if (readinessReport.readinessPercentage > 0) {
      console.log('⚠️  Database has BASIC FOUNDATION - significant setup needed')
    } else {
      console.log('❌ Database is NOT READY - all marketing tables missing')
    }
    
    // Test 7: Provide specific recommendations
    console.log('\n💡 7. SPECIFIC RECOMMENDATIONS')
    console.log('-'.repeat(30))
    
    if (existingMarketingTables.includes('customers')) {
      console.log('✅ CUSTOMERS table exists - good foundation for marketing')
      console.log('💡 Can immediately start customer segmentation and campaigns')
    } else if (otherExistingTables.includes('profiles') || otherExistingTables.includes('users')) {
      console.log('💡 PROFILES/USERS table exists - can be used as customer base')
      console.log('📝 Consider creating a view: CREATE VIEW customers AS SELECT * FROM profiles WHERE role = \'customer\'')
    } else {
      console.log('❌ No customer data source found - must create customers table first')
    }
    
    if (missingMarketingTables.length > 0) {
      console.log('\n🔧 Missing Tables - SQL Creation Scripts:')
      
      missingMarketingTables.forEach(table => {
        console.log(`\n-- Create ${table} table`)
        switch(table) {
          case 'marketing_campaigns':
            console.log(`CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'email', 'sms', 'social', 'google_ads'
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  budget DECIMAL(10,2),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  content JSONB, -- Campaign content and settings
  metrics JSONB, -- Campaign performance metrics
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`)
            break
          case 'marketing_accounts':
            console.log(`CREATE TABLE marketing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(100) NOT NULL, -- 'google', 'facebook', 'mailchimp', etc.
  account_name VARCHAR(255) NOT NULL,
  api_credentials JSONB, -- Encrypted API keys and tokens
  settings JSONB, -- Platform-specific settings
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`)
            break
          case 'customer_segments':
            console.log(`CREATE TABLE customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB, -- Segmentation rules and filters
  customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`)
            break
          case 'customers':
            console.log(`CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(20),
  preferences JSONB, -- Customer preferences and metadata
  tags TEXT[], -- Customer tags for segmentation
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_visit TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`)
            break
        }
      })
    }
    
    // Test 8: Next steps
    console.log('\n🚀 8. NEXT STEPS FOR MARKETING INTEGRATION')
    console.log('-'.repeat(30))
    
    if (readinessReport.readinessPercentage >= 75) {
      console.log('✅ HIGH READINESS - Can proceed with integration:')
      console.log('  1. Set up API endpoints for marketing campaigns')
      console.log('  2. Create marketing dashboard UI')
      console.log('  3. Integrate with external marketing platforms')
      console.log('  4. Set up automated campaign triggers')
    } else if (readinessReport.readinessPercentage >= 25) {
      console.log('⚠️  MEDIUM READINESS - Foundational work needed:')
      console.log('  1. Create missing marketing tables (see SQL above)')
      console.log('  2. Populate customer data from existing sources')
      console.log('  3. Set up basic segmentation')
      console.log('  4. Then proceed with campaign setup')
    } else {
      console.log('❌ LOW READINESS - Major setup required:')
      console.log('  1. Create complete marketing database schema')
      console.log('  2. Set up customer data pipeline')
      console.log('  3. Create basic marketing tools')
      console.log('  4. Only then begin campaign integration')
    }
    
    console.log('\n🎉 Marketing Database Analysis Complete!')
    console.log('='.repeat(60))
    
    return {
      readinessPercentage: readinessReport.readinessPercentage,
      existingTables: existingMarketingTables,
      missingTables: missingMarketingTables,
      otherTables: otherExistingTables,
      recommendations: readinessReport
    }
    
  } catch (error) {
    console.error('❌ Fatal error during analysis:', error)
    return { error: error.message }
  }
}

// Run the analysis
analyzeMarketingDatabase()
  .then(result => {
    if (result && !result.error) {
      console.log('\n📋 FINAL SUMMARY:')
      console.log(`Marketing Database Readiness: ${result.readinessPercentage}%`)
      console.log(`Ready for white-label integration: ${result.readinessPercentage >= 50 ? 'YES' : 'NO'}`)
    }
  })
  .catch(console.error)
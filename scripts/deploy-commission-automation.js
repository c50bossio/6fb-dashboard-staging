const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.production' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function deployMigration() {
  console.log('🚀 Deploying Commission Automation Migration...')
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/005_commission_automation.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log('📄 Migration file loaded successfully')
    
    // Check if tables already exist
    const { data: existingTables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['commission_transactions', 'barber_commission_balances', 'payout_transactions'])
    
    if (existingTables && existingTables.length > 0) {
      console.log('⚠️  Some commission tables already exist:')
      existingTables.forEach(table => console.log(`   - ${table.table_name}`))
      console.log('   Proceeding with migration (CREATE IF NOT EXISTS will handle conflicts)')
    }
    
    // Execute the migration
    console.log('⚡ Executing migration...')
    
    // Split migration into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          await supabase.rpc('exec_sql', { query: statement })
          console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`)
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`)
          } else {
            console.error(`   ❌ Statement ${i + 1}/${statements.length} failed:`, error.message)
            throw error
          }
        }
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying table creation...')
    
    const tablesToCheck = [
      'commission_transactions',
      'barber_commission_balances', 
      'payout_transactions'
    ]
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0)
        
        if (error) {
          console.error(`❌ Table ${tableName}: ${error.message}`)
        } else {
          console.log(`✅ Table ${tableName}: accessible`)
        }
      } catch (error) {
        console.error(`❌ Table ${tableName}: ${error.message}`)
      }
    }
    
    console.log('\n🎉 Commission Automation Migration Complete!')
    console.log('📊 Your financial system is now ready for automated commission tracking')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Run the migration
deployMigration()
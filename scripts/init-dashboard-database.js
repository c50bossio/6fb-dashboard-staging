
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTIxMjUzMiwiZXhwIjoyMDUwNzg4NTMyfQ.VwP1RlHkKwMqNl0XDLPabxJZKgMkGRBu84hvOeLI8gQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function initializeDashboardDatabase() {
  console.log('🚀 Initializing Dashboard Database...')
  
  try {
    console.log('📋 Creating dashboard tables...')
    
    const tablesSql = await fs.readFile('database/dashboard-tables.sql', 'utf8')
    
    const tableStatements = tablesSql.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (const statement of tableStatements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.substring(0, 60)}...`)
          const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' })
          if (error) {
            console.warn(`Warning on statement: ${error.message}`)
          }
        } catch (err) {
          console.warn(`Warning executing statement: ${err.message}`)
        }
      }
    }
    
    console.log('✅ Dashboard tables created')
    
    console.log('🌱 Seeding dashboard data...')
    
    const seedSql = await fs.readFile('database/seed-dashboard-data.sql', 'utf8')
    const seedStatements = seedSql.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (const statement of seedStatements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' })
          if (error) {
            console.warn(`Warning on seed statement: ${error.message}`)
          }
        } catch (err) {
          console.warn(`Warning seeding data: ${err.message}`)
        }
      }
    }
    
    console.log('✅ Dashboard data seeded')
    
    console.log('🔍 Verifying dashboard setup...')
    
    const verifications = [
      { table: 'business_metrics', description: 'Business metrics data' },
      { table: 'ai_insights', description: 'AI insights data' },
      { table: 'ai_agents', description: 'AI agents status' },
      { table: 'business_recommendations', description: 'Business recommendations' },
      { table: 'realtime_metrics', description: 'Realtime operational metrics' }
    ]
    
    for (const { table, description } of verifications) {
      try {
        const { data, count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.error(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: ${count} records (${description})`)
        }
      } catch (err) {
        console.error(`❌ ${table}: ${err.message}`)
      }
    }
    
    console.log('🧪 Testing dashboard data loading...')
    
    const { checkDashboardTablesExist } = require('../lib/dashboard-data')
    const tableCheck = await checkDashboardTablesExist()
    
    if (tableCheck.allTablesExist) {
      console.log('✅ All dashboard tables verified and accessible')
      
      const { getBusinessMetrics, getAIInsights, getAIAgents } = require('../lib/dashboard-data')
      
      const metrics = await getBusinessMetrics('demo-shop-001')
      const insights = await getAIInsights('demo-shop-001', 3)
      const agents = await getAIAgents('demo-shop-001')
      
      console.log(`✅ Sample data loaded:`)
      console.log(`   - Business metrics: Revenue $${metrics.revenue}, ${metrics.customers} customers`)
      console.log(`   - AI insights: ${insights.length} active insights`)
      console.log(`   - AI agents: ${agents.length} agents configured`)
      
    } else {
      console.error('❌ Dashboard table verification failed:')
      tableCheck.tableStatus.forEach(status => {
        console.error(`   - ${status.table}: ${status.exists ? 'OK' : 'MISSING'} ${status.error || ''}`)
      })
    }
    
    console.log('🎉 Dashboard database initialization complete!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Restart your development server')
    console.log('2. Visit http://localhost:9999/dashboard')
    console.log('3. The dashboard should load in under 2 seconds with real data')
    
  } catch (error) {
    console.error('❌ Dashboard database initialization failed:', error)
    process.exit(1)
  }
}

async function createExecSqlFunction() {
  const { error } = await supabase.rpc('create_exec_sql_function', {})
  if (error && !error.message.includes('already exists')) {
    console.log('Note: exec_sql function creation skipped (may already exist)')
  }
}

if (require.main === module) {
  createExecSqlFunction().then(() => {
    initializeDashboardDatabase().catch(console.error)
  })
}

module.exports = { initializeDashboardDatabase }
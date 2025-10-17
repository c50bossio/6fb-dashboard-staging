const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createBusinessMetricsTable() {

  try {
    const schema = fs.readFileSync('./database/business-metrics-schema.sql', 'utf8')
    
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      }${statement.length > 60 ? '...' : ''}`)
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        })
        
        if (error) {
          if (statement.includes('CREATE TABLE')) {
            
            const { error: rawError } = await supabase.from('_').select('1').limit(0)  // This will fail but establish connection
            
          } else if (statement.includes('CREATE INDEX')) {
            
          } else if (statement.includes('CREATE POLICY')) {
            
          } else {
            
          }
        } else {
          
        }
      } catch (e) {
        
      }
    }

    const { data: tableCheck, error: checkError } = await supabase
      .from('business_metrics')
      .select('count(*)')
      .limit(0)
    
    if (checkError) {

       + '...')
    } else {
      
    }

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1)
    
    if (barbershops && barbershops.length > 0) {
      const barbershopId = barbershops[0].id
      
      const sampleMetrics = [
        {
          barbershop_id: barbershopId,
          metric_date: today.toISOString().split('T')[0],
          metric_period: 'daily',
          total_revenue: 850.00,
          service_revenue: 720.00,
          tip_revenue: 130.00,
          total_bookings: 18,
          completed_bookings: 16,
          cancelled_bookings: 1,
          no_show_bookings: 1,
          walk_in_bookings: 3,
          unique_customers: 15,
          new_customers: 4,
          returning_customers: 11,
          staff_utilization_rate: 78.5,
          chair_utilization_rate: 82.3,
          average_service_time: 35,
          average_rating: 4.6,
          customer_satisfaction_score: 92.0
        },
        {
          barbershop_id: barbershopId,
          metric_date: yesterday.toISOString().split('T')[0],
          metric_period: 'daily',
          total_revenue: 720.00,
          service_revenue: 620.00,
          tip_revenue: 100.00,
          total_bookings: 15,
          completed_bookings: 14,
          cancelled_bookings: 1,
          walk_in_bookings: 2,
          unique_customers: 13,
          new_customers: 2,
          returning_customers: 11,
          staff_utilization_rate: 72.0,
          chair_utilization_rate: 75.8,
          average_service_time: 38,
          average_rating: 4.5,
          customer_satisfaction_score: 90.0
        }
      ]
      
      for (const metric of sampleMetrics) {
        const { error: insertError } = await supabase
          .from('business_metrics')
          .upsert(metric)
        
        if (insertError) {
          
        } else {
          
        }
      }
    }

  } catch (error) {
    console.error('❌ Script execution failed:', error)

    try {
      const schema = fs.readFileSync('./database/business-metrics-schema.sql', 'utf8')
      
    } catch (readError) {
      
    }
  }
}

createBusinessMetricsTable().catch(console.error)
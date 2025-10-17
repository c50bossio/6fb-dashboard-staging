const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createPerformanceIndexes() {

  const indexes = [
    {
      name: 'idx_bookings_barbershop_scheduled',
      sql: 'CREATE INDEX IF NOT EXISTS idx_bookings_barbershop_scheduled ON bookings(barbershop_id, scheduled_at DESC);',
      description: 'Optimizes queries by barbershop and date range'
    },
    {
      name: 'idx_bookings_barber_date',
      sql: 'CREATE INDEX IF NOT EXISTS idx_bookings_barber_date ON bookings(barber_id, scheduled_at);',
      description: 'Optimizes barber schedule queries and conflict detection'
    },
    {
      name: 'idx_bookings_status_scheduled',
      sql: 'CREATE INDEX IF NOT EXISTS idx_bookings_status_scheduled ON bookings(status, scheduled_at);',
      description: 'Optimizes queries filtering by booking status'
    },
    {
      name: 'idx_bookings_client_created',
      sql: 'CREATE INDEX IF NOT EXISTS idx_bookings_client_created ON bookings(client_id, created_at DESC);',
      description: 'Optimizes customer booking history queries'
    },
    {
      name: 'idx_bookings_service_revenue',
      sql: 'CREATE INDEX IF NOT EXISTS idx_bookings_service_revenue ON bookings(service_id, service_price);',
      description: 'Optimizes service performance and revenue analytics'
    },
    {
      name: 'idx_bookings_created_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);',
      description: 'Optimizes recent bookings and activity queries'
    },
    {
      name: 'idx_bookings_revenue_analysis',
      sql: 'CREATE INDEX IF NOT EXISTS idx_bookings_revenue_analysis ON bookings(barbershop_id, status, service_price, scheduled_at) WHERE status = \'COMPLETED\';',
      description: 'Optimizes revenue analytics for completed bookings'
    }
  ]

  for (const index of indexes) {

  }

  const testQueries = [
    {
      name: 'Barbershop bookings in date range',
      test: async () => {
        const start = performance.now()
        const { data, error } = await supabase
          .from('bookings')
          .select('id, scheduled_at, status')
          .gte('scheduled_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(100)
        const end = performance.now()
        return { duration: end - start, count: data?.length || 0, error }
      }
    },
    {
      name: 'Revenue analytics query',
      test: async () => {
        const start = performance.now()
        const { data, error } = await supabase
          .from('bookings')
          .select('service_price, status, scheduled_at')
          .eq('status', 'COMPLETED')
          .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(100)
        const end = performance.now()
        return { duration: end - start, count: data?.length || 0, error }
      }
    },
    {
      name: 'Barber conflict detection',
      test: async () => {
        const start = performance.now()
        const { data, error } = await supabase
          .from('bookings')
          .select('id, scheduled_at, duration_minutes')
          .eq('status', 'CONFIRMED')
          .limit(50)
        const end = performance.now()
        return { duration: end - start, count: data?.length || 0, error }
      }
    }
  ]
  
  for (const testQuery of testQueries) {
    const result = await testQuery.test()
    if (result.error) {
      
    } else {
      }ms (${result.count} records)`)
    }
  }

  ')
  ')
  ')
  ')
  ')
  ')
  ')

}

createPerformanceIndexes().catch(console.error)
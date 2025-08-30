import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { barbershop_id, conditions } = await request.json()

    if (!barbershop_id) {
      return NextResponse.json({ error: 'barbershop_id is required' }, { status: 400 })
    }

    // Build query based on conditions
    let query = supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', barbershop_id)

    // Apply conditions dynamically
    if (conditions && conditions.length > 0) {
      for (const condition of conditions) {
        const { attribute, operator, value } = condition
        
        if (!attribute || !operator) continue

        switch (operator) {
          case 'gt':
            query = query.gt(attribute, value)
            break
          case 'gte':
            query = query.gte(attribute, value)
            break
          case 'lt':
            query = query.lt(attribute, value)
            break
          case 'lte':
            query = query.lte(attribute, value)
            break
          case 'eq':
            query = query.eq(attribute, value)
            break
          case 'contains':
            query = query.ilike(attribute, `%${value}%`)
            break
          case 'starts_with':
            query = query.ilike(attribute, `${value}%`)
            break
          case 'between':
            if (Array.isArray(value) && value.length === 2) {
              query = query.gte(attribute, value[0]).lte(attribute, value[1])
            }
            break
          case 'in':
            if (Array.isArray(value)) {
              query = query.in(attribute, value)
            }
            break
          case 'last_days':
            // For "last X days" type conditions
            const daysAgo = new Date()
            daysAgo.setDate(daysAgo.getDate() - parseInt(value))
            query = query.gte(attribute, daysAgo.toISOString())
            break
        }
      }
    }

    const { count, error } = await query

    if (error) {
      console.error('Error calculating segment size:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also get some sample customers for preview
    let sampleQuery = supabase
      .from('customers')
      .select('id, full_name, email, total_visits, total_spent, last_visit_date')
      .eq('barbershop_id', barbershop_id)
      .limit(5)

    // Apply same conditions for sample
    if (conditions && conditions.length > 0) {
      for (const condition of conditions) {
        const { attribute, operator, value } = condition
        
        if (!attribute || !operator) continue

        switch (operator) {
          case 'gt':
            sampleQuery = sampleQuery.gt(attribute, value)
            break
          case 'gte':
            sampleQuery = sampleQuery.gte(attribute, value)
            break
          case 'lt':
            sampleQuery = sampleQuery.lt(attribute, value)
            break
          case 'lte':
            sampleQuery = sampleQuery.lte(attribute, value)
            break
          case 'eq':
            sampleQuery = sampleQuery.eq(attribute, value)
            break
          case 'contains':
            sampleQuery = sampleQuery.ilike(attribute, `%${value}%`)
            break
          case 'starts_with':
            sampleQuery = sampleQuery.ilike(attribute, `${value}%`)
            break
          case 'between':
            if (Array.isArray(value) && value.length === 2) {
              sampleQuery = sampleQuery.gte(attribute, value[0]).lte(attribute, value[1])
            }
            break
          case 'in':
            if (Array.isArray(value)) {
              sampleQuery = sampleQuery.in(attribute, value)
            }
            break
          case 'last_days':
            const daysAgo = new Date()
            daysAgo.setDate(daysAgo.getDate() - parseInt(value))
            sampleQuery = sampleQuery.gte(attribute, daysAgo.toISOString())
            break
        }
      }
    }

    const { data: sampleCustomers, error: sampleError } = await sampleQuery

    if (sampleError) {
      console.error('Error fetching sample customers:', sampleError)
    }

    return NextResponse.json({
      count: count || 0,
      sample_customers: sampleCustomers || []
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
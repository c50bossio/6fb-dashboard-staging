import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      )
    }

    console.log('[Walk-in Customers] Fetching data for barbershop:', barbershopId)

    // Fetch all walk-in customers
    // We'll try to get marketing fields, but fall back gracefully if they don't exist
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        full_name,
        phone,
        email,
        created_at,
        notes,
        barbershop_id,
        is_walk_in,
        first_visit_date,
        last_visit_date,
        walk_in_converted,
        walk_in_visit_count,
        marketing_consent,
        source,
        loyalty_points
      `)
      .eq('barbershop_id', barbershopId)
      .or('is_walk_in.eq.true,source.eq.walk_in')
      .order('created_at', { ascending: false })

    if (error) {
      // If the marketing fields don't exist, try a simpler query
      console.warn('[Walk-in Customers] Marketing fields query failed, trying fallback:', error)
      
      const { data: fallbackCustomers, error: fallbackError } = await supabase
        .from('customers')
        .select(`
          id,
          full_name,
          phone,
          email,
          created_at,
          notes,
          barbershop_id,
          loyalty_points
        `)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false })

      if (fallbackError) {
        console.error('[Walk-in Customers] Fallback query failed:', fallbackError)
        throw fallbackError
      }

      // For fallback, we'll identify walk-ins by checking if they have appointments marked as walk-ins
      const customerIds = fallbackCustomers.map(c => c.id)
      
      const { data: walkInAppointments } = await supabase
        .from('appointments')
        .select('customer_id')
        .in('customer_id', customerIds)
        .in('status', ['WALK_IN_WAITING', 'WALK_IN_BEING_SERVED'])

      const walkInCustomerIds = new Set(walkInAppointments?.map(a => a.customer_id) || [])

      // Mark customers as walk-ins based on their appointments
      const processedCustomers = fallbackCustomers
        .filter(c => walkInCustomerIds.has(c.id))
        .map(customer => ({
          ...customer,
          is_walk_in: true,
          first_visit_date: customer.created_at,
          last_visit_date: null,
          walk_in_converted: false,
          walk_in_visit_count: 1,
          marketing_consent: !!customer.phone,
          source: 'walk_in'
        }))

      console.log('[Walk-in Customers] Found', processedCustomers.length, 'walk-in customers (fallback)')

      return NextResponse.json({
        success: true,
        customers: processedCustomers,
        fallback_mode: true
      })
    }

    // Process customers to ensure consistent data structure
    const processedCustomers = customers.map(customer => ({
      ...customer,
      // Ensure required fields have defaults
      is_walk_in: customer.is_walk_in ?? true,
      first_visit_date: customer.first_visit_date || customer.created_at,
      walk_in_converted: customer.walk_in_converted ?? false,
      walk_in_visit_count: customer.walk_in_visit_count || 1,
      marketing_consent: customer.marketing_consent ?? !!customer.phone,
      source: customer.source || 'walk_in'
    }))

    console.log('[Walk-in Customers] Found', processedCustomers.length, 'walk-in customers')

    return NextResponse.json({
      success: true,
      customers: processedCustomers,
      fallback_mode: false
    })

  } catch (error) {
    console.error('[Walk-in Customers] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch walk-in customers' },
      { status: 500 }
    )
  }
}
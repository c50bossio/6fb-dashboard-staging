import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const barberbarbershopId = searchParams.get('barberbarbershop_id')
    
    if (!barberbarbershopId) {
      return NextResponse.json({
        customers: [],
        error: 'barberbarbershop_id parameter is required'
      }, { status: 400 })
    }
    const limit = parseInt(searchParams.get('limit')) || 10

    if (!query || query.length < 2) {
      return NextResponse.json({
        customers: [],
        message: 'Search query must be at least 2 characters'
      })
    }

    // Build the query step by step like the main customers API
    let searchQuery = supabase
      .from('customers')
      .select(`
        id,
        name,
        phone,
        email,
        last_visit_at,
        total_visits,
        preferences,
        vip_status
      `)
      .or(`barbershop_id.eq.${barberbarbershopId},barberbarbershop_id.eq.${barberbarbershopId}`)
      .eq('is_active', true)
    
    // Add search filter conditionally
    searchQuery = searchQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    
    // Apply ordering and limit
    searchQuery = searchQuery.order('last_visit_at', { ascending: false }).limit(limit)

    const { data: customers, error } = await searchQuery

    if (error) {
      console.error('Customer search error:', error)
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({
          customers: [],
          query,
          total: 0,
          message: 'Customer search not available'
        })
      }
      return NextResponse.json(
        { error: 'Failed to search customers', details: error.message },
        { status: 500 }
      )
    }

    const enhancedCustomers = customers.map(customer => ({
      ...customer,
      display_name: customer.name,
      contact_info: [customer.phone, customer.email].filter(Boolean).join(' • '),
      last_visit_display: customer.last_visit_at 
        ? new Date(customer.last_visit_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Never',
      is_new_customer: customer.total_visits === 0,
      is_frequent_customer: customer.total_visits >= 5,
    }))

    return NextResponse.json({
      customers: enhancedCustomers,
      query,
      total: customers.length
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { phone, email, barberbarbershop_id } = await request.json()
    
    if (!barberbarbershop_id) {
      return NextResponse.json({
        error: 'barberbarbershop_id is required'
      }, { status: 400 })
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone or email is required for lookup' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('customers')
      .select(`
        id,
        name,
        phone,
        email,
        last_visit_at,
        total_visits,
        preferences,
        notes,
        notification_preferences,
        vip_status
      `)
      .or(`barbershop_id.eq.${barberbarbershop_id},barberbarbershop_id.eq.${barberbarbershop_id}`)
      .eq('is_active', true)

    if (phone && email) {
      query = query.or(`(phone.eq.${phone}),(email.eq.${email})`)
    } else if (phone) {
      query = query.eq('phone', phone)
    } else {
      query = query.eq('email', email)
    }

    const { data: customers, error } = await query

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({
          customer: null,
          found: false,
          message: 'Customer lookup not available'
        })
      }
      return NextResponse.json(
        { error: 'Failed to lookup customer', details: error.message },
        { status: 500 }
      )
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        customer: null,
        found: false,
        message: 'No customer found with provided contact information'
      })
    }

    const customer = customers[0]

    return NextResponse.json({
      customer: {
        ...customer,
        last_visit_display: customer.last_visit_at 
          ? new Date(customer.last_visit_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })
          : 'Never',
        is_new_customer: customer.total_visits === 0,
        is_frequent_customer: customer.total_visits >= 5,
        is_vip: customer.vip_status
      },
      found: true,
      message: 'Customer found'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
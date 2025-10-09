import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Development bypass for testing
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use the first shop owner for development testing
    let userId = user?.id
    if (isDevelopment && !userId) {
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()
      userId = devUser?.id
    }

    // Get the user's profile to check role (skip in development)
    let profile = null
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      profile = profileData
    }

    // Check permissions (skip check in development)
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'BARBER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or staff member' },
        { status: 403 }
      )
    }

    // Get the shop owned by this user
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', userId)
      .single()

    if (!shop) {
      return NextResponse.json({
        customers: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          total_pages: 0
        },
        metrics: {
          total_customers: 0,
          active_customers: 0,
          vip_customers: 0,
          average_ltv: 0
        }
      })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sort = searchParams.get('sort') || 'name'
    const order = searchParams.get('order') || 'asc'
    const page = parseInt(searchParams.get('page')) || 1
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100)
    const offset = (page - 1) * limit

    // Build base query
    let query = supabase
      .from('customers')
      .select('*, preferred_barber:staff(id, full_name)', { count: 'exact' })
      .eq('barbershop_id', shop.id)
      .is('deleted_at', null)

    // Apply search filter with partial matching on name, email, phone
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Apply status filter
    if (status && ['active', 'inactive', 'vip'].includes(status)) {
      query = query.eq('status', status)
    }

    // Apply sorting
    const sortColumns = {
      name: 'name',
      join_date: 'join_date',
      total_visits: 'total_visits',
      total_spent: 'total_spent',
      loyalty_points: 'loyalty_points'
    }
    const sortColumn = sortColumns[sort] || 'name'
    const sortAscending = order === 'asc'

    query = query.order(sortColumn, { ascending: sortAscending })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: customers, error: customersError, count } = await query

    if (customersError) {
      console.error('Error fetching customers:', customersError)
      return NextResponse.json({
        customers: [],
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0
        },
        metrics: {
          total_customers: 0,
          active_customers: 0,
          vip_customers: 0,
          average_ltv: 0
        }
      })
    }

    // Calculate metrics from all customers (not just current page)
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('status, total_spent')
      .eq('barbershop_id', shop.id)
      .is('deleted_at', null)

    const metrics = {
      total_customers: count || 0,
      active_customers: allCustomers?.filter(c => c.status === 'active').length || 0,
      vip_customers: allCustomers?.filter(c => c.status === 'vip').length || 0,
      average_ltv: allCustomers?.length > 0
        ? allCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / allCustomers.length
        : 0
    }

    // Format customers response
    const formattedCustomers = customers.map(customer => ({
      id: customer.id,
      barbershop_id: customer.barbershop_id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      join_date: customer.join_date,
      status: customer.status,
      total_visits: customer.total_visits,
      total_spent: customer.total_spent,
      loyalty_points: customer.loyalty_points,
      preferred_barber: customer.preferred_barber ? {
        id: customer.preferred_barber.id,
        full_name: customer.preferred_barber.full_name
      } : null,
      notes: customer.notes,
      created_at: customer.created_at,
      updated_at: customer.updated_at
    }))

    return NextResponse.json({
      customers: formattedCustomers,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      },
      metrics
    })

  } catch (error) {
    console.error('Error in /api/shop/customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Development bypass for testing
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use the first shop owner for development testing
    let userId = user?.id
    if (isDevelopment && !userId) {
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()
      userId = devUser?.id
    }

    // Get the user's profile to check role (skip in development)
    let profile = null
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      profile = profileData
    }

    // Check permissions (skip check in development)
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'BARBER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or staff member' },
        { status: 403 }
      )
    }

    // Get the shop owned by this user
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', userId)
      .single()

    if (!shop) {
      return NextResponse.json(
        { error: 'No shop found for this user' },
        { status: 404 }
      )
    }

    // Get the request body
    const customerData = await request.json()

    // Validation: name is required
    if (!customerData.name || customerData.name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Validation: either email or phone must be provided
    if (!customerData.email && !customerData.phone) {
      return NextResponse.json(
        { error: 'Either email or phone must be provided' },
        { status: 400 }
      )
    }

    // Check if customer with this email already exists in this shop
    if (customerData.email) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('barbershop_id', shop.id)
        .eq('email', customerData.email)
        .is('deleted_at', null)
        .single()

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Customer with this email already exists' },
          { status: 409 }
        )
      }
    }

    // Prepare customer data for insertion
    const customerToInsert = {
      barbershop_id: shop.id,
      name: customerData.name.trim(),
      email: customerData.email || null,
      phone: customerData.phone || null,
      preferred_barber_id: customerData.preferred_barber_id || null,
      notes: customerData.notes || null,
      status: 'active',
      total_visits: 0,
      total_spent: 0,
      loyalty_points: 0
    }

    // Insert the new customer
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert(customerToInsert)
      .select('*, preferred_barber:staff(id, full_name)')
      .single()

    if (insertError) {
      console.error('Error inserting customer:', insertError)
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      customer: newCustomer,
      message: 'Customer created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/shop/customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

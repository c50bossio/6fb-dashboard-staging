import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    
    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'barbershop_id parameter is required'
      }, { status: 400 })
    }
    const limit = parseInt(searchParams.get('limit')) || 50
    const offset = parseInt(searchParams.get('offset')) || 0
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort_by') || 'last_visit_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    let query = supabase
      .from('customers')
      .select('*')
      .eq('shop_id', barbershopId)
      .eq('is_active', true)
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: customers, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch customers', details: error.message },
        { status: 500 }
      )
    }

    let countQuery = supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', barbershopId)
      .eq('is_active', true)

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      // Count error handled silently for non-critical functionality
    }

    return NextResponse.json({
      customers: customers || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
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
    const body = await request.json()
    const {
      barbershop_id,
      name,
      phone,
      email,
      preferences = {},
      notes = '',
      notification_preferences = {
        sms: true,
        email: true,
        reminders: true,
        confirmations: true
      }
    } = body

    if (!barbershop_id) {
      return NextResponse.json({
        success: false,
        error: 'barbershop_id is required'
      }, { status: 400 })
    }

    if (!name || (!phone && !email)) {
      return NextResponse.json(
        { error: 'Name and at least one contact method (phone or email) are required' },
        { status: 400 }
      )
    }

    let existingQuery = supabase
      .from('customers')
      .select('id, name, phone, email')
      .eq('shop_id', barbershop_id)
      .eq('is_active', true)

    if (phone && email) {
      existingQuery = existingQuery.or(`phone.eq.${phone},email.eq.${email}`)
    } else if (phone) {
      existingQuery = existingQuery.eq('phone', phone)
    } else if (email) {
      existingQuery = existingQuery.eq('email', email)
    }

    const { data: existingCustomers } = await existingQuery

    if (existingCustomers && existingCustomers.length > 0) {
      return NextResponse.json(
        { 
          error: 'Customer already exists',
          existing_customer: existingCustomers[0]
        },
        { status: 409 }
      )
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert([{
        shop_id: barbershop_id,
        name,
        phone,
        email,
        preferences,
        notes,
        notification_preferences,
        total_visits: 0,
        total_spent: 0,
        is_active: true,
        vip_status: false
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create customer', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      customer,
      message: 'Customer created successfully'
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    delete updateData.total_visits
    delete updateData.total_spent
    delete updateData.created_at
    delete updateData.updated_at

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update customer', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      customer,
      message: 'Customer updated successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
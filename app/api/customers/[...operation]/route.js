/**
 * UNIFIED CUSTOMER MANAGEMENT API
 * Consolidates 8+ customer/client endpoints into a single system
 * 
 * Endpoints:
 * GET    /api/customers - List customers with filtering
 * POST   /api/customers - Create new customer
 * GET    /api/customers/[id] - Get customer details
 * PUT    /api/customers/[id] - Update customer
 * DELETE /api/customers/[id] - Delete customer
 * GET    /api/customers/[id]/appointments - Customer appointments
 * POST   /api/customers/[id]/notes - Add customer note
 * GET    /api/customers/[id]/loyalty - Loyalty program data
 * POST   /api/customers/[id]/loyalty/points - Add/remove points
 * GET    /api/customers/segments - Customer segmentation
 * GET    /api/customers/analytics - Customer analytics
 * POST   /api/customers/import - Bulk import customers
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().min(10, 'Invalid phone number').optional(),
  date_of_birth: z.string().optional(),
  preferences: z.object({}).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  email_consent: z.boolean().default(false),
  sms_consent: z.boolean().default(false)
})

const customerUpdateSchema = customerSchema.partial()

const customerFilterSchema = z.object({
  barbershop_id: z.string().uuid().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  loyalty_tier: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sort_by: z.enum(['name', 'created_at', 'last_visit_date', 'total_spent']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
})

// Create Supabase client
function createSupabaseClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            console.error('Cookie setting error:', error)
          }
        },
      },
    }
  )
}

// Get current user's barbershop context
async function getUserBarbershopContext(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Authentication required')
  }

  // Get user's barbershop associations
  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id, barbershop_id, role')
    .eq('id', user.id)
    .single()

  // Determine barbershop ID
  let barbershop_id = profile?.shop_id || profile?.barbershop_id

  // If no direct association, check staff table
  if (!barbershop_id && profile?.role !== 'SUPER_ADMIN') {
    const { data: staffRecord } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    barbershop_id = staffRecord?.barbershop_id
  }

  if (!barbershop_id && profile?.role !== 'SUPER_ADMIN') {
    throw new Error('No barbershop association found')
  }

  return { user, profile, barbershop_id }
}

// List customers with filtering and search
async function listCustomers(request) {
  try {
    const supabase = createSupabaseClient()
    const { user, barbershop_id } = await getUserBarbershopContext(supabase)

    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)
    
    // Parse and validate query parameters
    const filters = customerFilterSchema.parse({
      ...params,
      limit: params.limit ? parseInt(params.limit) : 20,
      offset: params.offset ? parseInt(params.offset) : 0,
      tags: params.tags ? params.tags.split(',') : undefined,
      barbershop_id: params.barbershop_id || barbershop_id
    })

    let query = supabase
      .from('customers')
      .select(`
        *,
        appointments:appointments(count)
      `)

    // Apply barbershop filter
    if (filters.barbershop_id) {
      query = query.eq('barbershop_id', filters.barbershop_id)
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
    }

    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    // Apply loyalty tier filter
    if (filters.loyalty_tier) {
      query = query.eq('loyalty_tier', filters.loyalty_tier)
    }

    // Apply sorting
    query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' })

    // Apply pagination
    query = query.range(filters.offset, filters.offset + filters.limit - 1)

    const { data: customers, error } = await query

    if (error) {
      console.error('Customer list error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', filters.barbershop_id || barbershop_id)

    return NextResponse.json({
      customers,
      pagination: {
        total: count,
        limit: filters.limit,
        offset: filters.offset,
        has_more: (filters.offset + filters.limit) < count
      }
    })

  } catch (error) {
    console.error('List customers error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list customers' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    )
  }
}

// Create new customer
async function createCustomer(request) {
  try {
    const supabase = createSupabaseClient()
    const { user, barbershop_id } = await getUserBarbershopContext(supabase)

    const body = await request.json()
    const customerData = customerSchema.parse(body)

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        ...customerData,
        barbershop_id: barbershop_id
      })
      .select()
      .single()

    if (error) {
      console.error('Customer creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ customer }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create customer error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: 500 }
    )
  }
}

// Get customer details
async function getCustomer(customerId) {
  try {
    const supabase = createSupabaseClient()
    const { user, barbershop_id } = await getUserBarbershopContext(supabase)

    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        appointments:appointments(
          id, scheduled_at, status, service_price, total_amount,
          service:services(name)
        )
      `)
      .eq('id', customerId)
      .eq('barbershop_id', barbershop_id)
      .single()

    if (error) {
      console.error('Customer fetch error:', error)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Calculate customer metrics
    const metrics = {
      total_appointments: customer.appointments?.length || 0,
      total_spent: customer.total_spent || 0,
      avg_appointment_value: customer.appointments?.length 
        ? customer.appointments.reduce((sum, apt) => sum + (apt.total_amount || 0), 0) / customer.appointments.length
        : 0,
      last_visit: customer.appointments?.length 
        ? Math.max(...customer.appointments.map(apt => new Date(apt.scheduled_at).getTime()))
        : null
    }

    return NextResponse.json({ 
      customer: {
        ...customer,
        metrics
      }
    })

  } catch (error) {
    console.error('Get customer error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get customer' },
      { status: 500 }
    )
  }
}

// Update customer
async function updateCustomer(customerId, request) {
  try {
    const supabase = createSupabaseClient()
    const { user, barbershop_id } = await getUserBarbershopContext(supabase)

    const body = await request.json()
    const updates = customerUpdateSchema.parse(body)

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .eq('barbershop_id', barbershop_id)
      .select()
      .single()

    if (error) {
      console.error('Customer update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ customer })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update customer error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// Delete customer (soft delete)
async function deleteCustomer(customerId) {
  try {
    const supabase = createSupabaseClient()
    const { user, barbershop_id } = await getUserBarbershopContext(supabase)

    // Soft delete - just mark as inactive or add deleted_at timestamp
    const { data: customer, error } = await supabase
      .from('customers')
      .update({ 
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .eq('barbershop_id', barbershop_id)
      .select()
      .single()

    if (error) {
      console.error('Customer delete error:', error)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete customer' },
      { status: 500 }
    )
  }
}

// Get customer appointments
async function getCustomerAppointments(customerId) {
  try {
    const supabase = createSupabaseClient()
    const { user, barbershop_id } = await getUserBarbershopContext(supabase)

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(name, duration_minutes),
        barber:profiles!appointments_barber_id_fkey(full_name)
      `)
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershop_id)
      .order('scheduled_at', { ascending: false })

    if (error) {
      console.error('Customer appointments error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ appointments })

  } catch (error) {
    console.error('Get customer appointments error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get appointments' },
      { status: 500 }
    )
  }
}

// Main Route Handlers
export async function GET(request, { params }) {
  try {
    const { operation } = params

    if (!operation || operation.length === 0) {
      // List customers
      return listCustomers(request)
    }

    const [action, subAction] = operation

    // UUID pattern check for customer ID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (uuidPattern.test(action)) {
      // Customer-specific operations
      if (!subAction) {
        return getCustomer(action)
      }

      switch (subAction) {
        case 'appointments':
          return getCustomerAppointments(action)
        default:
          return NextResponse.json({ error: 'Unknown customer operation' }, { status: 404 })
      }
    }

    // Non-customer-specific operations
    switch (action) {
      case 'segments':
        return getCustomerSegments(request)
      case 'analytics':
        return getCustomerAnalytics(request)
      default:
        return NextResponse.json({ error: 'Unknown operation' }, { status: 404 })
    }

  } catch (error) {
    console.error('Customer GET handler error:', error)
    return NextResponse.json(
      { error: 'Customer request failed' },
      { status: 500 }
    )
  }
}

export async function POST(request, { params }) {
  try {
    const { operation } = params

    if (!operation || operation.length === 0) {
      // Create customer
      return createCustomer(request)
    }

    const [action, subAction] = operation

    // Handle specific POST operations here
    switch (action) {
      case 'import':
        return importCustomers(request)
      default:
        return NextResponse.json({ error: 'Unknown POST operation' }, { status: 404 })
    }

  } catch (error) {
    console.error('Customer POST handler error:', error)
    return NextResponse.json(
      { error: 'Customer request failed' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const { operation } = params

    if (!operation || operation.length === 0) {
      return NextResponse.json({ error: 'Customer ID required for update' }, { status: 400 })
    }

    const [customerId] = operation
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!uuidPattern.test(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    return updateCustomer(customerId, request)

  } catch (error) {
    console.error('Customer PUT handler error:', error)
    return NextResponse.json(
      { error: 'Customer update failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { operation } = params

    if (!operation || operation.length === 0) {
      return NextResponse.json({ error: 'Customer ID required for deletion' }, { status: 400 })
    }

    const [customerId] = operation
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!uuidPattern.test(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    return deleteCustomer(customerId)

  } catch (error) {
    console.error('Customer DELETE handler error:', error)
    return NextResponse.json(
      { error: 'Customer deletion failed' },
      { status: 500 }
    )
  }
}

// Placeholder functions for additional features
async function getCustomerSegments(request) {
  return NextResponse.json({ message: 'Customer segmentation coming soon' })
}

async function getCustomerAnalytics(request) {
  return NextResponse.json({ message: 'Customer analytics coming soon' })
}

async function importCustomers(request) {
  return NextResponse.json({ message: 'Customer import coming soon' })
}
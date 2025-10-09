import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request, { params }) {
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

    const { customerId } = params

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*, preferred_barber:staff(id, full_name)')
      .eq('id', customerId)
      .eq('barbershop_id', shop.id)
      .is('deleted_at', null)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Get recent appointments for this customer
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, appointment_date, status, total_price, service:services(name), barber:staff(full_name)')
      .eq('customer_id', customerId)
      .eq('barbershop_id', shop.id)
      .order('appointment_date', { ascending: false })
      .limit(10)

    // Calculate visit statistics
    const completedAppointments = appointments?.filter(apt => apt.status === 'completed') || []

    let visitStats = {
      last_visit_date: customer.last_visit || null,
      average_days_between_visits: null,
      most_requested_service: null,
      preferred_barber_percentage: null
    }

    if (completedAppointments.length > 1) {
      // Calculate average days between visits
      const sortedDates = completedAppointments
        .map(apt => new Date(apt.appointment_date))
        .sort((a, b) => a - b)

      let totalDays = 0
      for (let i = 1; i < sortedDates.length; i++) {
        totalDays += Math.floor((sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24))
      }
      visitStats.average_days_between_visits = Math.floor(totalDays / (sortedDates.length - 1))
    }

    // Find most requested service
    if (completedAppointments.length > 0) {
      const serviceCounts = {}
      completedAppointments.forEach(apt => {
        const serviceName = apt.service?.name || 'Unknown Service'
        serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1
      })
      const maxService = Object.entries(serviceCounts).reduce((a, b) => a[1] > b[1] ? a : b)
      visitStats.most_requested_service = maxService[0]
    }

    // Calculate preferred barber percentage
    if (customer.preferred_barber && completedAppointments.length > 0) {
      const preferredBarberVisits = completedAppointments.filter(
        apt => apt.barber?.full_name === customer.preferred_barber.full_name
      ).length
      visitStats.preferred_barber_percentage = (preferredBarberVisits / completedAppointments.length) * 100
    }

    // Format recent appointments
    const recentAppointments = appointments?.map(apt => ({
      id: apt.id,
      appointment_date: apt.appointment_date,
      service_name: apt.service?.name || 'Unknown Service',
      barber_name: apt.barber?.full_name || 'Unknown Barber',
      status: apt.status,
      amount_paid: apt.total_price || 0
    })) || []

    return NextResponse.json({
      customer: {
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
      },
      recent_appointments: recentAppointments,
      visit_stats: visitStats
    })

  } catch (error) {
    console.error('Error in GET /api/shop/customers/[customerId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request, { params }) {
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

    const { customerId } = params
    const updates = await request.json()

    // Verify customer exists and belongs to this shop
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('barbershop_id', shop.id)
      .is('deleted_at', null)
      .single()

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Build update object with allowed fields
    const allowedUpdates = {}

    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        )
      }
      allowedUpdates.name = updates.name.trim()
    }

    if (updates.email !== undefined) allowedUpdates.email = updates.email || null
    if (updates.phone !== undefined) allowedUpdates.phone = updates.phone || null
    if (updates.status !== undefined) {
      if (!['active', 'inactive', 'vip'].includes(updates.status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be active, inactive, or vip' },
          { status: 400 }
        )
      }
      allowedUpdates.status = updates.status
    }
    if (updates.preferred_barber_id !== undefined) {
      allowedUpdates.preferred_barber_id = updates.preferred_barber_id || null
    }
    if (updates.loyalty_points !== undefined) {
      if (typeof updates.loyalty_points !== 'number' || updates.loyalty_points < 0) {
        return NextResponse.json(
          { error: 'Loyalty points must be a positive number' },
          { status: 400 }
        )
      }
      allowedUpdates.loyalty_points = updates.loyalty_points
    }
    if (updates.notes !== undefined) allowedUpdates.notes = updates.notes || null

    // Update the customer
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update(allowedUpdates)
      .eq('id', customerId)
      .eq('barbershop_id', shop.id)
      .select('*, preferred_barber:staff(id, full_name)')
      .single()

    if (updateError) {
      console.error('Error updating customer:', updateError)
      return NextResponse.json(
        { error: 'Failed to update customer' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      customer: updatedCustomer,
      message: 'Customer updated successfully'
    })

  } catch (error) {
    console.error('Error in PATCH /api/shop/customers/[customerId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
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

    const { customerId } = params

    // Soft delete customer by setting status to inactive
    // We don't actually delete due to appointment history
    const { data: customer, error: deleteError } = await supabase
      .from('customers')
      .update({ status: 'inactive' })
      .eq('id', customerId)
      .eq('barbershop_id', shop.id)
      .is('deleted_at', null)
      .select()
      .single()

    if (deleteError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Customer marked as inactive'
    })

  } catch (error) {
    console.error('Error in DELETE /api/shop/customers/[customerId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

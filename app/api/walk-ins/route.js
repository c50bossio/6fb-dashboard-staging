import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estimateSmartWaitTime } from '../../../lib/service-duration-config.js'

// Inline phone utility to fix module resolution issue
function cleanPhoneForStorage(phoneNumber) {
  if (!phoneNumber) return null
  
  // Remove all non-numeric characters
  let digits = phoneNumber.replace(/[^\d]/g, '')
  
  if (!digits) return null
  
  // Handle US/Canada phone numbers
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  } else if (digits.length === 11 && !digits.startsWith('1')) {
    return `+${digits}`
  } else if (digits.length > 11) {
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`
  }
  
  // Fallback for 10-digit numbers
  if (digits.length === 10) {
    return `+1${digits}`
  }
  
  return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, phone, service, notes, barbershop_id, estimated_wait = 30 } = body

    // Validate required fields
    if (!name || !service || !barbershop_id) {
      return NextResponse.json(
        { error: 'Name, service, and barbershop_id are required' },
        { status: 400 }
      )
    }

    // Check if customer exists, if not create one
    let customer
    let normalizedPhone = null
    
    if (phone) {
      // Clean and normalize phone number for storage
      normalizedPhone = cleanPhoneForStorage(phone)
      
      // Try to find existing customer by normalized phone
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('barbershop_id', barbershop_id)
        .single()

      customer = existingCustomer
    }

    if (!customer) {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          full_name: name,
          phone: normalizedPhone,
          barbershop_id,
          is_walk_in: true,
          first_visit_date: new Date().toISOString(),
          walk_in_converted: false,
          marketing_consent: phone ? true : false, // Assume consent if they provide phone
          source: 'walk_in',
          notes: notes ? `Walk-in notes: ${notes}` : 'Created as walk-in customer',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (customerError) {
        // Handle case where customer table doesn't have new fields yet
        console.warn('Failed to create customer with marketing fields:', customerError)
        // Fallback to basic customer creation
        const { data: fallbackCustomer, error: fallbackError } = await supabase
          .from('customers')
          .insert({
            full_name: name,
            phone: normalizedPhone,
            barbershop_id,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (fallbackError) throw fallbackError
        customer = fallbackCustomer
      } else {
        customer = newCustomer
      }
    } else {
      // Update existing customer to mark as walk-in if not already marked
      if (!customer.is_walk_in) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            is_walk_in: true,
            walk_in_visit_count: (customer.walk_in_visit_count || 0) + 1,
            last_visit_date: new Date().toISOString(),
            marketing_consent: phone && !customer.marketing_consent ? true : customer.marketing_consent
          })
          .eq('id', customer.id)
        
        if (updateError) {
          console.warn('Failed to update customer marketing fields:', updateError)
          // Continue without failing - the core functionality still works
        }
      }
    }

    // Get service details for pricing
    const { data: serviceData } = await supabase
      .from('services')
      .select('*')
      .eq('name', service)
      .eq('barbershop_id', barbershop_id)
      .single()

    // Create walk-in appointment - using consistent local timezone
    // Note: We use local timezone throughout to match how barbers think about time
    const now = new Date()
    const appointmentData = {
      barbershop_id,
      customer_id: customer.id,
      service_id: serviceData?.id,
      date: now.toLocaleDateString('en-CA'), // YYYY-MM-DD format in local timezone
      time: now.toTimeString().split(' ')[0], // HH:MM:SS in local timezone
      status: 'WALK_IN_WAITING',
      notes: notes || null
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single()

    if (appointmentError) throw appointmentError

    // Calculate current queue position
    const { count: queuePosition } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('barbershop_id', barbershop_id)
      .gte('date', new Date().toISOString().split('T')[0])
      .in('status', ['WALK_IN_WAITING', 'CONFIRMED'])
      .lt('created_at', appointment.created_at)

    const finalQueuePosition = (queuePosition || 0) + 1
    
    // Use smart wait time estimation considering service type and multiple barbers
    const waitTimeEstimation = estimateSmartWaitTime(service, finalQueuePosition)
    const finalEstimatedWait = waitTimeEstimation.estimatedWaitMinutes

    // Send welcome notification to customer
    if (phone) {
      try {
        const notificationResponse = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'walk_in_added',
            customer_name: name,
            phone: normalizedPhone,
            queue_position: finalQueuePosition,
            estimated_wait: finalEstimatedWait,
            barbershop_id: barbershop_id,
            appointment_id: appointment.id
          })
        })

        if (notificationResponse.ok) {
          console.log(`Walk-in notification sent to ${name} at ${phone}`)
        } else {
          console.warn(`Failed to send walk-in notification to ${phone}`)
        }
      } catch (notificationError) {
        console.error('Error sending walk-in notification:', notificationError)
        // Don't fail the walk-in creation if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      appointment_id: appointment.id,
      customer_id: customer.id,
      queue_position: finalQueuePosition,
      estimated_wait: finalEstimatedWait,
      message: `${name} added to walk-in queue`,
      notification_sent: phone ? true : false
    })

  } catch (error) {
    console.error('Walk-in creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add walk-in customer' },
      { status: 500 }
    )
  }
}

// Get current walk-in queue
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')

    if (!barbershop_id) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Get all walk-ins for today
    const { data: walkIns, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customers (
          id,
          full_name,
          phone
        )
      `)
      .eq('barbershop_id', barbershop_id)
      .gte('date', today)
      .eq('status', 'WALK_IN_WAITING')
      .order('created_at', { ascending: true })

    if (error) throw error

    // Calculate smart estimated wait times based on service type and queue position
    const walkInsWithWait = walkIns.map((walkIn, index) => {
      const queuePosition = index + 1
      
      // Get service name for smart estimation
      const serviceName = walkIn.service || 'Haircut' // Default fallback
      const waitTimeEstimation = estimateSmartWaitTime(serviceName, queuePosition)
      
      return {
        ...walkIn,
        queue_position: queuePosition,
        estimated_wait: waitTimeEstimation.estimatedWaitMinutes,
        service_duration: waitTimeEstimation.serviceDuration,
        active_barbers: waitTimeEstimation.activeBarbers
      }
    })

    return NextResponse.json({
      success: true,
      walk_ins: walkInsWithWait,
      total_waiting: walkIns.length
    })

  } catch (error) {
    console.error('Walk-in queue error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get walk-in queue' },
      { status: 500 }
    )
  }
}
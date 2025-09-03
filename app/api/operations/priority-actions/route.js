import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')

    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop ID is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date
    const today = new Date().toISOString().split('T')[0]
    
    // Fetch relevant data for generating priority actions
    const [appointmentsResult, customersResult] = await Promise.all([
      supabase
        .from('appointments')
        .select('*, customers(name, phone, email), services(name, price)')
        .eq('barbershop_id', barbershopId)
        .gte('date', today)
        .order('start_time'),
      
      supabase
        .from('customers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('last_visit', { ascending: false })
        .limit(50)
    ])

    const appointments = appointmentsResult.data || []
    const customers = customersResult.data || []

    // Generate AI-powered priority actions based on business data
    const actions = generatePriorityActions(appointments, customers)

    return NextResponse.json({
      success: true,
      data: {
        actions,
        generated_at: new Date().toISOString(),
        barbershop_id: barbershopId
      }
    })

  } catch (error) {
    console.error('Priority actions API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

function generatePriorityActions(appointments, customers) {
  const actions = []
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  // Filter today's appointments
  const todayAppointments = appointments.filter(apt => apt.date === todayStr)
  const upcomingAppointments = todayAppointments.filter(apt => 
    new Date(`${apt.date} ${apt.start_time}`) > today
  )
  const pendingAppointments = todayAppointments.filter(apt => apt.status === 'pending')
  const confirmedAppointments = todayAppointments.filter(apt => apt.status === 'confirmed')

  // 1. Urgent: Confirm pending appointments
  if (pendingAppointments.length > 0) {
    const urgencyScore = Math.min(95, 70 + (pendingAppointments.length * 5))
    actions.push({
      id: 'confirm_pending_appointments',
      title: `Confirm ${pendingAppointments.length} pending appointment${pendingAppointments.length > 1 ? 's' : ''}`,
      description: `${pendingAppointments.length} customers waiting for confirmation. Contact them ASAP to secure bookings.`,
      priority: 'high',
      urgencyScore,
      estimatedTime: `${pendingAppointments.length * 3} minutes`,
      icon: 'PhoneIcon',
      color: 'red',
      actions: ['Call customers', 'Send confirmations'],
      data: {
        count: pendingAppointments.length,
        appointments: pendingAppointments.slice(0, 3).map(apt => ({
          time: apt.start_time,
          customer_name: apt.customers?.name || 'Unknown',
          phone: apt.customers?.phone
        }))
      }
    })
  }

  // 2. High: Prepare for upcoming appointments (within 2 hours)
  const soonAppointments = upcomingAppointments.filter(apt => {
    const aptTime = new Date(`${apt.date} ${apt.start_time}`)
    const hoursUntil = (aptTime - today) / (1000 * 60 * 60)
    return hoursUntil <= 2 && hoursUntil > 0
  })

  if (soonAppointments.length > 0) {
    actions.push({
      id: 'prepare_upcoming_appointments',
      title: `Prepare for ${soonAppointments.length} upcoming appointment${soonAppointments.length > 1 ? 's' : ''}`,
      description: `${soonAppointments.length} customers arriving within 2 hours. Review services and prepare workstation.`,
      priority: 'medium',
      urgencyScore: 75,
      estimatedTime: '15 minutes',
      icon: 'ClockIcon',
      color: 'amber',
      actions: ['Review services', 'Prepare tools'],
      data: {
        count: soonAppointments.length,
        appointments: soonAppointments.slice(0, 2).map(apt => ({
          time: apt.start_time,
          customer_name: apt.customers?.name || 'Unknown',
          service_name: apt.services?.name || 'Service'
        }))
      }
    })
  }

  // 3. Medium: Follow up with customers who haven't visited recently
  const inactiveCustomers = customers.filter(customer => {
    if (!customer.last_visit) return true
    const daysSinceVisit = (today - new Date(customer.last_visit)) / (1000 * 60 * 60 * 24)
    return daysSinceVisit > 30
  }).slice(0, 10)

  if (inactiveCustomers.length >= 3) {
    actions.push({
      id: 'follow_up_inactive_customers',
      title: `Reconnect with ${inactiveCustomers.length} customers`,
      description: `${inactiveCustomers.length} valued customers haven't visited recently. A quick message could bring them back.`,
      priority: 'medium',
      urgencyScore: 60,
      estimatedTime: '20 minutes',
      icon: 'ChatBubbleLeftIcon',
      color: 'blue',
      actions: ['Send messages', 'Offer promotions'],
      data: {
        count: inactiveCustomers.length,
        customers: inactiveCustomers.slice(0, 5).map(customer => ({
          name: customer.name,
          last_visit: customer.last_visit,
          phone: customer.phone
        }))
      }
    })
  }

  // 4. Low: Capture and share recent work (if no urgent tasks)
  if (actions.length === 0 || actions.every(action => action.priority !== 'high')) {
    const recentCompletedAppointments = appointments.filter(apt => 
      apt.status === 'completed' && 
      new Date(apt.completed_at) > new Date(today.getTime() - 24 * 60 * 60 * 1000)
    )

    if (recentCompletedAppointments.length > 0) {
      actions.push({
        id: 'share_recent_work',
        title: 'Showcase your recent work',
        description: `Share photos of your recent cuts on social media to attract new customers and build your brand.`,
        priority: 'low',
        urgencyScore: 30,
        estimatedTime: '10 minutes',
        icon: 'CameraIcon',
        color: 'purple',
        actions: ['Take photos', 'Post to social'],
        data: {
          recent_work_count: recentCompletedAppointments.length
        }
      })
    }
  }

  // 5. Medium: Equipment or workspace maintenance (recurring weekly suggestion)
  const dayOfWeek = today.getDay()
  if (dayOfWeek === 1) { // Monday
    actions.push({
      id: 'weekly_maintenance',
      title: 'Weekly equipment check',
      description: 'Start the week right by checking and cleaning your tools and workspace.',
      priority: 'low',
      urgencyScore: 40,
      estimatedTime: '15 minutes',
      icon: 'WrenchScrewdriverIcon',
      color: 'gray',
      actions: ['Clean tools', 'Check supplies'],
      data: {
        maintenance_type: 'weekly_check'
      }
    })
  }

  // Sort actions by urgency score (highest first)
  return actions.sort((a, b) => (b.urgencyScore || 0) - (a.urgencyScore || 0))
}
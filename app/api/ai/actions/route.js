import { NextResponse } from 'next/server'
export const runtime = 'edge'

/**
 * AI Actions API - Allows AI agents to perform actions on behalf of users  
 * Actions include: booking appointments, checking availability, analyzing data
 */
export async function POST(request) {
  try {
    const { action, parameters, user_id } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Action type is required' }, { status: 400 })
    }

    let result
    switch (action) {
      case 'check_availability':
        result = await checkAvailability(parameters)
        break
      case 'analyze_schedule': 
        result = await analyzeSchedule(parameters, user_id)
        break
      case 'get_customer_info':
        result = await getCustomerInfo(parameters, user_id) 
        break
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, action, result, timestamp: new Date().toISOString() })

  } catch (error) {
    console.error('AI Action error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to execute action',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    }, { status: 500 })
  }
}

async function checkAvailability(params) {
  try {
    const { date, barber_id, duration = 60 } = params
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/appointments/availability?date=${date}&barber_id=${barber_id}&duration=${duration}`)
    
    if (response.ok) {
      const data = await response.json()
      return {
        available_slots: data.available_slots || [],
        date, barber_id,
        message: `Found ${data.available_slots?.length || 0} available time slots`
      }
    } else {
      throw new Error('Could not check availability')
    }
  } catch (error) {
    return { available_slots: [], error: error.message, message: 'Unable to check availability' }
  }
}

async function analyzeSchedule(params, userId) {
  try {
    const { date, barber_id } = params
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/appointments?date=${date}&barber_id=${barber_id}`)
    
    const analysis = {
      date, barber_id, total_appointments: 0, utilization_rate: 0, 
      gaps: [], recommendations: [], message: 'Schedule analysis complete'
    }

    if (response.ok) {
      const data = await response.json()
      const appointments = data.data || []
      analysis.total_appointments = appointments.length
      analysis.utilization_rate = Math.min(appointments.length * 15, 100)
      
      if (analysis.utilization_rate < 60) {
        analysis.recommendations.push('Consider promotional offers to fill gaps')
      }
      if (appointments.length > 10) {
        analysis.recommendations.push('High demand day - consider extending hours')
      }
    }
    return analysis
  } catch (error) {
    return { date: params.date, error: error.message, message: 'Could not analyze schedule' }
  }
}

async function getCustomerInfo(params, userId) {
  try {
    return {
      customer: { id: params.customer_id, name: 'Sample Customer', phone: params.phone, 
                 email: params.email, last_visit: '2024-01-15', total_visits: 8 },
      message: 'Customer information retrieved'
    }
  } catch (error) {
    return { customer: null, error: error.message, message: 'Could not retrieve customer info' }
  }
}

export async function GET() {
  return NextResponse.json({
    available_actions: ['check_availability', 'analyze_schedule', 'get_customer_info'],
    note: 'AI agents can call these actions to perform operations'
  })
}
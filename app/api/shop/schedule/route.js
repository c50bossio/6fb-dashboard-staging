import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const barberId = searchParams.get('barber_id')
    
    const today = new Date()
    const isToday = date === today.toISOString().split('T')[0]
    const currentHour = today.getHours()
    
    const baseSchedule = [
      {
        id: 'apt-001',
        appointment_date: date,
        start_time: `${date}T09:00:00Z`,
        end_time: `${date}T09:45:00Z`,
        customer_name: 'John Smith',
        customer_phone: '(415) 555-0123',
        service_name: 'Classic Haircut',
        barber_name: 'Alex Rodriguez',
        barber_id: 'barber-alex-123',
        status: isToday && currentHour > 9 ? 'completed' : 'confirmed',
        duration_minutes: 45,
        price: 35.00,
        payment_status: 'paid',
        notes: 'Regular customer, prefers scissors cut'
      },
      {
        id: 'apt-002',
        appointment_date: date,
        start_time: `${date}T10:00:00Z`,
        end_time: `${date}T10:50:00Z`,
        customer_name: 'Michael Johnson',
        customer_phone: '(415) 555-0124',
        service_name: 'Fade Cut',
        barber_name: 'Jamie Chen',
        barber_id: 'barber-jamie-123',
        status: isToday && currentHour > 10 ? 'completed' : 'confirmed',
        duration_minutes: 50,
        price: 40.00,
        payment_status: 'paid',
        notes: 'Mid fade, trim beard'
      },
      {
        id: 'apt-003',
        appointment_date: date,
        start_time: `${date}T11:00:00Z`,
        end_time: `${date}T11:30:00Z`,
        customer_name: 'David Wilson',
        customer_phone: '(415) 555-0125',
        service_name: 'Beard Trim',
        barber_name: 'Alex Rodriguez',
        barber_id: 'barber-alex-123',
        status: isToday && currentHour > 11 ? 'completed' : (isToday && currentHour === 11 ? 'in_progress' : 'confirmed'),
        duration_minutes: 30,
        price: 25.00,
        payment_status: 'pending',
        notes: 'First time customer'
      },
      {
        id: 'apt-004',
        appointment_date: date,
        start_time: `${date}T14:00:00Z`,
        end_time: `${date}T15:30:00Z`,
        customer_name: 'Robert Brown',
        customer_phone: '(415) 555-0126',
        service_name: 'Full Service Package',
        barber_name: 'Mike Thompson',
        barber_id: 'barber-mike-123',
        status: isToday && currentHour > 15 ? 'completed' : 'confirmed',
        duration_minutes: 90,
        price: 75.00,
        payment_status: 'paid',
        notes: 'Haircut, beard trim, hot towel shave'
      },
      {
        id: 'apt-005',
        appointment_date: date,
        start_time: `${date}T15:00:00Z`,
        end_time: `${date}T15:45:00Z`,
        customer_name: 'James Garcia',
        customer_phone: '(415) 555-0127',
        service_name: 'Classic Haircut',
        barber_name: 'Jamie Chen',
        barber_id: 'barber-jamie-123',
        status: 'confirmed',
        duration_minutes: 45,
        price: 35.00,
        payment_status: 'pending',
        notes: 'Executive cut, professional style'
      },
      {
        id: 'apt-006',
        appointment_date: date,
        start_time: `${date}T16:00:00Z`,
        end_time: `${date}T16:45:00Z`,
        customer_name: 'Christopher Lee',
        customer_phone: '(415) 555-0128',
        service_name: 'Classic Haircut',
        barber_name: 'Alex Rodriguez',
        barber_id: 'barber-alex-123',
        status: 'confirmed',
        duration_minutes: 45,
        price: 35.00,
        payment_status: 'paid',
        notes: 'Regular monthly appointment'
      }
    ]
    
    let filteredSchedule = baseSchedule
    if (barberId) {
      filteredSchedule = baseSchedule.filter(apt => apt.barber_id === barberId)
    }
    
    const summary = {
      total_appointments: filteredSchedule.length,
      completed: filteredSchedule.filter(apt => apt.status === 'completed').length,
      confirmed: filteredSchedule.filter(apt => apt.status === 'confirmed').length,
      in_progress: filteredSchedule.filter(apt => apt.status === 'in_progress').length,
      cancelled: filteredSchedule.filter(apt => apt.status === 'cancelled').length,
      total_revenue: filteredSchedule.reduce((sum, apt) => sum + apt.price, 0),
      paid_amount: filteredSchedule.filter(apt => apt.payment_status === 'paid').reduce((sum, apt) => sum + apt.price, 0),
      pending_amount: filteredSchedule.filter(apt => apt.payment_status === 'pending').reduce((sum, apt) => sum + apt.price, 0)
    }
    
    return NextResponse.json({
      appointments: filteredSchedule,
      summary,
      date,
      barber_id: barberId || null
    })
    
  } catch (error) {
    console.error('Error in /api/shop/schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const appointmentData = await request.json()
    
    const newAppointment = {
      id: `apt-${Date.now()}`,
      ...appointmentData,
      status: 'confirmed',
      payment_status: 'pending',
      created_at: new Date().toISOString()
    }
    
    return NextResponse.json(newAppointment, { status: 201 })
    
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}
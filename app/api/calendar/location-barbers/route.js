import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    const { locationIds } = body
    
    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json({
        success: true,
        barbers: []
      })
    }
    
    // Get active barbers for the specified locations
    const { data: staffRecords, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        barbershop_id,
        role,
        is_active,
        commission_rate,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url,
          phone
        ),
        barbershops:barbershop_id (
          id,
          name,
          city,
          state
        )
      `)
      .in('barbershop_id', locationIds)
      .eq('is_active', true)
      .in('role', ['barber', 'senior_barber', 'master_barber', 'shop_owner'])
      .order('profiles(full_name)')
    
    if (staffError) {
      console.error('Error fetching staff:', staffError)
      throw staffError
    }
    
    // Format barber data for calendar display
    const barbers = staffRecords?.map(staff => ({
      id: staff.user_id,
      staffId: staff.id,
      name: staff.profiles?.full_name || staff.profiles?.email || 'Unknown Barber',
      email: staff.profiles?.email,
      phone: staff.profiles?.phone,
      avatar: staff.profiles?.avatar_url,
      location: staff.barbershops?.name,
      locationId: staff.barbershop_id,
      locationCity: staff.barbershops?.city,
      locationState: staff.barbershops?.state,
      role: staff.role,
      commissionRate: staff.commission_rate,
      color: generateBarberColor(staff.user_id),
      // For FullCalendar resource
      title: staff.profiles?.full_name || staff.profiles?.email || 'Unknown Barber',
      eventColor: generateBarberColor(staff.user_id)
    })) || []
    
    // Get availability/schedule data for each barber (optional enhancement)
    for (const barber of barbers) {
      // Get today's appointments count for quick stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const { data: todayAppointments, error: aptError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('barber_id', barber.id)
        .eq('barbershop_id', barber.locationId)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .neq('status', 'cancelled')
      
      barber.todayAppointments = todayAppointments || 0
      
      // Get this week's total appointments
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      const { data: weekAppointments } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('barber_id', barber.id)
        .eq('barbershop_id', barber.locationId)
        .gte('start_time', weekStart.toISOString())
        .lt('start_time', weekEnd.toISOString())
        .neq('status', 'cancelled')
      
      barber.weekAppointments = weekAppointments || 0
    }
    
    return NextResponse.json({
      success: true,
      barbers,
      locationCount: locationIds.length,
      totalBarbers: barbers.length
    })
    
  } catch (error) {
    console.error('Error fetching location barbers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch barbers', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Generate consistent color for a barber based on their ID
 */
function generateBarberColor(barberId) {
  if (!barberId) return '#6B7280' // Default gray
  
  const colors = [
    '#546355', // Olive green
    '#7C3AED', // Purple
    '#2563EB', // Blue
    '#059669', // Green
    '#DC2626', // Red
    '#EA580C', // Orange
    '#CA8A04', // Yellow
    '#0891B2', // Cyan
    '#DB2777', // Pink
    '#7C2D12', // Brown
    '#4F46E5', // Indigo
    '#84CC16', // Lime
  ]
  
  // Generate a consistent index based on barber ID
  const hash = barberId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  return colors[Math.abs(hash) % colors.length]
}
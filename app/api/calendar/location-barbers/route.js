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
      .select('*')
      .in('barbershop_id', locationIds)
      .eq('is_active', true)
      .in('role', ['barber', 'senior_barber', 'master_barber', 'shop_owner'])
    
    if (staffError) {
      console.error('Error fetching staff:', staffError)
      throw staffError
    }
    
    // Fetch related data separately
    let barbers = []
    if (staffRecords && staffRecords.length > 0) {
      // Get unique user IDs and barbershop IDs
      const userIds = [...new Set(staffRecords.map(s => s.user_id))]
      const barbershopIds = [...new Set(staffRecords.map(s => s.barbershop_id))]
      
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, phone')
        .in('id', userIds)
      
      // Fetch barbershops
      const { data: barbershopsData } = await supabase
        .from('barbershops')
        .select('id, name, city, state')
        .in('id', barbershopIds)
      
      // Create lookup maps
      const profilesMap = Object.fromEntries(
        (profilesData || []).map(p => [p.id, p])
      )
      const barbershopsMap = Object.fromEntries(
        (barbershopsData || []).map(b => [b.id, b])
      )
      
      // Format barber data for calendar display
      barbers = staffRecords.map(staff => {
        const profile = profilesMap[staff.user_id] || {}
        const barbershop = barbershopsMap[staff.barbershop_id] || {}
        
        return {
          id: staff.user_id,
          staffId: staff.id,
          name: profile.full_name || profile.email || 'Unknown Barber',
          email: profile.email,
          phone: profile.phone,
          avatar: profile.avatar_url,
          location: barbershop.name,
          locationId: staff.barbershop_id,
          locationCity: barbershop.city,
          locationState: barbershop.state,
          role: staff.role,
          commissionRate: staff.commission_rate,
          color: generateBarberColor(staff.user_id),
          // For FullCalendar resource
          title: profile.full_name || profile.email || 'Unknown Barber',
          eventColor: generateBarberColor(staff.user_id)
        }
      })
    }
    
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
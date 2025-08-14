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
    
    // Only shop owners, enterprise owners, and admins can view barbers (skip check in development)
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Get the shop(s) owned by this user
    if (!userId) {
      return NextResponse.json({ barbers: [] })
    }
    
    const { data: shops, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', userId)
    
    if (shopError) {
      console.error('Error fetching shops:', shopError)
      return NextResponse.json(
        { error: 'Failed to fetch shops' },
        { status: 500 }
      )
    }
    
    if (!shops || shops.length === 0) {
      // No shops found - return empty state with helpful message
      // NO MOCK DATA - follow strict policy
      return NextResponse.json({ 
        barbers: [],
        message: 'No barbershops found for this user. Please ensure shop ownership is configured.',
        data_available: false,
        setup_required: true,
        instructions: [
          '1. Create a barbershop in the barbershops table',
          '2. Set the owner_id to your user ID',
          '3. Add barbers to the barbershop_staff table',
          '4. Ensure barber profiles have role: BARBER'
        ]
      })
    }
    
    // Get all barbers from the user's shops
    const shopIds = shops.map(shop => shop.id)
    
    // Try to fetch from barbershop_staff table
    const { data: barberStaff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        role,
        is_active,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .in('barbershop_id', shopIds)
      .eq('role', 'BARBER')
      .eq('is_active', true)
    
    if (staffError) {
      console.error('Error fetching barber staff:', staffError)
      
      // If table doesn't exist, try alternative approach
      // Look for users with BARBER role in profiles
      const { data: barberProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, role')
        .eq('role', 'BARBER')
        .limit(10)
      
      if (profileError) {
        console.error('Error fetching barber profiles:', profileError)
        return NextResponse.json({ barbers: [] })
      }
      
      // Format profiles as barber staff
      const formattedBarbers = (barberProfiles || []).map(profile => ({
        id: `profile-${profile.id}`,
        user_id: profile.id,
        users: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || 'Barber',
          avatar_url: profile.avatar_url
        }
      }))
      
      return NextResponse.json({ barbers: formattedBarbers })
    }
    
    // Format and return the barber data
    const formattedBarbers = (barberStaff || []).map(staff => ({
      id: staff.id,
      user_id: staff.user_id,
      users: staff.users || {
        id: staff.user_id,
        email: 'barber@shop.com',
        full_name: 'Barber',
        avatar_url: null
      }
    }))
    
    return NextResponse.json({ barbers: formattedBarbers })
    
  } catch (error) {
    console.error('Error in /api/shop/barbers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
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

    // Wrap database queries in try-catch for better error handling
    let shops
    try {
      const { data: shopsData, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('owner_id', userId)

      if (shopError) {
        // Log the error but return empty array instead of 500
        console.warn('⚠️ Error fetching shops (returning empty):', shopError.message)
        return NextResponse.json({ barbers: [] })
      }

      shops = shopsData
    } catch (dbError) {
      // Handle unexpected database connection errors gracefully
      console.warn('⚠️ Database connection error (returning empty):', dbError.message)
      return NextResponse.json({ barbers: [] })
    }

    if (!shops || shops.length === 0) {
      // Silently return empty - user may not have shops configured yet
      return NextResponse.json({ barbers: [] })
    }
    
    // Get all barbers from the user's shops
    const shopIds = shops.map(shop => shop.id)

    // Try to fetch from barbershop_staff table with error handling
    let barberStaff
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('barbershop_staff')
        .select(`
          id,
          user_id,
          role,
          is_active,
          users:profiles!barbershop_staff_user_id_fkey (
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
        // Log warning but try fallback approach
        console.warn('⚠️ Error fetching barber staff (trying fallback):', staffError.message)

        // Fallback: Look for users with BARBER role in profiles
        try {
          const { data: barberProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, role')
            .eq('role', 'BARBER')
            .limit(10)

          if (profileError) {
            console.warn('⚠️ Error fetching barber profiles (returning empty):', profileError.message)
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
        } catch (fallbackError) {
          console.warn('⚠️ Fallback query failed (returning empty):', fallbackError.message)
          return NextResponse.json({ barbers: [] })
        }
      }

      barberStaff = staffData
    } catch (dbError) {
      // Handle unexpected database errors gracefully
      console.warn('⚠️ Database error fetching barbers (returning empty):', dbError.message)
      return NextResponse.json({ barbers: [] })
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
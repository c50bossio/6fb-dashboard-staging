import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Force dynamic rendering - this route uses cookies and can't be statically generated
export const dynamic = 'force-dynamic'

// Temporarily disable edge runtime to debug production issues
// export const runtime = 'edge'

export async function GET(request) {
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
    
    // Get user profile with role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, shop_id, barbershop_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    
    const userRole = profile.role || 'CLIENT'
    let locations = []
    
    // Fetch locations based on user role
    if (['SUPER_ADMIN', 'ENTERPRISE_OWNER'].includes(userRole)) {
      // Get all organizations owned by user
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
      
      const orgIds = organizations?.map(o => o.id) || []
      
      // Get all barbershops owned by user or in their organizations
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select(`
          id,
          name,
          address,
          city,
          state,
          zip,
          phone,
          email,
          is_active,
          organization_id,
          location_status
        `)
        .or(`owner_id.eq.${user.id}${orgIds.length > 0 ? `,organization_id.in.(${orgIds.join(',')})` : ''}`)
        .order('name')
      
      locations = barbershops || []
    } else if (userRole === 'SHOP_OWNER') {
      // Get shops owned by this user
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select(`
          id,
          name,
          address,
          city,
          state,
          zip,
          phone,
          email,
          is_active
        `)
        .eq('owner_id', user.id)
        .order('name')
      
      locations = barbershops || []
    } else if (userRole === 'LOCATION_MANAGER') {
      // Get locations managed by this user
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select(`
          id,
          name,
          address,
          city,
          state,
          zip,
          phone,
          email,
          is_active
        `)
        .eq('location_manager_id', user.id)
        .order('name')
      
      locations = barbershops || []
    } else if (userRole === 'BARBER') {
      // Get barbershop where this barber works
      const { data: staffRecords } = await supabase
        .from('barbershop_staff')
        .select(`
          barbershop_id,
          barbershops (
            id,
            name,
            address,
            city,
            state,
            zip,
            phone,
            email,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      locations = staffRecords?.map(r => r.barbershops).filter(Boolean) || []
      
      // Also check if they have a barbershop_id directly in profile
      if (locations.length === 0 && profile.barbershop_id) {
        const { data: barbershop } = await supabase
          .from('barbershops')
          .select(`
            id,
            name,
            address,
            city,
            state,
            zip,
            phone,
            email,
            is_active
          `)
          .eq('id', profile.barbershop_id)
          .single()
        
        if (barbershop) {
          locations = [barbershop]
        }
      }
      
      // Also check shop_id in profile
      if (locations.length === 0 && profile.shop_id) {
        const { data: barbershop } = await supabase
          .from('barbershops')
          .select(`
            id,
            name,
            address,
            city,
            state,
            zip,
            phone,
            email,
            is_active
          `)
          .eq('id', profile.shop_id)
          .single()
        
        if (barbershop) {
          locations = [barbershop]
        }
      }
    } else if (['CLIENT', 'CUSTOMER'].includes(userRole)) {
      // Get all active barbershops that accept online booking
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select(`
          id,
          name,
          address,
          city,
          state,
          zip,
          phone,
          email,
          is_active,
          accepts_online_booking
        `)
        .eq('is_active', true)
        .order('name')
      
      // Filter for online booking if the column exists
      locations = barbershops?.filter(b => 
        b.accepts_online_booking === true || 
        b.accepts_online_booking === null // Assume true if not set
      ) || barbershops || []
    }
    
    // Add barber count for each location
    for (const location of locations) {
      const { data: staffCount } = await supabase
        .from('barbershop_staff')
        .select('id', { count: 'exact', head: true })
        .eq('barbershop_id', location.id)
        .eq('is_active', true)
      
      location.barberCount = staffCount || 0
    }
    
    return NextResponse.json({
      success: true,
      locations,
      userRole,
      userId: user.id
    })
    
  } catch (error) {
    console.error('Error fetching user locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations', details: error.message },
      { status: 500 }
    )
  }
}
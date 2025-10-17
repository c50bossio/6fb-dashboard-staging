import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function GET(request, { params }) {
  try {
    const { id: userId } = params
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' }, 
        { status: 400 }
      )
    }

    console.log('🔍 Profile API: Fetching profile for userId:', userId)

    // Use service role client to bypass RLS
    const supabase = await createServiceRoleClient()
    
    // Fetch profile data using service role (bypasses all RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Profile API: Database error:', profileError)
      
      // Return specific error for profile not found
      if (profileError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Profile not found', code: 'PROFILE_NOT_FOUND' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: 'Database error', details: profileError.message },
        { status: 500 }
      )
    }

    console.log('✅ Profile API: Profile found:', {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      barbershop_id: profile.barbershop_id
    })

    // Get barbershop details if user has a barbershop association
    let barbershop = null
    if (profile.barbershop_id) {
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .select('id, name, owner_id, address, phone, business_hours')
        .eq('id', profile.barbershop_id)
        .single()
      
      if (!barbershopError) {
        barbershop = barbershopData
        console.log('✅ Profile API: Barbershop found:', barbershop.name)
      } else {
        console.warn('⚠️ Profile API: Barbershop not found for ID:', profile.barbershop_id)
      }
    }

    // Return enriched profile data
    const enrichedProfile = {
      ...profile,
      barbershop,
      // Computed flags for convenience
      isOwner: barbershop ? barbershop.owner_id === profile.id : false,
      hasShop: !!profile.barbershop_id
    }

    return NextResponse.json({
      success: true,
      profile: enrichedProfile
    })

  } catch (error) {
    console.error('💥 Profile API: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
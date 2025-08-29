import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getServerSession() {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('sb-access-token')
  
  if (!authCookie) {
    return null
  }

  const { data: { user }, error } = await supabase.auth.getUser(authCookie.value)
  if (error || !user) {
    return null
  }

  return user
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getServerSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        shop_id,
        barbershop_id,
        role,
        subscription_tier,
        current_location_id,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Determine subscription type and access scope
    let subscriptionType = 'individual'
    let barbershopId = null
    let currentLocationId = null

    if (profile.shop_id) {
      // Individual subscriber with their own shop
      subscriptionType = 'individual'
      barbershopId = profile.shop_id
    } else if (profile.barbershop_id) {
      // Direct barbershop association
      subscriptionType = 'barbershop'
      barbershopId = profile.barbershop_id
    } else {
      // Check if user is staff at a barbershop
      const { data: staffRecord } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (staffRecord) {
        subscriptionType = 'barbershop'
        barbershopId = staffRecord.barbershop_id
      }
    }

    // Check for enterprise/multi-location access
    if (profile.current_location_id) {
      subscriptionType = 'enterprise'
      currentLocationId = profile.current_location_id
      
      // Ensure barbershop_id is set for enterprise users
      if (!barbershopId) {
        barbershopId = profile.current_location_id
      }
    }

    // Get additional context based on subscription type
    let additionalData = {}

    if (barbershopId) {
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('id, name, owner_id, subscription_tier')
        .eq('id', barbershopId)
        .single()

      if (barbershop) {
        additionalData = {
          barbershop_name: barbershop.name,
          is_owner: barbershop.owner_id === user.id,
          barbershop_subscription_tier: barbershop.subscription_tier
        }
      }
    }

    return NextResponse.json({
      user_id: user.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      subscription_type: subscriptionType,
      subscription_tier: profile.subscription_tier,
      barbershop_id: barbershopId,
      current_location_id: currentLocationId,
      ...additionalData
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getServerSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      full_name,
      current_location_id
    } = body

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name,
        current_location_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      profile 
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
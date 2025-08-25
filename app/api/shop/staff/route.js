import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// FastAPI base URL
const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8001'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id')
      .eq('id', user.id)
      .single()

    const barbershopId = profile?.shop_id || profile?.barbershop_id
    if (!barbershopId) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Fetch staff members first
    const { data: staffData, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    if (staffError) {
      console.error('Error loading staff:', staffError)
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
    }

    // Get user IDs and fetch profiles separately
    const userIds = staffData?.map(s => s.user_id).filter(Boolean) || []
    let profiles = []
    
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
      
      profiles = profileData || []
    }

    // Merge staff data with profiles
    const staffWithProfiles = (staffData || []).map(staff => {
      const profile = profiles.find(p => p.id === staff.user_id)
      return {
        ...staff,
        user: profile || null
      }
    })

    return NextResponse.json(staffWithProfiles)

  } catch (error) {
    console.error('Error in GET /api/shop/staff:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id')
      .eq('id', user.id)
      .single()

    const barbershopId = profile?.shop_id || profile?.barbershop_id
    if (!barbershopId) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Get request body
    const staffData = await request.json()

    // Create/find user account
    let userId = null
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', staffData.email)
      .single()

    if (existingProfile) {
      userId = existingProfile.id
      
      // Check if already staff at this barbershop
      const { data: existingStaffRecord } = await supabase
        .from('barbershop_staff')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('user_id', userId)
        .single()
      
      if (existingStaffRecord) {
        return NextResponse.json({ error: 'This person is already a staff member' }, { status: 400 })
      }
    } else {
      // Create new user (they'll set password on first login)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: staffData.email,
        password: Math.random().toString(36).slice(-12), // Temporary password
        options: {
          data: {
            full_name: staffData.full_name,
            role: 'BARBER'
          }
        }
      })

      if (authError) {
        // Check if user already exists in auth
        if (authError.message?.includes('already registered')) {
          // Try to find their profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', staffData.email)
            .single()
          
          if (profile) {
            userId = profile.id
          } else {
            return NextResponse.json({ error: 'User exists but profile not found' }, { status: 400 })
          }
        } else {
          console.error('Auth creation error:', authError)
          return NextResponse.json({ error: 'Failed to create user account' }, { status: 400 })
        }
      } else {
        userId = authData.user?.id
        
        // Ensure profile is created
        if (userId) {
          await supabase
            .from('profiles')
            .upsert({
              id: userId,
              email: staffData.email,
              full_name: staffData.full_name,
              role: 'BARBER',
              created_at: new Date().toISOString()
            })
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 400 })
    }

    // Add to barbershop_staff
    const { data: newStaff, error: staffError } = await supabase
      .from('barbershop_staff')
      .insert({
        barbershop_id: barbershopId,
        user_id: userId,
        role: staffData.role || 'barber',
        is_active: true,
        financial_model: staffData.financial_model || 'commission',
        commission_rate: staffData.commission_rate || 0.5,
        booth_rent_amount: staffData.booth_rent_amount || null,
        schedule_type: staffData.schedule_type || 'full_time',
        permissions: getDefaultPermissions(staffData.role || 'barber')
      })
      .select('*')
      .single()

    if (staffError) {
      console.error('Staff creation error:', staffError)
      return NextResponse.json({ error: 'Failed to create staff member' }, { status: 400 })
    }

    // Fetch the user profile to include in response
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()

    const staffWithProfile = {
      ...newStaff,
      user: userProfile || null
    }

    return NextResponse.json(staffWithProfile)

  } catch (error) {
    console.error('Error in POST /api/shop/staff:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function for default permissions
function getDefaultPermissions(role) {
  switch(role) {
    case 'manager':
      return {
        can_manage_appointments: true,
        can_manage_customers: true,
        can_view_reports: true,
        can_manage_inventory: true,
        can_manage_staff: false,
        can_manage_settings: false
      }
    case 'receptionist':
      return {
        can_manage_appointments: true,
        can_manage_customers: true,
        can_view_reports: false,
        can_manage_inventory: false,
        can_manage_staff: false,
        can_manage_settings: false
      }
    default: // barber
      return {
        can_manage_appointments: true,
        can_manage_customers: false,
        can_view_reports: false,
        can_manage_inventory: false,
        can_manage_staff: false,
        can_manage_settings: false
      }
  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withProfileValidation } from '@/middleware/profile-validation'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check for barbershop association - multiple ways a user can be associated
    let barbershopId = null;
    let barbershopData = null;

    // 1. Direct shop_id in profile (individual barber subscription)
    if (profile.barbershop_id) {
      barbershopId = profile.barbershop_id;
      const { data: shopData } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', profile.barbershop_id)
        .single();
      barbershopData = shopData;
    }
    // 2. Barbershop_id field (alternative field name)
    else if (profile.barbershop_id) {
      barbershopId = profile.barbershop_id;
      const { data: shopData } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', profile.barbershop_id)
        .single();
      barbershopData = shopData;
    }
    // 3. Skip barbershop_staff table to avoid 406 errors
    // Staff associations should be managed through profiles table
    else {
      // No barbershop association found
      barbershopId = null;
      barbershopData = null;
    }

    // Add barbershop info to profile response
    profile.barbershop_id = barbershopId;
    profile.barbershop = barbershopData;

    return NextResponse.json(profile)

  } catch (error) {
    console.error('Error in GET /api/profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Wrap PUT/PATCH requests with profile validation middleware
// @ts-ignore - TypeScript strict mode conflict with middleware wrapper  
export const PUT = withProfileValidation(async function PUT(request, context) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate user can update this profile
    if (body.id && body.id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized profile update' }, { status: 403 })
    }

    // Update profile with validated data
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        ...body,
        id: user.id, // Ensure we're updating the correct profile
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json(updatedProfile)

  } catch (error) {
    console.error('Error in PUT /api/profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// Alias PATCH to PUT for flexibility
export const PATCH = PUT
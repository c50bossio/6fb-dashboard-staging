import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Profile Update API
 *
 * Updates user profile information including avatar_url
 *
 * @route POST /api/profile/update
 * @access Authenticated users only
 *
 * @body {
 *   avatar_url?: string,
 *   full_name?: string,
 *   phone?: string,
 *   bio?: string
 * }
 *
 * @returns {Object} Updated profile data
 */
export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { avatar_url, full_name, phone, bio } = body

    // Build update object with only provided fields
    const updates = {
      updated_at: new Date().toISOString()
    }

    if (avatar_url !== undefined) updates.avatar_url = avatar_url
    if (full_name !== undefined) updates.full_name = full_name
    if (phone !== undefined) updates.phone = phone
    if (bio !== undefined) updates.bio = bio

    // Validate at least one field is being updated
    if (Object.keys(updates).length === 1) { // Only updated_at
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    console.log('[Profile Update] Updating profile for user:', user.id, updates)

    // Update profile in database
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('[Profile Update] Database error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Profile Update] Profile updated successfully:', profile.id)

    // Return updated profile
    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        phone: profile.phone,
        bio: profile.bio,
        role: profile.role,
        updated_at: profile.updated_at
      }
    })

  } catch (error) {
    console.error('[Profile Update] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Get current user profile
 *
 * @route GET /api/profile/update
 * @access Authenticated users only
 *
 * @returns {Object} Current profile data
 */
export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Get profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Profile Get] Database error:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        phone: profile.phone,
        bio: profile.bio,
        role: profile.role,
        barbershop_id: profile.barbershop_id,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }
    })

  } catch (error) {
    console.error('[Profile Get] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

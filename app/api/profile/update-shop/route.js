import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Using Node.js runtime for better debugging
// export const runtime = 'edge'

export async function POST(request) {
  try {
    // Use service role key to bypass RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

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

    // Parse request body
    const { barbershop_id } = await request.json()

    if (!barbershop_id) {
      return NextResponse.json(
        { error: 'Barbershop ID required' },
        { status: 400 }
      )
    }

    // Get user's profile to verify organization
    const userId = user?.id
    if (!userId && !isDevelopment) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      )
    }

    // In development, use the test user if no authenticated user
    let profileUserId = userId
    if (isDevelopment && !userId) {
      const { data: devProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'c50bossio@gmail.com')
        .single()
      profileUserId = devProfile?.id
    }

    if (!profileUserId) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get user's current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', profileUserId)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Verify the shop belongs to the user's organization (security check)
    if (!isDevelopment && profile.organization_id) {
      const { data: shop, error: shopError } = await supabase
        .from('barbershops')
        .select('organization_id')
        .eq('id', barbershop_id)
        .single()

      if (shopError || !shop) {
        return NextResponse.json(
          { error: 'Shop not found' },
          { status: 404 }
        )
      }

      if (shop.organization_id !== profile.organization_id) {
        return NextResponse.json(
          { error: 'Forbidden - Shop does not belong to your organization' },
          { status: 403 }
        )
      }
    }

    // Update the user's last_selected_shop_id
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ last_selected_shop_id: barbershop_id })
      .eq('id', profileUserId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update shop selection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Shop selection updated',
      last_selected_shop_id: barbershop_id,
      profile: updatedProfile
    })

  } catch (error) {
    console.error('Error in /api/profile/update-shop:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

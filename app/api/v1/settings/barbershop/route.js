import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

/**
 * GET /api/v1/settings/barbershop
 * Fetches barbershop settings for the authenticated user
 */
export async function GET(request) {
  try {
    const supabase = createClient()

    // Get user from auth session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile to determine shop ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    const shopId = profile?.barbershop_id

    if (!shopId) {
      return NextResponse.json(
        { error: 'No barbershop associated with user' },
        { status: 404 }
      )
    }

    // Fetch barbershop data
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (shopError) {
      console.error('Error fetching barbershop:', shopError)
      return NextResponse.json(
        { error: 'Failed to fetch barbershop data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      barbershop: {
        id: barbershop.id,
        name: barbershop.name,
        address: barbershop.address,
        phone: barbershop.phone,
        email: barbershop.email,
        timezone: barbershop.timezone || 'America/New_York',
        city: barbershop.city,
        state: barbershop.state,
        zipcode: barbershop.zipcode,
        country: barbershop.country || 'US',
        description: barbershop.description,
        website: barbershop.website,
        instagram: barbershop.instagram,
        facebook: barbershop.facebook
      },
      notifications: {
        emailEnabled: barbershop.email_notifications_enabled ?? true,
        smsEnabled: barbershop.sms_notifications_enabled ?? true,
        campaignAlerts: barbershop.campaign_alerts_enabled ?? true,
        bookingAlerts: barbershop.booking_alerts_enabled ?? true,
        systemAlerts: barbershop.system_alerts_enabled ?? true
      }
    })
  } catch (error) {
    console.error('Barbershop Settings API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/settings/barbershop
 * Updates barbershop settings for the authenticated user
 */
export async function PUT(request) {
  try {
    const supabase = createClient()
    const body = await request.json()

    // Get user from auth session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile to determine shop ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id, role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    const shopId = profile?.shop_id || profile?.barbershop_id

    if (!shopId) {
      return NextResponse.json(
        { error: 'No barbershop associated with user' },
        { status: 404 }
      )
    }

    // Verify user has permission to update (shop owner, enterprise owner, or admin)
    const allowedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN']
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update barbershop settings' },
        { status: 403 }
      )
    }

    // Build update object with only provided fields
    const updateData = {
      updated_at: new Date().toISOString()
    }

    // Barbershop information fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.address !== undefined) updateData.address = body.address
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.email !== undefined) updateData.email = body.email
    if (body.timezone !== undefined) updateData.timezone = body.timezone
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.zipcode !== undefined) updateData.zipcode = body.zipcode
    if (body.country !== undefined) updateData.country = body.country
    if (body.description !== undefined) updateData.description = body.description
    if (body.website !== undefined) updateData.website = body.website
    if (body.instagram !== undefined) updateData.instagram = body.instagram
    if (body.facebook !== undefined) updateData.facebook = body.facebook

    // Notification preferences
    if (body.notifications) {
      if (body.notifications.emailEnabled !== undefined) {
        updateData.email_notifications_enabled = body.notifications.emailEnabled
      }
      if (body.notifications.smsEnabled !== undefined) {
        updateData.sms_notifications_enabled = body.notifications.smsEnabled
      }
      if (body.notifications.campaignAlerts !== undefined) {
        updateData.campaign_alerts_enabled = body.notifications.campaignAlerts
      }
      if (body.notifications.bookingAlerts !== undefined) {
        updateData.booking_alerts_enabled = body.notifications.bookingAlerts
      }
      if (body.notifications.systemAlerts !== undefined) {
        updateData.system_alerts_enabled = body.notifications.systemAlerts
      }
    }

    // Update barbershop data
    const { error: updateError } = await supabase
      .from('barbershops')
      .update(updateData)
      .eq('id', shopId)

    if (updateError) {
      console.error('Error updating barbershop:', updateError)
      return NextResponse.json(
        { error: 'Failed to update barbershop settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Barbershop settings updated successfully'
    })
  } catch (error) {
    console.error('Barbershop Settings API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

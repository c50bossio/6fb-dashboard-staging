import { createClient } from '@/lib/supabase/server'
import { success, unauthorized, notFound, forbidden, serverError } from '@/lib/api-response'

// GET /api/v1/settings/barbershop - Fetch barbershop settings
export async function GET(request) {
  try {
    const supabase = await createClient()

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile to find barbershop_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.barbershop_id) {
      console.error('Profile not found or missing barbershop_id:', profileError)
      return notFound('User profile not found or missing barbershop')
    }

    // Fetch barbershop settings
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', profile.barbershop_id)
      .single()

    if (barbershopError) {
      console.error('Error fetching barbershop:', barbershopError)
      return serverError('Failed to fetch barbershop settings', barbershopError)
    }

    // Return settings
    return success({
      barbershop: {
        name: barbershop.name,
        address: barbershop.address,
        phone: barbershop.phone,
        email: barbershop.email,
        timezone: barbershop.timezone || 'America/New_York'
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: true,
        campaignAlerts: true,
        bookingAlerts: true,
        systemAlerts: true
      }
    })

  } catch (error) {
    console.error('Error in GET /api/v1/settings/barbershop:', error)
    return serverError('Internal server error', error)
  }
}

// PUT /api/v1/settings/barbershop - Update barbershop settings
export async function PUT(request) {
  try {
    const supabase = await createClient()

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return unauthorized('Authentication required')
    }

    // Get user's profile to find barbershop_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.barbershop_id) {
      return notFound('User profile not found or missing barbershop')
    }

    // Check if user has permission to update settings
    if (profile.role !== 'SHOP_OWNER' && profile.role !== 'SUPER_ADMIN') {
      return forbidden('Only shop owners and admins can update settings')
    }

    const body = await request.json()

    // Update barbershop settings
    const { data: updatedBarbershop, error: updateError } = await supabase
      .from('barbershops')
      .update({
        name: body.name,
        address: body.address,
        phone: body.phone,
        email: body.email,
        timezone: body.timezone,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.barbershop_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating barbershop:', updateError)
      return serverError('Failed to update barbershop settings', updateError)
    }

    return success({
      message: 'Barbershop settings updated successfully',
      barbershop: updatedBarbershop
    })

  } catch (error) {
    console.error('Error in PUT /api/v1/settings/barbershop:', error)
    return serverError('Internal server error', error)
  }
}
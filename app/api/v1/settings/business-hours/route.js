import { createClient } from '@/lib/supabase/server'
import { success, unauthorized, notFound, forbidden, serverError } from '@/lib/api-response'

// Default business hours structure
const DEFAULT_BUSINESS_HOURS = {
  monday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
  tuesday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
  wednesday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
  thursday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
  friday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
  saturday: { enabled: true, shifts: [{ open: '10:00', close: '16:00' }] },
  sunday: { enabled: false, shifts: [] }
}

// GET /api/v1/settings/business-hours - Fetch business hours
export async function GET(request) {
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
      .select('barbershop_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.barbershop_id) {
      return notFound('User profile not found or missing barbershop')
    }

    // Fetch business hours from barbershops table
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('business_hours')
      .eq('id', profile.barbershop_id)
      .single()

    if (barbershopError) {
      console.error('Error fetching business hours:', barbershopError)
      return serverError('Failed to fetch business hours', barbershopError)
    }

    // Return business hours or default if not set
    return success(barbershop?.business_hours || DEFAULT_BUSINESS_HOURS)

  } catch (error) {
    console.error('Error in GET /api/v1/settings/business-hours:', error)
    return serverError('Internal server error', error)
  }
}

// PUT /api/v1/settings/business-hours - Update business hours
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

    const businessHours = await request.json()

    // Update business hours in barbershops table
    const { data: updatedBarbershop, error: updateError } = await supabase
      .from('barbershops')
      .update({
        business_hours: businessHours,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.barbershop_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating business hours:', updateError)
      return serverError('Failed to update business hours', updateError)
    }

    return success({
      message: 'Business hours updated successfully',
      business_hours: updatedBarbershop.business_hours
    })

  } catch (error) {
    console.error('Error in PUT /api/v1/settings/business-hours:', error)
    return serverError('Internal server error', error)
  }
}
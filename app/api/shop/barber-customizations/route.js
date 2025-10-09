import { authenticateShopOwnerStrict } from '@/lib/shop-auth'
import { success, badRequest, notFound, serverError } from '@/lib/api-response'

export const runtime = 'edge'

/**
 * GET /api/shop/barber-customizations - List barber customizations in shop
 *
 * Query Parameters:
 * - approval_status: 'pending' | 'approved' | 'rejected' (optional, filter by approval status)
 * - barber_id: UUID (optional, filter by specific barber)
 *
 * Response:
 * {
 *   customizations: [{
 *     id, barber_id, barber_name, barber_email, custom_url_slug, display_name,
 *     bio, profile_image_url, cover_image_url, specialties, social_media_links,
 *     custom_brand_color, is_accepting_bookings, is_approved, approved_at,
 *     approved_by, approved_by_name, rejection_reason, created_at, updated_at
 *   }],
 *   summary: { total, pending, approved, rejected }
 * }
 */
export async function GET(request) {
  try {
    const { shop, supabase } = await authenticateShopOwnerStrict(request, {
      allowDevBypass: true
    })

    const { searchParams } = new URL(request.url)
    const approval_status = searchParams.get('approval_status')
    const barber_id = searchParams.get('barber_id')

    // Build query to fetch customizations in this shop
    let query = supabase
      .from('barber_customizations')
      .select(`
        id,
        barber_id,
        custom_url_slug,
        display_name,
        bio,
        profile_image_url,
        cover_image_url,
        specialties,
        social_media_links,
        custom_brand_color,
        is_accepting_bookings,
        requires_shop_approval,
        is_approved,
        approved_at,
        approved_by,
        rejection_reason,
        created_at,
        updated_at,
        barber_profile:profiles!barber_customizations_barber_id_fkey(id, full_name, email, phone),
        approver_profile:profiles!barber_customizations_approved_by_fkey(id, full_name)
      `)
      .eq('barbershop_id', shop.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (barber_id) {
      query = query.eq('barber_id', barber_id)
    }

    if (approval_status) {
      if (approval_status === 'pending') {
        query = query.eq('is_approved', false).is('approved_at', null)
      } else if (approval_status === 'approved') {
        query = query.eq('is_approved', true)
      } else if (approval_status === 'rejected') {
        query = query.eq('is_approved', false).not('rejection_reason', 'is', null)
      } else {
        return badRequest('Invalid approval_status. Use: pending, approved, or rejected')
      }
    }

    const { data: customizations, error } = await query

    if (error) {
      console.error('[Shop Customizations API] Query failed:', error)
      return serverError('Failed to fetch customizations', error)
    }

    // Return empty array if no customizations found
    if (!customizations || customizations.length === 0) {
      return success({
        customizations: [],
        summary: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        }
      })
    }

    // Transform and enrich data
    const enrichedCustomizations = customizations.map(c => ({
      id: c.id,
      barber_id: c.barber_id,
      barber_name: c.barber_profile?.full_name || null,
      barber_email: c.barber_profile?.email || null,
      barber_phone: c.barber_profile?.phone || null,
      custom_url_slug: c.custom_url_slug,
      display_name: c.display_name,
      bio: c.bio,
      profile_image_url: c.profile_image_url,
      cover_image_url: c.cover_image_url,
      specialties: c.specialties,
      social_media_links: c.social_media_links,
      custom_brand_color: c.custom_brand_color,
      is_accepting_bookings: c.is_accepting_bookings,
      requires_shop_approval: c.requires_shop_approval,
      is_approved: c.is_approved,
      approved_at: c.approved_at,
      approved_by: c.approved_by,
      approved_by_name: c.approver_profile?.full_name || null,
      rejection_reason: c.rejection_reason,
      created_at: c.created_at,
      updated_at: c.updated_at
    }))

    // Calculate summary statistics
    const summary = {
      total: enrichedCustomizations.length,
      pending: enrichedCustomizations.filter(c => !c.is_approved && !c.rejection_reason).length,
      approved: enrichedCustomizations.filter(c => c.is_approved).length,
      rejected: enrichedCustomizations.filter(c => !c.is_approved && c.rejection_reason).length
    }

    return success({
      customizations: enrichedCustomizations,
      summary
    })

  } catch (error) {
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Shop Customizations API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

/**
 * PATCH /api/shop/barber-customizations - Approve or reject a customization
 *
 * Request Body:
 * {
 *   customization_id: string (required),
 *   action: 'approve' | 'reject' (required),
 *   rejection_reason: string (required if action=reject, min 10 characters)
 * }
 *
 * Response:
 * {
 *   customization: { id, is_approved, approved_at, approved_by, rejection_reason },
 *   message: string
 * }
 */
export async function PATCH(request) {
  try {
    const { shop, profile, supabase } = await authenticateShopOwnerStrict(request, {
      allowDevBypass: true
    })

    // Parse request body
    const { customization_id, action, rejection_reason } = await request.json()

    // Validation: required fields
    if (!customization_id) {
      return badRequest('customization_id is required')
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return badRequest('action is required and must be "approve" or "reject"')
    }

    if (action === 'reject' && (!rejection_reason || rejection_reason.trim().length < 10)) {
      return badRequest('rejection_reason is required for rejections and must be at least 10 characters')
    }

    // Get existing customization and verify it belongs to this shop
    const { data: existing, error: fetchError } = await supabase
      .from('barber_customizations')
      .select('id, barber_id, barbershop_id, display_name, is_approved, requires_shop_approval')
      .eq('id', customization_id)
      .single()

    if (fetchError || !existing) {
      return notFound('Customization not found')
    }

    // Verify customization belongs to this shop
    if (existing.barbershop_id !== shop.id) {
      return badRequest('This customization does not belong to your shop')
    }

    // Verify customization requires approval
    if (!existing.requires_shop_approval) {
      return badRequest('This customization does not require shop approval')
    }

    // Prepare update based on action
    let updateData
    let successMessage

    if (action === 'approve') {
      updateData = {
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: profile.id,
        rejection_reason: null, // Clear any previous rejection
        updated_at: new Date().toISOString()
      }
      successMessage = 'Customization approved successfully'
    } else {
      // action === 'reject'
      updateData = {
        is_approved: false,
        approved_at: null,
        approved_by: null,
        rejection_reason: rejection_reason.trim(),
        updated_at: new Date().toISOString()
      }
      successMessage = 'Customization rejected'
    }

    // Update customization
    const { data: updated, error: updateError } = await supabase
      .from('barber_customizations')
      .update(updateData)
      .eq('id', customization_id)
      .select(`
        id,
        barber_id,
        display_name,
        is_approved,
        approved_at,
        approved_by,
        rejection_reason,
        barber_profile:profiles!barber_customizations_barber_id_fkey(full_name, email)
      `)
      .single()

    if (updateError) {
      console.error('[Shop Customizations API] Update failed:', updateError)
      return serverError('Failed to update customization', updateError)
    }

    return success({
      customization: {
        id: updated.id,
        barber_id: updated.barber_id,
        barber_name: updated.barber_profile?.full_name || null,
        barber_email: updated.barber_profile?.email || null,
        display_name: updated.display_name,
        is_approved: updated.is_approved,
        approved_at: updated.approved_at,
        approved_by: updated.approved_by,
        rejection_reason: updated.rejection_reason
      },
      message: successMessage
    })

  } catch (error) {
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Shop Customizations API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

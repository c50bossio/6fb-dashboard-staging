import { authenticateBarberOrOwner } from '@/lib/shop-auth'
import { success, badRequest, notFound, serverError } from '@/lib/api-response'

export const runtime = 'edge'

/**
 * GET /api/barber/customization - Get barber's customization profile
 *
 * Response:
 * {
 *   customization: {
 *     id, barber_id, custom_url_slug, display_name, bio,
 *     profile_image_url, cover_image_url, specialties, social_media_links,
 *     custom_brand_color, is_accepting_bookings, is_approved, approved_at
 *   } | null
 * }
 */
export async function GET(request) {
  try {
    const { profile, supabase } = await authenticateBarberOrOwner(request, {
      allowDevBypass: true
    })

    // Get barber's customization
    const { data: customization, error } = await supabase
      .from('barber_customizations')
      .select('*')
      .eq('barber_id', profile.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Customization API] Query failed:', error)
      return serverError('Failed to fetch customization', error)
    }

    return success({
      customization: customization || null
    })

  } catch (error) {
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Customization API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

/**
 * POST /api/barber/customization - Create barber's customization profile
 *
 * Request Body:
 * {
 *   custom_url_slug: string (required, lowercase alphanumeric with hyphens),
 *   display_name: string (required),
 *   bio: string (optional),
 *   profile_image_url: string (optional),
 *   cover_image_url: string (optional),
 *   specialties: string[] (optional),
 *   social_media_links: object (optional),
 *   custom_brand_color: string (optional, hex color),
 *   is_accepting_bookings: boolean (optional, default true)
 * }
 */
export async function POST(request) {
  try {
    const { profile, shop, supabase } = await authenticateBarberOrOwner(request, {
      allowDevBypass: true
    })

    // Parse request body
    const {
      custom_url_slug,
      display_name,
      bio,
      profile_image_url,
      cover_image_url,
      specialties,
      social_media_links,
      custom_brand_color,
      is_accepting_bookings
    } = await request.json()

    // Validation: required fields
    if (!custom_url_slug || !display_name) {
      return badRequest('custom_url_slug and display_name are required')
    }

    // Validation: slug format (lowercase alphanumeric with hyphens)
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(custom_url_slug)) {
      return badRequest('custom_url_slug must be lowercase alphanumeric with hyphens only')
    }

    // Validation: slug uniqueness (across entire system)
    const { data: existingSlug, error: slugError } = await supabase
      .from('barber_customizations')
      .select('id')
      .eq('custom_url_slug', custom_url_slug)
      .single()

    if (existingSlug) {
      return badRequest('custom_url_slug is already taken')
    }

    // Validation: hex color format (if provided)
    if (custom_brand_color) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/
      if (!colorRegex.test(custom_brand_color)) {
        return badRequest('custom_brand_color must be a valid hex color (e.g., #FF5733)')
      }
    }

    // Check if barber already has a customization
    const { data: existing } = await supabase
      .from('barber_customizations')
      .select('id')
      .eq('barber_id', profile.id)
      .single()

    if (existing) {
      return badRequest('Customization already exists. Use PATCH to update.')
    }

    // Create customization
    const { data: customization, error: insertError } = await supabase
      .from('barber_customizations')
      .insert({
        barber_id: profile.id,
        barbershop_id: shop.id,
        custom_url_slug,
        display_name,
        bio: bio || null,
        profile_image_url: profile_image_url || null,
        cover_image_url: cover_image_url || null,
        specialties: specialties || null,
        social_media_links: social_media_links || null,
        custom_brand_color: custom_brand_color || null,
        is_accepting_bookings: is_accepting_bookings !== undefined ? is_accepting_bookings : true,
        requires_shop_approval: true,
        is_approved: false // Pending approval by default
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Customization API] Insert failed:', insertError)
      return serverError('Failed to create customization', insertError)
    }

    return success({
      customization,
      message: 'Customization created successfully. Pending shop owner approval.'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Customization API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

/**
 * PATCH /api/barber/customization - Update barber's customization profile
 *
 * Request Body: (same as POST, all fields optional)
 *
 * Note: Updates reset approval status if requires_shop_approval is true
 */
export async function PATCH(request) {
  try {
    const { profile, supabase } = await authenticateBarberOrOwner(request, {
      allowDevBypass: true
    })

    // Get existing customization
    const { data: existing, error: fetchError } = await supabase
      .from('barber_customizations')
      .select('*')
      .eq('barber_id', profile.id)
      .single()

    if (fetchError || !existing) {
      return notFound('Customization not found. Use POST to create one.')
    }

    // Parse request body
    const updates = await request.json()

    // Validation: slug format (if provided)
    if (updates.custom_url_slug) {
      const slugRegex = /^[a-z0-9-]+$/
      if (!slugRegex.test(updates.custom_url_slug)) {
        return badRequest('custom_url_slug must be lowercase alphanumeric with hyphens only')
      }

      // Validation: slug uniqueness (if changing)
      if (updates.custom_url_slug !== existing.custom_url_slug) {
        const { data: existingSlug } = await supabase
          .from('barber_customizations')
          .select('id')
          .eq('custom_url_slug', updates.custom_url_slug)
          .single()

        if (existingSlug) {
          return badRequest('custom_url_slug is already taken')
        }
      }
    }

    // Validation: hex color format (if provided)
    if (updates.custom_brand_color) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/
      if (!colorRegex.test(updates.custom_brand_color)) {
        return badRequest('custom_brand_color must be a valid hex color (e.g., #FF5733)')
      }
    }

    // Determine if approval reset is needed
    const needsReapproval = existing.requires_shop_approval && (
      updates.custom_url_slug ||
      updates.display_name ||
      updates.bio ||
      updates.profile_image_url ||
      updates.cover_image_url ||
      updates.custom_brand_color
    )

    // Update customization
    const { data: customization, error: updateError } = await supabase
      .from('barber_customizations')
      .update({
        ...updates,
        // Reset approval if significant changes made
        is_approved: needsReapproval ? false : existing.is_approved,
        approved_at: needsReapproval ? null : existing.approved_at,
        approved_by: needsReapproval ? null : existing.approved_by,
        updated_at: new Date().toISOString()
      })
      .eq('barber_id', profile.id)
      .select()
      .single()

    if (updateError) {
      console.error('[Customization API] Update failed:', updateError)
      return serverError('Failed to update customization', updateError)
    }

    return success({
      customization,
      message: needsReapproval
        ? 'Customization updated. Pending shop owner approval.'
        : 'Customization updated successfully.'
    })

  } catch (error) {
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Customization API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

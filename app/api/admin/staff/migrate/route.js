import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, getUserProfile } from '@/lib/auth-middleware'

/**
 * Migration API for converting existing barbers to new slug-based system
 *
 * GET /api/admin/staff/migrate?dry_run=true - Preview migration without changes
 * POST /api/admin/staff/migrate - Execute migration
 */

/**
 * Generate booking slug from name
 */
function generateBookingSlug(firstName, lastName) {
  return `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * GET - Preview migration (dry run)
 */
export const GET = withAuth(async (request) => {
  try {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin access
    const profile = await getUserProfile(user.id)
    if (!profile || (profile.role !== 'SHOP_OWNER' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' },
        { status: 403 }
      )
    }

    // Get all barbers without booking_slug
    const { data: barbersToMigrate, error: fetchError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('barbershop_id', profile.barbershop_id)
      .eq('role', 'BARBER')
      .or('booking_slug.is.null,booking_slug.eq.')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching barbers:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch barbers' },
        { status: 500 }
      )
    }

    if (!barbersToMigrate || barbersToMigrate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No barbers need migration',
        preview: [],
        count: 0,
      })
    }

    // Get all existing slugs to check for conflicts
    const { data: existingSlugs } = await supabase
      .from('profiles')
      .select('booking_slug')
      .not('booking_slug', 'is', null)
      .neq('booking_slug', '')

    const slugSet = new Set(existingSlugs?.map((p) => p.booking_slug) || [])
    const usedSlugs = new Map() // Track slugs used in this migration batch

    // Generate preview
    const preview = barbersToMigrate.map((barber) => {
      let baseSlug = generateBookingSlug(barber.first_name, barber.last_name)
      let finalSlug = baseSlug
      let suffix = 2

      // Check for conflicts and append number if needed
      while (slugSet.has(finalSlug) || usedSlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${suffix}`
        suffix++
      }

      usedSlugs.set(finalSlug, true)

      return {
        id: barber.id,
        name: `${barber.first_name} ${barber.last_name}`,
        email: barber.email,
        old_url: `/book/${barber.id}`,
        new_slug: finalSlug,
        new_url: `/book/${finalSlug}`,
        has_conflict: finalSlug !== baseSlug,
      }
    })

    return NextResponse.json({
      success: true,
      preview,
      count: preview.length,
      message: `${preview.length} barber${preview.length !== 1 ? 's' : ''} ready for migration`,
    })
  } catch (error) {
    console.error('Migration preview error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * POST - Execute migration
 */
export const POST = withAuth(async (request) => {
  try {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin access
    const profile = await getUserProfile(user.id)
    if (!profile || (profile.role !== 'SHOP_OWNER' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' },
        { status: 403 }
      )
    }

    // Get all barbers without booking_slug
    const { data: barbersToMigrate, error: fetchError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('barbershop_id', profile.barbershop_id)
      .eq('role', 'BARBER')
      .or('booking_slug.is.null,booking_slug.eq.')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching barbers:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch barbers' },
        { status: 500 }
      )
    }

    if (!barbersToMigrate || barbersToMigrate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No barbers need migration',
        migrated: [],
        count: 0,
      })
    }

    // Get all existing slugs to check for conflicts
    const { data: existingSlugs } = await supabase
      .from('profiles')
      .select('booking_slug')
      .not('booking_slug', 'is', null)
      .neq('booking_slug', '')

    const slugSet = new Set(existingSlugs?.map((p) => p.booking_slug) || [])
    const usedSlugs = new Map()

    // Execute migration
    const results = []
    const errors = []

    for (const barber of barbersToMigrate) {
      try {
        let baseSlug = generateBookingSlug(barber.first_name, barber.last_name)
        let finalSlug = baseSlug
        let suffix = 2

        // Check for conflicts and append number if needed
        while (slugSet.has(finalSlug) || usedSlugs.has(finalSlug)) {
          finalSlug = `${baseSlug}-${suffix}`
          suffix++
        }

        // Update the profile with the new slug
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ booking_slug: finalSlug })
          .eq('id', barber.id)

        if (updateError) {
          console.error(`Error updating barber ${barber.id}:`, updateError)
          errors.push({
            barber_id: barber.id,
            name: `${barber.first_name} ${barber.last_name}`,
            error: updateError.message,
          })
        } else {
          slugSet.add(finalSlug)
          usedSlugs.set(finalSlug, true)

          results.push({
            id: barber.id,
            name: `${barber.first_name} ${barber.last_name}`,
            email: barber.email,
            old_url: `/book/${barber.id}`,
            new_slug: finalSlug,
            new_url: `/book/${finalSlug}`,
            has_conflict: finalSlug !== baseSlug,
          })
        }
      } catch (err) {
        console.error(`Error processing barber ${barber.id}:`, err)
        errors.push({
          barber_id: barber.id,
          name: `${barber.first_name} ${barber.last_name}`,
          error: err.message,
        })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      migrated: results,
      count: results.length,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length === 0
        ? `Successfully migrated ${results.length} barber${results.length !== 1 ? 's' : ''}`
        : `Migrated ${results.length} barber${results.length !== 1 ? 's' : ''} with ${errors.length} error${errors.length !== 1 ? 's' : ''}`,
    })
  } catch (error) {
    console.error('Migration execution error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})

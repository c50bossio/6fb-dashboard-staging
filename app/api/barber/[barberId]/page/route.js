import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// GET - Retrieve barber page settings
export async function GET(request, { params }) {
  try {
    const supabase = createClient()
    const { barberId } = params

    // Get current user - allow public access for viewing
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get barber page customization
    const { data: pageData, error: pageError } = await supabase
      .from('barber_page_customization')
      .select(`
        *,
        barbershop:barbershops(id, name, slug),
        user:users(id, full_name, email)
      `)
      .eq('user_id', barberId)
      .single()

    if (pageError && pageError.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching barber page:', pageError)
      return NextResponse.json({ error: 'Failed to fetch page settings' }, { status: 500 })
    }

    // Get barber profile info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', barberId)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    // Get barber's services
    const { data: services, error: servicesError } = await supabase
      .from('barber_services')
      .select(`
        *,
        service:services(*)
      `)
      .eq('barber_id', barberId)
      .eq('is_active', true)

    // Get barber's availability
    const { data: availability, error: availError } = await supabase
      .from('barber_availability')
      .select('*')
      .eq('barber_id', barberId)
      .order('day_of_week')

    // Get barber's reviews if published
    let reviews = []
    if (pageData?.show_reviews && pageData?.is_published) {
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*')
        .eq('barber_id', barberId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10)
      
      reviews = reviewData || []
    }

    // If no page customization exists, return defaults
    if (!pageData) {
      return NextResponse.json({
        data: {
          user_id: barberId,
          barbershop_id: profile.barbershop_id,
          display_name: profile.full_name,
          title: profile.role === 'BARBER' ? 'Professional Barber' : 'Master Barber',
          bio: profile.bio || '',
          slug: profile.full_name?.toLowerCase().replace(/\s+/g, '-') || barberId,
          // Default settings
          show_booking_button: true,
          show_portfolio: true,
          show_services: true,
          show_availability: true,
          show_reviews: true,
          show_contact_info: false,
          portfolio_layout: 'grid',
          service_display_style: 'list',
          availability_display_type: 'calendar',
          is_published: false,
          page_approved: false,
          // Data
          services: services || [],
          availability: availability || [],
          reviews: reviews,
          specialties: profile.specialties || [],
          years_experience: profile.years_experience || 0
        }
      })
    }

    return NextResponse.json({ 
      data: {
        ...pageData,
        services: services || [],
        availability: availability || [],
        reviews: reviews
      }
    })

  } catch (error) {
    console.error('Error in GET /api/barber/[barberId]/page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST/PUT - Save barber page settings
export async function POST(request, { params }) {
  try {
    const supabase = createClient()
    const { barberId } = params
    const body = await request.json()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is either the barber or their shop owner/manager
    let canEdit = false
    let requiresApproval = false

    if (user.id === barberId) {
      // Barber editing their own page
      canEdit = true
      requiresApproval = true // Changes need shop approval
    } else {
      // Check if user is shop owner/manager
      const { data: barberProfile } = await supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', barberId)
        .single()

      if (barberProfile?.barbershop_id) {
        const { data: staffCheck } = await supabase
          .from('barbershop_staff')
          .select('role')
          .eq('barbershop_id', barberProfile.barbershop_id)
          .eq('user_id', user.id)
          .single()

        if (staffCheck && ['owner', 'manager'].includes(staffCheck.role)) {
          canEdit = true
          requiresApproval = false // Shop owners can approve directly
        }
      }
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get barbershop info
    const { data: barberProfile } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', barberId)
      .single()

    if (!barberProfile?.barbershop_id) {
      return NextResponse.json({ error: 'Barber must be associated with a barbershop' }, { status: 400 })
    }

    // Get barbershop website ID if exists
    const { data: shopWebsite } = await supabase
      .from('barbershop_websites')
      .select('id')
      .eq('barbershop_id', barberProfile.barbershop_id)
      .single()

    // Check if page record exists
    const { data: existing, error: checkError } = await supabase
      .from('barber_page_customization')
      .select('id')
      .eq('user_id', barberId)
      .eq('barbershop_id', barberProfile.barbershop_id)
      .single()

    // Prepare page data
    const pageData = {
      user_id: barberId,
      barbershop_id: barberProfile.barbershop_id,
      barbershop_website_id: shopWebsite?.id || null,
      slug: body.slug,
      page_title: body.page_title,
      meta_description: body.meta_description,
      can_override_branding: body.can_override_branding || false,
      custom_primary_color: body.custom_primary_color,
      custom_accent_color: body.custom_accent_color,
      hero_image_url: body.hero_image_url,
      hero_title: body.hero_title,
      hero_subtitle: body.hero_subtitle,
      show_booking_button: body.show_booking_button ?? true,
      display_name: body.display_name,
      title: body.title,
      bio: body.bio,
      years_experience: body.years_experience,
      specialties: body.specialties || [],
      certifications: body.certifications || [],
      languages_spoken: body.languages_spoken || [],
      awards: body.awards || [],
      show_portfolio: body.show_portfolio ?? true,
      portfolio_layout: body.portfolio_layout || 'grid',
      portfolio_images: body.portfolio_images || [],
      before_after_images: body.before_after_images || [],
      show_services: body.show_services ?? true,
      featured_services: body.featured_services || [],
      service_display_style: body.service_display_style || 'list',
      show_availability: body.show_availability ?? true,
      availability_display_type: body.availability_display_type || 'calendar',
      show_contact_info: body.show_contact_info ?? false,
      personal_phone: body.personal_phone,
      personal_email: body.personal_email,
      instagram_handle: body.instagram_handle,
      tiktok_handle: body.tiktok_handle,
      youtube_url: body.youtube_url,
      show_reviews: body.show_reviews ?? true,
      featured_reviews: body.featured_reviews || [],
      custom_sections: body.custom_sections || [],
      is_published: requiresApproval ? false : body.is_published, // Reset if needs approval
      page_approved: requiresApproval ? false : true,
      approved_by: requiresApproval ? null : user.id,
      approved_at: requiresApproval ? null : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let result
    if (existing && !checkError) {
      // Update existing record
      const { data, error } = await supabase
        .from('barber_page_customization')
        .update(pageData)
        .eq('user_id', barberId)
        .eq('barbershop_id', barberProfile.barbershop_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating barber page:', error)
        return NextResponse.json({ error: 'Failed to update page' }, { status: 500 })
      }
      result = data
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('barber_page_customization')
        .insert({
          ...pageData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating barber page:', error)
        return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
      }
      result = data
    }

    // Update profile with display info
    await supabase
      .from('profiles')
      .update({
        full_name: body.display_name || body.display_name,
        bio: body.bio,
        updated_at: new Date().toISOString()
      })
      .eq('id', barberId)

    // If barber is editing and needs approval, notify shop owner
    if (requiresApproval) {
      // TODO: Send notification to shop owner about pending approval
      return NextResponse.json({ 
        data: result,
        message: 'Page saved successfully. Awaiting shop approval before publishing.',
        requiresApproval: true
      })
    }

    return NextResponse.json({ 
      data: result,
      message: 'Page saved and published successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/barber/[barberId]/page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT is same as POST
export async function PUT(request, params) {
  return POST(request, params)
}

// PATCH - Approve/reject barber page (shop owners only)
export async function PATCH(request, { params }) {
  try {
    const supabase = createClient()
    const { barberId } = params
    const { action, notes } = await request.json()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get barber's barbershop
    const { data: barberProfile } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', barberId)
      .single()

    if (!barberProfile?.barbershop_id) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    // Verify user is shop owner/manager
    const { data: staffCheck } = await supabase
      .from('barbershop_staff')
      .select('role')
      .eq('barbershop_id', barberProfile.barbershop_id)
      .eq('user_id', user.id)
      .single()

    if (!staffCheck || !['owner', 'manager'].includes(staffCheck.role)) {
      return NextResponse.json({ error: 'Only shop owners can approve barber pages' }, { status: 403 })
    }

    // Update page approval status
    const updateData = {
      page_approved: action === 'approve',
      approved_by: action === 'approve' ? user.id : null,
      approved_at: action === 'approve' ? new Date().toISOString() : null,
      approval_notes: notes || null,
      is_published: action === 'approve', // Auto-publish on approval
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('barber_page_customization')
      .update(updateData)
      .eq('user_id', barberId)
      .eq('barbershop_id', barberProfile.barbershop_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating approval status:', error)
      return NextResponse.json({ error: 'Failed to update approval status' }, { status: 500 })
    }

    // TODO: Send notification to barber about approval/rejection

    return NextResponse.json({ 
      data,
      message: action === 'approve' 
        ? 'Barber page approved and published' 
        : 'Barber page rejected'
    })

  } catch (error) {
    console.error('Error in PATCH /api/barber/[barberId]/page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
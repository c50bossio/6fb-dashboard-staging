import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// GET - Retrieve shop website settings
export async function GET(request, { params }) {
  try {
    const supabase = createClient()
    const { shopId } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this shop
    const { data: staffCheck, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('role')
      .eq('barbershop_id', shopId)
      .eq('user_id', user.id)
      .single()

    if (staffError || !staffCheck || !['owner', 'manager'].includes(staffCheck.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get website settings
    const { data: website, error: websiteError } = await supabase
      .from('barbershop_websites')
      .select('*')
      .eq('barbershop_id', shopId)
      .single()

    if (websiteError && websiteError.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching website:', websiteError)
      return NextResponse.json({ error: 'Failed to fetch website settings' }, { status: 500 })
    }

    // Get barbershop info
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name, description, phone, email, address, city, state, zip_code')
      .eq('id', shopId)
      .single()

    if (shopError) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // If no website record exists, return defaults merged with shop info
    if (!website) {
      return NextResponse.json({
        data: {
          barbershop_id: shopId,
          name: barbershop.name,
          description: barbershop.description,
          phone: barbershop.phone,
          email: barbershop.email,
          address: barbershop.address,
          city: barbershop.city,
          state: barbershop.state,
          zip_code: barbershop.zip_code,
          // Default values
          tagline: '',
          slug: barbershop.name.toLowerCase().replace(/\s+/g, '-'),
          primary_color: '#3B82F6',
          secondary_color: '#1E40AF',
          accent_color: '#10B981',
          text_color: '#1F2937',
          background_color: '#FFFFFF',
          heading_font: 'Inter',
          body_font: 'Inter',
          theme_template: 'modern',
          enable_online_booking: true,
          show_pricing: true,
          show_portfolio: true,
          show_team: true,
          show_testimonials: true,
          is_published: false,
          business_hours: {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '09:00', close: '16:00', closed: false },
            sunday: { closed: true }
          }
        }
      })
    }

    return NextResponse.json({ data: website })

  } catch (error) {
    console.error('Error in GET /api/shop/[shopId]/website:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST/PUT - Save shop website settings
export async function POST(request, { params }) {
  try {
    const supabase = createClient()
    const { shopId } = params
    const body = await request.json()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this shop
    const { data: staffCheck, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('role')
      .eq('barbershop_id', shopId)
      .eq('user_id', user.id)
      .single()

    if (staffError || !staffCheck || !['owner', 'manager'].includes(staffCheck.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if website record exists
    const { data: existing, error: checkError } = await supabase
      .from('barbershop_websites')
      .select('id')
      .eq('barbershop_id', shopId)
      .single()

    // Prepare website data
    const websiteData = {
      barbershop_id: shopId,
      name: body.name,
      tagline: body.tagline,
      description: body.description,
      slug: body.slug,
      logo_url: body.logo_url,
      favicon_url: body.favicon_url,
      cover_image_url: body.cover_image_url,
      primary_color: body.primary_color,
      secondary_color: body.secondary_color,
      accent_color: body.accent_color,
      text_color: body.text_color,
      background_color: body.background_color,
      heading_font: body.heading_font,
      body_font: body.body_font,
      hero_title: body.hero_title,
      hero_subtitle: body.hero_subtitle,
      hero_cta_text: body.hero_cta_text,
      about_title: body.about_title,
      about_content: body.about_content,
      services_title: body.services_title,
      services_description: body.services_description,
      team_title: body.team_title,
      team_description: body.team_description,
      phone: body.phone,
      email: body.email,
      address: body.address,
      city: body.city,
      state: body.state,
      zip_code: body.zip_code,
      business_hours: body.business_hours,
      instagram_url: body.instagram_url,
      facebook_url: body.facebook_url,
      twitter_url: body.twitter_url,
      youtube_url: body.youtube_url,
      tiktok_url: body.tiktok_url,
      google_business_url: body.google_business_url,
      enable_online_booking: body.enable_online_booking,
      booking_widget_position: body.booking_widget_position,
      require_deposit: body.require_deposit,
      deposit_amount: body.deposit_amount,
      cancellation_policy: body.cancellation_policy,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      seo_keywords: body.seo_keywords,
      google_analytics_id: body.google_analytics_id,
      theme_template: body.theme_template,
      show_pricing: body.show_pricing,
      show_portfolio: body.show_portfolio,
      show_team: body.show_team,
      show_testimonials: body.show_testimonials,
      show_barber_pages: body.show_barber_pages,
      barber_page_template: body.barber_page_template,
      is_published: body.is_published,
      maintenance_mode: body.maintenance_mode,
      maintenance_message: body.maintenance_message,
      updated_at: new Date().toISOString()
    }

    let result
    if (existing && !checkError) {
      // Update existing record
      const { data, error } = await supabase
        .from('barbershop_websites')
        .update(websiteData)
        .eq('barbershop_id', shopId)
        .select()
        .single()

      if (error) {
        console.error('Error updating website:', error)
        return NextResponse.json({ error: 'Failed to update website' }, { status: 500 })
      }
      result = data
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('barbershop_websites')
        .insert({
          ...websiteData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating website:', error)
        return NextResponse.json({ error: 'Failed to create website' }, { status: 500 })
      }
      result = data
    }

    // Update barbershop table with basic info
    await supabase
      .from('barbershops')
      .update({
        name: body.name,
        description: body.description,
        phone: body.phone,
        email: body.email,
        address: body.address,
        city: body.city,
        state: body.state,
        zip_code: body.zip_code,
        updated_at: new Date().toISOString()
      })
      .eq('id', shopId)

    return NextResponse.json({ 
      data: result,
      message: 'Website settings saved successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/shop/[shopId]/website:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT is same as POST
export async function PUT(request, params) {
  return POST(request, params)
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// GET - Retrieve enterprise website settings
export async function GET(request, { params }) {
  try {
    const supabase = createClient()
    const { enterpriseId } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has enterprise access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || 
        profile.role !== 'ENTERPRISE_OWNER' || 
        profile.organization_id !== enterpriseId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get enterprise website settings
    const { data: website, error: websiteError } = await supabase
      .from('enterprise_websites')
      .select('*')
      .eq('organization_id', enterpriseId)
      .single()

    if (websiteError && websiteError.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching enterprise website:', websiteError)
      return NextResponse.json({ error: 'Failed to fetch website settings' }, { status: 500 })
    }

    // Get organization info
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, description')
      .eq('id', enterpriseId)
      .single()

    if (orgError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get associated barbershop locations
    const { data: locations, error: locError } = await supabase
      .from('barbershops')
      .select('id, name, address, city, state, phone, avg_rating')
      .eq('organization_id', enterpriseId)
      .order('name')

    // If no website record exists, return defaults
    if (!website) {
      return NextResponse.json({
        data: {
          organization_id: enterpriseId,
          name: organization.name,
          description: organization.description,
          tagline: 'Excellence Across Every Location',
          slug: organization.name.toLowerCase().replace(/\s+/g, '-'),
          locations: locations || [],
          // Default values
          primary_color: '#1E40AF',
          secondary_color: '#3B82F6',
          accent_color: '#10B981',
          text_color: '#1F2937',
          background_color: '#FFFFFF',
          heading_font: 'Montserrat',
          body_font: 'Inter',
          show_location_map: true,
          show_location_directory: true,
          enable_online_booking: true,
          enable_shop_comparison: false,
          is_published: false
        }
      })
    }

    return NextResponse.json({ 
      data: {
        ...website,
        locations: locations || []
      }
    })

  } catch (error) {
    console.error('Error in GET /api/enterprise/[enterpriseId]/website:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST/PUT - Save enterprise website settings
export async function POST(request, { params }) {
  try {
    const supabase = createClient()
    const { enterpriseId } = params
    const body = await request.json()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has enterprise access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || 
        profile.role !== 'ENTERPRISE_OWNER' || 
        profile.organization_id !== enterpriseId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if website record exists
    const { data: existing, error: checkError } = await supabase
      .from('enterprise_websites')
      .select('id')
      .eq('organization_id', enterpriseId)
      .single()

    // Prepare website data
    const websiteData = {
      organization_id: enterpriseId,
      name: body.name,
      tagline: body.tagline,
      description: body.description,
      custom_domain: body.custom_domain,
      subdomain: body.subdomain,
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
      about_content: body.about_content,
      mission_statement: body.mission_statement,
      show_location_map: body.show_location_map,
      show_location_directory: body.show_location_directory,
      enable_online_booking: body.enable_online_booking,
      enable_shop_comparison: body.enable_shop_comparison,
      instagram_url: body.instagram_url,
      facebook_url: body.facebook_url,
      twitter_url: body.twitter_url,
      youtube_url: body.youtube_url,
      tiktok_url: body.tiktok_url,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      seo_keywords: body.seo_keywords,
      google_analytics_id: body.google_analytics_id,
      is_published: body.is_published,
      updated_at: new Date().toISOString()
    }

    let result
    if (existing && !checkError) {
      // Update existing record
      const { data, error } = await supabase
        .from('enterprise_websites')
        .update(websiteData)
        .eq('organization_id', enterpriseId)
        .select()
        .single()

      if (error) {
        console.error('Error updating enterprise website:', error)
        return NextResponse.json({ error: 'Failed to update website' }, { status: 500 })
      }
      result = data
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('enterprise_websites')
        .insert({
          ...websiteData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating enterprise website:', error)
        return NextResponse.json({ error: 'Failed to create website' }, { status: 500 })
      }
      result = data
    }

    // Update organization basic info
    await supabase
      .from('organizations')
      .update({
        name: body.name,
        description: body.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', enterpriseId)

    // If publishing, update all child barbershop websites to inherit branding
    if (body.is_published && body.enforce_branding) {
      await supabase
        .from('barbershop_websites')
        .update({
          inherit_enterprise_branding: true,
          updated_at: new Date().toISOString()
        })
        .eq('enterprise_website_id', result.id)
    }

    return NextResponse.json({ 
      data: result,
      message: 'Enterprise website settings saved successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/enterprise/[enterpriseId]/website:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT is same as POST
export async function PUT(request, params) {
  return POST(request, params)
}

// GET analytics for enterprise website
export async function PATCH(request, { params }) {
  try {
    const supabase = createClient()
    const { enterpriseId } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has enterprise access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || 
        profile.role !== 'ENTERPRISE_OWNER' || 
        profile.organization_id !== enterpriseId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get website ID
    const { data: website, error: websiteError } = await supabase
      .from('enterprise_websites')
      .select('id')
      .eq('organization_id', enterpriseId)
      .single()

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Get analytics for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: analytics, error: analyticsError } = await supabase
      .from('website_analytics')
      .select('*')
      .eq('website_id', website.id)
      .eq('website_type', 'enterprise')
      .gte('metric_date', thirtyDaysAgo.toISOString())
      .order('metric_date', { ascending: false })

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    // Calculate aggregated metrics
    const totalViews = analytics.reduce((sum, day) => sum + (day.page_views || 0), 0)
    const totalVisitors = analytics.reduce((sum, day) => sum + (day.unique_visitors || 0), 0)
    const totalConversions = analytics.reduce((sum, day) => sum + (day.booking_conversions || 0), 0)
    const avgBounceRate = analytics.length > 0 
      ? analytics.reduce((sum, day) => sum + (day.bounce_rate || 0), 0) / analytics.length
      : 0

    return NextResponse.json({
      data: {
        analytics: analytics,
        summary: {
          total_page_views: totalViews,
          total_unique_visitors: totalVisitors,
          total_conversions: totalConversions,
          avg_bounce_rate: avgBounceRate,
          conversion_rate: totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0
        }
      }
    })

  } catch (error) {
    console.error('Error in PATCH /api/enterprise/[enterpriseId]/website:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
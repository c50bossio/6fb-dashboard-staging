import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function GET(request, { params }) {
  try {
    const supabase = createClient()
    const { shopId } = params

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 })
    }

    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select(`
        *,
        website_sections(*),
        barbershop_gallery(*),
        team_members(*),
        customer_testimonials(*)
      `)
      .eq('id', shopId)
      .single()

    if (shopError) {
      console.error('Error fetching barbershop:', shopError)
      return NextResponse.json({ error: 'Barbershop not found' }, { status: 404 })
    }

    const { data: businessHours } = await supabase
      .from('business_hours')
      .select('*')
      .eq('barbershop_id', shopId)
      .order('day_of_week')

    const customizationData = {
      id: barbershop.id,
      name: barbershop.name,
      description: barbershop.description,
      tagline: barbershop.tagline,
      
      phone: barbershop.phone,
      email: barbershop.email,
      address: barbershop.address,
      city: barbershop.city,
      state: barbershop.state,
      
      logo_url: barbershop.logo_url,
      cover_image_url: barbershop.cover_image_url,
      brand_colors: barbershop.brand_colors || {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#10B981',
        text: '#1F2937',
        background: '#FFFFFF'
      },
      custom_fonts: barbershop.custom_fonts || {
        heading: 'Inter',
        body: 'Inter'
      },
      theme_preset: barbershop.theme_preset || 'default',
      
      hero_title: barbershop.hero_title,
      hero_subtitle: barbershop.hero_subtitle,
      about_text: barbershop.about_text,
      
      website_enabled: barbershop.website_enabled,
      shop_slug: barbershop.shop_slug,
      custom_domain: barbershop.custom_domain,
      custom_css: barbershop.custom_css,
      
      social_links: barbershop.social_links || {},
      
      seo_title: barbershop.seo_title,
      seo_description: barbershop.seo_description,
      seo_keywords: barbershop.seo_keywords,
      
      website_sections: barbershop.website_sections || [],
      gallery: barbershop.barbershop_gallery || [],
      team_members: barbershop.team_members || [],
      testimonials: barbershop.customer_testimonials || [],
      business_hours: businessHours || []
    }

    return NextResponse.json({ data: customizationData })

  } catch (error) {
    console.error('Error in GET /api/customization/[shopId]/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const supabase = createClient()
    const { shopId } = params
    const updates = await request.json()

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 })
    }

    // }

    const barbershopUpdates = {
      ...(updates.name && { name: updates.name }),
      ...(updates.description && { description: updates.description }),
      ...(updates.tagline && { tagline: updates.tagline }),
      ...(updates.phone && { phone: updates.phone }),
      ...(updates.email && { email: updates.email }),
      ...(updates.address && { address: updates.address }),
      ...(updates.city && { city: updates.city }),
      ...(updates.state && { state: updates.state }),
      ...(updates.logo_url !== undefined && { logo_url: updates.logo_url }),
      ...(updates.cover_image_url !== undefined && { cover_image_url: updates.cover_image_url }),
      ...(updates.brand_colors && { brand_colors: updates.brand_colors }),
      ...(updates.custom_fonts && { custom_fonts: updates.custom_fonts }),
      ...(updates.theme_preset && { theme_preset: updates.theme_preset }),
      ...(updates.hero_title !== undefined && { hero_title: updates.hero_title }),
      ...(updates.hero_subtitle !== undefined && { hero_subtitle: updates.hero_subtitle }),
      ...(updates.about_text !== undefined && { about_text: updates.about_text }),
      ...(updates.website_enabled !== undefined && { website_enabled: updates.website_enabled }),
      ...(updates.shop_slug && { shop_slug: updates.shop_slug }),
      ...(updates.custom_domain !== undefined && { custom_domain: updates.custom_domain }),
      ...(updates.custom_css !== undefined && { custom_css: updates.custom_css }),
      ...(updates.social_links && { social_links: updates.social_links }),
      ...(updates.seo_title !== undefined && { seo_title: updates.seo_title }),
      ...(updates.seo_description !== undefined && { seo_description: updates.seo_description }),
      ...(updates.seo_keywords !== undefined && { seo_keywords: updates.seo_keywords }),
      updated_at: new Date().toISOString()
    }

    if (Object.keys(barbershopUpdates).length > 1) { // More than just updated_at
      const { error: updateError } = await supabase
        .from('barbershops')
        .update(barbershopUpdates)
        .eq('id', shopId)

      if (updateError) {
        console.error('Error updating barbershop:', updateError)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
      }
    }

    if (updates.business_hours && Array.isArray(updates.business_hours)) {
      await supabase
        .from('business_hours')
        .delete()
        .eq('barbershop_id', shopId)

      const hoursToInsert = updates.business_hours.map(hour => ({
        barbershop_id: shopId,
        day_of_week: hour.day_of_week,
        is_open: hour.is_open,
        open_time: hour.open_time,
        close_time: hour.close_time,
        break_start_time: hour.break_start_time || null,
        break_end_time: hour.break_end_time || null,
        notes: hour.notes || null
      }))

      const { error: hoursError } = await supabase
        .from('business_hours')
        .insert(hoursToInsert)

      if (hoursError) {
        console.error('Error updating business hours:', hoursError)
      }
    }

    if (updates.website_sections && Array.isArray(updates.website_sections)) {
      for (const section of updates.website_sections) {
        if (section.id) {
          await supabase
            .from('website_sections')
            .update({
              title: section.title,
              content: section.content,
              is_enabled: section.is_enabled,
              display_order: section.display_order
            })
            .eq('id', section.id)
        } else {
          await supabase
            .from('website_sections')
            .insert({
              barbershop_id: shopId,
              section_type: section.section_type,
              title: section.title,
              content: section.content,
              is_enabled: section.is_enabled !== undefined ? section.is_enabled : true,
              display_order: section.display_order || 0
            })
        }
      }
    }

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      shopId 
    })

  } catch (error) {
    console.error('Error in PUT /api/customization/[shopId]/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = createClient()
    const { shopId } = params

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 })
    }

    const defaultSettings = {
      logo_url: null,
      cover_image_url: null,
      brand_colors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#10B981',
        text: '#1F2937',
        background: '#FFFFFF'
      },
      custom_fonts: {
        heading: 'Inter',
        body: 'Inter'
      },
      theme_preset: 'default',
      hero_title: null,
      hero_subtitle: null,
      about_text: null,
      custom_css: null,
      social_links: {},
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      updated_at: new Date().toISOString()
    }

    const { error: resetError } = await supabase
      .from('barbershops')
      .update(defaultSettings)
      .eq('id', shopId)

    if (resetError) {
      console.error('Error resetting customization:', resetError)
      return NextResponse.json({ error: 'Failed to reset settings' }, { status: 500 })
    }

    await supabase
      .from('website_sections')
      .delete()
      .eq('barbershop_id', shopId)

    await supabase
      .from('barbershop_gallery')
      .delete()
      .eq('barbershop_id', shopId)

    return NextResponse.json({ 
      message: 'Customization reset to defaults',
      shopId 
    })

  } catch (error) {
    console.error('Error in DELETE /api/customization/[shopId]/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
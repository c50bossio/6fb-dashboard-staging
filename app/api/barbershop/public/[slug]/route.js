import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function GET(request, { params }) {
  try {
    const { slug } = params
    const supabase = createClient()

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .select(`
        id, name, description, tagline, phone, email, address, city, state,
        logo_url, cover_image_url, brand_colors, custom_fonts, theme_preset,
        hero_title, hero_subtitle, about_text, social_links,
        seo_title, seo_description, seo_keywords, website_enabled,
        avg_rating, total_clients, shop_slug
      `)
      .eq('shop_slug', slug)
      .eq('website_enabled', true)
      .single()

    if (error) {
      console.error('Error fetching barbershop:', error)
      return NextResponse.json({ error: 'Barbershop not found' }, { status: 404 })
    }

    if (!barbershop) {
      return NextResponse.json({ error: 'Barbershop not found or not enabled' }, { status: 404 })
    }

    const { data: businessHours } = await supabase
      .from('business_hours')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .order('day_of_week')

    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .order('display_order')

    const { data: testimonials } = await supabase
      .from('customer_testimonials')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .eq('is_approved', true)
      .order('display_order')
      .limit(6)

    const publicData = {
      ...barbershop,
      business_hours: businessHours || [],
      team_members: teamMembers || [],
      testimonials: testimonials || []
    }

    return NextResponse.json({
      success: true,
      barbershop: publicData
    })

  } catch (error) {
    console.error('Error in GET /api/barbershop/public/[slug]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
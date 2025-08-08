import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Create demo barbershop for testing
export async function POST(request) {
  try {
    const supabase = createClient()

    // Check if demo barbershop already exists
    const { data: existing } = await supabase
      .from('barbershops')
      .select('id')
      .eq('shop_slug', 'demo-barbershop')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        message: 'Demo barbershop already exists',
        shopId: existing.id 
      })
    }

    // Create demo user first (owner of the barbershop)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: 'owner@6fb-elite.com',
        name: '6FB Owner',
        role: 'SHOP_OWNER'
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating demo user:', userError)
      // Continue anyway, user might already exist
    }

    const userId = user?.id

    // Create demo barbershop with UUID
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .insert({
        name: '6FB Elite Barbershop',
        tagline: 'Premium Cuts, Professional Service, Unbeatable Style',
        description: 'Experience the finest barbering services in downtown. Our master barbers deliver precision cuts, classic styles, and modern looks that elevate your confidence.',
        phone: '(555) 123-4567',
        email: 'book@6fb-elite.com',
        address: '123 Main Street',
        city: 'Downtown',
        state: 'CA',
        owner_id: userId,
        shop_slug: 'demo-barbershop',
        website_enabled: true,
        booking_enabled: true,
        online_booking_enabled: true,
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
        hero_title: 'Welcome to 6FB Elite Barbershop',
        hero_subtitle: 'Premium Cuts, Professional Service, Unbeatable Style',
        about_text: 'We are passionate about the art of barbering. Our experienced team combines traditional techniques with modern styles to deliver exceptional results every time.',
        social_links: {
          instagram: 'https://instagram.com/6fb-elite',
          facebook: 'https://facebook.com/6fb-elite',
          google: 'https://g.page/6fb-elite'
        },
        seo_title: '6FB Elite Barbershop | Professional Haircuts & Grooming in Downtown CA',
        seo_description: 'Experience premium barbering at 6FB Elite Barbershop. Professional haircuts, modern fades, beard grooming & styling in Downtown, CA. Book online today!',
        seo_keywords: 'barbershop, haircuts, fade, beard trim, grooming, downtown, professional barber, men\'s styling',
        avg_rating: 4.9,
        total_clients: 247,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (shopError) {
      console.error('Error creating demo barbershop:', shopError)
      return NextResponse.json({ error: 'Failed to create demo barbershop' }, { status: 500 })
    }

    // Create demo business hours
    const businessHours = [
      { day_of_week: 1, is_open: true, open_time: '09:00', close_time: '18:00' }, // Monday
      { day_of_week: 2, is_open: true, open_time: '09:00', close_time: '18:00' }, // Tuesday
      { day_of_week: 3, is_open: true, open_time: '09:00', close_time: '18:00' }, // Wednesday
      { day_of_week: 4, is_open: true, open_time: '09:00', close_time: '18:00' }, // Thursday
      { day_of_week: 5, is_open: true, open_time: '09:00', close_time: '19:00' }, // Friday
      { day_of_week: 6, is_open: true, open_time: '09:00', close_time: '17:00' }, // Saturday
      { day_of_week: 0, is_open: false, open_time: null, close_time: null }       // Sunday
    ]

    const hoursToInsert = businessHours.map(hour => ({
      barbershop_id: barbershop.id,
      ...hour
    }))

    await supabase.from('business_hours').insert(hoursToInsert)

    // Create demo services
    const services = [
      {
        barbershop_id: barbershop.id,
        name: 'Classic Haircut',
        description: 'Professional precision cut with wash, style, and finishing touches',
        price: 35.00,
        duration: 30,
        is_active: true,
        category: 'Haircut',
        created_at: new Date().toISOString()
      },
      {
        barbershop_id: barbershop.id,
        name: 'Modern Fade',
        description: 'Contemporary fade techniques with seamless blending and styling',
        price: 45.00,
        duration: 45,
        is_active: true,
        category: 'Haircut',
        created_at: new Date().toISOString()
      },
      {
        barbershop_id: barbershop.id,
        name: 'Full Service Experience',
        description: 'Complete grooming package including cut, beard work, and luxury treatment',
        price: 65.00,
        duration: 60,
        is_active: true,
        category: 'Premium',
        created_at: new Date().toISOString()
      },
      {
        barbershop_id: barbershop.id,
        name: 'Beard Trim & Shape',
        description: 'Expert beard grooming with precision trimming and styling',
        price: 25.00,
        duration: 20,
        is_active: true,
        category: 'Grooming',
        created_at: new Date().toISOString()
      }
    ]

    await supabase.from('services').insert(services)

    // Create demo team members
    const teamMembers = [
      {
        barbershop_id: barbershop.id,
        name: 'Marcus Johnson',
        title: 'Master Barber & Owner',
        bio: 'Award-winning barber specializing in contemporary styles and classic techniques.',
        specialties: 'Modern cuts & precision fades',
        years_experience: 12,
        is_active: true,
        display_order: 1
      },
      {
        barbershop_id: barbershop.id,
        name: 'David Rodriguez',
        title: 'Senior Stylist',
        bio: 'Traditional barbering expert with a passion for timeless grooming.',
        specialties: 'Classic styles & beard artistry',
        years_experience: 8,
        is_active: true,
        display_order: 2
      },
      {
        barbershop_id: barbershop.id,
        name: 'Sarah Chen',
        title: 'Style Specialist',
        bio: 'Innovative stylist bringing fresh perspectives to modern barbering.',
        specialties: 'Texture work & creative styling',
        years_experience: 6,
        is_active: true,
        display_order: 3
      }
    ]

    await supabase.from('team_members').insert(teamMembers)

    // Create demo testimonials
    const testimonials = [
      {
        barbershop_id: barbershop.id,
        customer_name: 'Michael Thompson',
        rating: 5,
        testimonial_text: 'Best haircut I\'ve ever had! Marcus really knows his craft and the attention to detail is incredible.',
        service_type: 'Modern Fade',
        date_received: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        is_approved: true,
        is_featured: true
      },
      {
        barbershop_id: barbershop.id,
        customer_name: 'James Wilson',
        rating: 5,
        testimonial_text: 'Professional service in a clean, modern environment. David\'s beard work is absolutely outstanding.',
        service_type: 'Full Service Experience',
        date_received: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_approved: true,
        is_featured: true
      },
      {
        barbershop_id: barbershop.id,
        customer_name: 'Robert Garcia',
        rating: 5,
        testimonial_text: 'Finally found my go-to barbershop! Sarah\'s creativity with styling is unmatched.',
        service_type: 'Classic Haircut',
        date_received: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        is_approved: true,
        is_featured: true
      }
    ]

    await supabase.from('customer_testimonials').insert(testimonials)

    return NextResponse.json({
      message: 'Demo barbershop created successfully',
      shopId: barbershop.id,
      data: barbershop
    })

  } catch (error) {
    console.error('Error in POST /api/demo/setup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Check if demo data exists
export async function GET(request) {
  try {
    const supabase = createClient()

    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name, shop_slug, website_enabled')
      .eq('shop_slug', 'demo-barbershop')
      .single()

    return NextResponse.json({
      exists: !!barbershop,
      data: barbershop
    })

  } catch (error) {
    console.error('Error in GET /api/demo/setup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
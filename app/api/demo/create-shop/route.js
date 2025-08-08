import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Create a demo barbershop record for testing website settings
export async function POST(request) {
  try {
    const supabase = createClient()

    // First, ensure we have a demo user
    let demoUserId = 'demo-user-uuid-12345'  // Fixed UUID for demo user
    
    // Check if demo user exists, create if not
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', demoUserId)
      .single()
    
    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist, create it
      const { error: userCreateError } = await supabase
        .from('users')
        .insert({
          id: demoUserId,
          email: 'demo@barbershop.com',
          name: 'Demo User',
          role: 'SHOP_OWNER',
          created_at: new Date().toISOString()
        })
      
      if (userCreateError) {
        console.error('Error creating demo user:', userCreateError)
        // Continue anyway - the user might exist but be inaccessible due to RLS
      }
    }

    // Check if a demo barbershop already exists
    const { data: existingShop, error: shopCheckError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', demoUserId)
      .single()

    if (existingShop) {
      return NextResponse.json({
        success: true,
        message: 'Demo barbershop already exists',
        shopId: existingShop.id
      })
    }

    // Create demo barbershop
    const demoShop = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Fixed UUID for demo shop
      name: 'Elite Cuts Barbershop',
      description: 'Professional barbering services with attention to detail and customer satisfaction.',
      tagline: 'Premium Cuts, Professional Service',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zip_code: '10001',
      country: 'US',
      phone: '(555) 123-4567',
      email: 'info@barbershop.com',
      website: 'https://elitecuts.example.com',
      owner_id: demoUserId,
      
      // Website customization fields
      logo_url: null,
      cover_image_url: null,
      hero_title: 'Welcome to Elite Cuts Barbershop',
      hero_subtitle: 'Experience professional barbering with master craftsmen',
      about_text: 'Professional barbering services with attention to detail and customer satisfaction.',
      website_enabled: true,
      shop_slug: 'elite-cuts-barbershop',
      custom_domain: null,
      custom_css: null,
      
      // Branding
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
      
      // Social media
      social_links: {
        instagram: 'https://instagram.com/elitecuts',
        facebook: 'https://facebook.com/elitecuts',
        twitter: 'https://twitter.com/elitecuts',
        google_business: 'https://goo.gl/maps/example'
      },
      
      // SEO
      seo_title: 'Elite Cuts Barbershop | Professional Haircuts in Downtown',
      seo_description: 'Experience premium barbering at Elite Cuts. Professional haircuts, modern fades, beard grooming & styling. Book online today!',
      seo_keywords: 'barbershop, haircuts, fade, beard trim, grooming, downtown',
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: shop, error: shopError } = await supabase
      .from('barbershops')
      .insert(demoShop)
      .select()
      .single()

    if (shopError) {
      console.error('Error creating demo barbershop:', shopError)
      return NextResponse.json(
        { error: 'Failed to create demo barbershop: ' + shopError.message },
        { status: 500 }
      )
    }

    // Create default business hours
    const businessHours = []
    for (let day = 0; day <= 6; day++) {
      businessHours.push({
        barbershop_id: shop.id,
        day_of_week: day,
        is_open: day === 0 ? false : true,  // Closed on Sunday
        open_time: day === 0 ? null : '09:00',
        close_time: day === 0 ? null : (day === 6 ? '18:00' : '19:00'), // Saturday closes earlier
        break_start_time: day === 0 ? null : '12:00',
        break_end_time: day === 0 ? null : '13:00',
        notes: day === 0 ? 'Closed' : null
      })
    }

    const { error: hoursError } = await supabase
      .from('business_hours')
      .insert(businessHours)

    if (hoursError) {
      console.error('Error creating business hours:', hoursError)
      // Don't fail the entire request for this
    }

    // Create sample team members
    const teamMembers = [
      {
        barbershop_id: shop.id,
        name: 'Mike Johnson',
        title: 'Master Barber',
        bio: 'Over 15 years of experience in classic and modern cuts.',
        specialties: 'Fades, Beard Styling, Classic Cuts',
        years_experience: 15,
        display_order: 1,
        is_active: true
      },
      {
        barbershop_id: shop.id,
        name: 'Sarah Davis',
        title: 'Senior Stylist',
        bio: 'Specializes in modern styles and creative cuts.',
        specialties: 'Modern Cuts, Hair Styling, Color',
        years_experience: 8,
        display_order: 2,
        is_active: true
      }
    ]

    const { error: teamError } = await supabase
      .from('team_members')
      .insert(teamMembers)

    if (teamError) {
      console.error('Error creating team members:', teamError)
      // Don't fail the entire request for this
    }

    // Create sample testimonials
    const testimonials = [
      {
        barbershop_id: shop.id,
        customer_name: 'John Smith',
        rating: 5,
        testimonial_text: 'Best haircut I\'ve ever had! Mike really knows what he\'s doing.',
        service_type: 'Haircut & Beard Trim',
        date_received: '2024-01-15',
        is_featured: true,
        is_approved: true,
        display_order: 1
      },
      {
        barbershop_id: shop.id,
        customer_name: 'David Wilson',
        rating: 5,
        testimonial_text: 'Great atmosphere and excellent service. Highly recommended!',
        service_type: 'Fade Cut',
        date_received: '2024-01-20',
        is_featured: true,
        is_approved: true,
        display_order: 2
      }
    ]

    const { error: testimonialsError } = await supabase
      .from('customer_testimonials')
      .insert(testimonials)

    if (testimonialsError) {
      console.error('Error creating testimonials:', testimonialsError)
      // Don't fail the entire request for this
    }

    return NextResponse.json({
      success: true,
      message: 'Demo barbershop created successfully',
      shopId: shop.id,
      shop: shop
    })

  } catch (error) {
    console.error('Error in POST /api/demo/create-shop:', error)
    return NextResponse.json(
      { error: 'Failed to create demo barbershop: ' + error.message },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function GET(request, { params }) {
  try {
    const supabase = createClient()
    const { identifier } = params

    if (!identifier) {
      return NextResponse.json({ error: 'Shop identifier is required' }, { status: 400 })
    }

    let query = supabase
      .from('barbershops')
      .select(`
        *,
        website_sections(*),
        barbershop_gallery(*),
        team_members(*),
        customer_testimonials(*)
      `)

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
    
    if (isUUID) {
      query = query.eq('id', identifier)
    } else {
      query = query.eq('shop_slug', identifier)
    }

    const { data: barbershop, error: shopError } = await query.single()

    if (shopError || !barbershop) {
      console.error('Error fetching barbershop:', shopError)
      return NextResponse.json({ error: 'Barbershop not found' }, { status: 404 })
    }

    if (!barbershop.website_enabled) {
      return NextResponse.json({ error: 'Website not available' }, { status: 403 })
    }

    const { data: businessHours } = await supabase
      .from('business_hours')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .order('day_of_week')

    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .order('name')

    const formattedHours = formatBusinessHours(businessHours || [])
    
    const sectionsById = {}
    barbershop.website_sections?.forEach(section => {
      sectionsById[section.section_type] = section
    })

    const websiteData = {
      id: barbershop.id,
      name: barbershop.name,
      description: barbershop.description,
      tagline: barbershop.tagline || 'Professional Barbering Services',
      slug: barbershop.shop_slug,
      
      phone: barbershop.phone,
      email: barbershop.email,
      address: {
        street: barbershop.address,
        city: barbershop.city,
        state: barbershop.state,
        full: `${barbershop.address}${barbershop.city ? ', ' + barbershop.city : ''}${barbershop.state ? ', ' + barbershop.state : ''}`
      },
      
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
      custom_css: barbershop.custom_css,
      
      hero: {
        title: barbershop.hero_title || sectionsById.hero?.content?.title || `Welcome to ${barbershop.name}`,
        subtitle: barbershop.hero_subtitle || sectionsById.hero?.content?.subtitle || barbershop.description || 'Professional barbering services',
        background_image: sectionsById.hero?.content?.background_image || barbershop.cover_image_url,
        cta_text: sectionsById.hero?.content?.cta_text || 'Book Appointment'
      },
      
      about: {
        title: sectionsById.about?.title || 'About Us',
        content: barbershop.about_text || sectionsById.about?.content?.content || 'We provide professional barbering services with attention to detail and customer satisfaction.'
      },
      
      business_hours: formattedHours,
      rating: barbershop.avg_rating || 4.5,
      total_reviews: barbershop.total_clients || 0,
      
      social_links: barbershop.social_links || {},
      
      services: services || [],
      
      gallery: (barbershop.barbershop_gallery || [])
        .filter(img => img.is_featured || true)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map(img => ({
          id: img.id,
          image_url: img.image_url,
          thumbnail_url: img.thumbnail_url || img.image_url,
          caption: img.caption,
          alt_text: img.alt_text,
          category: img.category
        })),
      
      team_members: (barbershop.team_members || [])
        .filter(member => member.is_active)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map(member => ({
          id: member.id,
          name: member.name,
          title: member.title,
          bio: member.bio,
          specialties: member.specialties,
          profile_image_url: member.profile_image_url,
          years_experience: member.years_experience
        })),
      
      testimonials: (barbershop.customer_testimonials || [])
        .filter(testimonial => testimonial.is_approved && testimonial.is_featured)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6) // Limit to 6 featured testimonials
        .map(testimonial => ({
          id: testimonial.id,
          customer_name: testimonial.customer_name,
          customer_image_url: testimonial.customer_image_url,
          rating: testimonial.rating,
          testimonial_text: testimonial.testimonial_text,
          service_type: testimonial.service_type,
          date: testimonial.date_received
        })),
      
      seo: {
        title: barbershop.seo_title || `${barbershop.name} | Professional Barbering Services`,
        description: barbershop.seo_description || barbershop.description || `Experience professional barbering at ${barbershop.name}. Expert cuts, styling, and grooming services.`,
        keywords: barbershop.seo_keywords || 'barbershop, haircut, styling, grooming',
        canonical_url: barbershop.custom_domain || `/${barbershop.shop_slug || barbershop.id}`
      },
      
      website_sections: barbershop.website_sections?.reduce((acc, section) => {
        acc[section.section_type] = {
          title: section.title,
          content: section.content,
          is_enabled: section.is_enabled,
          display_order: section.display_order
        }
        return acc
      }, {}) || {},
      
      booking_enabled: barbershop.booking_enabled,
      online_booking_enabled: barbershop.online_booking_enabled
    }

    return NextResponse.json({ data: websiteData })

  } catch (error) {
    console.error('Error in GET /api/barbershop/[identifier]/public:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatBusinessHours(businessHours) {
  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]
  
  const formatted = {}
  
  businessHours.forEach(hour => {
    const dayName = daysOfWeek[hour.day_of_week].toLowerCase()
    
    if (hour.is_open && hour.open_time && hour.close_time) {
      const openTime = formatTime(hour.open_time)
      const closeTime = formatTime(hour.close_time)
      
      let timeString = `${openTime} - ${closeTime}`
      
      if (hour.break_start_time && hour.break_end_time) {
        const breakStart = formatTime(hour.break_start_time)
        const breakEnd = formatTime(hour.break_end_time)
        timeString += ` (Break: ${breakStart}-${breakEnd})`
      }
      
      formatted[dayName] = timeString
    } else {
      formatted[dayName] = 'Closed'
    }
  })
  
  return formatted
}

function formatTime(timeString) {
  if (!timeString) return ''
  
  const [hours, minutes] = timeString.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
}
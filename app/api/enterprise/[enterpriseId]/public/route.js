import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create Supabase client for server-side operations
function createSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export async function GET(request, { params }) {
  try {
    const { enterpriseId } = params
    const supabase = createSupabaseClient()

    // Fetch enterprise data by enterpriseId
    const { data: enterprise, error: enterpriseError } = await supabase
      .from('enterprises')
      .select(`
        *,
        website_settings:enterprise_website_settings(*)
      `)
      .eq('id', enterpriseId)
      .eq('is_active', true)
      .single()

    if (enterpriseError || !enterprise) {
      console.error('Enterprise not found:', enterpriseError)
      return NextResponse.json(
        { error: 'Enterprise not found' },
        { status: 404 }
      )
    }

    // Fetch all locations (barbershops) for this enterprise
    const { data: locations, error: locationsError } = await supabase
      .from('barbershops')
      .select(`
        id,
        name,
        slug,
        address,
        phone,
        hours,
        social_media,
        is_active,
        region,
        state,
        is_flagship,
        staff_count
      `)
      .eq('enterprise_id', enterprise.id)
      .eq('is_active', true)
      .order('is_flagship', { ascending: false })
      .order('name')

    if (locationsError) {
      console.error('Error fetching locations:', locationsError)
    }

    // Fetch common services across all locations
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        price,
        starting_price,
        duration,
        is_active
      `)
      .in('barbershop_id', (locations || []).map(loc => loc.id))
      .eq('is_active', true)
      .order('name')

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
    }

    // Aggregate services to show unique services across all locations
    const uniqueServices = services ? services.reduce((acc, service) => {
      const existing = acc.find(s => s.name === service.name)
      if (existing) {
        // Update with lowest starting price
        existing.starting_price = Math.min(
          existing.starting_price || existing.price,
          service.price
        )
      } else {
        acc.push({
          ...service,
          starting_price: service.price
        })
      }
      return acc
    }, []) : []

    // Fetch testimonials from all locations
    const { data: testimonials, error: testimonialsError } = await supabase
      .from('testimonials')
      .select(`
        id,
        customer_name,
        text,
        rating,
        created_at,
        barbershop:barbershops(name)
      `)
      .in('barbershop_id', (locations || []).map(loc => loc.id))
      .eq('is_approved', true)
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12)

    if (testimonialsError) {
      console.error('Error fetching testimonials:', testimonialsError)
    }

    // Format testimonials with location names
    const formattedTestimonials = testimonials ? testimonials.map(t => ({
      ...t,
      location_name: t.barbershop?.name
    })) : []

    // Fetch franchise information if available
    const { data: franchiseInfo, error: franchiseError } = await supabase
      .from('franchise_info')
      .select('*')
      .eq('enterprise_id', enterprise.id)
      .eq('is_active', true)
      .single()

    if (franchiseError && franchiseError.code !== 'PGRST116') {
      console.error('Error fetching franchise info:', franchiseError)
    }

    // Get website settings from the nested relation or create defaults
    const websiteSettings = enterprise.website_settings?.[0] || {
      hero_title: `Welcome to ${enterprise.name}`,
      hero_subtitle: enterprise.description || 'Premium grooming experiences across multiple locations',
      primary_color: '#1a365d',
      secondary_color: '#4a5568',
      show_locations: true,
      show_franchising: !!franchiseInfo,
      show_testimonials: true,
      meta_description: `${enterprise.name} - Premium barbershop locations providing professional grooming services.`,
      meta_keywords: `${enterprise.name}, barbershop, grooming, multiple locations, franchise`
    }

    // Calculate additional stats
    const totalStaff = locations?.reduce((total, loc) => total + (loc.staff_count || 0), 0) || 0

    const responseData = {
      enterprise: {
        ...enterprise,
        founded_year: enterprise.founded_year || new Date().getFullYear() - 5
      },
      website_settings: websiteSettings,
      locations: locations || [],
      services: uniqueServices,
      testimonials: formattedTestimonials,
      franchise_info: franchiseInfo,
      stats: {
        total_locations: locations?.length || 0,
        total_staff: totalStaff,
        total_services: uniqueServices.length
      }
    }

    // Set cache headers for better performance
    const response = NextResponse.json(responseData)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response

  } catch (error) {
    console.error('Error in enterprise public API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Enable Edge Runtime for better performance
export const runtime = 'edge'
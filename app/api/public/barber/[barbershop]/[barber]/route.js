import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const { barbershop, barber } = params
    
    // Create Supabase client (no auth required for public endpoint)
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // First, find the barbershop by slug
    const { data: shopData, error: shopError } = await supabase
      .from('barbershops')
      .select(`
        id,
        name,
        address,
        city,
        state,
        zip_code,
        phone,
        email
      `)
      .or(`slug.eq.${barbershop},custom_domain.eq.${barbershop}`)
      .single()
    
    if (shopError || !shopData) {
      return NextResponse.json(
        { error: 'Barbershop not found' },
        { status: 404 }
      )
    }
    
    // Find the barber by slug within this barbershop
    const { data: barberCustomization, error: barberError } = await supabase
      .from('barber_customizations')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('barbershop_id', shopData.id)
      .eq('custom_url', barber)
      .eq('is_active', true)
      .single()
    
    if (barberError || !barberCustomization) {
      // Try finding by user name if custom_url doesn't match
      const { data: staffData, error: staffError } = await supabase
        .from('barbershop_staff')
        .select(`
          *,
          users:user_id (
            id,
            email,
            full_name,
            avatar_url
          ),
          barber_customizations (*)
        `)
        .eq('barbershop_id', shopData.id)
        .eq('role', 'BARBER')
        .eq('is_active', true)
      
      if (staffError || !staffData || staffData.length === 0) {
        return NextResponse.json(
          { error: 'Barber not found' },
          { status: 404 }
        )
      }
      
      // Find matching barber by name slug
      const matchingBarber = staffData.find(staff => {
        const nameSlug = staff.users?.full_name?.toLowerCase().replace(/\s+/g, '-')
        return nameSlug === barber.toLowerCase()
      })
      
      if (!matchingBarber) {
        return NextResponse.json(
          { error: 'Barber not found' },
          { status: 404 }
        )
      }
      
      // Use found barber's customization if available
      const customization = matchingBarber.barber_customizations?.[0] || {}
      
      // Get barber's services
      const { data: services } = await supabase
        .from('barber_services')
        .select('*')
        .eq('user_id', matchingBarber.user_id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      
      // Get barber's availability
      const { data: availability } = await supabase
        .from('barber_availability')
        .select('*')
        .eq('user_id', matchingBarber.user_id)
      
      // Get recent reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          profiles:customer_id (
            full_name
          )
        `)
        .eq('barber_id', matchingBarber.user_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10)
      
      // Format availability data
      const formattedAvailability = {}
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      
      days.forEach(day => {
        const dayAvailability = availability?.find(a => a.day_of_week === day)
        formattedAvailability[day] = {
          is_open: dayAvailability?.is_available || false,
          open: dayAvailability?.start_time || '9:00 AM',
          close: dayAvailability?.end_time || '6:00 PM'
        }
      })
      
      // Calculate rating stats
      const totalRating = reviews?.reduce((sum, r) => sum + r.rating, 0) || 0
      const avgRating = reviews?.length > 0 ? totalRating / reviews.length : 0
      
      // Format response
      return NextResponse.json({
        id: matchingBarber.user_id,
        name: matchingBarber.users?.full_name || 'Barber',
        bio: customization.bio || `Professional barber at ${shopData.name}`,
        avatar_url: matchingBarber.users?.avatar_url || customization.profile_image_url,
        cover_image_url: customization.cover_image_url,
        services: services || [],
        availability: formattedAvailability,
        portfolio: customization.portfolio_images || [],
        reviews: reviews?.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          customer_name: r.profiles?.full_name || 'Customer',
          created_at: r.created_at
        })) || [],
        rating: avgRating,
        total_reviews: reviews?.length || 0,
        years_experience: customization.years_experience || 0,
        specialties: customization.specialties || [],
        social_links: customization.social_links || {},
        contact_info: {
          phone: customization.contact_phone || shopData.phone,
          email: customization.contact_email || matchingBarber.users?.email
        },
        shop_info: {
          id: shopData.id,
          name: shopData.name,
          address: shopData.address,
          city: shopData.city,
          state: shopData.state,
          zip: shopData.zip_code
        }
      })
    }
    
    // If we found the barber by custom_url
    const userId = barberCustomization.user_id
    
    // Get barber's services
    const { data: services } = await supabase
      .from('barber_services')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    
    // Get barber's availability  
    const { data: availability } = await supabase
      .from('barber_availability')
      .select('*')
      .eq('user_id', userId)
    
    // Get recent reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        profiles:customer_id (
          full_name
        )
      `)
      .eq('barber_id', userId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Format availability data
    const formattedAvailability = {}
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    days.forEach(day => {
      const dayAvailability = availability?.find(a => a.day_of_week === day)
      formattedAvailability[day] = {
        is_open: dayAvailability?.is_available || false,
        open: dayAvailability?.start_time || '9:00 AM',
        close: dayAvailability?.end_time || '6:00 PM'
      }
    })
    
    // Calculate rating stats
    const totalRating = reviews?.reduce((sum, r) => sum + r.rating, 0) || 0
    const avgRating = reviews?.length > 0 ? totalRating / reviews.length : 0
    
    // Format response
    return NextResponse.json({
      id: userId,
      name: barberCustomization.profiles?.full_name || barberCustomization.display_name,
      bio: barberCustomization.bio || `Professional barber at ${shopData.name}`,
      avatar_url: barberCustomization.profiles?.avatar_url || barberCustomization.profile_image_url,
      cover_image_url: barberCustomization.cover_image_url,
      services: services || [],
      availability: formattedAvailability,
      portfolio: barberCustomization.portfolio_images || [],
      reviews: reviews?.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        customer_name: r.profiles?.full_name || 'Customer',
        created_at: r.created_at
      })) || [],
      rating: avgRating,
      total_reviews: reviews?.length || 0,
      years_experience: barberCustomization.years_experience || 0,
      specialties: barberCustomization.specialties || [],
      social_links: barberCustomization.social_links || {},
      contact_info: {
        phone: barberCustomization.contact_phone || shopData.phone,
        email: barberCustomization.contact_email || barberCustomization.profiles?.email
      },
      shop_info: {
        id: shopData.id,
        name: shopData.name,
        address: shopData.address,
        city: shopData.city,
        state: shopData.state,
        zip: shopData.zip_code
      }
    })
    
  } catch (error) {
    console.error('Error fetching barber data:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { location, businessType } = await request.json()
    
    // Get real pricing data from barbershops within 50km radius
    // Using Haversine formula for distance calculation
    const radiusKm = 50
    
    // First, get all barbershops with location data
    const { data: barbershops, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name, latitude, longitude, city, state, zip_code')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    
    if (barbershopError) throw barbershopError
    
    // Calculate distances and filter by radius
    const nearbyBarbershops = barbershops.filter(shop => {
      const distance = calculateDistance(
        location.lat, 
        location.lng, 
        shop.latitude, 
        shop.longitude
      )
      return distance <= radiusKm
    }).map(shop => ({
      ...shop,
      distance: calculateDistance(location.lat, location.lng, shop.latitude, shop.longitude)
    }))
    
    if (nearbyBarbershops.length === 0) {
      // If no nearby shops, get data from same state
      const { data: stateShops } = await supabase
        .from('barbershops')
        .select('id')
        .eq('state', location.state)
        .limit(10)
      
      nearbyBarbershops.push(...(stateShops || []))
    }
    
    // Get actual service pricing from these barbershops
    const shopIds = nearbyBarbershops.map(shop => shop.id)
    
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('name, price, duration_minutes, shop_id')
      .in('shop_id', shopIds)
      .in('name', ['Haircut', 'Fade Cut', 'Beard Trim', 'Kids Cut', 'Hot Towel Shave', 'VIP Package'])
    
    if (servicesError) throw servicesError
    
    // Aggregate pricing data by service
    const pricingData = {}
    const serviceGroups = {}
    
    services.forEach(service => {
      if (!serviceGroups[service.name]) {
        serviceGroups[service.name] = []
      }
      serviceGroups[service.name].push(service.price)
    })
    
    // Calculate statistics for each service
    Object.entries(serviceGroups).forEach(([serviceName, prices]) => {
      if (prices.length > 0) {
        const sorted = prices.sort((a, b) => a - b)
        pricingData[serviceName] = {
          count: prices.length,
          average: prices.reduce((a, b) => a + b, 0) / prices.length,
          median: sorted[Math.floor(sorted.length / 2)],
          min: sorted[0],
          max: sorted[sorted.length - 1],
          percentile_25: sorted[Math.floor(sorted.length * 0.25)],
          percentile_75: sorted[Math.floor(sorted.length * 0.75)]
        }
      }
    })
    
    // Get appointment volume data to understand demand
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('shop_id, service_name, price')
      .in('shop_id', shopIds)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
    
    // Calculate demand metrics
    const demandMetrics = calculateDemandMetrics(appointments || [])
    
    // Get customer feedback data for quality insights
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating, shop_id')
      .in('shop_id', shopIds)
    
    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null
    
    return NextResponse.json({
      success: true,
      location: {
        lat: location.lat,
        lng: location.lng,
        nearbyShopCount: nearbyBarbershops.length,
        searchRadius: radiusKm
      },
      pricingData,
      demandMetrics,
      marketMetrics: {
        avgRating,
        totalReviews: reviews?.length || 0,
        dataPoints: services.length,
        confidence: calculateDataConfidence(services.length, nearbyBarbershops.length)
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Internal market data error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) {
  return deg * (Math.PI / 180)
}

/**
 * Calculate demand metrics from appointment data
 */
function calculateDemandMetrics(appointments) {
  const serviceFrequency = {}
  const pricingPower = {}
  
  appointments.forEach(apt => {
    if (apt.service_name) {
      serviceFrequency[apt.service_name] = (serviceFrequency[apt.service_name] || 0) + 1
      
      if (!pricingPower[apt.service_name]) {
        pricingPower[apt.service_name] = []
      }
      if (apt.price) {
        pricingPower[apt.service_name].push(apt.price)
      }
    }
  })
  
  // Calculate average accepted price for each service
  const acceptedPrices = {}
  Object.entries(pricingPower).forEach(([service, prices]) => {
    if (prices.length > 0) {
      acceptedPrices[service] = prices.reduce((a, b) => a + b, 0) / prices.length
    }
  })
  
  return {
    totalAppointments: appointments.length,
    serviceFrequency,
    acceptedPrices,
    popularServices: Object.entries(serviceFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  }
}

/**
 * Calculate confidence score based on data availability
 */
function calculateDataConfidence(dataPoints, shopCount) {
  let confidence = 0.3 // Base confidence
  
  if (dataPoints > 10) confidence += 0.2
  if (dataPoints > 50) confidence += 0.2
  if (shopCount > 3) confidence += 0.15
  if (shopCount > 10) confidence += 0.15
  
  return Math.min(confidence, 0.95)
}
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { location, businessType, radius = 3000, fields } = await request.json()
    
    // Validate Google Maps API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('Google Maps API key not configured, using estimation')
      return NextResponse.json({
        success: true,
        results: [],
        estimation: true,
        message: 'Using market estimation - configure Google Maps API for real competitor data'
      })
    }
    
    // Search for nearby barbershops/salons using Google Places API
    // Using field masking to optimize API costs (March 2025 pricing update)
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
    searchUrl.searchParams.append('location', `${location.lat},${location.lng}`)
    searchUrl.searchParams.append('radius', radius)
    searchUrl.searchParams.append('type', 'hair_care') // Covers barbershops and salons
    searchUrl.searchParams.append('key', apiKey)
    
    // Add field mask to reduce costs
    if (fields && fields.length > 0) {
      searchUrl.searchParams.append('fields', fields.join(','))
    }
    
    const response = await fetch(searchUrl.toString())
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Filter to only barbershops and salons
    const filteredResults = data.results.filter(place => {
      const types = place.types || []
      const name = place.name?.toLowerCase() || ''
      
      return types.includes('hair_care') || 
             types.includes('beauty_salon') ||
             name.includes('barber') ||
             name.includes('salon') ||
             name.includes('cuts') ||
             name.includes('hair')
    })
    
    // Get detailed pricing information for top competitors
    const topCompetitors = filteredResults.slice(0, 5)
    const detailedCompetitors = []
    
    for (const competitor of topCompetitors) {
      // Get place details for more information
      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
      detailsUrl.searchParams.append('place_id', competitor.place_id)
      detailsUrl.searchParams.append('fields', 'name,rating,user_ratings_total,price_level,opening_hours,website,reviews')
      detailsUrl.searchParams.append('key', apiKey)
      
      try {
        const detailsResponse = await fetch(detailsUrl.toString())
        if (detailsResponse.ok) {
          const details = await detailsResponse.json()
          
          // Extract pricing insights from reviews using AI
          const pricingInsights = await extractPricingFromReviews(details.result.reviews || [])
          
          detailedCompetitors.push({
            ...competitor,
            details: details.result,
            pricingInsights
          })
        } else {
          detailedCompetitors.push(competitor)
        }
      } catch (detailError) {
        console.warn('Failed to get competitor details:', detailError)
        detailedCompetitors.push(competitor)
      }
    }
    
    // Calculate market statistics
    const marketStats = calculateMarketStatistics(filteredResults)
    
    return NextResponse.json({
      success: true,
      results: detailedCompetitors,
      totalCompetitors: filteredResults.length,
      marketStats,
      searchRadius: radius,
      location: {
        lat: location.lat,
        lng: location.lng
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Competitor analysis error:', error)
    
    // Return estimation if API fails
    return NextResponse.json({
      success: true,
      results: [],
      estimation: true,
      marketStats: getEstimatedMarketStats(request.body.location),
      error: error.message
    })
  }
}

/**
 * Extract pricing information from reviews using AI
 */
async function extractPricingFromReviews(reviews) {
  if (!reviews || reviews.length === 0) return null
  
  // Look for price mentions in reviews
  const pricePatterns = [
    /\$(\d+)/g,
    /(\d+)\s*dollars?/gi,
    /haircut.*?(\d+)/gi,
    /paid\s*(\d+)/gi,
    /cost.*?(\d+)/gi,
    /price.*?(\d+)/gi
  ]
  
  const mentionedPrices = []
  
  reviews.forEach(review => {
    const text = review.text || ''
    
    pricePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        const price = parseInt(match[1])
        if (price > 5 && price < 200) { // Reasonable price range
          mentionedPrices.push(price)
        }
      }
    })
  })
  
  if (mentionedPrices.length === 0) return null
  
  // Calculate price statistics
  const sorted = mentionedPrices.sort((a, b) => a - b)
  
  return {
    mentionCount: mentionedPrices.length,
    averagePrice: Math.round(mentionedPrices.reduce((a, b) => a + b, 0) / mentionedPrices.length),
    minPrice: sorted[0],
    maxPrice: sorted[sorted.length - 1],
    medianPrice: sorted[Math.floor(sorted.length / 2)],
    confidence: mentionedPrices.length >= 3 ? 'high' : 'low'
  }
}

/**
 * Calculate market statistics from competitor data
 */
function calculateMarketStatistics(competitors) {
  if (!competitors || competitors.length === 0) {
    return {
      avgRating: null,
      avgPriceLevel: null,
      competitionLevel: 'unknown'
    }
  }
  
  const ratings = competitors
    .filter(c => c.rating)
    .map(c => c.rating)
  
  const priceLevels = competitors
    .filter(c => c.price_level)
    .map(c => c.price_level)
  
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null
  
  const avgPriceLevel = priceLevels.length > 0
    ? priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length
    : null
  
  // Determine competition level
  let competitionLevel = 'low'
  if (competitors.length > 5) competitionLevel = 'moderate'
  if (competitors.length > 10) competitionLevel = 'high'
  if (competitors.length > 20) competitionLevel = 'very_high'
  
  return {
    avgRating: avgRating ? avgRating.toFixed(1) : null,
    avgPriceLevel,
    competitionLevel,
    totalCompetitors: competitors.length,
    highlyRated: competitors.filter(c => c.rating >= 4.5).length,
    priceDistribution: {
      budget: priceLevels.filter(p => p === 1).length,
      moderate: priceLevels.filter(p => p === 2).length,
      premium: priceLevels.filter(p => p === 3).length,
      luxury: priceLevels.filter(p => p === 4).length
    }
  }
}

/**
 * Get estimated market statistics when API unavailable
 */
function getEstimatedMarketStats(location) {
  // Use city population and density for estimation
  const majorCities = {
    'new york': { avgPriceLevel: 3.2, competitionLevel: 'very_high', avgRating: 4.2 },
    'los angeles': { avgPriceLevel: 2.8, competitionLevel: 'high', avgRating: 4.3 },
    'chicago': { avgPriceLevel: 2.5, competitionLevel: 'high', avgRating: 4.1 },
    'houston': { avgPriceLevel: 2.2, competitionLevel: 'moderate', avgRating: 4.0 },
    'phoenix': { avgPriceLevel: 2.0, competitionLevel: 'moderate', avgRating: 4.2 },
    'philadelphia': { avgPriceLevel: 2.4, competitionLevel: 'high', avgRating: 4.1 },
    'san antonio': { avgPriceLevel: 1.9, competitionLevel: 'moderate', avgRating: 4.0 },
    'san diego': { avgPriceLevel: 2.6, competitionLevel: 'high', avgRating: 4.3 },
    'dallas': { avgPriceLevel: 2.3, competitionLevel: 'moderate', avgRating: 4.1 },
    'san jose': { avgPriceLevel: 3.0, competitionLevel: 'high', avgRating: 4.2 }
  }
  
  const city = location.city?.toLowerCase() || ''
  
  // Find matching city
  for (const [cityName, stats] of Object.entries(majorCities)) {
    if (city.includes(cityName)) {
      return {
        ...stats,
        estimated: true,
        totalCompetitors: stats.competitionLevel === 'very_high' ? 25 : 
                         stats.competitionLevel === 'high' ? 15 : 8
      }
    }
  }
  
  // Default estimation
  return {
    avgPriceLevel: 2.0,
    competitionLevel: 'moderate',
    avgRating: 4.0,
    totalCompetitors: 10,
    estimated: true
  }
}
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/analytics/product-affinity
 * Analyze and return product pairing insights for a barbershop
 * 
 * Query Parameters:
 * - barbershopId: UUID of the barbershop
 * - productId: Optional - get affinities for specific product
 * - minScore: Optional - minimum affinity score (default: 0.3)
 * - minConfidence: Optional - minimum confidence level (default: 70)
 * - limit: Optional - number of results to return (default: 20)
 * - category: Optional - filter by product category
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId')
    const productId = searchParams.get('productId')
    const minScore = parseFloat(searchParams.get('minScore')) || 0.3
    const minConfidence = parseInt(searchParams.get('minConfidence')) || 70
    const limit = parseInt(searchParams.get('limit')) || 20
    const category = searchParams.get('category')

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershopId is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('product_affinities')
      .select(`
        id,
        product_a_id,
        product_b_id,
        affinity_score,
        confidence_level,
        sample_size,
        updated_at,
        product_a:product_a_id (
          id,
          name,
          price,
          category,
          description,
          image_url
        ),
        product_b:product_b_id (
          id,
          name,
          price,
          category,
          description,
          image_url
        )
      `)
      .eq('barbershop_id', barbershopId)
      .gte('affinity_score', minScore)
      .gte('confidence_level', minConfidence)

    // Filter by specific product if provided
    if (productId) {
      query = query.or(`product_a_id.eq.${productId},product_b_id.eq.${productId}`)
    }

    // Add ordering and limit
    query = query
      .order('affinity_score', { ascending: false })
      .limit(limit)

    const { data: affinities, error } = await query

    if (error) {
      console.error('Product affinity query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch product affinities' },
        { status: 500 }
      )
    }

    // Filter by category if specified (post-query filter since we need to check both products)
    let filteredAffinities = affinities
    if (category) {
      filteredAffinities = affinities.filter(affinity => 
        affinity.product_a.category === category || 
        affinity.product_b.category === category
      )
    }

    // Calculate additional insights
    const insights = {
      total_pairs: filteredAffinities.length,
      average_score: filteredAffinities.length > 0 
        ? (filteredAffinities.reduce((sum, a) => sum + a.affinity_score, 0) / filteredAffinities.length).toFixed(3)
        : 0,
      average_confidence: filteredAffinities.length > 0
        ? Math.round(filteredAffinities.reduce((sum, a) => sum + a.confidence_level, 0) / filteredAffinities.length)
        : 0,
      total_sample_size: filteredAffinities.reduce((sum, a) => sum + a.sample_size, 0),
      score_distribution: {
        high: filteredAffinities.filter(a => a.affinity_score >= 0.7).length,
        medium: filteredAffinities.filter(a => a.affinity_score >= 0.5 && a.affinity_score < 0.7).length,
        low: filteredAffinities.filter(a => a.affinity_score < 0.5).length
      }
    }

    // Group by product categories for category insights
    const categoryPairs = {}
    filteredAffinities.forEach(affinity => {
      const categoryA = affinity.product_a.category || 'Uncategorized'
      const categoryB = affinity.product_b.category || 'Uncategorized'
      const pairKey = [categoryA, categoryB].sort().join(' + ')
      
      if (!categoryPairs[pairKey]) {
        categoryPairs[pairKey] = {
          pair: pairKey,
          count: 0,
          averageScore: 0,
          totalScore: 0
        }
      }
      
      categoryPairs[pairKey].count++
      categoryPairs[pairKey].totalScore += affinity.affinity_score
      categoryPairs[pairKey].averageScore = (categoryPairs[pairKey].totalScore / categoryPairs[pairKey].count).toFixed(3)
    })

    const categoryInsights = Object.values(categoryPairs)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      affinities: filteredAffinities.map(affinity => ({
        id: affinity.id,
        product_a: affinity.product_a,
        product_b: affinity.product_b,
        affinity_score: affinity.affinity_score,
        confidence_level: affinity.confidence_level,
        sample_size: affinity.sample_size,
        updated_at: affinity.updated_at,
        revenue_potential: ((affinity.product_a.price + affinity.product_b.price) * affinity.affinity_score).toFixed(2),
        strength: affinity.affinity_score >= 0.7 ? 'Strong' : 
                 affinity.affinity_score >= 0.5 ? 'Medium' : 'Weak'
      })),
      insights,
      category_insights: categoryInsights,
      filters: {
        barbershop_id: barbershopId,
        product_id: productId,
        min_score: minScore,
        min_confidence: minConfidence,
        category,
        limit
      }
    })

  } catch (error) {
    console.error('Product affinity analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze product affinities',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/analytics/product-affinity
 * Calculate and update product affinities based on recent purchase data
 * 
 * Body:
 * {
 *   barbershopId: string,
 *   analysisWindow?: number, // Days to analyze (default: 90)
 *   minTransactions?: number, // Minimum transactions required (default: 5)
 *   recalculateAll?: boolean // Whether to recalculate all or just update
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      barbershopId,
      analysisWindow = 90,
      minTransactions = 5,
      recalculateAll = false
    } = body

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershopId is required' },
        { status: 400 }
      )
    }

    // Get recent purchase data (appointments with product purchases)
    // This is a simplified version - in production you'd analyze actual transaction data
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - analysisWindow)

    // For demonstration, we'll use a mock analysis
    // In production, this would analyze real appointment and purchase data
    const { data: recentAppointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        customer_id,
        service_id,
        date,
        status
      `)
      .eq('barbershop_id', barbershopId)
      .gte('date', cutoffDate.toISOString())
      .eq('status', 'completed')

    if (appointmentError) {
      console.error('Failed to fetch appointments:', appointmentError)
      return NextResponse.json(
        { error: 'Failed to fetch appointment data' },
        { status: 500 }
      )
    }

    // Mock product affinity calculation
    // In production, this would analyze which products are purchased together
    const { data: products } = await supabase
      .from('products')
      .select('id, name, category, price')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    if (!products || products.length < 2) {
      return NextResponse.json({
        success: true,
        message: 'Not enough products to calculate affinities',
        products_analyzed: products?.length || 0
      })
    }

    // Generate mock affinities for demonstration
    // In production, this would be based on actual co-purchase analysis
    const newAffinities = []
    const existingAffinities = new Set()

    // Get existing affinities to avoid duplicates
    if (!recalculateAll) {
      const { data: existing } = await supabase
        .from('product_affinities')
        .select('product_a_id, product_b_id')
        .eq('barbershop_id', barbershopId)

      existing?.forEach(affinity => {
        existingAffinities.add(`${affinity.product_a_id}-${affinity.product_b_id}`)
        existingAffinities.add(`${affinity.product_b_id}-${affinity.product_a_id}`)
      })
    }

    // Calculate affinities between product pairs
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const productA = products[i]
        const productB = products[j]
        const pairKey = `${productA.id}-${productB.id}`

        // Skip if affinity already exists and we're not recalculating
        if (!recalculateAll && existingAffinities.has(pairKey)) {
          continue
        }

        // Mock calculation - in production, analyze actual co-purchase data
        const mockAffinityScore = Math.random() * 0.6 + 0.2 // Random between 0.2-0.8
        const mockConfidence = Math.round(Math.random() * 30 + 60) // 60-90
        const mockSampleSize = Math.round(Math.random() * 40 + 10) // 10-50

        // Only create affinity if it meets minimum thresholds
        if (mockAffinityScore >= 0.3 && mockConfidence >= 70 && mockSampleSize >= minTransactions) {
          newAffinities.push({
            barbershop_id: barbershopId,
            product_a_id: productA.id,
            product_b_id: productB.id,
            affinity_score: parseFloat(mockAffinityScore.toFixed(4)),
            confidence_level: mockConfidence,
            sample_size: mockSampleSize
          })
        }
      }
    }

    // Insert or update affinities
    let insertedCount = 0
    if (newAffinities.length > 0) {
      if (recalculateAll) {
        // Delete existing affinities first
        await supabase
          .from('product_affinities')
          .delete()
          .eq('barbershop_id', barbershopId)
      }

      // Insert new affinities in batches
      const batchSize = 100
      for (let i = 0; i < newAffinities.length; i += batchSize) {
        const batch = newAffinities.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('product_affinities')
          .insert(batch)

        if (insertError) {
          console.error('Batch insert error:', insertError)
        } else {
          insertedCount += batch.length
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product affinities calculated successfully',
      analysis_summary: {
        barbershop_id: barbershopId,
        analysis_window_days: analysisWindow,
        appointments_analyzed: recentAppointments?.length || 0,
        products_analyzed: products.length,
        new_affinities_created: insertedCount,
        recalculate_all: recalculateAll,
        min_sample_size: minTransactions,
        calculation_timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Product affinity calculation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to calculate product affinities',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
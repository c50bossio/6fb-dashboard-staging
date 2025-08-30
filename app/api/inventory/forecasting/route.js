import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/inventory/forecasting
 * Get demand forecasts and inventory predictions for a barbershop
 * 
 * Query Parameters:
 * - shopId: UUID of the barbershop
 * - horizon: Number of days to forecast (default: 30)
 * - productId: Optional - get forecast for specific product
 * - includeRecommendations: Boolean - include reorder recommendations (default: true)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const horizon = parseInt(searchParams.get('horizon')) || 30
    const productId = searchParams.get('productId')
    const includeRecommendations = searchParams.get('includeRecommendations') !== 'false'

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      )
    }

    // Get demand forecasts
    let forecastQuery = supabase
      .from('inventory_demand_forecasts')
      .select(`
        id,
        product_id,
        forecast_date,
        forecast_horizon_days,
        predicted_demand,
        confidence_level,
        historical_average,
        seasonal_factor,
        trend_factor,
        model_version,
        created_at,
        products:product_id (
          id,
          name,
          category,
          current_stock,
          cost_price,
          price,
          image_url
        )
      `)
      .eq('shop_id', shopId)
      .eq('forecast_horizon_days', horizon)
      .gte('forecast_date', new Date().toISOString().split('T')[0])

    if (productId) {
      forecastQuery = forecastQuery.eq('product_id', productId)
    }

    forecastQuery = forecastQuery.order('forecast_date', { ascending: true })

    const { data: forecasts, error: forecastError } = await forecastQuery

    if (forecastError) {
      console.error('Forecast query error:', forecastError)
      return NextResponse.json(
        { error: 'Failed to fetch forecasts' },
        { status: 500 }
      )
    }

    // Get reorder recommendations if requested
    let recommendations = []
    if (includeRecommendations) {
      let reorderQuery = supabase
        .from('inventory_reorder_recommendations')
        .select(`
          id,
          product_id,
          current_stock_level,
          reorder_point,
          recommended_order_quantity,
          safety_stock_level,
          predicted_stockout_date,
          recommended_order_date,
          expected_delivery_date,
          lead_time_days,
          carrying_cost_per_unit,
          stockout_cost_estimate,
          total_cost_optimization,
          demand_variability,
          seasonality_impact,
          confidence_score,
          status,
          created_at,
          products:product_id (
            id,
            name,
            category,
            current_stock,
            cost_price,
            price
          )
        `)
        .eq('shop_id', shopId)
        .in('status', ['pending', 'approved'])

      if (productId) {
        reorderQuery = reorderQuery.eq('product_id', productId)
      }

      reorderQuery = reorderQuery.order('predicted_stockout_date', { ascending: true })

      const { data: reorderData, error: reorderError } = await reorderQuery

      if (!reorderError) {
        recommendations = reorderData || []
      }
    }

    // Get current alerts
    const { data: alerts } = await supabase
      .from('inventory_alerts')
      .select(`
        id,
        product_id,
        alert_type,
        severity,
        title,
        message,
        current_value,
        threshold_value,
        priority_score,
        triggered_at,
        products:product_id (
          id,
          name,
          category
        )
      `)
      .eq('shop_id', shopId)
      .eq('status', 'active')
      .order('priority_score', { ascending: false })
      .limit(10)

    // Process forecasts to add insights
    const processedForecasts = forecasts?.map(forecast => {
      const product = forecast.products
      const currentStock = product?.current_stock || 0
      const predictedDemand = forecast.predicted_demand
      
      // Calculate days until stockout
      const daysUntilStockout = currentStock > 0 && predictedDemand > 0 
        ? Math.floor(currentStock / (predictedDemand / horizon))
        : null

      // Calculate reorder urgency
      const urgency = daysUntilStockout !== null && daysUntilStockout <= 7 ? 'high' :
                     daysUntilStockout !== null && daysUntilStockout <= 14 ? 'medium' : 'low'

      return {
        ...forecast,
        insights: {
          days_until_stockout: daysUntilStockout,
          daily_demand_rate: predictedDemand / horizon,
          urgency_level: urgency,
          seasonal_impact: forecast.seasonal_factor > 1.1 ? 'increasing' : 
                          forecast.seasonal_factor < 0.9 ? 'decreasing' : 'stable',
          trend_direction: forecast.trend_factor > 1.1 ? 'growing' :
                          forecast.trend_factor < 0.9 ? 'declining' : 'stable'
        }
      }
    }) || []

    // Calculate summary statistics
    const summary = {
      total_products_forecasted: processedForecasts.length,
      average_confidence: processedForecasts.length > 0 
        ? (processedForecasts.reduce((sum, f) => sum + f.confidence_level, 0) / processedForecasts.length).toFixed(3)
        : 0,
      products_need_reorder_soon: processedForecasts.filter(f => 
        f.insights.days_until_stockout !== null && f.insights.days_until_stockout <= 7
      ).length,
      total_predicted_demand: processedForecasts.reduce((sum, f) => sum + f.predicted_demand, 0),
      seasonal_products: processedForecasts.filter(f => 
        f.seasonal_factor > 1.1 || f.seasonal_factor < 0.9
      ).length,
      trending_products: processedForecasts.filter(f => 
        f.trend_factor > 1.1 || f.trend_factor < 0.9
      ).length
    }

    return NextResponse.json({
      success: true,
      forecasts: processedForecasts,
      recommendations,
      alerts: alerts || [],
      summary,
      metadata: {
        shop_id: shopId,
        forecast_horizon_days: horizon,
        forecast_date: new Date().toISOString().split('T')[0],
        generated_at: new Date().toISOString(),
        includes_recommendations: includeRecommendations
      }
    })

  } catch (error) {
    console.error('Inventory forecasting error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch inventory forecasts',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inventory/forecasting
 * Generate or update demand forecasts for a barbershop
 * 
 * Body:
 * {
 *   shopId: string,
 *   forecastDays?: number (default: 30),
 *   recalculateAll?: boolean (default: false),
 *   productIds?: string[] (optional - specific products only)
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      shopId,
      forecastDays = 30,
      recalculateAll = false,
      productIds
    } = body

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      )
    }

    // Get products to forecast
    let productsQuery = supabase
      .from('products')
      .select('id, name, category, current_stock, cost_price')
      .eq('shop_id', shopId)
      .eq('is_active', true)

    if (productIds && Array.isArray(productIds)) {
      productsQuery = productsQuery.in('id', productIds)
    }

    const { data: products, error: productsError } = await productsQuery

    if (productsError || !products) {
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    const forecasts = []
    const recommendations = []
    
    // Generate forecasts for each product
    for (const product of products) {
      // Get historical usage patterns
      const { data: usagePatterns } = await supabase
        .from('inventory_usage_patterns')
        .select('*')
        .eq('shop_id', shopId)
        .eq('product_id', product.id)
        .gte('pattern_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('pattern_date', { ascending: false })

      // Calculate historical metrics
      const totalUsage = usagePatterns?.reduce((sum, p) => sum + p.units_sold, 0) || 0
      const daysWithData = usagePatterns?.length || 1
      const historicalAverage = totalUsage / Math.max(daysWithData, 1)

      // Simple seasonal and trend calculations
      // In production, this would use more sophisticated ML models
      const currentMonth = new Date().getMonth() + 1
      const seasonalFactor = 1.0 + (Math.sin(currentMonth / 12 * 2 * Math.PI) * 0.2) // ±20% seasonal variation
      
      // Calculate trend from recent vs older data
      const recentPatterns = usagePatterns?.slice(0, 15) || []
      const olderPatterns = usagePatterns?.slice(15, 30) || []
      
      const recentAvg = recentPatterns.length > 0 
        ? recentPatterns.reduce((sum, p) => sum + p.units_sold, 0) / recentPatterns.length 
        : historicalAverage
      const olderAvg = olderPatterns.length > 0 
        ? olderPatterns.reduce((sum, p) => sum + p.units_sold, 0) / olderPatterns.length 
        : historicalAverage

      const trendFactor = olderAvg > 0 ? Math.max(0.5, Math.min(2.0, recentAvg / olderAvg)) : 1.0

      // Predict demand
      const predictedDemand = Math.max(0, historicalAverage * seasonalFactor * trendFactor * forecastDays)
      
      // Calculate confidence based on data quality
      const confidence = Math.max(0.3, Math.min(0.95, daysWithData / 30))

      // Create forecast
      const forecast = {
        shop_id: shopId,
        product_id: product.id,
        forecast_date: new Date().toISOString().split('T')[0],
        forecast_horizon_days: forecastDays,
        predicted_demand: parseFloat(predictedDemand.toFixed(2)),
        confidence_level: parseFloat(confidence.toFixed(4)),
        historical_average: parseFloat(historicalAverage.toFixed(2)),
        seasonal_factor: parseFloat(seasonalFactor.toFixed(4)),
        trend_factor: parseFloat(trendFactor.toFixed(4)),
        model_version: 'simple-v1.0',
        training_data_size: daysWithData
      }

      forecasts.push(forecast)

      // Generate reorder recommendation if needed
      const currentStock = product.current_stock || 0
      const dailyDemand = predictedDemand / forecastDays
      const leadTimeDays = 7 // Default lead time
      
      // Calculate reorder point (simple formula)
      const demandVariability = Math.max(0.1, confidence < 0.7 ? 0.5 : 0.3)
      const safetyStock = Math.ceil(dailyDemand * leadTimeDays * demandVariability)
      const reorderPoint = Math.ceil(dailyDemand * leadTimeDays) + safetyStock
      
      if (currentStock <= reorderPoint) {
        // Calculate recommended order quantity (Economic Order Quantity approximation)
        const annualDemand = predictedDemand * (365 / forecastDays)
        const orderingCost = 50 // Assumed ordering cost
        const holdingCostPerUnit = (product.cost_price || 10) * 0.25 // 25% of product cost
        
        const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit)
        const recommendedQuantity = Math.max(Math.ceil(eoq / 4), Math.ceil(dailyDemand * 30)) // At least 30 days supply

        const daysUntilStockout = currentStock > 0 && dailyDemand > 0 
          ? Math.floor(currentStock / dailyDemand) 
          : 0

        const recommendation = {
          shop_id: shopId,
          product_id: product.id,
          current_stock_level: currentStock,
          reorder_point: reorderPoint,
          recommended_order_quantity: recommendedQuantity,
          safety_stock_level: safetyStock,
          predicted_stockout_date: daysUntilStockout > 0 
            ? new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          recommended_order_date: new Date(Date.now() + Math.max(0, daysUntilStockout - leadTimeDays) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          expected_delivery_date: new Date(Date.now() + Math.max(leadTimeDays, daysUntilStockout) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          lead_time_days: leadTimeDays,
          carrying_cost_per_unit: parseFloat(holdingCostPerUnit.toFixed(4)),
          stockout_cost_estimate: dailyDemand * (product.price - product.cost_price) * 3, // 3 days of lost profit
          demand_variability: parseFloat(demandVariability.toFixed(4)),
          seasonality_impact: Math.abs(seasonalFactor - 1.0),
          confidence_score: confidence,
          status: 'pending'
        }

        recommendations.push(recommendation)
      }
    }

    // Insert/update forecasts in database
    let forecastsCreated = 0
    if (forecasts.length > 0) {
      if (recalculateAll) {
        // Delete existing forecasts for this shop and date
        await supabase
          .from('inventory_demand_forecasts')
          .delete()
          .eq('shop_id', shopId)
          .eq('forecast_date', new Date().toISOString().split('T')[0])
      }

      // Insert forecasts in batches
      const batchSize = 50
      for (let i = 0; i < forecasts.length; i += batchSize) {
        const batch = forecasts.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('inventory_demand_forecasts')
          .upsert(batch, { 
            onConflict: 'shop_id,product_id,forecast_date',
            ignoreDuplicates: false 
          })

        if (!insertError) {
          forecastsCreated += batch.length
        } else {
          console.error('Forecast insert error:', insertError)
        }
      }
    }

    // Insert/update recommendations
    let recommendationsCreated = 0
    if (recommendations.length > 0) {
      for (const recommendation of recommendations) {
        const { error: insertError } = await supabase
          .from('inventory_reorder_recommendations')
          .upsert(recommendation, {
            onConflict: 'shop_id,product_id',
            ignoreDuplicates: false
          })

        if (!insertError) {
          recommendationsCreated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory forecasts generated successfully',
      results: {
        shop_id: shopId,
        products_analyzed: products.length,
        forecasts_created: forecastsCreated,
        recommendations_created: recommendationsCreated,
        forecast_horizon_days: forecastDays,
        recalculate_all: recalculateAll,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Forecast generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate forecasts',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
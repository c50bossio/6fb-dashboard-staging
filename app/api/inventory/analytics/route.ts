import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const barbershop_id = searchParams.get('barbershop_id')
    const days = parseInt(searchParams.get('days') || '30')

    if (!barbershop_id) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 })
    }

    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - days)

    // Get all products for this barbershop
    const { data: products, error: productsError } = await supabase
      .from('barbershop_inventory')
      .select(`
        id,
        name,
        category,
        quantity_available,
        quantity_on_hand,
        cost_price,
        retail_price,
        reorder_point,
        max_stock_level
      `)
      .eq('barbershop_id', barbershop_id)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // Get movements for the specified period
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_adjustments')
      .select(`
        id,
        inventory_id,
        movement_type,
        quantity_change,
        total_cost_change,
        created_at,
        barbershop_inventory!inner(
          name,
          category
        )
      `)
      .eq('barbershop_id', barbershop_id)
      .gte('created_at', dateThreshold.toISOString())

    if (movementsError) {
      console.error('Error fetching movements:', movementsError)
      return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 })
    }

    // Calculate analytics
    const analytics = {
      overview: {
        totalProducts: products?.length || 0,
        totalValue: products?.reduce((sum, p) => sum + ((p.cost_price || 0) * p.quantity_on_hand), 0) || 0,
        lowStockItems: products?.filter(p => p.quantity_available <= p.reorder_point && p.quantity_available > 0).length || 0,
        outOfStockItems: products?.filter(p => p.quantity_available === 0).length || 0,
        overstockItems: products?.filter(p => p.max_stock_level && p.quantity_available > p.max_stock_level).length || 0
      },
      
      movementTrends: {
        totalMovements: movements?.length || 0,
        valueIn: movements?.reduce((sum, m) => sum + (m.quantity_change > 0 ? Math.abs(m.total_cost_change || 0) : 0), 0) || 0,
        valueOut: movements?.reduce((sum, m) => sum + (m.quantity_change < 0 ? Math.abs(m.total_cost_change || 0) : 0), 0) || 0
      },

      categoryBreakdown: {},
      
      topProducts: {
        mostUsed: [],
        highestValue: products?.sort((a, b) => 
          ((b.cost_price || 0) * b.quantity_on_hand) - ((a.cost_price || 0) * a.quantity_on_hand)
        ).slice(0, 5) || []
      },

      reorderRecommendations: products?.filter(p => 
        p.quantity_available <= p.reorder_point
      ).map(p => ({
        name: p.name,
        currentStock: p.quantity_available,
        reorderPoint: p.reorder_point,
        priority: p.quantity_available === 0 ? 'critical' : 'medium',
        estimatedCost: p.cost_price || 0
      })) || [],

      dailyTrends: []
    }

    // Calculate category breakdown
    const categories = [...new Set(products?.map(p => p.category).filter(Boolean) || [])]
    
    for (const category of categories) {
      const categoryProducts = products?.filter(p => p.category === category) || []
      const categoryMovements = movements?.filter(m => 
        m.barbershop_inventory?.category === category
      ) || []

      analytics.categoryBreakdown[category] = {
        productCount: categoryProducts.length,
        totalValue: categoryProducts.reduce((sum, p) => sum + ((p.cost_price || 0) * p.quantity_on_hand), 0),
        averageTurnover: categoryMovements.length > 0 ? 
          Math.abs(categoryMovements.reduce((sum, m) => sum + m.quantity_change, 0)) / categoryProducts.length : 0,
        lowStockCount: categoryProducts.filter(p => p.quantity_available <= p.reorder_point).length
      }
    }

    // Calculate top products by usage (movements)
    const productUsage: { [key: string]: { name: string, category: string, totalUsed: number, usageCount: number } } = {}
    
    movements?.forEach(m => {
      if (m.quantity_change < 0) { // Only count usage/sales, not receives
        const productId = m.inventory_id
        const product = m.barbershop_inventory
        
        if (!productUsage[productId]) {
          productUsage[productId] = {
            name: product?.name || 'Unknown',
            category: product?.category || 'Uncategorized',
            totalUsed: 0,
            usageCount: 0
          }
        }
        
        productUsage[productId].totalUsed += Math.abs(m.quantity_change)
        productUsage[productId].usageCount += 1
      }
    })

    analytics.topProducts.mostUsed = Object.values(productUsage)
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 5)

    // Calculate daily trends for the last 7 days
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayMovements = movements?.filter(m => 
        m.created_at?.startsWith(dateStr)
      ) || []
      
      const received = dayMovements
        .filter(m => m.quantity_change > 0)
        .reduce((sum, m) => sum + m.quantity_change, 0)
      
      const used = dayMovements
        .filter(m => m.quantity_change < 0)
        .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0)
      
      last7Days.push({
        date: dateStr,
        received,
        used,
        net: received - used
      })
    }

    analytics.dailyTrends = last7Days

    return NextResponse.json({ analytics })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
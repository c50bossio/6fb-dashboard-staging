import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/inventory/analytics - Get inventory analytics and insights
export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barbershopId = searchParams.get('barbershop_id');
    const days = parseInt(searchParams.get('days')) || 30;

    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 });
    }

    // Get date range for analytics
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get inventory data
    const { data: inventory, error: inventoryError } = await supabase
      .from('barbershop_inventory')
      .select('*')
      .eq('barbershop_id', barbershopId);

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError);
      return NextResponse.json({ error: inventoryError.message }, { status: 500 });
    }

    // Get stock movements for the period
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select(`
        *,
        barbershop_inventory:barbershop_inventory_id(
          name,
          category,
          cost_price,
          retail_price
        )
      `)
      .eq('barbershop_id', barbershopId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (movementsError) {
      console.error('Error fetching movements:', movementsError);
      return NextResponse.json({ error: movementsError.message }, { status: 500 });
    }

    // Calculate analytics
    const analytics = {
      overview: {
        totalProducts: inventory.length,
        activeProducts: inventory.filter(p => p.quantity_on_hand > 0).length,
        totalValue: inventory.reduce((sum, p) => sum + (p.quantity_on_hand * (p.cost_price || 0)), 0),
        totalRetailValue: inventory.reduce((sum, p) => sum + (p.quantity_on_hand * (p.retail_price || 0)), 0),
        lowStockItems: inventory.filter(p => p.quantity_on_hand <= p.reorder_point).length,
        outOfStockItems: inventory.filter(p => p.quantity_on_hand === 0).length,
        overstockItems: inventory.filter(p => p.quantity_on_hand > (p.max_stock_level || 50)).length
      },

      // Category analysis
      categoryBreakdown: {},
      
      // Stock turnover analysis
      stockTurnover: {},
      
      // Movement trends
      movementTrends: {
        totalMovements: movements.length,
        received: movements.filter(m => m.quantity_change > 0).length,
        used: movements.filter(m => m.quantity_change < 0).length,
        valueIn: movements.filter(m => m.quantity_change > 0).reduce((sum, m) => sum + (m.total_cost_change || 0), 0),
        valueOut: Math.abs(movements.filter(m => m.quantity_change < 0).reduce((sum, m) => sum + (m.total_cost_change || 0), 0))
      },

      // Top performing products
      topProducts: {
        mostUsed: [],
        highestValue: [],
        fastestTurning: []
      },

      // Forecasting
      reorderRecommendations: inventory.filter(p => p.quantity_on_hand <= p.reorder_point).map(p => ({
        id: p.id,
        name: p.name,
        currentStock: p.quantity_on_hand,
        reorderPoint: p.reorder_point,
        recommendedQuantity: p.reorder_quantity,
        estimatedCost: (p.reorder_quantity || 10) * (p.cost_price || 0),
        daysUntilStockout: calculateDaysUntilStockout(p, movements),
        priority: p.quantity_on_hand === 0 ? 'critical' : 'high'
      }))
    };

    // Calculate category breakdown
    const categories = [...new Set(inventory.map(p => p.category).filter(Boolean))];
    categories.forEach(category => {
      const categoryProducts = inventory.filter(p => p.category === category);
      const categoryMovements = movements.filter(m => 
        m.barbershop_inventory?.category === category
      );
      
      analytics.categoryBreakdown[category] = {
        productCount: categoryProducts.length,
        totalValue: categoryProducts.reduce((sum, p) => sum + (p.quantity_on_hand * (p.cost_price || 0)), 0),
        totalRetailValue: categoryProducts.reduce((sum, p) => sum + (p.quantity_on_hand * (p.retail_price || 0)), 0),
        averageTurnover: calculateCategoryTurnover(categoryProducts, categoryMovements),
        lowStockCount: categoryProducts.filter(p => p.quantity_on_hand <= p.reorder_point).length
      };
    });

    // Calculate top products
    const productUsage = {};
    movements.forEach(movement => {
      if (movement.quantity_change < 0) { // Only count usage/sales
        const productId = movement.barbershop_inventory_id;
        if (!productUsage[productId]) {
          productUsage[productId] = {
            product: movement.barbershop_inventory,
            totalUsed: 0,
            valueUsed: 0,
            usageCount: 0
          };
        }
        productUsage[productId].totalUsed += Math.abs(movement.quantity_change);
        productUsage[productId].valueUsed += Math.abs(movement.total_cost_change || 0);
        productUsage[productId].usageCount += 1;
      }
    });

    // Top 5 most used products
    analytics.topProducts.mostUsed = Object.values(productUsage)
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 5)
      .map(item => ({
        name: item.product?.name || 'Unknown',
        category: item.product?.category,
        totalUsed: item.totalUsed,
        usageCount: item.usageCount,
        averageUsage: item.totalUsed / item.usageCount
      }));

    // Top 5 highest value products
    analytics.topProducts.highestValue = inventory
      .sort((a, b) => (b.quantity_on_hand * (b.retail_price || 0)) - (a.quantity_on_hand * (a.retail_price || 0)))
      .slice(0, 5)
      .map(product => ({
        name: product.name,
        category: product.category,
        quantity: product.quantity_on_hand,
        unitValue: product.retail_price || 0,
        totalValue: product.quantity_on_hand * (product.retail_price || 0)
      }));

    // Daily movement trends for charts
    const dailyTrends = {};
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      last7Days.push(dateString);
      dailyTrends[dateString] = {
        date: dateString,
        received: 0,
        used: 0,
        net: 0
      };
    }

    movements.forEach(movement => {
      const dateString = movement.created_at.split('T')[0];
      if (dailyTrends[dateString]) {
        if (movement.quantity_change > 0) {
          dailyTrends[dateString].received += movement.quantity_change;
        } else {
          dailyTrends[dateString].used += Math.abs(movement.quantity_change);
        }
        dailyTrends[dateString].net = dailyTrends[dateString].received - dailyTrends[dateString].used;
      }
    });

    analytics.dailyTrends = last7Days.map(date => dailyTrends[date]);

    return NextResponse.json({
      analytics,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateDaysUntilStockout(product, movements) {
  // Calculate average daily usage over the last 30 days
  const productMovements = movements
    .filter(m => m.barbershop_inventory_id === product.id && m.quantity_change < 0)
    .slice(-30); // Last 30 movements
  
  if (productMovements.length === 0) return null;
  
  const totalUsed = productMovements.reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);
  const days = Math.min(productMovements.length, 30);
  const dailyUsage = totalUsed / days;
  
  if (dailyUsage === 0) return null;
  
  return Math.floor(product.quantity_on_hand / dailyUsage);
}

function calculateCategoryTurnover(products, movements) {
  if (products.length === 0 || movements.length === 0) return 0;
  
  const totalValue = products.reduce((sum, p) => sum + (p.quantity_on_hand * (p.cost_price || 0)), 0);
  const totalUsedValue = movements
    .filter(m => m.quantity_change < 0)
    .reduce((sum, m) => sum + Math.abs(m.total_cost_change || 0), 0);
  
  return totalValue > 0 ? (totalUsedValue / totalValue * 100) : 0;
}
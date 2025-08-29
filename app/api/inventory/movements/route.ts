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
    const movement_type = searchParams.get('movement_type')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!barbershop_id) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 })
    }

    // Build base query
    let query = supabase
      .from('inventory_adjustments')
      .select(`
        id,
        movement_type,
        quantity_change,
        stock_before,
        stock_after,
        reason,
        notes,
        unit_cost,
        total_cost_change,
        created_at,
        performed_by,
        barbershop_inventory!inner(
          id,
          name,
          sku,
          image_url
        ),
        profiles(
          full_name
        )
      `)
      .eq('barbershop_id', barbershop_id)

    // Filter by movement type if specified
    if (movement_type && movement_type !== 'all') {
      query = query.eq('movement_type', movement_type)
    }

    // Execute query with ordering and limit
    const { data: movements, error: movementsError } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (movementsError) {
      console.error('Error fetching movements:', movementsError)
      return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 })
    }

    // Calculate summary statistics
    const summary = {
      totalMovements: movements?.length || 0,
      totalIn: movements?.reduce((sum, m) => sum + (m.quantity_change > 0 ? m.quantity_change : 0), 0) || 0,
      totalOut: movements?.reduce((sum, m) => sum + (m.quantity_change < 0 ? Math.abs(m.quantity_change) : 0), 0) || 0,
      totalValue: movements?.reduce((sum, m) => sum + Math.abs(m.total_cost_change || 0), 0) || 0,
      movementTypes: [...new Set(movements?.map(m => m.movement_type) || [])]
    }

    return NextResponse.json({
      movements: movements || [],
      summary
    })

  } catch (error) {
    console.error('Movements API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
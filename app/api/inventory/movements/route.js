import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/inventory/movements - Get stock movement history
export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barberbarbershopId = searchParams.get('barberbarbershop_id');
    const productId = searchParams.get('product_id');
    const movementType = searchParams.get('movement_type');
    const limit = searchParams.get('limit') || 50;
    const offset = searchParams.get('offset') || 0;

    if (!barberbarbershopId) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 });
    }

    // Build query - Use separate queries as per CLAUDE.md pattern to avoid PostgREST issues
    let query = supabase
      .from('inventory_movements')
      .select('*')
      .eq('barberbarbershop_id', barberbarbershopId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (productId) {
      query = query.eq('barbershop_inventory_id', productId);
    }

    if (movementType && movementType !== 'all') {
      query = query.eq('movement_type', movementType);
    }

    const { data: movements, error } = await query;

    if (error) {
      console.error('Error fetching movements:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch related data separately to avoid PostgREST syntax issues
    const productIds = [...new Set(movements.map(m => m.barbershop_inventory_id).filter(Boolean))];
    const userIds = [...new Set(movements.map(m => m.performed_by).filter(Boolean))];

    let products = [];
    let profiles = [];

    if (productIds.length > 0) {
      const { data: productData } = await supabase
        .from('barbershop_inventory')
        .select('id, name, sku, image_url')
        .in('id', productIds);
      products = productData || [];
    }

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      profiles = profileData || [];
    }

    // Merge data in JavaScript
    const enrichedMovements = movements.map(movement => ({
      ...movement,
      barbershop_inventory: products.find(p => p.id === movement.barbershop_inventory_id) || null,
      performer: profiles.find(p => p.id === movement.performed_by) || null
    }));

    // Calculate summary statistics using enriched movements
    const summary = {
      totalMovements: enrichedMovements.length,
      totalIn: enrichedMovements.filter(m => m.quantity_change > 0).reduce((sum, m) => sum + m.quantity_change, 0),
      totalOut: enrichedMovements.filter(m => m.quantity_change < 0).reduce((sum, m) => sum + Math.abs(m.quantity_change), 0),
      totalValue: enrichedMovements.reduce((sum, m) => sum + (m.total_cost_change || 0), 0),
      movementTypes: [...new Set(enrichedMovements.map(m => m.movement_type))]
    };

    return NextResponse.json({
      movements: enrichedMovements,
      summary,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: enrichedMovements.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
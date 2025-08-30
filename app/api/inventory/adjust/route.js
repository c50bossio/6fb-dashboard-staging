import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/inventory/adjust - Adjust inventory levels
export async function POST(request) {
  try {
    // Get user from Supabase auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      barberbarbershop_id,
      inventory_id,
      adjustment_type,
      quantity_change,
      reason,
      notes,
      unit_cost
    } = body;

    // Validate required fields
    if (!barberbarbershop_id || !inventory_id || !adjustment_type || quantity_change === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Get current stock level
    const { data: currentInventory, error: fetchError } = await supabase
      .from('barbershop_inventory')
      .select('quantity_on_hand, name, cost_price')
      .eq('id', inventory_id)
      .single();

    if (fetchError || !currentInventory) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const stockBefore = currentInventory.quantity_on_hand;
    const stockAfter = stockBefore + quantity_change;

    // Validate stock doesn't go negative
    if (stockAfter < 0) {
      return NextResponse.json({ 
        error: `Insufficient stock. Current: ${stockBefore}, Requested change: ${quantity_change}` 
      }, { status: 400 });
    }

    // Start transaction
    const updates = [];

    // Update inventory level
    updates.push(
      supabase
        .from('barbershop_inventory')
        .update({ 
          quantity_on_hand: stockAfter,
          last_counted_at: adjustment_type === 'count' ? new Date().toISOString() : undefined
        })
        .eq('id', inventory_id)
    );

    // Record movement
    const movementData = {
      barberbarbershop_id,
      barbershop_inventory_id: inventory_id,
      movement_type: adjustment_type,
      quantity_change,
      stock_before: stockBefore,
      stock_after: stockAfter,
      reason,
      notes,
      performed_by: user.id,
      unit_cost: unit_cost || currentInventory.cost_price,
      total_cost_change: quantity_change * (unit_cost || currentInventory.cost_price || 0)
    };

    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .insert(movementData)
      .select()
      .single();

    if (movementError) {
      console.error('Error recording movement:', movementError);
      return NextResponse.json({ error: 'Failed to record movement' }, { status: 500 });
    }

    // Check if alert needed
    if (stockAfter <= (currentInventory.reorder_point || 5)) {
      const alertType = stockAfter === 0 ? 'out_of_stock' : 'low_stock';
      const severity = stockAfter === 0 ? 'critical' : 'warning';

      await supabase
        .from('inventory_alerts')
        .insert({
          barberbarbershop_id,
          alert_type: alertType,
          severity,
          barbershop_inventory_id: inventory_id,
          product_name: currentInventory.name,
          current_stock: stockAfter,
          reorder_point: currentInventory.reorder_point || 5
        });
    }

    // Update the inventory record
    const { error: updateError } = await supabase
      .from('barbershop_inventory')
      .update({ quantity_on_hand: stockAfter })
      .eq('id', inventory_id);

    if (updateError) {
      console.error('Error updating inventory:', updateError);
      return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      movement,
      inventory: {
        id: inventory_id,
        stock_before: stockBefore,
        stock_after: stockAfter,
        adjustment: quantity_change
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory/bulk-adjust - Bulk inventory adjustments (e.g., cycle count)
export async function PUT(request) {
  try {
    // Get user from Supabase auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { barberbarbershop_id, adjustments, adjustment_type = 'count' } = body;

    if (!barberbarbershop_id || !adjustments || !Array.isArray(adjustments)) {
      return NextResponse.json({ 
        error: 'Invalid request format' 
      }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const adjustment of adjustments) {
      try {
        // Get current stock
        const { data: current } = await supabase
          .from('barbershop_inventory')
          .select('quantity_on_hand, name, cost_price')
          .eq('id', adjustment.inventory_id)
          .single();

        if (!current) {
          errors.push({
            inventory_id: adjustment.inventory_id,
            error: 'Product not found'
          });
          continue;
        }

        const stockBefore = current.quantity_on_hand;
        const stockAfter = adjustment.new_quantity;
        const quantityChange = stockAfter - stockBefore;

        // Update inventory
        await supabase
          .from('barbershop_inventory')
          .update({ 
            quantity_on_hand: stockAfter,
            last_counted_at: new Date().toISOString()
          })
          .eq('id', adjustment.inventory_id);

        // Record movement
        await supabase
          .from('inventory_movements')
          .insert({
            barberbarbershop_id,
            barbershop_inventory_id: adjustment.inventory_id,
            movement_type: adjustment_type,
            quantity_change: quantityChange,
            stock_before: stockBefore,
            stock_after: stockAfter,
            reason: adjustment.reason || 'Cycle count',
            notes: adjustment.notes,
            performed_by: user.id,
            unit_cost: current.cost_price,
            total_cost_change: quantityChange * (current.cost_price || 0)
          });

        results.push({
          inventory_id: adjustment.inventory_id,
          name: current.name,
          stock_before: stockBefore,
          stock_after: stockAfter,
          adjustment: quantityChange
        });

      } catch (err) {
        errors.push({
          inventory_id: adjustment.inventory_id,
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: adjustments.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      barbershop_id,
      inventory_id,
      adjustment_type,
      quantity_change,
      reason,
      notes
    } = body

    if (!barbershop_id || !inventory_id || !quantity_change || !adjustment_type) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Get current product data
    const { data: product, error: productError } = await supabase
      .from('barbershop_inventory')
      .select('quantity_on_hand, quantity_available, cost_price, name')
      .eq('id', inventory_id)
      .eq('barbershop_id', barbershop_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const stockBefore = product.quantity_available
    const stockAfter = Math.max(0, stockBefore + quantity_change)
    const actualChange = stockAfter - stockBefore

    // Update inventory quantities
    const { error: updateError } = await supabase
      .from('barbershop_inventory')
      .update({
        quantity_on_hand: Math.max(0, product.quantity_on_hand + actualChange),
        quantity_available: stockAfter,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventory_id)

    if (updateError) {
      console.error('Error updating inventory:', updateError)
      return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
    }

    // Create movement record
    const { data: movement, error: movementError } = await supabase
      .from('inventory_adjustments')
      .insert({
        barbershop_id,
        inventory_id,
        movement_type: adjustment_type,
        quantity_change: actualChange,
        stock_before: stockBefore,
        stock_after: stockAfter,
        reason: reason || 'Manual adjustment',
        notes: notes || null,
        unit_cost: product.cost_price || 0,
        total_cost_change: (product.cost_price || 0) * actualChange,
        performed_by: barbershop_id, // Will be updated with proper user ID when auth is added
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (movementError) {
      console.error('Error creating movement record:', movementError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      success: true,
      stockBefore,
      stockAfter,
      actualChange,
      productName: product.name
    })

  } catch (error) {
    console.error('Inventory adjustment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      barbershop_id,
      adjustments,
      adjustment_type
    } = body

    if (!barbershop_id || !adjustments || !Array.isArray(adjustments)) {
      return NextResponse.json({ 
        error: 'Missing required fields or invalid adjustments array' 
      }, { status: 400 })
    }

    const results = []

    // Process each adjustment
    for (const adjustment of adjustments) {
      const { inventory_id, new_count } = adjustment

      if (!inventory_id || new_count === undefined) {
        continue
      }

      // Get current product data
      const { data: product, error: productError } = await supabase
        .from('barbershop_inventory')
        .select('quantity_on_hand, quantity_available, cost_price, name')
        .eq('id', inventory_id)
        .eq('barbershop_id', barbershop_id)
        .single()

      if (productError || !product) {
        continue
      }

      const stockBefore = product.quantity_available
      const stockAfter = Math.max(0, new_count)
      const actualChange = stockAfter - stockBefore

      if (actualChange === 0) {
        continue // No change needed
      }

      // Update inventory quantities
      const { error: updateError } = await supabase
        .from('barbershop_inventory')
        .update({
          quantity_on_hand: Math.max(0, product.quantity_on_hand + actualChange),
          quantity_available: stockAfter,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventory_id)

      if (updateError) {
        console.error('Error updating inventory:', updateError)
        continue
      }

      // Create movement record
      await supabase
        .from('inventory_adjustments')
        .insert({
          barbershop_id,
          inventory_id,
          movement_type: adjustment_type || 'count',
          quantity_change: actualChange,
          stock_before: stockBefore,
          stock_after: stockAfter,
          reason: 'Cycle count adjustment',
          notes: `Count updated from ${stockBefore} to ${stockAfter}`,
          unit_cost: product.cost_price || 0,
          total_cost_change: (product.cost_price || 0) * actualChange,
          performed_by: barbershop_id, // Will be updated with proper user ID when auth is added
          created_at: new Date().toISOString()
        })

      results.push({
        inventory_id,
        productName: product.name,
        stockBefore,
        stockAfter,
        actualChange
      })
    }

    return NextResponse.json({ 
      success: true,
      results,
      processedCount: results.length
    })

  } catch (error) {
    console.error('Bulk adjustment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
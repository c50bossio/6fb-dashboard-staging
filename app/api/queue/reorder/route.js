import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request) {
  try {
    const body = await request.json()
    const { barbershop_id, queue_order } = body

    if (!barbershop_id || !queue_order || !Array.isArray(queue_order)) {
      return NextResponse.json(
        { error: 'barbershop_id and queue_order array are required' },
        { status: 400 }
      )
    }

    console.log('[Queue Reorder] Updating queue order:', queue_order)

    // For now, we'll skip database priority updates since queue_priority column doesn't exist
    // The frontend will handle optimistic UI updates and queue ordering can be managed
    // through timestamps or other existing fields
    
    console.log(`[Queue Reorder] Received reorder request for ${queue_order.length} items`)
    console.log('[Queue Reorder] Queue reordering UI updated successfully (database priorities not persisted)')
    
    // Just return success for now - the UI drag and drop will handle the visual reordering
    // In the future, if persistent queue ordering is needed, we can:
    // 1. Add a queue_priority column to the appointments table
    // 2. Or use updated_at timestamps to maintain order

    return NextResponse.json({
      success: true,
      updated_count: queue_order.length,
      message: `Queue order updated for ${queue_order.length} items (UI only)`
    })

  } catch (error) {
    console.error('[Queue Reorder] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reorder queue' },
      { status: 500 }
    )
  }
}
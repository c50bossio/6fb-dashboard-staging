import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { updates } = await request.json()
    
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid updates data' },
        { status: 400 }
      )
    }
    
    // Update each product's POS settings
    const updatePromises = updates.map(async (update) => {
      const { id, show_in_pos, pos_display_order } = update
      
      return supabase
        .from('products')
        .update({
          show_in_pos,
          pos_display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    })
    
    const results = await Promise.all(updatePromises)
    
    // Check for errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Errors updating POS settings:', errors)
      return NextResponse.json(
        { error: 'Failed to update some products', details: errors },
        { status: 500 }
      )
    }
    
    // Count how many products are now enabled for POS
    const enabledCount = updates.filter(u => u.show_in_pos).length
    
    return NextResponse.json({
      success: true,
      message: `POS settings updated for ${updates.length} products`,
      enabledCount,
      totalCount: updates.length
    })
    
  } catch (error) {
    console.error('Error updating POS settings:', error)
    return NextResponse.json(
      { error: 'Failed to update POS settings' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // Get products that are enabled for POS
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('show_in_pos', true)
      .order('pos_display_order', { ascending: true })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      products,
      count: products.length
    })
    
  } catch (error) {
    console.error('Error fetching POS products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch POS products' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfhqjdoydihajmjxniee.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c"
)

export async function GET() {
  try {
    const barbershopId = '550e8400-e29b-41d4-a716-446655440000'
    
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const metrics = {
      totalProducts: products?.length || 0,
      totalValue: products?.reduce((sum, p) => sum + (p.current_stock * p.retail_price), 0) || 0,
      lowStock: products?.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length || 0,
      outOfStock: products?.filter(p => p.current_stock === 0).length || 0
    }
    
    return NextResponse.json({
      products: products || [],
      metrics,
      debug: {
        barbershopId,
        message: 'Direct test endpoint bypassing auth'
      }
    })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
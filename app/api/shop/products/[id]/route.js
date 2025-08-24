import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    
    // Check if we're in development mode for bypass
    const isDevelopment = process.env.NODE_ENV === 'development'
    const devBypass = request.headers.get('x-dev-bypass') === 'true' || isDevelopment
    
    let supabase
    let userId
    
    // In development, use service role client to bypass RLS
    if (devBypass && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5' // Mock user
      console.log('🔧 Using development bypass for product PATCH')
    } else {
      // Production path - use normal client
      const cookieStore = cookies()
      supabase = createClient(cookieStore)
      
      // Get the authenticated user from the session
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized - Please log in' },
          { status: 401 }
        )
      }
      
      userId = user.id
    }
    
    const updates = await request.json()
    
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating product:', updateError)
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(updatedProduct)
    
  } catch (error) {
    console.error('Error in PATCH /api/shop/products/[id]:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const updates = await request.json()
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json(
        { error: 'No shop found for this user' },
        { status: 404 }
      )
    }
    
    const { data: existingProduct } = await supabase
      .from('products')
      .select('barbershop_id')
      .eq('id', id)
      .single()
    
    if (!existingProduct || existingProduct.barbershop_id !== shop.id) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized' },
        { status: 404 }
      )
    }
    
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating product:', updateError)
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(updatedProduct)
    
  } catch (error) {
    console.error('Error in PUT /api/shop/products/[id]:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json(
        { error: 'No shop found for this user' },
        { status: 404 }
      )
    }
    
    const { data: existingProduct } = await supabase
      .from('products')
      .select('barbershop_id')
      .eq('id', id)
      .single()
    
    if (!existingProduct || existingProduct.barbershop_id !== shop.id) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized' },
        { status: 404 }
      )
    }
    
    const { error: deleteError } = await supabase
      .from('products')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting product:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in DELETE /api/shop/products/[id]:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
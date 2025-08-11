import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the request body
    const updates = await request.json()
    
    // Get the user's profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Check permissions
    if (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Get the shop owned by this user
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
    
    // Verify the product belongs to this shop
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
    
    // Update the product
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
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the user's profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Check permissions
    if (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Get the shop owned by this user
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
    
    // Verify the product belongs to this shop
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
    
    // Soft delete by setting is_active to false
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
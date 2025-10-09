import { authenticateShopOwnerStrict } from '@/lib/shop-auth'
import { success, notFound, serverError } from '@/lib/api-response'

export const runtime = 'edge'

export async function PUT(request, { params }) {
  try {
    const { id } = params

    // NEW PATTERN: Single function replaces 40+ lines of auth boilerplate
    const { shop, supabase } = await authenticateShopOwnerStrict(request)

    // Get the request body
    const updates = await request.json()

    // Verify the product belongs to this shop
    const { data: existingProduct } = await supabase
      .from('products')
      .select('barbershop_id')
      .eq('id', id)
      .single()

    if (!existingProduct || existingProduct.barbershop_id !== shop.id) {
      return notFound('Product not found or unauthorized')
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
      console.error('[Products API] Update failed:', updateError)
      return serverError('Failed to update product', updateError)
    }

    return success(updatedProduct)

  } catch (error) {
    // Errors from authenticateShopOwnerStrict are already HTTP responses
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Products API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // NEW PATTERN: Single function replaces 40+ lines of auth boilerplate
    const { shop, supabase } = await authenticateShopOwnerStrict(request)

    // Verify the product belongs to this shop
    const { data: existingProduct } = await supabase
      .from('products')
      .select('barbershop_id')
      .eq('id', id)
      .single()

    if (!existingProduct || existingProduct.barbershop_id !== shop.id) {
      return notFound('Product not found or unauthorized')
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
      console.error('[Products API] Delete failed:', deleteError)
      return serverError('Failed to delete product', deleteError)
    }

    return success({ success: true, message: 'Product deleted successfully' })

  } catch (error) {
    // Errors from authenticateShopOwnerStrict are already HTTP responses
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Products API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

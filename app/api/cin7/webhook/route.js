import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfhqjdoydihajmjxniee.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c"
)

export async function POST(request) {
  try {
    console.log('🔔 Cin7 webhook received')
    
    const body = await request.json().catch(() => ({}))
    console.log('📦 Webhook payload:', JSON.stringify(body, null, 2))
    
    const eventType = body.EventType || body.event_type || 'unknown'
    const productData = body.Product || body.product || body.data
    
    console.log(`🎯 Processing webhook event: ${eventType}`)
    
    if (!productData) {
      console.log('⚠️ No product data in webhook payload')
      return NextResponse.json({ status: 'no_data' })
    }
    
    const updatedProduct = mapCin7ProductData(productData)
    
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id, barbershop_id')
      .eq('sku', updatedProduct.sku)
      .single()
    
    if (existingProduct) {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          ...updatedProduct,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProduct.id)
      
      if (updateError) {
        console.error('❌ Error updating product:', updateError)
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }
      
      console.log(`✅ Updated product: ${updatedProduct.name}`)
      
      await logProductChange('updated', existingProduct.id, updatedProduct, existingProduct.barbershop_id)
      
    } else {
      console.log(`ℹ️ Product not found in database: ${updatedProduct.sku}`)
    }
    
    return NextResponse.json({ 
      status: 'success',
      action: existingProduct ? 'updated' : 'not_found',
      product: updatedProduct.name
    })
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({
      error: 'Webhook processing failed',
      message: error.message
    }, { status: 500 })
  }
}

function mapCin7ProductData(productData) {
  const getCostPrice = () => {
    return parseFloat(productData.CostPrice) || 
           parseFloat(productData.DefaultCostPrice) || 
           parseFloat(productData.AverageCost) || 
           parseFloat(productData.Cost) || 
           parseFloat(productData.UnitCost) || 0
  }
  
  const getRetailPrice = () => {
    return parseFloat(productData.SalePrice) || 
           parseFloat(productData.SellingPrice) || 
           parseFloat(productData.DefaultSellPrice) || 
           parseFloat(productData.Price) || 
           parseFloat(productData.UnitPrice) || 
           parseFloat(productData.ListPrice) || 0
  }
  
  const getStock = () => {
    return parseInt(productData.AvailableQuantity) || 
           parseInt(productData.QtyAvailable) || 
           parseInt(productData.QuantityAvailable) || 
           parseInt(productData.StockOnHand) || 
           parseInt(productData.QuantityOnHand) || 0
  }
  
  return {
    name: productData.Name || 'Unnamed Product',
    description: productData.Description || '',
    brand: productData.Brand || '',
    sku: productData.SKU || '',
    cost_price: getCostPrice(),
    retail_price: getRetailPrice(),
    current_stock: getStock(),
    min_stock_level: parseInt(productData.MinimumBeforeReorder) || parseInt(productData.ReorderPoint) || 5,
    max_stock_level: parseInt(productData.ReorderQuantity) || parseInt(productData.MaximumStockLevel) || 100,
    is_active: productData.Status === 'Active' || true
  }
}

async function logProductChange(action, productId, newData, barbershopId) {
  try {
    await supabase
      .from('product_change_logs')
      .insert({
        product_id: productId,
        barbershop_id: barbershopId,
        action: action, // 'created', 'updated', 'deleted'
        changes: newData,
        timestamp: new Date().toISOString(),
        source: 'cin7_webhook'
      })
    
    console.log(`📝 Logged ${action} for product ${productId}`)
    
    
  } catch (error) {
    console.warn('⚠️ Failed to log product change:', error.message)
  }
}

function verifyWebhookSignature(payload, signature, secret) {
  return true
}
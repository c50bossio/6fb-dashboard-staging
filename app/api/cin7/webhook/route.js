import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    console.warn('⚠️ No webhook signature or secret provided')
    return true // Allow for now if signature verification not set up
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')
    
    const providedSignature = signature.replace('sha256=', '')
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

export async function POST(request) {
  try {
    const url = new URL(request.url)
    const webhookPath = url.pathname.split('/').pop()
    
    console.log(`🔔 Cin7 webhook received: ${webhookPath}`)
    
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('X-Cin7-Signature') || request.headers.get('X-Hub-Signature-256')
    
    // Parse JSON body
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('Invalid JSON in webhook payload')
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    
    console.log('📦 Webhook payload:', JSON.stringify(body, null, 2))
    
    // Verify webhook signature (if configured)
    const webhookSecret = process.env.CIN7_WEBHOOK_SECRET
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('❌ Webhook signature verification failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Route to appropriate handler based on webhook path
    switch (webhookPath) {
      case 'stock-updated':
        return await handleStockUpdated(body)
      case 'product-modified':
        return await handleProductModified(body)
      case 'sale-completed':
        return await handleSaleCompleted(body)
      default:
        return await handleGenericWebhook(body)
    }
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({
      error: 'Webhook processing failed',
      message: error.message
    }, { status: 500 })
  }
}

async function handleStockUpdated(body) {
  console.log('📊 Handling stock update webhook')
  
  const productData = body.Product || body.data
  if (!productData) {
    return NextResponse.json({ status: 'no_data' })
  }
  
  // Update stock levels only
  const stockUpdate = {
    current_stock: parseInt(productData.AvailableQuantity || productData.QtyOnHand || 0),
    cin7_last_sync: new Date().toISOString()
  }
  
  const { data: updatedProducts, error } = await supabase
    .from('products')
    .update(stockUpdate)
    .or(`cin7_product_id.eq.${productData.ID},sku.eq.${productData.SKU}`)
    .select()
  
  if (error) {
    console.error('❌ Error updating stock:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  
  console.log(`✅ Updated stock for ${updatedProducts.length} products`)
  return NextResponse.json({ 
    status: 'success',
    action: 'stock_updated',
    updated: updatedProducts.length
  })
}

async function handleProductModified(body) {
  console.log('📝 Handling product modification webhook')
  
  const productData = body.Product || body.data
  if (!productData) {
    return NextResponse.json({ status: 'no_data' })
  }
  
  const updatedProduct = mapCin7ProductData(productData)
  
  const { data: existingProducts, error } = await supabase
    .from('products')
    .update({
      ...updatedProduct,
      cin7_last_sync: new Date().toISOString()
    })
    .or(`cin7_product_id.eq.${productData.ID},sku.eq.${productData.SKU}`)
    .select()
  
  if (error) {
    console.error('❌ Error updating product:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  
  console.log(`✅ Updated ${existingProducts.length} products`)
  return NextResponse.json({ 
    status: 'success',
    action: 'product_modified',
    updated: existingProducts.length
  })
}

async function handleSaleCompleted(body) {
  console.log('💰 Handling sale completion webhook')
  
  // Update stock levels after sale
  const saleData = body.Sale || body.data
  if (!saleData || !saleData.Lines) {
    return NextResponse.json({ status: 'no_sale_data' })
  }
  
  let updatedCount = 0
  
  for (const line of saleData.Lines) {
    if (line.ProductID && line.Quantity) {
      const { data: product } = await supabase
        .from('products')
        .select('id, current_stock')
        .eq('cin7_product_id', line.ProductID)
        .single()
      
      if (product) {
        const newStock = Math.max(0, product.current_stock - line.Quantity)
        
        await supabase
          .from('products')
          .update({ 
            current_stock: newStock,
            cin7_last_sync: new Date().toISOString()
          })
          .eq('id', product.id)
        
        updatedCount++
      }
    }
  }
  
  console.log(`✅ Updated stock for ${updatedCount} products after sale`)
  return NextResponse.json({ 
    status: 'success',
    action: 'sale_completed',
    updated: updatedCount
  })
}

async function handleGenericWebhook(body) {
  console.log('🔄 Handling generic webhook')
  
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
        cin7_last_sync: new Date().toISOString()
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


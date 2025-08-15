import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Direct Supabase connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfhqjdoydihajmjxniee.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c"
)

export async function POST(request) {
  try {
    console.log('⏰ Starting periodic Cin7 sync')
    
    // Get all active Cin7 credentials from database
    const { data: credentials, error: credError } = await supabase
      .from('cin7_credentials')
      .select('*')
      .eq('is_active', true)
    
    if (credError || !credentials || credentials.length === 0) {
      console.log('ℹ️ No active Cin7 credentials found')
      return NextResponse.json({ 
        status: 'skipped', 
        message: 'No active Cin7 integrations to sync' 
      })
    }
    
    const syncResults = []
    
    // Process each barbershop with Cin7 integration
    for (const cred of credentials) {
      try {
        const result = await syncSingleBarbershop(cred)
        syncResults.push({
          barbershop_id: cred.barbershop_id,
          status: 'success',
          ...result
        })
      } catch (error) {
        console.error(`❌ Sync failed for barbershop ${cred.barbershop_id}:`, error)
        syncResults.push({
          barbershop_id: cred.barbershop_id,
          status: 'error',
          error: error.message
        })
      }
    }
    
    // Log sync summary
    const successful = syncResults.filter(r => r.status === 'success').length
    const failed = syncResults.filter(r => r.status === 'error').length
    
    console.log(`✅ Periodic sync complete: ${successful} successful, ${failed} failed`)
    
    return NextResponse.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      summary: {
        total_accounts: credentials.length,
        successful: successful,
        failed: failed
      },
      results: syncResults
    })
    
  } catch (error) {
    console.error('❌ Periodic sync error:', error)
    return NextResponse.json({
      error: 'Periodic sync failed',
      message: error.message
    }, { status: 500 })
  }
}

// Sync products for a single barbershop
async function syncSingleBarbershop(credentials) {
  console.log(`🔄 Syncing products for barbershop ${credentials.barbershop_id}`)
  
  // Decrypt credentials (simple base64 for demo)
  const apiKey = Buffer.from(credentials.encrypted_api_key, 'base64').toString('utf-8')
  const accountId = Buffer.from(credentials.encrypted_account_id, 'base64').toString('utf-8')
  
  // Determine working endpoint
  const apiEndpoints = [
    'https://inventory.dearsystems.com/externalapi/products?limit=100',
    'https://inventory.dearsystems.com/ExternalApi/products?limit=100'
  ]
  
  let workingEndpoint = null
  let productsData = null
  
  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        productsData = data?.ProductList || data?.Products || []
        workingEndpoint = endpoint
        break
      }
    } catch (error) {
      console.log(`⚠️ Endpoint ${endpoint} failed:`, error.message)
    }
  }
  
  if (!workingEndpoint || !productsData) {
    throw new Error('No working Cin7 endpoint found or invalid credentials')
  }
  
  console.log(`📦 Found ${productsData.length} products from Cin7`)
  
  // Get existing products to detect changes
  const { data: existingProducts } = await supabase
    .from('products')
    .select('sku, retail_price, current_stock, updated_at')
    .eq('barbershop_id', credentials.barbershop_id)
  
  const existingProductMap = new Map(existingProducts?.map(p => [p.sku, p]) || [])
  
  let updatedCount = 0
  let newCount = 0
  let unchangedCount = 0
  
  // Process each product
  for (const cin7Product of productsData) {
    const mappedProduct = mapCin7ProductData(cin7Product, credentials.barbershop_id)
    const existing = existingProductMap.get(mappedProduct.sku)
    
    if (existing) {
      // Check if product data has changed
      const hasChanges = (
        existing.retail_price !== mappedProduct.retail_price ||
        existing.current_stock !== mappedProduct.current_stock
      )
      
      if (hasChanges) {
        // Update existing product
        await supabase
          .from('products')
          .update({
            ...mappedProduct,
            updated_at: new Date().toISOString()
          })
          .eq('sku', mappedProduct.sku)
          .eq('barbershop_id', credentials.barbershop_id)
        
        updatedCount++
        
        // Log significant changes
        if (existing.retail_price !== mappedProduct.retail_price) {
          console.log(`💰 Price change for ${mappedProduct.name}: $${existing.retail_price} → $${mappedProduct.retail_price}`)
        }
        if (existing.current_stock !== mappedProduct.current_stock) {
          console.log(`📦 Stock change for ${mappedProduct.name}: ${existing.current_stock} → ${mappedProduct.current_stock}`)
        }
      } else {
        unchangedCount++
      }
    } else {
      // Insert new product
      await supabase
        .from('products')
        .insert(mappedProduct)
      
      newCount++
      console.log(`🆕 New product added: ${mappedProduct.name}`)
    }
  }
  
  // Update last sync timestamp
  await supabase
    .from('cin7_credentials')
    .update({ 
      last_synced: new Date().toISOString(),
      last_sync_result: JSON.stringify({
        total_products: productsData.length,
        new: newCount,
        updated: updatedCount,
        unchanged: unchangedCount
      })
    })
    .eq('barbershop_id', credentials.barbershop_id)
  
  return {
    total_products: productsData.length,
    new: newCount,
    updated: updatedCount,
    unchanged: unchangedCount
  }
}

// Map Cin7 product data with flexible field handling
function mapCin7ProductData(product, barbershopId) {
  // Flexible price mapping
  const getCostPrice = () => {
    return parseFloat(product.CostPrice) || 
           parseFloat(product.DefaultCostPrice) || 
           parseFloat(product.AverageCost) || 
           parseFloat(product.Cost) || 
           parseFloat(product.UnitCost) || 0
  }
  
  const getRetailPrice = () => {
    return parseFloat(product.SalePrice) || 
           parseFloat(product.SellingPrice) || 
           parseFloat(product.DefaultSellPrice) || 
           parseFloat(product.Price) || 
           parseFloat(product.UnitPrice) || 
           parseFloat(product.ListPrice) || 0
  }
  
  const getStock = () => {
    return parseInt(product.AvailableQuantity) || 
           parseInt(product.QtyAvailable) || 
           parseInt(product.QuantityAvailable) || 
           parseInt(product.StockOnHand) || 
           parseInt(product.QuantityOnHand) || 0
  }
  
  return {
    barbershop_id: barbershopId,
    name: product.Name || 'Unnamed Product',
    description: product.Description || '',
    category: mapCategory(product.Category),
    brand: product.Brand || '',
    sku: product.SKU || '',
    cost_price: getCostPrice(),
    retail_price: getRetailPrice(),
    current_stock: getStock(),
    min_stock_level: parseInt(product.MinimumBeforeReorder) || parseInt(product.ReorderPoint) || 5,
    max_stock_level: parseInt(product.ReorderQuantity) || parseInt(product.MaximumStockLevel) || 100,
    is_active: product.Status === 'Active' || true,
    track_inventory: true
  }
}

// Map Cin7 categories to our system
function mapCategory(cin7Category) {
  const categoryMap = {
    'Hair Care': 'hair_care',
    'Beard Care': 'beard_care',
    'Tools': 'tools',
    'Equipment': 'tools',
    'Accessories': 'accessories',
    'Retail': 'accessories'
  }
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (cin7Category?.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }
  
  return 'accessories'
}
/**
 * CIN7 Quick Sync API
 * Performs a fast sync of inventory data
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Cin7Client, decrypt } from '@/lib/cin7-client'

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    // Get barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!barbershop) {
      return NextResponse.json({ 
        success: false,
        error: 'No barbershop found' 
      }, { status: 404 })
    }
    
    console.log('🔍 Checking for saved credentials...')
    const { data: credentials, error: credError } = await supabase
      .from('cin7_credentials')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .single()
    
    if (credError) {
      console.error('❌ Credential retrieval error:', credError)
      return NextResponse.json({
        error: 'Credential access failed',
        message: `Database error: ${credError.message}`,
        needsSetup: true
      }, { status: 500 })
    }
    
    if (!credentials) {
      console.log('❌ No credentials found')
      return NextResponse.json({
        error: 'No saved credentials',
        message: 'Please configure your Cin7 credentials first',
        needsSetup: true
      }, { status: 404 })
    }
    
    console.log('✅ Found credentials, decrypting...')
    
    let apiKey, accountId
    try {
      apiKey = Buffer.from(credentials.encrypted_api_key, 'base64').toString('utf-8')
      accountId = Buffer.from(credentials.encrypted_account_id, 'base64').toString('utf-8')
      console.log('🔐 Credentials decrypted successfully')
    } catch (decryptError) {
      console.error('❌ Decryption error:', decryptError)
      return NextResponse.json({
        error: 'Credential decryption failed',
        message: 'Stored credentials are corrupted. Please re-enter your credentials.',
        needsSetup: true
      }, { status: 500 })
    }
    
    console.log('🚀 Starting sync with saved credentials...')
    
    let syncResult
    try {
      syncResult = await performCin7Sync(apiKey, accountId, barbershop.id, supabase)
    } catch (syncError) {
      console.error('❌ Sync operation failed:', syncError)
      return NextResponse.json({
        error: 'Sync operation failed',
        message: syncError.message,
        needsCredentialCheck: syncError.message.includes('authentication'),
        details: 'The sync operation encountered an error while connecting to Cin7'
      }, { status: 400 }) // Use 400 for sync failures, not 500
    }
    
    await supabase
      .from('cin7_credentials')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('barbershop_id', barbershop.id)
    
    return NextResponse.json({
      success: true,
      message: `Quick sync complete: ${syncResult.insertedCount} products updated`,
      ...syncResult,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Quick sync error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({
      error: 'Quick sync failed',
      message: error.message,
      details: error.stack?.split('\n').slice(0, 3).join(' | ') // First 3 lines of stack trace
    }, { status: 500 })
  }
}

async function performCin7Sync(apiKey, accountId, barbershopId, supabase) {
  console.log('🔍 Starting Cin7 sync with saved credentials...')
  
  const apiEndpoints = [
    'https://inventory.dearsystems.com/externalapi/products?limit=50',
    'https://inventory.dearsystems.com/ExternalApi/products?limit=50'
  ]
  
  let workingEndpoint = null
  let cin7Products = null
  
  for (const endpoint of apiEndpoints) {
    try {
      console.log(`🔍 Testing endpoint: ${endpoint}`)
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
        cin7Products = data?.ProductList || data?.Products || []
        workingEndpoint = endpoint
        console.log(`✅ Found working endpoint with ${cin7Products.length} products`)
        break
      } else if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Endpoint failed: ${endpoint} - ${error.message}`)
    }
  }
  
  if (!workingEndpoint || !cin7Products) {
    throw new Error('No working Cin7 endpoint found or authentication failed')
  }
  
  let debugInfo = { fieldAnalysis: null, sampleProduct: null }
  if (cin7Products.length > 0) {
    const firstProduct = cin7Products[0]
    console.log('🔍 COMPLETE Cin7 API RESPONSE ANALYSIS')
    console.log('=' .repeat(50))
    console.log('📊 Full first product JSON:', JSON.stringify(firstProduct, null, 2))
    console.log('🏷️  All field names:', Object.keys(firstProduct))
    
    const allFields = Object.keys(firstProduct)
    const priceFields = allFields.filter(f => f.toLowerCase().includes('price') || f.toLowerCase().includes('cost') || f.toLowerCase().includes('sell') || f.toLowerCase().includes('tier'))
    const stockFields = allFields.filter(f => f.toLowerCase().includes('stock') || f.toLowerCase().includes('qty') || f.toLowerCase().includes('quantity') || f.toLowerCase().includes('available') || f.toLowerCase().includes('onhand') || f.toLowerCase().includes('hand') || f.toLowerCase().includes('allocated') || f.toLowerCase().includes('order'))
    const categoryFields = allFields.filter(f => f.toLowerCase().includes('category') || f.toLowerCase().includes('type') || f.toLowerCase().includes('group'))
    const supplierFields = allFields.filter(f => f.toLowerCase().includes('supplier') || f.toLowerCase().includes('vendor') || f.toLowerCase().includes('brand'))
    const statusFields = allFields.filter(f => f.toLowerCase().includes('status') || f.toLowerCase().includes('active') || f.toLowerCase().includes('enabled'))
    
    const mapFieldValues = (fields) => fields.reduce((acc, field) => {
      acc[field] = firstProduct[field]
      return acc
    }, {})
    
    debugInfo = {
      fieldAnalysis: {
        totalFields: allFields.length,
        allFields: allFields,
        priceRelatedFields: priceFields,
        stockRelatedFields: stockFields,
        categoryRelatedFields: categoryFields,
        supplierRelatedFields: supplierFields,
        statusRelatedFields: statusFields,
        priceFieldValues: mapFieldValues(priceFields),
        stockFieldValues: mapFieldValues(stockFields),
        categoryFieldValues: mapFieldValues(categoryFields),
        supplierFieldValues: mapFieldValues(supplierFields),
        statusFieldValues: mapFieldValues(statusFields)
      },
      sampleProduct: firstProduct,
      apiResponseMetadata: {
        totalProducts: cin7Products.length,
        responseStructure: Array.isArray(cin7Products) ? 'Products array' : 'Unknown structure',
        firstProductKeys: Object.keys(firstProduct).length
      }
    }
    
    console.log('💰 PRICE FIELDS FOUND:', priceFields)
    console.log('📦 INVENTORY FIELDS FOUND:', stockFields)
    console.log('🏷️  CATEGORY FIELDS:', categoryFields)
    console.log('🏭 SUPPLIER FIELDS:', supplierFields)
    console.log('⚡ STATUS FIELDS:', statusFields)
    console.log('=' .repeat(50))
  }
  
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('barbershop_id', barbershopId)
  
  if (deleteError) {
    console.error('Warning: Could not clear existing products:', deleteError)
  }
  
  const productsToInsert = cin7Products.map(product => {
    const getCostPrice = () => {
      return parseFloat(product.CostPrice) || 
             parseFloat(product.DefaultCostPrice) || 
             parseFloat(product.AverageCost) || 
             parseFloat(product.Cost) || 
             parseFloat(product.UnitCost) || 0
    }
    
    const getRetailPrice = () => {
      return parseFloat(product.PriceTier1) ||           // Cin7 standard price field
             parseFloat(product.SalePrice) || 
             parseFloat(product.SellingPrice) || 
             parseFloat(product.DefaultSellPrice) || 
             parseFloat(product.Price) || 
             parseFloat(product.UnitPrice) || 
             parseFloat(product.ListPrice) || 0
    }
    
    const getStock = () => {
      return parseInt(product.Available) ||             // Cin7 standard available stock
             parseInt(product.OnHand) ||                // Cin7 physical stock
             parseInt(product.AvailableQuantity) || 
             parseInt(product.QtyAvailable) || 
             parseInt(product.QuantityAvailable) || 
             parseInt(product.StockOnHand) || 
             parseInt(product.QuantityOnHand) || 0
    }
    
    const costPrice = getCostPrice()
    const retailPrice = getRetailPrice()
    const stock = getStock()
    
    if (costPrice === 0 && retailPrice === 0) {
      console.log(`⚠️ No price data found for ${product.Name}:`, {
        CostPrice: product.CostPrice,
        SalePrice: product.SalePrice, 
        DefaultSellPrice: product.DefaultSellPrice,
        Price: product.Price,
        SellingPrice: product.SellingPrice
      })
    }
    
    return {
      barbershop_id: barbershopId,
      name: product.Name || 'Unnamed Product',
      description: product.Description || '',
      category: mapCategory(product.Category),
      brand: product.Brand || '',
      sku: product.SKU || '',
      cost_price: costPrice,
      retail_price: retailPrice,
      current_stock: stock,
      min_stock_level: parseInt(product.MinimumBeforeReorder) || parseInt(product.ReorderPoint) || 5,
      max_stock_level: parseInt(product.ReorderQuantity) || parseInt(product.MaximumStockLevel) || 100,
      is_active: product.Status === 'Active' || true,
      track_inventory: true
    }
  })
  
  const batchSize = 10
  let insertedCount = 0
  
  for (let i = 0; i < productsToInsert.length; i += batchSize) {
    const batch = productsToInsert.slice(i, i + batchSize)
    const { error: insertError } = await supabase
      .from('products')
      .insert(batch)
    
    if (insertError) {
      console.error('Error inserting batch:', insertError)
    } else {
      insertedCount += batch.length
    }
  }
  
  const priceStats = {
    productsWithPrices: productsToInsert.filter(p => p.retail_price > 0).length,
    totalProducts: productsToInsert.length,
    averagePrice: productsToInsert.reduce((sum, p) => sum + p.retail_price, 0) / productsToInsert.length
  }
  
  return {
    insertedCount,
    totalProducts: cin7Products.length,
    priceMapping: {
      productsWithValidPrices: priceStats.productsWithPrices,
      totalProducts: priceStats.totalProducts,
      averagePrice: priceStats.averagePrice.toFixed(2),
      pricingSuccess: `${((priceStats.productsWithPrices / priceStats.totalProducts) * 100).toFixed(1)}%`
    },
    sample: productsToInsert.slice(0, 3).map(p => ({
      name: p.name,
      sku: p.sku,
      retail_price: `$${p.retail_price}`,
      cost_price: `$${p.cost_price}`,
      stock: p.current_stock
    }))
  }
}

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
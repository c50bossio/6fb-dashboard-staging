import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfhqjdoydihajmjxniee.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c"
)

const ENCRYPTION_KEY = process.env.CIN7_ENCRYPTION_KEY || 'demo-key-32-chars-for-testing-only'

function decrypt(encryptedText) {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * CIN7 Sync API Endpoint
 * Syncs products from CIN7 to local inventory system
 * POST /api/cin7/sync
 */
export async function POST(request) {
  try {
    const { barbershop_id, sync_type = 'full', product_ids = [] } = await request.json()
    
    // Handle dev bypass for testing
    const devBypass = request.headers.get('x-dev-bypass') === 'true'
    
    if (!barbershop_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'barbershop_id is required' 
      }, { status: 400 })
    }

    console.log('🔄 Starting CIN7 sync for barbershop:', barbershop_id)
    console.log('📊 Sync type:', sync_type)

    // Get CIN7 credentials for this barbershop (try database first, then environment)
    let apiKey, accountId

    // First try to get credentials from database
    const { data: credentials, error: credentialsError } = await supabase
      .from('cin7_credentials')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true)
      .single()

    if (credentials && !credentialsError) {
      // Decrypt database credentials
      try {
        apiKey = decrypt(credentials.encrypted_api_key)
        accountId = decrypt(credentials.encrypted_account_id)
        console.log('✅ Using CIN7 credentials from database')
      } catch (decryptError) {
        console.error('❌ Failed to decrypt CIN7 credentials:', decryptError)
        return NextResponse.json({
          success: false,
          error: 'Failed to decrypt CIN7 credentials',
          needsResetup: true
        }, { status: 500 })
      }
    } else {
      // Fallback to environment variables
      apiKey = process.env.CIN7_API_KEY
      accountId = process.env.CIN7_ACCOUNT_ID

      if (!apiKey || !accountId) {
        console.log('No database credentials found, trying environment variables...')
        console.log('CIN7_API_KEY present:', !!apiKey)
        console.log('CIN7_ACCOUNT_ID present:', !!accountId)
        
        return NextResponse.json({
          success: false,
          error: 'No CIN7 credentials found in database or environment variables',
          needsSetup: true
        }, { status: 404 })
      }
      
      console.log('✅ Using CIN7 credentials from environment variables')
    }

    // Test CIN7 connection
    const testResponse = await fetch('https://inventory.dearsystems.com/externalapi/products?limit=1', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!testResponse.ok) {
      console.error('❌ CIN7 connection test failed:', testResponse.status)
      return NextResponse.json({
        success: false,
        error: `CIN7 API connection failed: ${testResponse.status}`,
        needsCredentialUpdate: true
      }, { status: 500 })
    }

    // Fetch products from CIN7 based on sync type
    let productsResponse
    if (sync_type === 'selective' && product_ids.length > 0) {
      // Fetch specific products by ID
      const productPromises = product_ids.map(async (productId) => {
        const response = await fetch(`https://inventory.dearsystems.com/externalapi/products/${productId}`, {
          headers: {
            'api-auth-accountid': accountId,
            'api-auth-applicationkey': apiKey,
            'Accept': 'application/json'
          }
        })
        if (response.ok) {
          return await response.json()
        }
        return null
      })
      
      const productResults = await Promise.all(productPromises)
      productsResponse = {
        Products: productResults.filter(p => p !== null)
      }
    } else {
      // Full sync - fetch all products
      const limit = 100 // CIN7 API limit
      let page = 1
      let allProducts = []
      
      do {
        const response = await fetch(`https://inventory.dearsystems.com/externalapi/products?limit=${limit}&page=${page}`, {
          headers: {
            'api-auth-accountid': accountId,
            'api-auth-applicationkey': apiKey,
            'Accept': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error(`CIN7 API error: ${response.status}`)
        }
        
        const data = await response.json()
        const products = data.Products || data.ProductList || []
        allProducts = allProducts.concat(products)
        
        // Check if we have more pages
        if (products.length < limit) {
          break
        }
        page++
        
        // Safety limit to prevent infinite loops
        if (page > 50) {
          console.warn('⚠️ Reached page limit (50) during CIN7 sync')
          break
        }
      } while (true)
      
      productsResponse = { Products: allProducts }
    }

    const cin7Products = productsResponse.Products || []
    console.log('📦 Retrieved', cin7Products.length, 'products from CIN7')

    let syncedCount = 0
    let errorCount = 0
    const syncResults = []

    // Process each product
    for (const cin7Product of cin7Products) {
      try {
        // Check if this is a Tomb45/Tune 45 product
        const brand = (cin7Product.Brand || cin7Product.brand || '').toLowerCase()
        const productName = (cin7Product.Name || cin7Product.name || '').toLowerCase()
        const isTomb45 = brand.includes('tomb45') || brand.includes('tune 45') || brand.includes('tune45') ||
                        productName.includes('tomb45') || productName.includes('tune 45')

        // Map CIN7 product to our inventory schema
        const inventoryItem = {
          name: cin7Product.Name || cin7Product.name || 'Unknown Product',
          sku: cin7Product.SKU || cin7Product.sku || `CIN7-${cin7Product.ID || Date.now()}`,
          barcode: cin7Product.Barcode || cin7Product.barcode || null,
          brand: cin7Product.Brand || cin7Product.brand || 'CIN7 Import',
          category: determineCategory(cin7Product),
          current_stock: Math.max(0, parseInt(cin7Product.QuantityAvailable || cin7Product.quantity || 0)),
          min_stock: parseInt(cin7Product.ReorderPoint || cin7Product.min_stock || 5),
          max_stock: parseInt(cin7Product.MaxStock || cin7Product.max_stock || 100),
          unit_cost: parseFloat(cin7Product.AverageCost || cin7Product.cost || 0),
          retail_price: parseFloat(cin7Product.DefaultSellPrice || cin7Product.price || 0),
          supplier: cin7Product.DefaultSupplier || cin7Product.supplier || 'CIN7 Marketplace',
          supplier_sku: cin7Product.SupplierSKU || cin7Product.supplier_sku || null,
          description: cin7Product.Description || cin7Product.description || null,
          // Location tracking for CIN7 integration
          location_type: 'warehouse', // CIN7 products start as warehouse items
          cin7_id: cin7Product.ID || cin7Product.id,
          is_tomb45: isTomb45,
          specifications: {
            cin7_id: cin7Product.ID || cin7Product.id,
            cin7_category: cin7Product.Category || cin7Product.category,
            cin7_brand: cin7Product.Brand || cin7Product.brand,
            weight: cin7Product.Weight || cin7Product.weight,
            dimensions: cin7Product.Dimensions || cin7Product.dimensions,
            sync_source: 'cin7',
            last_cin7_sync: new Date().toISOString()
          },
          is_active: true,
          is_retail: parseFloat(cin7Product.DefaultSellPrice || cin7Product.price || 0) > 0
        }

        // Check if product already exists (by SKU)
        const { data: existingProduct } = await supabase
          .from('inventory')
          .select('id, sku')
          .eq('sku', inventoryItem.sku)
          .single()

        if (existingProduct) {
          // Update existing product
          const { error: updateError } = await supabase
            .from('inventory')
            .update({
              ...inventoryItem,
              updated_at: new Date().toISOString(),
              updated_by: null // System update
            })
            .eq('id', existingProduct.id)

          if (updateError) {
            console.error('❌ Error updating product:', inventoryItem.sku, updateError)
            errorCount++
            syncResults.push({
              sku: inventoryItem.sku,
              action: 'update',
              success: false,
              error: updateError.message
            })
          } else {
            syncedCount++
            syncResults.push({
              sku: inventoryItem.sku,
              action: 'update',
              success: true
            })
          }
        } else {
          // Insert new product
          const { error: insertError } = await supabase
            .from('inventory')
            .insert({
              ...inventoryItem,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: null, // System import
              updated_by: null
            })

          if (insertError) {
            console.error('❌ Error inserting product:', inventoryItem.sku, insertError)
            errorCount++
            syncResults.push({
              sku: inventoryItem.sku,
              action: 'insert',
              success: false,
              error: insertError.message
            })
          } else {
            syncedCount++
            syncResults.push({
              sku: inventoryItem.sku,
              action: 'insert',
              success: true
            })
          }
        }

      } catch (productError) {
        console.error('❌ Error processing product:', productError)
        errorCount++
        syncResults.push({
          sku: cin7Product.SKU || 'unknown',
          action: 'process',
          success: false,
          error: productError.message
        })
      }
    }

    // Update sync timestamp
    await supabase
      .from('cin7_credentials')
      .update({ 
        last_tested: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('barbershop_id', barbershop_id)

    console.log('✅ CIN7 sync completed:', { syncedCount, errorCount, total: cin7Products.length })

    return NextResponse.json({
      success: true,
      message: `CIN7 sync completed successfully`,
      stats: {
        total_products: cin7Products.length,
        synced_count: syncedCount,
        error_count: errorCount,
        sync_type: sync_type
      },
      results: syncResults.slice(0, 10), // Return first 10 results for debugging
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ CIN7 sync failed:', error)
    return NextResponse.json({
      success: false,
      error: 'CIN7 sync failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Determine product category based on CIN7 product data
 */
function determineCategory(cin7Product) {
  const productName = (cin7Product.Name || cin7Product.name || '').toLowerCase()
  const category = (cin7Product.Category || cin7Product.category || '').toLowerCase()
  const brand = (cin7Product.Brand || cin7Product.brand || '').toLowerCase()
  
  // Tomb45/Tune 45 products mapping
  if (brand.includes('tomb45') || brand.includes('tune 45') || brand.includes('tune45')) {
    if (productName.includes('tool') || productName.includes('clipper') || productName.includes('trimmer')) {
      return 'tools'
    }
    return 'hair_products'
  }
  
  // Category mapping
  if (category.includes('tool') || category.includes('equipment') || 
      productName.includes('clipper') || productName.includes('trimmer') || 
      productName.includes('scissors')) {
    return 'tools'
  }
  
  if (category.includes('hair') || category.includes('styling') || 
      productName.includes('pomade') || productName.includes('gel') || 
      productName.includes('shampoo') || productName.includes('conditioner')) {
    return 'hair_products'
  }
  
  if (category.includes('consumable') || category.includes('disposable') ||
      productName.includes('razor') || productName.includes('blade') ||
      productName.includes('cape') || productName.includes('towel')) {
    return 'consumables'
  }
  
  if (category.includes('retail') || category.includes('sale') ||
      productName.includes('retail') || productName.includes('gift')) {
    return 'retail'
  }
  
  // Default to supplies
  return 'supplies'
}

/**
 * GET endpoint for sync status
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')
    
    if (!barbershop_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'barbershop_id parameter is required' 
      }, { status: 400 })
    }

    // Get sync status from credentials table
    const { data: credentials, error } = await supabase
      .from('cin7_credentials')
      .select('last_tested, is_active, api_version, account_name')
      .eq('barbershop_id', barbershop_id)
      .single()

    if (error || !credentials) {
      return NextResponse.json({
        success: false,
        error: 'No CIN7 integration found for this barbershop',
        needsSetup: true
      }, { status: 404 })
    }

    // Get inventory count synced from CIN7
    const { count: syncedCount } = await supabase
      .from('inventory')
      .select('id', { count: 'exact' })
      .eq('specifications->>sync_source', 'cin7')

    return NextResponse.json({
      success: true,
      status: {
        is_active: credentials.is_active,
        last_sync: credentials.last_tested,
        api_version: credentials.api_version,
        account_name: credentials.account_name,
        synced_products_count: syncedCount || 0
      }
    })

  } catch (error) {
    console.error('❌ Error getting sync status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status',
      message: error.message
    }, { status: 500 })
  }
}
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfhqjdoydihajmjxniee.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJiss1MaWciOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c"
)

const ENCRYPTION_KEY = process.env.CIN7_ENCRYPTION_KEY || 'demo-key-32-chars-for-testing-only'

function decrypt(encryptedText) {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * CIN7 Import API Endpoint
 * Import selected products from CIN7 marketplace to local inventory
 * POST /api/cin7/import
 * Body: { barbershop_id, product_ids: [], import_options: {} }
 */
export async function POST(request) {
  try {
    const { 
      barbershop_id, 
      product_ids = [], 
      import_options = {} 
    } = await request.json()
    
    if (!barbershop_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'barbershop_id is required' 
      }, { status: 400 })
    }

    if (!product_ids.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'product_ids array is required and cannot be empty' 
      }, { status: 400 })
    }

    console.log('📦 Importing', product_ids.length, 'products from CIN7 for barbershop:', barbershop_id)

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

    // Fetch specific products from CIN7
    const importResults = []
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0

    for (const productId of product_ids) {
      try {
        console.log('🔍 Fetching CIN7 product:', productId)

        // Fetch individual product from CIN7
        const response = await fetch(`https://inventory.dearsystems.com/externalapi/products/${productId}`, {
          method: 'GET',
          headers: {
            'api-auth-accountid': accountId,
            'api-auth-applicationkey': apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          console.error('❌ CIN7 API error for product', productId, ':', response.status)
          importResults.push({
            cin7_id: productId,
            success: false,
            action: 'fetch',
            error: `CIN7 API error: ${response.status}`
          })
          errorCount++
          continue
        }

        const cin7Product = await response.json()
        
        if (!cin7Product) {
          importResults.push({
            cin7_id: productId,
            success: false,
            action: 'fetch',
            error: 'Product not found in CIN7'
          })
          errorCount++
          continue
        }

        // Apply import options and transform product
        const inventoryItem = transformCin7Product(cin7Product, import_options)
        
        // Check if product already exists (by SKU)
        const { data: existingProduct } = await supabase
          .from('inventory')
          .select('id, sku, name')
          .eq('sku', inventoryItem.sku)
          .single()

        if (existingProduct) {
          // Handle existing product based on import options
          if (import_options.skip_existing) {
            importResults.push({
              cin7_id: productId,
              sku: inventoryItem.sku,
              name: inventoryItem.name,
              success: true,
              action: 'skip',
              message: 'Product already exists (skipped as requested)'
            })
            skippedCount++
            continue
          } else if (import_options.update_existing !== false) {
            // Update existing product
            const { error: updateError } = await supabase
              .from('inventory')
              .update({
                ...inventoryItem,
                updated_at: new Date().toISOString(),
                updated_by: null // System import
              })
              .eq('id', existingProduct.id)

            if (updateError) {
              console.error('❌ Error updating product:', inventoryItem.sku, updateError)
              importResults.push({
                cin7_id: productId,
                sku: inventoryItem.sku,
                name: inventoryItem.name,
                success: false,
                action: 'update',
                error: updateError.message
              })
              errorCount++
            } else {
              importResults.push({
                cin7_id: productId,
                sku: inventoryItem.sku,
                name: inventoryItem.name,
                success: true,
                action: 'update',
                inventory_id: existingProduct.id
              })
              successCount++
            }
          }
        } else {
          // Insert new product
          const { data: insertedProduct, error: insertError } = await supabase
            .from('inventory')
            .insert({
              ...inventoryItem,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: null, // System import
              updated_by: null
            })
            .select('id')
            .single()

          if (insertError) {
            console.error('❌ Error inserting product:', inventoryItem.sku, insertError)
            importResults.push({
              cin7_id: productId,
              sku: inventoryItem.sku,
              name: inventoryItem.name,
              success: false,
              action: 'insert',
              error: insertError.message
            })
            errorCount++
          } else {
            importResults.push({
              cin7_id: productId,
              sku: inventoryItem.sku,
              name: inventoryItem.name,
              success: true,
              action: 'insert',
              inventory_id: insertedProduct.id
            })
            successCount++
          }
        }

      } catch (productError) {
        console.error('❌ Error processing product', productId, ':', productError)
        importResults.push({
          cin7_id: productId,
          success: false,
          action: 'process',
          error: productError.message
        })
        errorCount++
      }
    }

    console.log('✅ CIN7 import completed:', { successCount, errorCount, skippedCount })

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${successCount} products from CIN7`,
      stats: {
        total_requested: product_ids.length,
        success_count: successCount,
        error_count: errorCount,
        skipped_count: skippedCount,
        import_options: import_options
      },
      results: importResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ CIN7 import failed:', error)
    return NextResponse.json({
      success: false,
      error: 'CIN7 import failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Transform CIN7 product to our inventory schema with import options
 */
function transformCin7Product(cin7Product, importOptions = {}) {
  const {
    default_stock_levels = {},
    pricing_adjustments = {},
    enable_pos_sales = true,
    category_override = null,
    supplier_override = null
  } = importOptions

  // Check if this is a Tomb45/Tune 45 product
  const brand = (cin7Product.Brand || cin7Product.brand || '').toLowerCase()
  const productName = (cin7Product.Name || cin7Product.name || '').toLowerCase()
  const isTomb45 = brand.includes('tomb45') || brand.includes('tune 45') || brand.includes('tune45') ||
                  productName.includes('tomb45') || productName.includes('tune 45')

  return {
    name: cin7Product.Name || cin7Product.name || 'Unknown Product',
    sku: cin7Product.SKU || cin7Product.sku || `CIN7-${cin7Product.ID || Date.now()}`,
    barcode: cin7Product.Barcode || cin7Product.barcode || null,
    brand: cin7Product.Brand || cin7Product.brand || 'CIN7 Import',
    category: category_override || determineCategory(cin7Product),
    
    // Stock levels with defaults
    current_stock: Math.max(0, parseInt(cin7Product.QuantityAvailable || cin7Product.quantity || default_stock_levels.initial_stock || 0)),
    min_stock: parseInt(default_stock_levels.min_stock || cin7Product.ReorderPoint || 5),
    max_stock: parseInt(default_stock_levels.max_stock || cin7Product.MaxStock || 100),
    reserved_stock: 0,
    
    // Pricing with adjustments
    unit_cost: applyPricingAdjustment(
      parseFloat(cin7Product.AverageCost || cin7Product.cost || 0),
      pricing_adjustments.cost_multiplier || 1,
      pricing_adjustments.cost_markup || 0
    ),
    retail_price: applyPricingAdjustment(
      parseFloat(cin7Product.DefaultSellPrice || cin7Product.price || 0),
      pricing_adjustments.retail_multiplier || 1,
      pricing_adjustments.retail_markup || 0
    ),
    
    // Supplier information
    supplier: supplier_override || cin7Product.DefaultSupplier || cin7Product.supplier || 'CIN7 Marketplace',
    supplier_sku: cin7Product.SupplierSKU || cin7Product.supplier_sku || null,
    supplier_contact: null,
    
    // Usage and ordering
    usage_rate: 0, // To be determined over time
    reorder_quantity: parseInt(default_stock_levels.reorder_quantity || 20),
    lead_time_days: parseInt(default_stock_levels.lead_time || 7),
    
    // Storage and location
    location: default_stock_levels.location || 'Main Storage',
    storage_requirements: cin7Product.StorageRequirements || null,
    
    // Product details
    description: cin7Product.Description || cin7Product.description || null,
    
    // Location tracking for CIN7 integration
    location_type: 'warehouse', // Imported products start as warehouse items
    cin7_id: cin7Product.ID || cin7Product.id,
    is_tomb45: isTomb45,
    last_ordered_date: null,
    
    specifications: {
      cin7_id: cin7Product.ID || cin7Product.id,
      cin7_category: cin7Product.Category || cin7Product.category,
      cin7_brand: cin7Product.Brand || cin7Product.brand,
      weight: cin7Product.Weight || cin7Product.weight,
      dimensions: cin7Product.Dimensions || cin7Product.dimensions,
      sync_source: 'cin7',
      imported_at: new Date().toISOString(),
      import_options: importOptions,
      is_tomb45: isTomb45
    },
    
    // Active status
    is_active: true,
    is_retail: enable_pos_sales && parseFloat(cin7Product.DefaultSellPrice || cin7Product.price || 0) > 0
  }
}

/**
 * Apply pricing adjustments
 */
function applyPricingAdjustment(basePrice, multiplier, markup) {
  if (basePrice <= 0) return 0
  
  let adjustedPrice = basePrice * multiplier
  if (markup > 0) {
    adjustedPrice += markup
  }
  
  return Math.round(adjustedPrice * 100) / 100 // Round to 2 decimal places
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
 * GET endpoint to retrieve import history and status
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')
    const limit = parseInt(searchParams.get('limit')) || 50
    
    if (!barbershop_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'barbershop_id parameter is required' 
      }, { status: 400 })
    }

    // Get import history from inventory specifications
    const { data: importedProducts, error } = await supabase
      .from('inventory')
      .select(`
        id, name, sku, brand, category,
        current_stock, retail_price, unit_cost,
        specifications, created_at, updated_at
      `)
      .eq('specifications->>sync_source', 'cin7')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ Error fetching import history:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch import history',
        message: error.message
      }, { status: 500 })
    }

    // Transform for frontend
    const importHistory = (importedProducts || []).map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      current_stock: product.current_stock,
      retail_price: product.retail_price,
      unit_cost: product.unit_cost,
      cin7_id: product.specifications?.cin7_id,
      imported_at: product.specifications?.imported_at || product.created_at,
      last_updated: product.updated_at
    }))

    // Get summary stats
    const stats = {
      total_imported: importHistory.length,
      categories: {},
      brands: {},
      total_value: 0
    }

    importHistory.forEach(product => {
      const cat = product.category
      const brand = product.brand
      
      stats.categories[cat] = (stats.categories[cat] || 0) + 1
      stats.brands[brand] = (stats.brands[brand] || 0) + 1
      stats.total_value += (product.retail_price || 0) * (product.current_stock || 0)
    })

    return NextResponse.json({
      success: true,
      import_history: importHistory,
      stats: stats,
      pagination: {
        limit: limit,
        returned: importHistory.length
      }
    })

  } catch (error) {
    console.error('❌ Error getting import history:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get import history',
      message: error.message
    }, { status: 500 })
  }
}
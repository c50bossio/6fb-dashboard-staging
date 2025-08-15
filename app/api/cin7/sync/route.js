import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/cin7-client'

async function fetchCin7Products(accountId, apiKey) {
  try {
    console.log('Fetching products from Cin7 API v2...')
    
    const response = await fetch(`https://inventory.dearsystems.com/ExternalAPI/v2/products`, {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Cin7 API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`Retrieved ${data?.ProductList?.length || 0} products from Cin7`)
    
    return data?.ProductList || []
  } catch (error) {
    console.error('Error fetching products from Cin7:', error)
    throw error
  }
}

async function fetchCin7StockLevels(accountId, apiKey) {
  try {
    console.log('Fetching stock levels from Cin7 API v2...')
    
    const response = await fetch(`https://inventory.dearsystems.com/ExternalAPI/v2/stocklevels`, {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Cin7 Stock API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`Retrieved ${data?.StockItems?.length || 0} stock items from Cin7`)
    
    return data?.StockItems || []
  } catch (error) {
    console.error('Error fetching stock levels from Cin7:', error)
    throw error
  }
}

function mapCin7ProductToLocal(cin7Product, stockLevels, barbershopId) {
  // Find stock information for this product
  const stockInfo = stockLevels.find(stock => 
    stock.ProductID === cin7Product.ID || 
    stock.SKU === cin7Product.SKU
  )
  
  // Map category to barbershop-friendly categories
  const mapCategoryForBarbershop = (cin7Category) => {
    const category = (cin7Category || '').toLowerCase()
    
    if (category.includes('hair') || category.includes('shampoo') || category.includes('conditioner') || 
        category.includes('gel') || category.includes('pomade') || category.includes('wax')) {
      return 'hair_care'
    } else if (category.includes('beard') || category.includes('mustache') || category.includes('oil')) {
      return 'beard_care'
    } else if (category.includes('scissors') || category.includes('clipper') || category.includes('razor') || 
               category.includes('tool') || category.includes('equipment')) {
      return 'tools'
    } else if (category.includes('towel') || category.includes('cape') || category.includes('aftershave') || 
               category.includes('cologne') || category.includes('accessory')) {
      return 'accessories'
    } else {
      return 'uncategorized'
    }
  }
  
  return {
    barbershop_id: barbershopId,
    name: cin7Product.Name || 'Unnamed Product',
    description: cin7Product.Description || '',
    category: mapCategoryForBarbershop(cin7Product.Category),
    brand: cin7Product.Brand || '',
    sku: cin7Product.SKU || '',
    
    // Pricing from product data with multiple fallbacks
    cost_price: parseFloat(
      cin7Product.CostPrice || 
      cin7Product.DefaultCostPrice || 
      cin7Product.AverageCost ||
      cin7Product.LastPurchasePrice ||
      0
    ),
    retail_price: parseFloat(
      cin7Product.SalePrice || 
      cin7Product.DefaultSellPrice || 
      cin7Product.PriceTier1 ||
      cin7Product.ListPrice ||
      0
    ),
    
    // Stock levels from separate stock data with multiple fallbacks
    current_stock: parseInt(
      stockInfo?.Available || 
      stockInfo?.QuantityAvailable || 
      stockInfo?.QtyOnHand ||
      stockInfo?.StockOnHand ||
      cin7Product.QtyOnHand ||
      0
    ),
    min_stock_level: parseInt(
      stockInfo?.MinimumBeforeReorder || 
      cin7Product.MinimumBeforeReorder || 
      cin7Product.ReorderPoint ||
      5
    ),
    max_stock_level: parseInt(
      stockInfo?.ReorderQuantity || 
      cin7Product.ReorderQuantity || 
      cin7Product.MaximumStockLevel ||
      100
    ),
    
    // Enhanced fields for barbershops
    supplier: cin7Product.DefaultSupplier || cin7Product.SupplierName || '',
    unit_of_measure: cin7Product.UOM || cin7Product.UnitOfMeasure || 'each',
    weight: parseFloat(cin7Product.Weight || 0),
    dimensions: cin7Product.Dimensions || '',
    location: stockInfo?.BinLocation || stockInfo?.Location || '',
    
    // Status and metadata
    is_active: cin7Product.Status === 'Active' || cin7Product.IsActive === true,
    track_inventory: cin7Product.IsInventoried !== false, // Default to true unless explicitly false
    
    // Professional/barbershop specific fields
    professional_use: detectProfessionalUse(cin7Product),
    usage_instructions: cin7Product.Instructions || cin7Product.UsageInstructions || '',
    ingredients: cin7Product.Ingredients || cin7Product.Components || '',
    
    // Cin7 specific fields for syncing
    cin7_product_id: cin7Product.ID,
    cin7_sku: cin7Product.SKU,
    cin7_barcode: cin7Product.Barcode || cin7Product.UPC || cin7Product.EAN || '',
    cin7_last_sync: new Date().toISOString(),
    
    // Additional metadata
    created_at: cin7Product.CreatedDate || new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

function detectProfessionalUse(product) {
  const name = (product.Name || '').toLowerCase()
  const description = (product.Description || '').toLowerCase()
  const brand = (product.Brand || '').toLowerCase()
  
  const professionalKeywords = [
    'professional', 'salon', 'barber', 'stylist', 'pro',
    'commercial', 'industrial', 'trade', 'bulk',
    'american crew', 'redken', 'paul mitchell', 'matrix',
    'wahl', 'andis', 'oster', 'babyliss'
  ]
  
  return professionalKeywords.some(keyword => 
    name.includes(keyword) || 
    description.includes(keyword) || 
    brand.includes(keyword)
  )
}

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    console.log('Starting Cin7 product synchronization...')
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user's barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
    
    if (shopError || !barbershop) {
      return NextResponse.json(
        { error: 'No barbershop found for user' },
        { status: 404 }
      )
    }
    
    // Get Cin7 credentials
    const { data: credentials, error: credError } = await supabase
      .from('cin7_credentials')
      .select('encrypted_api_key, encrypted_account_id, account_name, api_version')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .single()
    
    if (credError || !credentials) {
      return NextResponse.json(
        { error: 'No Cin7 credentials found. Please set up your Cin7 connection first.' },
        { status: 404 }
      )
    }
    
    // Decrypt credentials
    let accountId, apiKey
    try {
      accountId = decrypt(JSON.parse(credentials.encrypted_account_id))
      apiKey = decrypt(JSON.parse(credentials.encrypted_api_key))
    } catch (decryptError) {
      console.error('Failed to decrypt Cin7 credentials:', decryptError)
      return NextResponse.json(
        { error: 'Invalid credentials. Please update your Cin7 connection.' },
        { status: 400 }
      )
    }
    
    try {
      console.log(`Syncing from Cin7 account: ${credentials.account_name || 'Unknown'} (API ${credentials.api_version})`)
      
      // Fetch both products and stock levels from Cin7
      const [cin7Products, stockLevels] = await Promise.all([
        fetchCin7Products(accountId, apiKey),
        fetchCin7StockLevels(accountId, apiKey)
      ])
      
      if (cin7Products.length === 0) {
        // Update sync status
        await supabase
          .from('cin7_credentials')
          .update({ 
            last_sync: new Date().toISOString(),
            last_sync_status: 'success'
          })
          .eq('barbershop_id', barbershop.id)
        
        return NextResponse.json({
          success: true,
          count: 0,
          message: 'No products found in Cin7 account'
        })
      }
      
      // Map products with stock information
      const localProducts = cin7Products.map(product => 
        mapCin7ProductToLocal(product, stockLevels, barbershop.id)
      )
      
      // Upsert products to database
      const { data: syncedProducts, error: syncError } = await supabase
        .from('products')
        .upsert(localProducts, { 
          onConflict: 'barbershop_id,sku',
          ignoreDuplicates: false 
        })
        .select()
      
      if (syncError) {
        console.error('Error syncing products:', syncError)
        
        // Update sync status with error
        await supabase
          .from('cin7_credentials')
          .update({ 
            last_sync: new Date().toISOString(),
            last_sync_status: 'failed'
          })
          .eq('barbershop_id', barbershop.id)
        
        return NextResponse.json(
          { error: 'Failed to sync products: ' + syncError.message },
          { status: 500 }
        )
      }
      
      // Update sync status
      await supabase
        .from('cin7_credentials')
        .update({ 
          last_sync: new Date().toISOString(),
          last_sync_status: 'success'
        })
        .eq('barbershop_id', barbershop.id)
      
      console.log(`✅ Successfully synced ${syncedProducts.length} products from Cin7`)
      
      // Count products with stock issues for alert
      const lowStockCount = syncedProducts.filter(p => p.current_stock <= p.min_stock_level).length
      const outOfStockCount = syncedProducts.filter(p => p.current_stock === 0).length
      
      return NextResponse.json({
        success: true,
        count: syncedProducts.length,
        lowStockCount,
        outOfStockCount,
        message: `Successfully synchronized ${syncedProducts.length} products from Cin7`,
        lastSync: new Date().toISOString()
      })
      
    } catch (cin7Error) {
      console.error('Cin7 API error:', cin7Error.message)
      
      // Update sync status with error
      await supabase
        .from('cin7_credentials')
        .update({ 
          last_sync: new Date().toISOString(),
          last_sync_status: 'failed'
        })
        .eq('barbershop_id', barbershop.id)
      
      return NextResponse.json(
        { error: 'Cin7 API connection failed: ' + cin7Error.message },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed: ' + error.message },
      { status: 500 }
    )
  }
}

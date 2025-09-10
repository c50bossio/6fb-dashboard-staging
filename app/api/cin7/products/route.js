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
 * CIN7 Products API Endpoint
 * Browse products from CIN7 marketplace without importing
 * GET /api/cin7/products?barbershop_id=xxx&search=xxx&category=xxx&page=1&limit=20
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const page = parseInt(searchParams.get('page')) || 1
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100)
    const brand = searchParams.get('brand') || ''
    
    if (!barbershop_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'barbershop_id parameter is required' 
      }, { status: 400 })
    }

    console.log('🔍 Browsing CIN7 products for barbershop:', barbershop_id)
    console.log('📊 Filters:', { search, category, brand, page, limit })

    // Get CIN7 credentials for this barbershop
    const { data: credentials, error: credentialsError } = await supabase
      .from('cin7_credentials')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true)
      .single()

    if (credentialsError || !credentials) {
      return NextResponse.json({
        success: false,
        error: 'No CIN7 credentials found for this barbershop',
        needsSetup: true
      }, { status: 404 })
    }

    // Decrypt credentials
    let apiKey, accountId
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

    // Build CIN7 API URL with filters
    let cin7Url = `https://inventory.dearsystems.com/externalapi/products?limit=${limit}&page=${page}`
    
    // Add search filter if provided
    if (search.trim()) {
      cin7Url += `&name=${encodeURIComponent(search.trim())}`
    }

    // Fetch products from CIN7
    const response = await fetch(cin7Url, {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('❌ CIN7 API error:', response.status)
      return NextResponse.json({
        success: false,
        error: `CIN7 API error: ${response.status}`,
        message: 'Failed to fetch products from CIN7'
      }, { status: response.status })
    }

    const data = await response.json()
    let cin7Products = data.Products || data.ProductList || []
    
    // Apply client-side filters (CIN7 API has limited filtering)
    if (category) {
      cin7Products = cin7Products.filter(product => {
        const productCategory = (product.Category || product.category || '').toLowerCase()
        const productName = (product.Name || product.name || '').toLowerCase()
        const productBrand = (product.Brand || product.brand || '').toLowerCase()
        
        switch (category.toLowerCase()) {
          case 'hair_products':
            return productCategory.includes('hair') || productCategory.includes('styling') ||
                   productName.includes('pomade') || productName.includes('gel') ||
                   productName.includes('shampoo') || productName.includes('conditioner')
          case 'tools':
            return productCategory.includes('tool') || productCategory.includes('equipment') ||
                   productName.includes('clipper') || productName.includes('trimmer') ||
                   productName.includes('scissors')
          case 'consumables':
            return productCategory.includes('consumable') || productCategory.includes('disposable') ||
                   productName.includes('razor') || productName.includes('blade') ||
                   productName.includes('cape') || productName.includes('towel')
          case 'retail':
            return productCategory.includes('retail') || productCategory.includes('sale') ||
                   productName.includes('retail') || productName.includes('gift')
          case 'tomb45':
          case 'tune45':
            return productBrand.includes('tomb45') || productBrand.includes('tune 45') || 
                   productBrand.includes('tune45') || productName.includes('tomb45')
          default:
            return true
        }
      })
    }

    if (brand) {
      cin7Products = cin7Products.filter(product => {
        const productBrand = (product.Brand || product.brand || '').toLowerCase()
        return productBrand.includes(brand.toLowerCase())
      })
    }

    // Check which products are already in our inventory
    const skus = cin7Products.map(p => p.SKU || p.sku).filter(Boolean)
    const { data: existingProducts } = await supabase
      .from('inventory')
      .select('sku, id, name, current_stock')
      .in('sku', skus)

    const existingSkuMap = new Map()
    existingProducts?.forEach(product => {
      existingSkuMap.set(product.sku, product)
    })

    // Transform products for frontend consumption
    const transformedProducts = cin7Products.map(cin7Product => {
      const sku = cin7Product.SKU || cin7Product.sku
      const existingProduct = existingSkuMap.get(sku)
      
      return {
        id: cin7Product.ID || cin7Product.id,
        cin7_id: cin7Product.ID || cin7Product.id,
        name: cin7Product.Name || cin7Product.name || 'Unknown Product',
        sku: sku || `CIN7-${cin7Product.ID || Date.now()}`,
        barcode: cin7Product.Barcode || cin7Product.barcode || null,
        brand: cin7Product.Brand || cin7Product.brand || 'CIN7',
        category: determineCategory(cin7Product),
        description: cin7Product.Description || cin7Product.description || null,
        
        // Pricing
        unit_cost: parseFloat(cin7Product.AverageCost || cin7Product.cost || 0),
        retail_price: parseFloat(cin7Product.DefaultSellPrice || cin7Product.price || 0),
        wholesale_price: parseFloat(cin7Product.WholesalePrice || cin7Product.wholesale || 0),
        
        // Stock information
        cin7_stock: parseInt(cin7Product.QuantityAvailable || cin7Product.quantity || 0),
        cin7_on_order: parseInt(cin7Product.QuantityOnOrder || cin7Product.on_order || 0),
        
        // Supplier info
        supplier: cin7Product.DefaultSupplier || cin7Product.supplier || 'CIN7 Marketplace',
        supplier_sku: cin7Product.SupplierSKU || cin7Product.supplier_sku || null,
        
        // Import status
        is_imported: !!existingProduct,
        local_stock: existingProduct?.current_stock || 0,
        local_inventory_id: existingProduct?.id || null,
        
        // Additional metadata
        weight: cin7Product.Weight || cin7Product.weight || null,
        dimensions: cin7Product.Dimensions || cin7Product.dimensions || null,
        image_url: cin7Product.ImageURL || cin7Product.image || null,
        
        // Tomb45 specific flags
        is_tomb45: isTomb45Product(cin7Product),
        is_tune45: isTune45Product(cin7Product),
        
        // Availability
        is_available: (cin7Product.QuantityAvailable || cin7Product.quantity || 0) > 0,
        can_backorder: cin7Product.CanBackorder || cin7Product.backorder || false
      }
    })

    // Get summary stats
    const stats = {
      total_found: transformedProducts.length,
      total_available: transformedProducts.filter(p => p.is_available).length,
      already_imported: transformedProducts.filter(p => p.is_imported).length,
      tomb45_products: transformedProducts.filter(p => p.is_tomb45).length,
      tune45_products: transformedProducts.filter(p => p.is_tune45).length,
      categories: {}
    }

    // Count by category
    transformedProducts.forEach(product => {
      const cat = product.category
      stats.categories[cat] = (stats.categories[cat] || 0) + 1
    })

    console.log('✅ Found', transformedProducts.length, 'CIN7 products')

    return NextResponse.json({
      success: true,
      products: transformedProducts,
      pagination: {
        page: page,
        limit: limit,
        total_found: transformedProducts.length,
        has_more: transformedProducts.length === limit // Estimate
      },
      stats: stats,
      filters: {
        search: search,
        category: category,
        brand: brand
      }
    })

  } catch (error) {
    console.error('❌ Error browsing CIN7 products:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to browse CIN7 products',
      message: error.message
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
  if (isTomb45Product(cin7Product) || isTune45Product(cin7Product)) {
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
 * Check if product is from Tomb45 brand
 */
function isTomb45Product(cin7Product) {
  const brand = (cin7Product.Brand || cin7Product.brand || '').toLowerCase()
  const name = (cin7Product.Name || cin7Product.name || '').toLowerCase()
  
  return brand.includes('tomb45') || brand.includes('tomb 45') || 
         name.includes('tomb45') || name.includes('tomb 45')
}

/**
 * Check if product is from Tune 45 brand
 */
function isTune45Product(cin7Product) {
  const brand = (cin7Product.Brand || cin7Product.brand || '').toLowerCase()
  const name = (cin7Product.Name || cin7Product.name || '').toLowerCase()
  
  return brand.includes('tune45') || brand.includes('tune 45') || 
         name.includes('tune45') || name.includes('tune 45')
}
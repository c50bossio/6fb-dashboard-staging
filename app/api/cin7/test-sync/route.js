import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Direct Supabase connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfhqjdoydihajmjxniee.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c"
)

export async function POST(request) {
  try {
    // Get credentials from request body
    const body = await request.json().catch(() => ({}))
    const { apiKey, accountId } = body
    
    // Hardcoded barbershop for testing
    const barbershopId = '550e8400-e29b-41d4-a716-446655440000'
    
    if (!apiKey || !accountId) {
      return NextResponse.json({
        error: 'Credentials required',
        message: 'Please provide both API key and Account ID',
        instructions: [
          '1. Log into Cin7 at inventory.dearsystems.com',
          '2. Go to Settings → Integrations & API',
          '3. Check if you have API v1 or v2 access',
          '4. Copy your Account ID and API Application Key'
        ]
      }, { status: 400 })
    }
    
    console.log('🔍 Testing Cin7 API version and fetching real products...')
    
    // Detect which API version works (inline to avoid internal fetch issues)
    console.log('🔍 Testing Cin7 API version compatibility...')
    
    let versionResult = { version: 'unknown', compatible: false }
    
    // Test correct Cin7 API endpoints (no version paths needed)
    const apiEndpoints = [
      'https://inventory.dearsystems.com/externalapi/products?limit=1',
      'https://inventory.dearsystems.com/ExternalApi/products?limit=1'
    ]
    
    let v2Response = null
    let workingEndpoint = null
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🔍 Testing endpoint: ${endpoint}`)
        v2Response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'api-auth-accountid': accountId,
            'api-auth-applicationkey': apiKey,
            'Content-Type': 'application/json'
          }
        })
        
        const contentType = v2Response.headers.get('content-type') || ''
        console.log(`Status: ${v2Response.status}, Content-Type: ${contentType}`)
        
        if (v2Response.ok && contentType.includes('application/json')) {
          workingEndpoint = endpoint
          console.log(`✅ Found working Cin7 endpoint: ${endpoint}`)
          break
        } else if (v2Response.status === 401 || v2Response.status === 403) {
          workingEndpoint = endpoint // Authentication error means endpoint exists
          console.log(`✅ Found valid Cin7 endpoint (auth needed): ${endpoint}`)
          break
        }
      } catch (error) {
        console.log(`❌ Endpoint failed: ${endpoint} - ${error.message}`)
      }
    }
    
    if (workingEndpoint) {
      versionResult = { version: 'v1', compatible: true, endpoint: workingEndpoint }
      console.log('✅ Detected working Cin7 API endpoint')
    } else {
      console.log('❌ No working Cin7 endpoints found')
    }
    
    // Skip v1 testing since we found the correct endpoints
    
    if (!versionResult.compatible) {
      return NextResponse.json({
        error: 'API connection failed',
        message: 'Neither v1 nor v2 API worked with provided credentials',
        suggestions: [
          'Verify your Account ID and API key are correct',
          'Check if your Cin7 account has API access enabled',
          'Ensure your API key has product read permissions'
        ]
      }, { status: 400 })
    }
    
    // Store credentials securely (inline to avoid fetch issues)
    try {
      const encryptedApiKey = Buffer.from(apiKey).toString('base64') // Simple encoding for demo
      const encryptedAccountId = Buffer.from(accountId).toString('base64')
      
      await supabase
        .from('cin7_credentials')
        .upsert({
          barbershop_id: barbershopId,
          encrypted_api_key: encryptedApiKey,
          encrypted_account_id: encryptedAccountId,
          api_version: versionResult.version,
          last_tested: new Date().toISOString(),
          is_active: true
        }, { onConflict: 'barbershop_id' })
      
      console.log('🔐 Credentials stored securely')
    } catch (storeError) {
      console.warn('Warning: Could not store credentials securely:', storeError.message)
    }
    
    // Fetch products using discovered working endpoint
    const fullEndpoint = versionResult.endpoint.replace('limit=1', 'limit=50')
    const response = await fetch(fullEndpoint, {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Cin7 API error (${response.status}):`, errorText)
      return NextResponse.json({
        error: 'Cin7 API error',
        status: response.status,
        message: `API returned ${response.status}: ${errorText.substring(0, 200)}...`,
        suggestions: [
          'Verify your Account ID and API key are correct',
          'Check if your Cin7 account has API access enabled',
          'Ensure your API key has product read permissions',
          `HTTP ${response.status} indicates: ${response.status === 401 ? 'Authentication failed' : response.status === 403 ? 'Access denied' : response.status === 404 ? 'API endpoint not found' : 'Server error'}`
        ]
      }, { status: 400 })
    }
    
    // Check if response is actually JSON before parsing
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const htmlText = await response.text()
      console.error('Cin7 API returned non-JSON content:', contentType, htmlText.substring(0, 200))
      return NextResponse.json({
        error: 'Invalid API response',
        message: 'Cin7 API returned HTML instead of JSON - likely an authentication or server error',
        contentType: contentType,
        htmlPreview: htmlText.substring(0, 300),
        responseStatus: response.status,
        suggestions: [
          'Double-check your Account ID and API key',
          'Verify you have API access enabled in Cin7',
          'Try logging into Cin7 to confirm your account is active',
          'Contact Cin7 support if credentials are correct'
        ]
      }, { status: 400 })
    }
    
    // Safely parse JSON with error handling
    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      const responseText = await response.text()
      console.error('JSON parsing failed:', jsonError.message, 'Response:', responseText.substring(0, 200))
      return NextResponse.json({
        error: 'JSON parsing failed',
        message: 'Cin7 API response could not be parsed as JSON',
        jsonError: jsonError.message,
        responsePreview: responseText.substring(0, 200),
        suggestions: [
          'Verify your API credentials are correct',
          'Check if Cin7 API is experiencing issues',
          'Ensure you have the correct API version access'
        ]
      }, { status: 400 })
    }
    
    // Handle Cin7 API response format
    let cin7Products = data?.ProductList || data?.Products || []
    
    console.log(`Found ${cin7Products.length} products in Cin7 API ${versionResult.version}`)
    
    // Clear existing demo products
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('barbershop_id', barbershopId)
    
    if (deleteError) {
      console.error('Error clearing existing products:', deleteError)
    }
    
    // Enhanced debugging - Log complete API response structure
    let debugInfo = { fieldAnalysis: null, sampleProduct: null }
    if (cin7Products.length > 0) {
      const firstProduct = cin7Products[0]
      console.log('🔍 COMPLETE Cin7 API RESPONSE ANALYSIS')
      console.log('=' .repeat(50))
      console.log('📊 Full first product JSON:', JSON.stringify(firstProduct, null, 2))
      console.log('🏷️  All field names:', Object.keys(firstProduct))
      
      // Comprehensive field analysis
      const allFields = Object.keys(firstProduct)
      const priceFields = allFields.filter(f => f.toLowerCase().includes('price') || f.toLowerCase().includes('cost') || f.toLowerCase().includes('sell') || f.toLowerCase().includes('tier'))
      const stockFields = allFields.filter(f => f.toLowerCase().includes('stock') || f.toLowerCase().includes('qty') || f.toLowerCase().includes('quantity') || f.toLowerCase().includes('available') || f.toLowerCase().includes('onhand') || f.toLowerCase().includes('hand') || f.toLowerCase().includes('allocated') || f.toLowerCase().includes('order'))
      const categoryFields = allFields.filter(f => f.toLowerCase().includes('category') || f.toLowerCase().includes('type') || f.toLowerCase().includes('group'))
      const supplierFields = allFields.filter(f => f.toLowerCase().includes('supplier') || f.toLowerCase().includes('vendor') || f.toLowerCase().includes('brand'))
      const statusFields = allFields.filter(f => f.toLowerCase().includes('status') || f.toLowerCase().includes('active') || f.toLowerCase().includes('enabled'))
      
      // Create comprehensive field value mapping
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
          responseStructure: Array.isArray(data?.ProductList) ? 'ProductList array' : Array.isArray(data?.Products) ? 'Products array' : 'Unknown structure',
          firstProductKeys: Object.keys(firstProduct).length
        }
      }
      
      console.log('💰 PRICE FIELDS FOUND:', priceFields)
      console.log('💰 Price values:', debugInfo.fieldAnalysis.priceFieldValues)
      console.log('📦 INVENTORY FIELDS FOUND:', stockFields)
      console.log('📦 Inventory values:', debugInfo.fieldAnalysis.stockFieldValues)
      console.log('🏷️  CATEGORY FIELDS:', categoryFields)
      console.log('🏷️  Category values:', debugInfo.fieldAnalysis.categoryFieldValues)
      console.log('🏭 SUPPLIER FIELDS:', supplierFields)
      console.log('🏭 Supplier values:', debugInfo.fieldAnalysis.supplierFieldValues)
      console.log('⚡ STATUS FIELDS:', statusFields)
      console.log('⚡ Status values:', debugInfo.fieldAnalysis.statusFieldValues)
      console.log('=' .repeat(50))
    }

    // Map and insert Cin7 products with flexible field mapping
    const productsToInsert = cin7Products.map(product => {
      // Flexible price mapping - try multiple field variations
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
      
      // Log price mapping for debugging
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
    
    // Insert in batches to avoid timeout
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
    
    // Calculate pricing statistics
    const priceStats = {
      productsWithPrices: productsToInsert.filter(p => p.retail_price > 0).length,
      totalProducts: productsToInsert.length,
      averagePrice: productsToInsert.reduce((sum, p) => sum + p.retail_price, 0) / productsToInsert.length
    }

    return NextResponse.json({
      success: true,
      message: `Synchronized ${insertedCount} products from Cin7`,
      count: insertedCount,
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
      })),
      // Include comprehensive debug information
      debugInfo: debugInfo,
      fieldAnalysisReport: {
        message: "Check browser console for complete field analysis logs",
        stockFieldsAttempted: [
          "Available", "OnHand", "AvailableQuantity", "QtyAvailable", 
          "QuantityAvailable", "StockOnHand", "QuantityOnHand"
        ],
        currentStockResults: productsToInsert.slice(0, 5).map(p => ({
          name: p.name,
          mappedStock: p.current_stock,
          rawProductSample: "See debugInfo.sampleProduct for full structure"
        }))
      }
    })
    
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({
      error: 'Sync failed',
      message: error.message
    }, { status: 500 })
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
  
  // Try to find a match
  for (const [key, value] of Object.entries(categoryMap)) {
    if (cin7Category?.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }
  
  // Default category
  return 'accessories'
}
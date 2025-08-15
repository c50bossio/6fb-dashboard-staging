import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Direct Supabase connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfhqjdoydihajmjxniee.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c"
)

/**
 * Dynamic Field Discovery System for Cin7 API
 * Analyzes actual API responses to create optimal field mapping strategies
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { apiKey, accountId, barbershopId } = body
    
    if (!apiKey || !accountId) {
      return NextResponse.json({
        error: 'Credentials required',
        message: 'Please provide both API key and Account ID for field discovery'
      }, { status: 400 })
    }

    console.log('🔍 Starting Dynamic Field Discovery for Cin7 API...')
    
    // Test multiple API endpoints to discover the correct format
    const apiEndpoints = [
      'https://inventory.dearsystems.com/externalapi/products?limit=5',
      'https://inventory.dearsystems.com/ExternalApi/products?limit=5',
      'https://inventory.dearsystems.com/externalapi/v2/products?limit=5',
      'https://inventory.dearsystems.com/ExternalApi/v2/products?limit=5'
    ]
    
    let discoveryResult = null
    let workingEndpoint = null
    
    // Step 1: Discover working endpoint and API version
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
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const data = await response.json()
            workingEndpoint = endpoint
            discoveryResult = data
            console.log(`✅ Found working endpoint: ${endpoint}`)
            break
          }
        } else if (response.status === 401 || response.status === 403) {
          console.log(`🔐 Endpoint exists but needs valid credentials: ${endpoint}`)
          // Continue testing other endpoints with current credentials
        }
      } catch (error) {
        console.log(`❌ Endpoint failed: ${endpoint} - ${error.message}`)
      }
    }
    
    if (!workingEndpoint || !discoveryResult) {
      return NextResponse.json({
        error: 'API Discovery Failed',
        message: 'Could not connect to any Cin7 API endpoints with provided credentials',
        suggestions: [
          'Verify your Account ID and API Application Key are correct',
          'Check if your Cin7 account has API access enabled',
          'Ensure you have the correct permissions for product data access'
        ]
      }, { status: 400 })
    }
    
    // Step 2: Analyze API response structure
    const products = discoveryResult?.ProductList || discoveryResult?.Products || []
    
    if (products.length === 0) {
      return NextResponse.json({
        error: 'No Products Found',
        message: 'API connection successful but no products found for field analysis',
        endpoint: workingEndpoint,
        responseStructure: Object.keys(discoveryResult)
      }, { status: 400 })
    }
    
    console.log(`📊 Analyzing ${products.length} products for field discovery...`)
    
    // Step 3: Comprehensive field analysis
    const fieldAnalysis = analyzeProductFields(products)
    
    // Step 4: Create optimized field mapping strategy
    const mappingStrategy = createOptimalMapping(fieldAnalysis)
    
    // Step 5: Store field mapping configuration
    await storeFieldMappingConfig(barbershopId, {
      endpoint: workingEndpoint,
      apiVersion: detectApiVersion(workingEndpoint),
      fieldAnalysis,
      mappingStrategy,
      discoveredAt: new Date().toISOString()
    })
    
    // Step 6: Test the mapping with actual data
    const testResults = testFieldMapping(products.slice(0, 3), mappingStrategy)
    
    return NextResponse.json({
      success: true,
      message: 'Field discovery completed successfully',
      discovery: {
        endpoint: workingEndpoint,
        apiVersion: detectApiVersion(workingEndpoint),
        totalProducts: products.length,
        fieldsAnalyzed: fieldAnalysis.totalUniqueFields,
        mappingConfidence: calculateMappingConfidence(fieldAnalysis)
      },
      fieldAnalysis: {
        priceFields: fieldAnalysis.priceFields,
        stockFields: fieldAnalysis.stockFields,
        identifierFields: fieldAnalysis.identifierFields,
        categoryFields: fieldAnalysis.categoryFields,
        supplierFields: fieldAnalysis.supplierFields,
        statusFields: fieldAnalysis.statusFields
      },
      mappingStrategy: {
        priceMapping: mappingStrategy.priceMapping,
        stockMapping: mappingStrategy.stockMapping,
        identifierMapping: mappingStrategy.identifierMapping,
        categoryMapping: mappingStrategy.categoryMapping
      },
      testResults: {
        successRate: testResults.successRate,
        sampleMappings: testResults.sampleMappings,
        potentialIssues: testResults.potentialIssues
      },
      recommendations: generateRecommendations(fieldAnalysis, testResults)
    })
    
  } catch (error) {
    console.error('Field discovery error:', error)
    return NextResponse.json({
      error: 'Field Discovery Failed',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Analyze product fields to understand data structure
 */
function analyzeProductFields(products) {
  const allFields = new Set()
  const fieldFrequency = new Map()
  const fieldTypes = new Map()
  const fieldValues = new Map()
  
  // Analyze each product to build comprehensive field understanding
  products.forEach(product => {
    Object.entries(product).forEach(([key, value]) => {
      allFields.add(key)
      fieldFrequency.set(key, (fieldFrequency.get(key) || 0) + 1)
      
      // Determine field type and sample values
      const type = typeof value
      fieldTypes.set(key, type)
      
      if (!fieldValues.has(key)) {
        fieldValues.set(key, [])
      }
      if (fieldValues.get(key).length < 5) {
        fieldValues.get(key).push(value)
      }
    })
  })
  
  // Categorize fields by purpose
  const fieldCategories = categorizeFields(Array.from(allFields), fieldValues)
  
  return {
    totalUniqueFields: allFields.size,
    fieldFrequency: Object.fromEntries(fieldFrequency),
    fieldTypes: Object.fromEntries(fieldTypes),
    fieldValues: Object.fromEntries(fieldValues),
    ...fieldCategories
  }
}

/**
 * Categorize fields by their likely purpose
 */
function categorizeFields(fields, fieldValues) {
  const priceKeywords = ['price', 'cost', 'sell', 'tier', 'amount', 'value', 'rate']
  const stockKeywords = ['stock', 'qty', 'quantity', 'available', 'onhand', 'hand', 'allocated', 'order', 'count']
  const identifierKeywords = ['id', 'sku', 'code', 'barcode', 'name', 'title']
  const categoryKeywords = ['category', 'type', 'group', 'class', 'family']
  const supplierKeywords = ['supplier', 'vendor', 'brand', 'manufacturer']
  const statusKeywords = ['status', 'active', 'enabled', 'state', 'condition']
  
  const categorizeField = (field, keywords) => {
    const fieldLower = field.toLowerCase()
    return keywords.some(keyword => fieldLower.includes(keyword))
  }
  
  const analyzeFieldQuality = (field) => {
    const values = fieldValues.get(field) || []
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '')
    const numericValues = values.filter(v => !isNaN(parseFloat(v)) && isFinite(v))
    
    return {
      field,
      totalSamples: values.length,
      nonNullCount: nonNullValues.length,
      nullPercentage: ((values.length - nonNullValues.length) / values.length * 100).toFixed(1),
      numericCount: numericValues.length,
      sampleValues: values.slice(0, 3),
      dataQuality: nonNullValues.length / values.length
    }
  }
  
  return {
    priceFields: fields.filter(f => categorizeField(f, priceKeywords)).map(analyzeFieldQuality),
    stockFields: fields.filter(f => categorizeField(f, stockKeywords)).map(analyzeFieldQuality),
    identifierFields: fields.filter(f => categorizeField(f, identifierKeywords)).map(analyzeFieldQuality),
    categoryFields: fields.filter(f => categorizeField(f, categoryKeywords)).map(analyzeFieldQuality),
    supplierFields: fields.filter(f => categorizeField(f, supplierKeywords)).map(analyzeFieldQuality),
    statusFields: fields.filter(f => categorizeField(f, statusKeywords)).map(analyzeFieldQuality)
  }
}

/**
 * Create optimal field mapping strategy based on analysis
 */
function createOptimalMapping(fieldAnalysis) {
  const selectBestField = (fields, preferredOrder = []) => {
    // Sort by data quality first, then by preferred order
    const sortedFields = fields.sort((a, b) => {
      // Check if either field is in preferred order
      const aIndex = preferredOrder.findIndex(pref => a.field.toLowerCase().includes(pref.toLowerCase()))
      const bIndex = preferredOrder.findIndex(pref => b.field.toLowerCase().includes(pref.toLowerCase()))
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex // Both in preferred order, use preference
      }
      if (aIndex !== -1) return -1 // Only 'a' is preferred
      if (bIndex !== -1) return 1  // Only 'b' is preferred
      
      // Neither in preferred order, use data quality
      return b.dataQuality - a.dataQuality
    })
    
    return sortedFields[0]?.field || null
  }
  
  return {
    priceMapping: {
      retailPrice: selectBestField(fieldAnalysis.priceFields, ['PriceTier1', 'SalePrice', 'SellingPrice', 'Price']),
      costPrice: selectBestField(fieldAnalysis.priceFields, ['CostPrice', 'AverageCost', 'Cost', 'UnitCost']),
      fallbackFields: fieldAnalysis.priceFields.map(f => f.field)
    },
    stockMapping: {
      currentStock: selectBestField(fieldAnalysis.stockFields, ['Available', 'OnHand', 'AvailableQuantity', 'QtyAvailable']),
      minStock: selectBestField(fieldAnalysis.stockFields, ['MinimumBeforeReorder', 'ReorderPoint', 'MinStock']),
      maxStock: selectBestField(fieldAnalysis.stockFields, ['ReorderQuantity', 'MaximumStockLevel', 'MaxStock']),
      fallbackFields: fieldAnalysis.stockFields.map(f => f.field)
    },
    identifierMapping: {
      productId: selectBestField(fieldAnalysis.identifierFields, ['ID', 'ProductID', 'id']),
      name: selectBestField(fieldAnalysis.identifierFields, ['Name', 'ProductName', 'Title']),
      sku: selectBestField(fieldAnalysis.identifierFields, ['SKU', 'Code', 'ProductCode']),
      barcode: selectBestField(fieldAnalysis.identifierFields, ['Barcode', 'UPC', 'EAN'])
    },
    categoryMapping: {
      category: selectBestField(fieldAnalysis.categoryFields, ['Category', 'ProductCategory', 'Type']),
      brand: selectBestField(fieldAnalysis.supplierFields, ['Brand', 'Manufacturer']),
      supplier: selectBestField(fieldAnalysis.supplierFields, ['Supplier', 'Vendor', 'DefaultSupplier'])
    }
  }
}

/**
 * Test field mapping with actual product data
 */
function testFieldMapping(products, mappingStrategy) {
  const testResults = []
  let successCount = 0
  const issues = []
  
  products.forEach((product, index) => {
    const mapped = {
      retailPrice: getFieldValue(product, mappingStrategy.priceMapping.retailPrice),
      costPrice: getFieldValue(product, mappingStrategy.priceMapping.costPrice),
      currentStock: getFieldValue(product, mappingStrategy.stockMapping.currentStock),
      name: getFieldValue(product, mappingStrategy.identifierMapping.name),
      sku: getFieldValue(product, mappingStrategy.identifierMapping.sku)
    }
    
    // Check mapping success
    const hasValidPrice = mapped.retailPrice > 0 || mapped.costPrice > 0
    const hasValidStock = mapped.currentStock >= 0
    const hasValidName = mapped.name && mapped.name.length > 0
    
    if (hasValidPrice && hasValidStock && hasValidName) {
      successCount++
    } else {
      issues.push({
        productIndex: index,
        productName: mapped.name || 'Unknown',
        missingPrice: !hasValidPrice,
        missingStock: !hasValidStock,
        missingName: !hasValidName
      })
    }
    
    testResults.push({
      productIndex: index,
      originalProduct: Object.keys(product),
      mappedData: mapped,
      mappingSuccess: hasValidPrice && hasValidStock && hasValidName
    })
  })
  
  return {
    successRate: (successCount / products.length * 100).toFixed(1),
    sampleMappings: testResults,
    potentialIssues: issues
  }
}

/**
 * Utility function to safely get field value
 */
function getFieldValue(product, fieldName) {
  if (!fieldName || !product.hasOwnProperty(fieldName)) {
    return null
  }
  
  const value = product[fieldName]
  
  // Try to parse as number if it looks numeric
  if (typeof value === 'string' && !isNaN(parseFloat(value))) {
    return parseFloat(value)
  }
  
  return value
}

/**
 * Calculate mapping confidence score
 */
function calculateMappingConfidence(fieldAnalysis) {
  const categories = [
    fieldAnalysis.priceFields,
    fieldAnalysis.stockFields,
    fieldAnalysis.identifierFields
  ]
  
  let totalConfidence = 0
  let categoryCount = 0
  
  categories.forEach(category => {
    if (category.length > 0) {
      const avgQuality = category.reduce((sum, field) => sum + field.dataQuality, 0) / category.length
      totalConfidence += avgQuality
      categoryCount++
    }
  })
  
  return categoryCount > 0 ? (totalConfidence / categoryCount * 100).toFixed(1) : '0'
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(fieldAnalysis, testResults) {
  const recommendations = []
  
  if (parseFloat(testResults.successRate) < 80) {
    recommendations.push('Consider manual field mapping review for optimal data extraction')
  }
  
  if (fieldAnalysis.priceFields.length === 0) {
    recommendations.push('No price fields detected - verify your Cin7 setup includes pricing data')
  }
  
  if (fieldAnalysis.stockFields.length === 0) {
    recommendations.push('No stock fields detected - ensure inventory tracking is enabled in Cin7')
  }
  
  const lowQualityFields = [
    ...fieldAnalysis.priceFields,
    ...fieldAnalysis.stockFields,
    ...fieldAnalysis.identifierFields
  ].filter(field => field.dataQuality < 0.8)
  
  if (lowQualityFields.length > 0) {
    recommendations.push(`Consider data cleanup for fields with low quality: ${lowQualityFields.map(f => f.field).join(', ')}`)
  }
  
  return recommendations
}

/**
 * Detect API version from endpoint
 */
function detectApiVersion(endpoint) {
  if (endpoint.includes('/v2/')) return 'v2'
  if (endpoint.includes('/externalapi/')) return 'v1'
  return 'unknown'
}

/**
 * Store field mapping configuration in database
 */
async function storeFieldMappingConfig(barbershopId, config) {
  try {
    await supabase
      .from('cin7_field_mappings')
      .upsert({
        barbershop_id: barbershopId,
        mapping_config: config,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'barbershop_id' })
    
    console.log('✅ Field mapping configuration stored successfully')
  } catch (error) {
    console.warn('⚠️ Could not store field mapping config:', error.message)
  }
}
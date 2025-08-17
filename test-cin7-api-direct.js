/**
 * Direct CIN7 API Test
 * Tests different endpoint variations to find the correct one
 */

const accountId = process.env.CIN7_ACCOUNT_ID || 'your-account-id'
const apiKey = process.env.CIN7_API_KEY || 'your-api-key'

async function testEndpoint(url, description) {
  console.log(`\n📍 Testing: ${description}`)
  console.log(`   URL: ${url}`)
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ SUCCESS!`)
      console.log(`   Response keys: ${Object.keys(data).join(', ')}`)
      
      // Check for products in different possible locations
      const productCount = 
        data.Products?.length || 
        data.ProductList?.length || 
        data.Total ||
        data.TotalProducts ||
        0
      
      console.log(`   Product count: ${productCount}`)
      
      if (data.Products?.length > 0) {
        console.log(`   First product: ${data.Products[0].Name || data.Products[0].SKU}`)
      }
      
      return { success: true, data, productCount }
    } else {
      const errorText = await response.text()
      console.log(`   ❌ Failed: ${errorText.substring(0, 100)}`)
      return { success: false, error: errorText }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('🔍 CIN7 API Direct Test')
  console.log('========================')
  console.log(`Account ID: ${accountId}`)
  console.log(`API Key: ${apiKey.substring(0, 10)}...`)
  
  const endpoints = [
    // V2 endpoints (current standard)
    ['https://inventory.dearsystems.com/externalapi/v2/me', 'V2 Me (Account Info)'],
    ['https://inventory.dearsystems.com/externalapi/v2/products', 'V2 Products (no params)'],
    ['https://inventory.dearsystems.com/externalapi/v2/products?page=1&limit=10', 'V2 Products (with pagination)'],
    ['https://inventory.dearsystems.com/externalapi/v2/product', 'V2 Product (singular)'],
    ['https://inventory.dearsystems.com/externalapi/v2/productList', 'V2 ProductList'],
    
    // V1 endpoints (legacy but might still work)
    ['https://inventory.dearsystems.com/externalapi/v1/products', 'V1 Products'],
    ['https://inventory.dearsystems.com/externalapi/v1/product/all', 'V1 All Products'],
    
    // Alternative base URLs
    ['https://api.cin7.com/api/v2/products', 'CIN7 domain V2'],
    ['https://api.dearsystems.com/externalapi/v2/products', 'Alternative DEAR domain'],
  ]
  
  let workingEndpoint = null
  
  for (const [url, description] of endpoints) {
    const result = await testEndpoint(url, description)
    if (result.success && result.productCount > 0) {
      workingEndpoint = { url, description, ...result }
      console.log('\n🎯 Found working endpoint with products!')
      break
    }
  }
  
  if (workingEndpoint) {
    console.log('\n✅ SOLUTION FOUND:')
    console.log(`Use this endpoint: ${workingEndpoint.url}`)
    console.log(`Product count: ${workingEndpoint.productCount}`)
  } else {
    console.log('\n⚠️ No working endpoint found with products')
    console.log('Please check:')
    console.log('1. Your CIN7 account has products')
    console.log('2. API credentials are correct')
    console.log('3. API access is enabled in CIN7 settings')
  }
}

// Check if credentials are provided as arguments
if (process.argv.length >= 4) {
  process.env.CIN7_ACCOUNT_ID = process.argv[2]
  process.env.CIN7_API_KEY = process.argv[3]
}

if (!process.env.CIN7_ACCOUNT_ID || !process.env.CIN7_API_KEY || 
    process.env.CIN7_ACCOUNT_ID === 'your-account-id') {
  console.log('Usage: node test-cin7-api-direct.js <ACCOUNT_ID> <API_KEY>')
  console.log('Or set environment variables: CIN7_ACCOUNT_ID and CIN7_API_KEY')
  process.exit(1)
}

runTests().catch(console.error)
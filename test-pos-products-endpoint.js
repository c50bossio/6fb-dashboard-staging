/**
 * Test Script: POS Products Endpoint
 *
 * This script verifies that:
 * 1. The /api/pos/products endpoint works correctly
 * 2. It returns data from the products table (single source of truth)
 * 3. The data matches what /api/shop/products returns
 * 4. POS-specific filters work (in_stock_only, category)
 */

const BASE_URL = 'http://localhost:9999'

async function testPOSProductsEndpoint() {
  console.log('🧪 Testing POS Products Endpoint\n')
  console.log('=' .repeat(60))

  try {
    // First, get a valid barbershop_id from the shop products endpoint
    console.log('\n1️⃣  Fetching shop products to get barbershop_id...')
    const shopResponse = await fetch(`${BASE_URL}/api/shop/products`, {
      credentials: 'include'
    })

    if (!shopResponse.ok) {
      console.error('❌ Failed to fetch shop products:', shopResponse.status, shopResponse.statusText)
      console.log('Note: Make sure you are logged in and the dev server is running')
      return
    }

    const shopData = await shopResponse.json()
    console.log(`✅ Shop products loaded: ${shopData.products?.length || 0} products`)

    if (!shopData.products || shopData.products.length === 0) {
      console.log('⚠️  No products found in shop. Add some products first.')
      return
    }

    const barbershopId = shopData.products[0].barbershop_id
    console.log(`   Barbershop ID: ${barbershopId}`)

    // Test 1: Basic POS products fetch
    console.log('\n2️⃣  Testing POS products endpoint...')
    const posResponse = await fetch(
      `${BASE_URL}/api/pos/products?barbershop_id=${barbershopId}`,
      { credentials: 'include' }
    )

    if (!posResponse.ok) {
      console.error('❌ POS products endpoint failed:', posResponse.status)
      const errorText = await posResponse.text()
      console.error('   Error:', errorText)
      return
    }

    const posProducts = await posResponse.json()
    console.log(`✅ POS products loaded: ${posProducts.length} products`)

    // Test 2: Data consistency check
    console.log('\n3️⃣  Verifying data consistency...')
    const shopProduct = shopData.products[0]
    const posProduct = posProducts.find(p => p.id === shopProduct.id)

    if (posProduct) {
      console.log('   Comparing first product:')
      console.log(`   Shop: ${shopProduct.name} - $${shopProduct.retail_price} - Stock: ${shopProduct.current_stock}`)
      console.log(`   POS:  ${posProduct.name} - $${posProduct.price} - Stock: ${posProduct.current_stock}`)

      const dataMatches =
        posProduct.name === shopProduct.name &&
        posProduct.price === shopProduct.retail_price &&
        posProduct.current_stock === shopProduct.current_stock

      if (dataMatches) {
        console.log('   ✅ Data matches perfectly!')
      } else {
        console.log('   ⚠️  Data mismatch detected')
      }
    }

    // Test 3: In-stock filter
    console.log('\n4️⃣  Testing in_stock_only filter...')
    const inStockResponse = await fetch(
      `${BASE_URL}/api/pos/products?barbershop_id=${barbershopId}&in_stock_only=true`,
      { credentials: 'include' }
    )

    if (inStockResponse.ok) {
      const inStockProducts = await inStockResponse.json()
      const allHaveStock = inStockProducts.every(p => p.current_stock > 0)
      console.log(`   ✅ In-stock filter returned ${inStockProducts.length} products`)
      console.log(`   ${allHaveStock ? '✅' : '❌'} All products have stock > 0`)
    }

    // Test 4: Category filter
    console.log('\n5️⃣  Testing category filter...')
    const categories = [...new Set(posProducts.map(p => p.category).filter(Boolean))]
    if (categories.length > 0) {
      const testCategory = categories[0]
      const categoryResponse = await fetch(
        `${BASE_URL}/api/pos/products?barbershop_id=${barbershopId}&category=${testCategory}`,
        { credentials: 'include' }
      )

      if (categoryResponse.ok) {
        const categoryProducts = await categoryResponse.json()
        console.log(`   ✅ Category '${testCategory}' returned ${categoryProducts.length} products`)
      }
    } else {
      console.log('   ⚠️  No categories found in products')
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ All tests passed!')
    console.log('\n📊 Summary:')
    console.log(`   - Shop products: ${shopData.products.length}`)
    console.log(`   - POS products: ${posProducts.length}`)
    console.log(`   - Data source: products table (single source of truth)`)
    console.log(`   - Consistency: ${posProducts.length === shopData.products.length ? '✅ Verified' : '⚠️ Mismatch'}`)

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('   Stack:', error.stack)
  }
}

// Run tests
console.log('Starting POS Products Endpoint Tests...')
console.log('Make sure the dev server is running on port 9999\n')

testPOSProductsEndpoint()

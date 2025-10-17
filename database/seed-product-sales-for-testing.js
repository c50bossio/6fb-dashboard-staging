/**
 * Seed Product Sales Data for Analytics Testing
 *
 * Generates realistic product sales data for the past 90 days
 * to enable testing of analytics components.
 *
 * Run: node database/seed-product-sales-for-testing.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper: Random number between min and max
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper: Random float between min and max
function randomFloat(min, max) {
  return Math.random() * (max - min) + min
}

// Helper: Get random element from array
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

// Helper: Generate date within last N days
function randomDateInPast(daysAgo) {
  const now = Date.now()
  const randomTime = now - Math.random() * daysAgo * 24 * 60 * 60 * 1000
  return new Date(randomTime).toISOString()
}

async function seedProductSales() {
  try {
    console.log('🚀 Starting product sales seed...\n')

    // 1. Fetch all active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, retail_price, cost_price, barbershop_id')
      .eq('is_active', true)

    if (productsError) throw productsError
    if (!products || products.length === 0) {
      console.error('❌ No products found. Please seed products first.')
      return
    }

    console.log(`✅ Found ${products.length} products across ${new Set(products.map(p => p.barbershop_id)).size} barbershops\n`)

    // 2. Group products by barbershop
    const productsByShop = products.reduce((acc, product) => {
      if (!acc[product.barbershop_id]) {
        acc[product.barbershop_id] = []
      }
      acc[product.barbershop_id].push(product)
      return acc
    }, {})

    // 3. Generate sales for past 90 days
    const salesToInsert = []
    const daysToGenerate = 90
    const salesPerDay = randomInt(5, 15) // Variable sales per day

    console.log(`📊 Generating ~${daysToGenerate * salesPerDay} sales transactions over ${daysToGenerate} days...\n`)

    for (let day = 0; day < daysToGenerate; day++) {
      // Generate 5-15 sales per day
      const dailySales = randomInt(5, 15)

      for (let i = 0; i < dailySales; i++) {
        // Pick random shop
        const shopId = randomElement(Object.keys(productsByShop))
        const shopProducts = productsByShop[shopId]

        // Pick random product from that shop
        const product = randomElement(shopProducts)

        // Generate realistic sale
        const quantity = randomInt(1, 5) // Usually sell 1-5 units
        const unit_price = product.retail_price || 0
        const total_amount = quantity * unit_price

        salesToInsert.push({
          product_id: product.id,
          barbershop_id: shopId,
          quantity: quantity,
          unit_price: unit_price,
          total_amount: total_amount,
          sale_date: randomDateInPast(day + 1),
          created_at: new Date().toISOString()
        })
      }
    }

    // 4. Insert sales in batches (Supabase has limits)
    const batchSize = 100
    let inserted = 0

    for (let i = 0; i < salesToInsert.length; i += batchSize) {
      const batch = salesToInsert.slice(i, i + batchSize)

      const { error: insertError } = await supabase
        .from('product_sales')
        .insert(batch)

      if (insertError) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError)
        throw insertError
      }

      inserted += batch.length
      process.stdout.write(`\r📝 Inserted ${inserted}/${salesToInsert.length} sales...`)
    }

    console.log('\n\n✅ Product sales seeded successfully!\n')

    // 5. Display summary statistics
    const { data: summary } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          COUNT(*) as total_sales,
          COUNT(DISTINCT product_id) as unique_products_sold,
          COUNT(DISTINCT barbershop_id) as shops_with_sales,
          MIN(sale_date) as earliest_sale,
          MAX(sale_date) as latest_sale,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_sale_amount
        FROM product_sales
      `
    })

    if (summary && summary[0]) {
      const stats = summary[0]
      console.log('📈 Sales Summary:')
      console.log(`   Total Sales: ${stats.total_sales}`)
      console.log(`   Unique Products Sold: ${stats.unique_products_sold}`)
      console.log(`   Shops with Sales: ${stats.shops_with_sales}`)
      console.log(`   Date Range: ${new Date(stats.earliest_sale).toLocaleDateString()} to ${new Date(stats.latest_sale).toLocaleDateString()}`)
      console.log(`   Total Revenue: $${parseFloat(stats.total_revenue).toFixed(2)}`)
      console.log(`   Average Sale: $${parseFloat(stats.avg_sale_amount).toFixed(2)}`)
    }

    console.log('\n✨ Ready to test analytics components!')

  } catch (error) {
    console.error('\n❌ Error seeding product sales:', error)
    process.exit(1)
  }
}

// Run the seed
seedProductSales()

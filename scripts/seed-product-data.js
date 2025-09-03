import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
)

async function seedProductData() {
  try {

    // Get the first shop
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1)
    
    if (!shops || shops.length === 0) {
      
      return
    }
    
    const shopId = shops[0].id

    // Check if products already exist
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id')
      .eq('barbershop_id', shopId)
    
    if (!existingProducts || existingProducts.length === 0) {

      // Sample product data
      const sampleProducts = [
        // Hair Care
        { name: 'Premium Hair Oil', price: 15, cost: 8, stock: 25, min_stock: 5, max_stock: 50, category: 'Hair Care', sku: 'HC001' },
        { name: 'Deep Conditioning Treatment', price: 22, cost: 12, stock: 15, min_stock: 3, max_stock: 30, category: 'Hair Care', sku: 'HC002' },
        { name: 'Hair Growth Serum', price: 35, cost: 20, stock: 12, min_stock: 5, max_stock: 25, category: 'Hair Care', sku: 'HC003' },
        { name: 'Moisturizing Shampoo', price: 18, cost: 10, stock: 30, min_stock: 10, max_stock: 50, category: 'Hair Care', sku: 'HC004' },
        
        // Beard Care
        { name: 'Beard Styling Balm', price: 15, cost: 8, stock: 20, min_stock: 5, max_stock: 40, category: 'Beard Care', sku: 'BC001' },
        { name: 'Beard Oil Premium', price: 25, cost: 14, stock: 18, min_stock: 5, max_stock: 35, category: 'Beard Care', sku: 'BC002' },
        { name: 'Beard Shaping Kit', price: 45, cost: 25, stock: 8, min_stock: 3, max_stock: 15, category: 'Beard Care', sku: 'BC003' },
        
        // Tools
        { name: 'Professional Scissors', price: 70, cost: 40, stock: 5, min_stock: 2, max_stock: 10, category: 'Tools', sku: 'T001' },
        { name: 'Electric Trimmer Pro', price: 120, cost: 75, stock: 3, min_stock: 2, max_stock: 8, category: 'Tools', sku: 'T002' },
        { name: 'Straight Razor Set', price: 85, cost: 50, stock: 4, min_stock: 2, max_stock: 8, category: 'Tools', sku: 'T003' },
        
        // Styling Products
        { name: 'Hair Styling Gel', price: 15, cost: 8, stock: 35, min_stock: 10, max_stock: 60, category: 'Styling', sku: 'S001' },
        { name: 'Matte Finish Clay', price: 20, cost: 11, stock: 22, min_stock: 5, max_stock: 40, category: 'Styling', sku: 'S002' },
        { name: 'Hair Spray Strong Hold', price: 12, cost: 6, stock: 28, min_stock: 10, max_stock: 50, category: 'Styling', sku: 'S003' },
        
        // Aftercare
        { name: 'Aftershave Lotion', price: 15, cost: 8, stock: 25, min_stock: 8, max_stock: 40, category: 'Aftercare', sku: 'AC001' },
        { name: 'Cooling Face Balm', price: 18, cost: 10, stock: 20, min_stock: 5, max_stock: 35, category: 'Aftercare', sku: 'AC002' },
        { name: 'Skin Recovery Cream', price: 22, cost: 13, stock: 15, min_stock: 5, max_stock: 25, category: 'Aftercare', sku: 'AC003' },
      ]
      
      // Insert products
      for (const product of sampleProducts) {
        const { error } = await supabase
          .from('products')
          .insert({
            barbershop_id: shopId,
            ...product,
            reorder_point: product.min_stock * 2,
            supplier: 'Premium Beauty Supplies Co.',
            last_restocked_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          })
        
        if (error) {
          console.error(`Error creating product ${product.name}:`, error)
        } else {
          
        }
      }
    }
    
    // Get all products for generating sales data
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', shopId)
    
    if (!products || products.length === 0) {
      
      return
    }

    // Generate sales data for the last 90 days
    const salesData = []
    const daysToGenerate = 90
    const today = new Date()
    
    for (const product of products) {
      // Generate 10-50 sales per product
      const numSales = Math.floor(Math.random() * 40) + 10
      
      for (let i = 0; i < numSales; i++) {
        const daysAgo = Math.floor(Math.random() * daysToGenerate)
        const saleDate = new Date(today)
        saleDate.setDate(saleDate.getDate() - daysAgo)
        
        const quantity = Math.floor(Math.random() * 3) + 1 // 1-3 units per sale
        const paymentMethods = ['cash', 'card', 'online', 'mobile']
        
        salesData.push({
          barbershop_id: shopId,
          product_id: product.id,
          quantity,
          unit_price: product.price,
          total_amount: product.price * quantity,
          cost: product.cost * quantity,
          sale_date: saleDate.toISOString(),
          payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
        })
      }
    }
    
    // Insert sales data in batches
    const batchSize = 50
    for (let i = 0; i < salesData.length; i += batchSize) {
      const batch = salesData.slice(i, i + batchSize)
      const { error } = await supabase
        .from('product_sales')
        .insert(batch)
      
      if (error) {
        console.error('Error inserting sales batch:', error)
      } else {
        `)
      }
    }

    // Generate summary
    const { data: salesSummary } = await supabase
      .from('product_sales')
      .select('*')
      .eq('barbershop_id', shopId)
    
    if (salesSummary) {
      const totalRevenue = salesSummary.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0)
      const totalSales = salesSummary.length

      }`)
    }
    
  } catch (error) {
    console.error('Error seeding data:', error)
  }
}

// Run the seeding
seedProductData()
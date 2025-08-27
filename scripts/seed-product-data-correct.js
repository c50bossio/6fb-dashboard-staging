import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seedProductData() {
  try {
    console.log('🌱 Starting product data seeding with correct schema...')
    
    // Get the first barbershop (using correct column name)
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1)
    
    if (!shops || shops.length === 0) {
      console.log('No barbershops found. Please create a barbershop first.')
      return
    }
    
    const barbershopId = shops[0].id
    console.log(`Using barbershop ID: ${barbershopId}`)
    
    // Sample product data with correct field names
    const sampleProducts = [
      // Hair Care
      { 
        name: 'Premium Hair Oil', 
        description: 'Nourishing hair oil for all hair types',
        category: 'Hair Care',
        brand: 'Premium Beauty',
        sku: 'HC001',
        cost_price: 8,
        retail_price: 15,
        current_stock: 25,
        min_stock_level: 5,
        max_stock_level: 50,
        on_hand: 25
      },
      { 
        name: 'Deep Conditioning Treatment', 
        description: 'Intensive repair treatment for damaged hair',
        category: 'Hair Care',
        brand: 'Premium Beauty',
        sku: 'HC002',
        cost_price: 12,
        retail_price: 22,
        current_stock: 15,
        min_stock_level: 3,
        max_stock_level: 30,
        on_hand: 15
      },
      { 
        name: 'Hair Growth Serum', 
        description: 'Promotes healthy hair growth',
        category: 'Hair Care',
        brand: 'Premium Beauty',
        sku: 'HC003',
        cost_price: 20,
        retail_price: 35,
        current_stock: 12,
        min_stock_level: 5,
        max_stock_level: 25,
        on_hand: 12
      },
      { 
        name: 'Moisturizing Shampoo', 
        description: 'Gentle cleansing shampoo',
        category: 'Hair Care',
        brand: 'Premium Beauty',
        sku: 'HC004',
        cost_price: 10,
        retail_price: 18,
        current_stock: 30,
        min_stock_level: 10,
        max_stock_level: 50,
        on_hand: 30
      },
      
      // Beard Care
      { 
        name: 'Beard Styling Balm', 
        description: 'Strong hold beard styling',
        category: 'Beard Care',
        brand: 'Gentleman\'s Choice',
        sku: 'BC001',
        cost_price: 8,
        retail_price: 15,
        current_stock: 20,
        min_stock_level: 5,
        max_stock_level: 40,
        on_hand: 20
      },
      { 
        name: 'Beard Oil Premium', 
        description: 'Premium beard conditioning oil',
        category: 'Beard Care',
        brand: 'Gentleman\'s Choice',
        sku: 'BC002',
        cost_price: 14,
        retail_price: 25,
        current_stock: 18,
        min_stock_level: 5,
        max_stock_level: 35,
        on_hand: 18
      },
      { 
        name: 'Beard Shaping Kit', 
        description: 'Complete beard grooming kit',
        category: 'Beard Care',
        brand: 'Gentleman\'s Choice',
        sku: 'BC003',
        cost_price: 25,
        retail_price: 45,
        current_stock: 8,
        min_stock_level: 3,
        max_stock_level: 15,
        on_hand: 8
      },
      
      // Tools
      { 
        name: 'Professional Scissors', 
        description: 'High-quality cutting scissors',
        category: 'Tools',
        brand: 'ProCut',
        sku: 'T001',
        cost_price: 40,
        retail_price: 70,
        current_stock: 5,
        min_stock_level: 2,
        max_stock_level: 10,
        on_hand: 5
      },
      { 
        name: 'Electric Trimmer Pro', 
        description: 'Professional grade trimmer',
        category: 'Tools',
        brand: 'ProCut',
        sku: 'T002',
        cost_price: 75,
        retail_price: 120,
        current_stock: 3,
        min_stock_level: 2,
        max_stock_level: 8,
        on_hand: 3
      },
      { 
        name: 'Straight Razor Set', 
        description: 'Traditional shaving set',
        category: 'Tools',
        brand: 'Classic Barber',
        sku: 'T003',
        cost_price: 50,
        retail_price: 85,
        current_stock: 4,
        min_stock_level: 2,
        max_stock_level: 8,
        on_hand: 4
      },
      
      // Styling Products
      { 
        name: 'Hair Styling Gel', 
        description: 'Strong hold styling gel',
        category: 'Styling',
        brand: 'Style Master',
        sku: 'S001',
        cost_price: 8,
        retail_price: 15,
        current_stock: 35,
        min_stock_level: 10,
        max_stock_level: 60,
        on_hand: 35
      },
      { 
        name: 'Matte Finish Clay', 
        description: 'Natural matte finish',
        category: 'Styling',
        brand: 'Style Master',
        sku: 'S002',
        cost_price: 11,
        retail_price: 20,
        current_stock: 22,
        min_stock_level: 5,
        max_stock_level: 40,
        on_hand: 22
      },
      { 
        name: 'Hair Spray Strong Hold', 
        description: 'All-day hold spray',
        category: 'Styling',
        brand: 'Style Master',
        sku: 'S003',
        cost_price: 6,
        retail_price: 12,
        current_stock: 28,
        min_stock_level: 10,
        max_stock_level: 50,
        on_hand: 28
      },
      
      // Aftercare
      { 
        name: 'Aftershave Lotion', 
        description: 'Soothing aftershave',
        category: 'Aftercare',
        brand: 'Comfort Zone',
        sku: 'AC001',
        cost_price: 8,
        retail_price: 15,
        current_stock: 25,
        min_stock_level: 8,
        max_stock_level: 40,
        on_hand: 25
      },
      { 
        name: 'Cooling Face Balm', 
        description: 'Refreshing face balm',
        category: 'Aftercare',
        brand: 'Comfort Zone',
        sku: 'AC002',
        cost_price: 10,
        retail_price: 18,
        current_stock: 20,
        min_stock_level: 5,
        max_stock_level: 35,
        on_hand: 20
      },
      { 
        name: 'Skin Recovery Cream', 
        description: 'Post-shave recovery',
        category: 'Aftercare',
        brand: 'Comfort Zone',
        sku: 'AC003',
        cost_price: 13,
        retail_price: 22,
        current_stock: 15,
        min_stock_level: 5,
        max_stock_level: 25,
        on_hand: 15
      }
    ]
    
    // Delete existing test products to avoid duplicates
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('barbershop_id', barbershopId)
      .like('name', '%Hair%')
    
    console.log('Cleared any existing test products')
    
    // Insert products
    let successCount = 0
    for (const product of sampleProducts) {
      const { data, error } = await supabase
        .from('products')
        .insert({
          barbershop_id: barbershopId,
          ...product,
          is_active: true,
          track_inventory: true,
          allocated: 0,
          incoming: 0,
          sync_enabled: false
        })
        .select()
      
      if (error) {
        console.error(`❌ Error creating ${product.name}:`, error.message)
      } else {
        console.log(`✅ Created: ${product.name} (${product.category})`)
        successCount++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`- Products created: ${successCount}/${sampleProducts.length}`)
    
    // Get all products to show summary
    const { data: allProducts } = await supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', barbershopId)
    
    if (allProducts && allProducts.length > 0) {
      // Calculate total inventory value
      const totalValue = allProducts.reduce((sum, product) => {
        return sum + (product.retail_price * product.current_stock)
      }, 0)
      
      const totalCost = allProducts.reduce((sum, product) => {
        return sum + (product.cost_price * product.current_stock)
      }, 0)
      
      const categories = [...new Set(allProducts.map(p => p.category))]
      
      console.log(`- Total products in shop: ${allProducts.length}`)
      console.log(`- Categories: ${categories.join(', ')}`)
      console.log(`- Total inventory value: $${totalValue.toFixed(2)}`)
      console.log(`- Total inventory cost: $${totalCost.toFixed(2)}`)
      console.log(`- Potential profit margin: $${(totalValue - totalCost).toFixed(2)}`)
    }
    
    console.log('\n🎉 Product data seeding completed!')
    
  } catch (error) {
    console.error('Error seeding data:', error)
  }
}

// Run the seeding
seedProductData()
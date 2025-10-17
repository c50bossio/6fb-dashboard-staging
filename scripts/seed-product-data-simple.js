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
      .select('*')
      .eq('barbershop_id', shopId)
    
    if (!existingProducts || existingProducts.length === 0) {

      // Sample product data - using only fields that exist in the table
      const sampleProducts = [
        // Hair Care
        { name: 'Premium Hair Oil', price: 15, stock: 25, sku: 'HC001', description: 'Nourishing hair oil for all hair types' },
        { name: 'Deep Conditioning Treatment', price: 22, stock: 15, sku: 'HC002', description: 'Intensive repair treatment' },
        { name: 'Hair Growth Serum', price: 35, stock: 12, sku: 'HC003', description: 'Promotes healthy hair growth' },
        { name: 'Moisturizing Shampoo', price: 18, stock: 30, sku: 'HC004', description: 'Gentle cleansing shampoo' },
        
        // Beard Care
        { name: 'Beard Styling Balm', price: 15, stock: 20, sku: 'BC001', description: 'Strong hold beard styling' },
        { name: 'Beard Oil Premium', price: 25, stock: 18, sku: 'BC002', description: 'Premium beard conditioning oil' },
        { name: 'Beard Shaping Kit', price: 45, stock: 8, sku: 'BC003', description: 'Complete beard grooming kit' },
        
        // Tools
        { name: 'Professional Scissors', price: 70, stock: 5, sku: 'T001', description: 'High-quality cutting scissors' },
        { name: 'Electric Trimmer Pro', price: 120, stock: 3, sku: 'T002', description: 'Professional grade trimmer' },
        { name: 'Straight Razor Set', price: 85, stock: 4, sku: 'T003', description: 'Traditional shaving set' },
        
        // Styling Products
        { name: 'Hair Styling Gel', price: 15, stock: 35, sku: 'S001', description: 'Strong hold styling gel' },
        { name: 'Matte Finish Clay', price: 20, stock: 22, sku: 'S002', description: 'Natural matte finish' },
        { name: 'Hair Spray Strong Hold', price: 12, stock: 28, sku: 'S003', description: 'All-day hold spray' },
        
        // Aftercare
        { name: 'Aftershave Lotion', price: 15, stock: 25, sku: 'AC001', description: 'Soothing aftershave' },
        { name: 'Cooling Face Balm', price: 18, stock: 20, sku: 'AC002', description: 'Refreshing face balm' },
        { name: 'Skin Recovery Cream', price: 22, stock: 15, sku: 'AC003', description: 'Post-shave recovery' },
      ]
      
      // Insert products one by one
      for (const product of sampleProducts) {
        const { data, error } = await supabase
          .from('products')
          .insert({
            barbershop_id: shopId,
            ...product
          })
          .select()
        
        if (error) {
          console.error(`Error creating product ${product.name}:`, error.message)
        } else {
          
        }
      }
    } else {
      
    }
    
    // Get all products for generating sales data
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', shopId)
    
    if (!products || products.length === 0) {
      
      return
    }

    // Calculate total inventory value
    const totalValue = products.reduce((sum, product) => {
      return sum + (product.price * product.stock)
    }, 0)
    
    }`)

  } catch (error) {
    console.error('Error seeding data:', error)
  }
}

// Run the seeding
seedProductData()
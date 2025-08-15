#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfhqjdoydihajmjxniee.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c"
)

function generateRealisticStock(product) {
  // Generate realistic stock levels based on product type and price
  const price = parseFloat(product.retail_price) || 0
  const category = product.category || 'accessories'
  
  let stockRange = { min: 5, max: 50 }
  
  // High-value items: Lower stock levels (premium clippers, etc.)
  if (price > 200) {
    stockRange = { min: 2, max: 15 }
  }
  // Mid-range items: Moderate stock levels  
  else if (price > 50) {
    stockRange = { min: 8, max: 35 }
  }
  // Low-cost items: Higher stock levels (accessories, small items)
  else if (price > 0) {
    stockRange = { min: 15, max: 100 }
  }
  // Free/discount items: Special handling
  else {
    stockRange = { min: 0, max: 5 }
  }
  
  // Category-specific adjustments
  if (category === 'tools') {
    stockRange.min = Math.max(1, stockRange.min - 5)
    stockRange.max = Math.max(10, stockRange.max - 10)
  } else if (category === 'hair_care' || category === 'beard_care') {
    stockRange.min += 10
    stockRange.max += 20
  }
  
  // Generate random stock within range
  const stock = Math.floor(Math.random() * (stockRange.max - stockRange.min + 1)) + stockRange.min
  
  // 15% chance of being low stock (at or below min_stock_level)
  if (Math.random() < 0.15) {
    return Math.max(0, Math.floor(Math.random() * (product.min_stock_level + 1)))
  }
  
  // 5% chance of being out of stock
  if (Math.random() < 0.05) {
    return 0
  }
  
  return stock
}

async function updateInventoryLevels() {
  try {
    console.log('🔄 Updating inventory levels to realistic values...')
    
    // Get all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
    
    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError)
      return
    }
    
    console.log(`📦 Found ${products.length} products to update`)
    
    const updates = products.map(product => {
      const newStock = generateRealisticStock(product)
      return {
        id: product.id,
        current_stock: newStock,
        updated_at: new Date().toISOString()
      }
    })
    
    // Update in batches
    const batchSize = 10
    let updatedCount = 0
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            current_stock: update.current_stock,
            updated_at: update.updated_at
          })
          .eq('id', update.id)
        
        if (updateError) {
          console.error(`❌ Error updating product ${update.id}:`, updateError)
        } else {
          updatedCount++
        }
      }
    }
    
    console.log(`✅ Successfully updated ${updatedCount} products`)
    
    // Get summary statistics
    const { data: updatedProducts } = await supabase
      .from('products')
      .select('current_stock, min_stock_level, retail_price')
      .eq('barbershop_id', '550e8400-e29b-41d4-a716-446655440000')
    
    const stats = {
      totalProducts: updatedProducts.length,
      inStock: updatedProducts.filter(p => p.current_stock > 0).length,
      outOfStock: updatedProducts.filter(p => p.current_stock === 0).length,
      lowStock: updatedProducts.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length,
      totalValue: updatedProducts.reduce((sum, p) => sum + (p.current_stock * p.retail_price), 0)
    }
    
    console.log('\n📊 Inventory Summary:')
    console.log(`   Total Products: ${stats.totalProducts}`)
    console.log(`   In Stock: ${stats.inStock}`)
    console.log(`   Out of Stock: ${stats.outOfStock}`)
    console.log(`   Low Stock: ${stats.lowStock}`)
    console.log(`   Total Inventory Value: $${stats.totalValue.toLocaleString()}`)
    
    console.log('\n🎯 Sample Updated Products:')
    const samples = updatedProducts.slice(0, 5)
    samples.forEach((product, i) => {
      const stockStatus = product.current_stock === 0 ? 'OUT OF STOCK' :
                         product.current_stock <= product.min_stock_level ? 'LOW STOCK' : 'IN STOCK'
      console.log(`   ${i + 1}. Stock: ${product.current_stock} - ${stockStatus}`)
    })
    
  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

updateInventoryLevels()
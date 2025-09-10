#!/usr/bin/env node

/**
 * Setup Default Tomb45/Tune 45 Wholesale Products
 * This script populates the system with default wholesale products
 * that can be imported from CIN7 or added manually
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
)

// Default Tomb45/Tune 45 wholesale products
const defaultProducts = [
  // Tomb45 Hair Products
  {
    name: 'Tomb45 Matte Finish Texture Paste',
    sku: 'TOMB45-MATTE-001',
    barcode: '848218005951',
    brand: 'Tomb45',
    category: 'hair_products',
    current_stock: 0,
    min_stock: 5,
    max_stock: 50,
    unit_cost: 12.99,
    retail_price: 24.99,
    supplier: 'Tomb45 Wholesale',
    supplier_sku: 'T45-MATTE-PASTE',
    description: 'Professional matte finish styling paste for strong hold without shine',
    specifications: {
      weight: '2.5 oz',
      hold_strength: 'Strong',
      finish: 'Matte',
      ingredients: 'Water, Beeswax, Lanolin, Kaolin Clay',
      product_type: 'styling_paste',
      is_tomb45: true
    },
    is_active: true,
    is_retail: true
  },
  {
    name: 'Tomb45 Pomade High Gloss',
    sku: 'TOMB45-POMADE-001',
    barcode: '848218005968',
    brand: 'Tomb45',
    category: 'hair_products',
    current_stock: 0,
    min_stock: 5,
    max_stock: 50,
    unit_cost: 14.99,
    retail_price: 29.99,
    supplier: 'Tomb45 Wholesale',
    supplier_sku: 'T45-POMADE-GLOSS',
    description: 'Classic high-shine pomade for slicked-back vintage styles',
    specifications: {
      weight: '2.5 oz',
      hold_strength: 'Medium',
      finish: 'High Gloss',
      ingredients: 'Petrolatum, Lanolin, Beeswax, Fragrance',
      product_type: 'pomade',
      is_tomb45: true
    },
    is_active: true,
    is_retail: true
  },
  {
    name: 'Tomb45 Sea Salt Spray',
    sku: 'TOMB45-SPRAY-001',
    barcode: '848218005975',
    brand: 'Tomb45',
    category: 'hair_products',
    current_stock: 0,
    min_stock: 10,
    max_stock: 75,
    unit_cost: 8.99,
    retail_price: 16.99,
    supplier: 'Tomb45 Wholesale',
    supplier_sku: 'T45-SALT-SPRAY',
    description: 'Texturizing sea salt spray for beachy, tousled hair',
    specifications: {
      weight: '8 oz',
      hold_strength: 'Light',
      finish: 'Natural',
      ingredients: 'Water, Sea Salt, Aloe Vera, Essential Oils',
      product_type: 'texturizing_spray',
      is_tomb45: true
    },
    is_active: true,
    is_retail: true
  },

  // Tomb45 Tools
  {
    name: 'Tomb45 PowerClip Professional Clipper',
    sku: 'TOMB45-CLIPPER-001',
    barcode: '848218006001',
    brand: 'Tomb45',
    category: 'tools',
    current_stock: 0,
    min_stock: 2,
    max_stock: 10,
    unit_cost: 89.99,
    retail_price: 159.99,
    supplier: 'Tomb45 Wholesale',
    supplier_sku: 'T45-POWERCLIP',
    description: 'Professional-grade cordless clipper with 2-hour battery life',
    specifications: {
      battery_life: '2 hours',
      blade_type: 'Titanium-coated',
      motor: 'Rotary',
      accessories: 'Charging stand, oil, cleaning brush, guards',
      warranty: '2 years',
      is_tomb45: true
    },
    is_active: true,
    is_retail: false // Professional tool, not for retail
  },
  {
    name: 'Tomb45 Precision Trimmer',
    sku: 'TOMB45-TRIMMER-001',
    barcode: '848218006018',
    brand: 'Tomb45',
    category: 'tools',
    current_stock: 0,
    min_stock: 3,
    max_stock: 15,
    unit_cost: 45.99,
    retail_price: 79.99,
    supplier: 'Tomb45 Wholesale',
    supplier_sku: 'T45-PRECISION-TRIM',
    description: 'Cordless precision trimmer for detailed work and line-ups',
    specifications: {
      battery_life: '90 minutes',
      blade_type: 'Carbon steel',
      motor: 'Linear',
      accessories: 'Charging cable, oil, guards',
      warranty: '1 year',
      is_tomb45: true
    },
    is_active: true,
    is_retail: true
  },

  // Tune 45 Products
  {
    name: 'Tune 45 Clay Styling Compound',
    sku: 'TUNE45-CLAY-001',
    barcode: '848218007001',
    brand: 'Tune 45',
    category: 'hair_products',
    current_stock: 0,
    min_stock: 8,
    max_stock: 60,
    unit_cost: 11.99,
    retail_price: 22.99,
    supplier: 'Tune 45 Wholesale',
    supplier_sku: 'T45-CLAY-COMPOUND',
    description: 'Natural clay styling compound for texture and volume',
    specifications: {
      weight: '2 oz',
      hold_strength: 'Medium-Strong',
      finish: 'Natural Matte',
      ingredients: 'Bentonite Clay, Coconut Oil, Shea Butter',
      product_type: 'clay',
      is_tune45: true
    },
    is_active: true,
    is_retail: true
  },
  {
    name: 'Tune 45 Beard Oil Classic',
    sku: 'TUNE45-BEARD-001',
    barcode: '848218007018',
    brand: 'Tune 45',
    category: 'hair_products',
    current_stock: 0,
    min_stock: 12,
    max_stock: 80,
    unit_cost: 9.99,
    retail_price: 18.99,
    supplier: 'Tune 45 Wholesale',
    supplier_sku: 'T45-BEARD-CLASSIC',
    description: 'Nourishing beard oil with classic barbershop scent',
    specifications: {
      weight: '1 oz',
      scent: 'Classic Barbershop',
      ingredients: 'Jojoba Oil, Argan Oil, Vitamin E, Essential Oils',
      product_type: 'beard_oil',
      is_tune45: true
    },
    is_active: true,
    is_retail: true
  },
  {
    name: 'Tune 45 Pre-Shave Oil',
    sku: 'TUNE45-PRESHAVE-001',
    barcode: '848218007025',
    brand: 'Tune 45',
    category: 'hair_products',
    current_stock: 0,
    min_stock: 6,
    max_stock: 40,
    unit_cost: 7.99,
    retail_price: 14.99,
    supplier: 'Tune 45 Wholesale',
    supplier_sku: 'T45-PRESHAVE-OIL',
    description: 'Protective pre-shave oil for smooth razor glides',
    specifications: {
      weight: '0.5 oz',
      scent: 'Unscented',
      ingredients: 'Sunflower Oil, Castor Oil, Jojoba Oil',
      product_type: 'pre_shave_oil',
      is_tune45: true
    },
    is_active: true,
    is_retail: true
  },

  // Consumables
  {
    name: 'Professional Disposable Razor Blades (50 pack)',
    sku: 'TOMB45-BLADES-001',
    barcode: '848218008001',
    brand: 'Tomb45',
    category: 'consumables',
    current_stock: 0,
    min_stock: 5,
    max_stock: 25,
    unit_cost: 19.99,
    retail_price: 34.99,
    supplier: 'Tomb45 Wholesale',
    supplier_sku: 'T45-RAZOR-BLADES-50',
    description: 'High-quality disposable razor blades for professional use',
    specifications: {
      quantity: '50 blades',
      blade_type: 'Stainless steel',
      compatibility: 'Universal safety razor',
      is_tomb45: true
    },
    is_active: true,
    is_retail: false // Professional supply
  },
  {
    name: 'Neck Paper Strips (500 pack)',
    sku: 'TOMB45-NECK-001',
    barcode: '848218008018',
    brand: 'Tomb45',
    category: 'consumables',
    current_stock: 0,
    min_stock: 10,
    max_stock: 50,
    unit_cost: 8.99,
    retail_price: null, // Not for retail
    supplier: 'Tomb45 Wholesale',
    supplier_sku: 'T45-NECK-STRIPS-500',
    description: 'Hygienic neck paper strips for clipper work',
    specifications: {
      quantity: '500 strips',
      material: 'Crepe paper',
      size: '2" x 3.5"',
      is_tomb45: true
    },
    is_active: true,
    is_retail: false
  }
]

async function setupDefaultProducts() {
  console.log('🏪 Setting up default Tomb45/Tune 45 wholesale products...')
  
  try {
    let insertedCount = 0
    let skippedCount = 0
    
    for (const product of defaultProducts) {
      // Check if product already exists
      const { data: existing } = await supabase
        .from('inventory')
        .select('id, sku')
        .eq('sku', product.sku)
        .single()
      
      if (existing) {
        console.log(`⏭️  Skipped ${product.name} (${product.sku}) - already exists`)
        skippedCount++
        continue
      }
      
      // Insert new product
      const { error } = await supabase
        .from('inventory')
        .insert({
          ...product,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null, // System setup
          updated_by: null
        })
      
      if (error) {
        console.error(`❌ Error inserting ${product.name}:`, error.message)
      } else {
        console.log(`✅ Added ${product.name} (${product.sku})`)
        insertedCount++
      }
    }
    
    console.log(`\n🎉 Setup completed!`)
    console.log(`📦 Products added: ${insertedCount}`)
    console.log(`⏭️  Products skipped: ${skippedCount}`)
    console.log(`🏪 Total products: ${defaultProducts.length}`)
    
    // Generate summary report
    const categories = {}
    const brands = {}
    let totalValue = 0
    
    defaultProducts.forEach(product => {
      const cat = product.category
      const brand = product.brand
      
      categories[cat] = (categories[cat] || 0) + 1
      brands[brand] = (brands[brand] || 0) + 1
      totalValue += product.unit_cost
    })
    
    console.log(`\n📊 Product Breakdown:`)
    console.log(`Categories:`, categories)
    console.log(`Brands:`, brands)
    console.log(`Total wholesale value: $${totalValue.toFixed(2)}`)
    
    console.log(`\n💡 Next Steps:`)
    console.log(`1. Configure CIN7 credentials to sync real product data`)
    console.log(`2. Set up automatic reorder points for consumables`) 
    console.log(`3. Enable POS sales for retail products`)
    console.log(`4. Configure commission structures for staff`)
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Check for command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isForce = args.includes('--force')

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made')
  console.log(`\nWould insert ${defaultProducts.length} products:`)
  defaultProducts.forEach((product, i) => {
    console.log(`${i + 1}. ${product.name} (${product.sku}) - ${product.brand}`)
  })
  process.exit(0)
}

if (!isForce) {
  console.log('⚠️  This will add default wholesale products to your inventory.')
  console.log('   Use --dry-run to preview changes')
  console.log('   Use --force to proceed without confirmation')
  console.log('')
  
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  rl.question('Do you want to continue? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      setupDefaultProducts()
    } else {
      console.log('❌ Setup cancelled')
    }
    rl.close()
  })
} else {
  setupDefaultProducts()
}

module.exports = { setupDefaultProducts, defaultProducts }
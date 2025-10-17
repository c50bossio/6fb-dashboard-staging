#!/usr/bin/env node

/**
 * Product Inventory Seeding Script
 *
 * Seeds realistic barbershop product inventory across 3 locations:
 * - Tomb45 Channelside (Tampa, FL): 35 products
 * - Tomb45 GasWorx (Tampa, FL): 25 products
 * - Elite Cuts LA (Los Angeles, CA): 30 products
 *
 * Product Categories:
 * - HAIR_PRODUCTS (30%): Pomades, oils, shampoos, sprays
 * - BEARD_CARE (25%): Oils, balms, brushes, shampoos
 * - GROOMING_TOOLS (20%): Clippers, trimmers, scissors
 * - STYLING (15%): Waxes, clays, texturizers
 * - RETAIL (10%): Capes, neck strips, aftershave
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Barbershop IDs
const BARBERSHOPS = {
  TOMB45_CHANNELSIDE: 'c5a58548-8f23-426c-bedc-49a83d238724',
  TOMB45_GASWORX: '9306d931-7ab0-45b7-88d5-599678085526',
  ELITE_CUTS_LA: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
};

// Product catalog by category
const PRODUCT_CATALOG = {
  HAIR_PRODUCTS: [
    { name: "Murray's Superior Pomade", brand: "Murray's", description: "Classic petroleum-based pomade for strong hold and high shine", price: 8.99, category: "HAIR_PRODUCTS" },
    { name: "Suavecito Original Hold Pomade", brand: "Suavecito", description: "Water-based pomade with medium hold and shine", price: 12.99, category: "HAIR_PRODUCTS" },
    { name: "Layrite Super Hold Pomade", brand: "Layrite", description: "Water-based pomade for extreme hold and high shine", price: 16.99, category: "HAIR_PRODUCTS" },
    { name: "American Crew Fiber", brand: "American Crew", description: "High hold with low shine for textured styles", price: 18.99, category: "HAIR_PRODUCTS" },
    { name: "Baxter of California Clay Pomade", brand: "Baxter", description: "Strong hold matte finish styling clay", price: 22.99, category: "HAIR_PRODUCTS" },
    { name: "Moroccan Argan Oil", brand: "Generic", description: "Pure argan oil for hair and beard conditioning", price: 14.99, category: "HAIR_PRODUCTS" },
    { name: "Coconut Hair Oil", brand: "Generic", description: "Organic coconut oil for deep conditioning", price: 11.99, category: "HAIR_PRODUCTS" },
    { name: "Tea Tree Shampoo", brand: "Paul Mitchell", description: "Invigorating tea tree oil shampoo", price: 24.99, category: "HAIR_PRODUCTS" },
    { name: "Moisturizing Conditioner", brand: "Paul Mitchell", description: "Daily conditioner for all hair types", price: 24.99, category: "HAIR_PRODUCTS" },
    { name: "Strong Hold Hair Spray", brand: "Got2b", description: "Ultra strong hold finishing spray", price: 9.99, category: "HAIR_PRODUCTS" },
    { name: "Volumizing Gel", brand: "Eco Styler", description: "Maximum hold styling gel", price: 7.99, category: "HAIR_PRODUCTS" },
    { name: "Sea Salt Spray", brand: "Not Your Mother's", description: "Beach waves texturizing spray", price: 8.99, category: "HAIR_PRODUCTS" },
    { name: "Heat Protection Spray", brand: "TRESemmé", description: "Thermal protection for styling", price: 12.99, category: "HAIR_PRODUCTS" },
    { name: "Anti-Frizz Serum", brand: "John Frieda", description: "Smoothing serum for frizz control", price: 13.99, category: "HAIR_PRODUCTS" },
    { name: "Leave-In Conditioner", brand: "It's a 10", description: "Multi-benefit leave-in treatment", price: 19.99, category: "HAIR_PRODUCTS" }
  ],

  BEARD_CARE: [
    { name: "Sandalwood Beard Oil", brand: "Honest Amish", description: "Premium beard oil with sandalwood scent", price: 14.99, category: "BEARD_CARE" },
    { name: "Cedarwood Beard Oil", brand: "Viking Revolution", description: "All-natural cedarwood beard conditioning oil", price: 12.99, category: "BEARD_CARE" },
    { name: "Unscented Beard Oil", brand: "Beard Reverence", description: "Fragrance-free beard oil for sensitive skin", price: 15.99, category: "BEARD_CARE" },
    { name: "Peppermint Beard Oil", brand: "Badass Beard Care", description: "Invigorating peppermint beard oil", price: 13.99, category: "BEARD_CARE" },
    { name: "Beard Balm - Natural", brand: "Honest Amish", description: "Heavy duty beard styling balm", price: 16.99, category: "BEARD_CARE" },
    { name: "Beard Butter", brand: "Smooth Viking", description: "Moisturizing beard butter for conditioning", price: 18.99, category: "BEARD_CARE" },
    { name: "Boar Bristle Beard Brush", brand: "Zeus", description: "Premium boar bristle brush for beard grooming", price: 24.99, category: "BEARD_CARE" },
    { name: "Wooden Beard Comb", brand: "Striking Viking", description: "Handcrafted sandalwood beard comb", price: 12.99, category: "BEARD_CARE" },
    { name: "Beard Wash Shampoo", brand: "Professor Fuzzworthy's", description: "Natural beard shampoo bar", price: 14.99, category: "BEARD_CARE" },
    { name: "Beard Conditioner", brand: "Polished Gentleman", description: "Softening beard conditioner", price: 16.99, category: "BEARD_CARE" },
    { name: "Beard Growth Serum", brand: "The Beard Club", description: "Biotin-enriched growth formula", price: 29.99, category: "BEARD_CARE" },
    { name: "Mustache Wax", brand: "Fisticuffs", description: "Strong hold mustache styling wax", price: 11.99, category: "BEARD_CARE" }
  ],

  GROOMING_TOOLS: [
    { name: "Wahl Professional 5-Star Magic Clip", brand: "Wahl", description: "Professional cordless clipper with fade blade", price: 149.99, category: "GROOMING_TOOLS" },
    { name: "Andis Master Cordless Clipper", brand: "Andis", description: "Lithium-ion cordless clipper", price: 189.99, category: "GROOMING_TOOLS" },
    { name: "Oster Classic 76 Clipper", brand: "Oster", description: "Heavy-duty professional clipper", price: 169.99, category: "GROOMING_TOOLS" },
    { name: "Wahl Detailer Trimmer", brand: "Wahl", description: "T-Wide blade trimmer for detail work", price: 59.99, category: "GROOMING_TOOLS" },
    { name: "Andis Slimline Pro Li Trimmer", brand: "Andis", description: "Cordless precision trimmer", price: 89.99, category: "GROOMING_TOOLS" },
    { name: "BaBylissPRO FX Trimmer", brand: "BaBylissPRO", description: "Professional lithium trimmer", price: 79.99, category: "GROOMING_TOOLS" },
    { name: "Wahl 5-Star Shaver", brand: "Wahl", description: "Professional shaver for bald fades", price: 99.99, category: "GROOMING_TOOLS" },
    { name: "Professional Barber Scissors 6.5\"", brand: "Kamisori", description: "Japanese steel cutting shears", price: 129.99, category: "GROOMING_TOOLS" },
    { name: "Thinning Shears", brand: "Equinox", description: "40-tooth thinning scissors", price: 34.99, category: "GROOMING_TOOLS" },
    { name: "Carbon Fiber Cutting Comb Set", brand: "YS Park", description: "Professional cutting comb set (3 pack)", price: 29.99, category: "GROOMING_TOOLS" },
    { name: "Neck Duster Brush", brand: "Andis", description: "Soft bristle neck cleaning brush", price: 14.99, category: "GROOMING_TOOLS" },
    { name: "Straight Razor", brand: "Dovo", description: "German stainless steel straight razor", price: 84.99, category: "GROOMING_TOOLS" },
    { name: "Shaving Brush", brand: "Parker", description: "Pure badger shaving brush", price: 24.99, category: "GROOMING_TOOLS" }
  ],

  STYLING: [
    { name: "Gatsby Moving Rubber Hair Wax", brand: "Gatsby", description: "Spiky edge styling wax", price: 12.99, category: "STYLING" },
    { name: "American Crew Molding Clay", brand: "American Crew", description: "High hold matte finish clay", price: 17.99, category: "STYLING" },
    { name: "Hanz de Fuko Claymation", brand: "Hanz de Fuko", description: "Hybrid styling clay", price: 24.99, category: "STYLING" },
    { name: "Layrite Cement Clay", brand: "Layrite", description: "Water-based extreme hold clay", price: 19.99, category: "STYLING" },
    { name: "Uppercut Deluxe Matte Clay", brand: "Uppercut Deluxe", description: "Strong hold matte clay", price: 21.99, category: "STYLING" },
    { name: "Texturizing Powder", brand: "Big Sexy Hair", description: "Volumizing powder for lift", price: 16.99, category: "STYLING" },
    { name: "Hair Fiber Thickener", brand: "Toppik", description: "Hair building fibers", price: 29.99, category: "STYLING" },
    { name: "Finishing Spray", brand: "Sebastian", description: "Flexible hold finishing spray", price: 22.99, category: "STYLING" },
    { name: "Shine Spray", brand: "Kenra", description: "Glossing spray for shine", price: 18.99, category: "STYLING" }
  ],

  RETAIL: [
    { name: "Professional Barber Cape", brand: "Generic", description: "Water-resistant nylon cutting cape", price: 19.99, category: "RETAIL" },
    { name: "Neck Strips (500 pack)", brand: "Diane", description: "Disposable tissue neck strips", price: 12.99, category: "RETAIL" },
    { name: "Aftershave Lotion", brand: "Pinaud Clubman", description: "Classic barbershop aftershave", price: 8.99, category: "RETAIL" },
    { name: "Bay Rum Aftershave", brand: "Pinaud Clubman", description: "Traditional bay rum scent", price: 9.99, category: "RETAIL" },
    { name: "Microfiber Face Towels (12 pack)", brand: "Generic", description: "Soft microfiber towels for hot towel service", price: 24.99, category: "RETAIL" },
    { name: "Barber Pole Sanitizer Jar", brand: "King Research", description: "Glass sanitizing jar for tools", price: 34.99, category: "RETAIL" },
    { name: "Barbicide Disinfectant", brand: "Barbicide", description: "Professional tool disinfectant concentrate", price: 18.99, category: "RETAIL" },
    { name: "Shaving Cream", brand: "Proraso", description: "Eucalyptus & menthol shaving cream", price: 10.99, category: "RETAIL" }
  ]
};

// Helper function to generate random stock quantity based on seller tier
function getStockQuantity(tier) {
  switch(tier) {
    case 'high': return Math.floor(Math.random() * 51) + 50; // 50-100
    case 'medium': return Math.floor(Math.random() * 31) + 20; // 20-50
    case 'slow': return Math.floor(Math.random() * 16) + 5; // 5-20
    default: return 25;
  }
}

// Helper function to get low stock threshold based on tier
function getLowStockThreshold(tier) {
  switch(tier) {
    case 'high': return 15;
    case 'medium': return 8;
    case 'slow': return 3;
    default: return 5;
  }
}

// Helper function to assign seller tier
function assignSellerTier(index, total) {
  const position = index / total;
  if (position < 0.3) return 'high'; // First 30% are high sellers
  if (position < 0.8) return 'medium'; // Next 50% are medium
  return 'slow'; // Last 20% are slow
}

// Helper function to calculate cost (60-70% of price)
function calculateCost(price) {
  const percentage = 0.60 + (Math.random() * 0.10); // 60-70%
  return (price * percentage).toFixed(2);
}

// Helper function to get commission rate by category
function getCommissionRate(category) {
  switch(category) {
    case 'HAIR_PRODUCTS': return 15.00;
    case 'BEARD_CARE': return 20.00;
    case 'GROOMING_TOOLS': return 10.00;
    case 'STYLING': return 15.00;
    case 'RETAIL': return 12.00;
    default: return 15.00;
  }
}

// Helper function to generate SKU
function generateSKU(locationCode, category, index) {
  const categoryCode = {
    'HAIR_PRODUCTS': 'HAIR',
    'BEARD_CARE': 'BEARD',
    'GROOMING_TOOLS': 'TOOL',
    'STYLING': 'STYLE',
    'RETAIL': 'RETAIL'
  }[category] || 'PROD';

  return `${locationCode}-${categoryCode}-${String(index).padStart(3, '0')}`;
}

// Location configurations
const LOCATIONS = {
  TOMB45_CHANNELSIDE: {
    id: BARBERSHOPS.TOMB45_CHANNELSIDE,
    code: 'TC',
    name: 'Tomb45 Channelside',
    productCount: 35,
    stockMultiplier: 1.2 // Higher stock levels (established)
  },
  TOMB45_GASWORX: {
    id: BARBERSHOPS.TOMB45_GASWORX,
    code: 'TG',
    name: 'Tomb45 GasWorx',
    productCount: 25,
    stockMultiplier: 0.8 // Lower stock levels (newer)
  },
  ELITE_CUTS_LA: {
    id: BARBERSHOPS.ELITE_CUTS_LA,
    code: 'EC',
    name: 'Elite Cuts LA',
    productCount: 30,
    stockMultiplier: 1.0 // Moderate stock levels
  }
};

// Generate products for a location
function generateLocationProducts(location) {
  const products = [];
  const allProducts = Object.values(PRODUCT_CATALOG).flat();

  // Shuffle and select products for this location
  const shuffled = [...allProducts].sort(() => Math.random() - 0.5);
  const selectedProducts = shuffled.slice(0, location.productCount);

  selectedProducts.forEach((product, index) => {
    const tier = assignSellerTier(index, selectedProducts.length);
    const baseStock = getStockQuantity(tier);
    const stock = Math.floor(baseStock * location.stockMultiplier);

    products.push({
      barbershop_id: location.id,
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand,
      sku: generateSKU(location.code, product.category, index + 1),
      barcode: generateSKU(location.code, product.category, index + 1),
      cost_price: parseFloat(calculateCost(product.price)),
      retail_price: product.price,
      current_stock: stock,
      on_hand: stock,
      allocated: 0,
      incoming: 0,
      min_stock_level: getLowStockThreshold(tier),
      reorder_point: getLowStockThreshold(tier),
      max_stock_level: stock + 50,
      is_active: true,
      track_inventory: true,
      sync_enabled: false,
      show_in_pos: true,
      pos_display_order: index + 1,
      commission_rate: getCommissionRate(product.category),
      tax_rate: 8.50, // Standard sales tax
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  return products;
}

// Calculate statistics
function calculateStats(products) {
  const stats = {
    totalProducts: products.length,
    byCategory: {},
    byLocation: {},
    totalInventoryValue: 0,
    averagePriceByCategory: {},
    lowStockProducts: []
  };

  products.forEach(product => {
    // Category counts
    stats.byCategory[product.category] = (stats.byCategory[product.category] || 0) + 1;

    // Location stats
    if (!stats.byLocation[product.barbershop_id]) {
      stats.byLocation[product.barbershop_id] = {
        count: 0,
        inventoryValue: 0,
        products: []
      };
    }
    stats.byLocation[product.barbershop_id].count++;
    const inventoryValue = product.current_stock * product.retail_price;
    stats.byLocation[product.barbershop_id].inventoryValue += inventoryValue;
    stats.totalInventoryValue += inventoryValue;

    // Category pricing
    if (!stats.averagePriceByCategory[product.category]) {
      stats.averagePriceByCategory[product.category] = { total: 0, count: 0 };
    }
    stats.averagePriceByCategory[product.category].total += product.retail_price;
    stats.averagePriceByCategory[product.category].count++;

    // Low stock check
    if (product.current_stock <= product.reorder_point) {
      stats.lowStockProducts.push({
        name: product.name,
        stock: product.current_stock,
        reorderPoint: product.reorder_point,
        barbershop: product.barbershop_id
      });
    }
  });

  // Calculate averages
  Object.keys(stats.averagePriceByCategory).forEach(category => {
    const data = stats.averagePriceByCategory[category];
    stats.averagePriceByCategory[category] = (data.total / data.count).toFixed(2);
  });

  return stats;
}

// Main seeding function
async function seedProductInventory() {
  console.log('🏪 Starting Product Inventory Seeding...\n');

  const autoConfirm = process.argv.includes('--force') || process.argv.includes('-f');

  try {
    // Check if products already exist
    const { data: existingProducts, error: checkError } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (checkError) throw checkError;

    if (existingProducts && existingProducts.length > 0) {
      console.log('⚠️  Products already exist in database');

      if (!autoConfirm) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise(resolve => {
          rl.question('Delete existing products and reseed? (yes/no): ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'yes') {
          console.log('❌ Seeding cancelled');
          process.exit(0);
        }
      } else {
        console.log('🔄 Auto-confirm enabled, deleting existing products...');
      }

      // Delete existing products
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;
      console.log('🗑️  Deleted existing products\n');
    }

    // Generate products for each location
    const allProducts = [];

    console.log('📦 Generating products by location:\n');
    Object.values(LOCATIONS).forEach(location => {
      const locationProducts = generateLocationProducts(location);
      allProducts.push(...locationProducts);
      console.log(`   ${location.name}: ${locationProducts.length} products`);
    });

    console.log(`\n📊 Total products to insert: ${allProducts.length}\n`);

    // Insert products in batches of 20
    const batchSize = 20;
    let insertedCount = 0;

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('products')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        throw error;
      }

      insertedCount += batch.length;
      console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} products (${insertedCount}/${allProducts.length})`);
    }

    // Calculate and display statistics
    console.log('\n📈 Inventory Statistics:\n');
    const stats = calculateStats(allProducts);

    console.log(`📦 Total Products: ${stats.totalProducts}`);
    console.log(`💰 Total Inventory Value: $${stats.totalInventoryValue.toFixed(2)}\n`);

    console.log('🏪 Products by Location:');
    Object.entries(stats.byLocation).forEach(([locationId, data]) => {
      const location = Object.values(LOCATIONS).find(l => l.id === locationId);
      console.log(`   ${location.name}: ${data.count} products, $${data.inventoryValue.toFixed(2)} inventory value`);
    });

    console.log('\n📊 Products by Category:');
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      const percentage = ((count / stats.totalProducts) * 100).toFixed(1);
      console.log(`   ${category}: ${count} products (${percentage}%)`);
    });

    console.log('\n💵 Average Price by Category:');
    Object.entries(stats.averagePriceByCategory).forEach(([category, avg]) => {
      console.log(`   ${category}: $${avg}`);
    });

    if (stats.lowStockProducts.length > 0) {
      console.log(`\n⚠️  Low Stock Alert: ${stats.lowStockProducts.length} products below reorder point:`);
      stats.lowStockProducts.slice(0, 10).forEach(product => {
        const location = Object.values(LOCATIONS).find(l => l.id === product.barbershop);
        console.log(`   ${product.name} (${location?.name}): ${product.stock} units (reorder at ${product.reorderPoint})`);
      });
      if (stats.lowStockProducts.length > 10) {
        console.log(`   ... and ${stats.lowStockProducts.length - 10} more`);
      }
    } else {
      console.log('\n✅ No products below reorder point');
    }

    console.log('\n✅ Product inventory seeding completed successfully!\n');

  } catch (error) {
    console.error('❌ Error seeding product inventory:', error);
    process.exit(1);
  }
}

// Run the seeding
seedProductInventory();

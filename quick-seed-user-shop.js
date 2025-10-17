#!/usr/bin/env node
/**
 * Quick Seed Script for Current User's Shop
 * Seeds products and appointments for shop: 1ca6138d-eae8-46ed-abff-5d6e52fbd21b (Elite Cuts Barbershop)
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Shop configuration
const SHOP_ID = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b';
const SHOP_NAME = 'Elite Cuts Barbershop';

// Sample products (20 products)
const PRODUCTS = [
  { name: "Murray's Superior Pomade", brand: "Murray's", description: "Classic pomade for strong hold", price: 8.99, category: "HAIR_PRODUCTS", commission: 15 },
  { name: "Suavecito Pomade", brand: "Suavecito", description: "Water-based pomade", price: 12.99, category: "HAIR_PRODUCTS", commission: 15 },
  { name: "American Crew Fiber", brand: "American Crew", description: "High hold styling fiber", price: 18.99, category: "HAIR_PRODUCTS", commission: 15 },
  { name: "Baxter Clay Pomade", brand: "Baxter", description: "Strong hold matte finish", price: 22.99, category: "HAIR_PRODUCTS", commission: 15 },
  { name: "Moroccan Argan Oil", brand: "Generic", description: "Pure argan oil", price: 14.99, category: "HAIR_PRODUCTS", commission: 15 },
  { name: "Sandalwood Beard Oil", brand: "Honest Amish", description: "Premium beard oil", price: 14.99, category: "BEARD_CARE", commission: 20 },
  { name: "Cedarwood Beard Oil", brand: "Viking Revolution", description: "Natural beard oil", price: 12.99, category: "BEARD_CARE", commission: 20 },
  { name: "Beard Balm", brand: "Honest Amish", description: "Styling balm", price: 16.99, category: "BEARD_CARE", commission: 20 },
  { name: "Boar Bristle Beard Brush", brand: "Zeus", description: "Premium brush", price: 24.99, category: "BEARD_CARE", commission: 20 },
  { name: "Wahl Magic Clip", brand: "Wahl", description: "Professional clipper", price: 149.99, category: "GROOMING_TOOLS", commission: 10 },
  { name: "Andis Master Clipper", brand: "Andis", description: "Cordless clipper", price: 189.99, category: "GROOMING_TOOLS", commission: 10 },
  { name: "Wahl Detailer", brand: "Wahl", description: "Precision trimmer", price: 59.99, category: "GROOMING_TOOLS", commission: 10 },
  { name: "Barber Scissors 6.5\"", brand: "Kamisori", description: "Japanese steel", price: 129.99, category: "GROOMING_TOOLS", commission: 10 },
  { name: "Gatsby Hair Wax", brand: "Gatsby", description: "Spiky edge wax", price: 12.99, category: "STYLING", commission: 15 },
  { name: "American Crew Clay", brand: "American Crew", description: "Matte finish clay", price: 17.99, category: "STYLING", commission: 15 },
  { name: "Layrite Cement Clay", brand: "Layrite", description: "Extreme hold", price: 19.99, category: "STYLING", commission: 15 },
  { name: "Barber Cape", brand: "Generic", description: "Water-resistant cape", price: 19.99, category: "RETAIL", commission: 12 },
  { name: "Neck Strips (500)", brand: "Diane", description: "Disposable strips", price: 12.99, category: "RETAIL", commission: 12 },
  { name: "Clubman Aftershave", brand: "Pinaud", description: "Classic aftershave", price: 8.99, category: "RETAIL", commission: 12 },
  { name: "Barbicide Disinfectant", brand: "Barbicide", description: "Tool disinfectant", price: 18.99, category: "RETAIL", commission: 12 }
];

// Helper functions
function getStockQuantity() {
  return Math.floor(Math.random() * 51) + 20; // 20-70 units
}

function calculateCost(price) {
  const percentage = 0.60 + (Math.random() * 0.10); // 60-70%
  return parseFloat((price * percentage).toFixed(2));
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomTimeSlot(date) {
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // 9 AM to 5 PM
  const minutes = [0, 30];

  const hour = getRandomElement(hours);
  const minute = getRandomElement(minutes);

  const appointmentDate = new Date(date);
  appointmentDate.setHours(hour, minute, 0, 0);
  return appointmentDate;
}

function getStatusForDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointmentDate = new Date(date);
  appointmentDate.setHours(0, 0, 0, 0);

  if (appointmentDate < today) {
    return Math.random() < 0.90 ? 'COMPLETED' : 'CANCELLED';
  } else if (appointmentDate.getTime() === today.getTime()) {
    return Math.random() < 0.85 ? 'CONFIRMED' : 'PENDING';
  } else {
    const rand = Math.random();
    if (rand < 0.80) return 'CONFIRMED';
    if (rand < 0.95) return 'PENDING';
    return 'CANCELLED';
  }
}

async function seedProducts() {
  console.log(`\n📦 Seeding Products for ${SHOP_NAME}...`);

  // Check existing products
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('barbershop_id', SHOP_ID)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log('⚠️  Products already exist for this shop');
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Delete and reseed products? (yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('Skipping products...\n');
      return { created: 0 };
    }

    // Delete existing
    await supabase
      .from('products')
      .delete()
      .eq('barbershop_id', SHOP_ID);
    console.log('🗑️  Deleted existing products');
  }

  // Generate products
  const productsToInsert = PRODUCTS.map((product, index) => ({
    barbershop_id: SHOP_ID,
    name: product.name,
    description: product.description,
    category: product.category,
    brand: product.brand,
    sku: `EC-${product.category.substring(0, 4)}-${String(index + 1).padStart(3, '0')}`,
    barcode: `EC-${product.category.substring(0, 4)}-${String(index + 1).padStart(3, '0')}`,
    cost_price: calculateCost(product.price),
    retail_price: product.price,
    current_stock: getStockQuantity(),
    on_hand: getStockQuantity(),
    allocated: 0,
    incoming: 0,
    min_stock_level: 10,
    reorder_point: 10,
    max_stock_level: 100,
    is_active: true,
    track_inventory: true,
    sync_enabled: false,
    show_in_pos: true,
    pos_display_order: index + 1,
    commission_rate: product.commission,
    tax_rate: 8.50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  // Insert products
  const { data, error } = await supabase
    .from('products')
    .insert(productsToInsert)
    .select();

  if (error) {
    console.error('❌ Error inserting products:', error);
    throw error;
  }

  console.log(`✅ Created ${data.length} products`);
  return { created: data.length };
}

async function seedAppointments() {
  console.log(`\n📅 Seeding Appointments for ${SHOP_NAME}...`);

  // Get staff and services
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('barbershop_id', SHOP_ID);

  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price')
    .eq('barbershop_id', SHOP_ID);

  if (!staff || staff.length === 0) {
    console.log('⚠️  No staff members found for this shop');
    console.log('Creating appointments with legacy barber...');
  }

  if (!services || services.length === 0) {
    console.log('❌ No services found - cannot create appointments');
    return { created: 0 };
  }

  console.log(`Found ${staff?.length || 0} staff, ${services.length} services`);

  // Check existing appointments
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('barbershop_id', SHOP_ID)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log('⚠️  Appointments already exist for this shop');
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Delete and reseed appointments? (yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('Skipping appointments...\n');
      return { created: 0 };
    }

    // Delete existing
    await supabase
      .from('appointments')
      .delete()
      .eq('barbershop_id', SHOP_ID);
    console.log('🗑️  Deleted existing appointments');
  }

  // Get legacy barber as fallback
  const { data: legacyBarbers } = await supabase
    .from('barbers')
    .select('id, name')
    .eq('barbershop_id', SHOP_ID)
    .limit(1);

  const barberToUse = staff && staff.length > 0 ? staff[0] :
                     legacyBarbers && legacyBarbers.length > 0 ? { id: legacyBarbers[0].id, full_name: legacyBarbers[0].name } : null;

  if (!barberToUse) {
    console.log('❌ No barbers found (neither profiles nor legacy barbers)');
    return { created: 0 };
  }

  // Generate date range (14 days ago to 14 days from now)
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = -14; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    if (date.getDay() !== 0) { // Skip Sundays
      dates.push(date);
    }
  }

  // Generate appointments (2-3 per day)
  const appointments = [];
  const targetCount = 60; // ~2 per business day

  for (let i = 0; i < targetCount; i++) {
    const date = getRandomElement(dates);
    const service = getRandomElement(services);
    const scheduledAt = getRandomTimeSlot(date);
    const status = getStatusForDate(date);

    // Sample customer names
    const customerNames = [
      'John Smith', 'Mike Johnson', 'David Williams', 'Chris Brown',
      'Robert Davis', 'James Wilson', 'William Moore', 'Joseph Taylor',
      'Daniel Anderson', 'Matthew Thomas', 'Anthony Jackson', 'Mark White',
      'Steven Harris', 'Paul Martin', 'Andrew Thompson', 'Joshua Garcia'
    ];

    appointments.push({
      id: uuidv4(),
      barbershop_id: SHOP_ID,
      barber_id: barberToUse.id,
      client_id: null,
      service_id: service.id,
      scheduled_at: scheduledAt.toISOString(),
      status: status,
      duration_minutes: service.duration_minutes,
      price: service.price,
      service_price: service.price,
      total_amount: service.price,
      tip_amount: 0,
      client_name: getRandomElement(customerNames),
      client_email: null,
      client_phone: null,
      notes: null,
      is_test: false,
      is_recurring: false,
      created_at: new Date(scheduledAt.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  console.log(`Generated ${appointments.length} appointments`);

  // Insert appointments in batches
  const batchSize = 20;
  let created = 0;

  for (let i = 0; i < appointments.length; i += batchSize) {
    const batch = appointments.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('appointments')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`❌ Batch ${i / batchSize + 1} error:`, error.message);
    } else {
      created += data.length;
      console.log(`✅ Batch ${i / batchSize + 1}: Inserted ${data.length} appointments`);
    }
  }

  return { created };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🚀 Quick Seed Script for: ${SHOP_NAME}`);
  console.log(`   Shop ID: ${SHOP_ID}`);
  console.log('═══════════════════════════════════════════════════════');

  try {
    // Seed products
    const productResult = await seedProducts();

    // Seed appointments
    const appointmentResult = await seedAppointments();

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ SEEDING COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📦 Products created: ${productResult.created}`);
    console.log(`📅 Appointments created: ${appointmentResult.created}`);
    console.log('\n🎉 Your shop now has data! Refresh the pages to see:');
    console.log('   • Products page: /shop/products');
    console.log('   • Calendar page: /dashboard/calendar');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  }
}

main();

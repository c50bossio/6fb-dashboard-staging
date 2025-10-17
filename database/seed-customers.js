#!/usr/bin/env node

/**
 * Seed realistic customer data for 3 barbershop locations
 * Distribution: ~100 customers across 3 locations
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Location configurations
const LOCATIONS = [
  {
    id: 'c5a58548-8f23-426c-bedc-49a83d238724',
    name: 'Tomb45 Channelside',
    targetCustomers: 35
  },
  {
    id: '9306d931-7ab0-45b7-88d5-599678085526',
    name: 'Tomb45 GasWorx',
    targetCustomers: 30
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Elite Cuts LA',
    targetCustomers: 35
  }
];

// Realistic name data for diversity
const FIRST_NAMES = [
  // Male names
  'James', 'Michael', 'Robert', 'John', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher',
  'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Andrew', 'Paul', 'Joshua', 'Kenneth',
  'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob',
  // Female names
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle',
  'Carol', 'Amanda', 'Dorothy', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia',
  // Diverse names
  'Jamal', 'Darius', 'Marcus', 'Terrell', 'DeShawn', 'Malik', 'Tyrone', 'Jerome', 'Antoine', 'Isaiah',
  'Carlos', 'Miguel', 'Jose', 'Luis', 'Juan', 'Rafael', 'Diego', 'Fernando', 'Ricardo', 'Mario',
  'Wei', 'Chen', 'Li', 'Zhang', 'Wang', 'Hiroshi', 'Kenji', 'Yuki', 'Ravi', 'Arjun'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Washington', 'Jefferson', 'Chen', 'Singh', 'Kumar', 'Patel', 'Kim', 'Park', 'Yamamoto', 'Tanaka'
];

const EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'aol.com', 'protonmail.com', 'me.com', 'live.com', 'mail.com'
];

/**
 * Generate random phone number in (XXX) XXX-XXXX format
 */
function generatePhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const subscriber = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${exchange}-${subscriber}`;
}

/**
 * Generate random date within a range
 */
function randomDate(startMonthsAgo, endMonthsAgo) {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - startMonthsAgo);

  const end = new Date(now);
  end.setMonth(end.getMonth() - endMonthsAgo);

  const timestamp = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(timestamp).toISOString();
}

/**
 * Generate customer mix based on customer type
 */
function generateCustomerCreationDate(customerType) {
  switch (customerType) {
    case 'regular':
      return randomDate(6, 3); // 3-6 months ago
    case 'occasional':
      return randomDate(3, 1); // 1-3 months ago
    case 'new':
      return randomDate(1, 0); // Within last month
    default:
      return new Date().toISOString();
  }
}

/**
 * Generate a realistic customer
 */
function generateCustomer(barbershopId, customerType) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];

  const createdAt = generateCustomerCreationDate(customerType);

  return {
    full_name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    phone: generatePhoneNumber(),
    barbershop_id: barbershopId,
    total_visits: 0,
    total_spent: 0,
    loyalty_points: 0,
    is_vip: false,
    created_at: createdAt,
    updated_at: createdAt
  };
}

/**
 * Generate customers for a location based on customer mix
 */
function generateCustomersForLocation(location) {
  const customers = [];
  const { targetCustomers, id } = location;

  // Calculate customer distribution
  const regularCount = Math.floor(targetCustomers * 0.6);
  const occasionalCount = Math.floor(targetCustomers * 0.3);
  const newCount = targetCustomers - regularCount - occasionalCount;

  // Generate regular customers
  for (let i = 0; i < regularCount; i++) {
    customers.push(generateCustomer(id, 'regular'));
  }

  // Generate occasional customers
  for (let i = 0; i < occasionalCount; i++) {
    customers.push(generateCustomer(id, 'occasional'));
  }

  // Generate new customers
  for (let i = 0; i < newCount; i++) {
    customers.push(generateCustomer(id, 'new'));
  }

  return customers;
}

/**
 * Insert customers in batches
 */
async function insertCustomerBatch(customers) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customers)
    .select('id, full_name, email, barbershop_id');

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Main seed function
 */
async function seedCustomers() {
  console.log('🌱 Starting customer data seeding...\n');

  const results = {
    totalCustomers: 0,
    byLocation: {},
    samples: {}
  };

  try {
    for (const location of LOCATIONS) {
      console.log(`📍 Processing ${location.name}...`);

      // Generate customers for this location
      const customers = generateCustomersForLocation(location);

      // Insert in batches of 20 to avoid rate limits
      const batchSize = 20;
      const insertedCustomers = [];

      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const inserted = await insertCustomerBatch(batch);
        insertedCustomers.push(...inserted);

        console.log(`   ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted.length} customers)`);
      }

      // Store results
      results.totalCustomers += insertedCustomers.length;
      results.byLocation[location.name] = insertedCustomers.length;
      results.samples[location.name] = insertedCustomers.slice(0, 5).map(c => c.full_name);

      console.log(`   ✅ Total for ${location.name}: ${insertedCustomers.length} customers\n`);
    }

    // Print summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ CUSTOMER SEEDING COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`📊 Total Customers Created: ${results.totalCustomers}\n`);

    console.log('📍 Breakdown by Location:');
    Object.entries(results.byLocation).forEach(([location, count]) => {
      console.log(`   • ${location}: ${count} customers`);
    });

    console.log('\n👥 Sample Customers (5 per location):\n');
    Object.entries(results.samples).forEach(([location, names]) => {
      console.log(`📍 ${location}:`);
      names.forEach(name => console.log(`   • ${name}`));
      console.log('');
    });

    // Verify data
    console.log('🔍 Verifying insertion...');
    const { count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Verification error:', error);
    } else {
      console.log(`✅ Total customers in database: ${count}`);
    }

  } catch (error) {
    console.error('❌ Error seeding customers:', error);
    throw error;
  }
}

// Run the seed script
seedCustomers()
  .then(() => {
    console.log('\n✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });

#!/usr/bin/env node

/**
 * Seed Transactions for Completed Appointments
 *
 * Generates realistic financial transaction records for all COMPLETED appointments
 * across 3 barbershop locations with proper commission rates, tips, and payment methods.
 *
 * Financial Models:
 * - Tomb45 Channelside: 60% commission (established location)
 * - Tomb45 GasWorx: 65% commission (new location incentive)
 * - Elite Cuts LA: 55% commission (premium location)
 *
 * Tip Distribution:
 * - 70% appointments: 15-20% tip
 * - 20% appointments: 5-10% tip
 * - 10% appointments: $0 tip
 *
 * Payment Methods:
 * - CARD: 60%
 * - DIGITAL_WALLET: 30%
 * - CASH: 10%
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Commission rates by location
const COMMISSION_RATES = {
  'Tomb45 Channelside': 0.60,
  'Tomb45 GasWorx': 0.65,
  'Elite Cuts LA': 0.55
};

// Payment method distribution
const PAYMENT_METHODS = [
  { method: 'CARD', weight: 60 },
  { method: 'DIGITAL_WALLET', weight: 30 },
  { method: 'CASH', weight: 10 }
];

/**
 * Generate a random tip percentage based on distribution
 * 70%: 15-20% tip
 * 20%: 5-10% tip
 * 10%: 0% tip
 */
function generateTipPercent() {
  const rand = Math.random();

  if (rand < 0.70) {
    // 15-20% tip
    return 0.15 + (Math.random() * 0.05);
  } else if (rand < 0.90) {
    // 5-10% tip
    return 0.05 + (Math.random() * 0.05);
  } else {
    // No tip
    return 0;
  }
}

/**
 * Generate a payment method based on weighted distribution
 */
function generatePaymentMethod() {
  const rand = Math.random() * 100;
  let cumulative = 0;

  for (const { method, weight } of PAYMENT_METHODS) {
    cumulative += weight;
    if (rand < cumulative) {
      return method;
    }
  }

  return 'CARD'; // Fallback
}

/**
 * Create a transaction record for a completed appointment
 */
function createTransaction(appointment, barbershop) {
  const servicePrice = parseFloat(appointment.service_price || 0);
  const tipPercent = generateTipPercent();
  const tipAmount = parseFloat((servicePrice * tipPercent).toFixed(2));

  const shopName = barbershop?.name || 'Unknown';
  const commissionRate = COMMISSION_RATES[shopName] || 0.60;
  const commissionAmount = parseFloat((servicePrice * commissionRate).toFixed(2));

  const paymentMethod = generatePaymentMethod();
  const totalAmount = servicePrice + tipAmount;

  // Store commission info in description as JSON for now
  const metadata = {
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    tip_amount: tipAmount,
    barbershop_id: appointment.barbershop_id,
    barber_id: appointment.barber_id
  };

  return {
    id: crypto.randomUUID(),
    appointment_id: appointment.id,
    customer_id: appointment.client_id,
    amount: totalAmount, // Total including tip
    type: 'PAYMENT',
    payment_method: paymentMethod,
    status: 'COMPLETED',
    description: JSON.stringify(metadata),
    created_at: appointment.scheduled_at || new Date().toISOString(),
    updated_at: appointment.scheduled_at || new Date().toISOString()
  };
}

/**
 * Calculate financial analytics
 */
function calculateAnalytics(transactions, barbershops) {
  const analytics = {
    totalTransactions: transactions.length,
    totalRevenue: 0,
    totalTips: 0,
    totalCommissions: 0,
    byLocation: {},
    byPaymentMethod: {
      CARD: { count: 0, amount: 0 },
      DIGITAL_WALLET: { count: 0, amount: 0 },
      CASH: { count: 0, amount: 0 }
    }
  };

  // Initialize location analytics
  barbershops.forEach(shop => {
    analytics.byLocation[shop.name] = {
      count: 0,
      revenue: 0,
      tips: 0,
      commissions: 0,
      shopRevenue: 0,
      avgTransaction: 0
    };
  });

  // Calculate totals
  transactions.forEach(tx => {
    // Parse metadata from description
    let metadata = {};
    try {
      metadata = JSON.parse(tx.description || '{}');
    } catch (e) {
      metadata = {};
    }

    const shop = barbershops.find(s => s.id === metadata.barbershop_id);
    const shopName = shop?.name || 'Unknown';

    const tipAmount = metadata.tip_amount || 0;
    const commissionAmount = metadata.commission_amount || 0;
    const serviceRevenue = tx.amount - tipAmount; // Total minus tip

    analytics.totalRevenue += serviceRevenue;
    analytics.totalTips += tipAmount;
    analytics.totalCommissions += commissionAmount;

    // Location breakdown
    if (analytics.byLocation[shopName]) {
      const loc = analytics.byLocation[shopName];
      loc.count++;
      loc.revenue += serviceRevenue;
      loc.tips += tipAmount;
      loc.commissions += commissionAmount;
      loc.shopRevenue += (serviceRevenue - commissionAmount);
    }

    // Payment method breakdown
    if (analytics.byPaymentMethod[tx.payment_method]) {
      analytics.byPaymentMethod[tx.payment_method].count++;
      analytics.byPaymentMethod[tx.payment_method].amount += tx.amount;
    }
  });

  // Calculate averages
  Object.keys(analytics.byLocation).forEach(shopName => {
    const loc = analytics.byLocation[shopName];
    if (loc.count > 0) {
      loc.avgTransaction = parseFloat((loc.revenue / loc.count).toFixed(2));
    }
  });

  return analytics;
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

/**
 * Main seeding function
 */
async function seedTransactions() {
  console.log('🚀 Starting Transaction Seeding Process\n');
  console.log('=' .repeat(70));

  try {
    // Step 1: Get all barbershops
    console.log('\n📍 Step 1: Fetching Barbershops...');
    const { data: barbershops, error: shopsError } = await supabase
      .from('barbershops')
      .select('id, name');

    if (shopsError) throw shopsError;
    console.log(`✅ Found ${barbershops.length} barbershops`);
    barbershops.forEach(shop => console.log(`   - ${shop.name}`));

    // Step 2: Get all completed appointments with service prices
    console.log('\n📅 Step 2: Fetching Completed Appointments...');
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        barber_id,
        client_id,
        barbershop_id,
        service_id,
        status,
        scheduled_at,
        service_price,
        services (
          price
        )
      `)
      .eq('status', 'COMPLETED');

    if (apptError) throw apptError;

    // Transform appointments to include service price
    const appointmentsWithPrices = appointments.map(appt => ({
      ...appt,
      service_price: appt.services?.price || 0
    }));

    console.log(`✅ Found ${appointmentsWithPrices.length} COMPLETED appointments`);

    // Step 3: Check for existing transactions
    console.log('\n🔍 Step 3: Checking for Existing Transactions...');
    const { data: existingTx, error: txError } = await supabase
      .from('transactions')
      .select('appointment_id');

    if (txError) throw txError;

    const existingAppointmentIds = new Set(existingTx.map(tx => tx.appointment_id));
    console.log(`⚠️  Found ${existingAppointmentIds.size} existing transactions`);

    // Filter out appointments that already have transactions
    const appointmentsToProcess = appointmentsWithPrices.filter(
      appt => !existingAppointmentIds.has(appt.id)
    );

    console.log(`📝 Will create ${appointmentsToProcess.length} new transactions`);

    if (appointmentsToProcess.length === 0) {
      console.log('\n✅ All completed appointments already have transactions!');
      return;
    }

    // Step 4: Generate transactions
    console.log('\n💰 Step 4: Generating Transactions...');
    const transactions = appointmentsToProcess.map(appt => {
      const shop = barbershops.find(s => s.id === appt.barbershop_id);
      return createTransaction(appt, shop);
    });

    console.log(`✅ Generated ${transactions.length} transaction records`);

    // Step 5: Insert transactions in batches
    console.log('\n💾 Step 5: Inserting Transactions into Database...');
    const BATCH_SIZE = 25;
    let insertedCount = 0;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError);
        throw insertError;
      }

      insertedCount += batch.length;
      const progress = ((insertedCount / transactions.length) * 100).toFixed(1);
      console.log(`   📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Inserted ${batch.length} transactions (${progress}%)`);
    }

    console.log(`✅ Successfully inserted ${insertedCount} transactions`);

    // Step 6: Calculate and display analytics
    console.log('\n📊 Step 6: Financial Analytics\n');
    console.log('=' .repeat(70));

    const analytics = calculateAnalytics(transactions, barbershops);

    console.log('\n💵 OVERALL SUMMARY:');
    console.log(`   Total Transactions: ${analytics.totalTransactions}`);
    console.log(`   Total Revenue: ${formatCurrency(analytics.totalRevenue)}`);
    console.log(`   Total Tips: ${formatCurrency(analytics.totalTips)}`);
    console.log(`   Total Commissions: ${formatCurrency(analytics.totalCommissions)}`);
    console.log(`   Total Shop Revenue: ${formatCurrency(analytics.totalRevenue - analytics.totalCommissions)}`);
    console.log(`   Average Transaction: ${formatCurrency(analytics.totalRevenue / analytics.totalTransactions)}`);

    console.log('\n📍 REVENUE BY LOCATION:');
    Object.entries(analytics.byLocation).forEach(([name, stats]) => {
      if (stats.count > 0) {
        const commissionRate = COMMISSION_RATES[name] || 0.60;
        console.log(`\n   ${name}:`);
        console.log(`     Transactions: ${stats.count}`);
        console.log(`     Service Revenue: ${formatCurrency(stats.revenue)}`);
        console.log(`     Tips Collected: ${formatCurrency(stats.tips)}`);
        console.log(`     Commission Rate: ${(commissionRate * 100).toFixed(0)}%`);
        console.log(`     Barber Commissions: ${formatCurrency(stats.commissions)}`);
        console.log(`     Shop Revenue: ${formatCurrency(stats.shopRevenue)}`);
        console.log(`     Avg Transaction: ${formatCurrency(stats.avgTransaction)}`);
      }
    });

    console.log('\n💳 PAYMENT METHOD DISTRIBUTION:');
    Object.entries(analytics.byPaymentMethod).forEach(([method, stats]) => {
      if (stats.count > 0) {
        const percentage = ((stats.count / analytics.totalTransactions) * 100).toFixed(1);
        console.log(`   ${method}:`);
        console.log(`     Count: ${stats.count} (${percentage}%)`);
        console.log(`     Total Amount: ${formatCurrency(stats.amount)}`);
      }
    });

    console.log('\n' + '=' .repeat(70));
    console.log('✅ Transaction seeding completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error seeding transactions:', error);
    throw error;
  }
}

// Run the seeding process
seedTransactions()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

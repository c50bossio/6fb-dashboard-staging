#!/usr/bin/env node

/**
 * Stripe Refund Utility
 * Easily refund test purchases made with live Stripe keys
 * 
 * Usage:
 *   node scripts/stripe-refund.js                    # Lists recent charges
 *   node scripts/stripe-refund.js <charge_id>        # Refunds specific charge
 *   node scripts/stripe-refund.js --last             # Refunds most recent charge
 *   node scripts/stripe-refund.js --email <email>    # Refunds all charges for email
 */

require('dotenv').config({ path: '.env.local' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function listRecentCharges(limit = 10) {
  console.log('📋 Fetching recent charges...\n');
  
  try {
    const charges = await stripe.charges.list({
      limit: limit,
    });
    
    if (charges.data.length === 0) {
      console.log('No charges found.');
      return [];
    }
    
    console.log('Recent charges:');
    console.log('================================================================================');
    charges.data.forEach((charge, index) => {
      const date = new Date(charge.created * 1000).toLocaleString();
      const amount = (charge.amount / 100).toFixed(2);
      const status = charge.refunded ? '✅ REFUNDED' : charge.status === 'succeeded' ? '💰 PAID' : charge.status;
      
      console.log(`${index + 1}. ${charge.id}`);
      console.log(`   Amount: $${amount} ${charge.currency.toUpperCase()}`);
      console.log(`   Email: ${charge.billing_details?.email || charge.receipt_email || 'N/A'}`);
      console.log(`   Date: ${date}`);
      console.log(`   Status: ${status}`);
      console.log(`   Description: ${charge.description || 'N/A'}`);
      if (charge.refunded) {
        console.log(`   ⚠️  Already refunded`);
      }
      console.log('--------------------------------------------------------------------------------');
    });
    
    return charges.data;
  } catch (error) {
    console.error('❌ Error fetching charges:', error.message);
    return [];
  }
}

async function refundCharge(chargeId) {
  console.log(`\n🔄 Processing refund for charge: ${chargeId}`);
  
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    
    if (charge.refunded) {
      console.log('⚠️  This charge has already been refunded.');
      return false;
    }
    
    if (charge.status !== 'succeeded') {
      console.log(`⚠️  Cannot refund charge with status: ${charge.status}`);
      return false;
    }
    
    const amount = (charge.amount / 100).toFixed(2);
    console.log(`💰 Refunding $${amount} to ${charge.billing_details?.email || charge.receipt_email || 'customer'}...`);
    
    const refund = await stripe.refunds.create({
      charge: chargeId,
      reason: 'requested_by_customer', // Can be: duplicate, fraudulent, or requested_by_customer
    });
    
    console.log('✅ Refund successful!');
    console.log(`   Refund ID: ${refund.id}`);
    console.log(`   Amount: $${(refund.amount / 100).toFixed(2)}`);
    console.log(`   Status: ${refund.status}`);
    
    return true;
  } catch (error) {
    console.error('❌ Refund failed:', error.message);
    return false;
  }
}

async function refundLastCharge() {
  const charges = await listRecentCharges(1);
  
  if (charges.length === 0) {
    console.log('No charges to refund.');
    return;
  }
  
  const lastCharge = charges[0];
  
  if (lastCharge.refunded) {
    console.log('\n⚠️  The most recent charge has already been refunded.');
    return;
  }
  
  console.log(`\n🎯 Refunding most recent charge: ${lastCharge.id}`);
  await refundCharge(lastCharge.id);
}

async function refundByEmail(email) {
  console.log(`\n🔍 Searching for charges from: ${email}\n`);
  
  try {
    const charges = await stripe.charges.search({
      query: `receipt_email:"${email}"`,
      limit: 100,
    });
    
    if (charges.data.length === 0) {
      console.log(`No charges found for email: ${email}`);
      return;
    }
    
    console.log(`Found ${charges.data.length} charge(s) for ${email}\n`);
    
    let refundCount = 0;
    for (const charge of charges.data) {
      if (!charge.refunded && charge.status === 'succeeded') {
        console.log(`Refunding charge ${charge.id}...`);
        const success = await refundCharge(charge.id);
        if (success) refundCount++;
      }
    }
    
    console.log(`\n✅ Refunded ${refundCount} charge(s) for ${email}`);
  } catch (error) {
    console.error('❌ Error searching charges:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  console.log('🏦 Stripe Refund Utility');
  console.log('========================\n');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
    process.exit(1);
  }
  
  const isLiveMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  console.log(`Mode: ${isLiveMode ? '⚠️  LIVE MODE (Real Money)' : '✅ TEST MODE'}\n`);
  
  if (args.length === 0) {
    await listRecentCharges();
    console.log('\nUsage:');
    console.log('  node scripts/stripe-refund.js <charge_id>        # Refund specific charge');
    console.log('  node scripts/stripe-refund.js --last             # Refund most recent charge');
    console.log('  node scripts/stripe-refund.js --email <email>    # Refund all charges for email');
  } else if (args[0] === '--last') {
    await refundLastCharge();
  } else if (args[0] === '--email' && args[1]) {
    await refundByEmail(args[1]);
  } else if (args[0].startsWith('ch_')) {
    await refundCharge(args[0]);
  } else {
    console.log('Invalid arguments.');
    console.log('\nUsage:');
    console.log('  node scripts/stripe-refund.js                    # List recent charges');
    console.log('  node scripts/stripe-refund.js <charge_id>        # Refund specific charge');
    console.log('  node scripts/stripe-refund.js --last             # Refund most recent charge');
    console.log('  node scripts/stripe-refund.js --email <email>    # Refund all charges for email');
  }
}

main().catch(error => {
  console.error('❌ Script error:', error.message);
  process.exit(1);
});
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

  try {
    const charges = await stripe.charges.list({
      limit: limit,
    });
    
    if (charges.data.length === 0) {
      
      return [];
    }

    charges.data.forEach((charge, index) => {
      const date = new Date(charge.created * 1000).toLocaleString();
      const amount = (charge.amount / 100).toFixed(2);
      const status = charge.refunded ? '✅ REFUNDED' : charge.status === 'succeeded' ? '💰 PAID' : charge.status;

      }`);

      if (charge.refunded) {
        
      }
      
    });
    
    return charges.data;
  } catch (error) {
    console.error('❌ Error fetching charges:', error.message);
    return [];
  }
}

async function refundCharge(chargeId) {

  try {
    const charge = await stripe.charges.retrieve(chargeId);
    
    if (charge.refunded) {
      
      return false;
    }
    
    if (charge.status !== 'succeeded') {
      
      return false;
    }
    
    const amount = (charge.amount / 100).toFixed(2);

    const refund = await stripe.refunds.create({
      charge: chargeId,
      reason: 'requested_by_customer', // Can be: duplicate, fraudulent, or requested_by_customer
    });

    .toFixed(2)}`);

    return true;
  } catch (error) {
    console.error('❌ Refund failed:', error.message);
    return false;
  }
}

async function refundLastCharge() {
  const charges = await listRecentCharges(1);
  
  if (charges.length === 0) {
    
    return;
  }
  
  const lastCharge = charges[0];
  
  if (lastCharge.refunded) {
    
    return;
  }

  await refundCharge(lastCharge.id);
}

async function refundByEmail(email) {

  try {
    const charges = await stripe.charges.search({
      query: `receipt_email:"${email}"`,
      limit: 100,
    });
    
    if (charges.data.length === 0) {
      
      return;
    }
    
     for ${email}\n`);
    
    let refundCount = 0;
    for (const charge of charges.data) {
      if (!charge.refunded && charge.status === 'succeeded') {
        
        const success = await refundCharge(charge.id);
        if (success) refundCount++;
      }
    }
    
     for ${email}`);
  } catch (error) {
    console.error('❌ Error searching charges:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
    process.exit(1);
  }
  
  const isLiveMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  ' : '✅ TEST MODE'}\n`);
  
  if (args.length === 0) {
    await listRecentCharges();

  } else if (args[0] === '--last') {
    await refundLastCharge();
  } else if (args[0] === '--email' && args[1]) {
    await refundByEmail(args[1]);
  } else if (args[0].startsWith('ch_')) {
    await refundCharge(args[0]);
  } else {

  }
}

main().catch(error => {
  console.error('❌ Script error:', error.message);
  process.exit(1);
});
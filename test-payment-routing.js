#!/usr/bin/env node

/**
 * Test Payment Routing to Barbershop Connect Accounts
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testPaymentRouting() {
  console.log('\n💳 Testing Payment Routing to Barbershops');
  console.log('==========================================\n');

  // Test scenarios
  const testCases = [
    {
      name: 'Payment with barbershop_id',
      payload: {
        booking_id: 'test_booking_1',
        barbershop_id: 'test_shop_1',
        service_id: 'haircut_001',
        amount: 50, // $50 haircut
        payment_type: 'full_payment'
      }
    },
    {
      name: 'Payment with barber_id only',
      payload: {
        booking_id: 'test_booking_2',
        barber_id: 'test_barber_1',
        service_id: 'beard_trim_001',
        amount: 25, // $25 beard trim
        payment_type: 'full_payment'
      }
    },
    {
      name: 'Payment without Connect account',
      payload: {
        booking_id: 'test_booking_3',
        service_id: 'premium_cut_001',
        amount: 75, // $75 premium service
        payment_type: 'full_payment'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('─'.repeat(40));
    
    try {
      const response = await fetch('http://localhost:9999/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.payload)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Payment intent created successfully!');
        console.log(`   Amount: $${testCase.payload.amount}`);
        console.log(`   Payment Intent ID: ${result.payment_intent_id}`);
        
        if (result.routing) {
          console.log('\n   💰 Payment Routing:');
          console.log(`   • Destination: ${result.routing.destination}`);
          console.log(`   • Platform Fee: $${result.routing.platform_fee}`);
          console.log(`   • Stripe Fee: $${result.routing.stripe_fee}`);
          console.log(`   • Barbershop Receives: $${result.routing.barbershop_receives}`);
          
          if (result.routing.destination === 'platform') {
            console.log('\n   ⚠️  Note: Payment goes to platform (barbershop needs Connect setup)');
          } else {
            console.log('\n   ✅ Payment will be routed to barbershop!');
          }
        }
      } else {
        console.log(`❌ Error: ${result.error}`);
        if (result.error.includes('not completed payment setup')) {
          console.log('   ℹ️  Barbershop needs to complete Stripe onboarding');
        }
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Payment Routing Summary:');
  console.log('='.repeat(50));
  console.log('\n✅ How it works:');
  console.log('1. Customer pays for service');
  console.log('2. System checks if barbershop has Connect account');
  console.log('3. If yes → Payment routes to barbershop (minus 2.9% + $0.30)');
  console.log('4. If no → Payment stays in platform (temporary)');
  console.log('\n💰 Revenue Model:');
  console.log('• Platform markup: 0% (zero markup strategy)');
  console.log('• Stripe fee: 2.9% + $0.30');
  console.log('• Barbershop receives: 97.1% - $0.30');
  
  console.log('\n📝 Next Steps:');
  console.log('1. Barbershops complete Stripe onboarding');
  console.log('2. Customers can pay directly');
  console.log('3. Barbershops receive automatic payouts');
  console.log('4. Everything branded as BookedBarber!\n');
}

// Run the test
testPaymentRouting();
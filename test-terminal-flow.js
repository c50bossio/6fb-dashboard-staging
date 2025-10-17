/**
 * Stripe Terminal Payment Flow Test Script
 * Tests the complete payment flow with simulated readers
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:9999';
const BARBERSHOP_ID = 'c5a58548-8f23-426c-bedc-49a83d238724'; // Tomb45 Channelside (demo account)

async function testTerminalFlow() {
  console.log('\n🧪 Testing Stripe Terminal Payment Flow with Simulated Readers\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Health Check - Verify TEST mode
    console.log('\n✓ Test 1: Verifying Stripe is in TEST mode...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const health = await healthResponse.json();

    if (health.services.stripe.test_mode === true) {
      console.log('  ✅ Stripe is in TEST mode');
      console.log(`  ℹ️  Status: ${health.services.stripe.status}`);
    } else {
      console.log('  ❌ ERROR: Stripe is in LIVE mode!');
      console.log('  ⚠️  This test requires TEST keys to use simulated readers');
      process.exit(1);
    }

    // Test 2: Connection Token
    console.log('\n✓ Test 2: Getting Stripe Terminal connection token...');
    const tokenResponse = await fetch(`${API_BASE}/api/stripe/terminal/connection-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barbershopId: BARBERSHOP_ID })
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      console.log('  ✅ Connection token received');
      console.log(`  ℹ️  Token: ${tokenData.secret.substring(0, 20)}...`);
    } else {
      const error = await tokenResponse.json();
      console.log(`  ❌ ERROR: ${tokenResponse.status} - ${error.error}`);
      console.log('\n📝 Troubleshooting:');
      console.log('  1. Make sure you\'re logged in as demo@barbershop.com');
      console.log('  2. Hard refresh your browser (Ctrl+Shift+R)');
      console.log('  3. Check browser console for authentication errors');
      process.exit(1);
    }

    // Test 3: Products API
    console.log('\n✓ Test 3: Fetching products for cart...');
    const productsResponse = await fetch(`${API_BASE}/api/shop/products?barbershop_id=${BARBERSHOP_ID}`);

    if (productsResponse.ok) {
      const products = await productsResponse.json();
      console.log(`  ✅ Found ${products.length} products`);
      if (products.length > 0) {
        console.log(`  ℹ️  Example: ${products[0].name} - $${products[0].price}`);
      }
    } else {
      const error = await productsResponse.json();
      console.log(`  ⚠️  Warning: ${productsResponse.status} - ${error.error}`);
      console.log('  Note: This may be due to authentication - test in browser instead');
    }

    // Test 4: Payment Intent Creation (simulated)
    console.log('\n✓ Test 4: Simulating payment intent creation...');
    const cartItems = [{
      id: 'test-product-1',
      name: 'Test Product',
      price: 25.00,
      quantity: 1,
      current_stock: 10
    }];

    const subtotal = 25.00;
    const processingFee = (subtotal * 0.029) + 0.30; // 2.9% + 30¢
    const totalAmount = subtotal + processingFee;

    console.log(`  ℹ️  Cart: ${cartItems[0].name} × 1`);
    console.log(`  ℹ️  Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`  ℹ️  Processing Fee: $${processingFee.toFixed(2)} (2.9% + 30¢)`);
    console.log(`  ℹ️  Total: $${totalAmount.toFixed(2)}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ API Tests Complete!\n');

    console.log('📋 Next Steps - Manual Testing in Browser:');
    console.log('─'.repeat(60));
    console.log('1. Open browser to: http://localhost:9999/dashboard/pos');
    console.log('2. Hard refresh (Ctrl+Shift+R) to clear cached 403 errors');
    console.log('3. Add products to cart');
    console.log('4. Click "Collect Payment" → Select "Terminal"');
    console.log('5. Terminal modal should appear with "Discovering readers..."');
    console.log('6. Simulated reader should appear automatically:');
    console.log('   - Name: BBPOS WisePOS E (or similar)');
    console.log('   - Serial: SIMULATED-xxxxx');
    console.log('   - Status: Available → Connected');
    console.log('7. Click "Process Payment" button');
    console.log('8. Payment should succeed instantly (simulated card tap)');
    console.log('9. Cart clears and toast notification appears');
    console.log('10. Check Stripe Test Dashboard for payment record\n');

    console.log('🔗 Useful Links:');
    console.log('─'.repeat(60));
    console.log('• POS Page: http://localhost:9999/dashboard/pos');
    console.log('• Stripe Test Dashboard: https://dashboard.stripe.com/test/payments');
    console.log('• Backend Logs: Check terminal running ./dev-start.sh');
    console.log('• Browser Console: Press F12 to view real-time logs\n');

    console.log('💡 Troubleshooting:');
    console.log('─'.repeat(60));
    console.log('• No reader found: Check browser console for errors');
    console.log('• 403 errors: Hard refresh browser (Ctrl+Shift+R)');
    console.log('• Payment fails: Check terminal logs for Stripe errors');
    console.log('• Modal won\'t open: Check that you\'re logged in correctly\n');

  } catch (error) {
    console.error('\n❌ Test script error:', error.message);
    console.error('Make sure dev servers are running: ./dev-start.sh\n');
    process.exit(1);
  }
}

// Run tests
testTerminalFlow();

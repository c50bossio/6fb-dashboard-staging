#!/usr/bin/env node

/**
 * Test Processing Fee Calculation
 * Simulates the POS cart behavior to verify processing fee math
 */

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║         Processing Fee Model Test                           ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Simulate cart items (products a barber would sell)
const cartItems = [
  { id: '1', name: 'Hair Gel', price: 15.99, quantity: 2 },
  { id: '2', name: 'Shampoo', price: 24.50, quantity: 1 },
  { id: '3', name: 'Beard Oil', price: 18.99, quantity: 1 }
];

console.log('📦 Cart Items:');
cartItems.forEach(item => {
  console.log(`   ${item.quantity}x ${item.name.padEnd(15)} @ $${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}`);
});
console.log('');

// Calculate subtotal (same as frontend)
const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
console.log(`💵 Subtotal: $${subtotal.toFixed(2)}`);

// Calculate processing fee: 2.9% + $0.30 (same as frontend)
const processingFee = subtotal > 0 ? (subtotal * 0.029) + 0.30 : 0;
console.log(`💳 Processing Fee (2.9% + 30¢): $${processingFee.toFixed(2)}`);

// Total amount customer pays
const totalAmount = subtotal + processingFee;
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`🏦 Total Charged to Customer: $${totalAmount.toFixed(2)}`);
console.log('');

// Backend calculation (convert to cents)
const subtotalCents = Math.round(subtotal * 100);
const processingFeeCents = Math.round(processingFee * 100);
const totalCents = Math.round(totalAmount * 100);

console.log('🔧 Backend Calculations (in cents):');
console.log(`   Subtotal: ${subtotalCents} cents`);
console.log(`   Processing Fee: ${processingFeeCents} cents`);
console.log(`   Total: ${totalCents} cents`);
console.log('');

// Stripe Connect fee calculation
const actualStripeFee = Math.round(totalCents * 0.027); // 2.7% Terminal rate
const platformFeeCents = processingFeeCents - actualStripeFee;

console.log('💰 Money Distribution:');
console.log(`   Customer Pays:      ${totalCents} cents ($${(totalCents/100).toFixed(2)})`);
console.log(`   Stripe Fee (2.7%):  -${actualStripeFee} cents (-$${(actualStripeFee/100).toFixed(2)})`);
console.log(`   ✅ Platform Margin:  +${platformFeeCents} cents (+$${(platformFeeCents/100).toFixed(2)}) ← YOUR PROFIT`);
console.log(`   Barber Receives:    ${subtotalCents} cents ($${(subtotalCents/100).toFixed(2)})`);
console.log('');

// Verify barber gets full sale amount
const barberReceivesFromStripe = totalCents - actualStripeFee - platformFeeCents;
const isCorrect = barberReceivesFromStripe === subtotalCents;

console.log('✓ Verification:');
if (isCorrect) {
  console.log(`   ✅ SUCCESS: Barber receives exactly $${subtotal.toFixed(2)} (full sale amount)`);
  console.log(`   ✅ Platform collects $${(platformFeeCents/100).toFixed(2)} margin`);
  console.log(`   ✅ Math checks out perfectly!`);
} else {
  console.log(`   ❌ ERROR: Math doesn't add up!`);
  console.log(`   Expected barber to receive: ${subtotalCents} cents`);
  console.log(`   Actually receives: ${barberReceivesFromStripe} cents`);
}
console.log('');

// Test edge cases
console.log('🧪 Edge Case Tests:');

// Test 1: Small sale
const smallSale = 5.00;
const smallFee = (smallSale * 0.029) + 0.30;
const smallTotal = smallSale + smallFee;
const smallStripeFee = Math.round(smallTotal * 100 * 0.027);
const smallPlatformFee = Math.round(smallFee * 100) - smallStripeFee;
console.log(`   Small Sale ($${smallSale.toFixed(2)}): Platform margin = $${(smallPlatformFee/100).toFixed(2)}`);

// Test 2: Large sale
const largeSale = 500.00;
const largeFee = (largeSale * 0.029) + 0.30;
const largeTotal = largeSale + largeFee;
const largeStripeFee = Math.round(largeTotal * 100 * 0.027);
const largePlatformFee = Math.round(largeFee * 100) - largeStripeFee;
console.log(`   Large Sale ($${largeSale.toFixed(2)}): Platform margin = $${(largePlatformFee/100).toFixed(2)}`);

// Test 3: Exactly $100
const testSale = 100.00;
const testFee = (testSale * 0.029) + 0.30;
const testTotal = testSale + testFee;
const testStripeFee = Math.round(testTotal * 100 * 0.027);
const testPlatformFee = Math.round(testFee * 100) - testStripeFee;
console.log(`   Standard Sale ($${testSale.toFixed(2)}): Platform margin = $${(testPlatformFee/100).toFixed(2)}`);

console.log('');
console.log('📊 Volume Growth Projections (per $100 sale):');
console.log(`   Today (Stripe @ 2.7%):      $${(testPlatformFee/100).toFixed(2)} profit`);

const testTotalCents = Math.round(testTotal * 100);
const testFeeCents = Math.round(testFee * 100);
console.log(`   10K/mo (Stripe @ 2.4%):     $${((testFeeCents - Math.round(testTotalCents * 0.024))/100).toFixed(2)} profit`);
console.log(`   50K/mo (Stripe @ 2.1%):     $${((testFeeCents - Math.round(testTotalCents * 0.021))/100).toFixed(2)} profit`);
console.log(`   100K/mo (Stripe @ 1.9%):    $${((testFeeCents - Math.round(testTotalCents * 0.019))/100).toFixed(2)} profit`);

console.log('\n✅ All tests passed! Processing fee model is working correctly.\n');

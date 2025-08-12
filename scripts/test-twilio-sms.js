#!/usr/bin/env node
/**
 * Test Twilio SMS integration
 */

require('dotenv').config({ path: '.env.local' });

async function testTwilioSMS() {
  console.log('📱 Testing Twilio SMS Integration...\n');
  
  // Check if Twilio credentials are configured
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  
  console.log('Configuration:');
  console.log('  Account SID:', accountSid ? `${accountSid.substring(0, 10)}...` : 'NOT SET');
  console.log('  Auth Token:', authToken ? '***configured***' : 'NOT SET');
  console.log('  From Number:', fromNumber || 'NOT SET');
  console.log('');
  
  if (!accountSid || !authToken || !fromNumber) {
    console.error('❌ Twilio credentials not properly configured');
    return;
  }
  
  try {
    // Initialize Twilio client
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    
    console.log('✅ Twilio client initialized\n');
    
    // Test sending an SMS
    const testMessage = {
      body: 'Test from 6FB AI Agent System - Your authentication code is: 123456',
      from: fromNumber,
      to: '+15551234567' // Test number (won't actually send)
    };
    
    console.log('📤 Attempting to send test SMS:');
    console.log('  From:', testMessage.from);
    console.log('  To:', testMessage.to);
    console.log('  Message:', testMessage.body);
    console.log('');
    
    // Try to validate the phone number format
    const message = await client.messages.create(testMessage);
    
    console.log('✅ SMS sent successfully!');
    console.log('  Message SID:', message.sid);
    console.log('  Status:', message.status);
    console.log('  Date Created:', message.dateCreated);
    
  } catch (error) {
    console.error('❌ SMS Error:', error.message);
    
    // Check for common errors
    if (error.message.includes('authenticate')) {
      console.log('\n⚠️  Invalid Twilio credentials');
    } else if (error.message.includes('not a valid phone number')) {
      console.log('\n⚠️  Invalid phone number format');
    } else if (error.message.includes('not verified')) {
      console.log('\n⚠️  Phone number not verified in Twilio');
    }
    
    console.log('\n💡 To test with a real number:');
    console.log('  1. Verify the recipient number in Twilio Console');
    console.log('  2. Or upgrade Twilio account from trial');
  }
}

// Check if twilio package is installed
try {
  require('twilio');
  testTwilioSMS();
} catch (error) {
  console.log('📦 Installing Twilio package...');
  const { execSync } = require('child_process');
  execSync('npm install twilio', { stdio: 'inherit' });
  console.log('\n✅ Twilio package installed. Running test...\n');
  testTwilioSMS();
}
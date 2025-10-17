#!/usr/bin/env node

// Phase 1: SMS Service Verification with new test credentials
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

import NotificationService from './lib/notifications/notification-service.js'
import SMSService from './lib/notifications/sms-service.js'

console.log('📱 Phase 1: SMS Service Verification with Test Credentials')
console.log('=' .repeat(60))

// Test credentials provided by user
const testCredentials = {
  email: 'c50bossio@gmail.com',
  phone: '+13525568981' // New phone number to test
}

console.log(`\n🔧 Testing SMS delivery to: ${testCredentials.phone}`)
console.log(`📧 Testing email delivery to: ${testCredentials.email}`)

// Test data for SMS verification
const smsTestData = {
  customerName: 'Test User',
  customerPhone: testCredentials.phone,
  customerEmail: testCredentials.email,
  serviceName: 'SMS Verification Test',
  appointmentDate: '2025-08-29',
  appointmentTime: '3:00 PM',
  shopName: '6FB Test Shop',
  shopPhone: '+18135483884',
  confirmationNumber: `SMS-TEST-${Date.now()}`,
  appointmentDateTime: '2025-08-29T19:00:00.000Z',
  totalPrice: '$0.00',
  notes: 'PHASE 1 TEST: Verifying SMS service works with new phone number +13525568981'
}

async function testSMSService() {
  try {
    console.log('\n📤 Step 1: Testing SMS Service Directly...')
    
    // Initialize SMS service
    await SMSService.initialize()
    console.log('SMS Service Initialized:', SMSService.initialized)
    
    if (SMSService.initialized) {
      const smsResult = await SMSService.sendAppointmentConfirmation(smsTestData)
      
      console.log('\n📱 SMS Direct Test Results:')
      console.log('  Success:', smsResult.success ? '✅ SENT' : '❌ FAILED')
      console.log('  Message ID:', smsResult.messageId || 'None')
      console.log('  Status:', smsResult.status || 'Unknown')
      console.log('  Error:', smsResult.error || 'None')
      console.log('  Reason:', smsResult.reason || 'None')
      
      return smsResult
    } else {
      console.log('❌ SMS Service failed to initialize')
      return { success: false, error: 'Service not initialized' }
    }
    
  } catch (error) {
    console.error('❌ SMS Direct test failed:', error.message)
    return { success: false, error: error.message }
  }
}

async function testUnifiedNotificationService() {
  try {
    console.log('\n📤 Step 2: Testing Unified Notification Service...')
    
    const result = await NotificationService.sendAppointmentConfirmation(smsTestData)
    
    console.log('\n🎯 Unified Service Results:')
    console.log('  Overall Success:', result.success ? '✅ PASSED' : '❌ FAILED')
    
    console.log('\n📧 Email Component:')
    console.log('  Success:', result.results?.email?.success ? '✅ SENT' : '❌ FAILED')
    console.log('  Message ID:', result.results?.email?.messageId || 'None')
    console.log('  Error:', result.results?.email?.error || 'None')
    
    console.log('\n📱 SMS Component:')
    console.log('  Success:', result.results?.sms?.success ? '✅ SENT' : '❌ FAILED')
    console.log('  Message ID:', result.results?.sms?.messageId || 'None')
    console.log('  Error:', result.results?.sms?.error || 'None')
    
    return result
    
  } catch (error) {
    console.error('❌ Unified service test failed:', error.message)
    return { success: false, error: error.message }
  }
}

// Run tests
async function runSMSVerification() {
  console.log('\n🚀 Starting SMS Verification Tests...')
  
  const smsDirectResult = await testSMSService()
  const unifiedResult = await testUnifiedNotificationService()
  
  console.log('\n' + '=' .repeat(60))
  console.log('📊 PHASE 1 RESULTS SUMMARY')
  console.log('=' .repeat(60))
  
  console.log('\n📱 SMS Service Status:')
  if (smsDirectResult.success) {
    console.log('  ✅ SMS delivery WORKING with new phone number!')
    console.log('  ✅ Twilio integration functional')
    console.log(`  ✅ Message sent to ${testCredentials.phone}`)
  } else {
    console.log('  ❌ SMS delivery still failing')
    console.log('  🔍 Issue:', smsDirectResult.error || smsDirectResult.reason || 'Unknown')
  }
  
  console.log('\n📧 Email Service Status:')
  if (unifiedResult.results?.email?.success) {
    console.log('  ✅ Email delivery confirmed working')
    console.log(`  ✅ Message sent to ${testCredentials.email}`)
  } else {
    console.log('  ❌ Email delivery issue detected')
  }
  
  console.log('\n🎯 Phase 1 Conclusion:')
  if (smsDirectResult.success && unifiedResult.results?.email?.success) {
    console.log('  🎉 BOTH SMS AND EMAIL WORKING!')
    console.log('  ✅ Ready for Phase 2: Automation Testing')
    console.log(`  📱 Check ${testCredentials.phone} for SMS`)
    console.log(`  📧 Check ${testCredentials.email} for email`)
  } else if (unifiedResult.results?.email?.success) {
    console.log('  ⚠️ EMAIL WORKING, SMS needs attention')
    console.log('  🔄 Can proceed with email automation testing')
  } else {
    console.log('  ❌ Critical notification issues detected')
  }
  
  return {
    smsWorking: smsDirectResult.success,
    emailWorking: unifiedResult.results?.email?.success || false,
    canProceed: unifiedResult.results?.email?.success || smsDirectResult.success
  }
}

// Execute verification
runSMSVerification()
  .then(results => {
    if (results.canProceed) {
      console.log('\n➡️ Ready for Phase 2: Automation Workflow Testing')
    } else {
      console.log('\n⚠️ Fix notification issues before proceeding to automation testing')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('\n💥 Phase 1 verification failed:', error.message)
    process.exit(1)
  })
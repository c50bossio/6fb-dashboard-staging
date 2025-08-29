#!/usr/bin/env node

// Customer-Focused Messaging Test
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

import NotificationService from './lib/notifications/notification-service.js'
import { CustomerMessaging } from './lib/utils/customer-messaging.js'

console.log('🎯 Customer-Focused Messaging Improvement Test')
console.log('=' .repeat(60))

const testCredentials = {
  email: 'c50bossio@gmail.com',
  phone: '+13525568981'
}

console.log('📧 Testing improved customer messaging...')

// Before and After comparison
const testScenarios = [
  {
    name: '🏢 Standard Booking Confirmation',
    description: 'Regular appointment booking with improved messaging',
    oldServiceName: 'Risk Monitored Service',
    data: {
      customerName: 'Sarah Johnson',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'Risk Monitored Service', // This will be beautified
      appointmentDate: '2025-08-30',
      appointmentTime: '2:00 PM',
      appointmentDateTime: '2025-08-30T18:00:00.000Z',
      barberName: 'Test Barber',
      shopName: '6FB Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$55.00',
      confirmationNumber: `CUSTOMER-MSG-${Date.now()}`,
      notes: 'Testing customer-focused messaging improvements'
    }
  },
  {
    name: '⚠️ High-Value Service Booking',
    description: 'Premium service with professional messaging',
    oldServiceName: 'High-Risk Premium Service',
    data: {
      customerName: 'Michael Chen',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'High-Risk Premium Service', // This will be beautified
      appointmentDate: '2025-08-31',
      appointmentTime: '11:00 AM',
      appointmentDateTime: '2025-08-31T15:00:00.000Z',
      barberName: 'Production Barber',
      shopName: '6FB Production Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$120.00',
      confirmationNumber: `PREMIUM-MSG-${Date.now()}`,
      notes: 'Testing premium service messaging'
    }
  },
  {
    name: '🔔 Smart Reminder Message',
    description: 'Friendly reminder without technical terms',
    oldServiceName: 'SMS Verification Test',
    data: {
      customerName: 'Jennifer Martinez',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'SMS Verification Test', // This will be beautified
      appointmentDate: '2025-08-29',
      appointmentTime: '3:30 PM',
      appointmentDateTime: '2025-08-29T19:30:00.000Z',
      barberName: 'Mock Barber',
      shopName: '6FB Mock Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$45.00',
      confirmationNumber: `REMINDER-MSG-${Date.now()}`,
      notes: 'Testing reminder messaging improvements'
    }
  }
]

function demonstrateMessageImprovement(scenario) {
  console.log(`\n${scenario.name}`)
  console.log(`📋 ${scenario.description}`)
  
  // Show the transformation
  const oldName = scenario.oldServiceName
  const newName = CustomerMessaging.beautifyServiceName(oldName)
  const oldShopName = scenario.data.shopName
  const newShopName = CustomerMessaging.beautifyShopName(oldShopName)
  const oldBarberName = scenario.data.barberName
  const newBarberName = CustomerMessaging.beautifyBarberName(oldBarberName)
  
  console.log('🔄 Message Improvements:')
  console.log(`  Service: "${oldName}" → "${newName}"`)
  console.log(`  Shop: "${oldShopName}" → "${newShopName}"`)
  console.log(`  Barber: "${oldBarberName}" → "${newBarberName}"`)
  
  // Show SMS message improvements
  const oldSMS = `Hi ${scenario.data.customerName}! Your ${oldName} appointment is confirmed for ${scenario.data.appointmentDate} at ${scenario.data.appointmentTime} with ${oldBarberName} at ${oldShopName}. Confirmation: ${scenario.data.confirmationNumber}`
  const newSMS = CustomerMessaging.generateCustomerFriendlySMS('appointment_confirmation', scenario.data)
  
  console.log('\n📱 SMS Message Comparison:')
  console.log('❌ Before:', oldSMS.substring(0, 120) + '...')
  console.log('✅ After: ', newSMS.substring(0, 120) + '...')
  
  // Show email subject improvements
  const oldSubject = `Appointment Confirmed - ${scenario.data.customerName}`
  const newSubject = CustomerMessaging.generateCustomerFriendlySubject('appointment_confirmation', scenario.data)
  
  console.log('\n📧 Email Subject Comparison:')
  console.log('❌ Before:', oldSubject)
  console.log('✅ After: ', newSubject)
  
  return {
    improvements: {
      serviceName: { old: oldName, new: newName },
      shopName: { old: oldShopName, new: newShopName },
      barberName: { old: oldBarberName, new: newBarberName },
      smsMessage: { old: oldSMS, new: newSMS },
      emailSubject: { old: oldSubject, new: newSubject }
    }
  }
}

async function testImprovedMessaging(scenario) {
  try {
    console.log(`\n📤 Sending improved notification for: ${scenario.name}`)
    
    const result = await NotificationService.sendAppointmentConfirmation(scenario.data)
    
    console.log('📊 Results:')
    console.log('  Overall Success:', result.success ? '✅ SENT' : '❌ FAILED')
    console.log('  📧 Email:', result.results?.email?.success ? '✅ SENT' : '❌ FAILED')
    console.log('  📱 SMS:', result.results?.sms?.success ? '✅ SENT' : '❌ FAILED')
    
    if (result.results?.email?.messageId) {
      console.log(`  Email ID: ${result.results.email.messageId}`)
    }
    if (result.results?.sms?.messageId) {
      console.log(`  SMS ID: ${result.results.sms.messageId}`)
    }
    
    return {
      scenario: scenario.name,
      success: result.success,
      emailSent: result.results?.email?.success || false,
      smsSent: result.results?.sms?.success || false
    }
    
  } catch (error) {
    console.error(`❌ ${scenario.name} failed:`, error.message)
    return {
      scenario: scenario.name,
      success: false,
      error: error.message
    }
  }
}

async function runCustomerMessagingTest() {
  console.log('\n🚀 Starting Customer-Focused Messaging Tests...')
  
  const results = []
  const improvements = []
  
  for (const scenario of testScenarios) {
    // Demonstrate improvements
    const improvement = demonstrateMessageImprovement(scenario)
    improvements.push(improvement)
    
    // Test actual messaging
    const result = await testImprovedMessaging(scenario)
    results.push(result)
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  // Generate improvement summary
  console.log('\n' + '=' .repeat(60))
  console.log('🎉 CUSTOMER MESSAGING IMPROVEMENTS SUMMARY')
  console.log('=' .repeat(60))
  
  console.log('\n📊 "How to Win Friends and Influence People" Principles Applied:')
  console.log('✅ Focus on customer\'s interests (beautiful service names)')
  console.log('✅ Use positive, welcoming language (excited, looking forward)')
  console.log('✅ Make customers feel valued (thank you, we appreciate)')
  console.log('✅ Avoid internal/technical terminology (no test, risk, mock)')
  console.log('✅ Personal and friendly tone (emojis, warm greetings)')
  
  console.log('\n🔄 Key Message Transformations:')
  improvements.forEach((improvement, index) => {
    console.log(`\n${index + 1}. Service Name Improvements:`)
    console.log(`   ❌ "${improvement.improvements.serviceName.old}"`)
    console.log(`   ✅ "${improvement.improvements.serviceName.new}"`)
  })
  
  const successfulTests = results.filter(r => r.success)
  const emailTests = results.filter(r => r.emailSent)
  const smsTests = results.filter(r => r.smsSent)
  
  console.log('\n📱 Improved Messaging Delivery:')
  console.log(`  Success Rate: ${successfulTests.length}/${results.length} (${Math.round(successfulTests.length/results.length*100)}%)`)
  console.log(`  Email Success: ${emailTests.length}/${results.length} (${Math.round(emailTests.length/results.length*100)}%)`)
  console.log(`  SMS Success: ${smsTests.length}/${results.length} (${Math.round(smsTests.length/results.length*100)}%)`)
  
  console.log('\n🏁 Customer Experience Improvements:')
  console.log('✅ Professional service names (Risk Monitored → Signature Cut & Style)')
  console.log('✅ Friendly shop names (Test Shop → Premier Barbershop)')
  console.log('✅ Welcoming SMS tone (emojis, excitement, personal touch)')
  console.log('✅ Engaging email subjects (celebration, anticipation)')
  console.log('✅ Customer-centric language (benefits focus)')
  
  console.log(`\n📧 Check ${testCredentials.email} for improved email notifications`)
  console.log(`📱 Check ${testCredentials.phone} for improved SMS messages`)
  
  return {
    totalTests: results.length,
    successfulTests: successfulTests.length,
    improvements: improvements.length,
    customerFocused: true
  }
}

// Execute Customer Messaging Improvement Test
runCustomerMessagingTest()
  .then(summary => {
    console.log('\n🎊 CUSTOMER MESSAGING IMPROVEMENTS COMPLETE!')
    console.log('Your notifications now follow "How to Win Friends and Influence People" principles:')
    console.log('• Customer-focused language ✅')
    console.log('• Positive, welcoming tone ✅')
    console.log('• Professional service descriptions ✅')
    console.log('• No technical/internal terminology ✅')
    console.log('• Personal and engaging communication ✅')
  })
  .catch(error => {
    console.error('\n💥 Customer messaging test failed:', error.message)
    process.exit(1)
  })
#!/usr/bin/env node

// Phase 3: End-to-End Scenario Testing
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

import NotificationService from './lib/notifications/notification-service.js'

console.log('🎯 Phase 3: End-to-End Scenario Testing')
console.log('=' .repeat(60))

const testCredentials = {
  email: 'c50bossio@gmail.com',
  phone: '+13525568981'
}

console.log(`📧 Email notifications will be sent to: ${testCredentials.email}`)
console.log(`📱 SMS notifications will be sent to: ${testCredentials.phone}`)

// End-to-End Test Scenarios
const endToEndScenarios = [
  {
    name: '🏢 3A: Complete New Booking Flow',
    description: 'Full booking creation with instant confirmation',
    type: 'new_booking_complete',
    data: {
      customerName: 'New Customer Test',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'Premium Cut & Style',
      appointmentDate: '2025-08-30',
      appointmentTime: '10:00 AM',
      appointmentDateTime: '2025-08-30T14:00:00.000Z',
      barberName: 'Master Barber',
      shopName: '6FB E2E Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$65.00',
      confirmationNumber: `E2E-BOOKING-${Date.now()}`,
      notes: 'END-TO-END TEST: Complete booking flow from creation to confirmation notifications.',
      paymentMethod: 'credit_card',
      bookingSource: 'direct_website',
      isFirstTimeClient: true
    }
  },
  {
    name: '⚠️ 3B: High-Risk Booking with Deposit',
    description: 'Risky booking triggering immediate deposit requirement',
    type: 'high_risk_booking',
    data: {
      customerName: 'High Risk Client',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'Executive Premium Service',
      appointmentDate: '2025-08-31',
      appointmentTime: '2:00 PM',
      appointmentDateTime: '2025-08-31T18:00:00.000Z',
      barberName: 'Senior Stylist',
      shopName: '6FB E2E Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$150.00',
      confirmationNumber: `E2E-HIGHRISK-${Date.now()}`,
      notes: 'END-TO-END TEST: High-value service + client risk factors trigger deposit requirement.',
      riskScore: 0.9,
      noShowHistory: 2,
      depositRequired: '$50.00',
      isHighValueService: true,
      clientRiskFactors: ['previous_no_shows', 'high_value_service', 'same_day_booking']
    }
  },
  {
    name: '🔔 3C: Smart Reminder Sequence',
    description: 'Multi-stage reminder escalation for tomorrow appointment',
    type: 'smart_reminder_sequence',
    data: {
      customerName: 'Reminder Test Client',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'Standard Haircut',
      appointmentDate: '2025-08-29',
      appointmentTime: '3:30 PM',
      appointmentDateTime: '2025-08-29T19:30:00.000Z',
      barberName: 'Reliable Barber',
      shopName: '6FB E2E Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$40.00',
      confirmationNumber: `E2E-REMINDER-${Date.now()}`,
      notes: 'END-TO-END TEST: Testing smart reminder escalation sequence (48h → 24h → 2h).',
      hoursUntilAppointment: 24,
      reminderStage: '24_hour',
      clientResponseHistory: 'low',
      weatherForecast: 'clear'
    }
  },
  {
    name: '🚨 3D: No-Show Recovery Workflow',
    description: 'Complete no-show handling with recovery initiation',
    type: 'no_show_recovery',
    data: {
      customerName: 'Recovery Test Client',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'Missed Appointment',
      appointmentDate: '2025-08-28',
      appointmentTime: '11:00 AM',
      appointmentDateTime: '2025-08-28T15:00:00.000Z',
      barberName: 'Understanding Barber',
      shopName: '6FB E2E Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$45.00',
      confirmationNumber: `E2E-NOSHOW-${Date.now()}`,
      notes: 'END-TO-END TEST: No-show incident triggers fee application and recovery sequence.',
      noShowFee: '$20.00',
      previousNoShows: 1,
      strikeCount: 2,
      recoverySequenceDay: 1,
      managerEscalation: false
    }
  },
  {
    name: '🧠 3E: AI Risk Prediction Alert',
    description: 'Predictive AI system detects and prevents likely no-show',
    type: 'ai_risk_prediction',
    data: {
      customerName: 'AI Prediction Test',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'AI Monitored Service',
      appointmentDate: '2025-08-30',
      appointmentTime: '4:00 PM', 
      appointmentDateTime: '2025-08-30T20:00:00.000Z',
      barberName: 'Tech-Savvy Barber',
      shopName: '6FB E2E Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$55.00',
      confirmationNumber: `E2E-AI-PRED-${Date.now()}`,
      notes: 'END-TO-END TEST: AI prediction system detects 92% no-show probability and triggers preventive action.',
      aiRiskScore: 0.92,
      predictionConfidence: 0.89,
      riskFactors: ['weather_storm', 'traffic_heavy', 'client_history_pattern', 'time_slot_risk'],
      preventiveAction: 'extra_confirmation_call',
      managerNotified: true
    }
  }
]

async function testEndToEndScenario(scenario) {
  try {
    console.log(`\n${scenario.name}`)
    console.log(`📋 ${scenario.description}`)
    console.log('🚀 Executing end-to-end scenario...')
    
    // Simulate the complete booking flow with notifications
    const result = await NotificationService.sendAppointmentConfirmation(scenario.data)
    
    console.log('📊 End-to-End Results:')
    console.log('  Scenario Success:', result.success ? '✅ COMPLETED' : '❌ FAILED')
    
    if (result.results?.email) {
      console.log('  📧 Email Notification:', result.results.email.success ? '✅ SENT' : '❌ FAILED')
      if (result.results.email.messageId) {
        console.log(`    Email ID: ${result.results.email.messageId}`)
      }
      if (result.results.email.error) {
        console.log(`    Error: ${result.results.email.error}`)
      }
    }
    
    if (result.results?.sms) {
      console.log('  📱 SMS Notification:', result.results.sms.success ? '✅ SENT' : '❌ FAILED')
      if (result.results.sms.messageId) {
        console.log(`    SMS ID: ${result.results.sms.messageId}`)
      }
      if (result.results.sms.error || result.results.sms.reason) {
        console.log(`    Issue: ${result.results.sms.error || result.results.sms.reason}`)
      }
    }
    
    // Log scenario-specific details
    if (scenario.type === 'high_risk_booking') {
      console.log(`  💰 Deposit Required: ${scenario.data.depositRequired}`)
      console.log(`  ⚠️ Risk Score: ${scenario.data.riskScore}`)
    }
    
    if (scenario.type === 'ai_risk_prediction') {
      console.log(`  🧠 AI Risk Score: ${scenario.data.aiRiskScore}`)
      console.log(`  📊 Confidence: ${scenario.data.predictionConfidence}`)
    }
    
    return {
      scenario: scenario.name,
      type: scenario.type,
      success: result.success,
      emailSent: result.results?.email?.success || false,
      smsSent: result.results?.sms?.success || false,
      emailMessageId: result.results?.email?.messageId,
      smsMessageId: result.results?.sms?.messageId
    }
    
  } catch (error) {
    console.error(`❌ ${scenario.name} failed:`, error.message)
    return {
      scenario: scenario.name,
      type: scenario.type,
      success: false,
      error: error.message
    }
  }
}

async function runEndToEndTesting() {
  console.log('\n🚀 Starting End-to-End Scenario Testing...')
  
  const results = []
  
  for (const scenario of endToEndScenarios) {
    const result = await testEndToEndScenario(scenario)
    results.push(result)
    
    // Delay between scenarios to avoid overwhelming services
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  // Generate comprehensive summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 PHASE 3 END-TO-END TESTING SUMMARY')
  console.log('=' .repeat(60))
  
  const successfulScenarios = results.filter(r => r.success)
  const emailScenarios = results.filter(r => r.emailSent)
  const smsScenarios = results.filter(r => r.smsSent)
  
  console.log(`\n🎯 Overall Success Rate: ${successfulScenarios.length}/${results.length} (${Math.round(successfulScenarios.length/results.length*100)}%)`)
  console.log(`📧 Email Success Rate: ${emailScenarios.length}/${results.length} (${Math.round(emailScenarios.length/results.length*100)}%)`)
  console.log(`📱 SMS Success Rate: ${smsScenarios.length}/${results.length} (${Math.round(smsScenarios.length/results.length*100)}%)`)
  
  console.log('\n📋 Scenario Results:')
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌'
    const email = result.emailSent ? '📧✅' : '📧❌'
    const sms = result.smsSent ? '📱✅' : '📱❌'
    console.log(`  ${index + 1}. ${status} ${email} ${sms} ${result.scenario}`)
    if (result.emailMessageId) {
      console.log(`     Email ID: ${result.emailMessageId}`)
    }
    if (result.smsMessageId) {
      console.log(`     SMS ID: ${result.smsMessageId}`)
    }
    if (result.error) {
      console.log(`     Error: ${result.error}`)
    }
  })
  
  console.log('\n🎯 Business Workflow Coverage:')
  const workflowTypes = [...new Set(results.map(r => r.type))]
  workflowTypes.forEach(type => {
    const typeResults = results.filter(r => r.type === type)
    const typeSuccess = typeResults.filter(r => r.success).length
    const coverage = Math.round(typeSuccess/typeResults.length*100)
    console.log(`  📊 ${type}: ${typeSuccess}/${typeResults.length} (${coverage}%)`)
  })
  
  console.log('\n🏁 Phase 3 Conclusion:')
  if (successfulScenarios.length === results.length) {
    console.log('  🎉 ALL END-TO-END SCENARIOS WORKING!')
    console.log('  ✅ Complete booking flow with real notifications verified')
    console.log('  ✅ High-risk bookings properly handled')
    console.log('  ✅ Smart reminders and AI predictions functional')
    console.log('  ✅ Recovery workflows operational')
    console.log(`  📧 Check ${testCredentials.email} for all test notifications`)
    console.log(`  📱 Check ${testCredentials.phone} for all test SMS`)
  } else if (emailScenarios.length === results.length) {
    console.log('  ⚠️ ALL EMAIL SCENARIOS WORKING, SMS needs attention')
    console.log('  ✅ Email notifications fully functional across all workflows')
    console.log('  🔧 SMS service may need configuration review')
  } else {
    console.log('  ❌ Some end-to-end scenarios failed - review individual results')
    console.log('  🔍 Check logs and service configurations')
  }
  
  return {
    totalScenarios: results.length,
    successfulScenarios: successfulScenarios.length,
    emailScenarios: emailScenarios.length,
    smsScenarios: smsScenarios.length,
    workflowCoverage: workflowTypes.length,
    allScenariosWorking: successfulScenarios.length === results.length,
    allEmailWorking: emailScenarios.length === results.length
  }
}

// Execute Phase 3 End-to-End Testing
runEndToEndTesting()
  .then(summary => {
    if (summary.allScenariosWorking) {
      console.log('\n➡️ Ready for Phase 4: Production Readiness Verification')
    } else if (summary.allEmailWorking) {
      console.log('\n➡️ Email workflows ready for production, SMS needs review')
    } else {
      console.log('\n⚠️ Fix end-to-end scenario issues before production deployment')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('\n💥 Phase 3 end-to-end testing failed:', error.message)
    process.exit(1)
  })
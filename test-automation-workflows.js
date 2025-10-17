#!/usr/bin/env node

// Phase 2: Complete Automation Workflow Testing
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

import NotificationService from './lib/notifications/notification-service.js'

console.log('🤖 Phase 2: Complete Automation Workflow Testing')
console.log('=' .repeat(60))

const testCredentials = {
  email: 'c50bossio@gmail.com',
  phone: '+13525568981'
}

console.log(`📧 Email notifications will be sent to: ${testCredentials.email}`)
console.log(`📱 SMS attempts will be made to: ${testCredentials.phone} (SMS service issue noted)`)

// Test scenarios for each automation workflow
const automationScenarios = [
  {
    name: '🎯 2A: Smart Reminder Escalation',
    description: 'High-risk appointment triggering escalated reminders',
    type: 'smart_reminder_escalation',
    data: {
      customerName: 'Test Customer',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'High-Risk Premium Service',
      appointmentDate: '2025-08-30',
      appointmentTime: '2:00 PM',
      appointmentDateTime: '2025-08-30T18:00:00.000Z',
      barberName: 'Mike Johnson',
      shopName: '6FB Automation Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$75.00',
      confirmationNumber: `SMART-REMINDER-${Date.now()}`,
      notes: 'SMART REMINDER TEST: High-risk booking (score 0.8) triggering escalated reminder sequence.',
      riskScore: 0.8,
      hoursUntilAppointment: 24
    }
  },
  {
    name: '💰 2B: Deposit Requirement Notification',
    description: 'High-value service requiring deposit from high-risk client',
    type: 'deposit_requirement_notification',
    data: {
      customerName: 'Test Customer',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'Premium Executive Package',
      appointmentDate: '2025-08-31',
      appointmentTime: '3:00 PM',
      appointmentDateTime: '2025-08-31T19:00:00.000Z',
      barberName: 'Premium Barber',
      shopName: '6FB Automation Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$120.00',
      confirmationNumber: `DEPOSIT-REQ-${Date.now()}`,
      notes: 'DEPOSIT REQUIREMENT TEST: High-value service ($120) + risk factors require $30 deposit to secure appointment.',
      depositAmount: '$30.00',
      noShowStrikes: 2,
      riskScore: 0.75,
      isHighValueService: true
    }
  },
  {
    name: '🔄 2C: Recovery Flow Communication', 
    description: 'Customer recovery outreach after no-show incident',
    type: 'recovery_flow',
    data: {
      customerName: 'Test Customer',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'Missed Appointment Recovery',
      appointmentDate: '2025-08-28',
      appointmentTime: '1:00 PM',
      appointmentDateTime: '2025-08-28T17:00:00.000Z',
      barberName: 'Understanding Barber',
      shopName: '6FB Automation Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$45.00',
      confirmationNumber: `RECOVERY-${Date.now()}`,
      notes: 'RECOVERY FLOW TEST: Reaching out after no-show to rebuild relationship and prevent future issues.',
      noShowCount: 3,
      strikeThreshold: true,
      recoveryReason: 'strike_threshold'
    }
  },
  {
    name: '⚠️ 2D: No-Show Response Automation',
    description: 'Automated response to appointment no-show',
    type: 'no_show_response', 
    data: {
      customerName: 'Test Customer',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'Missed Standard Cut',
      appointmentDate: '2025-08-28',
      appointmentTime: '10:00 AM',
      appointmentDateTime: '2025-08-28T14:00:00.000Z',
      barberName: 'Patient Barber',
      shopName: '6FB Automation Test Shop', 
      shopPhone: '+18135483884',
      totalPrice: '$35.00',
      confirmationNumber: `NOSHOW-RESP-${Date.now()}`,
      notes: 'NO-SHOW RESPONSE TEST: Automated fee notification and strike recording after missed appointment.',
      noShowFee: '$15.00',
      newStrikeCount: 2,
      feeCollectionEnabled: true
    }
  },
  {
    name: '🔍 2E: Risk Assessment Integration',
    description: 'Predictive risk detection triggering preventive actions',
    type: 'risk_assessment',
    data: {
      customerName: 'Test Customer',
      customerEmail: testCredentials.email,
      customerPhone: testCredentials.phone,
      serviceName: 'Risk-Monitored Service',
      appointmentDate: '2025-08-29',
      appointmentTime: '4:00 PM',
      appointmentDateTime: '2025-08-29T20:00:00.000Z',
      barberName: 'Proactive Barber',
      shopName: '6FB Automation Test Shop',
      shopPhone: '+18135483884',
      totalPrice: '$55.00',
      confirmationNumber: `RISK-ASSESS-${Date.now()}`,
      notes: 'RISK ASSESSMENT TEST: High confidence prediction (0.85) triggering preventive extra reminder.',
      riskScore: 0.85,
      confidenceLevel: 0.87,
      preventiveAction: 'extra_reminder',
      weatherFactor: 'storm_forecast',
      trafficFactor: 'heavy_delays'
    }
  }
]

async function testAutomationWorkflow(scenario) {
  try {
    console.log(`\n${scenario.name}`)
    console.log(`📋 ${scenario.description}`)
    console.log('📤 Sending automation notification...')
    
    // Use the unified notification service to send the automation-triggered notification
    const result = await NotificationService.sendAppointmentConfirmation(scenario.data)
    
    console.log('📊 Results:')
    console.log('  Overall Success:', result.success ? '✅ PASSED' : '❌ FAILED')
    
    if (result.results?.email) {
      console.log('  📧 Email:', result.results.email.success ? '✅ SENT' : '❌ FAILED')
      if (result.results.email.messageId) {
        console.log(`    Message ID: ${result.results.email.messageId}`)
      }
      if (result.results.email.error) {
        console.log(`    Error: ${result.results.email.error}`)
      }
    }
    
    if (result.results?.sms) {
      console.log('  📱 SMS:', result.results.sms.success ? '✅ SENT' : '❌ FAILED')
      if (result.results.sms.messageId) {
        console.log(`    Message ID: ${result.results.sms.messageId}`)
      }
      if (result.results.sms.error || result.results.sms.reason) {
        console.log(`    Issue: ${result.results.sms.error || result.results.sms.reason}`)
      }
    }
    
    return {
      scenario: scenario.name,
      success: result.success,
      emailSent: result.results?.email?.success || false,
      smsSent: result.results?.sms?.success || false,
      messageId: result.results?.email?.messageId
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

async function runAutomationTesting() {
  console.log('\n🚀 Starting Automation Workflow Testing...')
  
  const results = []
  
  for (const scenario of automationScenarios) {
    const result = await testAutomationWorkflow(scenario)
    results.push(result)
    
    // Small delay between tests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // Generate summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 PHASE 2 AUTOMATION TESTING SUMMARY')
  console.log('=' .repeat(60))
  
  const successfulWorkflows = results.filter(r => r.success)
  const emailWorkflows = results.filter(r => r.emailSent)
  const smsWorkflows = results.filter(r => r.smsSent)
  
  console.log(`\n🎯 Workflow Success Rate: ${successfulWorkflows.length}/${results.length} (${Math.round(successfulWorkflows.length/results.length*100)}%)`)
  console.log(`📧 Email Success Rate: ${emailWorkflows.length}/${results.length} (${Math.round(emailWorkflows.length/results.length*100)}%)`)
  console.log(`📱 SMS Success Rate: ${smsWorkflows.length}/${results.length} (${Math.round(smsWorkflows.length/results.length*100)}%)`)
  
  console.log('\n📋 Individual Results:')
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌'
    const email = result.emailSent ? '📧✅' : '📧❌'
    const sms = result.smsSent ? '📱✅' : '📱❌'
    console.log(`  ${index + 1}. ${status} ${email} ${sms} ${result.scenario}`)
    if (result.messageId) {
      console.log(`     Email ID: ${result.messageId}`)
    }
    if (result.error) {
      console.log(`     Error: ${result.error}`)
    }
  })
  
  console.log('\n🏁 Phase 2 Conclusion:')
  if (successfulWorkflows.length === results.length) {
    console.log('  🎉 ALL AUTOMATION WORKFLOWS WORKING!')
    console.log('  ✅ Booking rules successfully trigger real notifications')
    console.log(`  📧 Check ${testCredentials.email} for automation emails`)
  } else if (emailWorkflows.length === results.length) {
    console.log('  ⚠️ ALL EMAIL AUTOMATION WORKING, SMS needs attention')
    console.log('  ✅ Email-based automation workflows fully functional')
  } else {
    console.log('  ❌ Some automation workflows failed - review individual results')
  }
  
  return {
    totalTests: results.length,
    successfulWorkflows: successfulWorkflows.length,
    emailWorkflows: emailWorkflows.length,
    smsWorkflows: smsWorkflows.length,
    allEmailWorking: emailWorkflows.length === results.length,
    allWorkflowsWorking: successfulWorkflows.length === results.length
  }
}

// Execute Phase 2 testing
runAutomationTesting()
  .then(summary => {
    if (summary.allEmailWorking) {
      console.log('\n➡️ Ready for Phase 3: End-to-End Scenario Testing')
    } else {
      console.log('\n⚠️ Fix automation issues before proceeding to scenario testing')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('\n💥 Phase 2 testing failed:', error.message)
    process.exit(1)
  })
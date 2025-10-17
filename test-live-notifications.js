#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import NotificationService from './lib/notifications/notification-service.js'

console.log('🔥 Testing LIVE notification system with real credentials...')

// Real test data for live system
const testData = {
  customerName: 'Christopher Bossio',
  customerEmail: 'c50bossio@gmail.com', // Your specified email for testing
  customerPhone: '+13525568981', // Your specified phone for testing
  serviceName: 'Executive Cut & Style',
  appointmentDate: '2025-08-29',
  appointmentTime: '2:00 PM', 
  appointmentDateTime: '2025-08-29T18:00:00.000Z',
  barberName: 'Mike Johnson',
  shopName: '6FB Premium Barbershop',
  shopPhone: '+1 (813) 548-3884',
  shopAddress: '123 Main St, Tampa, FL 33601',
  totalPrice: '$45.00',
  confirmationNumber: 'LIVE-TEST-' + Date.now(),
  notes: 'LIVE PRODUCTION TEST: Verifying end-to-end notification integration works with real SMS and email.',
  sms_opt_in: true,
  email_opt_in: true
}

try {
  console.log('📤 Sending REAL appointment confirmation...')
  console.log('📧 Email will be sent to:', testData.customerEmail)
  console.log('📱 SMS will be sent to:', testData.customerPhone)
  
  const result = await NotificationService.sendAppointmentConfirmation(testData)
  
  console.log('\n📊 LIVE NOTIFICATION RESULTS:')
  console.log('Overall Success:', result.success)
  console.log('\n📧 Email Result:', {
    success: result.results?.email?.success,
    status: result.results?.email?.status,
    messageId: result.results?.email?.messageId,
    error: result.results?.email?.error
  })
  console.log('\n📱 SMS Result:', {
    success: result.results?.sms?.success,
    messageId: result.results?.sms?.messageId,
    status: result.results?.sms?.status,
    error: result.results?.sms?.error
  })
  
  if (result.success) {
    console.log('\n🎉 SUCCESS: End-to-end LIVE notification test PASSED!')
    console.log('✅ Real emails and SMS messages were sent to customer')
    console.log('✅ Booking rules and automation will now work with full notifications')
  } else {
    console.log('\n❌ FAILED: Live notification test failed')
    console.log('🔍 Check the detailed results above for specific issues')
  }
  
} catch (error) {
  console.error('\n❌ LIVE TEST ERROR:', error)
  console.error('Stack:', error.stack)
  process.exit(1)
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import EmailService from '@/lib/notifications/email-service.js'
import SMSService from '@/lib/notifications/sms-service.js'

/**
 * POST /api/test-notifications
 * Test endpoint to verify email and SMS notifications are working
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      test_email,
      test_phone,
      notification_type = 'appointment_confirmation' // or 'reminder' or 'payment_confirmation'
    } = await request.json()

    if (!test_email && !test_phone) {
      return NextResponse.json(
        { error: 'Either test_email or test_phone is required' },
        { status: 400 }
      )
    }

    const results = {}

    // Test data for notification
    const testData = {
      customerName: 'Christopher Bossio',
      customerEmail: test_email,
      customerPhone: test_phone,
      serviceName: 'Executive Cut & Style',
      appointmentDate: 'Tomorrow',
      appointmentTime: '2:00 PM',
      barberName: 'Test Barber',
      shopName: '6FB Test Shop',
      shopPhone: '+1 (813) 548-3884',
      totalPrice: '$45.00',
      confirmationNumber: 'TEST-' + Date.now(),
      transactionId: 'txn_test_' + Date.now(),
      paymentAmount: '$45.00',
      paymentMethod: 'Credit Card ****1234'
    }

    // Test Email Notification
    if (test_email) {
      try {
        let emailResult
        switch (notification_type) {
          case 'appointment_confirmation':
            emailResult = await EmailService.sendAppointmentConfirmation(testData)
            break
          case 'reminder':
            emailResult = await EmailService.sendBookingReminder(testData)
            break
          case 'payment_confirmation':
            emailResult = await EmailService.sendPaymentConfirmation(testData)
            break
          default:
            emailResult = await EmailService.sendAppointmentConfirmation(testData)
        }

        results.email = {
          success: emailResult.success,
          message_id: emailResult.messageId,
          status: emailResult.status,
          error: emailResult.error
        }
      } catch (error) {
        results.email = {
          success: false,
          error: error.message
        }
      }
    }

    // Test SMS Notification
    if (test_phone) {
      try {
        let smsResult
        switch (notification_type) {
          case 'appointment_confirmation':
            smsResult = await SMSService.sendAppointmentConfirmation(testData)
            break
          case 'reminder':
            smsResult = await SMSService.sendBookingReminder(testData)
            break
          case 'payment_confirmation':
            smsResult = await SMSService.sendPaymentConfirmation(testData)
            break
          default:
            smsResult = await SMSService.sendAppointmentConfirmation(testData)
        }

        results.sms = {
          success: smsResult.success,
          message_id: smsResult.messageId,
          status: smsResult.status,
          error: smsResult.error,
          reason: smsResult.reason
        }
      } catch (error) {
        results.sms = {
          success: false,
          error: error.message
        }
      }
    }

    // Summary
    const totalTests = Object.keys(results).length
    const successfulTests = Object.values(results).filter(r => r.success).length
    const failedTests = totalTests - successfulTests

    return NextResponse.json({
      success: failedTests === 0,
      message: `Notification test completed: ${successfulTests}/${totalTests} successful`,
      notification_type,
      test_data: {
        customer_name: testData.customerName,
        service: testData.serviceName,
        confirmation: testData.confirmationNumber
      },
      results,
      summary: {
        total_tests: totalTests,
        successful: successfulTests,
        failed: failedTests
      }
    })

  } catch (error) {
    console.error('Test notifications error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test notifications',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/test-notifications
 * Get notification service status
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check service configurations
    const emailConfigured = !!(
      process.env.SENDGRID_API_KEY && 
      process.env.SENDGRID_FROM_EMAIL &&
      process.env.SENDGRID_API_KEY !== 'your_sendgrid_api_key_here'
    )

    const smsConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_PHONE_NUMBER
    )

    // Test initialization
    let emailServiceStatus = 'Not configured'
    let smsServiceStatus = 'Not configured'

    if (emailConfigured) {
      try {
        await EmailService.initialize()
        emailServiceStatus = EmailService.initialized ? 'Ready' : 'Configuration error'
      } catch (error) {
        emailServiceStatus = `Error: ${error.message}`
      }
    }

    if (smsConfigured) {
      try {
        await SMSService.initialize()
        smsServiceStatus = SMSService.initialized ? 'Ready' : 'Configuration error'
      } catch (error) {
        smsServiceStatus = `Error: ${error.message}`
      }
    }

    return NextResponse.json({
      success: true,
      notification_services: {
        email: {
          configured: emailConfigured,
          status: emailServiceStatus,
          from_email: process.env.SENDGRID_FROM_EMAIL || 'Not set',
          from_name: process.env.SENDGRID_FROM_NAME || 'Not set'
        },
        sms: {
          configured: smsConfigured,
          status: smsServiceStatus,
          from_number: process.env.TWILIO_PHONE_NUMBER || 'Not set'
        }
      },
      available_test_types: [
        'appointment_confirmation',
        'reminder',
        'payment_confirmation'
      ]
    })

  } catch (error) {
    console.error('Get notification status error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get notification status',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
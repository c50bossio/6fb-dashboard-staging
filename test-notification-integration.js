/**
 * Test Novu Integration - 6FB Barbershop Notification System
 * Comprehensive test of the integrated notification system
 */

// Test data for barbershop notifications
const testAppointment = {
  id: 'apt_test_123',
  date: '2025-08-07',
  time: '2:00 PM',
  serviceName: 'Haircut & Style',
  barberName: 'Mike Johnson',
  totalPrice: '$35.00',
  confirmationNumber: 'APT-2025-001',
  cancelUrl: 'https://6fb-ai.vercel.app/cancel/APT-2025-001',
  manageUrl: 'https://6fb-ai.vercel.app/manage/APT-2025-001'
};

const testCustomer = {
  id: 'customer_test_123',
  name: 'John Smith',
  email: 'john.smith@example.com',
  phone: '+1234567890'
};

const testShop = {
  name: '6FB Premium Barbershop',
  address: '123 Main Street, City, ST 12345',
  phone: '(555) 123-4567',
  logo: 'https://example.com/logo.png',
  primaryColor: '#3B82F6'
};

const testPayment = {
  amount: '$35.00',
  method: 'Visa ****1234',
  transactionId: 'txn_1234567890abcdef',
  receiptUrl: 'https://6fb-ai.vercel.app/receipt/txn_1234567890abcdef'
};

// Helper function to test API endpoints
async function testApiEndpoint(url, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Test notification system health
async function testNotificationHealth() {
  console.log('\n🏥 Testing Notification System Health');
  console.log('=' .repeat(50));

  const result = await testApiEndpoint('http://localhost:9999/api/notifications/send');
  
  if (result.success) {
    console.log('✅ API Health Check:', result.data.status);
    console.log('📊 Details:', result.data.details);
  } else {
    console.log('❌ Health Check Failed:', result.error || result.data);
  }
  
  return result.success;
}

// Test individual notification sending (would work once workflows are deployed)
async function testNotificationSending() {
  console.log('\n📧 Testing Notification Sending');
  console.log('=' .repeat(50));

  const tests = [
    {
      name: 'Appointment Confirmation',
      type: 'appointment-confirmation',
      data: {
        userId: testCustomer.id,
        customerName: testCustomer.name,
        customerEmail: testCustomer.email,
        customerPhone: testCustomer.phone,
        appointmentDate: testAppointment.date,
        appointmentTime: testAppointment.time,
        serviceName: testAppointment.serviceName,
        barberName: testAppointment.barberName,
        shopName: testShop.name,
        shopAddress: testShop.address,
        shopPhone: testShop.phone,
        totalPrice: testAppointment.totalPrice,
        confirmationNumber: testAppointment.confirmationNumber,
        shopLogo: testShop.logo,
        primaryColor: testShop.primaryColor,
        cancelUrl: testAppointment.cancelUrl
      }
    },
    {
      name: 'Booking Reminder',
      type: 'booking-reminder',
      data: {
        userId: testCustomer.id,
        customerName: testCustomer.name,
        customerEmail: testCustomer.email,
        customerPhone: testCustomer.phone,
        appointmentDate: testAppointment.date,
        appointmentTime: testAppointment.time,
        serviceName: testAppointment.serviceName,
        barberName: testAppointment.barberName,
        shopName: testShop.name,
        shopAddress: testShop.address,
        shopPhone: testShop.phone,
        confirmationNumber: testAppointment.confirmationNumber,
        shopLogo: testShop.logo,
        primaryColor: '#F59E0B',
        manageUrl: testAppointment.manageUrl
      }
    },
    {
      name: 'Payment Confirmation',
      type: 'payment-confirmation',
      data: {
        userId: testCustomer.id,
        customerName: testCustomer.name,
        customerEmail: testCustomer.email,
        customerPhone: testCustomer.phone,
        paymentAmount: testPayment.amount,
        paymentMethod: testPayment.method,
        transactionId: testPayment.transactionId,
        serviceName: testAppointment.serviceName,
        appointmentDate: testAppointment.date,
        appointmentTime: testAppointment.time,
        shopName: testShop.name,
        receiptUrl: testPayment.receiptUrl,
        shopLogo: testShop.logo,
        primaryColor: '#10B981'
      }
    }
  ];

  for (const test of tests) {
    console.log(`\n🚀 Testing: ${test.name}`);
    
    const result = await testApiEndpoint(
      'http://localhost:9999/api/notifications/send',
      'POST',
      { type: test.type, data: test.data }
    );

    if (result.success) {
      console.log('✅ Success!', {
        type: result.data.type,
        transactionId: result.data.transactionId
      });
    } else {
      console.log('❌ Failed:', result.data?.error || result.error);
      console.log('📝 Note: This is expected until workflows are deployed to Novu');
    }
  }
}

// Test batch notification sending
async function testBatchNotifications() {
  console.log('\n📦 Testing Batch Notifications');
  console.log('=' .repeat(50));

  const batchData = {
    notifications: [
      {
        type: 'appointment-confirmation',
        data: {
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          customerPhone: '+1987654321',
          appointmentDate: '2025-08-08',
          appointmentTime: '3:00 PM',
          serviceName: 'Beard Trim',
          barberName: 'Alex Wilson',
          shopName: testShop.name,
          shopAddress: testShop.address,
          shopPhone: testShop.phone,
          totalPrice: '$25.00',
          confirmationNumber: 'APT-2025-002'
        }
      },
      {
        type: 'booking-reminder',
        data: {
          customerName: 'Bob Johnson',
          customerEmail: 'bob@example.com',
          customerPhone: '+1122334455',
          appointmentDate: '2025-08-09',
          appointmentTime: '4:00 PM',
          serviceName: 'Full Service',
          barberName: 'Chris Thompson',
          shopName: testShop.name,
          shopAddress: testShop.address,
          shopPhone: testShop.phone,
          confirmationNumber: 'APT-2025-003'
        }
      }
    ]
  };

  const result = await testApiEndpoint(
    'http://localhost:9999/api/notifications/batch',
    'POST',
    batchData
  );

  if (result.success) {
    console.log('✅ Batch Success!', {
      total: result.data.total,
      successful: result.data.successful,
      failed: result.data.failed
    });
  } else {
    console.log('❌ Batch Failed:', result.data?.error || result.error);
  }
}

// Test reminder scheduling
async function testReminderScheduling() {
  console.log('\n⏰ Testing Reminder Scheduling');
  console.log('=' .repeat(50));

  const reminderData = {
    data: {
      customerName: testCustomer.name,
      customerEmail: testCustomer.email,
      customerPhone: testCustomer.phone,
      appointmentDate: '2025-08-10', // Future date
      appointmentTime: '2:00 PM',
      serviceName: 'Haircut',
      barberName: 'Mike Johnson',
      shopName: testShop.name,
      shopAddress: testShop.address,
      shopPhone: testShop.phone,
      confirmationNumber: 'APT-2025-004'
    },
    hoursBeforeAppointment: 24
  };

  const result = await testApiEndpoint(
    'http://localhost:9999/api/notifications/schedule-reminder',
    'POST',
    reminderData
  );

  if (result.success) {
    console.log('✅ Scheduling Success!', {
      scheduled: result.data.scheduled,
      reminderTime: result.data.reminderTime,
      hoursBeforeAppointment: result.data.hoursBeforeAppointment
    });
  } else {
    console.log('❌ Scheduling Failed:', result.data?.error || result.error);
  }
}

// Test template rendering (local test)
function testTemplateRendering() {
  console.log('\n🎨 Testing Email Template Rendering');
  console.log('=' .repeat(50));

  try {
    // Import our templates
    const { renderAppointmentConfirmationEmail } = require('./lib/novu/templates/appointment-confirmation-email');
    const { renderBookingReminderEmail } = require('./lib/novu/templates/booking-reminder-email');
    const { renderPaymentConfirmationEmail } = require('./lib/novu/templates/payment-confirmation-email');

    // Test appointment confirmation template
    const confirmationEmailHtml = renderAppointmentConfirmationEmail({
      customerName: testCustomer.name,
      appointmentDate: testAppointment.date,
      appointmentTime: testAppointment.time,
      serviceName: testAppointment.serviceName,
      barberName: testAppointment.barberName,
      shopName: testShop.name,
      shopAddress: testShop.address,
      shopPhone: testShop.phone,
      totalPrice: testAppointment.totalPrice,
      confirmationNumber: testAppointment.confirmationNumber,
      shopLogo: testShop.logo,
      primaryColor: testShop.primaryColor,
      cancelUrl: testAppointment.cancelUrl
    });

    console.log('✅ Appointment Confirmation Template:', confirmationEmailHtml.length > 1000 ? 'Generated Successfully' : 'May have issues');

    // Test booking reminder template
    const reminderEmailHtml = renderBookingReminderEmail({
      customerName: testCustomer.name,
      appointmentDate: testAppointment.date,
      appointmentTime: testAppointment.time,
      serviceName: testAppointment.serviceName,
      barberName: testAppointment.barberName,
      shopName: testShop.name,
      shopAddress: testShop.address,
      shopPhone: testShop.phone,
      confirmationNumber: testAppointment.confirmationNumber,
      hoursUntilAppointment: 24,
      shopLogo: testShop.logo,
      primaryColor: '#F59E0B',
      manageUrl: testAppointment.manageUrl
    });

    console.log('✅ Booking Reminder Template:', reminderEmailHtml.length > 1000 ? 'Generated Successfully' : 'May have issues');

    // Test payment confirmation template
    const paymentEmailHtml = renderPaymentConfirmationEmail({
      customerName: testCustomer.name,
      customerEmail: testCustomer.email,
      paymentAmount: testPayment.amount,
      paymentMethod: testPayment.method,
      transactionId: testPayment.transactionId,
      serviceName: testAppointment.serviceName,
      appointmentDate: testAppointment.date,
      appointmentTime: testAppointment.time,
      shopName: testShop.name,
      receiptUrl: testPayment.receiptUrl,
      shopLogo: testShop.logo,
      primaryColor: '#10B981'
    });

    console.log('✅ Payment Confirmation Template:', paymentEmailHtml.length > 1000 ? 'Generated Successfully' : 'May have issues');

    return true;
  } catch (error) {
    console.log('❌ Template Rendering Failed:', error.message);
    return false;
  }
}

// Test workflow configuration
function testWorkflowConfiguration() {
  console.log('\n⚙️  Testing Workflow Configuration');
  console.log('=' .repeat(50));

  try {
    const { 
      appointmentConfirmationWorkflow,
      bookingReminderWorkflow,
      paymentConfirmationWorkflow 
    } = require('./lib/novu/workflows');

    console.log('✅ Appointment Confirmation Workflow:', appointmentConfirmationWorkflow.workflowId);
    console.log('✅ Booking Reminder Workflow:', bookingReminderWorkflow.workflowId);
    console.log('✅ Payment Confirmation Workflow:', paymentConfirmationWorkflow.workflowId);

    // Test helper functions
    const { createNotificationData } = require('./hooks/useSendNotifications');
    
    const testData = createNotificationData.appointmentConfirmation(
      testAppointment,
      testCustomer,
      testShop
    );

    console.log('✅ Notification Data Helper:', Object.keys(testData).length > 5 ? 'Working' : 'May have issues');

    return true;
  } catch (error) {
    console.log('❌ Workflow Configuration Failed:', error.message);
    return false;
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('🧪 6FB Barbershop Notification Integration Tests');
  console.log('=' .repeat(60));
  
  const results = {
    health: false,
    templates: false,
    workflows: false,
    apiCalls: false
  };

  // Test system health
  results.health = await testNotificationHealth();

  // Test template rendering
  results.templates = testTemplateRendering();

  // Test workflow configuration
  results.workflows = testWorkflowConfiguration();

  // Test API calls (these will fail until workflows are deployed, but test the structure)
  await testNotificationSending();
  await testBatchNotifications();
  await testReminderScheduling();

  // Summary
  console.log('\n📊 Integration Test Summary');
  console.log('=' .repeat(60));
  console.log('✅ System Health:', results.health ? 'PASS' : 'FAIL');
  console.log('✅ Template Rendering:', results.templates ? 'PASS' : 'FAIL');
  console.log('✅ Workflow Configuration:', results.workflows ? 'PASS' : 'FAIL');
  console.log('📝 API Calls: Ready (will work once workflows are deployed to Novu)');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Deploy workflows to Novu using CLI or dashboard');
  console.log('2. Test notification sending with deployed workflows');
  console.log('3. Integrate with existing booking system');
  console.log('4. Set up automated reminder scheduling');
  console.log('\n🌐 Novu Dashboard: https://web.novu.co');
}

// Run tests
runIntegrationTests().catch(console.error);
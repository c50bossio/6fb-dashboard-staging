const axios = require('axios');

const NOVU_API_KEY = 'e129dfe59c2e1a8664ebf87ca67ada9b';
const NOVU_API_URL = 'https://api.novu.co/v1/events/trigger';

// Test data for barbershop workflows
const testData = {
  appointmentConfirmation: {
    name: 'appointment-confirmation',
    to: {
      subscriberId: 'test-customer-123',
      email: 'customer@example.com',
      phone: '+1234567890'
    },
    payload: {
      customerName: 'John Smith',
      appointmentDate: '2025-08-07',
      appointmentTime: '2:00 PM',
      serviceName: 'Haircut & Style',
      barberName: 'Mike Johnson',
      shopName: '6FB Premium Barbershop',
      shopAddress: '123 Main Street, City, ST 12345',
      shopPhone: '(555) 123-4567',
      totalPrice: '$35.00',
      confirmationNumber: 'APT-2025-001',
      inAppSubject: 'Appointment Confirmed!',
      inAppBody: 'Your haircut appointment is confirmed for tomorrow at 2:00 PM with Mike.',
      inAppAvatar: 'https://example.com/avatar.png'
    }
  },
  
  bookingReminder: {
    name: 'booking-reminder',
    to: {
      subscriberId: 'test-customer-123',
      email: 'customer@example.com',
      phone: '+1234567890'
    },
    payload: {
      customerName: 'John Smith',
      appointmentDate: '2025-08-07',
      appointmentTime: '2:00 PM',
      serviceName: 'Haircut & Style',
      barberName: 'Mike Johnson',
      shopName: '6FB Premium Barbershop',
      shopAddress: '123 Main Street, City, ST 12345',
      shopPhone: '(555) 123-4567',
      hoursUntilAppointment: 24,
      confirmationNumber: 'APT-2025-001',
      inAppSubject: 'Appointment Reminder',
      inAppBody: 'Don\'t forget: Your appointment is tomorrow at 2:00 PM!',
      inAppAvatar: 'https://example.com/avatar.png'
    }
  },
  
  paymentConfirmation: {
    name: 'payment-confirmation',
    to: {
      subscriberId: 'test-customer-123',
      email: 'customer@example.com',
      phone: '+1234567890'
    },
    payload: {
      customerName: 'John Smith',
      customerEmail: 'customer@example.com',
      paymentAmount: '$35.00',
      paymentMethod: 'Visa ****1234',
      transactionId: 'txn_1234567890',
      serviceName: 'Haircut & Style',
      appointmentDate: '2025-08-07',
      appointmentTime: '2:00 PM',
      shopName: '6FB Premium Barbershop',
      receiptUrl: 'https://example.com/receipt/txn_1234567890.pdf',
      inAppSubject: 'Payment Confirmed',
      inAppBody: 'Your payment of $35.00 has been processed successfully.',
      inAppAvatar: 'https://example.com/avatar.png'
    }
  }
};

async function triggerWorkflow(workflowData) {
  try {
    console.log(`\n🚀 Testing workflow: ${workflowData.name}`);
    
    const response = await axios.post(NOVU_API_URL, workflowData, {
      headers: {
        'Authorization': `ApiKey ${NOVU_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Success! Response:`, {
      status: response.status,
      transactionId: response.data.transactionId,
      acknowledged: response.data.acknowledged
    });
    
    return response.data;
  } catch (error) {
    console.log(`❌ Error triggering ${workflowData.name}:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    return null;
  }
}

async function testAllWorkflows() {
  console.log('🧪 Testing 6FB Barbershop Notification Workflows');
  console.log('=' .repeat(50));
  
  // Test each workflow
  await triggerWorkflow(testData.appointmentConfirmation);
  await triggerWorkflow(testData.bookingReminder);
  await triggerWorkflow(testData.paymentConfirmation);
  
  console.log('\n📊 Workflow Testing Complete!');
  console.log('Check your Novu dashboard to see the triggered notifications.');
  console.log('Dashboard: https://web.novu.co');
}

// Run tests
testAllWorkflows();
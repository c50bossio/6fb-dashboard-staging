/**
 * Deploy Novu Workflows Script
 * Deploys barbershop workflows to Novu using the Management API
 */

const axios = require('axios');

const NOVU_API_KEY = 'e129dfe59c2e1a8664ebf87ca67ada9b';
const NOVU_API_URL = 'https://api.novu.co/v1';

// Workflow definitions for deployment
const workflows = [
  {
    workflowId: 'appointment-confirmation',
    name: 'Appointment Confirmation',
    description: 'Send confirmation notifications when appointments are booked',
    active: true,
    steps: [
      {
        type: 'email',
        name: 'Send Confirmation Email',
        properties: {
          subject: 'Appointment Confirmed - {{customerName}}',
          preheader: 'Your {{serviceName}} appointment is confirmed',
          content: `
<html>
<head><title>Appointment Confirmed</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px;">
    <div style="background: #3B82F6; color: white; padding: 30px 20px; text-align: center;">
      <h1>Appointment Confirmed!</h1>
      <span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">✓ CONFIRMED</span>
    </div>
    
    <div style="padding: 30px 20px;">
      <h2>Hi {{customerName}},</h2>
      <p>Great news! Your appointment has been successfully confirmed.</p>
      
      <div style="background: #f8f9fa; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Service:</span>
          <span>{{serviceName}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Date & Time:</span>
          <span>{{appointmentDate}} at {{appointmentTime}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Barber:</span>
          <span>{{barberName}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Location:</span>
          <span>{{shopName}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Total Price:</span>
          <span>{{totalPrice}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0;">
          <span style="font-weight: bold;">Confirmation #:</span>
          <span>{{confirmationNumber}}</span>
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="tel:{{shopPhone}}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px;">Call Shop</a>
      </div>
    </div>
  </div>
</body>
</html>`
        }
      },
      {
        type: 'sms',
        name: 'Send Confirmation SMS',
        properties: {
          body: 'Hi {{customerName}}! Your {{serviceName}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}} with {{barberName}} at {{shopName}}. Confirmation: {{confirmationNumber}}'
        }
      },
      {
        type: 'in_app',
        name: 'In-App Notification',
        properties: {
          subject: 'Appointment Confirmed! ✅',
          body: 'Your {{serviceName}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}}'
        }
      }
    ]
  },
  
  {
    workflowId: 'booking-reminder',
    name: 'Booking Reminder',
    description: 'Send reminder notifications before appointments',
    active: true,
    steps: [
      {
        type: 'email',
        name: 'Send Reminder Email',
        properties: {
          subject: 'Reminder: Your {{serviceName}} appointment tomorrow',
          preheader: 'Don\'t forget about your appointment',
          content: `
<html>
<head><title>Appointment Reminder</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px;">
    <div style="background: #F59E0B; color: white; padding: 30px 20px; text-align: center;">
      <h1>⏰ Appointment Reminder</h1>
      <span style="background: #F59E0B; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">REMINDER</span>
    </div>
    
    <div style="padding: 30px 20px;">
      <h2>Hi {{customerName}},</h2>
      <p>This is a friendly reminder about your upcoming appointment!</p>
      
      <div style="text-align: center; background: #F59E0B; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; display: block;">24</span>
        <span style="font-size: 14px; opacity: 0.9;">hours until your appointment</span>
      </div>
      
      <div style="background: linear-gradient(135deg, #F59E0B22, #F59E0B11); border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0;">
        <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Service:</span> {{serviceName}}
        </div>
        <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Date & Time:</span> {{appointmentDate}} at {{appointmentTime}}
        </div>
        <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Barber:</span> {{barberName}}
        </div>
        <div style="margin: 10px 0; padding: 8px 0;">
          <span style="font-weight: bold;">Location:</span> {{shopName}}
        </div>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="tel:{{shopPhone}}" style="background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Call Shop</a>
      </div>
    </div>
  </div>
</body>
</html>`
        }
      },
      {
        type: 'sms',
        name: 'Send Reminder SMS',
        properties: {
          body: 'Reminder: Your {{serviceName}} appointment is tomorrow ({{appointmentDate}} at {{appointmentTime}}) with {{barberName}} at {{shopName}}. See you soon!'
        }
      },
      {
        type: 'in_app',
        name: 'Appointment Reminder',
        properties: {
          subject: 'Appointment Reminder ⏰',
          body: 'Don\'t forget: Your {{serviceName}} appointment is tomorrow at {{appointmentTime}}'
        }
      }
    ]
  },
  
  {
    workflowId: 'payment-confirmation',
    name: 'Payment Confirmation',
    description: 'Send confirmation when payments are processed',
    active: true,
    steps: [
      {
        type: 'email',
        name: 'Send Payment Receipt',
        properties: {
          subject: 'Payment Confirmed - {{serviceName}} ({{transactionId}})',
          preheader: 'Your payment of {{paymentAmount}} has been processed',
          content: `
<html>
<head><title>Payment Confirmed</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px;">
    <div style="background: #10B981; color: white; padding: 30px 20px; text-align: center;">
      <h1>✅ Payment Confirmed!</h1>
      <span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">PAID</span>
    </div>
    
    <div style="padding: 30px 20px;">
      <h2>Hi {{customerName}},</h2>
      <p>Great news! Your payment has been successfully processed.</p>
      
      <div style="text-align: center; background: #10B981; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 36px; font-weight: bold; display: block;">{{paymentAmount}}</span>
        <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Payment Confirmed</div>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <h3>Transaction Details</h3>
        <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Transaction ID:</span>
          <span style="font-family: monospace; background: #f1f5f9; padding: 4px; border-radius: 4px; font-size: 12px;">{{transactionId}}</span>
        </div>
        <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span style="font-weight: bold;">Payment Method:</span> {{paymentMethod}}
        </div>
        <div style="margin: 10px 0; padding: 8px 0;">
          <span style="font-weight: bold;">Service:</span> {{serviceName}} on {{appointmentDate}}
        </div>
      </div>
      
      <div style="background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0;">
        <h4>🔒 Payment Security</h4>
        <p>Your payment was processed securely. Keep this email as your receipt.</p>
      </div>
    </div>
  </div>
</body>
</html>`
        }
      },
      {
        type: 'sms',
        name: 'Send Payment SMS',
        properties: {
          body: 'Payment confirmed! Your {{paymentAmount}} payment for {{serviceName}} on {{appointmentDate}} has been processed. Transaction: {{transactionId}}'
        }
      },
      {
        type: 'in_app',
        name: 'Payment Confirmed',
        properties: {
          subject: 'Payment Confirmed! ✅',
          body: 'Your payment of {{paymentAmount}} has been processed successfully for your {{serviceName}} appointment'
        }
      }
    ]
  }
];

// Helper function to make API requests
async function makeNovuRequest(endpoint, data, method = 'POST') {
  try {
    const response = await axios({
      method,
      url: `${NOVU_API_URL}${endpoint}`,
      headers: {
        'Authorization': `ApiKey ${NOVU_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Deploy individual workflow
async function deployWorkflow(workflow) {
  console.log(`\n🚀 Deploying workflow: ${workflow.name}`);
  
  // First, try to delete existing workflow if it exists
  const deleteResult = await makeNovuRequest(`/workflows/${workflow.workflowId}`, null, 'DELETE');
  if (deleteResult.success) {
    console.log('✅ Removed existing workflow');
  }
  
  // Create new workflow
  const createResult = await makeNovuRequest('/workflows', {
    workflowId: workflow.workflowId,
    name: workflow.name,
    description: workflow.description,
    active: workflow.active,
    steps: workflow.steps.map((step, index) => ({
      ...step,
      uuid: `step-${index}-${Math.random().toString(36).substr(2, 9)}`
    }))
  });

  if (createResult.success) {
    console.log('✅ Workflow deployed successfully:', createResult.data._id);
  } else {
    console.log('❌ Workflow deployment failed:', createResult.error);
  }
  
  return createResult.success;
}

// Main deployment function
async function deployAllWorkflows() {
  console.log('🎯 Deploying 6FB Barbershop Workflows to Novu');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  let totalCount = workflows.length;
  
  for (const workflow of workflows) {
    const success = await deployWorkflow(workflow);
    if (success) successCount++;
    
    // Small delay between deployments
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Deployment Summary');
  console.log('=' .repeat(30));
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 All workflows deployed successfully!');
    console.log('🌐 Check your Novu dashboard: https://web.novu.co');
    
    // Test a workflow
    console.log('\n🧪 Testing workflow deployment...');
    await testWorkflowTrigger();
  } else {
    console.log('\n⚠️  Some workflows failed to deploy. Check the errors above.');
  }
}

// Test workflow trigger
async function testWorkflowTrigger() {
  const testData = {
    name: 'appointment-confirmation',
    to: {
      subscriberId: 'test-user-123',
      email: 'test@example.com',
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
      confirmationNumber: 'APT-2025-001'
    }
  };

  const result = await makeNovuRequest('/events/trigger', testData);
  
  if (result.success) {
    console.log('✅ Test trigger successful:', result.data.transactionId);
  } else {
    console.log('❌ Test trigger failed:', result.error);
  }
}

// Run deployment
deployAllWorkflows().catch(console.error);
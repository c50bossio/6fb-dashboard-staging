/**
 * Automated Novu Workflow Deployment System
 * This script can automatically create workflows using Novu's API
 */

const axios = require('axios');

const NOVU_API_KEY = process.env.NOVU_API_KEY || 'e129dfe59c2e1a8664ebf87ca67ada9b';
const NOVU_API_URL = 'https://api.novu.co/v1';

// Complete workflow definitions with corrected variable syntax
const workflows = [
  {
    workflowId: 'appointment-confirmation',
    name: 'Appointment Confirmation',
    description: 'Send confirmation notifications when appointments are booked',
    steps: [
      {
        type: 'email',
        name: 'Send Confirmation Email',
        subject: 'Appointment Confirmed - {{{customerName}}}',
        contentType: 'customHtml',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: #3B82F6; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0;">Appointment Confirmed!</h1>
            <span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 10px;">✓ CONFIRMED</span>
        </div>
        <div style="padding: 30px 20px;">
            <h2 style="color: #333; margin-top: 0;">Hi {{{customerName}}},</h2>
            <p>Great news! Your appointment has been successfully confirmed. Here are your appointment details:</p>
            <div style="background: #f8f9fa; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Service:</span>
                    <span style="color: #333; float: right;">{{{serviceName}}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Date & Time:</span>
                    <span style="color: #333; float: right;">{{{appointmentDate}}} at {{{appointmentTime}}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Barber:</span>
                    <span style="color: #333; float: right;">{{{barberName}}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Location:</span>
                    <span style="color: #333; float: right;">{{{shopName}}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Total Price:</span>
                    <span style="color: #333; float: right;">{{{totalPrice}}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Confirmation #:</span>
                    <span style="color: #333; float: right;">{{{confirmationNumber}}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:{{{shopPhone}}}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Call Shop</a>
            </div>
        </div>
    </div>
</body>
</html>`
      },
      {
        type: 'sms',
        name: 'Send Confirmation SMS',
        content: 'Hi {{{customerName}}}! Your {{{serviceName}}} appointment is confirmed for {{{appointmentDate}}} at {{{appointmentTime}}} with {{{barberName}}} at {{{shopName}}}. Confirmation: {{{confirmationNumber}}}'
      },
      {
        type: 'in_app',
        name: 'Appointment Confirmed',
        subject: 'Appointment Confirmed! ✅',
        content: 'Your {{{serviceName}}} appointment is confirmed for {{{appointmentDate}}} at {{{appointmentTime}}}'
      }
    ]
  },

  {
    workflowId: 'booking-reminder',
    name: 'Booking Reminder', 
    description: 'Send reminder notifications before appointments',
    steps: [
      {
        type: 'email',
        name: 'Send Reminder Email',
        subject: 'Reminder: Your {{{serviceName}}} appointment tomorrow',
        contentType: 'customHtml',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: #F59E0B; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0;">⏰ Appointment Reminder</h1>
            <span style="background: #F59E0B; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 10px;">REMINDER</span>
        </div>
        <div style="padding: 30px 20px;">
            <h2 style="color: #333; margin-top: 0;">Hi {{{customerName}}},</h2>
            <p>This is a friendly reminder about your upcoming appointment!</p>
            <div style="text-align: center; background: #F59E0B; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; display: block;">24</span>
                <span style="font-size: 14px; opacity: 0.9;">hours until your appointment</span>
            </div>
            <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05)); border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Service:</span>
                    <span style="color: #333; float: right;">{{{serviceName}}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Date & Time:</span>
                    <span style="color: #333; float: right;">{{{appointmentDate}}} at {{{appointmentTime}}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Barber:</span>
                    <span style="color: #333; float: right;">{{{barberName}}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:{{{shopPhone}}}" style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Call Shop</a>
            </div>
        </div>
    </div>
</body>
</html>`
      },
      {
        type: 'sms',
        name: 'Send Reminder SMS',
        content: 'Reminder: Your {{{serviceName}}} appointment is tomorrow ({{{appointmentDate}}} at {{{appointmentTime}}}) with {{{barberName}}} at {{{shopName}}}. See you soon!'
      },
      {
        type: 'in_app',
        name: 'Appointment Reminder',
        subject: 'Appointment Reminder ⏰',
        content: 'Don\'t forget: Your {{{serviceName}}} appointment is tomorrow at {{{appointmentTime}}}'
      }
    ]
  },

  {
    workflowId: 'payment-confirmation',
    name: 'Payment Confirmation',
    description: 'Send confirmation when payments are processed',
    steps: [
      {
        type: 'email',
        name: 'Send Payment Receipt',
        subject: 'Payment Confirmed - {{{serviceName}}} ({{{transactionId}}})',
        contentType: 'customHtml',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: #10B981; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0;">✅ Payment Confirmed!</h1>
            <span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 10px;">PAID</span>
        </div>
        <div style="padding: 30px 20px;">
            <h2 style="color: #333; margin-top: 0;">Hi {{{customerName}}},</h2>
            <p>Great news! Your payment has been successfully processed.</p>
            <div style="text-align: center; background: #10B981; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; display: block;">{{{paymentAmount}}}</span>
                <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Payment Confirmed</div>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Transaction Details</h3>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Transaction ID:</span>
                    <span style="color: #333; float: right; font-family: 'Courier New', monospace; background: #f1f5f9; padding: 4px; border-radius: 4px; font-size: 12px;">{{{transactionId}}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Payment Method:</span>
                    <span style="color: #333; float: right;">{{{paymentMethod}}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Service:</span>
                    <span style="color: #333; float: right;">{{{serviceName}}} on {{{appointmentDate}}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:{{{shopPhone}}}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Contact Shop</a>
            </div>
        </div>
    </div>
</body>
</html>`
      },
      {
        type: 'sms',
        name: 'Send Payment SMS',
        content: 'Payment confirmed! Your {{{paymentAmount}}} payment for {{{serviceName}}} on {{{appointmentDate}}} has been processed. Transaction: {{{transactionId}}}'
      },
      {
        type: 'in_app',
        name: 'Payment Confirmed',
        subject: 'Payment Confirmed! ✅',
        content: 'Your payment of {{{paymentAmount}}} has been processed successfully for your {{{serviceName}}} appointment'
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

// Create a single workflow
async function createWorkflow(workflow) {
  console.log(`\n🚀 Creating workflow: ${workflow.name}`);
  
  // First, try to delete existing workflow if it exists
  console.log(`🗑️  Removing existing workflow if present...`);
  await makeNovuRequest(`/workflows/${workflow.workflowId}`, null, 'DELETE');
  
  // Create workflow steps
  const steps = workflow.steps.map((step, index) => {
    const baseStep = {
      name: step.name,
      uuid: `step-${index}-${Math.random().toString(36).substr(2, 9)}`,
      active: true,
      shouldStopOnFail: false,
      template: {}
    };

    switch (step.type) {
      case 'email':
        return {
          ...baseStep,
          type: 'email',
          template: {
            type: 'BASIC',
            subject: step.subject,
            content: step.content,
            contentType: step.contentType || 'customHtml'
          }
        };
      
      case 'sms':
        return {
          ...baseStep,
          type: 'sms',
          template: {
            content: step.content
          }
        };
      
      case 'in_app':
        return {
          ...baseStep,
          type: 'in_app',
          template: {
            subject: step.subject,
            content: step.content
          }
        };
      
      default:
        return baseStep;
    }
  });

  // Create the workflow
  const result = await makeNovuRequest('/workflows', {
    name: workflow.name,
    workflowId: workflow.workflowId,
    description: workflow.description,
    active: true,
    steps: steps,
    preferenceSettings: {
      email: true,
      sms: true,
      in_app: true,
      chat: false,
      push: false
    }
  });

  if (result.success) {
    console.log(`✅ Successfully created: ${workflow.name}`);
    console.log(`   ID: ${result.data._id}`);
    console.log(`   Identifier: ${workflow.workflowId}`);
  } else {
    console.log(`❌ Failed to create: ${workflow.name}`);
    console.log(`   Error:`, result.error);
  }

  return result.success;
}

// Main deployment function
async function deployAllWorkflows() {
  console.log('🎯 Automated Novu Workflow Deployment');
  console.log('=====================================');
  
  let successCount = 0;
  const totalCount = workflows.length;
  
  for (const workflow of workflows) {
    const success = await createWorkflow(workflow);
    if (success) successCount++;
    
    // Small delay between deployments
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 Deployment Summary');
  console.log('======================');
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 All workflows deployed successfully!');
    console.log('🌐 Check your Novu dashboard: https://web.novu.co');
    
    // Test the workflows
    console.log('\n🧪 Testing workflows...');
    await testWorkflows();
  } else {
    console.log('\n⚠️  Some workflows failed to deploy.');
    console.log('📋 Check the detailed error messages above.');
    console.log('🔧 You may need to create them manually using the provided templates.');
  }
}

// Test the deployed workflows
async function testWorkflows() {
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
      confirmationNumber: 'APT-2025-001',
      paymentAmount: '$35.00',
      paymentMethod: 'Visa ****1234',
      transactionId: 'txn_1234567890'
    }
  };

  const result = await makeNovuRequest('/events/trigger', testData);
  
  if (result.success) {
    console.log('✅ Test workflow trigger successful!');
    console.log(`   Transaction ID: ${result.data.transactionId}`);
    console.log('📧 Check your email/phone for the test notification');
  } else {
    console.log('❌ Test workflow trigger failed');
    console.log('   Error:', result.error);
  }
}

// Check if we should run this script
if (require.main === module) {
  console.log('Starting automated workflow deployment...');
  deployAllWorkflows().catch(console.error);
}

module.exports = {
  deployAllWorkflows,
  createWorkflow,
  workflows
};
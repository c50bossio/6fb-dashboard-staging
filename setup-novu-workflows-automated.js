/**
 * Automated Novu Workflow Setup Script
 * This script will help you quickly create all three workflows in Novu
 */

// Workflow Templates with Complete HTML
const workflowTemplates = {
  appointmentConfirmation: {
    name: 'Appointment Confirmation',
    identifier: 'appointment-confirmation',
    description: 'Send confirmation notifications when appointments are booked',
    steps: [
      {
        type: 'email',
        name: 'Send Confirmation Email',
        subject: 'Appointment Confirmed - {{customerName}}',
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
            <h2 style="color: #333; margin-top: 0;">Hi {{customerName}},</h2>
            <p>Great news! Your appointment has been successfully confirmed. Here are your appointment details:</p>
            <div style="background: #f8f9fa; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Service:</span>
                    <span style="color: #333; float: right;">{{serviceName}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Date & Time:</span>
                    <span style="color: #333; float: right;">{{appointmentDate}} at {{appointmentTime}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Barber:</span>
                    <span style="color: #333; float: right;">{{barberName}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Location:</span>
                    <span style="color: #333; float: right;">{{shopName}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Total Price:</span>
                    <span style="color: #333; float: right;">{{totalPrice}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Confirmation #:</span>
                    <span style="color: #333; float: right;">{{confirmationNumber}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:{{shopPhone}}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Call Shop</a>
            </div>
        </div>
    </div>
</body>
</html>`
      },
      {
        type: 'sms',
        name: 'Send Confirmation SMS',
        message: 'Hi {{customerName}}! Your {{serviceName}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}} with {{barberName}} at {{shopName}}. Confirmation: {{confirmationNumber}}'
      },
      {
        type: 'in_app',
        name: 'Appointment Confirmed',
        subject: 'Appointment Confirmed! ✅',
        body: 'Your {{serviceName}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}}'
      }
    ]
  },

  bookingReminder: {
    name: 'Booking Reminder',
    identifier: 'booking-reminder',
    description: 'Send reminder notifications before appointments',
    steps: [
      {
        type: 'email',
        name: 'Send Reminder Email',
        subject: 'Reminder: Your {{serviceName}} appointment tomorrow',
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
            <h2 style="color: #333; margin-top: 0;">Hi {{customerName}},</h2>
            <p>This is a friendly reminder about your upcoming appointment!</p>
            <div style="text-align: center; background: #F59E0B; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; display: block;">24</span>
                <span style="font-size: 14px; opacity: 0.9;">hours until your appointment</span>
            </div>
            <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05)); border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Service:</span>
                    <span style="color: #333; float: right;">{{serviceName}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Date & Time:</span>
                    <span style="color: #333; float: right;">{{appointmentDate}} at {{appointmentTime}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Barber:</span>
                    <span style="color: #333; float: right;">{{barberName}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:{{shopPhone}}" style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Call Shop</a>
            </div>
        </div>
    </div>
</body>
</html>`
      },
      {
        type: 'sms',
        name: 'Send Reminder SMS',
        message: 'Reminder: Your {{serviceName}} appointment is tomorrow ({{appointmentDate}} at {{appointmentTime}}) with {{barberName}} at {{shopName}}. See you soon!'
      },
      {
        type: 'in_app',
        name: 'Appointment Reminder',
        subject: 'Appointment Reminder ⏰',
        body: 'Don\'t forget: Your {{serviceName}} appointment is tomorrow at {{appointmentTime}}'
      }
    ]
  },

  paymentConfirmation: {
    name: 'Payment Confirmation',
    identifier: 'payment-confirmation',
    description: 'Send confirmation when payments are processed',
    steps: [
      {
        type: 'email',
        name: 'Send Payment Receipt',
        subject: 'Payment Confirmed - {{serviceName}} ({{transactionId}})',
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
            <h2 style="color: #333; margin-top: 0;">Hi {{customerName}},</h2>
            <p>Great news! Your payment has been successfully processed.</p>
            <div style="text-align: center; background: #10B981; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; display: block;">{{paymentAmount}}</span>
                <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Payment Confirmed</div>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Transaction Details</h3>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Transaction ID:</span>
                    <span style="color: #333; float: right; font-family: 'Courier New', monospace; background: #f1f5f9; padding: 4px; border-radius: 4px; font-size: 12px;">{{transactionId}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Payment Method:</span>
                    <span style="color: #333; float: right;">{{paymentMethod}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Service:</span>
                    <span style="color: #333; float: right;">{{serviceName}} on {{appointmentDate}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:{{shopPhone}}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Contact Shop</a>
            </div>
        </div>
    </div>
</body>
</html>`
      },
      {
        type: 'sms',
        name: 'Send Payment SMS',
        message: 'Payment confirmed! Your {{paymentAmount}} payment for {{serviceName}} on {{appointmentDate}} has been processed. Transaction: {{transactionId}}'
      },
      {
        type: 'in_app',
        name: 'Payment Confirmed',
        subject: 'Payment Confirmed! ✅',
        body: 'Your payment of {{paymentAmount}} has been processed successfully for your {{serviceName}} appointment'
      }
    ]
  }
};

// Function to copy template data to clipboard for easy pasting
function copyToClipboard(data) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(data);
    console.log('✅ Copied to clipboard!');
  } else {
    console.log('📋 Copy this data manually:');
    console.log(data);
  }
}

// Instructions for manual setup
console.log('🎯 Novu Workflow Setup Guide');
console.log('================================');
console.log('');
console.log('1. Go to: https://web.novu.co');
console.log('2. Sign in to your Novu account');
console.log('3. Navigate to Workflows → Create Workflow');
console.log('');

console.log('📧 WORKFLOW 1: APPOINTMENT CONFIRMATION');
console.log('---------------------------------------');
console.log('Name:', workflowTemplates.appointmentConfirmation.name);
console.log('Identifier:', workflowTemplates.appointmentConfirmation.identifier);
console.log('Description:', workflowTemplates.appointmentConfirmation.description);
console.log('');
console.log('📝 Email Step:');
console.log('Subject:', workflowTemplates.appointmentConfirmation.steps[0].subject);
console.log('');
console.log('📄 HTML Content (copy this):');
console.log('=====================================');
console.log(workflowTemplates.appointmentConfirmation.steps[0].content);
console.log('=====================================');
console.log('');
console.log('📱 SMS Step:');
console.log(workflowTemplates.appointmentConfirmation.steps[1].message);
console.log('');
console.log('🔔 In-App Step:');
console.log('Subject:', workflowTemplates.appointmentConfirmation.steps[2].subject);
console.log('Body:', workflowTemplates.appointmentConfirmation.steps[2].body);
console.log('');
console.log('');

console.log('⏰ WORKFLOW 2: BOOKING REMINDER');
console.log('--------------------------------');
console.log('Name:', workflowTemplates.bookingReminder.name);
console.log('Identifier:', workflowTemplates.bookingReminder.identifier);
console.log('Description:', workflowTemplates.bookingReminder.description);
console.log('');
console.log('📝 Email Step:');
console.log('Subject:', workflowTemplates.bookingReminder.steps[0].subject);
console.log('');
console.log('📄 HTML Content (copy this):');
console.log('=====================================');
console.log(workflowTemplates.bookingReminder.steps[0].content);
console.log('=====================================');
console.log('');
console.log('📱 SMS Step:');
console.log(workflowTemplates.bookingReminder.steps[1].message);
console.log('');
console.log('🔔 In-App Step:');
console.log('Subject:', workflowTemplates.bookingReminder.steps[2].subject);
console.log('Body:', workflowTemplates.bookingReminder.steps[2].body);
console.log('');
console.log('');

console.log('💳 WORKFLOW 3: PAYMENT CONFIRMATION');
console.log('------------------------------------');
console.log('Name:', workflowTemplates.paymentConfirmation.name);
console.log('Identifier:', workflowTemplates.paymentConfirmation.identifier);
console.log('Description:', workflowTemplates.paymentConfirmation.description);
console.log('');
console.log('📝 Email Step:');
console.log('Subject:', workflowTemplates.paymentConfirmation.steps[0].subject);
console.log('');
console.log('📄 HTML Content (copy this):');
console.log('=====================================');
console.log(workflowTemplates.paymentConfirmation.steps[0].content);
console.log('=====================================');
console.log('');
console.log('📱 SMS Step:');
console.log(workflowTemplates.paymentConfirmation.steps[1].message);
console.log('');
console.log('🔔 In-App Step:');
console.log('Subject:', workflowTemplates.paymentConfirmation.steps[2].subject);
console.log('Body:', workflowTemplates.paymentConfirmation.steps[2].body);
console.log('');
console.log('');

console.log('🧪 TEST DATA');
console.log('============');
console.log('Use this test payload after creating workflows:');
console.log(JSON.stringify({
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
  transactionId: 'txn_1234567890',
  customerEmail: 'john.smith@example.com'
}, null, 2));

console.log('');
console.log('✅ Once workflows are created, test with:');
console.log('node test-novu-workflows.js');
console.log('');
console.log('🎉 Total setup time: ~15 minutes');

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { workflowTemplates, copyToClipboard };
}
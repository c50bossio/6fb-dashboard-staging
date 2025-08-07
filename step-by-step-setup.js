/**
 * Step-by-step Novu Setup - One Workflow at a Time
 * Run: node step-by-step-setup.js [workflow-number]
 */

const workflows = {
  1: {
    name: 'Appointment Confirmation',
    identifier: 'appointment-confirmation',
    description: 'Send confirmation notifications when appointments are booked',
    emailSubject: 'Appointment Confirmed - {{customerName}}',
    emailHTML: `<!DOCTYPE html>
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
</html>`,
    smsMessage: 'Hi {{customerName}}! Your {{serviceName}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}} with {{barberName}} at {{shopName}}. Confirmation: {{confirmationNumber}}',
    inAppSubject: 'Appointment Confirmed! ✅',
    inAppBody: 'Your {{serviceName}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}}'
  },
  
  2: {
    name: 'Booking Reminder',
    identifier: 'booking-reminder',
    description: 'Send reminder notifications before appointments',
    emailSubject: 'Reminder: Your {{serviceName}} appointment tomorrow',
    emailHTML: `<!DOCTYPE html>
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
</html>`,
    smsMessage: 'Reminder: Your {{serviceName}} appointment is tomorrow ({{appointmentDate}} at {{appointmentTime}}) with {{barberName}} at {{shopName}}. See you soon!',
    inAppSubject: 'Appointment Reminder ⏰',
    inAppBody: 'Don\'t forget: Your {{serviceName}} appointment is tomorrow at {{appointmentTime}}'
  },
  
  3: {
    name: 'Payment Confirmation',
    identifier: 'payment-confirmation',
    description: 'Send confirmation when payments are processed',
    emailSubject: 'Payment Confirmed - {{serviceName}} ({{transactionId}})',
    emailHTML: `<!DOCTYPE html>
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
</html>`,
    smsMessage: 'Payment confirmed! Your {{paymentAmount}} payment for {{serviceName}} on {{appointmentDate}} has been processed. Transaction: {{transactionId}}',
    inAppSubject: 'Payment Confirmed! ✅',
    inAppBody: 'Your payment of {{paymentAmount}} has been processed successfully for your {{serviceName}} appointment'
  }
};

const workflowNumber = process.argv[2] || '1';
const workflow = workflows[workflowNumber];

if (!workflow) {
  console.log('❌ Invalid workflow number. Use: 1, 2, or 3');
  console.log('');
  console.log('Usage:');
  console.log('node step-by-step-setup.js 1   # Appointment Confirmation');
  console.log('node step-by-step-setup.js 2   # Booking Reminder');  
  console.log('node step-by-step-setup.js 3   # Payment Confirmation');
  process.exit(1);
}

console.log(`🎯 WORKFLOW ${workflowNumber}: ${workflow.name.toUpperCase()}`);
console.log('=' .repeat(50));
console.log('');
console.log('📋 Basic Info:');
console.log(`Name: ${workflow.name}`);
console.log(`Identifier: ${workflow.identifier}`);
console.log(`Description: ${workflow.description}`);
console.log('');

console.log('📧 EMAIL STEP:');
console.log('-------------');
console.log(`Subject: ${workflow.emailSubject}`);
console.log('');
console.log('HTML Content (copy this entire block):');
console.log('=====================================');
console.log(workflow.emailHTML);
console.log('=====================================');
console.log('');

console.log('📱 SMS STEP:');
console.log('-----------');
console.log(workflow.smsMessage);
console.log('');

console.log('🔔 IN-APP STEP:');
console.log('--------------');
console.log(`Subject: ${workflow.inAppSubject}`);
console.log(`Body: ${workflow.inAppBody}`);
console.log('');

console.log('✅ Next Steps:');
console.log('1. Go to https://web.novu.co → Workflows → Create Workflow');
console.log('2. Fill in the basic info above');
console.log('3. Add Email step → copy/paste HTML content');
console.log('4. Add SMS step → copy/paste SMS message');
console.log('5. Add In-App step → copy/paste subject & body');
console.log('6. Save the workflow');
console.log('');

if (workflowNumber < '3') {
  const nextWorkflow = parseInt(workflowNumber) + 1;
  console.log(`🔄 When done, run: node step-by-step-setup.js ${nextWorkflow}`);
} else {
  console.log('🎉 After creating all 3 workflows, test with:');
  console.log('node test-novu-workflows.js');
}
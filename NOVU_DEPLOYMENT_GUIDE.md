# Novu Workflow Deployment Guide
## 6FB Barbershop Notification System

Since automated deployment is encountering API validation issues, here's a step-by-step manual deployment guide using the Novu web dashboard.

## 🌐 Step 1: Access Novu Dashboard

1. Go to [https://web.novu.co](https://web.novu.co)
2. Log in with your Novu account
3. Navigate to **Workflows** in the left sidebar

## 📋 Step 2: Create Appointment Confirmation Workflow

### Basic Setup
- **Name**: Appointment Confirmation
- **Identifier**: `appointment-confirmation`
- **Description**: Send confirmation notifications when appointments are booked

### Steps to Add:

#### Step 1: Email Channel
- **Channel**: Email
- **Name**: Send Confirmation Email
- **Subject**: `Appointment Confirmed - {{customerName}}`
- **Email Content**: Copy the HTML from below:

```html
<!DOCTYPE html>
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
                    <span style="font-weight: bold; color: #555;">Address:</span>
                    <span style="color: #333; float: right;">{{shopAddress}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Phone:</span>
                    <span style="color: #333; float: right;">{{shopPhone}}</span>
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
            
            <div style="background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0;"><strong>What to expect:</strong></p>
                <ul style="margin: 10px 0;">
                    <li>Please arrive 5-10 minutes early</li>
                    <li>Bring a valid ID if it's your first visit</li>
                    <li>We'll send you a reminder 24 hours before your appointment</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:{{shopPhone}}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px;">Call Shop</a>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">Need to make changes? Call us at {{shopPhone}}</p>
            <p style="margin: 5px 0 0 0;">Thank you for choosing {{shopName}}!</p>
        </div>
    </div>
</body>
</html>
```

#### Step 2: SMS Channel
- **Channel**: SMS
- **Name**: Send Confirmation SMS
- **Message**: `Hi {{customerName}}! Your {{serviceName}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}} with {{barberName}} at {{shopName}}. Confirmation: {{confirmationNumber}}`

#### Step 3: In-App Channel
- **Channel**: In-App
- **Name**: Appointment Confirmed
- **Subject**: `Appointment Confirmed! ✅`
- **Body**: `Your {{serviceName}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}}`

## 📋 Step 3: Create Booking Reminder Workflow

### Basic Setup
- **Name**: Booking Reminder
- **Identifier**: `booking-reminder`
- **Description**: Send reminder notifications before appointments

### Steps to Add:

#### Step 1: Email Channel
- **Channel**: Email
- **Name**: Send Reminder Email
- **Subject**: `Reminder: Your {{serviceName}} appointment tomorrow`
- **Email Content**: Copy the HTML from below:

```html
<!DOCTYPE html>
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
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Barber:</span>
                    <span style="color: #333; float: right;">{{barberName}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Location:</span>
                    <span style="color: #333; float: right;">{{shopName}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            
            <div style="background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #1e40af;">💡 Quick Reminders:</h3>
                <ul style="margin: 10px 0;">
                    <li><strong>Arrive early:</strong> Please arrive 5-10 minutes before your appointment</li>
                    <li><strong>Parking:</strong> Street parking or nearby lots available</li>
                    <li><strong>Payment:</strong> We accept cash, cards, and mobile payments</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:{{shopPhone}}" style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px;">Call Shop</a>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">Need to reschedule or cancel? Call us at {{shopPhone}}</p>
            <p style="margin: 5px 0 0 0;">See you soon at {{shopName}}!</p>
        </div>
    </div>
</body>
</html>
```

#### Step 2: SMS Channel
- **Channel**: SMS
- **Name**: Send Reminder SMS
- **Message**: `Reminder: Your {{serviceName}} appointment is tomorrow ({{appointmentDate}} at {{appointmentTime}}) with {{barberName}} at {{shopName}}. See you soon!`

#### Step 3: In-App Channel
- **Channel**: In-App
- **Name**: Appointment Reminder
- **Subject**: `Appointment Reminder ⏰`
- **Body**: `Don't forget: Your {{serviceName}} appointment is tomorrow at {{appointmentTime}}`

## 📋 Step 4: Create Payment Confirmation Workflow

### Basic Setup
- **Name**: Payment Confirmation
- **Identifier**: `payment-confirmation`
- **Description**: Send confirmation when payments are processed

### Steps to Add:

#### Step 1: Email Channel
- **Channel**: Email
- **Name**: Send Payment Receipt
- **Subject**: `Payment Confirmed - {{serviceName}} ({{transactionId}})`
- **Email Content**: Copy the HTML from below:

```html
<!DOCTYPE html>
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
            <p>Great news! Your payment has been successfully processed. Here's your receipt:</p>
            
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
                <div style="margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="font-weight: bold; color: #555;">Customer:</span>
                    <span style="color: #333; float: right;">{{customerName}}</span>
                    <div style="clear: both;"></div>
                </div>
                <div style="margin: 10px 0; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">Email:</span>
                    <span style="color: #333; float: right;">{{customerEmail}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05)); border-left: 4px solid #10B981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin-top: 0;">Service Details</h3>
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
                    <span style="font-weight: bold; color: #555;">Business:</span>
                    <span style="color: #333; float: right;">{{shopName}}</span>
                    <div style="clear: both;"></div>
                </div>
            </div>
            
            <div style="background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px;">
                <h4 style="margin-top: 0; color: #1e40af;">🔒 Payment Security</h4>
                <p style="margin: 0;">Your payment was processed securely. This transaction will appear on your statement as "{{shopName}}" or similar. Keep this email as your receipt for your records.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="tel:{{shopPhone}}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px;">Contact Shop</a>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">Questions about your payment? Contact us at {{shopPhone}}</p>
            <p style="margin: 5px 0 0 0;">Thank you for choosing {{shopName}}!</p>
            <p style="margin: 20px 0 0 0; font-size: 12px; color: #999;">
                Transaction ID: {{transactionId}}<br>
                This email serves as your official receipt.
            </p>
        </div>
    </div>
</body>
</html>
```

#### Step 2: SMS Channel
- **Channel**: SMS
- **Name**: Send Payment SMS
- **Message**: `Payment confirmed! Your {{paymentAmount}} payment for {{serviceName}} on {{appointmentDate}} has been processed. Transaction: {{transactionId}}`

#### Step 3: In-App Channel
- **Channel**: In-App
- **Name**: Payment Confirmed
- **Subject**: `Payment Confirmed! ✅`
- **Body**: `Your payment of {{paymentAmount}} has been processed successfully for your {{serviceName}} appointment`

## 🧪 Step 5: Test Your Workflows

After creating all workflows, test them by:

1. Go to **Activities** in your Novu dashboard
2. Click **Trigger Event**
3. Select your workflow
4. Use test data like:

```json
{
  "subscriberId": "test-user-123",
  "email": "your-email@example.com",
  "phone": "+1234567890"
}
```

**Payload**:
```json
{
  "customerName": "John Smith",
  "appointmentDate": "2025-08-07",
  "appointmentTime": "2:00 PM",
  "serviceName": "Haircut & Style",
  "barberName": "Mike Johnson",
  "shopName": "6FB Premium Barbershop",
  "shopAddress": "123 Main Street, City, ST 12345",
  "shopPhone": "(555) 123-4567",
  "totalPrice": "$35.00",
  "confirmationNumber": "APT-2025-001",
  "paymentAmount": "$35.00",
  "paymentMethod": "Visa ****1234",
  "transactionId": "txn_1234567890",
  "customerEmail": "john.smith@example.com"
}
```

## ✅ Step 6: Integration Verification

Once workflows are deployed, test the integration:

```bash
cd "/Users/bossio/6FB AI Agent System"
node test-novu-workflows.js
```

This should now show successful triggers instead of "workflow_not_found" errors.

## 🎯 Final Result

Once completed, you'll have:
- ✅ 3 professional workflows deployed to Novu
- ✅ Beautiful, responsive email templates
- ✅ Multi-channel notifications (Email, SMS, In-App)
- ✅ Full integration with your booking system
- ✅ Ready for production use

Your notification system is now ready to handle:
- **Appointment confirmations** when bookings are made
- **Automatic reminders** 24 hours before appointments
- **Payment receipts** when transactions are processed

The manual deployment takes about 15-20 minutes but gives you full control over the workflow configuration.
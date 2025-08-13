# SendGrid Email Templates Configuration Guide

## Overview
Complete setup guide for configuring SendGrid email templates for subscription notifications in the 6FB AI Agent System.

## Prerequisites
- SendGrid account with API access
- Verified sender domain
- API key with full access permissions

## 1. SendGrid Account Setup

### Access SendGrid Dashboard
1. Login to: https://app.sendgrid.com
2. Navigate to Settings → Sender Authentication
3. Verify your domain if not already done

### API Key Configuration
```bash
# Already configured in .env:
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=notifications@yourdomain.com
SENDGRID_FROM_NAME=6FB AI Agent System
```

## 2. Dynamic Templates Setup

### Create Templates in SendGrid

#### A. Welcome Email Template
**Template ID**: d-welcome-subscription

1. Go to Email API → Dynamic Templates
2. Click "Create a Dynamic Template"
3. Name: "Subscription Welcome"
4. Create Version → Blank Template → Code Editor

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to {{tier_name}}! 🎉</h1>
        </div>
        <div class="content">
            <p>Hi {{user_name}},</p>
            
            <p>Thank you for subscribing to our <strong>{{tier_name}}</strong> plan! Your barbershop management journey just got a whole lot easier.</p>
            
            <h3>Your Subscription Details:</h3>
            <ul>
                <li><strong>Plan:</strong> {{tier_name}}</li>
                <li><strong>Price:</strong> ${{amount}} per {{billing_period}}</li>
                <li><strong>Next billing date:</strong> {{next_billing_date}}</li>
            </ul>
            
            <h3>What's Included:</h3>
            <ul>
                {{#features}}
                <li>{{.}}</li>
                {{/features}}
            </ul>
            
            <a href="{{dashboard_url}}" class="button">Access Your Dashboard</a>
            
            <h3>Getting Started:</h3>
            <ol>
                <li>Complete your shop profile</li>
                <li>Add your services and pricing</li>
                <li>Set up your booking calendar</li>
                <li>Invite your team members</li>
            </ol>
            
            <p>Need help? Our support team is here for you at support@yourdomain.com</p>
            
            <p>Best regards,<br>The 6FB Team</p>
        </div>
        <div class="footer">
            <p>You're receiving this email because you subscribed to {{tier_name}} plan.</p>
            <p><a href="{{manage_subscription_url}}">Manage Subscription</a> | <a href="{{unsubscribe_url}}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>
```

#### B. Payment Success Template
**Template ID**: d-payment-success

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Same styles as welcome email */
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Successful ✅</h1>
        </div>
        <div class="content">
            <p>Hi {{user_name}},</p>
            
            <p>Your payment has been successfully processed. Thank you for your continued subscription!</p>
            
            <h3>Payment Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Amount:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>${{amount}}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Plan:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{{tier_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Payment Method:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{{payment_method}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px;">Next Billing Date:</td>
                    <td style="padding: 10px;">{{next_billing_date}}</td>
                </tr>
            </table>
            
            <a href="{{invoice_url}}" class="button">Download Invoice</a>
            
            <p>Questions about your billing? Contact us at billing@yourdomain.com</p>
        </div>
    </div>
</body>
</html>
```

#### C. Payment Failed Template
**Template ID**: d-payment-failed

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
        .urgent { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Failed ⚠️</h1>
        </div>
        <div class="content">
            <p>Hi {{user_name}},</p>
            
            <div class="urgent">
                <strong>Action Required:</strong> We were unable to process your payment for your {{tier_name}} subscription.
            </div>
            
            <h3>What Happened?</h3>
            <p>Your payment of <strong>${{amount}}</strong> could not be processed. The error was: {{error_message}}</p>
            
            <h3>What You Need to Do:</h3>
            <ol>
                <li>Update your payment method</li>
                <li>Ensure sufficient funds are available</li>
                <li>Try the payment again</li>
            </ol>
            
            <a href="{{update_payment_url}}" class="button" style="background: #ef4444;">Update Payment Method</a>
            
            <p><strong>Grace Period:</strong> You have {{grace_period_days}} days to update your payment before your subscription is suspended.</p>
            
            <p>Need help? Contact our billing team immediately at billing@yourdomain.com or call 1-800-SUPPORT</p>
        </div>
    </div>
</body>
</html>
```

#### D. Subscription Cancelled Template
**Template ID**: d-subscription-cancelled

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Base styles */
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Subscription Cancelled</h1>
        </div>
        <div class="content">
            <p>Hi {{user_name}},</p>
            
            <p>Your {{tier_name}} subscription has been cancelled as requested.</p>
            
            <h3>What This Means:</h3>
            <ul>
                <li>Access until: {{access_end_date}}</li>
                <li>No future charges will occur</li>
                <li>Your data will be retained for 30 days</li>
            </ul>
            
            <h3>Changed Your Mind?</h3>
            <p>You can reactivate your subscription anytime before {{access_end_date}}.</p>
            
            <a href="{{reactivate_url}}" class="button">Reactivate Subscription</a>
            
            <h3>Feedback</h3>
            <p>We'd love to know why you cancelled. Your feedback helps us improve:</p>
            <a href="{{feedback_url}}">Share Feedback</a>
            
            <p>Thank you for being part of our community. We hope to see you again!</p>
        </div>
    </div>
</body>
</html>
```

#### E. Trial Ending Template
**Template ID**: d-trial-ending

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .countdown { background: #fef3c7; border: 2px solid #fbbf24; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Trial Ends in {{days_remaining}} Days</h1>
        </div>
        <div class="content">
            <p>Hi {{user_name}},</p>
            
            <div class="countdown">
                <h2>{{days_remaining}} days left in your trial</h2>
                <p>Trial ends on: {{trial_end_date}}</p>
            </div>
            
            <h3>Don't Lose Access!</h3>
            <p>Continue enjoying all {{tier_name}} features by subscribing now:</p>
            
            <a href="{{subscribe_url}}" class="button">Subscribe Now - ${{amount}}/{{billing_period}}</a>
            
            <h3>What Happens When Trial Ends?</h3>
            <ul>
                <li>Your account will be downgraded</li>
                <li>Premium features will be disabled</li>
                <li>Your data remains safe and accessible</li>
            </ul>
            
            <p>Questions? Reply to this email or contact support@yourdomain.com</p>
        </div>
    </div>
</body>
</html>
```

## 3. Template Variables Reference

### Common Variables Used
```javascript
{
  // User Information
  user_name: "John Doe",
  user_email: "john@example.com",
  
  // Subscription Details
  tier_name: "Barbershop",
  amount: "99.00",
  billing_period: "month", // or "year"
  next_billing_date: "January 15, 2025",
  trial_end_date: "December 31, 2024",
  days_remaining: 3,
  
  // Payment Information
  payment_method: "**** 4242",
  invoice_url: "https://...",
  error_message: "Card declined",
  
  // Action URLs
  dashboard_url: "https://yourdomain.com/dashboard",
  manage_subscription_url: "https://yourdomain.com/settings/billing",
  update_payment_url: "https://yourdomain.com/settings/payment",
  reactivate_url: "https://yourdomain.com/subscribe",
  feedback_url: "https://yourdomain.com/feedback",
  unsubscribe_url: "https://yourdomain.com/unsubscribe",
  
  // Features Array (for iteration)
  features: [
    "Unlimited bookings",
    "Up to 15 barbers",
    "2,000 SMS credits/month",
    // ...
  ]
}
```

## 4. Implementation in Code

### Update Email Service
```javascript
// In /services/email-notification-service.js

const templateIds = {
  welcome: 'd-welcome-subscription',
  paymentSuccess: 'd-payment-success',
  paymentFailed: 'd-payment-failed',
  cancelled: 'd-subscription-cancelled',
  trialEnding: 'd-trial-ending'
}

async function sendEmail(type, to, dynamicData) {
  const msg = {
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME
    },
    templateId: templateIds[type],
    dynamicTemplateData: dynamicData
  }
  
  try {
    await sgMail.send(msg)
    console.log(`Email sent: ${type} to ${to}`)
  } catch (error) {
    console.error('SendGrid error:', error)
    throw error
  }
}
```

## 5. Testing Templates

### SendGrid Template Testing
1. In SendGrid Dashboard → Dynamic Templates
2. Select your template → Test Your Template
3. Add test data JSON:
```json
{
  "user_name": "Test User",
  "tier_name": "Barbershop",
  "amount": "99.00",
  "billing_period": "month",
  "next_billing_date": "January 15, 2025",
  "features": [
    "Unlimited bookings",
    "Up to 15 barbers"
  ],
  "dashboard_url": "https://example.com/dashboard"
}
```
4. Send test email to your address

### Code Testing
```javascript
// Test script: /scripts/test-email-templates.js
const { sendSubscriptionEmail } = require('../services/email-notification-service')

async function testEmails() {
  const testEmail = 'test@yourdomain.com'
  
  // Test welcome email
  await sendSubscriptionEmail('welcome', testEmail, {
    user_name: 'Test User',
    tier_name: 'Barbershop',
    amount: '99.00',
    billing_period: 'month',
    features: ['Unlimited bookings', 'Up to 15 barbers'],
    dashboard_url: 'https://yourdomain.com/dashboard'
  })
  
  console.log('Test emails sent!')
}

testEmails()
```

## 6. Email Automation Rules

### Configure in SendGrid
1. **Welcome Series**:
   - Day 0: Welcome email (immediate)
   - Day 1: Getting started guide
   - Day 3: Feature highlights
   - Day 7: Check-in email

2. **Payment Reminders**:
   - 3 days before: Payment reminder
   - 1 day after failure: First retry notice
   - 3 days after: Urgent notice
   - 7 days after: Final warning

3. **Engagement Emails**:
   - Monthly: Usage report
   - Quarterly: Feature updates
   - Annually: Year in review

## 7. Monitoring & Analytics

### Track Email Performance
1. **SendGrid Analytics**:
   - Open rates by template
   - Click rates on CTAs
   - Bounce and spam rates

2. **Custom Tracking**:
```javascript
// Add to email service
async function trackEmailEvent(event, data) {
  await supabase.from('email_analytics').insert({
    event_type: event,
    template_id: data.templateId,
    recipient: data.to,
    timestamp: new Date().toISOString(),
    metadata: data
  })
}
```

## 8. Compliance & Best Practices

### GDPR Compliance
- Include unsubscribe link in all emails
- Track consent for marketing emails
- Provide data export options

### CAN-SPAM Compliance
- Accurate "From" information
- Clear subject lines
- Physical mailing address in footer
- Honor opt-out requests within 10 days

### Email Best Practices
- Mobile-responsive designs
- Plain text alternatives
- Preheader text optimization
- A/B testing subject lines
- Optimal send times (Tue-Thu, 10 AM)

## 9. Troubleshooting

### Common Issues
1. **Emails not sending**:
   - Check API key permissions
   - Verify sender authentication
   - Check SendGrid service status

2. **Low open rates**:
   - Review subject lines
   - Check spam score
   - Verify sender reputation

3. **Template rendering issues**:
   - Validate dynamic data
   - Check variable names
   - Test with minimal data

## 10. Quick Setup Checklist

- [ ] Create SendGrid account
- [ ] Verify sender domain
- [ ] Create all 5 email templates
- [ ] Add template IDs to code
- [ ] Test each template
- [ ] Configure automation rules
- [ ] Set up email analytics
- [ ] Test in production
- [ ] Monitor first week performance
- [ ] Optimize based on metrics

## Support Resources

- SendGrid Documentation: https://docs.sendgrid.com
- Template Editor: https://app.sendgrid.com/dynamic_templates
- API Reference: https://docs.sendgrid.com/api-reference
- Support: support@sendgrid.com

---

Last Updated: December 2024
Version: 1.0.0
# Novu Notification Setup Guide

## Overview
This guide walks through setting up Novu notification workflows for the 6FB AI Agent System.

## Prerequisites
1. Novu account created at https://web.novu.co
2. Environment variables configured:
   - `NOVU_API_KEY`
   - `NEXT_PUBLIC_NOVU_APP_IDENTIFIER`

## Step 1: Create Novu Application

### 1.1 Sign up and Create App
1. Visit https://web.novu.co
2. Sign up or log in
3. Create new application: "6FB AI Agent"
4. Copy Application Identifier → `NEXT_PUBLIC_NOVU_APP_IDENTIFIER`
5. Generate API Key → `NOVU_API_KEY`

### 1.2 Configure Environment
```bash
# Add to .env.local
NOVU_API_KEY=your_novu_api_key_here
NEXT_PUBLIC_NOVU_APP_IDENTIFIER=your_app_identifier_here
```

## Step 2: Create Notification Workflows

### 2.1 Welcome Sequence Workflow

**Workflow ID:** `welcome-sequence`

**Steps:**
1. **Email Step**
   - Name: "Welcome Email"
   - Subject: `Welcome to 6FB AI Agent - Your Smart Barbershop Assistant`
   - Content: Use template from `config/novu-templates.js`
   - Variables: `firstName`, `dashboardUrl`, `helpUrl`

2. **In-App Step**
   - Name: "Welcome Notification"
   - Content: `Welcome to 6FB AI Agent! Complete your setup to unlock powerful insights.`
   - CTA: Button "Get Started" → `/onboarding`

3. **Email Step (Delayed)**
   - Name: "Setup Reminder"
   - Delay: 24 hours
   - Subject: `Complete Your 6FB AI Setup (Quick 5-minute setup)`
   - Content: Use reminder template
   - Conditions: Only if user hasn't completed onboarding

### 2.2 Booking Workflow

**Workflow ID:** `booking-workflow`

**Steps:**
1. **Email Step**
   - Name: "Booking Confirmation"
   - Subject: `Booking Confirmed - {{serviceName}} with {{barberName}}`
   - Variables: `serviceName`, `barberName`, `appointmentDate`, `appointmentTime`, etc.

2. **SMS Step (Delayed)**
   - Name: "24h Reminder"
   - Delay: 24 hours before appointment
   - Content: `Reminder: {{serviceName}} appointment tomorrow at {{appointmentTime}}`
   - Conditions: Only if appointment is still active

3. **Push Step (Delayed)**
   - Name: "2h Reminder"
   - Delay: 2 hours before appointment
   - Title: `Appointment in 2 hours`
   - Content: `{{serviceName}} with {{barberName}} at {{appointmentTime}}`

### 2.3 AI Insights Workflow

**Workflow ID:** `ai-insights`

**Steps:**
1. **In-App Step**
   - Name: "New Insight Available"
   - Content: `🤖 New AI insight: {{insightTitle}}`
   - CTA: "View Insight" → `/insights/{{insightId}}`

2. **Email Step (Digest)**
   - Name: "Weekly Insights Digest"
   - Schedule: Weekly (Sunday 9 AM)
   - Subject: `Your Weekly Business Insights from 6FB AI`
   - Content: Multiple insights with metrics

### 2.4 Payment Notifications

**Workflow ID:** `payment-notifications`

**Steps:**
1. **Email Step**
   - Name: "Payment Received"
   - Subject: `Payment Received - ${{amount}} from {{customerName}}`
   - Variables: `amount`, `customerName`, `serviceName`, etc.

2. **Email Step**
   - Name: "Subscription Renewal"
   - Subject: `Your 6FB AI subscription has been renewed`
   - Variables: `planName`, `amount`, `features`, `nextBillingDate`

### 2.5 Customer Engagement

**Workflow ID:** `customer-engagement`

**Steps:**
1. **Email Step (Delayed)**
   - Name: "Post-Service Follow-up"
   - Delay: 1 hour after service
   - Subject: `How was your experience at {{shopName}}?`
   - Include rating buttons and rebooking CTA

2. **Email Step (Delayed)**
   - Name: "Win-back Campaign"
   - Delay: 45 days since last visit
   - Subject: `We miss you at {{shopName}} - 20% off your next visit`
   - Include discount code and special offers

### 2.6 System Alerts

**Workflow ID:** `system-alerts`

**Steps:**
1. **Email Step**
   - Name: "High Error Rate Alert"
   - Subject: `🚨 Alert: High Error Rate Detected`
   - Priority: High
   - Variables: `errorRate`, `timePeriod`, `affectedServices`

## Step 3: Configure Email Templates

### 3.1 Email Design
1. Go to Workflows → Select workflow → Email step
2. Use the visual editor or HTML editor
3. Add variables using `{{variableName}}` syntax
4. Preview with test data

### 3.2 Styling Guidelines
- Use consistent brand colors (#6366f1 primary, #10b981 success)
- Include clear CTAs with button styling
- Make emails mobile-responsive
- Add unsubscribe links (required)

### 3.3 Template Variables
Ensure all variables from `novu-templates.js` are properly mapped:

**Common Variables:**
- `firstName`, `lastName`
- `dashboardUrl`, `helpUrl`
- `shopName`, `shopAddress`
- `customerName`, `customerEmail`

**Service-Specific Variables:**
- Booking: `serviceName`, `barberName`, `appointmentTime`
- Payment: `amount`, `paymentMethod`, `paymentDate`
- Insights: `insightTitle`, `insightDescription`, `confidence`

## Step 4: Set Up SMS Provider

### 4.1 Configure SMS Provider
1. Go to Integration Store → SMS
2. Choose provider (Twilio recommended)
3. Add credentials:
   - Account SID
   - Auth Token
   - Phone Number

### 4.2 SMS Templates
Keep SMS messages under 160 characters:
```
Reminder: {{serviceName}} appointment tomorrow at {{appointmentTime}} with {{barberName}} at {{shopName}}. Reply CANCEL to cancel.
```

## Step 5: Configure Push Notifications

### 5.1 FCM Setup (Web Push)
1. Go to Integration Store → Push
2. Configure Firebase Cloud Messaging
3. Add Firebase config to frontend
4. Test push notifications

### 5.2 Push Templates
```json
{
  "title": "Appointment in 2 hours",
  "body": "{{serviceName}} with {{barberName}} at {{appointmentTime}}",
  "icon": "/icon-192x192.png",
  "badge": "/badge-72x72.png",
  "actions": [
    {
      "action": "view",
      "title": "View Details"
    }
  ]
}
```

## Step 6: Testing Workflows

### 6.1 Test Environment Setup
1. Create test workflows (append `-test` to IDs)
2. Use test data for all variables
3. Set up test subscriber

### 6.2 Test Scenarios
```javascript
// Test welcome sequence
await novuService.sendWelcomeSequence('test-user-1', {
  firstName: 'John',
  email: 'john@example.com'
})

// Test booking confirmation
await novuService.sendBookingConfirmation('test-user-1', {
  serviceName: 'Haircut & Style',
  barberName: 'Mike Johnson',
  appointmentTime: new Date('2024-12-15T14:00:00'),
  // ... other booking details
})
```

### 6.3 Validation Checklist
- [ ] All email templates render correctly
- [ ] Variables are properly substituted
- [ ] CTAs link to correct URLs
- [ ] SMS messages are under character limit
- [ ] Push notifications display properly
- [ ] Delayed steps trigger at correct times
- [ ] Conditions work as expected

## Step 7: Production Deployment

### 7.1 Environment Configuration
```bash
# Production environment variables
NOVU_API_KEY=your_production_api_key
NEXT_PUBLIC_NOVU_APP_IDENTIFIER=your_production_app_id
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 7.2 Monitoring Setup
1. Enable workflow analytics in Novu dashboard
2. Set up alerts for failed notifications
3. Monitor delivery rates and engagement

### 7.3 Performance Optimization
- Use subscriber preferences to reduce unwanted notifications
- Implement rate limiting for bulk sends
- Use digest mode for high-frequency notifications
- Archive old workflows and data

## Step 8: Advanced Configuration

### 8.1 User Preferences
```javascript
// Allow users to customize notification preferences
await novuService.updatePreferences('user-id', {
  enabled: true,
  channels: {
    email: true,
    sms: false,
    push: true,
    in_app: true
  }
})
```

### 8.2 A/B Testing
1. Create workflow variants
2. Split traffic between versions
3. Measure engagement metrics
4. Optimize based on results

### 8.3 Internationalization
1. Create workflow variants for different languages
2. Use subscriber locale to route to correct variant
3. Translate all template content

## Troubleshooting

### Common Issues

1. **Notifications not sending**
   - Check API key validity
   - Verify workflow is active
   - Confirm subscriber exists

2. **Variables not substituting**
   - Check variable names match exactly
   - Ensure data is passed correctly
   - Verify template syntax

3. **Delays not working**
   - Check timezone settings
   - Verify delay configuration
   - Confirm workflow is not paused

4. **SMS not delivered**
   - Verify phone number format
   - Check SMS provider configuration
   - Confirm account has credits

### Debug Tools
```javascript
// Enable debug logging
process.env.NOVU_DEBUG = 'true'

// Test individual workflow steps
const result = await novuService.sendNotification(
  'workflow-id',
  'subscriber-id',
  { testData: true }
)
console.log('Result:', result)
```

## Best Practices

1. **Template Design**
   - Keep templates simple and focused
   - Use clear, actionable subject lines
   - Include obvious CTAs
   - Test on multiple devices

2. **Timing**
   - Respect user timezones
   - Avoid sending during off-hours
   - Space out notifications appropriately
   - Use intelligent delay timing

3. **Personalization**
   - Always include user's name
   - Reference specific actions/data
   - Customize content based on user type
   - Use dynamic content blocks

4. **Compliance**
   - Include unsubscribe links
   - Honor user preferences
   - Follow CAN-SPAM guidelines
   - Implement GDPR requirements

---

For additional help, refer to:
- Novu Documentation: https://docs.novu.co
- Template examples: `/config/novu-templates.js`
- Service implementation: `/services/novu-service.js`
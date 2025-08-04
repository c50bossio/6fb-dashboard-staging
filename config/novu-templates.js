/**
 * Novu Notification Templates Configuration
 * 
 * This file contains all notification workflow templates for the 6FB AI Agent System.
 * These templates need to be created in the Novu dashboard.
 */

export const novuTemplates = {
  // Welcome workflow for new users
  WELCOME_SEQUENCE: {
    identifier: 'welcome-sequence',
    name: 'Welcome Sequence',
    description: 'Multi-step onboarding sequence for new barbershop owners',
    steps: [
      {
        type: 'email',
        name: 'Welcome Email',
        subject: 'Welcome to 6FB AI Agent - Your Smart Barbershop Assistant',
        template: `
          <h1>Welcome to 6FB AI Agent, {{firstName}}!</h1>
          <p>We're excited to help you transform your barbershop with AI-powered insights and automation.</p>
          
          <h2>🚀 Get Started in 3 Steps:</h2>
          <ol>
            <li><strong>Complete your profile</strong> - Add your barbershop details</li>
            <li><strong>Connect your calendar</strong> - Sync your booking system</li>
            <li><strong>Explore AI insights</strong> - See what your data reveals</li>
          </ol>
          
          <a href="{{dashboardUrl}}/onboarding" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
            Complete Setup
          </a>
          
          <p>Need help? Reply to this email or check out our <a href="{{helpUrl}}">Getting Started Guide</a>.</p>
          
          <p>Best regards,<br>The 6FB AI Team</p>
        `,
        variables: ['firstName', 'dashboardUrl', 'helpUrl']
      },
      {
        type: 'in_app',
        name: 'Welcome Notification',
        content: 'Welcome to 6FB AI Agent! Complete your setup to unlock powerful insights.',
        cta: {
          text: 'Get Started',
          url: '/onboarding'
        }
      },
      {
        type: 'email',
        name: 'Setup Reminder',
        subject: 'Complete Your 6FB AI Setup (Quick 5-minute setup)',
        template: `
          <h1>Don't miss out on powerful insights, {{firstName}}!</h1>
          <p>You're just a few clicks away from unlocking AI-powered growth for your barbershop.</p>
          
          <h2>🎯 What you'll get:</h2>
          <ul>
            <li>📊 Real-time business analytics</li>
            <li>🤖 AI-powered customer insights</li>
            <li>📅 Smart scheduling optimization</li>
            <li>💰 Revenue growth recommendations</li>
          </ul>
          
          <a href="{{dashboardUrl}}/onboarding" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
            Complete Setup Now (5 min)
          </a>
        `,
        delay: '24h',
        variables: ['firstName', 'dashboardUrl']
      }
    ]
  },

  // Booking confirmation and reminders
  BOOKING_WORKFLOW: {
    identifier: 'booking-workflow',
    name: 'Booking Confirmation & Reminders',
    description: 'Complete booking lifecycle notifications',
    steps: [
      {
        type: 'email',
        name: 'Booking Confirmation',
        subject: 'Booking Confirmed - {{serviceName}} with {{barberName}}',
        template: `
          <h1>Your booking is confirmed! ✅</h1>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>📅 Appointment Details</h2>
            <p><strong>Service:</strong> {{serviceName}}</p>
            <p><strong>Date:</strong> {{appointmentDate}}</p>
            <p><strong>Time:</strong> {{appointmentTime}}</p>
            <p><strong>Barber:</strong> {{barberName}}</p>
            <p><strong>Duration:</strong> {{duration}} minutes</p>
            <p><strong>Price:</strong> ${{price}}</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>📍 Location</h3>
            <p>{{shopName}}<br>{{shopAddress}}</p>
          </div>
          
          <p><strong>Preparation tips:</strong></p>
          <ul>
            <li>Arrive 5 minutes early</li>
            <li>Bring inspiration photos if desired</li>
            <li>Let us know about any allergies or preferences</li>
          </ul>
          
          <a href="{{rescheduleUrl}}" style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-right: 10px;">
            Reschedule
          </a>
          <a href="{{cancelUrl}}" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
            Cancel
          </a>
        `,
        variables: ['serviceName', 'barberName', 'appointmentDate', 'appointmentTime', 'duration', 'price', 'shopName', 'shopAddress', 'rescheduleUrl', 'cancelUrl']
      },
      {
        type: 'sms',
        name: '24h Reminder',
        content: 'Reminder: {{serviceName}} appointment tomorrow at {{appointmentTime}} with {{barberName}} at {{shopName}}. Reply CANCEL to cancel.',
        delay: '24h',
        variables: ['serviceName', 'appointmentTime', 'barberName', 'shopName']
      },
      {
        type: 'push',
        name: '2h Reminder',
        title: 'Appointment in 2 hours',
        content: '{{serviceName}} with {{barberName}} at {{appointmentTime}}',
        delay: '2h',
        variables: ['serviceName', 'barberName', 'appointmentTime']
      }
    ]
  },

  // AI insights and recommendations
  AI_INSIGHTS: {
    identifier: 'ai-insights',
    name: 'AI Business Insights',
    description: 'Deliver AI-generated business insights to barbershop owners',
    steps: [
      {
        type: 'in_app',
        name: 'New Insight Available',
        content: '🤖 New AI insight: {{insightTitle}}',
        cta: {
          text: 'View Insight',
          url: '/insights/{{insightId}}'
        }
      },
      {
        type: 'email',
        name: 'Weekly Insights Digest',
        subject: 'Your Weekly Business Insights from 6FB AI',
        template: `
          <h1>📊 Your Weekly Business Insights</h1>
          <p>Hi {{firstName}}, here's what the AI discovered about your barbershop this week:</p>
          
          {{#insights}}
          <div style="border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; background: #f8fafc;">
            <h3>{{title}}</h3>
            <p>{{description}}</p>
            <p><strong>Recommendation:</strong> {{recommendation}}</p>
            <p style="color: #6b7280; font-size: 14px;">Confidence: {{confidence}}%</p>
          </div>
          {{/insights}}
          
          <h2>📈 Key Metrics</h2>
          <ul>
            <li>Total bookings: {{totalBookings}} ({{bookingTrend}})</li>
            <li>Revenue: ${{revenue}} ({{revenueTrend}})</li>
            <li>Average booking value: ${{avgBookingValue}}</li>
            <li>Customer retention: {{retentionRate}}%</li>
          </ul>
          
          <a href="{{dashboardUrl}}/insights" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
            View Full Dashboard
          </a>
        `,
        schedule: 'weekly',
        variables: ['firstName', 'insights', 'totalBookings', 'bookingTrend', 'revenue', 'revenueTrend', 'avgBookingValue', 'retentionRate', 'dashboardUrl']
      }
    ]
  },

  // Payment and subscription notifications
  PAYMENT_NOTIFICATIONS: {
    identifier: 'payment-notifications',
    name: 'Payment & Subscription Alerts',
    description: 'Handle all payment-related notifications',
    steps: [
      {
        type: 'email',
        name: 'Payment Received',
        subject: 'Payment Received - ${{amount}} from {{customerName}}',
        template: `
          <h1>💰 Payment Received!</h1>
          
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>Payment Details</h2>
            <p><strong>Amount:</strong> ${{amount}}</p>
            <p><strong>Customer:</strong> {{customerName}}</p>
            <p><strong>Service:</strong> {{serviceName}}</p>
            <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
            <p><strong>Date:</strong> {{paymentDate}}</p>
          </div>
          
          <p>The payment has been automatically processed and added to your account.</p>
          
          <a href="{{dashboardUrl}}/payments" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
            View All Payments
          </a>
        `,
        variables: ['amount', 'customerName', 'serviceName', 'paymentMethod', 'paymentDate', 'dashboardUrl']
      },
      {
        type: 'email',
        name: 'Subscription Renewal',
        subject: 'Your 6FB AI subscription has been renewed',
        template: `
          <h1>✅ Subscription Renewed</h1>
          <p>Your {{planName}} subscription has been successfully renewed for ${{amount}}.</p>
          
          <h2>What's included:</h2>
          {{#features}}
          <p>✓ {{.}}</p>
          {{/features}}
          
          <p><strong>Next billing date:</strong> {{nextBillingDate}}</p>
          
          <a href="{{dashboardUrl}}/billing" style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
            Manage Subscription
          </a>
        `,
        variables: ['planName', 'amount', 'features', 'nextBillingDate', 'dashboardUrl']
      }
    ]
  },

  // Customer engagement workflows
  CUSTOMER_ENGAGEMENT: {
    identifier: 'customer-engagement',
    name: 'Customer Engagement & Retention',
    description: 'Keep customers engaged and coming back',
    steps: [
      {
        type: 'email',
        name: 'Post-Service Follow-up',
        subject: 'How was your experience at {{shopName}}?',
        template: `
          <h1>Thanks for visiting {{shopName}}! 💇‍♂️</h1>
          <p>Hi {{customerName}}, we hope you love your new look!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 18px; margin-bottom: 20px;">How would you rate your experience?</p>
            <a href="{{reviewUrl}}?rating=5" style="background: #fbbf24; color: white; padding: 10px 15px; text-decoration: none; border-radius: 6px; margin: 0 5px;">⭐⭐⭐⭐⭐</a>
            <a href="{{reviewUrl}}?rating=4" style="background: #fbbf24; color: white; padding: 10px 15px; text-decoration: none; border-radius: 6px; margin: 0 5px;">⭐⭐⭐⭐</a>
            <a href="{{reviewUrl}}?rating=3" style="background: #fbbf24; color: white; padding: 10px 15px; text-decoration: none; border-radius: 6px; margin: 0 5px;">⭐⭐⭐</a>
          </div>
          
          <p>🗓️ Ready to book your next appointment?</p>
          <a href="{{bookingUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
            Book Next Appointment
          </a>
          
          <p style="color: #6b7280; font-size: 14px;">Recommended: Book your next appointment in 3-4 weeks to maintain your look.</p>
        `,
        delay: '1h',
        variables: ['shopName', 'customerName', 'reviewUrl', 'bookingUrl']
      },
      {
        type: 'email',
        name: 'Win-back Campaign',
        subject: 'We miss you at {{shopName}} - 20% off your next visit',
        template: `
          <h1>We miss you, {{customerName}}! 💔</h1>
          <p>It's been a while since your last visit to {{shopName}}. Your barber {{barberName}} has been asking about you!</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h2>Special Comeback Offer</h2>
            <p style="font-size: 24px; font-weight: bold; color: #d97706;">20% OFF</p>
            <p>Your next service when you book before {{offerExpiry}}</p>
            <p style="font-size: 14px;">Use code: COMEBACK20</p>
          </div>
          
          <h3>🆕 What's New:</h3>
          <ul>
            <li>New hot towel treatment service</li>
            <li>Extended evening hours</li>
            <li>Online booking with instant confirmation</li>
          </ul>
          
          <a href="{{bookingUrl}}?code=COMEBACK20" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
            Book with 20% Discount
          </a>
        `,
        delay: '45d',
        variables: ['customerName', 'shopName', 'barberName', 'offerExpiry', 'bookingUrl']
      }
    ]
  },

  // System alerts and notifications
  SYSTEM_ALERTS: {
    identifier: 'system-alerts',
    name: 'System Alerts & Notifications',
    description: 'Critical system notifications for platform operators',
    steps: [
      {
        type: 'email',
        name: 'High Error Rate Alert',
        subject: '🚨 Alert: High Error Rate Detected',
        template: `
          <h1>🚨 System Alert: High Error Rate</h1>
          <p>An elevated error rate has been detected in the 6FB AI system.</p>
          
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>Alert Details</h2>
            <p><strong>Error Rate:</strong> {{errorRate}}%</p>
            <p><strong>Time Period:</strong> Last {{timePeriod}} minutes</p>
            <p><strong>Affected Services:</strong> {{affectedServices}}</p>
            <p><strong>First Detected:</strong> {{firstDetected}}</p>
          </div>
          
          <h3>Immediate Actions Required:</h3>
          <ol>
            <li>Check system health dashboard</li>
            <li>Review error logs</li>
            <li>Investigate affected services</li>
            <li>Communicate with affected users if necessary</li>
          </ol>
          
          <a href="{{monitoringUrl}}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
            View Monitoring Dashboard
          </a>
        `,
        variables: ['errorRate', 'timePeriod', 'affectedServices', 'firstDetected', 'monitoringUrl']
      }
    ]
  }
}

// Helper function to get template by identifier
export function getTemplate(identifier) {
  for (const category of Object.values(novuTemplates)) {
    if (category.identifier === identifier) {
      return category
    }
  }
  return null
}

// Function to validate template variables
export function validateTemplateVariables(template, variables) {
  const missing = []
  
  template.steps.forEach(step => {
    if (step.variables) {
      step.variables.forEach(variable => {
        if (!(variable in variables)) {
          missing.push(variable)
        }
      })
    }
  })
  
  return missing
}

export default novuTemplates
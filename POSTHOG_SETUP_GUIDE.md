# PostHog Analytics Setup Guide

## Overview
PostHog is already fully integrated into the 6FB AI Agent System with comprehensive analytics tracking, session recording, and feature flags. You just need to add your PostHog project credentials.

## What's Already Configured ✅

### 1. **Complete Integration**
- ✅ PostHog client and server packages installed (`posthog-js`, `posthog-node`)
- ✅ Comprehensive analytics provider in `/components/analytics/PostHogProvider.js`
- ✅ PostHog client configuration in `/lib/posthog/client.js`
- ✅ Integrated into app layout with SSR handling
- ✅ User identification and authentication tracking
- ✅ Web Vitals performance monitoring

### 2. **Analytics Features**
- **Page View Tracking**: Automatic page navigation tracking
- **User Identification**: Links analytics data to authenticated users
- **Event Tracking**: 20+ predefined business events (bookings, payments, AI chat, etc.)
- **Session Recording**: Records user sessions for debugging and UX analysis
- **Feature Flags**: A/B testing and feature toggle support
- **Performance Monitoring**: Core Web Vitals tracking
- **Custom Properties**: User and event property tracking

### 3. **Predefined Events**
```javascript
// Authentication Events
USER_SIGNED_UP, USER_SIGNED_IN, USER_SIGNED_OUT

// Business Events  
BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_COMPLETED
PAYMENT_INITIATED, PAYMENT_COMPLETED, PAYMENT_FAILED

// AI & Features
CHAT_MESSAGE_SENT, CHAT_MODEL_CHANGED
CALENDAR_EVENT_CREATED, DASHBOARD_VIEWED
```

## Quick Setup (5 Minutes)

### Step 1: Create PostHog Account
1. Go to [PostHog](https://app.posthog.com/signup)
2. Sign up for free account
3. Create new project: **"6FB AI Agent System"**

### Step 2: Get Your API Keys
1. In PostHog dashboard, go to **Settings → Project API Keys**
2. Copy your **Project API Key**
3. Note your **API Host** (usually `https://app.posthog.com`)

### Step 3: Update Environment Variables
In your `.env.local` file, replace the placeholder values:

```env
# PostHog Analytics Configuration
NEXT_PUBLIC_POSTHOG_KEY=phc_your_actual_project_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Step 4: Restart Development Server
```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 5: Verify Setup
1. Visit `http://localhost:9999`
2. Navigate around the dashboard
3. In PostHog dashboard, go to **Activity** - you should see live events
4. Check **Session Recordings** to see user interactions

## Advanced Features Ready to Use

### 1. **Custom Event Tracking**
```javascript
import { trackEvent, EVENTS } from '@/lib/posthog/client'

// Track custom events
trackEvent(EVENTS.BOOKING_CREATED, {
  service_type: 'haircut',
  price: 45,
  barber_id: 'barber_123'
})
```

### 2. **Feature Flags**
```javascript
import { isFeatureEnabled } from '@/lib/posthog/client'

// Check feature flags
if (isFeatureEnabled('new_booking_flow')) {
  // Show new UI
}
```

### 3. **User Properties**
```javascript
import { setUserProperties } from '@/lib/posthog/client'

// Set user properties
setUserProperties({
  subscription_tier: 'premium',
  barbershop_size: 'large',
  monthly_revenue: 15000
})
```

## What You'll Get Immediately

### 1. **Real-time Analytics**
- Live user activity tracking
- Page view analytics
- User journey mapping
- Conversion funnel analysis

### 2. **Session Recordings**
- Watch actual user sessions
- Identify UX issues
- See exactly where users struggle
- Debug issues faster

### 3. **Performance Insights**
- Core Web Vitals monitoring
- Page load time tracking
- User experience metrics
- Performance regression alerts

### 4. **Business Intelligence**
- Booking completion rates
- AI chat usage patterns
- Feature adoption metrics
- Revenue attribution

## PostHog Dashboard Recommendations

### Key Dashboards to Create:
1. **Business Overview**: Bookings, revenue, user growth
2. **AI Usage**: Chat interactions, model preferences, success rates
3. **UX Performance**: Page speeds, error rates, user flows
4. **Feature Adoption**: New feature usage, A/B test results

### Important Insights:
1. **Booking Flow**: Track from discovery to payment completion
2. **AI Effectiveness**: Measure AI chat satisfaction and resolution
3. **User Retention**: Monitor daily/weekly/monthly active users
4. **Revenue Tracking**: Connect user actions to business outcomes

## Privacy & Compliance

### Built-in Privacy Features:
- **GDPR Compliant**: Automatic data retention and deletion
- **Opt-out Support**: Users can disable tracking
- **Data Anonymization**: Personal data masking options
- **Local Storage**: No third-party cookies required

### Security:
- **Self-hosted Option**: Can run on your own infrastructure
- **Data Encryption**: All data encrypted in transit and at rest
- **SOC 2 Certified**: Enterprise security standards

## Troubleshooting

### Common Issues:
1. **No Events Showing**: Check API key is correct and server restarted
2. **Session Recordings Not Working**: Verify PostHog key is public (starts with `phc_`)
3. **Development Mode**: PostHog debug mode automatically enabled in development

### Debug Commands:
```javascript
// In browser console, check PostHog status
posthog.debug()
posthog.isFeatureEnabled('test_flag')
```

## Next Steps After Setup

1. **Create Custom Events**: Track specific business metrics
2. **Set Up Funnels**: Monitor booking and payment flows  
3. **Configure Alerts**: Get notified of important events
4. **A/B Test Features**: Use feature flags for experiments
5. **Analyze User Behavior**: Study session recordings for insights

---

**Total Setup Time**: ~5 minutes  
**Monthly Cost**: Free up to 1M events/month  
**Business Value**: Immediate insights into user behavior and business performance

The 6FB AI Agent System now has enterprise-grade analytics built-in - just add your PostHog credentials!
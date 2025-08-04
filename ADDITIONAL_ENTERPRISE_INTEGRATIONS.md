# Additional Enterprise Integrations Guide

## Overview
This guide covers the additional enterprise SDKs that have been integrated: Novu (notifications), PostHog (analytics), and Vercel Edge Config (feature flags).

## 1. Novu - Advanced Notification Infrastructure

### Overview
Novu provides a unified notification infrastructure supporting email, SMS, push, and in-app notifications with workflow management.

### Implementation

#### Backend Integration (notification_service.py)
```python
from novu import Novu
import os

class NotificationService:
    def __init__(self):
        self.novu = Novu(os.getenv("NOVU_API_KEY"))
    
    async def send_welcome_email(self, user_id: str, email: str, name: str):
        """Send welcome email through Novu workflow"""
        return await self.novu.trigger(
            "welcome-email",
            {
                "subscriberId": user_id,
                "email": email,
                "payload": {
                    "name": name,
                    "dashboard_url": f"{os.getenv('FRONTEND_URL')}/dashboard"
                }
            }
        )
    
    async def send_booking_reminder(self, user_id: str, booking_details: dict):
        """Multi-channel booking reminder"""
        return await self.novu.trigger(
            "booking-reminder",
            {
                "subscriberId": user_id,
                "payload": {
                    "booking_time": booking_details["time"],
                    "service": booking_details["service"],
                    "barber": booking_details["barber_name"]
                }
            }
        )
    
    async def send_insight_notification(self, user_id: str, insight: dict):
        """AI-generated business insight notification"""
        return await self.novu.trigger(
            "business-insight",
            {
                "subscriberId": user_id,
                "payload": {
                    "insight_title": insight["title"],
                    "insight_body": insight["body"],
                    "action_url": f"/insights/{insight['id']}"
                }
            }
        )
```

#### Frontend Component (NovuNotificationCenter.js)
```javascript
'use client'

import { NovuProvider, PopoverNotificationCenter } from '@novu/notification-center'
import { BellIcon } from '@heroicons/react/24/outline'

export default function NovuNotificationCenter({ user }) {
  if (!user) return null

  return (
    <NovuProvider
      subscriberId={user.id}
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER}
    >
      <PopoverNotificationCenter
        colorScheme="light"
        onNotificationClick={(notification) => {
          // Handle notification click
          if (notification.cta?.data?.url) {
            window.location.href = notification.cta.data.url
          }
        }}
      >
        {({ unseenCount }) => (
          <button className="relative p-2">
            <BellIcon className="h-6 w-6" />
            {unseenCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {unseenCount}
              </span>
            )}
          </button>
        )}
      </PopoverNotificationCenter>
    </NovuProvider>
  )
}
```

### Novu Workflow Templates

Create these workflows in the Novu dashboard:

1. **Welcome Email** (welcome-email)
   - Email channel
   - Template with personalization
   - Delay 5 minutes after signup

2. **Booking Reminder** (booking-reminder)
   - Email: 24 hours before
   - SMS: 2 hours before
   - Push: 30 minutes before

3. **Business Insight** (business-insight)
   - In-app notification
   - Email digest (weekly)
   - Push for critical insights

## 2. PostHog - Product Analytics & Feature Flags

### Overview
PostHog provides product analytics, session recording, feature flags, and A/B testing in one platform.

### Implementation

#### Analytics Setup (lib/posthog.js)
```javascript
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

// Initialize PostHog
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: {
      css_selector_allowlist: ['[data-analytics]'], // Only capture marked elements
    },
    session_recording: {
      maskTextSelector: '[data-sensitive]', // Mask sensitive data
    }
  })
}

export { posthog, PHProvider as PostHogProvider }
```

#### Feature Flags Hook (hooks/useFeatureFlag.js)
```javascript
import { useEffect, useState } from 'react'
import { posthog } from '@/lib/posthog'

export function useFeatureFlag(flagName) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkFlag() {
      if (!posthog) {
        setLoading(false)
        return
      }

      try {
        // Wait for PostHog to load
        await posthog.ready()
        
        const enabled = posthog.isFeatureEnabled(flagName)
        setIsEnabled(enabled)
      } catch (error) {
        console.error('Error checking feature flag:', error)
      } finally {
        setLoading(false)
      }
    }

    checkFlag()

    // Listen for flag updates
    const unsubscribe = posthog?.onFeatureFlags((flags) => {
      setIsEnabled(flags[flagName] || false)
    })

    return () => unsubscribe?.()
  }, [flagName])

  return { isEnabled, loading }
}
```

#### Analytics Tracking (lib/analytics.js)
```javascript
import { posthog } from './posthog'

export const analytics = {
  // User events
  identify: (userId, properties = {}) => {
    posthog?.identify(userId, properties)
  },

  // Track custom events
  track: (event, properties = {}) => {
    posthog?.capture(event, properties)
  },

  // Business-specific events
  trackBookingCreated: (booking) => {
    posthog?.capture('booking_created', {
      service_type: booking.service,
      price: booking.price,
      barber_id: booking.barberId,
      time_slot: booking.timeSlot,
    })
  },

  trackInsightViewed: (insight) => {
    posthog?.capture('insight_viewed', {
      insight_type: insight.type,
      insight_id: insight.id,
      recommendation_accepted: false,
    })
  },

  trackSubscriptionStarted: (plan) => {
    posthog?.capture('subscription_started', {
      plan_name: plan.name,
      plan_price: plan.price,
      billing_period: plan.interval,
    })
  },

  // A/B test variants
  getExperimentVariant: (experimentName) => {
    return posthog?.getFeatureFlag(experimentName)
  },
}
```

#### Session Recording Privacy (components/PrivacyWrapper.js)
```javascript
export function PrivacyWrapper({ children, sensitive = false }) {
  return (
    <div data-sensitive={sensitive ? "true" : undefined}>
      {children}
    </div>
  )
}

// Usage in sensitive forms
<PrivacyWrapper sensitive>
  <input type="password" placeholder="Enter password" />
  <input type="text" placeholder="Credit card number" />
</PrivacyWrapper>
```

### PostHog Configuration

1. **Feature Flags**
   ```
   - ai-insights-v2: New AI insights algorithm
   - advanced-calendar: Enhanced calendar features
   - real-time-chat: Live chat support
   - premium-analytics: Advanced analytics dashboard
   ```

2. **Events to Track**
   - User signup/login
   - Booking creation/cancellation
   - Payment events
   - AI interactions
   - Feature usage

3. **Dashboards**
   - User acquisition funnel
   - Feature adoption metrics
   - Revenue analytics
   - AI usage patterns

## 3. Vercel Edge Config - Dynamic Configuration

### Overview
Vercel Edge Config provides ultra-low latency configuration updates without redeployment.

### Implementation

#### Edge Config Client (lib/edgeConfig.js)
```javascript
import { get } from '@vercel/edge-config'

export const edgeConfig = {
  // Get single value
  getValue: async (key) => {
    try {
      return await get(key)
    } catch (error) {
      console.error('Edge Config error:', error)
      return null
    }
  },

  // Get all config
  getAll: async () => {
    try {
      return await get()
    } catch (error) {
      console.error('Edge Config error:', error)
      return {}
    }
  },

  // Business-specific configs
  getMaintenanceMode: async () => {
    return await get('maintenanceMode') || false
  },

  getRateLimits: async () => {
    return await get('rateLimits') || {
      api: 100,
      ai: 10,
      booking: 50
    }
  },

  getFeatureFlags: async () => {
    return await get('featureFlags') || {}
  },

  getAIConfig: async () => {
    return await get('aiConfig') || {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    }
  }
}
```

#### Middleware Integration (middleware.js)
```javascript
import { NextResponse } from 'next/server'
import { get } from '@vercel/edge-config'

export async function middleware(request) {
  // Check maintenance mode
  const maintenanceMode = await get('maintenanceMode')
  if (maintenanceMode && !request.url.includes('/maintenance')) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  // Rate limiting
  const rateLimits = await get('rateLimits')
  const clientIp = request.ip || 'unknown'
  
  // Implement rate limiting logic here
  
  // Feature flags for edge routing
  const featureFlags = await get('featureFlags')
  if (featureFlags?.newDashboard && request.url.includes('/dashboard')) {
    return NextResponse.rewrite(new URL('/dashboard-v2', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

#### Dynamic AI Configuration (services/dynamicAI.js)
```javascript
import { edgeConfig } from '@/lib/edgeConfig'
import OpenAI from 'openai'

export class DynamicAIService {
  async getAIClient() {
    const config = await edgeConfig.getAIConfig()
    
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      defaultQuery: {
        model: config.model || 'gpt-4',
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1000,
      }
    })
  }

  async generateInsight(prompt, context) {
    const client = await this.getAIClient()
    const config = await edgeConfig.getAIConfig()
    
    // Use dynamic prompt templates
    const promptTemplate = config.promptTemplates?.businessInsight || 
      "Generate a business insight for: {prompt}"
    
    const response = await client.chat.completions.create({
      messages: [
        { role: 'system', content: config.systemPrompt || 'You are a business advisor.' },
        { role: 'user', content: promptTemplate.replace('{prompt}', prompt) }
      ]
    })
    
    return response.choices[0].message.content
  }
}
```

### Edge Config Schema

```json
{
  "maintenanceMode": false,
  "rateLimits": {
    "api": 100,
    "ai": 10,
    "booking": 50
  },
  "featureFlags": {
    "aiInsightsV2": true,
    "advancedCalendar": false,
    "realTimeChat": true,
    "premiumAnalytics": true
  },
  "aiConfig": {
    "model": "gpt-4-turbo",
    "temperature": 0.7,
    "maxTokens": 1500,
    "systemPrompt": "You are an expert business advisor for barbershops...",
    "promptTemplates": {
      "businessInsight": "Analyze this data and provide actionable insights: {prompt}",
      "customerAnalysis": "Evaluate customer behavior patterns: {prompt}"
    }
  },
  "pricingTiers": {
    "starter": { "price": 99, "features": ["basic"] },
    "professional": { "price": 299, "features": ["basic", "ai", "analytics"] },
    "enterprise": { "price": null, "features": ["all"] }
  }
}
```

## Integration Benefits

### 1. Novu Benefits
- **Unified Notifications**: Single API for all channels
- **Workflow Management**: Visual notification flows
- **User Preferences**: Built-in preference management
- **Delivery Tracking**: Monitor notification performance
- **Template Management**: Centralized message templates

### 2. PostHog Benefits
- **Privacy-First Analytics**: Self-hosted option available
- **Session Recording**: Understand user behavior
- **Feature Flags**: Safe feature rollouts
- **A/B Testing**: Data-driven decisions
- **Cohort Analysis**: User segmentation

### 3. Edge Config Benefits
- **Zero Latency**: Cached at edge locations
- **No Redeploy**: Update config without deployment
- **Gradual Rollouts**: Percentage-based features
- **Emergency Controls**: Instant maintenance mode
- **Dynamic Pricing**: Update plans instantly

## Cost Considerations

### Monthly Costs
```
Novu (Growth):          $125/month (100k notifications)
PostHog (Growth):       $450/month (1M events)
Vercel Edge Config:     Included with Vercel Pro
------------------------------------------------------
Additional Total:       ~$575/month
```

### Total Enterprise Stack
```
Previous:               $165/month
Additional:             $575/month
------------------------------------------------------
Grand Total:            ~$740/month

Scale Pricing:
- Startup (0-1k users):      ~$300/month
- Growth (1k-10k users):     ~$740/month  
- Scale (10k-50k users):     ~$2,500/month
- Enterprise (50k+ users):   Custom pricing
```

## Next Steps

1. **Configure Novu Workflows**
   - Design notification templates
   - Set up multi-channel workflows
   - Configure user preferences

2. **Setup PostHog Tracking**
   - Define key events
   - Create dashboards
   - Configure feature flags

3. **Populate Edge Config**
   - Add initial configuration
   - Set up staging/production configs
   - Plan configuration strategy

4. **Test Integrations**
   - Verify notification delivery
   - Test analytics tracking
   - Validate edge config updates

---

These additional integrations complete the enterprise transformation with advanced notification management, comprehensive analytics, and dynamic configuration capabilities.
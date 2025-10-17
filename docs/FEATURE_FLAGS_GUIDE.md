# 🚀 Feature Flag System Documentation

## Overview

The 6FB AI Agent System includes a robust, production-ready feature flag system with comprehensive capabilities:

- **Real-time Updates**: Instant flag changes via Supabase realtime
- **User Segmentation**: Advanced targeting rules and user attributes
- **A/B Testing**: Built-in experimentation with consistent bucketing
- **Analytics Integration**: Comprehensive tracking and reporting
- **Error Boundaries**: Production-safe fallback mechanisms
- **Admin Interface**: Full-featured management dashboard
- **Performance Monitoring**: Real-time metrics and alerting

## Quick Start

### 1. Database Setup

First, run the database migrations:

```sql
-- In your Supabase SQL editor:
-- 1. Run: database/feature-flags-schema.sql
-- 2. Run: database/feature-flags-analytics-schema.sql
```

### 2. Basic Usage

```jsx
import { useFeatureFlag, FEATURE_FLAGS } from '../hooks/useFeatureFlag'

function BookingComponent() {
  const { isEnabled, loading, variant } = useFeatureFlag(
    FEATURE_FLAGS.ENHANCED_BOOKING_FLOW
  )

  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {isEnabled ? (
        <EnhancedBookingForm variant={variant} />
      ) : (
        <StandardBookingForm />
      )}
    </div>
  )
}
```

### 3. With Error Boundaries

```jsx
import { FeatureFlagErrorBoundary } from '../components/FeatureFlagErrorBoundary'

function App() {
  return (
    <FeatureFlagErrorBoundary 
      flagName="enhanced-booking-flow"
      fallback={({ onRetry }) => (
        <div>
          Something went wrong with the booking system.
          <button onClick={onRetry}>Try Again</button>
        </div>
      )}
    >
      <BookingComponent />
    </FeatureFlagErrorBoundary>
  )
}
```

## Advanced Features

### A/B Testing

```jsx
import { useABTest } from '../hooks/useFeatureFlag'

function PricingComponent() {
  const { variant } = useABTest('pricing-experiment', [
    'control',
    'discount_10',
    'discount_20'
  ])

  const getDiscount = () => {
    switch (variant) {
      case 'discount_10': return 0.10
      case 'discount_20': return 0.20
      default: return 0
    }
  }

  return (
    <PricingCard discount={getDiscount()} />
  )
}
```

### User Segmentation

```jsx
const { isEnabled } = useFeatureFlag('premium-features', {
  userAttributes: {
    subscription_tier: 'premium',
    location: 'US',
    registration_date: user.created_at
  }
})
```

### Multiple Flags

```jsx
import { useFeatureFlags } from '../hooks/useFeatureFlag'

function Dashboard() {
  const { flags, loading } = useFeatureFlags([
    'advanced-analytics',
    'mobile-optimization',
    'realtime-availability'
  ])

  return (
    <div>
      {flags['advanced-analytics'] && <AdvancedAnalytics />}
      {flags['mobile-optimization'] && <MobileOptimizedUI />}
      {flags['realtime-availability'] && <RealtimeBooking />}
    </div>
  )
}
```

### Business Metrics Tracking

```jsx
import { getFeatureFlagAnalytics } from '../lib/feature-flag-analytics'

function CheckoutButton() {
  const { isEnabled } = useFeatureFlag('one-click-checkout')
  const analytics = getFeatureFlagAnalytics()

  const handleCheckout = () => {
    // Track business metric
    analytics.trackBusinessMetric('one-click-checkout', 'conversion', 1, {
      conversion: true,
      checkout_amount: orderTotal,
      user_segment: userSegment
    })

    // Process checkout
    processCheckout()
  }

  return (
    <button onClick={handleCheckout}>
      {isEnabled ? 'Buy Now' : 'Add to Cart'}
    </button>
  )
}
```

## Admin Management

### Using the Admin Interface

```jsx
import FeatureFlagAdminPanel from '../components/admin/FeatureFlagAdmin'

function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <FeatureFlagAdminPanel />
    </div>
  )
}
```

### Programmatic Management

```jsx
import { FeatureFlagAdmin } from '../hooks/useFeatureFlag'

// Create a new flag
await FeatureFlagAdmin.createFlag({
  name: 'new-feature',
  description: 'My awesome new feature',
  enabled: false,
  environment: 'development',
  metadata: { 
    category: 'booking',
    risk_level: 'low'
  }
})

// Update existing flag
await FeatureFlagAdmin.updateFlag('new-feature', {
  enabled: true,
  rollout_percentage: 50
})

// Add targeting rule
await FeatureFlagAdmin.addTargetingRule('new-feature', {
  name: 'Premium Users Only',
  enabled: true,
  priority: 100,
  conditions: [
    {
      property: 'subscription_tier',
      operator: 'equals',
      value: 'premium'
    }
  ],
  enabled_override: true
})
```

## Targeting Rules

### Condition Operators

- `equals` / `not_equals`: Exact matching
- `contains` / `not_contains`: String/array contains
- `greater_than` / `less_than`: Numeric comparison
- `in` / `not_in`: Array membership
- `regex`: Regular expression matching
- `percentage`: Percentage-based rollout

### Example Targeting Rules

```javascript
// Target beta users
{
  conditions: [
    {
      property: 'email',
      operator: 'contains',
      value: '+beta'
    }
  ],
  enabled_override: true
}

// Geographic targeting
{
  conditions: [
    {
      property: 'location',
      operator: 'in',
      value: ['US', 'CA', 'UK']
    }
  ],
  enabled_override: true
}

// Percentage rollout
{
  conditions: [
    {
      property: 'user_id',
      operator: 'percentage',
      value: 25 // 25% of users
    }
  ],
  enabled_override: true
}

// Multiple conditions (AND logic)
{
  conditions: [
    {
      property: 'subscription_tier',
      operator: 'equals',
      value: 'premium'
    },
    {
      property: 'created_at',
      operator: 'less_than',
      value: '2024-01-01'
    }
  ],
  enabled_override: true
}
```

## Analytics and Monitoring

### Performance Tracking

```jsx
function BookingForm() {
  const startTime = performance.now()
  const { isEnabled } = useFeatureFlag('enhanced-booking', {
    onEvaluate: (result) => {
      const evaluationTime = performance.now() - startTime
      analytics.recordPerformanceMetric(
        'enhanced-booking', 
        'evaluation_time', 
        evaluationTime
      )
    }
  })

  return <form>...</form>
}
```

### Error Monitoring

```jsx
import { useFeatureFlagError } from '../components/FeatureFlagErrorBoundary'

function MyComponent() {
  const { reportError, isFeatureFlagError } = useFeatureFlagError()

  const handleError = (error) => {
    reportError('my-feature', error, {
      component: 'MyComponent',
      user_action: 'button_click'
    })
  }

  return <button onClick={riskyOperation}>Click Me</button>
}
```

### Analytics Queries

```javascript
import { FeatureFlagAnalyticsQuery } from '../lib/feature-flag-analytics'

const analytics = new FeatureFlagAnalyticsQuery()

// Get usage stats
const stats = await analytics.getFlagUsageStats(
  'enhanced-booking',
  new Date('2024-01-01'),
  new Date('2024-01-31')
)

// Get A/B test results
const abResults = await analytics.getABTestResults(
  'pricing-experiment',
  new Date('2024-01-01'),
  new Date('2024-01-31')
)

// Get error analytics
const errors = await analytics.getErrorAnalytics(
  'enhanced-booking',
  new Date('2024-01-01'),
  new Date('2024-01-31')
)
```

## Production Best Practices

### 1. Error Handling

Always wrap feature flag components in error boundaries:

```jsx
<FeatureFlagErrorBoundary flagName="my-feature">
  <MyFeatureComponent />
</FeatureFlagErrorBoundary>
```

### 2. Fallback Values

Provide sensible defaults for all flags:

```jsx
const { isEnabled } = useFeatureFlag('risky-feature', {
  defaultValue: false,
  fallbackBehavior: 'disable' // 'disable', 'enable', 'default'
})
```

### 3. Performance Considerations

- Use caching for frequently accessed flags
- Batch multiple flag evaluations
- Monitor evaluation performance

```jsx
// Good: Batch multiple flags
const { flags } = useFeatureFlags([
  'feature-a',
  'feature-b', 
  'feature-c'
])

// Less optimal: Multiple individual hooks
const flagA = useFeatureFlag('feature-a')
const flagB = useFeatureFlag('feature-b')
const flagC = useFeatureFlag('feature-c')
```

### 4. Testing

Mock feature flags in tests:

```javascript
// In your test setup
jest.mock('../hooks/useFeatureFlag', () => ({
  useFeatureFlag: (flagName) => ({
    isEnabled: flagName === 'test-enabled-flag',
    loading: false,
    error: null,
    variant: 'control'
  })
}))
```

### 5. Environment Management

Use different flag configurations per environment:

```jsx
const { isEnabled } = useFeatureFlag('experimental-feature', {
  defaultValue: process.env.NODE_ENV === 'development'
})
```

## Predefined Flags

The system includes these predefined flags:

```javascript
export const FEATURE_FLAGS = {
  ENHANCED_BOOKING_FLOW: 'enhanced-booking-flow',
  MOBILE_BOOKING_OPTIMIZATION: 'mobile-booking-optimization',
  REALTIME_AVAILABILITY: 'realtime-availability', 
  BOOKING_ADDONS: 'booking-addons',
  AI_SMART_SCHEDULING: 'ai-smart-scheduling',
  ADVANCED_ANALYTICS: 'advanced-analytics',
  VOICE_BOOKING: 'voice-booking',
  VIDEO_CONSULTATIONS: 'video-consultations',
  LOYALTY_PROGRAM: 'loyalty-program',
  MULTI_LOCATION_BOOKING: 'multi-location-booking'
}
```

## Troubleshooting

### Common Issues

1. **Flags not updating in real-time**
   - Check Supabase realtime is enabled
   - Verify RLS policies allow access
   - Check browser network tab for subscription errors

2. **Permission errors**
   - Verify user has correct role/permissions
   - Check RLS policies in database
   - Ensure barbershop_id is set correctly

3. **Performance issues**
   - Enable caching: `enableRealtime: false` for static flags
   - Reduce batch size and increase flush interval
   - Check database indexes are created

4. **A/B test inconsistencies**
   - Verify user ID is stable across sessions
   - Check bucketing algorithm
   - Ensure variant definitions match

### Debug Mode

Enable debug logging:

```javascript
// In development
localStorage.setItem('debug-feature-flags', 'true')

// Programmatically
const { refresh } = useFeatureFlag('my-flag')
console.log('Refreshing flag evaluation...')
refresh()
```

### Monitoring Checklist

- [ ] Error rates < 5%
- [ ] Evaluation time < 100ms
- [ ] Cache hit rate > 80%
- [ ] Real-time subscriptions active
- [ ] Database query performance
- [ ] Analytics data flowing correctly

## API Reference

### useFeatureFlag(flagName, options)

**Parameters:**
- `flagName` (string): The feature flag name
- `options` (object): Configuration options
  - `defaultValue` (boolean): Default state if flag not found
  - `userAttributes` (object): User attributes for targeting
  - `enableRealtime` (boolean): Enable real-time updates
  - `enableAnalytics` (boolean): Track usage analytics
  - `fallbackBehavior` (string): 'default', 'enable', or 'disable'

**Returns:**
- `isEnabled` (boolean): Current flag state
- `loading` (boolean): Loading state
- `error` (string): Error message if any
- `variant` (string): A/B test variant
- `metadata` (object): Flag metadata
- `refresh` (function): Force refresh flag state

### useFeatureFlags(flagNames, options)

**Parameters:**
- `flagNames` (string[]): Array of flag names
- `options` (object): Configuration options (same as useFeatureFlag)

**Returns:**
- `flags` (object): Object with flag states
- `loading` (boolean): Overall loading state

### useABTest(experimentName, variants, options)

**Parameters:**
- `experimentName` (string): Experiment name
- `variants` (string[]): Available variants
- `options` (object): Configuration options

**Returns:**
- `variant` (string): Assigned variant
- `isEnabled` (boolean): Whether experiment is active
- `loading` (boolean): Loading state
- `metadata` (object): Experiment metadata

## Migration Guide

### From Vercel Edge Config

If migrating from the existing Vercel Edge Config system:

1. Keep existing flags in Vercel for backwards compatibility
2. Gradually move flags to Supabase
3. Use hybrid approach during transition:

```javascript
const { isEnabled } = useFeatureFlag('my-flag', {
  fallbackToEdgeConfig: true // Check Edge Config if not in Supabase
})
```

### Database Migration

```sql
-- Migrate existing flags
INSERT INTO feature_flags (name, enabled, description)
SELECT 
  flag_name, 
  enabled, 
  'Migrated from previous system'
FROM old_feature_flags_table;
```

## Support

- 📚 Documentation: `/docs/FEATURE_FLAGS_GUIDE.md`
- 🐛 Issues: Report via your standard bug tracking system
- 💡 Feature Requests: Contact the development team
- 📈 Analytics: Check admin dashboard for metrics

---

Built with ❤️ for the 6FB AI Agent System
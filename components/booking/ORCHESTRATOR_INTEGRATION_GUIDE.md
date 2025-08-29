# BookingFlowOrchestrator Integration Guide

## Overview

The BookingFlowOrchestrator is an intelligent routing component that automatically selects the optimal booking flow based on device capabilities, feature flags, and user context. It seamlessly integrates existing PublicBookingFlow, EnhancedBookingFlow, and MobileBookingOptimizer components.

## Key Features

### 🎯 Smart Component Switching
- Automatically chooses between booking flows based on device and capabilities
- Graceful fallback to safe defaults when enhanced features aren't available
- Real-time adaptation to network conditions

### 📱 Device Optimization
- Mobile-first approach with touch-optimized interfaces
- High-DPI display support with WebP image optimization
- Responsive design with orientation change handling
- Performance-aware loading based on connection speed

### 🎛️ Feature Flag Integration
- Controlled rollout of new booking experiences
- A/B testing support with statistical distribution
- User-specific feature targeting
- Runtime feature toggle without deployment

### 🔄 Backward Compatibility
- Preserves all existing URL parameters (`service`, `barber`, `enhanced`, `mobile`)
- Drop-in replacement for existing booking components
- Same prop interface as current booking flows
- Maintains customer account creation flow

## Installation & Setup

### 1. Basic Integration

Replace your existing booking component:

```jsx
// Before
import PublicBookingFlow from './components/booking/PublicBookingFlow'

<PublicBookingFlow 
  barbershopId="shop_123"
  barbershopSlug="awesome-cuts"
/>

// After
import BookingFlowOrchestrator from './components/booking/BookingFlowOrchestrator'

<BookingFlowOrchestrator
  barbershopId="shop_123"
  barbershopSlug="awesome-cuts"
/>
```

### 2. Advanced Configuration

```jsx
<BookingFlowOrchestrator
  // Core props
  barbershopId="shop_123"
  barbershopSlug="awesome-cuts"
  preselectedBarber="barber_456"
  preselectedService="service_789"
  
  // Flow control
  defaultFlow="auto" // 'auto' | 'public' | 'enhanced' | 'mobile'
  enableRealtimeAvailability={true}
  enableProgressiveAccount={true}
  
  // A/B Testing
  experimentId="booking_flow_v2"
  onComponentSelection={(component, context) => {
    analytics.track('booking_component_selected', {
      component,
      device: context.device,
      experiment: context.urlParams.experiment
    })
  }}
  onConversionEvent={(event, data) => {
    analytics.track(`booking_${event}`, data)
  }}
  
  // URL overrides (optional)
  enhanced={true} // Force enhanced flow
  mobile={false}  // Disable mobile optimization
  service="service_123" // Preselect service
  barber="barber_456"   // Preselect barber
/>
```

### 3. TypeScript Integration

```tsx
import BookingFlowOrchestrator, { 
  type BookingFlowOrchestratorProps,
  type DeviceInfo 
} from './components/booking/BookingFlowOrchestrator'

interface Props {
  shopId: string
  customization?: any
}

const BookingPage: React.FC<Props> = ({ shopId, customization }) => {
  return (
    <BookingFlowOrchestrator
      barbershopId={shopId}
      defaultFlow="auto"
      onComponentSelection={(component, context) => {
        // Fully typed context object
        console.log('Device info:', context.device.isMobile)
        console.log('Feature flags:', context.featureFlags)
      }}
    />
  )
}
```

## URL Parameter Support

The orchestrator maintains full backward compatibility with existing URL parameters:

### Standard Parameters
- `?service=123` - Preselect a service
- `?barber=456` - Preselect a barber
- `?enhanced=true` - Force enhanced booking flow
- `?mobile=true` - Force mobile-optimized flow

### Flow Control Parameters
- `?flow=public` - Use PublicBookingFlow
- `?flow=enhanced` - Use EnhancedBookingFlow
- `?flow=mobile` - Use MobileBookingOptimizer

### A/B Testing Parameters
- `?exp=booking_v2` - Participate in experiment
- `?debug=true` - Show debug information (development only)

### Example URLs
```
// Standard booking
https://barbershop.com/book?service=haircut&barber=john

// Enhanced flow with preselection
https://barbershop.com/book?enhanced=true&service=combo&barber=mike

// Mobile-optimized for specific experiment
https://barbershop.com/book?mobile=true&exp=mobile_checkout_v3

// Force specific flow for testing
https://barbershop.com/book?flow=enhanced&debug=true
```

## Feature Flag Configuration

### Vercel Edge Config Setup

```json
{
  "feature_flags": {
    "new_booking_flow": true,
    "enhanced_booking_flow": true,
    "mobile_optimizer_enabled": true,
    "realtime_availability": true,
    "advanced_booking_features": false,
    "ab_testing_enabled": true
  },
  "experiment_booking_v2": {
    "split": 0.5,
    "variantA": "PublicBookingFlow",
    "variantB": "EnhancedBookingFlow"
  },
  "targeting_rules": [
    {
      "conditions": [
        { "property": "isMobile", "operator": "equals", "value": true }
      ],
      "flags": {
        "mobile_optimizer_enabled": true
      }
    }
  ]
}
```

### Environment Variables

```env
# Feature flag defaults (fallback when Edge Config unavailable)
NEXT_PUBLIC_DEFAULT_BOOKING_FLOW=auto
NEXT_PUBLIC_ENABLE_ENHANCED_BOOKING=true
NEXT_PUBLIC_ENABLE_MOBILE_OPTIMIZER=true
NEXT_PUBLIC_ENABLE_REALTIME_AVAILABILITY=true
```

## Device Detection & Optimization

### Automatic Device Classification

The orchestrator automatically detects:

```typescript
interface DeviceInfo {
  // Device types
  isMobile: boolean        // Phone-sized devices
  isTablet: boolean        // Tablet-sized devices  
  isDesktop: boolean       // Desktop/laptop devices
  isTouchDevice: boolean   // Touch capability
  
  // Display properties
  screenWidth: number      // Viewport width
  screenHeight: number     // Viewport height
  pixelRatio: number       // Device pixel ratio
  hasHighDPI: boolean      // Retina/high-DPI display
  isLandscape: boolean     // Orientation
  
  // Performance indicators
  isSlowConnection: boolean // 2G/slow-2G connection
  effectiveConnectionType: string // Connection speed
  
  // Browser capabilities
  supportsWebP: boolean    // WebP image support
  supportsIntersectionObserver: boolean
  supportsServiceWorker: boolean
  
  // Computed recommendations
  shouldUseMobileFlow: boolean
  shouldUseEnhancedFlow: boolean
  shouldEnableLazyLoading: boolean
  shouldUseWebP: boolean
}
```

### Performance Optimizations

Based on device detection, the orchestrator automatically:

- **Mobile devices**: Touch-optimized UI, reduced animations, progressive loading
- **Slow connections**: Lazy loading, WebP images, minimal animations
- **High-DPI displays**: High-resolution images, sharp graphics
- **Desktop devices**: Enhanced animations, advanced features, larger layouts

## A/B Testing & Analytics

### Experiment Configuration

```javascript
// Track component selection
onComponentSelection={(component, context) => {
  // Send to analytics service
  gtag('event', 'booking_component_selected', {
    component_name: component,
    device_type: context.device.isMobile ? 'mobile' : 'desktop',
    experiment_id: context.urlParams.experiment,
    session_id: context.sessionId
  })
  
  // PostHog tracking
  posthog.capture('booking_flow_selected', {
    component,
    device_info: context.device,
    feature_flags: context.featureFlags
  })
}

// Track conversion events
onConversionEvent={(event, data) => {
  analytics.track(`booking_${event}`, {
    ...data,
    timestamp: new Date().toISOString(),
    flow_type: selectedComponent
  })
}
```

### Statistical Distribution

A/B tests use hash-based distribution for consistent user experiences:

```javascript
// Consistent assignment based on user ID + experiment ID
const userId = localStorage.getItem('user_id') || 'anonymous'
const hash = simpleHash(userId + experimentId) % 100
const variant = hash < (splitPercentage * 100) ? variantA : variantB
```

## Error Handling & Fallbacks

### Comprehensive Error Boundaries

```typescript
// Automatic error recovery
<BookingErrorBoundary 
  fallback={<CustomErrorComponent />}
  onRetry={() => {
    // Custom retry logic
    window.location.reload()
  }}
>
  <BookingFlowOrchestrator {...props} />
</BookingErrorBoundary>
```

### Graceful Degradation

The orchestrator includes multiple fallback layers:

1. **Component Fallback**: Enhanced → Public → Mobile → Basic HTML
2. **Feature Fallback**: Advanced features → Basic features → Core functionality
3. **Network Fallback**: Real-time → Cached → Static data
4. **Error Fallback**: Retry → Safe mode → Manual refresh

### Loading States

```jsx
// Custom loading component
<Suspense fallback={<CustomBookingLoader />}>
  <BookingFlowOrchestrator {...props} />
</Suspense>
```

## Performance Monitoring

### Built-in Metrics

```jsx
import { useBookingPerformance } from './components/booking/BookingFlowOrchestrator'

const BookingPage = () => {
  const metrics = useBookingPerformance()
  
  useEffect(() => {
    console.log('Booking load time:', metrics.loadTime)
    console.log('Render time:', metrics.renderTime)
    
    // Send to monitoring service
    if (metrics.loadTime > 3000) {
      Sentry.captureMessage('Slow booking load', {
        extra: { metrics }
      })
    }
  }, [metrics])
  
  return <BookingFlowOrchestrator {...props} />
}
```

### Performance Optimization Tips

1. **Lazy Loading**: Components are loaded on-demand
2. **Code Splitting**: Each booking flow is a separate chunk
3. **Image Optimization**: WebP support with fallbacks
4. **Connection Awareness**: Reduced functionality on slow connections
5. **Caching**: Feature flags and device info are cached
6. **Preloading**: Critical resources are preloaded based on user behavior

## Development & Debugging

### Debug Mode

Enable debug mode to see orchestrator decisions:

```
https://your-site.com/book?debug=true
```

Debug panel shows:
- Selected component and reasoning
- Device classification details
- Feature flag status
- Performance metrics
- Error states and retry counts

### Development Tools

```jsx
// TypeScript integration
import { useDeviceDetection } from './components/booking/BookingFlowOrchestrator'

const DevTools = () => {
  const device = useDeviceDetection()
  
  return (
    <div className="debug-panel">
      <h3>Device Info</h3>
      <pre>{JSON.stringify(device, null, 2)}</pre>
    </div>
  )
}
```

### Testing Different Flows

```javascript
// Test all flows programmatically
const testFlows = ['public', 'enhanced', 'mobile']

testFlows.forEach(flow => {
  const url = `https://localhost:3000/book?flow=${flow}&debug=true`
  console.log(`Testing ${flow} flow: ${url}`)
})
```

## Migration Guide

### From PublicBookingFlow

```jsx
// Before
<PublicBookingFlow 
  barbershopId="123"
  barbershopSlug="shop"
/>

// After - Drop-in replacement
<BookingFlowOrchestrator
  barbershopId="123"
  barbershopSlug="shop"
  defaultFlow="public" // Maintains exact same behavior
/>
```

### From EnhancedBookingFlow

```jsx
// Before
<EnhancedBookingFlow 
  barbershopId="123"
  preselectedBarber="456"
  enableAnimations={true}
/>

// After - Enhanced with intelligent routing
<BookingFlowOrchestrator
  barbershopId="123"
  preselectedBarber="456"
  defaultFlow="enhanced" // Prefers enhanced when possible
/>
```

### Gradual Migration Strategy

1. **Phase 1**: Replace on development/staging environments
2. **Phase 2**: A/B test with small percentage of users
3. **Phase 3**: Gradual rollout using feature flags
4. **Phase 4**: Full deployment with fallback options
5. **Phase 5**: Remove legacy booking components

## Best Practices

### Performance
- Always use TypeScript version for better development experience
- Enable lazy loading for large applications
- Monitor Core Web Vitals impact
- Use feature flags for gradual rollouts

### User Experience
- Test on actual mobile devices, not just browser dev tools
- Verify touch interactions work correctly
- Test with slow network connections
- Ensure accessibility across all booking flows

### Analytics
- Track component selection rates
- Monitor conversion funnels by flow type
- A/B test booking completion rates
- Measure performance impact on business metrics

### Maintenance
- Keep feature flags up to date
- Monitor error rates across different flows
- Regular testing of fallback scenarios
- Document any customizations or overrides

## Troubleshooting

### Common Issues

**Q: Booking flow doesn't change on mobile devices**
A: Check feature flags and ensure `mobile_optimizer_enabled` is true

**Q: Enhanced flow never loads**
A: Verify `enhanced_booking_flow` feature flag and device capabilities

**Q: URL parameters not working**
A: Ensure parameters are properly encoded and component receives them

**Q: Debug panel not showing**
A: Add `?debug=true` to URL and check development environment

**Q: Performance issues on mobile**
A: Enable performance optimizations and check network conditions

### Error Codes

- `ORCHESTRATOR_INIT_TIMEOUT`: Initialization timeout (5s limit)
- `FEATURE_FLAGS_UNAVAILABLE`: Could not load feature flags
- `DEVICE_DETECTION_FAILED`: Device detection library error
- `COMPONENT_LOAD_FAILED`: Dynamic import failure

### Support

For additional support:
1. Check browser console for detailed error messages
2. Enable debug mode for diagnostic information
3. Review feature flag configuration
4. Test with simplified configuration
5. Consult component-specific documentation

---

## Next Steps

After integration:
1. Configure feature flags for your environment
2. Set up analytics tracking
3. Test across different devices and browsers
4. Monitor performance and error rates
5. Plan A/B testing experiments
6. Train team on new debugging tools

The BookingFlowOrchestrator provides a robust, scalable foundation for booking experiences that automatically adapt to user context while maintaining full backward compatibility with your existing implementation.
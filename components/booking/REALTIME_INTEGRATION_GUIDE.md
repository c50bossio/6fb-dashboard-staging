# RealtimeBookingWrapper Integration Guide

## Overview

The RealtimeBookingWrapper is a comprehensive integration layer that adds real-time availability checking to all existing 6FB booking flows without breaking changes.

## Features

### ✅ Real-Time Capabilities
- **Live Availability Updates**: Supabase real-time subscriptions
- **Conflict Prevention**: Multi-user booking protection
- **Business Hours Validation**: Automatic scheduling rule enforcement
- **Optimistic Updates**: Immediate UI feedback
- **Network Resilience**: Graceful offline handling

### ✅ Component Integration
- **PublicBookingFlow**: 3-step simplified booking
- **EnhancedBookingFlow**: Advanced mobile-optimized flow
- **BookingFlowOrchestrator**: Intelligent component selection
- **Non-Breaking**: Existing components work unchanged

### ✅ Production Ready
- **TypeScript Support**: Full type definitions
- **Error Handling**: Comprehensive error boundaries
- **Performance**: Optimized queries and caching
- **Analytics**: Optional tracking integration
- **Debugging**: Development mode with debug panel

## Quick Start

### Basic Usage

```javascript
import RealtimeBookingWrapper from '@/components/booking/RealtimeBookingWrapper'

export default function BookingPage({ params }) {
  return (
    <RealtimeBookingWrapper
      barbershopId={params.shopId}
      barbershopSlug={params.slug}
      enableRealtime={true}
      enableConflictPrevention={true}
      flowComponent="auto" // Smart component selection
    />
  )
}
```

### Advanced Configuration

```javascript
<RealtimeBookingWrapper
  barbershopId="shop-123"
  barbershopSlug="downtown-cuts"
  preselectedBarber="barber-456"
  preselectedService="service-789"
  
  // Real-time settings
  enableRealtime={true}
  enableConflictPrevention={true}
  enableBusinessHoursValidation={true}
  refreshInterval={30000}
  conflictCheckDelay={500}
  
  // Component selection
  flowComponent="orchestrator" // or 'public', 'enhanced', 'auto'
  fallbackComponent="public"
  
  // Event handlers
  onSlotConflict={(event) => {
    console.log('Slot conflict:', event.datetime, event.error)
    // Show custom conflict resolution UI
  }}
  onRealtimeError={(error) => {
    console.error('Realtime error:', error)
    // Track error in analytics
  }}
  onAvailabilityUpdate={(data) => {
    console.log(`${data.slots.length} slots available`)
  }}
  
  // Advanced features
  enableOptimisticUpdates={true}
  enableAnalytics={true}
  debugMode={process.env.NODE_ENV === 'development'}
/>
```

## API Reference

### Props

#### Core Props
- `barbershopId: string` - **Required** - Barbershop identifier
- `barbershopSlug?: string` - Barbershop URL slug
- `preselectedBarber?: string` - Pre-selected barber ID
- `preselectedService?: string` - Pre-selected service ID

#### Real-time Configuration
- `enableRealtime?: boolean` - Enable Supabase real-time subscriptions (default: true)
- `enableConflictPrevention?: boolean` - Validate slots before booking (default: true)
- `enableBusinessHoursValidation?: boolean` - Enforce business hours (default: true)
- `refreshInterval?: number` - Fallback refresh interval in ms (default: 30000)
- `conflictCheckDelay?: number` - Debounce delay for conflict checks (default: 500)

#### Component Selection
- `flowComponent?: 'auto' | 'public' | 'enhanced' | 'orchestrator'` - Component to render (default: 'auto')
- `fallbackComponent?: 'public' | 'enhanced'` - Fallback when realtime fails (default: 'public')

#### Event Handlers
- `onSlotConflict?: (event) => void` - Called when slot becomes unavailable
- `onRealtimeError?: (error) => void` - Called on real-time connection errors
- `onAvailabilityUpdate?: (data) => void` - Called when availability data updates
- `onBookingAttempt?: (data) => void` - Called before booking submission
- `onNetworkStatusChange?: (status) => void` - Called on network status changes

### Enhanced Props Passed to Wrapped Components

```typescript
interface EnhancedBookingProps {
  // Real-time data
  availableSlots: BookingSlot[]
  conflictedSlots: BookingSlot[]
  slotsLoading: boolean
  slotsError: string | null
  lastUpdated: Date | null
  
  // Status
  realtimeConnected: boolean
  realtimeStatus: RealtimeStatus
  networkStatus: NetworkStatus
  
  // Enhanced callbacks
  onDateTimeSelect: (datetime, service?, duration?) => Promise<ValidationResult>
  onBookingAttempt: (bookingData) => Promise<any>
  refreshAvailability: (date?, service?, duration?) => Promise<BookingSlot[]>
  validateSlot: (timeSlot, duration?) => Promise<ValidationResult>
}
```

## Hook Usage

For custom components that need real-time booking features:

```javascript
import { useRealtimeBooking } from '@/components/booking/RealtimeBookingWrapper'

function CustomBookingComponent({ barbershopId }) {
  const {
    availableSlots,
    conflicts,
    loading,
    error,
    realtimeConnected,
    checkAvailability,
    validateSlot
  } = useRealtimeBooking({
    barbershopId,
    enableRealtime: true,
    enableConflictPrevention: true
  })
  
  useEffect(() => {
    checkAvailability(new Date(), 30)
  }, [checkAvailability])
  
  const handleSlotSelect = async (slot) => {
    const validation = await validateSlot(slot.time, slot.duration)
    if (!validation.valid) {
      alert(`Slot unavailable: ${validation.error}`)
      return
    }
    // Proceed with booking...
  }
  
  return (
    <div>
      <div className="flex items-center space-x-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${
          realtimeConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
        }`} />
        <span className="text-sm text-gray-600">
          {realtimeConnected ? 'Live Updates' : 'Manual Refresh'}
        </span>
      </div>
      
      {loading && <div>Loading available times...</div>}
      {error && <div className="text-red-600">Error: {error}</div>}
      
      <div className="grid grid-cols-3 gap-2">
        {availableSlots.map(slot => (
          <button
            key={slot.time}
            onClick={() => handleSlotSelect(slot)}
            className="p-2 border rounded hover:bg-blue-50"
          >
            {slot.display}
            {slot.isPopular && <span className="ml-1">⭐</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
```

## Business Logic Integration

### Existing API Compatibility

The wrapper integrates seamlessly with the existing `/api/public/bookings/create` endpoint:

```javascript
// Existing booking creation - no changes needed
const response = await fetch('/api/public/bookings/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    barbershop_id: barbershopId,
    service_id: selectedService.id,
    scheduled_at: selectedDateTime.time,
    duration_minutes: selectedService.duration,
    price: selectedService.price,
    customer_name: customerInfo.name,
    customer_phone: customerInfo.phone,
    customer_email: customerInfo.email
  })
})
```

### Business Hours Configuration

Business hours are automatically fetched from the barbershops table:

```sql
-- Expected business_hours format
{
  "monday": { "open": "09:00", "close": "18:00" },
  "tuesday": { "open": "09:00", "close": "18:00" },
  "wednesday": { "open": "09:00", "close": "18:00" },
  "thursday": { "open": "09:00", "close": "18:00" },
  "friday": { "open": "09:00", "close": "18:00" },
  "saturday": { "open": "09:00", "close": "16:00" },
  "sunday": null
}
```

### Booking Settings Configuration

Optional booking_settings table configuration:

```sql
-- booking_settings table
{
  "min_advance_booking": 30,     -- minutes
  "max_advance_booking": 10080,  -- minutes (1 week)
  "slot_duration": 30,           -- minutes
  "buffer_time": 15,             -- minutes between appointments
  "requireAuth": false           -- require account for booking
}
```

## URL Parameter Support

The wrapper maintains backward compatibility with existing URL parameters:

```
/book/downtown-cuts?service=haircut&barber=john&enhanced=true
```

Parameters:
- `service` - Pre-select service
- `barber` - Pre-select barber
- `enhanced=true` - Force enhanced flow
- `mobile=true` - Force mobile optimized flow
- `flow=public|enhanced|orchestrator` - Specific component
- `debug=true` - Enable debug mode

## Performance Considerations

### Optimizations
- **Lazy Loading**: Components loaded on-demand
- **Smart Caching**: Availability results cached with TTL
- **Debounced Updates**: Prevents excessive API calls
- **Connection Pooling**: Efficient Supabase connection management
- **Selective Updates**: Only refresh when relevant changes occur

### Network Handling
- **Offline Support**: Graceful degradation when network unavailable
- **Slow Connection**: Automatic fallback to lightweight components
- **Connection Recovery**: Automatic reconnection on network restore
- **Rate Limiting**: Built-in rate limiting for API protection

## Error Handling

### Graceful Degradation
1. **Real-time fails** → Falls back to periodic refresh
2. **Network offline** → Shows cached data with offline indicator
3. **API errors** → Shows error message with retry option
4. **Component crashes** → Error boundary with fallback UI

### Error Types
- `RealtimeConnectionError` - Supabase subscription failed
- `NetworkError` - Internet connection issues
- `ValidationError` - Business rule violations
- `ConflictError` - Slot no longer available
- `BusinessHoursError` - Outside operating hours

## Testing

### Unit Tests
```bash
npm test components/booking/RealtimeBookingWrapper.test.js
```

### Integration Tests
```bash
npm test __tests__/booking/realtime-integration.test.js
```

### E2E Tests
```bash
npm run test:e2e -- --spec="booking/realtime-flow.spec.js"
```

## Migration Guide

### From PublicBookingFlow
```javascript
// Before
<PublicBookingFlow 
  barbershopId={shopId}
  barbershopSlug={slug}
/>

// After - zero changes needed, just wrap
<RealtimeBookingWrapper
  barbershopId={shopId}
  barbershopSlug={slug}
  flowComponent="public"
/>
```

### From BookingFlowOrchestrator
```javascript
// Before
<BookingFlowOrchestrator 
  barbershopId={shopId}
  preselectedBarber={barberId}
/>

// After - enhanced with real-time
<RealtimeBookingWrapper
  barbershopId={shopId}
  preselectedBarber={barberId}
  flowComponent="orchestrator"
  enableRealtime={true}
/>
```

## Security Considerations

### RLS Policies
Ensure proper Row Level Security policies are in place:

```sql
-- Booking reads for availability checking
CREATE POLICY "Public booking reads" ON bookings
  FOR SELECT USING (
    status IN ('confirmed', 'checked_in') AND
    start_time >= NOW()
  );
```

### Rate Limiting
The wrapper respects existing API rate limiting:
- 5 requests per 5 minutes per IP
- Exponential backoff on errors
- Circuit breaker pattern for failed connections

### Data Privacy
- Only public booking data is exposed
- Customer information is masked in conflict details
- Real-time subscriptions filtered by barbershop

## Troubleshooting

### Common Issues

**Real-time not working**
- Check Supabase connection and RLS policies
- Verify network connectivity
- Check browser console for subscription errors

**Slot conflicts**
- Enable `debugMode` to see detailed conflict info
- Check business hours configuration
- Verify booking table indexes for performance

**Component not loading**
- Check lazy loading and Suspense boundaries
- Verify component imports and exports
- Check for JavaScript errors in console

### Debug Mode

Enable debug mode for detailed logging:
```javascript
<RealtimeBookingWrapper
  debugMode={true}
  // ... other props
/>
```

This shows:
- Real-time connection status
- Available slots count
- Last availability check time
- Network status and connection type
- Component selection reasoning

## Support

For issues or questions:
1. Check the debug panel output
2. Review browser console errors
3. Verify Supabase configuration
4. Test with `debugMode={true}`
5. Check network connectivity

## Changelog

### v1.0.0
- Initial release with full real-time integration
- Support for all existing booking flows
- TypeScript definitions
- Comprehensive error handling
- Production-ready performance optimizations
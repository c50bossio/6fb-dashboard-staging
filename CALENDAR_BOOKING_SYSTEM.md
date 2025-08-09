# Calendar Booking System Documentation

## Overview

The 6FB AI Agent System uses a streamlined calendar booking system built with FullCalendar.io's React implementation. This documentation covers the current implementation, configuration options, and integration points for the barbershop booking platform.

## Current Implementation

### Core Component: FinalProfessionalCalendar

**Location**: `/components/calendar/FinalProfessionalCalendar.js`

The calendar system has been rebuilt from scratch with a 90% code reduction (from 2154 lines to ~200 lines), providing a clean, maintainable solution for appointment scheduling.

### Key Features

- **Resource View**: Display multiple barbers as columns (vertical resource view)
- **Drag & Drop**: Appointments can be rescheduled by dragging
- **Click to Book**: Click any empty slot to create a new appointment
- **Auto-Population**: Time, date, and barber are automatically populated when clicking a slot
- **Collapsible Sidebar**: Maximize calendar viewing space with collapsible navigation
- **Week View Default**: Shows a full week with 30-minute time slots
- **Business Hours**: 9 AM - 6 PM display window

## Architecture

### Component Structure

```
app/(protected)/dashboard/calendar/page.js     # Main calendar page
├── components/calendar/
│   ├── FinalProfessionalCalendar.js          # Primary calendar component
│   ├── AppointmentBookingModal.js            # Booking form modal
│   └── professional-calendar.css             # Minimal styling (15 lines)
├── contexts/
│   └── NavigationContext.js                  # Sidebar collapse state management
└── components/
    └── Navigation.js                          # Collapsible sidebar navigation
```

### Data Flow

1. **Mock Data System** (Current)
   - Hardcoded resources (barbers) and events (appointments)
   - 4 barbers with color-coded appointments
   - 12 sample appointments distributed across the week

2. **Future Database Integration**
   - Ready for Supabase PostgreSQL integration
   - Event structure matches database schema
   - Resource management aligned with barber profiles

## FullCalendar Configuration

### Plugins Used

```javascript
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
```

### Core Configuration

```javascript
{
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimeGridPlugin],
  initialView: 'resourceTimeGridWeek',
  schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'resourceTimeGridDay,resourceTimeGridWeek,dayGridMonth'
  },
  slotMinTime: '09:00',
  slotMaxTime: '18:00',
  slotDuration: '00:30:00',
  slotLabelInterval: '01:00',
  height: 'auto',
  editable: true,
  selectable: true,
  selectMirror: true,
  eventClick: handleEventClick,
  select: handleDateSelect
}
```

## Resources (Barbers)

### Resource Structure

```javascript
{
  id: 'barber-1',           // Unique identifier
  title: 'John Smith',      // Display name
  eventColor: '#10b981'     // Color for appointments
}
```

### Current Mock Resources

- **John Smith** (barber-1): Green (#10b981)
- **Sarah Johnson** (barber-2): Blue (#3b82f6)
- **Mike Brown** (barber-3): Amber (#f59e0b)
- **Lisa Davis** (barber-4): Purple (#8b5cf6)

## Event (Appointment) Structure

### Event Object Format

```javascript
{
  id: '1',
  resourceId: 'barber-1',          // Links to barber resource
  title: 'Haircut - James Wilson',  // Service and customer
  start: '2025-01-13T10:00:00',    // ISO 8601 format
  end: '2025-01-13T10:30:00',
  backgroundColor: '#10b981',       // Matches barber color
  borderColor: '#10b981',
  extendedProps: {                  // Additional data
    customer: 'James Wilson',
    service: 'Haircut',
    phone: '555-0101',
    notes: 'Regular cut'
  }
}
```

### Event Display

Events are displayed with:
- Service type and customer name in title
- Color-coding by barber
- Duration based on start/end times
- Click interaction for viewing/editing

## User Interactions

### Click to Book

When clicking an empty calendar slot:

1. **Slot Selection**: Captures date, time, and barber from clicked position
2. **Auto-Population**: Form automatically fills with:
   - Selected date and time
   - Selected barber (based on column clicked)
   - Service defaults to first available
3. **Modal Display**: Booking form appears with pre-filled data
4. **Confirmation**: User can adjust details and confirm booking

### Drag and Drop

- **Move Appointments**: Drag to different time slots or barbers
- **Resize Duration**: Drag appointment edges to adjust duration
- **Visual Feedback**: Ghost preview during drag operation
- **Validation**: Prevents overlapping appointments (when database connected)

### View Switching

Three view modes available:
- **Day View**: Single day with all barbers
- **Week View**: Full week with all barbers (default)
- **Month View**: Monthly overview (limited resource display)

## Collapsible Sidebar Integration

### NavigationContext

Provides global state for sidebar collapse:

```javascript
const NavigationContext = createContext({
  isCollapsed: false,
  setIsCollapsed: () => {}
})
```

### Responsive Layout

Main content adjusts margin based on sidebar state:
- **Expanded**: `lg:ml-80` (320px left margin)
- **Collapsed**: `lg:ml-16` (64px left margin)
- **Transition**: Smooth 300ms animation

### Benefits

- **More Calendar Space**: ~20% more horizontal viewing area when collapsed
- **Better Mobile Experience**: Sidebar hidden by default on mobile
- **Persistent State**: Collapse preference maintained during session

## Styling and Theming

### Minimal CSS Approach

The new implementation uses only 15 lines of custom CSS:

```css
.fc-event {
  cursor: pointer;
  transition: all 0.2s;
}

.fc-event:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.fc-timegrid-slot {
  height: 60px !important;
}
```

### Color System

- **Event Colors**: Defined per barber in resource configuration
- **Hover States**: Subtle scale and shadow on interaction
- **Selected State**: Built-in FullCalendar highlighting
- **Today Highlight**: Automatic current day emphasis

## API Integration Points

### Data Fetching (To Be Implemented)

```javascript
// Fetch barbers as resources
const fetchBarbers = async () => {
  const { data } = await supabase
    .from('barbers')
    .select('id, name, color')
    .eq('shop_id', shopId)
  
  return data.map(barber => ({
    id: barber.id,
    title: barber.name,
    eventColor: barber.color
  }))
}

// Fetch appointments as events
const fetchAppointments = async () => {
  const { data } = await supabase
    .from('bookings')
    .select('*, customers(*), services(*)')
    .gte('start_time', weekStart)
    .lte('end_time', weekEnd)
  
  return data.map(booking => ({
    id: booking.id,
    resourceId: booking.barber_id,
    title: `${booking.services.name} - ${booking.customers.name}`,
    start: booking.start_time,
    end: booking.end_time,
    extendedProps: { ...booking }
  }))
}
```

### Real-time Updates (To Be Implemented)

```javascript
// Subscribe to booking changes
useEffect(() => {
  const subscription = supabase
    .channel('bookings')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings'
    }, handleRealtimeUpdate)
    .subscribe()
  
  return () => subscription.unsubscribe()
}, [])
```

## Performance Optimizations

### Current Optimizations

1. **Dynamic Import**: Calendar loaded only when needed
2. **Minimal Re-renders**: React.memo and useCallback hooks
3. **Lightweight CSS**: Only essential styles (15 lines)
4. **Efficient Event Handling**: Debounced drag operations

### Planned Optimizations

1. **Virtual Scrolling**: For large appointment datasets
2. **Lazy Loading**: Load appointments as user navigates dates
3. **Caching**: Store recent appointments in local state
4. **Optimistic Updates**: Immediate UI updates before server confirmation

## Mobile Responsiveness

### Current Behavior

- **Responsive Grid**: Automatically adjusts to screen size
- **Touch Support**: Native touch events for mobile devices
- **Simplified Mobile View**: Consider switching to agenda/list view on small screens
- **Hidden Sidebar**: Navigation drawer on mobile to maximize space

### Recommended Mobile Enhancements

```javascript
// Detect mobile and adjust view
const isMobile = window.innerWidth < 768
const initialView = isMobile ? 'listWeek' : 'resourceTimeGridWeek'
```

## License Considerations

### Development (Current)
```javascript
schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives'
```
- Free for development and testing
- Requires attribution in production
- Non-commercial use only

### Production Options

1. **Standard License** ($569/year)
   - 1 developer
   - No attribution required
   - Commercial use allowed

2. **Extended License** ($1,710/year)
   - Unlimited developers
   - No attribution required
   - Commercial use allowed

3. **OEM License** (Custom pricing)
   - Reselling/embedding in products
   - White-label options

## Troubleshooting

### Common Issues

1. **Events Not Displaying**
   - Verify event date format (ISO 8601)
   - Check resourceId matches resource
   - Ensure start/end times are valid

2. **Drag and Drop Not Working**
   - Confirm `editable: true` in config
   - Check `interactionPlugin` is loaded
   - Verify no conflicting CSS pointer-events

3. **Resources Not Showing**
   - Ensure `resourceTimeGridPlugin` is imported
   - Verify resources array is populated
   - Check license key is valid

4. **Sidebar Collapse Issues**
   - Verify NavigationContext is wrapped around components
   - Check template literal syntax in className
   - Ensure transition CSS is applied

## Migration Guide

### From Old FullCalendarWrapper (2154 lines) to FinalProfessionalCalendar (200 lines)

1. **Remove Old Components**
   ```bash
   rm components/calendar/FullCalendarWrapper.js
   rm components/calendar/OptimizedCalendar.js
   rm styles/calendar.css
   ```

2. **Update Imports**
   ```javascript
   // Old
   import FullCalendarWrapper from '@/components/calendar/FullCalendarWrapper'
   
   // New
   import FinalProfessionalCalendar from '@/components/calendar/FinalProfessionalCalendar'
   ```

3. **Adjust Props**
   - Simplified prop interface
   - Direct event/resource passing
   - Cleaner callback handlers

## Best Practices

### Event Management

1. **Unique IDs**: Always use unique identifiers for events
2. **Consistent Dates**: Use ISO 8601 format throughout
3. **Validation**: Check for conflicts before confirming bookings
4. **Error Handling**: Graceful fallbacks for failed operations

### Resource Management

1. **Color Coding**: Use consistent colors per barber
2. **Availability**: Track working hours per resource
3. **Capacity**: Consider concurrent appointment support
4. **Permissions**: Validate barber can be booked

### User Experience

1. **Loading States**: Show skeleton during data fetch
2. **Error Messages**: Clear feedback for booking failures
3. **Confirmations**: Require confirmation for destructive actions
4. **Accessibility**: Maintain keyboard navigation support

## Future Enhancements

### Planned Features

1. **Recurring Appointments**
   - Weekly/monthly repeat bookings
   - Series management
   - Exception handling

2. **Advanced Filtering**
   - Filter by service type
   - Search by customer name
   - Date range selection

3. **Analytics Integration**
   - Utilization heatmaps
   - Booking patterns
   - Revenue tracking

4. **Multi-location Support**
   - Shop selection dropdown
   - Cross-location views
   - Resource sharing

5. **Customer Portal**
   - Self-service booking
   - Appointment history
   - Rescheduling interface

## Conclusion

The new calendar booking system provides a clean, efficient foundation for barbershop appointment management. With 90% less code than the previous implementation, it maintains all essential features while improving maintainability and performance. The system is ready for database integration and can scale to support advanced booking requirements as the platform grows.

For additional FullCalendar features and documentation, refer to: https://fullcalendar.io/docs
# Recurring Appointments System Requirements

## Executive Summary
The recurring appointments system enables barbershops to efficiently manage regular customer appointments that repeat on a predictable schedule. This system must handle complex scheduling patterns while maintaining data integrity and providing an intuitive user experience.

## Business Goals

### Primary Objectives
1. **Efficiency**: Reduce time spent booking repeat customers
2. **Reliability**: Ensure appointments occur at the correct times
3. **Flexibility**: Support various recurrence patterns
4. **Scalability**: Handle hundreds of recurring appointments per barbershop

### User Personas

#### Barbershop Owner
- Needs to manage multiple barbers' recurring schedules
- Wants overview of recurring revenue
- Requires ability to handle exceptions (holidays, vacations)

#### Barber
- Needs to see their recurring appointments clearly
- Wants to modify individual occurrences
- Requires conflict prevention

#### Customer
- Wants consistent appointment times
- Needs ability to skip/reschedule individual appointments
- Expects reliable reminders

## Functional Requirements

### 1. Create Recurring Appointments

#### User Story
As a barber, I want to create a recurring appointment for my regular customers so that I don't have to manually book them each time.

#### Acceptance Criteria
- ✅ Support daily, weekly, bi-weekly, monthly patterns
- ✅ Allow custom patterns (e.g., every 3 weeks)
- ✅ Set end date or number of occurrences
- ✅ Preview generated appointments before confirming
- ✅ Detect and handle conflicts

#### Example Scenarios
1. **Weekly Haircut**: Every Tuesday at 2:30 PM
2. **Bi-weekly Beard Trim**: Every other Friday at 5:00 PM
3. **Monthly Style**: First Monday of each month at 10:00 AM
4. **Custom Pattern**: Every 3 weeks on Wednesday at 3:00 PM

### 2. Convert Single to Recurring

#### User Story
As a barber, when a one-time customer becomes regular, I want to convert their existing appointment to recurring without rebooking.

#### Acceptance Criteria
- ✅ One-click conversion from appointment details
- ✅ Preserve original time, duration, and service
- ✅ Allow pattern customization during conversion
- ✅ Show preview of future occurrences

### 3. Modify Recurring Appointments

#### User Story
As a barber, I need to modify recurring appointments when schedules change.

#### Modification Options
1. **This Occurrence Only**: Change just one instance
2. **This and Future**: Modify from a point forward
3. **All Occurrences**: Update entire series

#### Examples
- Customer wants to move from 2:30 PM to 3:00 PM starting next month
- Holiday adjustment for single occurrence
- Service change (haircut to haircut + beard)

### 4. Delete Recurring Appointments

#### User Story
As a barber, I need to cancel recurring appointments when customers no longer need regular service.

#### Deletion Options
1. **Single Occurrence**: Customer skips one week
2. **Future Occurrences**: Cancel from a date forward
3. **Entire Series**: Remove all appointments

#### Requirements
- ✅ Confirmation dialog with impact preview
- ✅ Option to notify customer
- ✅ Soft delete for history preservation
- ✅ Undo capability within 24 hours

### 5. Handle Exceptions

#### User Story
As a barbershop owner, I need to handle exceptions like holidays and vacations without losing recurring patterns.

#### Exception Types
1. **Shop Closures**: Holidays, renovations
2. **Barber Absence**: Vacation, sick days
3. **Customer Exceptions**: Skip weeks, temporary pause
4. **Rescheduling**: Move single occurrence

### 6. Time Zone Support

#### Requirements
- ✅ Store appointments in UTC
- ✅ Display in barbershop's local timezone
- ✅ Handle DST transitions correctly
- ✅ Support customers in different timezones

## Non-Functional Requirements

### Performance
- Load calendar with 1000+ events in < 2 seconds
- Create recurring series (52 weeks) in < 1 second
- Instant UI feedback for all actions

### Reliability
- 99.9% accuracy in time display
- Zero data loss during modifications
- Automatic conflict detection

### Usability
- Maximum 3 clicks to create recurring appointment
- Clear visual distinction for recurring vs single
- Intuitive icons and labels
- Mobile-responsive interface

### Security
- Authenticate all modifications
- Audit trail for changes
- Role-based permissions

## Current Issues (To Be Resolved)

### Critical Bugs
1. **Midnight Bug**: Recurring appointments show at 12:00 AM instead of scheduled time
2. **Creation Failure**: Manual recurring appointment creation returns 400 error
3. **Conversion Issues**: Time not preserved when converting single to recurring

### UX Problems
1. Complex UI for simple patterns
2. No preview of generated occurrences
3. Unclear delete options
4. Missing conflict warnings

## Success Metrics

### Quantitative
- ✅ 100% time accuracy (no midnight bugs)
- ✅ < 3 second page load with full calendar
- ✅ 0% data loss during operations
- ✅ 90% of recurring appointments created in < 30 seconds

### Qualitative
- ✅ Intuitive enough for non-technical users
- ✅ Clear visual feedback for all actions
- ✅ Consistent behavior across all browsers
- ✅ Professional, polished appearance

## Technical Constraints

### Must Use
- FullCalendar.io for calendar display
- RRule (RFC 5545) for recurrence patterns
- PostgreSQL/Supabase for data storage
- Next.js for frontend framework

### Must Support
- Chrome, Firefox, Safari (latest 2 versions)
- Mobile devices (iOS/Android)
- Slow network connections (3G)
- Screen readers for accessibility

## Implementation Priorities

### Phase 1: Core Functionality (MVP)
1. Create weekly recurring appointments
2. Display at correct times
3. Delete entire series
4. Basic conflict detection

### Phase 2: Enhanced Features
1. Convert single to recurring
2. Modify single occurrence
3. Advanced patterns (monthly, custom)
4. Exception handling

### Phase 3: Polish
1. Bulk operations
2. Recurring revenue reports
3. Customer portal access
4. Email/SMS reminders

## User Interface Mockups

### Create Recurring Appointment
```
┌─────────────────────────────────────┐
│ Create Recurring Appointment        │
├─────────────────────────────────────┤
│ Customer: [John Doe        ▼]      │
│ Service:  [Haircut         ▼]      │
│ Barber:   [Mike Smith      ▼]      │
│                                     │
│ Start Date: [08/15/2025    📅]     │
│ Time:       [2:30 PM       🕐]     │
│ Duration:   [45 minutes    ▼]      │
│                                     │
│ Repeat:                             │
│ ◉ Weekly  ○ Bi-weekly  ○ Monthly  │
│                                     │
│ On: ☑ Mon ☑ Wed ☑ Fri             │
│                                     │
│ End:                                │
│ ◉ After [10] occurrences           │
│ ○ On date [___________]            │
│ ○ Never                             │
│                                     │
│ [Preview Occurrences]               │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ Next 5 Occurrences:         │    │
│ │ • Mon, Aug 19 at 2:30 PM   │    │
│ │ • Wed, Aug 21 at 2:30 PM   │    │
│ │ • Fri, Aug 23 at 2:30 PM   │    │
│ │ • Mon, Aug 26 at 2:30 PM   │    │
│ │ • Wed, Aug 28 at 2:30 PM   │    │
│ └─────────────────────────────┘    │
│                                     │
│ [Cancel]          [Create Series]   │
└─────────────────────────────────────┘
```

### Modify Recurring Appointment
```
┌─────────────────────────────────────┐
│ Modify Recurring Appointment        │
├─────────────────────────────────────┤
│ Series: John Doe - Haircut          │
│ Pattern: Every Mon, Wed, Fri @ 2:30 │
│                                     │
│ What would you like to change?      │
│                                     │
│ ◉ This occurrence only (Aug 19)    │
│ ○ This and future occurrences      │
│ ○ All occurrences in series        │
│                                     │
│ New Time: [3:00 PM     🕐]         │
│                                     │
│ Note: [Holiday adjustment]          │
│                                     │
│ [Cancel]          [Save Changes]    │
└─────────────────────────────────────┘
```

## Acceptance Testing Scenarios

### Scenario 1: Weekly Appointment
1. Create appointment for every Monday at 2:00 PM
2. Verify displays at 2:00 PM (not midnight)
3. Verify appears for next 10 Mondays
4. Delete single occurrence
5. Verify other occurrences remain

### Scenario 2: Convert to Recurring
1. Create single appointment at 3:30 PM Thursday
2. Convert to weekly recurring
3. Verify time preserved (3:30 PM)
4. Verify pattern applied correctly

### Scenario 3: Timezone Handling
1. Create appointment at 2:00 PM EST
2. Change calendar view to PST
3. Verify displays at 11:00 AM PST
4. Verify DST transition handled

## Notes for Development Team

### Critical Success Factors
1. **Time Accuracy**: This is non-negotiable. All appointments must display at the correct time.
2. **Data Integrity**: Never lose customer bookings during modifications.
3. **User Feedback**: Clear confirmation for all destructive actions.
4. **Performance**: Must handle real-world load (100+ recurring series per shop).

### Common Pitfalls to Avoid
1. Not handling timezone/DST properly
2. Forgetting to validate conflicting appointments
3. Poor handling of edge cases (month-end, leap years)
4. Inadequate testing of deletion scenarios
5. Confusing UI for pattern selection

### Definition of Done
- ✅ All acceptance criteria met
- ✅ Unit tests written and passing (>80% coverage)
- ✅ Integration tests for critical paths
- ✅ Code reviewed and approved
- ✅ Documentation updated
- ✅ Deployed to staging and tested
- ✅ Performance benchmarks met
- ✅ Accessibility standards met (WCAG 2.1 AA)

---

*This document defines what we're building and why. For technical implementation details, see RECURRING_APPOINTMENTS_SD.md*
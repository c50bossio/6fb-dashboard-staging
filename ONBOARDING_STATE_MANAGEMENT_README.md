# Onboarding State Management Solution

This solution resolves the cross-tab state persistence issue by implementing a Supabase-backed state management system with real-time synchronization.

## Problem Solved

**Original Issue**: When doing onboarding with staff setup in one tab and opening booking policies in another tab, returning to the first tab would refresh and lose all progress, returning to the dashboard.

**Root Cause**: Components used React `useState` with no persistence mechanism. State was stored only in component memory and lost on navigation.

## Solution Architecture

### 1. **Database-Backed State Storage**
- Uses Supabase PostgreSQL with real-time subscriptions
- JSONB storage for flexible form data
- Row Level Security for user isolation
- Automatic cleanup of expired sessions

### 2. **Real-Time Cross-Tab Synchronization**
- Supabase real-time subscriptions sync changes across browser tabs
- Automatic conflict detection and resolution
- Optimistic updates with offline queue support
- Debounced auto-save to prevent excessive database writes

### 3. **Enhanced UX Components**
- Save status indicators (saving, saved, offline, error)
- Progress tracking across all onboarding steps
- Cross-tab conflict resolution modal
- Comprehensive progress indicator with session status

## Files Created/Modified

### Core System Files
- `database/onboarding-sessions-migration.sql` - Database schema
- `lib/onboarding/SupabaseOnboardingManager.js` - State management class
- `contexts/OnboardingContext.js` - React Context provider
- `apply-onboarding-sessions-migration.js` - Migration script

### Component Updates
- `components/onboarding/StaffSetup.js` - Updated to use Supabase state
- `components/onboarding/BookingRulesSetup.js` - Updated with real-time sync

### New UX Components
- `components/onboarding/CrossTabConflictModal.js` - Conflict resolution modal
- `components/onboarding/OnboardingProgressIndicator.js` - Enhanced progress display
- `components/onboarding/OnboardingWrapper.js` - Example integration

## Installation Steps

### 1. Apply Database Migration

**Option A: Manual Application (Recommended)**
1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql
2. Copy the contents of `database/onboarding-sessions-migration.sql`
3. Paste and execute in the SQL editor

**Option B: Automated Script**
```bash
node apply-onboarding-sessions-migration.js
```
*Note: This may require manual application if automated execution fails*

### 2. Verify Database Setup

Check that the `onboarding_sessions` table was created:
```sql
SELECT * FROM onboarding_sessions LIMIT 1;
```

### 3. Update Component Usage

Replace existing onboarding components with the new Supabase-backed versions:

```jsx
// OLD: Component with local state only
<StaffSetup data={data} updateData={updateData} onComplete={onComplete} />

// NEW: Component with Supabase state management  
import { OnboardingProvider } from '@/contexts/OnboardingContext'

<OnboardingProvider>
  <StaffSetup data={data} updateData={updateData} onComplete={onComplete} />
</OnboardingProvider>
```

## Key Features

### ✅ **Cross-Tab State Persistence**
- Form data automatically saved to database
- State restored when returning to tabs
- Real-time sync between multiple browser tabs

### ✅ **Conflict Resolution**
- Detects when changes occur in multiple tabs
- Modal interface for resolving conflicts
- Options: Accept remote, keep local, or merge changes

### ✅ **Offline Support**
- Changes queued when offline
- Automatic sync when connection restored
- Clear offline indicators in UI

### ✅ **Progress Tracking**
- Step completion tracking
- Overall onboarding progress percentage
- Visual indicators for current/completed steps

### ✅ **Auto-Save with Debouncing**
- Changes saved automatically after 1-2 seconds
- Debouncing prevents excessive database calls
- Clear save status indicators

## API Usage

### Basic Integration

```jsx
import { useOnboardingSession } from '@/contexts/OnboardingContext'

function MyOnboardingStep() {
  const {
    sessionData,           // Current session data from database
    progress,              // Step progress info
    saveStep,              // Save step data function
    markStepComplete,      // Mark step as completed
    isStepCompleted,       // Check if step is completed
    saveStatus,            // 'saving', 'saved', 'error', 'offline'
    hasUnsavedChanges,     // Boolean: unsaved local changes
    hasLocalChanges        // Boolean: changes not yet persisted
  } = useOnboardingSession('staff_setup')

  // Auto-save when data changes
  useEffect(() => {
    if (formData.length > 0) {
      saveStep('step_id', formData)
    }
  }, [formData])

  // Mark step complete
  const handleComplete = async () => {
    await markStepComplete('step_id')
    onNext()
  }
}
```

### Progress Indicator Integration

```jsx
import OnboardingProgressIndicator from '@/components/onboarding/OnboardingProgressIndicator'

function OnboardingLayout() {
  return (
    <div className="grid grid-cols-4 gap-8">
      <div className="col-span-1">
        <OnboardingProgressIndicator 
          currentSession="staff_setup"
          className="sticky top-8"
        />
      </div>
      <div className="col-span-3">
        {/* Onboarding steps */}
      </div>
    </div>
  )
}
```

## Database Schema

### `onboarding_sessions` Table

```sql
- id: UUID PRIMARY KEY
- user_id: UUID (references auth.users)
- barber_id: UUID (references profiles) -- For individual barber sessions
- session_type: VARCHAR(50) -- 'staff_setup', 'booking_rules', etc.
- current_step: VARCHAR(100) -- Current step identifier
- step_data: JSONB -- Flexible form data storage
- completed_steps: TEXT[] -- Array of completed step IDs
- is_completed: BOOLEAN -- Session completion status
- progress_percentage: INTEGER -- 0-100 progress percentage
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- expires_at: TIMESTAMP -- Auto-cleanup after 7 days
```

### Row Level Security (RLS)

- Users can only access their own onboarding sessions
- Barbers can access sessions for their assigned clients
- Automatic user isolation via RLS policies

## Error Handling

### Connection Issues
- Offline queue stores changes when disconnected
- Automatic sync when connection restored
- Clear UI indicators for offline status

### Conflict Resolution
- Cross-tab conflict modal appears for concurrent edits
- Three resolution options: accept remote, keep local, merge
- Prevents data loss from overwriting changes

### Database Errors
- Graceful fallback to local state if database fails
- Error messages shown to users
- Automatic retry mechanisms for failed saves

## Performance Optimizations

### Debouncing
- Form changes debounced by 1-2 seconds
- Prevents excessive database writes
- Configurable debounce timing per component

### Caching
- In-memory cache for frequently accessed sessions
- Optimistic updates for immediate UI feedback
- Cache invalidation on cross-tab updates

### Real-time Subscriptions
- Efficient PostgreSQL LISTEN/NOTIFY
- Selective subscriptions per session type
- Automatic cleanup of inactive subscriptions

## Testing

### Manual Testing Scenarios

1. **Cross-Tab Persistence**
   - Open onboarding in Tab A, fill out staff setup
   - Open new tab (Tab B), go to booking rules
   - Return to Tab A - data should be preserved

2. **Real-Time Sync**
   - Open same onboarding step in two tabs
   - Make changes in one tab
   - See changes appear in other tab automatically

3. **Conflict Resolution**
   - Open same step in two tabs
   - Make different changes in each tab
   - Conflict modal should appear with resolution options

4. **Offline Support**
   - Disconnect internet, make changes
   - Reconnect - changes should sync automatically
   - Proper offline indicators should show

## Troubleshooting

### Migration Issues
- If automated script fails, apply SQL manually
- Check Supabase project permissions
- Verify database connection in environment variables

### Real-time Sync Not Working
- Check if real-time is enabled in Supabase project
- Verify RLS policies allow read/write access
- Check browser console for subscription errors

### Performance Issues
- Adjust debounce timing in components
- Check for excessive re-renders with React DevTools
- Monitor database query performance in Supabase dashboard

## Security Considerations

- All data access controlled by Row Level Security
- Session data automatically expires after 7 days
- No sensitive data stored in session state
- User authentication required for all operations

## Future Enhancements

- **Step Dependencies**: Enforce step completion order
- **Branching Flows**: Different flows based on user choices
- **Analytics**: Track completion rates and drop-off points
- **Mobile Optimization**: Touch-friendly conflict resolution
- **Keyboard Shortcuts**: Power user navigation shortcuts

---

## Quick Start

1. Apply database migration (see Installation Steps)
2. Wrap your onboarding components with `OnboardingProvider`
3. Replace component state with `useOnboardingSession` hook
4. Add progress indicators and save status displays
5. Test cross-tab functionality

This solution provides a robust, scalable foundation for complex onboarding workflows with excellent user experience across multiple browser tabs.
# 📅 Phase 5-6: Google Calendar & AI Agents Integration
## 12-Week Enterprise Overhaul - Weeks 5-6

---

## 🎯 Mission Statement

**Transform the existing Google Calendar integration into a React Query-powered, AI-enhanced scheduling system** that provides intelligent appointment recommendations, automatic conflict resolution, and seamless multi-calendar synchronization.

---

## 📊 Starting Point Assessment

### ✅ What We Have (From Phase 1-4)
- **Phase 1-2**: Unified tenant resolution with `barbershop_id` standardization  
- **Phase 3-4**: React Query migration complete with hooks for services, appointments, dashboard
- **Google Calendar Core**: OAuth2 flow, token encryption, sync infrastructure (100% complete)
- **Database Schema**: `calendar_integrations`, `calendar_sync_history`, `calendar_conflicts` tables
- **API Endpoints**: 6 calendar endpoints fully implemented

### 🚀 What We're Building (Phase 5-6)
- **React Query Calendar Hooks**: Real-time calendar sync with optimistic updates
- **AI Smart Scheduling**: Intelligent appointment slot recommendations
- **Conflict Resolution UI**: Visual conflict management and auto-resolution
- **Multi-Calendar Support**: Staff individual calendar connections
- **Performance Optimization**: Background sync with progress indicators

---

## 🏗️ Implementation Architecture

### Layer 1: React Query Calendar Hooks
```javascript
// New hooks to implement
useCalendarAccounts()      // List connected calendars
useCalendarSync()          // Trigger and monitor sync
useCalendarSettings()      // Manage sync preferences  
useCalendarConflicts()     // Handle booking conflicts
useAISchedulingSuggestions() // AI-powered slot recommendations
```

### Layer 2: AI Agent Service
```javascript
// AI scheduling intelligence
class AISchedulingAgent {
  suggestOptimalSlots()     // Best times based on patterns
  predictNoShows()          // Risk assessment
  optimizeSchedule()        // Automatic rearrangement
  generateReminders()       // Smart notification timing
}
```

### Layer 3: Enhanced UI Components
```javascript
// Visual calendar management
<CalendarConnectionManager />  // OAuth flow + account management
<ConflictResolutionPanel />   // Visual conflict handling
<AISchedulingSidebar />       // Smart suggestions panel
<SyncProgressIndicator />     // Real-time sync status
```

---

## 📋 Detailed Implementation Tasks

### Week 5: React Query Integration & AI Foundation

#### Day 1-2: Calendar Hooks Implementation
- [ ] Create `useCalendarAccounts` hook with CRUD operations
- [ ] Implement `useCalendarSync` with progress tracking
- [ ] Add `useCalendarSettings` for preference management
- [ ] Create `useCalendarConflicts` with auto-resolution

#### Day 3-4: AI Scheduling Agent
- [ ] Implement `AISchedulingAgent` class
- [ ] Add pattern analysis for optimal slot detection
- [ ] Create no-show prediction algorithm
- [ ] Build schedule optimization engine

#### Day 5: Integration & Testing
- [ ] Connect hooks to existing calendar service
- [ ] Add React Query caching strategies
- [ ] Implement optimistic updates
- [ ] Create comprehensive test suite

### Week 6: UI Components & Production Polish

#### Day 1-2: Calendar Management UI
- [ ] Build `CalendarConnectionManager` component
- [ ] Create visual OAuth flow with progress steps
- [ ] Add multi-account management interface
- [ ] Implement disconnect/reconnect flows

#### Day 3-4: Conflict Resolution & AI UI
- [ ] Design `ConflictResolutionPanel` with drag-drop
- [ ] Build `AISchedulingSidebar` with recommendations
- [ ] Add `SyncProgressIndicator` with real-time updates
- [ ] Create notification preference controls

#### Day 5: Production Deployment
- [ ] Performance optimization and caching
- [ ] Error boundary implementation
- [ ] Production environment configuration
- [ ] Deployment and monitoring setup

---

## 🎯 Success Metrics

### Performance Targets
- **Sync Speed**: <1 second per 10 appointments
- **AI Suggestions**: <500ms response time
- **Cache Hit Rate**: >80% for calendar data
- **Conflict Detection**: 100% accuracy

### User Experience Goals
- **OAuth Completion**: <30 seconds end-to-end
- **Visual Feedback**: Real-time sync progress
- **AI Adoption**: 60% of suggested slots accepted
- **Error Recovery**: Automatic with user notification

---

## 💻 Code Implementation Plan

### 1. Calendar React Query Hooks

```javascript
// hooks/queries/useCalendar.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import calendarService from '@/services/calendar-integration-service'

export function useCalendarAccounts(shopId) {
  return useQuery({
    queryKey: queryKeys.calendar.accounts(shopId),
    queryFn: () => calendarService.getConnectedAccounts(shopId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useSyncCalendar() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ shopId, accountId }) => 
      calendarService.syncCalendar(shopId, accountId),
    onMutate: async ({ shopId }) => {
      // Show sync in progress
      queryClient.setQueryData(
        queryKeys.calendar.syncStatus(shopId),
        { status: 'syncing', progress: 0 }
      )
    },
    onSuccess: (data, { shopId }) => {
      // Invalidate appointments after sync
      queryClient.invalidateQueries(
        queryKeys.appointments.byShop(shopId)
      )
    }
  })
}
```

### 2. AI Scheduling Agent

```javascript
// services/ai-scheduling-agent.js
import { analyzePatterns } from '@/lib/ai-config'

export class AISchedulingAgent {
  async suggestOptimalSlots(shopId, date, duration) {
    // Analyze historical booking patterns
    const patterns = await this.analyzeBookingPatterns(shopId)
    
    // Get current availability
    const availability = await this.getAvailability(shopId, date)
    
    // AI recommendation engine
    const suggestions = await analyzePatterns({
      patterns,
      availability,
      duration,
      factors: ['peak_hours', 'customer_preferences', 'staff_efficiency']
    })
    
    return suggestions.map(slot => ({
      ...slot,
      confidence: slot.score,
      reasoning: slot.factors
    }))
  }
  
  async predictNoShowRisk(appointment) {
    // Factors: history, weather, time of day, advance notice
    const riskFactors = await this.analyzeRiskFactors(appointment)
    return {
      risk: riskFactors.score,
      factors: riskFactors.details,
      recommendation: riskFactors.score > 0.3 ? 'send_reminder' : 'normal'
    }
  }
}
```

### 3. Calendar Connection UI

```jsx
// components/calendar/CalendarConnectionManager.js
import { useCalendarAccounts, useConnectCalendar } from '@/hooks/queries/useCalendar'
import { Card, Button, Badge } from '@/components/ui'

export function CalendarConnectionManager({ shopId }) {
  const { data: accounts, isLoading } = useCalendarAccounts(shopId)
  const connectCalendar = useConnectCalendar()
  
  const handleConnect = () => {
    // Initiate OAuth flow
    window.location.href = '/api/calendar/google/auth'
  }
  
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Connected Calendars</h3>
        <Button onClick={handleConnect} variant="primary">
          + Connect Calendar
        </Button>
      </div>
      
      {accounts?.map(account => (
        <div key={account.id} className="flex items-center justify-between p-3 border rounded mb-2">
          <div className="flex items-center gap-3">
            <img src="/google-calendar-icon.svg" className="w-6 h-6" />
            <div>
              <p className="font-medium">{account.email}</p>
              <p className="text-sm text-gray-500">
                Last synced: {new Date(account.last_sync).toLocaleString()}
              </p>
            </div>
          </div>
          <Badge variant={account.sync_enabled ? 'success' : 'secondary'}>
            {account.sync_enabled ? 'Active' : 'Paused'}
          </Badge>
        </div>
      ))}
    </Card>
  )
}
```

### 4. AI Scheduling Sidebar

```jsx
// components/calendar/AISchedulingSidebar.js
import { useAISchedulingSuggestions } from '@/hooks/queries/useAI'
import { Card, Button } from '@/components/ui'

export function AISchedulingSidebar({ shopId, service, date }) {
  const { data: suggestions, isLoading } = useAISchedulingSuggestions(
    shopId, 
    service?.duration_minutes, 
    date
  )
  
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <span className="text-2xl">🤖</span>
        AI Suggestions
      </h3>
      
      {isLoading ? (
        <div className="animate-pulse">Analyzing patterns...</div>
      ) : (
        <div className="space-y-2">
          {suggestions?.map(slot => (
            <button
              key={slot.time}
              className="w-full p-3 text-left border rounded hover:bg-blue-50 transition-colors"
              onClick={() => selectTimeSlot(slot)}
            >
              <div className="font-medium">{slot.time}</div>
              <div className="text-sm text-gray-600">
                {slot.confidence}% match • {slot.reasoning}
              </div>
            </button>
          ))}
        </div>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        💡 These times are based on your typical booking patterns and customer preferences
      </div>
    </Card>
  )
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
// __tests__/hooks/useCalendar.test.js
describe('useCalendarAccounts', () => {
  it('fetches connected calendar accounts', async () => {
    const { result } = renderHook(() => useCalendarAccounts('shop-123'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })
})
```

### Integration Tests
```javascript
// __tests__/integration/calendar-sync.test.js
it('syncs appointments from Google Calendar', async () => {
  // Setup mock Google Calendar API
  // Trigger sync
  // Verify appointments created in database
})
```

### E2E Tests
```javascript
// tests/e2e/calendar-flow.spec.js
test('complete calendar connection flow', async ({ page }) => {
  await page.goto('/dashboard/calendar-settings')
  await page.click('text=Connect Calendar')
  // Complete OAuth flow
  // Verify calendar appears connected
  // Trigger sync and verify appointments
})
```

---

## 📊 Migration Path

### Step 1: Deploy Hook Infrastructure
```bash
# No breaking changes - additive only
npm run build
npm run test:calendar
npm run deploy:hooks
```

### Step 2: Update UI Components
```bash
# Progressive enhancement
npm run migrate:calendar-ui
```

### Step 3: Enable AI Features
```bash
# Feature flag controlled
npm run enable:ai-scheduling
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All React Query hooks implemented and tested
- [ ] AI scheduling agent trained on historical data
- [ ] Calendar UI components responsive and accessible
- [ ] Google OAuth credentials configured for production
- [ ] Rate limiting implemented for Google Calendar API

### Deployment
- [ ] Deploy hook infrastructure (no breaking changes)
- [ ] Update UI components progressively
- [ ] Enable AI features via feature flag
- [ ] Monitor sync performance and error rates
- [ ] Gather user feedback on AI suggestions

### Post-Deployment
- [ ] Monitor Google Calendar API usage
- [ ] Track AI suggestion acceptance rates
- [ ] Optimize sync performance based on metrics
- [ ] Iterate on conflict resolution algorithms
- [ ] Document patterns for Phase 7-8

---

## 📈 Expected Outcomes

### Technical Improvements
- **80% reduction** in calendar-related support tickets
- **3x faster** appointment sync vs manual entry
- **95% accuracy** in conflict detection
- **60% adoption** of AI-suggested time slots

### Business Impact
- **30% increase** in booking completion rate
- **50% reduction** in double-bookings
- **25% improvement** in schedule density
- **$15K/month** saved in administrative time

---

## 🎯 Success Criteria

### Week 5 Completion
- ✅ All calendar React Query hooks implemented
- ✅ AI scheduling agent deployed and tested
- ✅ Real-time sync working with progress indicators
- ✅ Conflict detection achieving 95% accuracy

### Week 6 Completion  
- ✅ Calendar connection UI fully functional
- ✅ AI suggestions integrated into booking flow
- ✅ Production deployment successful
- ✅ Monitoring and alerting configured

---

## 📚 Documentation & Handoff

### Key Files Created/Modified
```
hooks/queries/
├── useCalendar.js         # Calendar account management
├── useCalendarSync.js     # Sync operations
└── useAI.js              # AI scheduling hooks

services/
├── ai-scheduling-agent.js # AI recommendation engine
└── calendar-sync-service.js # Enhanced sync logic

components/calendar/
├── CalendarConnectionManager.js
├── AISchedulingSidebar.js
├── ConflictResolutionPanel.js
└── SyncProgressIndicator.js
```

### Next Phase Preview (7-8)
- Advanced AI analytics and predictions
- Multi-location calendar coordination
- Automated schedule optimization
- Voice-activated scheduling

---

*Phase 5-6 Implementation Plan*  
*Created: August 29, 2025*  
*Timeline: 2 weeks*  
*Dependencies: Phase 1-4 complete ✅*
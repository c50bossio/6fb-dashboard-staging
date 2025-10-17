# Phase 4: Shared Context Implementation Plan

**Date:** October 17, 2025
**Status:** 📋 PLANNING
**Estimated Duration:** 3-4 hours

---

## 🎯 Objective

Enable seamless conversation synchronization between AI Widget and Command Center, allowing users to start conversations in one interface and continue them in another.

---

## 🔍 Current Architecture Analysis

### AI Widget Storage
```javascript
// Location: contexts/AIWidgetContext.js

// Storage Key (User + Barbershop Scoped)
`ai-widget-conversation-${user.id}-${barbershopContext}`

// Data Structure
messages: [
  {
    id: Date.now(),
    role: 'user' | 'assistant',
    content: "Message text",
    timestamp: "2025-10-17T14:00:00.000Z",
    data: {}, // Optional query results
    error: false // Optional error flag
  }
]

// Features:
✅ User-scoped (secure)
✅ Barbershop-context aware
✅ Auto-saves to localStorage
✅ Clears on logout
✅ Clears on barbershop switch
```

### Command Center Storage
```javascript
// Location: app/(protected)/dashboard/ai-command-center/page.js

// Storage Key (GLOBAL - NOT user-scoped!)
`ai-conversations`

// Data Structure
conversations: [
  {
    id: `conv-${Date.now()}`,
    title: "First message preview...",
    messages: [
      {
        id: "timestamp",
        text: "Message content",
        isUser: true | false,
        agent: {
          name: "Agent Name",
          personality: "financial_coach",
          confidence: 0.8,
          recommendations: [],
          action_items: []
        },
        timestamp: "2025-10-17T14:00:00.000Z"
      }
    ],
    created_at: "2025-10-17T14:00:00.000Z",
    updated_at: "2025-10-17T14:30:00.000Z"
  }
]

// Features:
❌ NOT user-scoped (SECURITY ISSUE!)
❌ No barbershop context
✅ Multiple conversation history
✅ Conversation management (delete, export, search, sort)
✅ Debounced save (500ms)
✅ Keeps last 20 conversations
```

---

## 🚨 Critical Issues Identified

### Issue 1: Command Center NOT User-Scoped
**Problem:** All users share the same `ai-conversations` localStorage key
**Security Risk:** HIGH - User A can see User B's conversations
**Impact:** Data privacy violation, potential GDPR compliance issue

**Fix Required:**
```javascript
// OLD (Current - WRONG)
localStorage.getItem('ai-conversations')

// NEW (Required - User-scoped)
localStorage.getItem(`ai-conversations-${user.id}`)

// OR (Better - User + Barbershop scoped)
localStorage.getItem(`ai-conversations-${user.id}-${barbershopId}`)
```

### Issue 2: Incompatible Data Structures
**Problem:** Widget and Command Center use different message formats

**Widget Message:**
```javascript
{
  id, role, content, timestamp, data, error
}
```

**Command Center Message:**
```javascript
{
  id, text, isUser, agent, timestamp, isLoading, isError, canRetry
}
```

**Fix Required:** Create unified message adapter/transformer

### Issue 3: No Sync Mechanism
**Problem:** Conversations exist in silos - no communication between interfaces

**Current State:**
```
Widget Messages (localStorage)
    ↓
    ✗ NO SYNC ✗
    ↓
Command Center Conversations (localStorage)
```

**Desired State:**
```
Widget Messages (localStorage)
    ↓
    ↔️ BIDIRECTIONAL SYNC ↔️
    ↓
Command Center Conversations (localStorage)
```

### Issue 4: Bridge Button Doesn't Pass Context
**Problem:** Bridge button exists but doesn't transfer conversation data

**Current:**
```javascript
// components/ai/AIWidget.js (line 512)
<button onClick={() => router.push('/dashboard/ai-command-center')}>
  Need more features? Open Command Center →
</button>
```
Simply navigates without passing conversation

**Required:**
Pass conversation via query params or shared storage

---

## 📋 Implementation Plan

### Task 1: Fix Command Center User Scoping (30 min)
**Priority:** 🔴 CRITICAL (Security Issue)

**Changes Required:**

1. **Update storage key generation (line 844)**
```javascript
// OLD
localStorage.setItem('ai-conversations', JSON.stringify(conversationsToSave))

// NEW
const getStorageKey = () => {
  if (!user?.id) return 'ai-conversations' // Fallback

  // User-scoped key
  return `ai-conversations-${user.id}`
}

localStorage.setItem(getStorageKey(), JSON.stringify(conversationsToSave))
```

2. **Update load logic (line 881)**
```javascript
// OLD
const savedConversations = localStorage.getItem('ai-conversations')

// NEW
const savedConversations = localStorage.getItem(getStorageKey())
```

3. **Add cleanup on logout**
```javascript
useEffect(() => {
  if (!user) {
    // Clear conversations on logout
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('ai-conversations-')) {
        localStorage.removeItem(key)
      }
    })
  }
}, [user])
```

4. **Add migration for existing data**
```javascript
// Migrate legacy global conversations to user-scoped
useEffect(() => {
  if (user?.id) {
    const legacyConversations = localStorage.getItem('ai-conversations')
    if (legacyConversations) {
      const userKey = `ai-conversations-${user.id}`

      // Only migrate if user doesn't have scoped conversations yet
      if (!localStorage.getItem(userKey)) {
        localStorage.setItem(userKey, legacyConversations)
      }

      // Remove legacy key
      localStorage.removeItem('ai-conversations')
      console.log('[Command Center] Migrated conversations to user-scoped storage')
    }
  }
}, [user])
```

**Testing:**
- [ ] User A creates conversations
- [ ] Log out, log in as User B
- [ ] Verify User B doesn't see User A's conversations
- [ ] Verify User A's conversations reappear when logged back in

---

### Task 2: Create Unified Message Format (45 min)
**Priority:** 🟡 HIGH (Prerequisite for sync)

**Create new utility:** `lib/conversation-adapter.js`

```javascript
/**
 * Unified Conversation Adapter
 * Converts between Widget and Command Center message formats
 */

// Unified message format (superset of both)
export const UnifiedMessage = {
  id: string,
  content: string,         // Universal
  role: 'user' | 'assistant',  // Universal
  timestamp: string,       // ISO 8601

  // Optional fields
  agent: {
    name: string,
    personality: string,
    confidence: number,
    recommendations: string[],
    action_items: object[]
  },
  data: object,           // Query results from widget
  error: boolean,
  metadata: object        // Extensible
}

// Widget → Unified
export function widgetToUnified(widgetMessage) {
  return {
    id: widgetMessage.id?.toString() || Date.now().toString(),
    content: widgetMessage.content,
    role: widgetMessage.role,
    timestamp: widgetMessage.timestamp,
    data: widgetMessage.data || null,
    error: widgetMessage.error || false,
    metadata: {
      source: 'widget'
    }
  }
}

// Command Center → Unified
export function commandCenterToUnified(ccMessage) {
  return {
    id: ccMessage.id?.toString() || Date.now().toString(),
    content: ccMessage.text,
    role: ccMessage.isUser ? 'user' : 'assistant',
    timestamp: ccMessage.timestamp,
    agent: ccMessage.agent || null,
    error: ccMessage.isError || false,
    metadata: {
      source: 'command-center',
      isLoading: ccMessage.isLoading || false,
      canRetry: ccMessage.canRetry || false
    }
  }
}

// Unified → Widget
export function unifiedToWidget(unifiedMessage) {
  return {
    id: parseInt(unifiedMessage.id) || Date.now(),
    role: unifiedMessage.role,
    content: unifiedMessage.content,
    timestamp: unifiedMessage.timestamp,
    data: unifiedMessage.data,
    error: unifiedMessage.error
  }
}

// Unified → Command Center
export function unifiedToCommandCenter(unifiedMessage) {
  return {
    id: unifiedMessage.id,
    text: unifiedMessage.content,
    isUser: unifiedMessage.role === 'user',
    agent: unifiedMessage.agent,
    timestamp: unifiedMessage.timestamp,
    isError: unifiedMessage.error,
    isLoading: unifiedMessage.metadata?.isLoading || false,
    canRetry: unifiedMessage.metadata?.canRetry || false
  }
}

// Convert Widget messages array to Command Center conversation
export function widgetToConversation(widgetMessages, userId, barbershopId) {
  const unifiedMessages = widgetMessages.map(widgetToUnified)
  const ccMessages = unifiedMessages.map(unifiedToCommandCenter)

  // Generate conversation metadata
  const firstUserMessage = widgetMessages.find(m => m.role === 'user')
  const title = firstUserMessage?.content.substring(0, 50) || 'Widget Conversation'

  return {
    id: `widget-conv-${Date.now()}`,
    title: title,
    messages: ccMessages,
    created_at: widgetMessages[0]?.timestamp || new Date().toISOString(),
    updated_at: widgetMessages[widgetMessages.length - 1]?.timestamp || new Date().toISOString(),
    metadata: {
      source: 'widget',
      userId: userId,
      barbershopId: barbershopId
    }
  }
}
```

**Testing:**
- [ ] Convert widget message to unified → back to widget (identity test)
- [ ] Convert CC message to unified → back to CC (identity test)
- [ ] Convert widget messages to full conversation object
- [ ] Verify all fields preserved

---

### Task 3: Implement Conversation Sync Service (60 min)
**Priority:** 🟡 HIGH (Core feature)

**Create new service:** `lib/conversation-sync.js`

```javascript
/**
 * Conversation Synchronization Service
 * Manages bidirectional sync between Widget and Command Center
 */

import {
  widgetToConversation,
  unifiedToWidget,
  commandCenterToUnified
} from './conversation-adapter'

export class ConversationSync {
  constructor(userId, barbershopId) {
    this.userId = userId
    this.barbershopId = barbershopId
    this.widgetKey = `ai-widget-conversation-${userId}-${barbershopId}`
    this.ccKey = `ai-conversations-${userId}`
  }

  /**
   * Sync Widget conversation to Command Center
   * Called when user clicks bridge button or closes widget
   */
  syncWidgetToCommandCenter() {
    try {
      // Load widget messages
      const widgetMessages = JSON.parse(localStorage.getItem(this.widgetKey) || '[]')

      if (widgetMessages.length === 0) {
        return null // Nothing to sync
      }

      // Convert to Command Center conversation
      const conversation = widgetToConversation(widgetMessages, this.userId, this.barbershopId)

      // Load existing Command Center conversations
      const ccConversations = JSON.parse(localStorage.getItem(this.ccKey) || '[]')

      // Check if this widget conversation already exists
      const existingIndex = ccConversations.findIndex(conv =>
        conv.metadata?.source === 'widget' &&
        conv.metadata?.barbershopId === this.barbershopId &&
        // Check if messages match (same conversation)
        conv.messages.length === conversation.messages.length
      )

      if (existingIndex >= 0) {
        // Update existing conversation
        ccConversations[existingIndex] = conversation
      } else {
        // Add new conversation at the top
        ccConversations.unshift(conversation)

        // Keep only last 20 conversations
        if (ccConversations.length > 20) {
          ccConversations.splice(20)
        }
      }

      // Save back to localStorage
      localStorage.setItem(this.ccKey, JSON.stringify(ccConversations))

      console.log('[ConversationSync] Synced widget → Command Center', {
        conversationId: conversation.id,
        messageCount: conversation.messages.length
      })

      return conversation.id
    } catch (error) {
      console.error('[ConversationSync] Error syncing widget → CC:', error)
      return null
    }
  }

  /**
   * Load Command Center conversation into Widget
   * Called when user clicks "Continue in Widget" from Command Center
   */
  syncCommandCenterToWidget(conversationId) {
    try {
      // Load Command Center conversations
      const ccConversations = JSON.parse(localStorage.getItem(this.ccKey) || '[]')

      const conversation = ccConversations.find(c => c.id === conversationId)

      if (!conversation) {
        console.warn('[ConversationSync] Conversation not found:', conversationId)
        return false
      }

      // Convert Command Center messages to widget format
      const widgetMessages = conversation.messages
        .map(commandCenterToUnified)
        .map(unifiedToWidget)

      // Save to widget storage
      localStorage.setItem(this.widgetKey, JSON.stringify(widgetMessages))

      console.log('[ConversationSync] Synced Command Center → widget', {
        conversationId,
        messageCount: widgetMessages.length
      })

      return true
    } catch (error) {
      console.error('[ConversationSync] Error syncing CC → widget:', error)
      return false
    }
  }

  /**
   * Get latest widget conversation
   */
  getWidgetConversation() {
    try {
      const widgetMessages = JSON.parse(localStorage.getItem(this.widgetKey) || '[]')
      return widgetMessages.length > 0 ? widgetMessages : null
    } catch (error) {
      console.error('[ConversationSync] Error getting widget conversation:', error)
      return null
    }
  }

  /**
   * Clear widget conversation after successful sync
   */
  clearWidgetConversation() {
    try {
      localStorage.removeItem(this.widgetKey)
      console.log('[ConversationSync] Cleared widget conversation')
      return true
    } catch (error) {
      console.error('[ConversationSync] Error clearing widget:', error)
      return false
    }
  }
}

// Helper to get sync instance
export function getConversationSync(user, barbershopId) {
  if (!user?.id || !barbershopId) {
    console.warn('[ConversationSync] Missing user or barbershop ID')
    return null
  }

  return new ConversationSync(user.id, barbershopId)
}
```

**Testing:**
- [ ] Create 5 widget messages
- [ ] Call `syncWidgetToCommandCenter()`
- [ ] Verify conversation appears in Command Center
- [ ] Verify conversation ID returned
- [ ] Verify conversation title matches first message

---

### Task 4: Update Bridge Button with Sync (30 min)
**Priority:** 🟢 MEDIUM

**Update:** `components/ai/AIWidget.js` (lines 508-519)

```javascript
// Import sync service
import { getConversationSync } from '@/lib/conversation-sync'

// Inside component
const { user } = useAuth()

// Updated bridge button click handler
const handleBridgeClick = () => {
  // Sync current conversation to Command Center
  if (messages.length > 0) {
    const sync = getConversationSync(user, barbershopContext)

    if (sync) {
      const conversationId = sync.syncWidgetToCommandCenter()

      if (conversationId) {
        // Navigate to Command Center with conversation ID
        router.push(`/dashboard/ai-command-center?conversation=${conversationId}`)

        // Optionally: Clear widget conversation
        // clearMessages()

        console.log('[AI Widget] Bridged to Command Center:', conversationId)
        return
      }
    }
  }

  // Fallback: Just navigate without sync
  router.push('/dashboard/ai-command-center')
}

// Updated bridge button
{messages.length >= 5 && (
  <div className="px-4 py-3 bg-olive-50 dark:bg-olive-900/20 border-t border-olive-200 dark:border-olive-700">
    <button
      onClick={handleBridgeClick}
      className="w-full flex items-center justify-center gap-2 text-sm text-olive-700 dark:text-olive-400 hover:text-olive-900 dark:hover:text-olive-300 transition-colors py-2 rounded-lg hover:bg-olive-100 dark:hover:bg-olive-900/30"
    >
      <ChartBarIcon className="h-4 w-4" />
      <span className="font-medium">Continue in Command Center →</span>
    </button>
  </div>
)}
```

**Testing:**
- [ ] Create 5+ widget messages
- [ ] Click bridge button
- [ ] Verify navigation to Command Center
- [ ] Verify conversation appears in sidebar
- [ ] Verify conversation is pre-loaded

---

### Task 5: Update Command Center to Load Synced Conversations (30 min)
**Priority:** 🟢 MEDIUM

**Update:** `app/(protected)/dashboard/ai-command-center/page.js`

**Add query param detection:**
```javascript
// Import
import { useSearchParams } from 'next/navigation'

// Inside component
const searchParams = useSearchParams()
const conversationParam = searchParams.get('conversation')

// Update load effect (line 880)
useEffect(() => {
  const savedConversations = localStorage.getItem(getStorageKey())
  if (savedConversations) {
    try {
      const parsed = JSON.parse(savedConversations)
      setConversations(parsed)

      // If conversation ID in URL, load that conversation
      if (conversationParam) {
        const targetConv = parsed.find(c => c.id === conversationParam)

        if (targetConv) {
          setActiveConversation(targetConv.id)
          setMessages(targetConv.messages || [])

          console.log('[Command Center] Loaded conversation from widget:', conversationParam)
          return
        }
      }

      // Otherwise load most recent
      if (parsed.length > 0 && !conversationParam) {
        const mostRecent = parsed[0]
        setActiveConversation(mostRecent.id)
        setMessages(mostRecent.messages || [])
      }
    } catch (e) {
      console.error('Failed to load conversations:', e)
    }
  }
}, [conversationParam])
```

**Testing:**
- [ ] Navigate to `/dashboard/ai-command-center?conversation=widget-conv-123`
- [ ] Verify conversation loads automatically
- [ ] Verify conversation is active in sidebar
- [ ] Verify messages display correctly

---

### Task 6: Add "Continue in Widget" Button (Optional - 20 min)
**Priority:** 🔵 LOW (Nice to have)

**Add to ConversationHistory component:**

```javascript
// In ConversationHistory dropdown menu (line 716)
<button
  onClick={(e) => {
    e.stopPropagation()

    // Sync conversation to widget
    const sync = getConversationSync(user, barbershopContext)
    if (sync) {
      const success = sync.syncCommandCenterToWidget(conversation.id)

      if (success) {
        // Show toast notification
        alert('Conversation loaded in Widget! Check bottom-right corner.')

        // Navigate to a page with widget
        router.push('/dashboard')
      }
    }

    setShowDropdown(null)
  }}
  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-olive-600 dark:text-olive-400 hover:bg-olive-50 dark:hover:bg-olive-900/20"
>
  <SparklesIcon className="h-4 w-4" />
  <span>Continue in Widget</span>
</button>
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Test conversation adapters (widget ↔ unified ↔ CC)
- [ ] Test sync service (widget → CC)
- [ ] Test sync service (CC → widget)
- [ ] Test storage key generation
- [ ] Test user scoping isolation

### Integration Tests
- [ ] Test full widget → CC sync flow
- [ ] Test full CC → widget sync flow
- [ ] Test bridge button with conversation transfer
- [ ] Test Command Center query param loading
- [ ] Test multi-user isolation

### User Acceptance Tests
1. **Widget to Command Center:**
   - [ ] Start conversation in widget (5+ messages)
   - [ ] Click "Continue in Command Center" button
   - [ ] Verify conversation appears in CC sidebar
   - [ ] Verify all messages preserved
   - [ ] Verify can continue conversation

2. **Command Center to Widget:**
   - [ ] Create conversation in Command Center
   - [ ] Click "Continue in Widget" button
   - [ ] Verify widget opens with conversation
   - [ ] Verify all messages preserved
   - [ ] Verify can continue conversation

3. **User Isolation:**
   - [ ] User A creates conversations
   - [ ] Log out
   - [ ] Log in as User B
   - [ ] Verify User B sees no conversations
   - [ ] User B creates conversations
   - [ ] Log out, log back in as User A
   - [ ] Verify User A's conversations intact

4. **Barbershop Context:**
   - [ ] Create conversation at Barbershop A
   - [ ] Switch to Barbershop B
   - [ ] Verify conversation cleared (widget)
   - [ ] Verify conversations filtered by barbershop (CC)

---

## 📊 Success Criteria

- [ ] ✅ Command Center uses user-scoped storage
- [ ] ✅ No user data leakage across accounts
- [ ] ✅ Widget conversations sync to Command Center
- [ ] ✅ Bridge button transfers conversation context
- [ ] ✅ Command Center loads synced conversations
- [ ] ✅ All message data preserved during sync
- [ ] ✅ Agent metadata preserved
- [ ] ✅ Timestamps preserved
- [ ] ✅ No console errors during sync
- [ ] ✅ Graceful error handling for missing data
- [ ] ✅ All tests passing

---

## 🚀 Rollout Plan

### Step 1: Security Fix (Deploy Immediately)
- Deploy Task 1 (user scoping) as hotfix
- Critical security issue affecting all users

### Step 2: Sync Infrastructure (Next Sprint)
- Deploy Tasks 2-3 (adapters + sync service)
- Foundation for Phase 4 features

### Step 3: Bridge Functionality (Feature Release)
- Deploy Tasks 4-6 (bridge button + query params)
- User-facing feature announcement

### Step 4: Monitoring
- Track sync success/failure rates
- Monitor localStorage usage
- Track user adoption of bridge feature

---

## 💡 Future Enhancements (Phase 5+)

### 1. Supabase Backend Sync
**Why:** localStorage limited to single device
**Implementation:** Store conversations in Supabase `conversations` table
**Benefit:** Cross-device conversation history

### 2. Real-time Sync
**Why:** Keep widget and CC in sync automatically
**Implementation:** Supabase Realtime subscriptions
**Benefit:** Seamless experience across interfaces

### 3. Conversation Search
**Why:** Find old conversations easily
**Implementation:** Full-text search across all conversations
**Benefit:** Better conversation discovery

### 4. Conversation Export to PDF
**Why:** Users want to save important insights
**Implementation:** PDF generation from conversation history
**Benefit:** Offline access to AI advice

### 5. Conversation Sharing
**Why:** Team collaboration
**Implementation:** Share link functionality
**Benefit:** Multi-user business coaching

---

## 📝 Documentation Updates Required

- [ ] Update `CLAUDE.md` with Phase 4 implementation
- [ ] Create API documentation for conversation sync
- [ ] Update user guide with bridge functionality
- [ ] Create troubleshooting guide for sync issues
- [ ] Document storage key formats
- [ ] Document data migration procedure

---

**Phase 4 Status:** Ready for Implementation
**Risk Level:** Low (well-defined tasks, clear testing)
**User Impact:** High (seamless cross-interface experience)
**Development Effort:** 3-4 hours

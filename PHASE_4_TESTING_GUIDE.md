# Phase 4: Shared Context - Manual Testing Guide

This guide provides step-by-step instructions for manually testing Phase 4 features in a real browser environment.

## Prerequisites

✅ **Development server must be running**:
```bash
./dev-start.sh
```

✅ **You must be logged in as a test user**

✅ **Browser DevTools open (F12)** for localStorage inspection

---

## Test Suite Overview

| Test | Focus Area | Priority |
|------|-----------|----------|
| Test 1 | User-scoped storage security | 🔴 CRITICAL |
| Test 2 | Widget bridge button visibility | 🟡 HIGH |
| Test 3 | Widget → Command Center sync | 🔴 CRITICAL |
| Test 4 | Sync notification display | 🟡 HIGH |
| Test 5 | Message format conversion | 🟢 MEDIUM |
| Test 6 | Logout cleanup | 🔴 CRITICAL |
| Test 7 | Full integration workflow | 🔴 CRITICAL |

---

## Test 1: User-Scoped Storage Security (CRITICAL)

### Purpose
Verify that conversations are isolated per user with no data leakage.

### Steps

1. **Open DevTools Console** (F12 → Console tab)

2. **Check current storage keys**:
```javascript
// Paste in console:
const keys = Object.keys(localStorage);
const conversationKeys = keys.filter(k =>
  k.includes('ai-widget-conversation') ||
  k.includes('ai-conversations')
);

console.log('Total keys:', keys.length);
console.log('Conversation keys:', conversationKeys);
console.log('Keys:', conversationKeys.map(k => k.substring(0, 50)));
```

3. **Verify results**:
- ✅ **PASS**: All conversation keys contain user ID (format: `ai-conversations-${userId}`)
- ✅ **PASS**: No legacy global key `'ai-conversations'` exists
- ❌ **FAIL**: If you see `'ai-conversations'` without user ID suffix

### Expected Output
```javascript
Conversation keys: [
  'ai-widget-conversation-abc123def456...',
  'ai-conversations-abc123def456...'
]
```

### Security Check
```javascript
// Check for legacy global key (should be null)
console.log('Legacy key:', localStorage.getItem('ai-conversations')); // null = GOOD
```

---

## Test 2: Widget Bridge Button Visibility

### Purpose
Verify bridge button appears after 5 messages and functions correctly.

### Steps

1. **Navigate to Dashboard**: `http://localhost:9999/dashboard`

2. **Open AI Widget**:
   - Look for AI assistant icon (bottom-right corner typically)
   - Click to open Widget

3. **Seed test messages** (if Widget is empty):
```javascript
// Paste in DevTools console:
const user = JSON.parse(localStorage.getItem('sb-dfhqjdoydihajmjxniee-auth-token') || '{}');
const userId = user?.user?.id;

if (!userId) {
  console.error('❌ Not authenticated');
} else {
  const testMessages = [
    { id: 1, role: 'user', content: 'Test message 1', timestamp: new Date().toISOString() },
    { id: 2, role: 'assistant', content: 'Response 1', timestamp: new Date().toISOString() },
    { id: 3, role: 'user', content: 'Test message 2', timestamp: new Date().toISOString() },
    { id: 4, role: 'assistant', content: 'Response 2', timestamp: new Date().toISOString() },
    { id: 5, role: 'user', content: 'Test message 3', timestamp: new Date().toISOString() },
    { id: 6, role: 'assistant', content: 'Response 3', timestamp: new Date().toISOString() }
  ];

  const key = `ai-widget-conversation-${userId}`;
  localStorage.setItem(key, JSON.stringify(testMessages));
  console.log('✅ Seeded 6 test messages');

  // Refresh to load
  window.location.reload();
}
```

4. **After refresh, check Widget**:
   - ✅ **PASS**: Bridge button visible: "Continue in Command Center →"
   - ✅ **PASS**: Button has icon (ChartBarIcon)
   - ❌ **FAIL**: Button not visible with 5+ messages

---

## Test 3: Widget → Command Center Sync (CRITICAL)

### Purpose
Verify conversation data transfers correctly from Widget to Command Center.

### Steps

1. **Ensure Widget has 5+ messages** (from Test 2)

2. **Open DevTools Console** and prepare monitoring:
```javascript
// Monitor sync events
window.syncDebug = true;

// Override console.log to catch sync messages
const originalLog = console.log;
console.log = function(...args) {
  if (args[0]?.includes?.('Sync') || args[0]?.includes?.('synced')) {
    console.warn('🔄 SYNC EVENT:', ...args);
  }
  originalLog.apply(console, args);
};
```

3. **Click "Continue in Command Center →" button**

4. **Observe Console Output**:
```
Expected console logs:
✅ "[AIWidget] ✅ Synced conversation: synced-1234567890"
✅ "[ConversationSync] Saved X conversations"
```

5. **Verify Navigation**:
   - URL should change to: `http://localhost:9999/dashboard/ai-command-center?conversation=synced-XXXXX`
   - ✅ **PASS**: Query parameter present
   - ❌ **FAIL**: No query parameter

6. **Check Command Center localStorage**:
```javascript
// Paste in console:
const user = JSON.parse(localStorage.getItem('sb-dfhqjdoydihajmjxniee-auth-token') || '{}');
const userId = user?.user?.id;
const ccKey = `ai-conversations-${userId}`;
const ccData = JSON.parse(localStorage.getItem(ccKey) || '[]');

console.log('Command Center conversations:', ccData.length);
console.log('Latest conversation:', ccData[0]);
console.log('Synced from:', ccData[0]?.synced_from); // Should be 'widget'
```

7. **Verify Results**:
   - ✅ **PASS**: Command Center has new conversation
   - ✅ **PASS**: `synced_from: 'widget'`
   - ✅ **PASS**: Message count matches Widget
   - ❌ **FAIL**: No conversation or wrong data

---

## Test 4: Sync Notification Display

### Purpose
Verify success notification appears and can be dismissed.

### Steps

1. **After completing Test 3**, you should already be on Command Center page

2. **Check for notification banner**:
   - Look at top of page for green success banner
   - Should contain: "✨ Conversation synced from AI Widget"
   - Should have dismiss button (X icon)

3. **Verify auto-dismiss**:
   - Wait 5 seconds
   - ✅ **PASS**: Notification disappears automatically

4. **Manual dismiss test** (repeat Test 3 to get notification again):
   - Click X button on notification
   - ✅ **PASS**: Notification disappears immediately

---

## Test 5: Message Format Conversion

### Purpose
Verify messages convert correctly between Widget and Command Center formats.

### Steps

1. **Check Widget format in localStorage**:
```javascript
const user = JSON.parse(localStorage.getItem('sb-dfhqjdoydihajmjxniee-auth-token') || '{}');
const userId = user?.user?.id;
const widgetKey = `ai-widget-conversation-${userId}`;
const widgetData = JSON.parse(localStorage.getItem(widgetKey) || '[]');

console.log('Widget Message Example:');
console.log(widgetData[0]);
// Expected: { id: number, role: 'user', content: string, timestamp: string }
```

2. **Check Command Center format in localStorage**:
```javascript
const ccKey = `ai-conversations-${userId}`;
const ccData = JSON.parse(localStorage.getItem(ccKey) || '[]');

console.log('Command Center Message Example:');
console.log(ccData[0]?.messages[0]);
// Expected: { id: string, text: string, isUser: boolean, timestamp: string, agent: object }
```

3. **Verify conversion**:
   - Widget `role: 'user'` → Command Center `isUser: true` ✅
   - Widget `role: 'assistant'` → Command Center `isUser: false` ✅
   - Widget `content` → Command Center `text` ✅
   - Widget `id` (number) → Command Center `id` (string) ✅

---

## Test 6: Logout Cleanup (CRITICAL)

### Purpose
Verify all user conversation data is cleared on logout.

### Steps

1. **Check current conversation data**:
```javascript
const keys = Object.keys(localStorage).filter(k =>
  k.startsWith('ai-widget-conversation-') ||
  k.startsWith('ai-conversations-')
);
console.log('Before logout:', keys.length, 'conversation keys');
```

2. **Navigate to Command Center**: `http://localhost:9999/dashboard/ai-command-center`

3. **Click Logout button** (usually in top-right corner)

4. **After logout, check localStorage**:
```javascript
const keysAfter = Object.keys(localStorage).filter(k =>
  k.startsWith('ai-widget-conversation-') ||
  k.startsWith('ai-conversations-')
);
console.log('After logout:', keysAfter.length, 'conversation keys');
```

5. **Verify Results**:
   - ✅ **PASS**: `keysAfter.length === 0`
   - ❌ **FAIL**: Any conversation keys remain

### Security Impact
If this test fails, user conversation data persists after logout, which is a **CRITICAL SECURITY ISSUE**.

---

## Test 7: Full Integration Workflow (CRITICAL)

### Purpose
End-to-end validation of complete sync flow.

### Complete Workflow

#### Step 1: Fresh Start
```javascript
// Clear all conversation data
Object.keys(localStorage).forEach(k => {
  if (k.includes('ai-widget-conversation') || k.startsWith('ai-conversations-')) {
    localStorage.removeItem(k);
  }
});
console.log('✅ Cleared all conversation data');

// Refresh page
window.location.reload();
```

#### Step 2: Open Widget
1. Navigate to: `http://localhost:9999/dashboard`
2. Open AI Widget (click assistant icon)
3. Verify Widget is empty (no messages)

#### Step 3: Send Messages
Send at least 6 messages (alternating user/assistant):
1. Type: "Test message 1"
2. Wait for AI response
3. Type: "Test message 2"
4. Wait for AI response
5. Type: "Test message 3"
6. Wait for AI response

#### Step 4: Verify Bridge Button
- ✅ Bridge button should now be visible
- ✅ Button text: "Continue in Command Center →"

#### Step 5: Click Bridge Button
1. Click "Continue in Command Center →"
2. Watch console for sync logs
3. Wait for navigation

#### Step 6: Verify Command Center
- ✅ URL includes `?conversation=synced-XXXXX`
- ✅ Sync notification banner appears
- ✅ Messages are displayed in Command Center
- ✅ Message count matches Widget

#### Step 7: Check localStorage
```javascript
const user = JSON.parse(localStorage.getItem('sb-dfhqjdoydihajmjxniee-auth-token') || '{}');
const userId = user?.user?.id;

// Check Widget storage
const widgetKey = `ai-widget-conversation-${userId}`;
const widgetMsgs = JSON.parse(localStorage.getItem(widgetKey) || '[]');

// Check Command Center storage
const ccKey = `ai-conversations-${userId}`;
const ccConvs = JSON.parse(localStorage.getItem(ccKey) || '[]');

console.log('Widget messages:', widgetMsgs.length);
console.log('Command Center conversations:', ccConvs.length);
console.log('Latest CC conversation messages:', ccConvs[0]?.messages.length);

// Verify counts match
console.log('Message counts match:', widgetMsgs.length === ccConvs[0]?.messages.length);
```

#### Step 8: Verify Message Content
```javascript
const widgetFirst = widgetMsgs[0];
const ccFirst = ccConvs[0]?.messages[0];

console.log('Widget message:', widgetFirst);
console.log('Command Center message:', ccFirst);

// Check conversion
console.log('Content matches:', widgetFirst.content === ccFirst.text);
console.log('Role converted:',
  widgetFirst.role === 'user' && ccFirst.isUser === true ||
  widgetFirst.role === 'assistant' && ccFirst.isUser === false
);
```

#### Results
- ✅ **PASS**: All 8 steps completed successfully
- ❌ **FAIL**: Any step failed

---

## Test Results Summary

After completing all tests, fill out this summary:

### Test Results

| Test | Status | Notes |
|------|--------|-------|
| Test 1: User-scoped storage | ⬜ PASS / ⬜ FAIL | |
| Test 2: Bridge button | ⬜ PASS / ⬜ FAIL | |
| Test 3: Widget → CC sync | ⬜ PASS / ⬜ FAIL | |
| Test 4: Sync notification | ⬜ PASS / ⬜ FAIL | |
| Test 5: Format conversion | ⬜ PASS / ⬜ FAIL | |
| Test 6: Logout cleanup | ⬜ PASS / ⬜ FAIL | |
| Test 7: Full integration | ⬜ PASS / ⬜ FAIL | |

### Critical Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| | 🔴 CRITICAL / 🟡 HIGH / 🟢 LOW | |

---

## Debugging Common Issues

### Issue: Bridge button not appearing

**Symptoms**: Widget has 5+ messages but no bridge button

**Debug Steps**:
```javascript
// Check message count
const user = JSON.parse(localStorage.getItem('sb-dfhqjdoydihajmjxniee-auth-token') || '{}');
const userId = user?.user?.id;
const key = `ai-widget-conversation-${userId}`;
const msgs = JSON.parse(localStorage.getItem(key) || '[]');
console.log('Message count:', msgs.length);
console.log('Should show bridge:', msgs.length >= 5);
```

**Possible Causes**:
- React state not updated after localStorage change
- Component not re-rendering
- Wrong storage key being checked

**Solution**: Refresh page after seeding messages

---

### Issue: Sync creates conversation but navigation fails

**Symptoms**: Console shows sync success but URL doesn't have query parameter

**Debug Steps**:
```javascript
// Check if conversation was created
const ccKey = `ai-conversations-${userId}`;
const ccData = JSON.parse(localStorage.getItem(ccKey) || '[]');
console.log('Conversations:', ccData);
console.log('Latest ID:', ccData[0]?.id);
```

**Possible Causes**:
- Router navigation blocked
- Query parameter being stripped
- Conversation ID not returned from sync

**Solution**: Check browser console for navigation errors

---

### Issue: Messages don't appear in Command Center

**Symptoms**: Synced conversation exists but messages not displayed

**Debug Steps**:
```javascript
// Check conversation structure
const ccData = JSON.parse(localStorage.getItem(`ai-conversations-${userId}`) || '[]');
const conv = ccData.find(c => c.id === 'CONVERSATION_ID_FROM_URL');
console.log('Found conversation:', conv);
console.log('Message count:', conv?.messages?.length);
console.log('First message:', conv?.messages[0]);
```

**Possible Causes**:
- Message format invalid
- Conversation not loaded from URL parameter
- React state not updated

**Solution**: Check Command Center console logs for loading errors

---

### Issue: Notification doesn't appear

**Symptoms**: Sync works but no green success banner

**Debug Steps**:
1. Check if query parameter is present in URL
2. Check console for `[Command Center] Loading synced conversation`
3. Check React DevTools for `syncNotification` state

**Possible Causes**:
- useEffect not triggered
- Query parameter cleared too quickly
- Notification component not rendering

**Solution**: Refresh page with query parameter manually:
`http://localhost:9999/dashboard/ai-command-center?conversation=synced-1234567890`

---

## Performance Validation

### Sync Performance
```javascript
// Measure sync time
const start = performance.now();

// Click bridge button (or trigger sync programmatically)
// await sync.syncWidgetToCommandCenter();

const end = performance.now();
console.log(`Sync completed in ${end - start}ms`);

// Expected: < 200ms for 10 messages
```

### Expected Performance Benchmarks
- **Sync operation**: < 200ms for 10 messages
- **Format conversion**: < 50ms for 100 messages
- **Navigation**: < 500ms to Command Center
- **Notification display**: Immediate (< 100ms)

---

## Security Checklist

Before marking Phase 4 as production-ready:

- [ ] No legacy global keys (`'ai-conversations'`) remain
- [ ] All conversation keys are user-scoped (`-${userId}` suffix)
- [ ] Logout cleanup removes ALL conversation data
- [ ] No user can access another user's conversations
- [ ] Sync operation preserves message content accurately
- [ ] Message format conversion is lossless
- [ ] No sensitive data leaks in console logs (production)
- [ ] Query parameters are cleaned from URL after loading

---

## Next Steps

### If All Tests Pass ✅

Phase 4 is production-ready! Document results and proceed to:

1. **Create production deployment checklist**
2. **Update user documentation** with sync feature
3. **Add sync analytics tracking** (optional)
4. **Monitor sync usage in production**

### If Any Critical Tests Fail ❌

1. **Document failure details** in test results summary
2. **Create GitHub issue** with reproduction steps
3. **Fix identified bugs** before production deployment
4. **Re-run full test suite** after fixes

---

## Additional Testing Resources

### Playwright Automated Tests
```bash
# Run Phase 4 automated tests (requires dev server running)
npx playwright test tests/phase4-shared-context.spec.js

# Run with UI mode for debugging
npx playwright test tests/phase4-shared-context.spec.js --ui

# Run single test
npx playwright test tests/phase4-shared-context.spec.js -g "User-scoped storage"
```

### Browser DevTools Snippets

Save these as Snippets in Chrome DevTools for quick testing:

**Snippet 1: Check Storage State**
```javascript
const user = JSON.parse(localStorage.getItem('sb-dfhqjdoydihajmjxniee-auth-token') || '{}');
const userId = user?.user?.id;
console.log('User ID:', userId);

const keys = Object.keys(localStorage).filter(k =>
  k.includes('ai-widget-conversation') || k.includes('ai-conversations')
);
console.log('Conversation keys:', keys);

keys.forEach(key => {
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  const count = Array.isArray(data) ? data.length : data.messages?.length || 0;
  console.log(`${key}: ${count} items`);
});
```

**Snippet 2: Clear All Conversations**
```javascript
Object.keys(localStorage).forEach(k => {
  if (k.includes('ai-widget-conversation') || k.startsWith('ai-conversations-')) {
    localStorage.removeItem(k);
    console.log('Removed:', k);
  }
});
console.log('✅ All conversation data cleared');
```

**Snippet 3: Seed Test Data**
```javascript
const user = JSON.parse(localStorage.getItem('sb-dfhqjdoydihajmjxniee-auth-token') || '{}');
const userId = user?.user?.id;

if (!userId) {
  console.error('❌ Not authenticated');
} else {
  const messages = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Test message ${i + 1}`,
    timestamp: new Date(Date.now() + i * 1000).toISOString()
  }));

  const key = `ai-widget-conversation-${userId}`;
  localStorage.setItem(key, JSON.stringify(messages));
  console.log(`✅ Seeded ${messages.length} messages`);
  window.location.reload();
}
```

---

## Test Completion Certificate

After all tests pass:

```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   PHASE 4: SHARED CONTEXT - TEST CERTIFICATION      ║
║                                                      ║
║   All tests passed successfully                      ║
║   Date: [YYYY-MM-DD]                                ║
║   Tested by: [Your Name]                            ║
║   Environment: [Development/Staging/Production]      ║
║                                                      ║
║   ✅ User-scoped storage verified                    ║
║   ✅ Widget → Command Center sync functional         ║
║   ✅ Sync notification working correctly             ║
║   ✅ Logout cleanup verified                         ║
║   ✅ Full integration workflow validated             ║
║                                                      ║
║   Phase 4 is PRODUCTION READY                        ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

## Support

If you encounter issues during testing:

1. Check browser console for error messages
2. Verify dev server is running on port 9999
3. Ensure you're logged in with valid credentials
4. Clear browser cache and localStorage if behavior seems inconsistent
5. Try in incognito/private browsing mode to eliminate extension interference

**Important**: Phase 4 tests require actual user authentication and real localStorage access. Tests cannot fully run in headless mode without proper authentication setup.

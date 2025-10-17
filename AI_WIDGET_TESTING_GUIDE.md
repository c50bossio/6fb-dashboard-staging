# AI Widget Testing Guide 🧪

## Server Status: ✅ RUNNING

**Development Server:** http://localhost:9999
**Status:** Ready and responding
**Next.js Version:** 14.2.31

---

## 🎯 Manual Testing Protocol

### Phase 1: Light Mode Testing

#### Step 1: Navigate to Dashboard
1. Open browser: http://localhost:9999/dashboard
2. Log in with demo credentials (if required)
3. Locate the AI Widget floating button (bottom-right corner)

**Expected Result:**
- ✅ Sparkle icon button visible
- ✅ Button color: Olive-600 (`#3C4A3E`)
- ✅ Button has pulse animation
- ✅ Hover tooltip says "Ask me anything!"

#### Step 2: Open Widget (Light Mode)
1. Click the floating sparkle button
2. Widget panel should expand smoothly

**Expected Result:**
- ✅ Panel opens with smooth animation (300ms)
- ✅ Panel size: 400px × 600px
- ✅ Header: Olive-600 background with white text
- ✅ Content area: Light gray-50 background
- ✅ Input field: Light gray-100 background
- ✅ Border: Light gray-200

**Visual Checklist (Light Mode):**
```
Header:        bg-olive-600, text-white
Messages Area: bg-gray-50
Input Field:   bg-gray-100, border-gray-300
Text:          text-gray-900 (dark text on light bg)
Buttons:       hover:bg-olive-700
```

#### Step 3: Test Quick Actions
1. Click "💰 What's my revenue this week?"
2. Message should appear in chat

**Expected Result:**
- ✅ User message: Olive-600 background, white text
- ✅ Loading animation: Three bouncing dots
- ✅ AI response: White background, dark text
- ✅ Response includes revenue data (placeholder)
- ✅ Timestamp shows at bottom of messages

#### Step 4: Test Manual Input
1. Type in input field: "How many appointments do I have today?"
2. Press Enter or click send button

**Expected Result:**
- ✅ Input clears immediately
- ✅ User message appears with olive-600 background
- ✅ Loading animation shows
- ✅ AI responds with appointment data (placeholder)
- ✅ Scroll automatically to bottom

#### Step 5: Test Minimize/Maximize
1. Click the minimize button (minus icon in header)
2. Widget should collapse to header only
3. Click minimize again to expand

**Expected Result:**
- ✅ Smooth transition animation
- ✅ Conversation preserved when minimized
- ✅ Header stays visible when minimized

#### Step 6: Test Close/Reopen
1. Click the X button to close
2. Widget should disappear
3. Click floating button again
4. Widget should reopen with conversation intact

**Expected Result:**
- ✅ Widget closes smoothly
- ✅ Conversation history preserved
- ✅ Reopens to same state

---

### Phase 2: Dark Mode Testing

#### Step 1: Switch to Dark Mode
1. Locate theme toggle in navigation/header
2. Click to switch to dark mode
3. Observe widget color transition

**Expected Result:**
- ✅ Theme switches instantly (< 100ms)
- ✅ No flashing or flickering
- ✅ Widget adapts smoothly

#### Step 2: Verify Dark Mode Colors
Open the widget and check all colors:

**Visual Checklist (Dark Mode):**
```
Header:        bg-olive-700, text-white
Messages Area: bg-gray-900 (very dark)
User Messages: bg-olive-500 (lighter for contrast)
AI Messages:   bg-gray-800, text-gray-100
Input Field:   bg-gray-800, border-gray-600
Text:          text-gray-100 (light text on dark bg)
Buttons:       hover:bg-olive-800
```

#### Step 3: Test Contrast Ratios
Verify all text is readable:

**WCAG AA Requirements (4.5:1 minimum):**
- ✅ User message text (white on olive-500)
- ✅ AI message text (gray-100 on gray-800)
- ✅ Input placeholder text (gray-400 on gray-800)
- ✅ Header text (white on olive-700)
- ✅ Timestamp text (gray-400)

#### Step 4: Test Functionality in Dark Mode
Repeat all functionality tests from Light Mode:
1. Quick actions work
2. Manual input works
3. Loading states visible
4. Minimize/maximize works
5. Close/reopen preserves state

---

### Phase 3: Theme Switching Test

#### Step 1: Live Theme Switching
1. Open widget with conversation history
2. Switch theme while widget is open
3. Observe real-time color changes

**Expected Result:**
- ✅ Colors transition smoothly
- ✅ No layout shifts
- ✅ No hydration errors in console
- ✅ Conversation content unchanged
- ✅ Input field remains focused (if it was)

#### Step 2: System Preference Test
1. Set browser/OS to system theme preference
2. Change system theme
3. Verify widget adapts automatically

**Expected Result:**
- ✅ Widget follows system preference
- ✅ Changes apply immediately
- ✅ localStorage state maintained

---

### Phase 4: Functionality Testing

#### Test 1: Message Sending
**Test:** Send multiple messages in sequence

**Expected:**
- ✅ Messages send without delay
- ✅ Loading states show correctly
- ✅ Responses appear in order
- ✅ Auto-scroll to bottom works
- ✅ Input field stays accessible

#### Test 2: Error Handling
**Test:** Disconnect from internet, try sending message

**Expected:**
- ✅ Error message appears
- ✅ Error styled appropriately (red background)
- ✅ User can retry
- ✅ Widget remains functional

#### Test 3: Long Conversations
**Test:** Send 10+ messages to build conversation history

**Expected:**
- ✅ Scroll area works correctly
- ✅ Messages remain readable
- ✅ Performance stays smooth
- ✅ localStorage saves all messages

#### Test 4: Clear Conversation
**Test:** Click "Clear conversation" link

**Expected:**
- ✅ All messages removed
- ✅ localStorage cleared
- ✅ Welcome state returns
- ✅ Quick actions reappear

#### Test 5: Keyboard Shortcuts
**Test:** Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)

**Expected:**
- ✅ Widget toggles open/closed
- ✅ Works from any page
- ✅ Focus moves to input when opening

---

### Phase 5: Cross-Page Persistence

#### Test 1: Navigate Between Pages
1. Open widget on /dashboard
2. Send a message
3. Navigate to /dashboard/customers-enhanced
4. Navigate back to /dashboard

**Expected:**
- ✅ Widget state preserved
- ✅ Conversation history intact
- ✅ Widget position consistent
- ✅ No flickering or reloading

#### Test 2: Page Refresh
1. Open widget with conversation
2. Refresh page (Cmd+R / Ctrl+R)
3. Check widget state

**Expected:**
- ✅ Conversation loads from localStorage
- ✅ Widget closed state (by design)
- ✅ Can reopen with history intact

---

### Phase 6: Responsive Design

#### Test 1: Desktop Sizes
Test at: 1920px, 1440px, 1024px widths

**Expected:**
- ✅ Widget always visible
- ✅ Position stays bottom-right
- ✅ Panel size stays 400×600px
- ✅ No overlap with sidebar

#### Test 2: Tablet Size (768px)
**Expected:**
- ✅ Widget scales appropriately
- ✅ Touch targets adequate (44px minimum)
- ✅ Readable text sizes

#### Test 3: Mobile Size (375px)
**Expected:**
- ✅ Widget may be full-screen (acceptable)
- ✅ Or hidden with mobile-specific trigger
- ✅ Functional on touch devices

---

## 🐛 Known Issues to Watch For

### Issue 1: Hydration Mismatch
**Symptom:** Console error about hydration
**Check:** Widget has `mounted` state to prevent this
**Test:** Refresh page and check console

### Issue 2: Theme Flash
**Symptom:** Brief white flash when switching themes
**Check:** CSS variables and next-themes setup
**Test:** Rapid theme switching

### Issue 3: localStorage Quota
**Symptom:** Long conversations fail to save
**Check:** localStorage error handling in place
**Test:** Send 50+ messages

### Issue 4: Z-Index Conflicts
**Symptom:** Widget hidden behind other elements
**Check:** Widget has z-50
**Test:** Open with modals, dropdowns visible

---

## 📊 Automated Testing (Future)

### Playwright E2E Tests (To Be Written)

```javascript
// test/ai-widget.spec.js
test('AI Widget opens and displays correctly', async ({ page }) => {
  await page.goto('http://localhost:9999/dashboard')

  // Find floating button
  const button = page.locator('[aria-label="Open AI Assistant"]')
  await expect(button).toBeVisible()

  // Click to open
  await button.click()

  // Verify panel appears
  const panel = page.locator('text=AI Business Assistant')
  await expect(panel).toBeVisible()
})

test('Theme switching works correctly', async ({ page }) => {
  await page.goto('http://localhost:9999/dashboard')

  // Open widget
  await page.click('[aria-label="Open AI Assistant"]')

  // Switch to dark mode
  await page.click('[aria-label="Dark mode"]')

  // Verify dark mode classes applied
  const userMessage = page.locator('.bg-olive-500')
  await expect(userMessage).toHaveClass(/dark:bg-olive-500/)
})
```

---

## ✅ Test Completion Checklist

### Light Mode Tests
- [ ] Widget button visible and styled
- [ ] Panel opens smoothly
- [ ] User messages: olive-600 bg
- [ ] AI messages: white bg
- [ ] Input field accessible
- [ ] Quick actions work
- [ ] Manual input works
- [ ] Minimize/maximize works
- [ ] Close/reopen preserves state

### Dark Mode Tests
- [ ] Theme switch smooth
- [ ] Widget adapts colors
- [ ] User messages: olive-500 bg
- [ ] AI messages: gray-800 bg
- [ ] Sufficient contrast (WCAG AA)
- [ ] All functionality works
- [ ] No visual artifacts

### Theme Switching Tests
- [ ] Real-time color changes
- [ ] No flashing
- [ ] No layout shift
- [ ] Conversation preserved
- [ ] System preference works

### Functionality Tests
- [ ] Messages send correctly
- [ ] Loading states work
- [ ] Error handling works
- [ ] Long conversations work
- [ ] Clear conversation works
- [ ] Keyboard shortcuts work

### Persistence Tests
- [ ] State persists across pages
- [ ] Conversation survives refresh
- [ ] localStorage working
- [ ] No data loss

### Responsive Tests
- [ ] Works on desktop (1920px)
- [ ] Works on laptop (1440px)
- [ ] Works on tablet (768px)
- [ ] Functional on mobile (375px)

---

## 🎉 Success Criteria

**Phase 1 is complete when:**
- ✅ All Light Mode tests pass
- ✅ All Dark Mode tests pass
- ✅ Theme switching is smooth (< 100ms)
- ✅ All functionality tests pass
- ✅ Cross-page persistence works
- ✅ No console errors
- ✅ WCAG AA contrast compliance
- ✅ Widget is production-ready for user testing

---

## 📝 Test Report Template

After completing tests, document findings:

```markdown
# AI Widget Test Report
Date: [DATE]
Tester: [NAME]
Environment: [Browser, OS, Screen Size]

## Test Results

### Light Mode: [PASS/FAIL]
- Visual appearance: [PASS/FAIL]
- Functionality: [PASS/FAIL]
- Notes: [Any observations]

### Dark Mode: [PASS/FAIL]
- Visual appearance: [PASS/FAIL]
- Contrast ratios: [PASS/FAIL]
- Notes: [Any observations]

### Theme Switching: [PASS/FAIL]
- Transition speed: [ms]
- Visual artifacts: [YES/NO]
- Notes: [Any observations]

### Overall: [PASS/FAIL]
- Ready for production: [YES/NO]
- Issues found: [COUNT]
- Blockers: [LIST]
```

---

**Next Step:** Run through this testing guide manually and report any issues found!

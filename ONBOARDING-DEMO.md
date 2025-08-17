# 🎯 Onboarding Demo Guide for Pitches

## Quick Start - Show Onboarding Instantly

### Method 1: URL Parameter (EASIEST) ⭐
Just add `?onboarding=true` to the dashboard URL:

```
http://localhost:9999/dashboard?onboarding=true
```

Or combine with bypass mode:
```
http://localhost:9999/dashboard?bypass=true&onboarding=true
```

**This is the best method for demos!** Just bookmark this URL.

---

### Method 2: Resume Setup Button
If you're already on the dashboard and see the "Complete Your Setup" banner:
1. Click the **"Resume Setup"** button
2. Onboarding appears immediately

---

### Method 3: Browser Console (For Tech-Savvy Presenters)
Open browser console (F12) and run:
```javascript
localStorage.removeItem('onboarding_skipped');
localStorage.removeItem('onboarding_completed');
location.reload();
```

---

## Demo URLs - Copy & Paste Ready

### 🎨 Show Onboarding (Professional UI, No Emojis)
```
http://localhost:9999/dashboard?bypass=true&onboarding=true
```

### 📊 Show Regular Dashboard (Without Onboarding)
```
http://localhost:9999/dashboard?bypass=true
```

### 🔄 Toggle Between Views
- Add `&onboarding=true` to show onboarding
- Remove it to show normal dashboard
- Refresh page to apply changes

---

## What You'll See

When onboarding is triggered, you'll see:

1. **Professional SVG Illustrations** - Custom graphics, no emojis
2. **Gradient UI Elements** - Modern, polished design
3. **Multi-Step Flow**:
   - Business Information
   - Staff Setup
   - Schedule Configuration
   - Booking Rules
   - And more...

4. **Progress Indicators** - Shows completion status
5. **Skip/Resume Options** - Full control over the flow

---

## Tips for Demos

1. **Bookmark the Demo URL**: Save `http://localhost:9999/dashboard?bypass=true&onboarding=true` for instant access

2. **Clear Browser Data**: If onboarding gets stuck, open incognito/private window

3. **Fresh Start**: Use the debug tool at `/debug-onboarding.html` to reset everything

4. **Multiple Demos**: Each incognito window = fresh demo environment

---

## Troubleshooting

**Onboarding not showing?**
- Make sure URL has `?onboarding=true`
- Try incognito/private browsing mode
- Clear browser cache/cookies

**Want to hide onboarding?**
- Remove `&onboarding=true` from URL
- Or click "Skip for now" in the onboarding modal

**Need to reset everything?**
- Open `/debug-onboarding.html`
- Click "Complete Reset"
- Start fresh

---

## Quick Reference Card

| What You Want | URL to Use |
|--------------|------------|
| Show onboarding | `?bypass=true&onboarding=true` |
| Hide onboarding | `?bypass=true` |
| Fresh demo | Open in incognito + add `?onboarding=true` |
| Reset state | Visit `/debug-onboarding.html` |

💡 **Pro Tip**: Create browser bookmarks for each URL for instant switching during presentations!
# 🔍 Sentry Setup Guide

## 1️⃣ Create Sentry Account

1. Go to [https://sentry.io](https://sentry.io)
2. Sign up for free account
3. Create a new project:
   - Platform: **Next.js**
   - Project name: `6fb-ai-agent`
   - Team: Create new or use existing

## 2️⃣ Get Your DSN

After creating the project:
1. Go to **Settings** → **Projects** → **6fb-ai-agent**
2. Click on **Client Keys (DSN)**
3. Copy your DSN (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)

## 3️⃣ Update Your Environment

Add to your `.env.local`:
```env
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@sentry.io/your-project-id
SENTRY_DSN=https://your-dsn-here@sentry.io/your-project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=6fb-ai-agent
SENTRY_AUTH_TOKEN=your-auth-token (for source maps)
```

## 4️⃣ Test Sentry Integration

Create a test page to verify Sentry is working:

```javascript
// app/test-sentry/page.js
'use client'

export default function TestSentry() {
  return (
    <div className="p-8">
      <h1>Test Sentry Error Tracking</h1>
      <button
        onClick={() => {
          throw new Error("Test Sentry Error")
        }}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        Trigger Test Error
      </button>
    </div>
  )
}
```

## 5️⃣ Backend Integration

The Python backend will automatically use Sentry when you start it:

```python
# Already configured in main_complex.py
from services.sentry_config import init_sentry
init_sentry(app)
```

## 6️⃣ Verify It's Working

1. **Frontend**: Click the "Trigger Test Error" button
2. **Backend**: Make a request that causes an error
3. **Check Sentry Dashboard**: Errors should appear within seconds

## 🎯 What Sentry Gives You

### Immediate Benefits:
- **Real Error Alerts**: Email/Slack notifications
- **Session Replay**: See exactly what user did
- **Stack Traces**: Full error context
- **Performance Monitoring**: Slow API calls
- **User Impact**: Know which users are affected

### Error Details Include:
- Browser/OS information
- User actions before error
- Network requests
- Console logs
- Screenshots (with replay)

## 🔧 Advanced Features

### Custom Error Context
```javascript
import { captureException } from '../lib/sentry'

try {
  // Your code
} catch (error) {
  captureException(error, {
    aiAgent: 'business_coach',
    action: 'generating_response',
    userId: user.id
  })
}
```

### Performance Tracking
```javascript
import * as Sentry from '@sentry/nextjs'

const transaction = Sentry.startTransaction({
  name: 'ai-chat-response',
  op: 'ai.generate'
})

// Your slow operation
const response = await generateAIResponse()

transaction.finish()
```

### User Identification
```javascript
import { setUser } from '../lib/sentry'

// After login
setUser({
  id: user.id,
  email: user.email,
  username: user.barbershop_name
})
```

## 📊 Sentry Dashboard Features

Once errors start flowing:
- **Issues**: Grouped errors with frequency
- **Performance**: Transaction traces
- **Releases**: Track error rates by version
- **User Feedback**: Users can add context
- **Alerts**: Set up custom notifications

## 🚨 Common Issues

### "DSN not found"
→ Check your `.env.local` has the correct DSN

### "No errors showing up"
→ Errors might be filtered in development, check `beforeSend`

### "Too many events"
→ Adjust `tracesSampleRate` to reduce volume

---

Ready to test? Visit `/test-sentry` after setup!
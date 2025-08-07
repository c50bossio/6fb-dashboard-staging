# 🚀 SDK Implementation Guide - Day by Day

## Day 1-2: Supabase Migration

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Create new project (save credentials)
3. Note your Project URL and anon key

### Step 2: Database Migration Script
```sql
-- Run in Supabase SQL Editor
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  barbershop_name TEXT,
  barbershop_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Sessions table
CREATE TABLE ai_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights table
CREATE TABLE insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_sessions_user_id ON ai_sessions(user_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_insights_user_id ON insights(user_id);
```

### Step 3: Update Backend Code
```python
# services/database/supabase_client.py
from supabase import create_client, Client
import os

class SupabaseDB:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        self.client: Client = create_client(url, key)
    
    async def create_user(self, user_data):
        result = self.client.table('users').insert(user_data).execute()
        return result.data[0] if result.data else None
    
    async def get_user_by_email(self, email):
        result = self.client.table('users').select("*").eq('email', email).execute()
        return result.data[0] if result.data else None
```

### Step 4: Data Migration Script
```python
# scripts/migrate_to_supabase.py
import sqlite3
from supabase import create_client
import os

# Connect to SQLite
sqlite_conn = sqlite3.connect('agent_system.db')
sqlite_conn.row_factory = sqlite3.Row

# Connect to Supabase
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# Migrate users
users_cursor = sqlite_conn.execute("SELECT * FROM users")
for user in users_cursor:
    user_dict = dict(user)
    # Remove SQLite-specific fields
    user_dict.pop('id', None)
    supabase.table('users').insert(user_dict).execute()

print("Migration complete!")
```

## Day 3: Sentry Integration

### Step 1: Frontend Setup
```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

### Step 2: Backend Setup
```python
# main.py - Add to top
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[FastApiIntegration(transaction_style='endpoint')],
    traces_sample_rate=1.0,
    environment=os.getenv("ENVIRONMENT", "production")
)
```

### Step 3: Error Tracking Component
```javascript
// components/ErrorBoundary.js
import { withSentry } from '../lib/sentry'

function ErrorFallback({ error, resetError }) {
  return (
    <div className="error-container">
      <h2>Something went wrong</h2>
      <details>
        <summary>Error details</summary>
        <pre>{error.message}</pre>
      </details>
      <button onClick={resetError}>Try again</button>
    </div>
  )
}

export default withSentry(ErrorFallback)
```

## Day 4-5: Clerk Authentication

### Step 1: Install and Configure
```bash
npm install @clerk/nextjs
```

### Step 2: Update Layout
```javascript
// app/layout.js
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### Step 3: Replace Auth Pages
```javascript
// app/sign-in/[[...sign-in]]/page.js
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return <SignIn />
}

// app/sign-up/[[...sign-up]]/page.js
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return <SignUp />
}
```

### Step 4: Protect Routes
```javascript
// middleware.js
import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  publicRoutes: ['/', '/api/webhooks/(.*)']
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)']
}
```

## Verification Checklist

### After Each Phase:
- [ ] All tests pass
- [ ] No console errors
- [ ] Data migrated successfully
- [ ] Auth flows work
- [ ] Error tracking active
- [ ] Performance acceptable

### Before Production:
- [ ] Environment variables set
- [ ] SSL certificates configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place
- [ ] Load testing completed

## Quick Rollback

If something goes wrong:
```bash
# Restore from backup
git checkout main
docker-compose down
docker-compose up -d

# Restore database
sqlite3 agent_system.db < backup.sql
```

## Support & Help

- **Supabase Issues**: Check connection string, RLS policies
- **Sentry Issues**: Verify DSN, check network
- **Clerk Issues**: Check publishable key, webhook signing
- **General Issues**: Check console, network tab, server logs

Remember: Start with free tiers, test everything in staging first!
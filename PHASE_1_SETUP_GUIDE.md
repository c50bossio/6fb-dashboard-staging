# Phase 1 Setup Guide - Supabase & Sentry

## ✅ Completed Setup

### 1. Supabase Integration
- ✅ Installed Supabase packages (@supabase/ssr, @supabase/supabase-js)
- ✅ Created Supabase client configuration files
- ✅ Setup middleware for session management
- ✅ Created comprehensive database schema (supabase-schema.sql)
- ✅ Built migration script from SQLite to PostgreSQL
- ✅ Created SupabaseAuthProvider component

### 2. Sentry Error Tracking
- ✅ Installed @sentry/nextjs
- ✅ Created Sentry configuration files (client, server, edge)
- ✅ Updated next.config.js with Sentry integration
- ✅ Added global error handler
- ✅ Created Sentry utility functions

## 🚀 Next Steps to Complete Phase 1

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key
3. Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

4. Add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### 2. Initialize Supabase Database
1. Go to your Supabase project's SQL editor
2. Copy and run the contents of `database/supabase-schema.sql`
3. This will create all necessary tables with RLS policies

### 3. Migrate Existing Data
```bash
# Install Python dependencies
pip install python-dotenv supabase

# Run migration script
python scripts/migrate-to-supabase.py
```

### 4. Create Sentry Project
1. Go to [sentry.io](https://sentry.io) and create a new project
2. Select "Next.js" as the platform
3. Copy your DSN
4. Add to `.env.local`:
```
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

### 5. Update Authentication Flow
Replace the current AuthContext with the new SupabaseAuthProvider:

```javascript
// app/layout.js
import { SupabaseAuthProvider } from '@/components/SupabaseAuthProvider'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SupabaseAuthProvider>
          {children}
        </SupabaseAuthProvider>
      </body>
    </html>
  )
}
```

### 6. Update API Routes
Update your API routes to use Supabase client:

```javascript
// Example: app/api/v1/agents/route.js
import { createClient } from '@/lib/supabase/server'
import { captureException } from '@/lib/sentry'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch data
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return Response.json({ agents: data })
  } catch (error) {
    captureException(error, { 
      endpoint: 'GET /api/v1/agents',
      user: user?.id 
    })
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

### 7. Test the Setup

#### Test Supabase Auth:
```javascript
// Create a test page: app/test-auth/page.js
'use client'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function TestAuth() {
  const { user, signIn, signOut, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {user ? (
        <>
          <p>Logged in as: {user.email}</p>
          <button onClick={signOut}>Sign Out</button>
        </>
      ) : (
        <button onClick={() => signIn({ 
          email: 'test@example.com', 
          password: 'testpassword' 
        })}>
          Sign In
        </button>
      )}
    </div>
  )
}
```

#### Test Sentry:
```javascript
// Create a test error button
<button onClick={() => {
  throw new Error('Test Sentry Error')
}}>
  Trigger Test Error
</button>
```

### 8. Clean Up Old Code
Once everything is working:
1. Remove old SQLite dependencies
2. Remove old auth service files
3. Update all components to use new auth

## 📊 Verification Checklist

- [ ] Supabase project created and configured
- [ ] Database schema applied successfully
- [ ] Data migrated from SQLite
- [ ] Authentication working (login/logout)
- [ ] Sentry capturing errors
- [ ] All API routes updated
- [ ] Old auth system removed

## 🎉 Phase 1 Complete!

Once all checklist items are done, Phase 1 is complete. Your app now has:
- ✅ Enterprise-grade PostgreSQL database
- ✅ Secure authentication with Supabase Auth
- ✅ Real-time error tracking with Sentry
- ✅ Proper session management
- ✅ Row Level Security (RLS)

Ready to move to Phase 2: AI Streaming & Payments!
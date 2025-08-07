# 🔐 Clerk Authentication Setup Guide

## 1️⃣ Create Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Sign up for free account
3. Create new application:
   - Application name: `6FB AI Agent`
   - Choose authentication methods:
     - ✅ Email address
     - ✅ Google OAuth
     - ✅ Apple (optional)

## 2️⃣ Get Your API Keys

After creating the application:
1. Go to **API Keys** in left sidebar
2. Copy these values to your `.env.local`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## 3️⃣ Set Up Webhooks (Important!)

1. In Clerk Dashboard, go to **Webhooks**
2. Click **Add Webhook**
3. Configure:
   - **Endpoint URL**: `https://your-domain.com/api/webhooks/clerk`
   - For local testing: Use [ngrok](https://ngrok.com) or [localtunnel](https://localtunnel.me)
   - Events to listen:
     - ✅ user.created
     - ✅ user.updated
     - ✅ user.deleted
4. Copy the **Signing Secret** to `.env.local`:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_xxxxx
   ```

## 4️⃣ Update Your Code

### Replace the layout file:
```bash
# Backup current layout
mv app/layout.js app/layout-old.js

# Use Clerk layout
mv app/layout-with-clerk.js app/layout.js
```

### Install dependencies:
```bash
npm install @clerk/nextjs svix
```

### Run Supabase migration:
```sql
-- In Supabase SQL Editor, run:
-- scripts/supabase-clerk-migration.sql
```

## 5️⃣ Test Authentication

1. Start your app:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:9999
3. Click "Sign In" 
4. Create a test account
5. Verify you're redirected to dashboard

## 6️⃣ Verify User Sync

After signing up:
1. Check Clerk Dashboard → **Users** (should see new user)
2. Check Supabase → **Table Editor** → **users** (should see synced user)
3. Check Sentry → Should identify user in errors

## 🎯 What Clerk Gives You

### Immediate Benefits:
- **Beautiful Auth UI**: Pre-built, customizable components
- **Social Logins**: Google, Apple, GitHub, etc.
- **Security**: MFA, device management, suspicious login detection
- **User Management**: Full dashboard with user profiles
- **Session Management**: Automatic token refresh

### Advanced Features:
- **Organizations**: Multi-tenant support
- **Roles & Permissions**: Built-in RBAC
- **Magic Links**: Passwordless authentication
- **SMS/Email OTP**: Additional verification
- **Webhooks**: Real-time user events

## 🔧 Customization

### Appearance:
```javascript
// lib/clerk-config.js - Already configured!
appearance: {
  elements: {
    formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
    card: 'bg-white shadow-lg',
    // ... more customization
  }
}
```

### Protected Routes:
```javascript
// Use in any component
import ClerkProtectedRoute from '@/components/ClerkProtectedRoute'

export default function ProtectedPage() {
  return (
    <ClerkProtectedRoute>
      {/* Your protected content */}
    </ClerkProtectedRoute>
  )
}
```

### User Button:
```javascript
// Add to any navigation
import ClerkUserButton from '@/components/ClerkUserButton'

<nav>
  <ClerkUserButton />
</nav>
```

## 📊 Monitoring

### Clerk Dashboard shows:
- Active users
- Sign-in methods used
- Failed login attempts
- Device management
- Session analytics

### Supabase shows:
- Synced user data
- User activity
- Database relationships

### Sentry shows:
- User-specific errors
- Session replays by user

## 🚨 Common Issues

### "Invalid API key"
→ Check NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local

### "User not syncing to Supabase"
→ Check webhook secret and endpoint URL

### "Redirect loops"
→ Verify afterSignInUrl and afterSignUpUrl are correct

### "Styles not applying"
→ Make sure Tailwind processes Clerk components

## 🎉 Success Checklist

- [ ] Sign up works
- [ ] Sign in works
- [ ] Google OAuth works (if configured)
- [ ] User appears in Clerk dashboard
- [ ] User synced to Supabase
- [ ] Protected routes redirect properly
- [ ] User button shows avatar/email
- [ ] Sign out works

---

Next: Move to Phase 2 - LangChain integration!
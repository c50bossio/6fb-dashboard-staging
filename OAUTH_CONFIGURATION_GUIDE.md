# OAuth Configuration Fix for 6FB AI Agent System

## Root Cause Analysis
The OAuth authentication is failing because Google Cloud Console redirect URLs don't match the actual OAuth flow.

## Current Issue
- OAuth callbacks are failing and redirecting to `/auth/auth-code-error`
- Google OAuth flow reaches consent screen but fails during code exchange
- Users cannot complete authentication

## Required Google Cloud Console Configuration

### 1. OAuth Consent Screen
- **Authorized domains**: `dfhqjdoydihajmjxniee.supabase.co`
- **Scopes**: 
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile` 
  - `openid`

### 2. OAuth Client ID (Web Application)
- **Authorized JavaScript origins**:
  - `https://bookedbarber.com`
  - `https://6fb-ai-dashboard-3y8ryqviu-6fb.vercel.app` (current deployment)
  - `http://localhost:9999` (for local development)

- **Authorized redirect URLs**:
  - `https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback`

### 3. Supabase Dashboard Configuration
- **Client ID**: [From Google Cloud Console]
- **Client Secret**: [From Google Cloud Console]

## OAuth Flow Explanation
1. User clicks "Sign in with Google" on your app
2. App redirects to Google OAuth consent screen
3. User consents and Google redirects to: `https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback`
4. Supabase processes the OAuth code and redirects to your app's callback: `/auth/callback`
5. Your app's callback route handles the session and redirects to dashboard

## Critical Points
- **Never** put your app's domain in Google's redirect URLs
- **Always** use the Supabase project callback URL: `https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback`
- Your app's JavaScript origins should include all domains where the OAuth button appears
- Your app's callback route (`/auth/callback`) handles the final redirect from Supabase

## CRITICAL ISSUE IDENTIFIED: Site URL Configuration

### Problem
The `exchangeCodeForSession` is failing because Supabase's **Site URL** configuration doesn't match the production domain where users are initiating OAuth.

### Solution: Fix Supabase Site URL Configuration

#### 1. Update Site URL in Supabase Dashboard
Go to: **Supabase Dashboard → Project Settings → API → Site URL**
- **Current**: Likely set to Vercel URL or localhost
- **Required**: `https://bookedbarber.com`

#### 2. Update Redirect Allow List
Go to: **Supabase Dashboard → Authentication → URL Configuration**
Add these redirect URLs:
- `https://bookedbarber.com/**`
- `https://www.bookedbarber.com/**`
- `https://*-6fb.vercel.app/**` (for staging)
- `http://localhost:9999/**` (for development)

#### 3. Verify Environment Variables
Ensure production environment has:
```bash
NEXT_PUBLIC_SITE_URL=https://bookedbarber.com
```

#### 4. Test OAuth Flow Again
After making these changes:
1. Clear browser cache/cookies
2. Test OAuth from `bookedbarber.com`
3. Verify successful redirect to dashboard

### Why This Fixes the Issue
- Supabase validates the Site URL during `exchangeCodeForSession`
- If the requesting domain doesn't match the configured Site URL, the code exchange fails
- This causes the redirect to auth-code-error page

## Next Steps
1. ✅ Update Google Cloud Console with correct redirect URL (COMPLETED)
2. 🔧 Fix Supabase Site URL configuration (IN PROGRESS)
3. 🔧 Update Supabase redirect allow list
4. ✅ Verify Supabase dashboard has correct Google OAuth credentials (COMPLETED)
5. 🧪 Test OAuth flow end-to-end after Site URL fix
6. 🧹 Remove debugging code from callback route

## Production Domains to Include
- `https://bookedbarber.com` (PRIMARY - must match Site URL)
- `https://www.bookedbarber.com`
- `https://6fb-ai-dashboard-*.vercel.app` (staging/development)
- `http://localhost:9999` (development only)
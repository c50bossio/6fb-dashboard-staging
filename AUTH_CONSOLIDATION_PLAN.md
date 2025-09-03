# Authentication Endpoints Consolidation Plan

## Current State Analysis

### REDUNDANT LOGIN ENDPOINTS:
1. `/api/auth/login/route.js` - Supabase direct login (PRIMARY)
2. `/api/v1/auth/login/route.js` - Proxy to Python backend (LEGACY)

### REDUNDANT LOGOUT ENDPOINTS:
1. `/api/auth/logout/route.js` - Basic Supabase signOut 
2. `/api/auth/signout/route.js` - Advanced signOut with cookie clearing (BETTER)
3. `/api/v1/auth/logout/route.js` - Proxy to Python backend (LEGACY)
4. `/api/auth/force-logout/route.js` - Force logout variant

### REDUNDANT REGISTRATION ENDPOINTS:
1. `/api/auth/signup/route.js` - Likely Supabase signup
2. `/api/v1/auth/register/route.js` - Proxy to Python backend (LEGACY)

### REDUNDANT USER INFO ENDPOINTS:
1. `/api/auth/user/route.js` - Get current user
2. `/api/v1/auth/me/route.js` - Proxy to Python backend (LEGACY)

### SPECIALIZED ENDPOINTS (KEEP):
- `/api/auth/callback/route.js` - OAuth callback handler
- `/api/auth/exchange/route.js` - Token exchange
- `/api/auth/exchange-code/route.js` - Code exchange
- `/api/auth/exchange-code-v2/route.js` - V2 code exchange
- `/api/auth/refresh/route.js` - Token refresh
- `/api/auth/memory/route.js` - Memory management
- `/api/auth/magic-link/route.js` - Magic link auth
- `/api/auth/google/route.js` - Google OAuth
- `/api/auth/ensure-profile/route.js` - Profile creation
- `/api/auth/switch-context/route.js` - Context switching
- `/api/auth/session/route.js` - Session management
- `/api/auth/health/route.js` - Health check
- `/api/calendar/google/auth/route.js` - Google Calendar auth

## Consolidation Strategy

### Phase 1: Remove Legacy Python Backend Proxies
**ACTION**: Delete all `/api/v1/auth/*` endpoints that proxy to Python backend

**RATIONALE**: The system is now using Supabase directly, Python backend proxies are no longer needed

**FILES TO DELETE**:
- `/api/v1/auth/login/route.js`
- `/api/v1/auth/logout/route.js` 
- `/api/v1/auth/register/route.js`
- `/api/v1/auth/me/route.js`

### Phase 2: Consolidate Redundant Supabase Endpoints
**ACTION**: Keep the best implementation of each function

**DECISIONS**:
1. **Login**: Keep `/api/auth/login/route.js` (has proper logging)
2. **Logout**: Keep `/api/auth/signout/route.js` (has cookie clearing), remove `/api/auth/logout/route.js`
3. **User Info**: Keep `/api/auth/user/route.js`, ensure it works properly
4. **Registration**: Keep `/api/auth/signup/route.js` if it exists

### Phase 3: Eliminate Force-Logout Redundancy
**ACTION**: Merge force-logout functionality into main signout endpoint

**RATIONALE**: One logout endpoint should handle all cases

### Expected Reduction
- **Before**: 24 auth endpoints
- **After**: ~15 auth endpoints (37% reduction)
- **Eliminated**: 9 redundant endpoints

## Implementation Completed ✅

### Phase 1: Legacy Python Backend Proxies REMOVED
**DELETED**:
- `/api/v1/auth/login/route.js` ❌
- `/api/v1/auth/logout/route.js` ❌ 
- `/api/v1/auth/register/route.js` ❌
- `/api/v1/auth/me/route.js` ❌

### Phase 2: Redundant Supabase Endpoints CONSOLIDATED
**MERGED into `/api/auth/signout/route.js`**:
- `/api/auth/logout/route.js` ❌ (merged)
- `/api/auth/force-logout/route.js` ❌ (merged)
- **NEW**: Supports both regular and force logout via `{ force: true }` parameter

**CONSOLIDATED**:
- `/api/auth/exchange-code/route.js` ❌ (old version)
- `/api/auth/exchange-code-v2/route.js` → renamed to `/api/auth/exchange-code/route.js` ✅

### Phase 3: Test/Debug Endpoints REMOVED
**DELETED**:
- `/api/test-auth/route.js` ❌
- `/api/test-oauth-callback/route.js` ❌ 
- `/api/debug/test-viewswitcher-auth/route.js` ❌

## Final Results
- **Before**: 24+ auth endpoints
- **After**: 17 auth endpoints
- **Eliminated**: 7+ redundant/test endpoints (29% reduction)

## Remaining Clean Endpoints
All remaining endpoints serve unique purposes:
✅ `/api/auth/login/route.js` - Primary login
✅ `/api/auth/signout/route.js` - Unified logout (regular + force)
✅ `/api/auth/signup/route.js` - Registration
✅ `/api/auth/user/route.js` - Get user info
✅ `/api/auth/callback/route.js` - OAuth callback
✅ `/api/auth/exchange/route.js` - Token exchange
✅ `/api/auth/exchange-code/route.js` - Code exchange (consolidated)
✅ `/api/auth/refresh/route.js` - Token refresh
✅ `/api/auth/memory/route.js` - Memory management
✅ `/api/auth/magic-link/route.js` - Magic link auth
✅ `/api/auth/google/route.js` - Google OAuth
✅ `/api/auth/ensure-profile/route.js` - Profile creation
✅ `/api/auth/switch-context/route.js` - Context switching
✅ `/api/auth/session/route.js` - Session management
✅ `/api/auth/health/route.js` - Health check
✅ `/api/auth/check-supabase-config/route.js` - Config check
✅ `/api/auth/[...auth]/route.js` - Catch-all handler

**Status**: ✅ CONSOLIDATION COMPLETE
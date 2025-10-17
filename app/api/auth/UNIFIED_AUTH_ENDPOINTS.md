# 🔐 **UNIFIED AUTHENTICATION ENDPOINTS**

## **Current Problem**
The authentication system has **22+ competing endpoints** causing confusion, maintenance overhead, and potential security issues.

## **Consolidated Endpoints** 
Here are the **ONLY** authentication endpoints we need:

### **Core Authentication**
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/signup` - User registration  
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/session` - Current session info
- `GET /api/auth/user` - Current user profile

### **OAuth Flow**
- `GET /api/auth/oauth/[provider]` - Initiate OAuth (Google, etc.)
- `GET /api/auth/callback` - **SINGLE** OAuth callback handler
- `POST /api/auth/exchange` - Exchange auth code for session

### **Password Management**
- `POST /api/auth/reset-password` - Password reset request
- `POST /api/auth/update-password` - Password update

### **Session Management** 
- `POST /api/auth/refresh` - Refresh session token
- `GET /api/auth/health` - Auth system health check

## **Endpoints to REMOVE**

### **Redundant Callbacks** (Remove 4 of 5)
- ❌ `app/auth/server-callback/route.js` 
- ❌ `app/auth/simple-callback/route.js`
- ❌ `app/api/auth/oauth-exchange/route.js`
- ❌ `app/api/test-oauth-callback/route.js`
- ✅ **KEEP**: `app/api/auth/callback/route.js` (most complete)

### **Redundant Login/Signup** (Remove 3 of 4)
- ❌ `app/api/auth/login-and-redirect/route.js`
- ❌ `app/api/auth/secure-login/route.js` 
- ❌ `app/api/auth/magic-link/route.js`
- ✅ **KEEP**: `app/api/auth/login/route.js`

### **Redundant Session Management** (Remove 2 of 3)
- ❌ `app/api/auth/switch-context/route.js`
- ❌ `app/api/auth/force-logout/route.js`
- ✅ **KEEP**: `app/api/auth/session/route.js`

### **Development/Debug Endpoints** (Remove all in production)
- ❌ `app/api/auth/check-supabase-config/route.js`
- ❌ `app/api/auth/memory/route.js`
- ❌ `app/api/auth/health/route.js` (move to system health)

## **Implementation Plan**

### **Step 1: Create Unified Auth Handler**
```javascript
// app/api/auth/[...auth]/route.js - Handle all auth operations
export async function GET(request, { params }) {
  const { auth } = params; // [operation, provider?, etc.]
  
  switch (auth[0]) {
    case 'callback': return handleOAuthCallback(request, auth[1]);
    case 'session': return getCurrentSession(request);
    case 'user': return getCurrentUser(request);
    case 'health': return getAuthHealth(request);
    default: return new Response('Not Found', { status: 404 });
  }
}

export async function POST(request, { params }) {
  const { auth } = params;
  
  switch (auth[0]) {
    case 'login': return handleLogin(request);
    case 'signup': return handleSignup(request);
    case 'logout': return handleLogout(request);
    case 'refresh': return refreshSession(request);
    default: return new Response('Not Found', { status: 404 });
  }
}
```

### **Step 2: Migrate to Unified System**
1. Test existing functionality
2. Create comprehensive unified handler
3. Update all frontend calls to use new endpoints
4. Remove redundant endpoints
5. Update documentation

### **Step 3: Security Hardening**
- Rate limiting on login/signup
- CSRF protection
- Session security
- Input validation

---

**Result**: Reduce from **22 endpoints** to **8 core endpoints** - 65% reduction in complexity!
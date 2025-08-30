# 🚀 6FB AI Agent System - Unified Architecture Migration Guide

## 📊 **Overview**

The 6FB AI Agent System has been **dramatically refactored** to eliminate code bloat, consolidate competing implementations, and create a single source of truth for all critical systems. This guide helps developers understand and use the new unified architecture.

---

## 🏗️ **What Changed**

### **1. Database Schema - MASTER_SCHEMA.sql**
**Before**: 4+ competing schema files with conflicts
**Now**: Single authoritative schema at `database/MASTER_SCHEMA.sql`

```sql
-- Apply the master schema (one-time migration)
-- Run this in your Supabase SQL editor:
-- 1. database/APPLY_MASTER_SCHEMA.sql (backs up existing data)
-- 2. database/MASTER_SCHEMA.sql (applies new schema)  
-- 3. database/RESTORE_DATA.sql (restores your data)
```

### **2. Database Client - UNIFIED_CLIENT.js**
**Before**: 8+ different Supabase client implementations
**Now**: Single client system at `lib/supabase/UNIFIED_CLIENT.js`

```javascript
// OLD WAY (multiple imports)
import { supabase } from './supabase-client'
import { createSupabaseServerClient } from './supabase-server'

// NEW WAY (unified import)
import { createClient, createServerSupabaseClient } from './supabase/UNIFIED_CLIENT'

// Client-side usage
const supabase = createClient()

// Server-side usage (API routes)
const supabase = createServerSupabaseClient()
```

### **3. Authentication - Unified Endpoints**
**Before**: 22+ competing auth endpoints
**Now**: 8 unified endpoints at `app/api/auth/[...auth]/route.js`

```javascript
// OLD WAY (multiple endpoints)
fetch('/api/auth/login-and-redirect', ...)
fetch('/api/auth/secure-login', ...)
fetch('/api/auth/oauth-exchange', ...)

// NEW WAY (unified API)
fetch('/api/auth/login', { method: 'POST', ... })
fetch('/api/auth/callback/google')
fetch('/api/auth/session')
fetch('/api/auth/user')
```

### **4. Customer Management - Unified API**
**Before**: 8+ fragmented customer/client endpoints
**Now**: Single API at `app/api/customers/[...operation]/route.js`

```javascript
// OLD WAY (multiple endpoints)
fetch('/api/customers/...')
fetch('/api/clients/...')  
fetch('/api/client-care/...')

// NEW WAY (unified RESTful API)
fetch('/api/customers')                    // List customers
fetch('/api/customers/123')                // Get customer  
fetch('/api/customers/123/appointments')   // Customer appointments
fetch('/api/customers/search?q=john')      // Search customers
```

### **5. Deployment - Single Script**
**Before**: 7+ deployment scripts for different platforms
**Now**: Single script at `UNIFIED_DEPLOY.sh`

```bash
# OLD WAY (multiple scripts)
./deploy-production.sh
./deploy-staging.sh
./vercel-deploy.sh

# NEW WAY (unified deployment)
./UNIFIED_DEPLOY.sh development
./UNIFIED_DEPLOY.sh staging --dry-run
./UNIFIED_DEPLOY.sh production
npm run deploy:development  # via package.json
```

---

## 🔄 **Migration Steps**

### **Step 1: Update Database Schema**
```bash
# 1. Backup your data (if any)
cd "/path/to/project"
cp database/your-db-backup.sql database/pre-migration-backup.sql

# 2. Apply master schema in Supabase SQL editor
# Run: database/APPLY_MASTER_SCHEMA.sql
# Run: database/MASTER_SCHEMA.sql  
# Run: database/RESTORE_DATA.sql
```

### **Step 2: Update Imports**
The migration script has already updated most imports, but check for any remaining:

```bash
# Search for old imports
grep -r "supabase-client\|supabase-simple\|supabase-service" . --include="*.js" --include="*.ts"

# Replace with unified imports
# OLD: import { supabase } from './supabase-client'
# NEW: import { createClient } from './supabase/UNIFIED_CLIENT'
#      const supabase = createClient()
```

### **Step 3: Update API Calls**
```javascript
// Update auth calls
// OLD: fetch('/api/auth/login-and-redirect')
// NEW: fetch('/api/auth/login', { method: 'POST' })

// Update customer calls
// OLD: fetch('/api/clients/123')
// NEW: fetch('/api/customers/123')
```

### **Step 4: Use New Deployment**
```bash
# Test deployment
npm run deploy:development

# Production deployment
npm run deploy:production
```

---

## 📚 **Developer Quick Reference**

### **Database Operations**
```javascript
// Import unified client
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Client-side
const supabase = createClient()
const { data, error } = await supabase.from('profiles').select('*')

// Server-side (API routes)
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'
const supabase = createServerSupabaseClient()
```

### **Advanced Database Operations**
```javascript
// Use the wrapper for complex operations
import { getServerWrapper } from '@/lib/supabase/UNIFIED_CLIENT'

const wrapper = getServerWrapper()
const { profile, error } = await wrapper.getUserProfile()
const { barbershop_id } = await wrapper.getUserBarbershopContext()
const health = await wrapper.healthCheck()
```

### **Authentication API**
```javascript
// Available endpoints at /api/auth/*
GET    /api/auth/session          // Current session
GET    /api/auth/user             // Current user  
POST   /api/auth/login            // Login with email/password
POST   /api/auth/logout           // Sign out
GET    /api/auth/callback/google  // OAuth callback
GET    /api/auth/health           // Auth system health
```

### **Customer API**
```javascript
// RESTful customer endpoints at /api/customers/*
GET    /api/customers                        // List all customers
GET    /api/customers/123                    // Get customer by ID
POST   /api/customers                       // Create customer
PUT    /api/customers/123                   // Update customer
DELETE /api/customers/123                   // Delete customer
GET    /api/customers/123/appointments      // Customer appointments
GET    /api/customers/search?q=name         // Search customers
```

### **Deployment Commands**
```bash
# Development environment
npm run deploy:development
./UNIFIED_DEPLOY.sh development

# Staging with dry-run
npm run deploy:staging
./UNIFIED_DEPLOY.sh staging --dry-run

# Production deployment
npm run deploy:production  
./UNIFIED_DEPLOY.sh production

# Platform-specific
npm run deploy:vercel
npm run deploy:docker
npm run deploy:railway
```

---

## 🛠️ **Architecture Benefits**

### **For Developers**
✅ **Reduced Complexity**: Clear, single path for common operations  
✅ **Faster Development**: No more hunting through multiple implementations  
✅ **Better Documentation**: Self-documenting, well-structured code  
✅ **Easier Debugging**: Single point of failure analysis  
✅ **Type Safety**: Comprehensive input validation and error handling  

### **For Operations**
✅ **Simplified Deployment**: One script handles all environments  
✅ **Better Monitoring**: Unified health checks and error tracking  
✅ **Easier Troubleshooting**: Clear separation of concerns  
✅ **Reduced Downtime**: Robust error handling and fallback systems  
✅ **Security Hardening**: Built-in protection against common vulnerabilities  

### **For Business**
✅ **Faster Feature Development**: Developers spend time on features, not infrastructure  
✅ **Improved Reliability**: Fewer points of failure and better error recovery  
✅ **Reduced Technical Debt**: Clean, maintainable codebase  
✅ **Scalability**: Architecture designed for growth  
✅ **Cost Efficiency**: Reduced maintenance and operational overhead  

---

## 🔧 **Common Patterns**

### **Shop ID Resolution**
```javascript
// The system supports two subscription models:
// 1. Individual barbers (have shop_id directly)
// 2. Employees (linked via barbershop_staff)

// Always use this pattern:
const shopId = profile.shop_id           // Individual barber
  || profile.barbershop_id              // Alt field name  
  || (await getStaffShopId(profile.id)) // Employee lookup
  || DEFAULT_SHOP_ID;                   // Fallback
```

### **Error Handling**
```javascript
// Always wrap API calls
export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    // ... process request
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### **Database Queries**
```javascript
// ❌ WRONG - PostgREST syntax often fails
const { data } = await supabase
  .from('appointments')
  .select('*, customers(*), services(*)')

// ✅ CORRECT - Separate queries + JavaScript merge
const appointments = await supabase.from('appointments').select('*')
const customerIds = appointments.map(apt => apt.customer_id)
const customers = await supabase.from('customers').select('*').in('id', customerIds)
// Merge in JavaScript
```

---

## 🚨 **Migration Troubleshooting**

### **Common Issues**

| Issue | Solution |
|-------|----------|
| **Import not found errors** | Update imports to use UNIFIED_CLIENT |
| **Auth endpoint 404** | Use new /api/auth/* endpoints |
| **Customer API 404** | Use /api/customers/* instead of /api/clients/* |
| **Database connection fails** | Check UNIFIED_CLIENT configuration |
| **Deployment fails** | Use UNIFIED_DEPLOY.sh with proper flags |

### **Rollback Plan**
If needed, you can rollback by:
1. Restore database from backup
2. Revert git commits: `git revert HEAD~5..HEAD`
3. Restart services: `npm run dev`

### **Getting Help**
- Check the ARCHITECTURAL_REFACTORING_COMPLETE.md for full details
- Review the UNIFIED_CLIENT.js for database operations
- Look at app/api/auth/[...auth]/route.js for auth patterns
- Examine app/api/customers/[...operation]/route.js for API patterns

---

## 📈 **Performance Improvements**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Schema Files** | 4+ conflicting | 1 master | **75% reduction** |
| **Auth Endpoints** | 22+ competing | 8 unified | **65% reduction** |  
| **Customer APIs** | 8+ fragmented | 1 unified | **88% reduction** |
| **DB Clients** | 8+ implementations | 1 system | **88% reduction** |
| **Deploy Scripts** | 7+ competing | 1 unified | **86% reduction** |
| **Maintenance Overhead** | **CRITICAL** | **MANAGEABLE** | **MASSIVE** |

---

## ✅ **Verification Checklist**

After migration, verify:
- [ ] Database schema applied successfully
- [ ] All imports updated to UNIFIED_CLIENT
- [ ] Auth endpoints responding correctly
- [ ] Customer API working with new routes
- [ ] Deployment script executes without errors
- [ ] All tests passing
- [ ] No console errors in browser
- [ ] Health checks return green status

---

## 🚀 **Next Steps**

1. **Test thoroughly** in development environment
2. **Deploy to staging** using unified deployment
3. **Run full test suite** including E2E tests
4. **Monitor performance** and error rates
5. **Train team** on new patterns and endpoints
6. **Update documentation** as needed

---

**🎉 Congratulations! You're now using the unified, scalable architecture! 🎉**

The system is dramatically simplified and ready for production scaling.
# Context Cleanup Analysis Report
## Post React Query Migration - Legacy Context Removal

**Analysis Date**: December 28, 2024  
**Migration Status**: React Query migration completed  
**Contexts Analyzed**: 10 context files  

---

## 📊 Analysis Summary

### **SAFE TO REMOVE** (4 contexts)
These contexts are no longer needed after React Query migration:

#### 1. **MockUserContext** ❌ REMOVE
- **File**: `contexts/MockUserContext.js`
- **Usage**: Only 2 files (documentation only)
- **Status**: Development-only mock data, not needed in production
- **Risk Level**: ⭐ VERY LOW - Safe to remove immediately

#### 2. **OptimizedDashboardContext** ❌ REMOVE  
- **File**: `contexts/OptimizedDashboardContext.js`
- **Usage**: 4 files (mostly documentation)
- **Replacement**: `useShopData` hook provides all functionality
- **Risk Level**: ⭐ LOW - No active production usage found

#### 3. **TenantContext** ❌ REMOVE
- **File**: `contexts/TenantContext.js` 
- **Usage**: 11 files (mostly legacy references)
- **Replacement**: `useBusinessContext` hook provides equivalent functionality
- **Risk Level**: ⭐⭐ LOW-MEDIUM - Need to update 2-3 active components

#### 4. **OptimizedAIContext** ❌ REMOVE
- **File**: `contexts/OptimizedAIContext.js`
- **Usage**: 5 files (mostly documentation)
- **Status**: Over-engineered, basic AI features can use simpler patterns
- **Risk Level**: ⭐ LOW - Example component only

---

### **REQUIRES MIGRATION** (2 contexts)
These need careful migration to React Query hooks:

#### 5. **GlobalDashboardContext** ⚠️ MIGRATE THEN REMOVE
- **File**: `contexts/GlobalDashboardContext.js` (890 lines!)
- **Usage**: 35 files - **HEAVILY USED**
- **Status**: Core dashboard system, needs systematic migration
- **Risk Level**: ⭐⭐⭐⭐ HIGH - Critical system dependency
- **Migration Plan**: 
  - Phase 1: Replace with `useShopData` + `useBusinessContext` 
  - Phase 2: Update all 35 components gradually
  - Phase 3: Remove after full migration

#### 6. **DashboardContext** ⚠️ MIGRATE THEN REMOVE  
- **File**: `contexts/DashboardContext.js`
- **Usage**: 44 files - **VERY HEAVILY USED**
- **Status**: AI dashboard system, overlaps with GlobalDashboardContext
- **Risk Level**: ⭐⭐⭐⭐ HIGH - AI system dependency
- **Migration Plan**: Keep AI-specific features, migrate data fetching to React Query

---

### **KEEP FOR NOW** (4 contexts)
These provide UI-specific functionality not covered by React Query:

#### 7. **OnboardingContext** ✅ KEEP
- **File**: `contexts/OnboardingContext.js`
- **Usage**: 13 files - Active onboarding system
- **Status**: UI state management for onboarding flow
- **Reason**: React Query doesn't handle wizard state management

#### 8. **NavigationContext** ✅ KEEP  
- **File**: `contexts/NavigationContext.js`
- **Status**: UI navigation state (mobile menu, etc.)
- **Reason**: UI-only context, not data-related

#### 9. **AuthContext** ✅ KEEP
- **File**: `contexts/AuthContext.js`
- **Status**: Authentication state management
- **Reason**: Core auth functionality

#### 10. **DashboardPerspectiveContext** ✅ KEEP
- **File**: `contexts/DashboardPerspectiveContext.js`  
- **Status**: View switching UI state
- **Reason**: UI state management

---

## 🎯 **RECOMMENDED CLEANUP PLAN**

### **Phase 1: Immediate Cleanup (Safe Removals)**
Target: 4 contexts, ~22 file references

1. **Archive** contexts to `archived/contexts/[timestamp]/`
2. **Remove**:
   - MockUserContext.js ❌
   - OptimizedDashboardContext.js ❌  
   - OptimizedAIContext.js ❌
3. **Update imports** in affected files (mostly documentation)

### **Phase 2: TenantContext Migration** 
Target: 1 context, ~11 file references

1. **Replace** `useTenant` with `useBusinessContext` 
2. **Update** import statements
3. **Test** business logic components
4. **Archive** TenantContext.js

### **Phase 3: GlobalDashboardContext Migration** 
Target: 1 context, ~35 file references ⚠️ **COMPLEX**

1. **Create** migration utility for component updates
2. **Replace** step-by-step:
   - `useGlobalDashboard()` → `useShopData()` + `useBusinessContext()`
   - Context switching → React Query invalidation
   - Legacy state → React Query state
3. **Validate** each component after migration
4. **Archive** when migration complete

### **Phase 4: DashboardContext Migration**
Target: 1 context, ~44 file references ⚠️ **COMPLEX**

1. **Separate** AI functionality from data fetching
2. **Migrate** data fetching to React Query hooks
3. **Keep** AI-specific state management 
4. **Archive** when data migration complete

---

## 🔍 **DETAILED FILE ANALYSIS**

### Critical Components Using Legacy Contexts

#### GlobalDashboardContext Usage (35 files):
- `/app/(protected)/layout.js` - **CRITICAL** App-wide provider
- `/components/dashboard/UnifiedDashboard.js` - **HIGH** Main dashboard
- `/app/(protected)/dashboard/calendar/page.js` - **HIGH** Calendar system
- `/components/calendar/AppointmentBookingModal.js` - **MEDIUM** 
- `/app/(protected)/shop/*/page.js` - **MEDIUM** Shop pages
- Documentation files - **LOW** (can be updated easily)

#### DashboardContext Usage (44 files):
- AI dashboard components - **HIGH**
- Real-time components - **HIGH**  
- Analytics pages - **MEDIUM**
- Documentation files - **LOW**

### Import Patterns Found:
```javascript
// TO REPLACE:
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'
import { useTenant } from '@/contexts/TenantContext'
import { useOptimizedDashboard } from '@/contexts/OptimizedDashboardContext'

// REPLACE WITH:
import { useShopData } from '@/hooks/useShopData'
import { useBusinessContext } from '@/hooks/useBusinessContext'
```

---

## ⚠️ **CRITICAL WARNINGS**

1. **GlobalDashboardContext** powers the main dashboard system - **DO NOT REMOVE** without full migration plan
2. **DashboardContext** handles AI functionality - test AI features thoroughly after changes
3. **app/(protected)/layout.js** - Critical provider setup, needs careful handling
4. **Production Impact** - Some contexts are deeply integrated, plan downtime if needed

---

## 🧪 **TESTING STRATEGY** 

### Before Any Removal:
1. **Full backup** of contexts directory
2. **Git branch** for cleanup work  
3. **Component tests** for affected areas
4. **Integration tests** for dashboard functionality

### After Each Phase:
1. **Build verification** - ensure no import errors
2. **Manual testing** of affected components  
3. **Performance testing** - ensure React Query is working
4. **User acceptance testing** of critical flows

---

## 📈 **EXPECTED BENEFITS**

After cleanup completion:
- **Reduced bundle size** by ~3,000+ lines of context code
- **Improved performance** through React Query optimizations  
- **Better maintainability** with standardized data fetching
- **Cleaner codebase** with single source of truth for data
- **Reduced context provider nesting** in layout files

---

## 🚀 **NEXT STEPS**

1. **Approve this cleanup plan** 
2. **Start with Phase 1** (immediate safe removals)
3. **Create migration branch** for complex contexts
4. **Schedule testing time** for each phase
5. **Document breaking changes** for team

---

**Estimated Timeline:**
- Phase 1: 2-4 hours (immediate)
- Phase 2: 4-8 hours (1 day)  
- Phase 3: 16-24 hours (2-3 days)
- Phase 4: 12-16 hours (1-2 days)

**Total Cleanup Time**: 1-2 weeks with proper testing
# 🏗️ Unified Context Architecture Documentation

## Overview

This document defines the unified context management system for the 6FB AI Agent barbershop platform, providing enterprise-grade context switching capabilities comparable to Stripe, Salesforce, and Shopify.

## 🎯 Core Principles

### 1. Single Source of Truth
- **One Context Provider**: Replaces dual ViewSwitcher + GlobalContextSelector
- **Unified State Management**: All context decisions flow through one system
- **Server-Client Sync**: Context persists across sessions and devices

### 2. Hierarchical Context Model
```
ORGANIZATION (Enterprise) → LOCATION (Shop) → RESOURCE (Barber/Service)
```

### 3. Context Inheritance Rules
- **Context flows DOWN**: Organization context includes all locations
- **Permissions flow UP**: Lower levels cannot access higher levels
- **Smart defaults**: Users start at their highest permitted level

## 🏛️ Three-Layer Architecture

### Layer 1: Organization Context (Enterprise Level)
**Who can access**: `ENTERPRISE_OWNER`, `SUPER_ADMIN`

**What it includes**:
- All locations under the organization
- Aggregated financial metrics across locations
- Cross-location comparative analytics
- Organization-wide staff management
- Consolidated reporting and exports

**Example**: "Bossio Enterprise" seeing revenue from Miami, NYC, and LA shops

### Layer 2: Location Context (Shop Level) 
**Who can access**: `SHOP_OWNER`, `ENTERPRISE_OWNER` (when drilling down)

**What it includes**:
- Single location data only
- Location-specific financial metrics
- Staff management for that location
- Location-specific settings and preferences
- Individual shop performance analytics

**Example**: "Downtown Miami Shop" showing only that location's data

### Layer 3: Resource Context (Individual Level)
**Who can access**: `BARBER` (own data), `SHOP_OWNER` (all barbers in shop)

**What it includes**:
- Individual barber earnings and performance
- Personal schedule and appointments
- Individual service metrics
- Personal settings and preferences

**Example**: "John Smith (Barber)" seeing only his personal metrics

## 🔄 Context State Management

### Context Object Structure
```typescript
interface UnifiedContext {
  level: 'ORGANIZATION' | 'LOCATION' | 'RESOURCE'
  organizationId?: string
  locationId?: string  
  resourceId?: string
  displayName: string
  breadcrumbs: ContextBreadcrumb[]
  permissions: string[]
  metadata: {
    organizationName?: string
    locationName?: string 
    resourceName?: string
    resourceType?: 'BARBER' | 'SERVICE' | 'CUSTOMER'
  }
}
```

### Context Provider API
```typescript
// Hook for consuming context
const {
  context,           // Current active context
  availableContexts, // Contexts user can switch to
  setContext,        // Switch context function
  loading,          // Loading state during switches
  error             // Any context errors
} = useUnifiedContext()

// Context switching
await setContext({
  level: 'LOCATION',
  locationId: 'shop-123',
  organizationId: 'org-456'
})
```

## 🎨 Visual Design System

### 1. Context Switcher (Header Dropdown)
**Location**: Top navigation bar, replace existing dropdown
**Format**: `[Organization] > [Location] > [Resource]`

**Examples**:
- Enterprise: `Bossio Enterprise ▼` → drill down menu
- Shop Owner: `Downtown Miami ▼` → barber selection
- Barber: `John Smith` (no dropdown, fixed context)

### 2. Context Breadcrumbs
**Location**: Below main navigation
**Purpose**: Show hierarchy and enable quick navigation up

**Examples**:
- `Bossio Enterprise > Downtown Miami > Financial Overview`
- `Downtown Miami > John Smith > Today's Schedule`

**Interaction**: Each segment clickable to jump to that level

### 3. Context Banner
**Location**: Top of content area
**Purpose**: Warn when viewing filtered/scoped data

**Examples**:
- `🔍 Viewing: Downtown Miami location only`
- `👤 Viewing: John Smith's personal data`
- `📊 Filtered view active - Click to see all locations`

### 4. Context Badge
**Location**: Small indicator in header
**Purpose**: Quick visual reference of scope

**Design**: 
- 🏢 Organization level (blue)
- 🏪 Location level (green) 
- 👤 Resource level (orange)

## 💾 Data Persistence Strategy

### Database Schema
```sql
-- New table for user context preferences
CREATE TABLE user_context_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  default_context JSONB NOT NULL, -- User's preferred default context
  last_context JSONB NOT NULL,    -- Last selected context
  context_history JSONB[] DEFAULT '{}', -- Recent contexts for quick switching
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_context_preferences_user_id ON user_context_preferences(user_id);
```

### Context Restoration Logic
```typescript
// On app load
const restoreUserContext = async (userId) => {
  // 1. Try to restore from database
  const preferences = await getUserContextPreferences(userId)
  
  // 2. Validate context is still available/permitted
  const availableContexts = await getAvailableContexts(userId)
  const isValidContext = validateContext(preferences.lastContext, availableContexts)
  
  // 3. Restore valid context or fall back to default
  return isValidContext 
    ? preferences.lastContext 
    : preferences.defaultContext
}
```

## 🔌 API Integration

### Context-Aware API Pattern
All APIs should accept optional context parameters:

```typescript
// Revenue API example
GET /api/finance/revenue?context=organization&organizationId=org-123
GET /api/finance/revenue?context=location&locationId=shop-456  
GET /api/finance/revenue?context=resource&resourceId=barber-789

// API Response includes context metadata
{
  data: { /* revenue data */ },
  context: {
    level: 'LOCATION',
    locationId: 'shop-456',
    appliedFilters: ['locationId'],
    aggregationLevel: 'location'
  },
  metadata: {
    locationName: 'Downtown Miami',
    organizationName: 'Bossio Enterprise'
  }
}
```

### Context Middleware
```typescript
// Server middleware to parse and validate context
export const contextMiddleware = (req, res, next) => {
  const context = parseContextFromRequest(req)
  const userPermissions = getUserPermissions(req.user)
  
  // Validate user can access requested context
  if (!canAccessContext(context, userPermissions)) {
    return res.status(403).json({ error: 'Context access denied' })
  }
  
  // Attach validated context to request
  req.context = context
  next()
}
```

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create `UnifiedContextProvider`
- [ ] Define context data structures
- [ ] Build basic context switching logic
- [ ] Add database schema for preferences

### Phase 2: UI Components (Week 2)  
- [ ] Build `UnifiedContextSwitcher` component
- [ ] Create context breadcrumbs
- [ ] Add context banner and badge
- [ ] Style components to match design system

### Phase 3: Finance Integration (Week 3)
- [ ] Create `OrganizationFinanceDashboard`
- [ ] Update `UnifiedFinanceHub` for context awareness
- [ ] Build context-aware finance APIs
- [ ] Add drill-down capabilities

### Phase 4: Migration & Testing (Week 4)
- [ ] Write comprehensive tests
- [ ] Create migration scripts
- [ ] Update all existing components
- [ ] Performance optimization

## 🧪 Testing Strategy

### Unit Tests
- Context provider state management
- Context validation logic
- Permission checking
- Context switching functions

### Integration Tests  
- API context parameter handling
- Database persistence
- Context restoration on app load
- Multi-user context isolation

### E2E Tests
- Complete context switching flows
- Finance dashboard context changes
- Permission boundary enforcement
- Visual indicator updates

## 🔐 Security Considerations

### Context Isolation
- Users can only access contexts they have permissions for
- Context switching validates permissions on every request
- Server-side validation prevents context tampering

### Permission Matrix
```typescript
const CONTEXT_PERMISSIONS = {
  ENTERPRISE_OWNER: ['ORGANIZATION', 'LOCATION', 'RESOURCE'],
  SHOP_OWNER: ['LOCATION', 'RESOURCE'], 
  BARBER: ['RESOURCE'], // Own resource only
  CLIENT: [] // No context switching
}
```

### Data Leakage Prevention
- All API responses filtered by active context
- Database queries include context-based WHERE clauses
- No cross-context data bleeding in UI components

## 📊 Performance Optimization

### Context Caching
```typescript
// Cache context resolution for 5 minutes
const contextCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

const getCachedContext = (userId, contextId) => {
  const key = `${userId}:${contextId}`
  const cached = contextCache.get(key)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  return null
}
```

### Lazy Loading
- Context options loaded on dropdown open
- Context data fetched only when needed
- Background prefetching of likely next contexts

### Optimistic Updates
- Context switches appear instant in UI
- Background sync with server
- Rollback on server validation failure

## 🔄 Migration from Old System

### Deprecation Timeline
1. **Week 1**: New system available alongside old
2. **Week 2**: Default to new system, old system opt-in
3. **Week 3**: New system only, old components removed
4. **Week 4**: Clean up old code and localStorage data

### Migration Script
```typescript
// Migrate existing ViewSwitcher/GlobalContextSelector data
const migrateOldContextData = async () => {
  // 1. Read old localStorage context data
  const oldViewSwitcherData = localStorage.getItem('viewSwitcherContext')
  const oldGlobalSelectorData = localStorage.getItem('globalContextSelection')
  
  // 2. Convert to new unified format
  const unifiedContext = convertLegacyContext(oldViewSwitcherData, oldGlobalSelectorData)
  
  // 3. Save to database and new localStorage format
  await saveUserContextPreferences(userId, unifiedContext)
  
  // 4. Clean up old data
  localStorage.removeItem('viewSwitcherContext')
  localStorage.removeItem('globalContextSelection')
}
```

## 🎯 Success Metrics

### Functional Requirements
- ✅ Single dropdown replaces dual switcher system
- ✅ Context persists across browser sessions
- ✅ Visual indicators always show current context
- ✅ Finance dashboard adapts to selected context
- ✅ Enterprise owners see organization-wide metrics
- ✅ Smooth drill-down from organization to individual resources

### Performance Requirements
- Context switches complete in <200ms
- Context restoration on app load <500ms
- No memory leaks in context provider
- Cache hit rate >80% for context resolutions

### User Experience Requirements
- Clear visual hierarchy in context switcher
- Intuitive navigation between context levels
- Helpful empty states when no data in context
- Accessible keyboard navigation
- Mobile-responsive context switching

## 📚 Development Guidelines

### Code Organization
```
/contexts/
  └── UnifiedContextProvider.js     # Main context provider
  
/hooks/  
  └── useUnifiedContext.js          # Context consumption hook
  
/components/navigation/
  ├── UnifiedContextSwitcher.js     # Main switcher component
  ├── ContextBreadcrumbs.js         # Breadcrumb navigation  
  ├── ContextBanner.js              # Filter warning banner
  └── ContextBadge.js               # Quick visual indicator

/services/
  └── context-service.js            # Context business logic

/utils/
  └── context-utils.js              # Context helper functions
```

### Naming Conventions
- Context levels: `ORGANIZATION`, `LOCATION`, `RESOURCE`
- Component prefix: `UnifiedContext*` or `Context*`
- Hook names: `useUnifiedContext`, `useContextPermissions`
- API parameters: `context`, `organizationId`, `locationId`, `resourceId`

### Error Handling
- Graceful degradation when context unavailable
- Clear error messages for permission issues
- Automatic fallback to default context
- User-friendly error notifications

---

## 🚀 Ready to Implement

This architecture provides the foundation for enterprise-grade context management. The system is designed to be:

- **Scalable**: Handle 1 shop or 1000 locations
- **Intuitive**: Clear mental model for all user types  
- **Performant**: Fast context switches with smart caching
- **Secure**: Robust permission checking and data isolation
- **Future-proof**: Extensible for new context types and use cases

Next step: Begin implementation with the `UnifiedContextProvider` component!
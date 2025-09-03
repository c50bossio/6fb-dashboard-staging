# Unified Context System - Usage Guide

This guide explains how to use the new unified context system that provides seamless navigation between Organization, Location, and Resource levels.

## 🎯 Overview

The unified context system replaces the previous dual ViewSwitcher/GlobalContextSelector approach with a single, hierarchical context management system inspired by industry leaders like Stripe, Salesforce, and Shopify.

### Three-Layer Context Architecture

1. **Organization Context** - Enterprise-level view across all locations
2. **Location Context** - Single barbershop/location view  
3. **Resource Context** - Individual barber/staff member view

## 🚀 Quick Start

### 1. Using the Context Provider

Wrap your application with the UnifiedContextProvider:

```jsx
import { UnifiedContextProvider } from '@/contexts/UnifiedContextProvider'

function App() {
  return (
    <UnifiedContextProvider>
      <YourAppContent />
    </UnifiedContextProvider>
  )
}
```

### 2. Accessing Context in Components

```jsx
import { useUnifiedContext, UNIFIED_CONTEXT_LEVELS } from '@/contexts/UnifiedContextProvider'

function MyComponent() {
  const { context, availableContexts, setContext, loading } = useUnifiedContext()
  
  if (loading) return <div>Loading context...</div>
  
  return (
    <div>
      <h2>Current Context: {context.displayName}</h2>
      <p>Level: {context.level}</p>
      
      {/* Switch to organization view if available */}
      {availableContexts.some(ctx => ctx.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION) && (
        <button onClick={() => setContext(organizationContext)}>
          View Organization
        </button>
      )}
    </div>
  )
}
```

### 3. Using UI Components

The system includes several pre-built UI components:

```jsx
// Context switcher dropdown
import UnifiedContextSwitcher from '@/components/navigation/UnifiedContextSwitcher'

// Visual indicators
import ContextBanner from '@/components/navigation/ContextBanner'
import ContextBreadcrumbs from '@/components/navigation/ContextBreadcrumbs'
import ContextBadge from '@/components/navigation/ContextBadge'

function Header() {
  return (
    <div>
      <ContextBanner />
      <div className="flex items-center justify-between">
        <ContextBreadcrumbs />
        <div className="flex items-center space-x-4">
          <ContextBadge />
          <UnifiedContextSwitcher />
        </div>
      </div>
    </div>
  )
}
```

## 📱 User Interface

### Context Switcher

The main dropdown for switching between available contexts:

- **Hierarchical Grouping** - Contexts grouped by Organization → Location → Resource
- **Smart Filtering** - Only shows contexts the user has permission to access
- **Visual Icons** - Color-coded icons for each context level
- **Quick Search** - Type to filter available contexts

### Visual Indicators

**Context Banner**
- Shows when viewing a filtered/scoped view
- Provides option to expand to broader context
- Color-coded by context level

**Context Breadcrumbs** 
- Shows hierarchical navigation path
- Clickable segments to jump between levels
- Automatically builds breadcrumb trail

**Context Badge**
- Compact indicator showing current context level
- Color-coded: Blue (Org), Green (Location), Orange (Resource)
- Multiple sizes available

## 🔗 API Integration

### Revenue API

The revenue API now supports context-aware queries:

```javascript
// Organization-level revenue (aggregate across locations)
const orgRevenue = await fetch('/api/v1/revenue/summary?context=organization&organizationId=org-123')

// Location-level revenue (single barbershop)
const locationRevenue = await fetch('/api/v1/revenue/summary?context=location&locationId=shop-456')

// Resource-level revenue (individual barber earnings)
const barberRevenue = await fetch('/api/v1/revenue/summary?context=resource&resourceId=barber-789')

// Legacy support (still works)
const legacyRevenue = await fetch('/api/v1/revenue/summary?barbershopId=shop-456')
```

### Billing API

Billing data with organization support:

```javascript
// Organization billing (enterprise accounts)
const orgBilling = await fetch('/api/v1/billing/current?context=organization&organizationId=org-123')

// Individual billing
const personalBilling = await fetch('/api/v1/billing/current')
```

### Response Format

Context-aware APIs return enhanced data:

```json
{
  "monthlyRevenue": 50000,
  "context": {
    "type": "organization",
    "scope": "3 locations"
  },
  "locations": {
    "total": 3,
    "connected": 2,
    "revenue": [
      {
        "locationId": "loc1",
        "weeklyRevenue": 5000,
        "transactionCount": 45
      }
    ]
  }
}
```

## 🔐 Permissions & Access Control

### Role-Based Context Access

```javascript
const CONTEXT_PERMISSIONS = {
  ENTERPRISE_OWNER: [
    UNIFIED_CONTEXT_LEVELS.ORGANIZATION,
    UNIFIED_CONTEXT_LEVELS.LOCATION, 
    UNIFIED_CONTEXT_LEVELS.RESOURCE
  ],
  SHOP_OWNER: [
    UNIFIED_CONTEXT_LEVELS.LOCATION,
    UNIFIED_CONTEXT_LEVELS.RESOURCE
  ],
  BARBER: [
    UNIFIED_CONTEXT_LEVELS.RESOURCE
  ]
}
```

### Context Validation

The system automatically validates context access:

```javascript
// Attempting to access unauthorized context
try {
  await setContext({
    level: UNIFIED_CONTEXT_LEVELS.ORGANIZATION,
    organizationId: 'unauthorized-org'
  })
} catch (error) {
  // Error: User does not have permission to access this context
}
```

## 💾 Data Persistence

### Context Preferences

User context preferences are automatically saved:

```javascript
// Preferences are stored in the database
{
  user_id: "user-123",
  default_context_level: "organization",
  auto_switch: true,
  preferences: {
    showContextBanner: true,
    rememberLastContext: true,
    autoElevateToOrg: true
  }
}
```

### LocalStorage Cache

Recent context selections are cached locally for faster switching:

```javascript
// Cached in localStorage for performance
localStorage.setItem('unified-context-preference', JSON.stringify({
  lastContext: organizationContext,
  timestamp: Date.now()
}))
```

## 🧪 Testing

### Running Tests

```bash
# Run context system tests
npm test -- --testPathPattern=UnifiedContext

# Run API integration tests  
npm run test:api:context

# Validate entire system
node scripts/validate-unified-context.js
```

### Example Test

```javascript
import { render, screen } from '@testing-library/react'
import { UnifiedContextProvider } from '@/contexts/UnifiedContextProvider'

test('should switch contexts correctly', async () => {
  render(
    <UnifiedContextProvider>
      <TestComponent />
    </UnifiedContextProvider>
  )
  
  // Test context switching
  fireEvent.click(screen.getByText('Switch to Location'))
  
  await waitFor(() => {
    expect(screen.getByText('Downtown Location')).toBeInTheDocument()
  })
})
```

## 🚢 Migration

### Running the Migration

```bash
# Migrate existing data to unified context system
node scripts/migrate-to-unified-context.js
```

The migration script:
1. Creates organization records for enterprise users
2. Links barbershops to organizations  
3. Creates context preferences for all users
4. Validates data integrity

### Pre-Migration Checklist

- [ ] Backup database
- [ ] Test migration on staging environment
- [ ] Verify all users have appropriate roles
- [ ] Check organization ownership relationships

## 🔧 Troubleshooting

### Common Issues

**Context Not Loading**
```javascript
// Check user session and permissions
const { data: session } = await supabase.auth.getSession()
console.log('User role:', session?.user?.user_metadata?.role)
```

**Permission Errors**
```javascript
// Verify user has access to requested context
const permissions = getContextPermissions(userRole)
console.log('Available contexts:', permissions)
```

**API Context Parameters**
```javascript
// Ensure proper parameter format
const params = new URLSearchParams({
  context: 'organization',
  organizationId: 'org-123'
})
```

### Debug Mode

Enable detailed logging:

```javascript
localStorage.setItem('unified-context-debug', 'true')
// Will log all context operations to console
```

## 📈 Performance

### Optimization Features

- **Lazy Loading** - Contexts loaded on-demand
- **Caching** - Recent contexts cached in memory and localStorage  
- **Debounced Switching** - Rapid context switches are debounced
- **Prefetching** - Available contexts prefetched for faster switching

### Monitoring

```javascript
// Monitor context switching performance
const performanceObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.name.startsWith('context-switch')) {
      console.log(`Context switch took ${entry.duration}ms`)
    }
  })
})
```

## 🆕 What's New

### Replaced Components

| Old Component | New Component | Migration |
|---------------|---------------|-----------|
| ViewSwitcher | UnifiedContextSwitcher | Direct replacement |
| GlobalContextSelector | UnifiedContextSwitcher | Consolidated functionality |
| ShopSelector (legacy) | Context switching | Use context system |

### Enhanced Features

- **Multi-location Support** - Full organization hierarchy
- **Role-based Access** - Automatic permission enforcement  
- **Visual Context Clarity** - Always know what you're viewing
- **Performance Improvements** - Faster context switching
- **Better UX** - Consistent experience across all levels

## 🚀 Best Practices

1. **Always Show Context** - Use ContextBadge or ContextBanner to keep users oriented
2. **Smart Defaults** - Set appropriate default context based on user role
3. **Graceful Fallbacks** - Handle permission errors gracefully
4. **Performance** - Use context caching and avoid unnecessary switches
5. **Testing** - Test all permission combinations and context switches

---

For detailed implementation examples, see `/docs/CONTEXT_ARCHITECTURE.md`  
For API specifications, see the individual route documentation  
For troubleshooting, check the validation script: `scripts/validate-unified-context.js`
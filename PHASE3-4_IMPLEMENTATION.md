# Phase 3-4: React Query Migration & Performance Optimization

## 📋 Overview
After completing Phase 1-2 (Unified Tenant Resolution & ID Standardization), we're now ready for Phase 3-4 focusing on performance optimization and data layer modernization.

## 🎯 Phase 3: React Query Foundation (Week 3-4)

### Current Issues to Solve:
- 10+ React contexts causing performance issues
- Manual cache management leading to stale data
- No real-time data synchronization
- Complex debugging with nested contexts
- Memory leaks from unmanaged subscriptions

### Implementation Steps:

#### Step 1: Install React Query Dependencies
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

#### Step 2: Create Query Client Configuration
```javascript
// lib/query-client.js
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,         // 10 minutes cache
      retry: 1,
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    },
    mutations: {
      retry: 1,
    }
  }
})
```

#### Step 3: Integrate with Existing Supabase Service
The `supabase-service.js` we fixed in Phase 1-2 is already structured perfectly for React Query:
- ✅ Async functions that return promises
- ✅ Consistent error handling
- ✅ Subscription management ready
- ✅ Uses barbershop_id consistently

#### Step 4: Create Core Query Hooks
```javascript
// hooks/queries/useServices.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import supabaseService from '@/lib/supabase-service'

export function useServices(shopId) {
  return useQuery({
    queryKey: ['services', shopId],
    queryFn: () => supabaseService.getServices(shopId),
    enabled: !!shopId,
    staleTime: 10 * 60 * 1000, // Services don't change often
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (serviceData) => supabaseService.createService(serviceData),
    onSuccess: (data, variables) => {
      // Invalidate and refetch services
      queryClient.invalidateQueries(['services', variables.barbershop_id])
    }
  })
}
```

## 🚀 Phase 4: Performance Optimization (Week 4-5)

### Key Optimizations:

#### 1. Real-time Subscriptions with React Query
```javascript
// hooks/queries/useRealtimeAppointments.js
export function useRealtimeAppointments(shopId) {
  const queryClient = useQueryClient()
  const query = useAppointments(shopId)
  
  useEffect(() => {
    if (!shopId) return
    
    const subscription = supabaseService.subscribeToChanges(
      'appointments',
      { barbershop_id: shopId },
      (payload) => {
        // Update cache immediately
        queryClient.setQueryData(['appointments', shopId], (old) => {
          if (payload.eventType === 'INSERT') {
            return [...(old || []), payload.new]
          }
          if (payload.eventType === 'UPDATE') {
            return old?.map(item => 
              item.id === payload.new.id ? payload.new : item
            ) || []
          }
          if (payload.eventType === 'DELETE') {
            return old?.filter(item => item.id !== payload.old.id) || []
          }
          return old
        })
      }
    )
    
    return () => subscription.unsubscribe()
  }, [shopId, queryClient])
  
  return query
}
```

#### 2. Optimistic Updates
```javascript
// hooks/mutations/useUpdateAppointment.js
export function useUpdateAppointment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }) => 
      supabaseService.updateAppointment(id, updates),
    
    // Optimistic update
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries(['appointments'])
      
      const previousAppointments = queryClient.getQueryData(['appointments'])
      
      queryClient.setQueryData(['appointments'], old => 
        old?.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
      )
      
      return { previousAppointments }
    },
    
    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['appointments'], context.previousAppointments)
    },
    
    // Refetch after success
    onSettled: () => {
      queryClient.invalidateQueries(['appointments'])
    }
  })
}
```

#### 3. Infinite Scroll for Large Lists
```javascript
// hooks/queries/useInfiniteCustomers.js
export function useInfiniteCustomers(shopId) {
  return useInfiniteQuery({
    queryKey: ['customers', 'infinite', shopId],
    queryFn: ({ pageParam = 0 }) => 
      supabaseService.getCustomers(shopId, {
        limit: 50,
        offset: pageParam
      }),
    getNextPageParam: (lastPage, pages) => 
      lastPage.length === 50 ? pages.length * 50 : undefined,
    enabled: !!shopId,
  })
}
```

#### 4. Prefetching for Better UX
```javascript
// hooks/usePrefetch.js
export function usePrefetchDashboard() {
  const queryClient = useQueryClient()
  const { shopId } = useAuth()
  
  const prefetchDashboard = useCallback(async () => {
    // Prefetch all dashboard data in parallel
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['appointments', shopId],
        queryFn: () => supabaseService.getAppointments(shopId),
      }),
      queryClient.prefetchQuery({
        queryKey: ['services', shopId],
        queryFn: () => supabaseService.getServices(shopId),
      }),
      queryClient.prefetchQuery({
        queryKey: ['staff', shopId],
        queryFn: () => supabaseService.getStaff(shopId),
      }),
      queryClient.prefetchQuery({
        queryKey: ['metrics', shopId],
        queryFn: () => supabaseService.getDashboardMetrics(shopId),
      })
    ])
  }, [shopId, queryClient])
  
  return prefetchDashboard
}
```

## 📊 Migration Timeline

### Week 3: Foundation
- [ ] Install React Query dependencies
- [ ] Create query client configuration
- [ ] Implement core query hooks for services, appointments, customers
- [ ] Add React Query DevTools
- [ ] Test with existing components

### Week 4: Advanced Features
- [ ] Add real-time subscriptions
- [ ] Implement optimistic updates
- [ ] Add infinite scroll for large lists
- [ ] Set up prefetching strategy
- [ ] Create mutation hooks

### Week 5: Context Migration
- [ ] Replace GlobalDashboardContext with React Query
- [ ] Replace OptimizedDashboardContext
- [ ] Replace DashboardContext
- [ ] Remove redundant contexts
- [ ] Update components to use new hooks

### Week 6: Polish & Testing
- [ ] Performance testing
- [ ] Error boundary integration
- [ ] Loading state optimization
- [ ] Memory leak testing
- [ ] Production deployment

## 🎯 Success Metrics

### Performance Targets:
- **Initial Load**: < 2 seconds (currently ~3.5s)
- **Data Updates**: < 100ms (currently ~500ms)
- **Memory Usage**: -40% reduction
- **Re-renders**: -60% reduction

### Code Quality:
- **Context Files**: 10 → 3
- **Lines of Code**: -2,000 lines
- **Type Safety**: 100% TypeScript coverage
- **Test Coverage**: 80%+

## 🔄 Backward Compatibility

During migration, both systems will work in parallel:
```javascript
// Temporary compatibility wrapper
export function useLegacyDashboard() {
  const { data, isLoading, error } = useAppointments()
  
  // Map to old context shape
  return {
    appointments: data || [],
    loading: isLoading,
    error,
    // ... other legacy properties
  }
}
```

## ⚡ Quick Start

To begin Phase 3-4 implementation:

```bash
# Install dependencies
npm install @tanstack/react-query @tanstack/react-query-devtools

# Create query client
touch lib/query-client.js

# Create hooks directory
mkdir -p hooks/queries hooks/mutations

# Start with services hook
touch hooks/queries/useServices.js
```

## 📝 Notes

- The unified tenant resolution from Phase 1-2 (`barbershop_id`) makes React Query implementation cleaner
- The existing `supabase-service.js` is perfectly structured for React Query
- Real-time subscriptions will use the same `barbershop_id` pattern
- All queries will be scoped by shop for multi-tenant isolation

## ✅ Prerequisites Complete

From Phase 1-2:
- ✅ Unified ID system (`barbershop_id`)
- ✅ Consistent service layer
- ✅ Proper error handling
- ✅ TypeScript types ready

## 🚀 Next Steps

1. **Immediate**: Install React Query dependencies
2. **Today**: Create query client and first hook
3. **This Week**: Migrate core data fetching
4. **Next Week**: Add advanced features

---

**Status**: Ready to implement
**Blocked By**: None
**Dependencies**: Phase 1-2 ✅ Complete
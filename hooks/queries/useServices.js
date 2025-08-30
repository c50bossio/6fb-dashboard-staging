/**
 * React Query Hooks for Services
 * Phase 3-4: Performance Optimization
 * 
 * These hooks replace the complex context-based service management
 * with efficient React Query patterns.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

/**
 * Fetch all services for a barbershop
 */
export function useServices(barbershopId, options = {}) {
  return useQuery({
    queryKey: queryKeys.services.byShop(barbershopId),
    queryFn: async () => {
      // Ensure service is initialized
      if (!createServiceRoleClient().isReady()) {
        await createServiceRoleClient().initialize()
      }
      return createServiceRoleClient().getServices(barbershopId, options)
    },
    enabled: !!barbershopId,
    staleTime: 10 * 60 * 1000, // Services don't change often - 10 minutes
    ...options.queryOptions,
  })
}

/**
 * Fetch a single service
 */
export function useService(barbershopId, serviceId) {
  return useQuery({
    queryKey: queryKeys.services.detail(barbershopId, serviceId),
    queryFn: async () => {
      const services = await createServiceRoleClient().getServices(barbershopId)
      return services.find(s => s.id === serviceId)
    },
    enabled: !!barbershopId && !!serviceId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Create a new service with optimistic update
 */
export function useCreateService() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (serviceData) => createServiceRoleClient().createService(serviceData),
    
    // Optimistic update
    onMutate: async (newService) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.services.byShop(newService.barberbarbershop_id) 
      })
      
      // Snapshot previous value
      const previousServices = queryClient.getQueryData(
        queryKeys.services.byShop(newService.barberbarbershop_id)
      )
      
      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.services.byShop(newService.barberbarbershop_id),
        (old) => [...(old || []), { ...newService, id: 'temp-' + Date.now() }]
      )
      
      return { previousServices, barberbarbershop_id: newService.barberbarbershop_id }
    },
    
    // If mutation fails, rollback
    onError: (err, newService, context) => {
      queryClient.setQueryData(
        queryKeys.services.byShop(context.barberbarbershop_id),
        context.previousServices
      )
    },
    
    // After success or error, refetch
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.services.byShop(variables.barberbarbershop_id) 
      })
    },
    
    onSuccess: (data, variables) => {
      // Show success message if needed
      console.log('Service created successfully:', data)
    }
  })
}

/**
 * Update an existing service
 */
export function useUpdateService() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ serviceId, updates }) => 
      createServiceRoleClient().updateService(serviceId, updates),
    
    // Optimistic update
    onMutate: async ({ serviceId, updates, barberbarbershop_id }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.services.byShop(barberbarbershop_id) 
      })
      
      const previousServices = queryClient.getQueryData(
        queryKeys.services.byShop(barberbarbershop_id)
      )
      
      // Update the service in cache
      queryClient.setQueryData(
        queryKeys.services.byShop(barberbarbershop_id),
        (old) => old?.map(service => 
          service.id === serviceId 
            ? { ...service, ...updates }
            : service
        )
      )
      
      return { previousServices, barberbarbershop_id }
    },
    
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.services.byShop(context.barberbarbershop_id),
        context.previousServices
      )
    },
    
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.services.byShop(variables.barberbarbershop_id) 
      })
    }
  })
}

/**
 * Delete (soft delete - sets active to false) a service
 */
export function useDeleteService() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (serviceId) => createServiceRoleClient().deleteService(serviceId),
    
    onSuccess: (data, serviceId, context) => {
      // Invalidate services list
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.services.all() 
      })
    }
  })
}

/**
 * Prefetch services for a shop (useful for navigation)
 */
export function usePrefetchServices() {
  const queryClient = useQueryClient()
  
  return (barbershopId) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.services.byShop(barbershopId),
      queryFn: () => createServiceRoleClient().getServices(barbershopId),
      staleTime: 10 * 60 * 1000,
    })
  }
}
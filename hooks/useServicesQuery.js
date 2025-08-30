/**
 * React Query hooks for services data
 * Replaces ServicesContext and direct Supabase queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import supabaseService from '@/lib/supabase-service'

// Query keys for consistent caching
export const serviceKeys = {
  all: ['services'],
  byShop: (shopId) => ['services', 'shop', shopId],
  active: (shopId) => ['services', 'shop', shopId, 'active'],
  byCategory: (shopId, category) => ['services', 'shop', shopId, 'category', category],
}

/**
 * Get all services for a shop
 */
export function useServices(shopId, options = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: serviceKeys.byShop(shopId),
    queryFn: () => supabaseService.getServices(shopId, options),
    enabled: enabled && !!shopId,
    staleTime: 10 * 60 * 1000, // 10 minutes (services change less frequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Get only active services
 */
export function useActiveServices(shopId) {
  return useQuery({
    queryKey: serviceKeys.active(shopId),
    queryFn: () => supabaseService.getServices(shopId, { isActive: true }),
    enabled: !!shopId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Get services by category
 */
export function useServicesByCategory(shopId, category) {
  return useQuery({
    queryKey: serviceKeys.byCategory(shopId, category),
    queryFn: () => supabaseService.getServices(shopId, { category, isActive: true }),
    enabled: !!shopId && !!category,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Get service categories (derived from services)
 */
export function useServiceCategories(shopId) {
  return useQuery({
    queryKey: ['services', 'categories', shopId],
    queryFn: async () => {
      const services = await supabaseService.getServices(shopId, { isActive: true })
      const categories = [...new Set(services.map(service => service.category).filter(Boolean))]
      return categories.sort()
    },
    enabled: !!shopId,
    staleTime: 15 * 60 * 1000, // Categories change even less frequently
  })
}

/**
 * Create service mutation
 */
export function useCreateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (serviceData) => supabaseService.createService(serviceData),
    onSuccess: (newService) => {
      toast.success('Service created successfully')
      
      // Invalidate service queries
      queryClient.invalidateQueries({ 
        queryKey: serviceKeys.byShop(newService.shop_id) 
      })
      
      // Also invalidate categories as we may have added a new one
      queryClient.invalidateQueries({ 
        queryKey: ['services', 'categories', newService.shop_id] 
      })
    },
    onError: (error) => {
      console.error('Failed to create service:', error)
      toast.error('Failed to create service')
    }
  })
}

/**
 * Update service mutation
 */
export function useUpdateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ serviceId, updates }) => 
      supabaseService.updateService(serviceId, updates),
    onSuccess: (updatedService) => {
      toast.success('Service updated successfully')
      
      // Invalidate service queries
      queryClient.invalidateQueries({ 
        queryKey: serviceKeys.byShop(updatedService.shop_id) 
      })
      
      // Invalidate categories in case category changed
      queryClient.invalidateQueries({ 
        queryKey: ['services', 'categories', updatedService.shop_id] 
      })
    },
    onError: (error) => {
      console.error('Failed to update service:', error)
      toast.error('Failed to update service')
    }
  })
}

/**
 * Delete service mutation (soft delete - sets is_active to false)
 */
export function useDeleteService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (serviceId) => supabaseService.deleteService(serviceId),
    onSuccess: (deletedService) => {
      toast.success('Service deleted successfully')
      
      // Invalidate service queries
      queryClient.invalidateQueries({ 
        queryKey: serviceKeys.byShop(deletedService.shop_id) 
      })
    },
    onError: (error) => {
      console.error('Failed to delete service:', error)
      toast.error('Failed to delete service')
    }
  })
}

/**
 * Bulk update services (for reordering)
 */
export function useBulkUpdateServices() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (servicesWithOrder) => {
      const promises = servicesWithOrder.map(service => 
        supabaseService.updateService(service.id, { display_order: service.display_order })
      )
      return Promise.all(promises)
    },
    onSuccess: (updatedServices) => {
      toast.success('Service order updated')
      
      // Invalidate service queries
      if (updatedServices.length > 0) {
        queryClient.invalidateQueries({ 
          queryKey: serviceKeys.byShop(updatedServices[0].shop_id) 
        })
      }
    },
    onError: (error) => {
      console.error('Failed to update service order:', error)
      toast.error('Failed to update service order')
    }
  })
}

/**
 * Get services formatted for select components
 */
export function useServiceOptions(shopId, category = null) {
  const queryKey = category 
    ? serviceKeys.byCategory(shopId, category)
    : serviceKeys.active(shopId)

  const { data: services, ...rest } = useQuery({
    queryKey,
    queryFn: () => category 
      ? supabaseService.getServices(shopId, { category, isActive: true })
      : supabaseService.getServices(shopId, { isActive: true }),
    enabled: !!shopId,
    staleTime: 10 * 60 * 1000,
  })

  return {
    ...rest,
    data: services?.map(service => ({
      value: service.id,
      label: `${service.name} - $${service.price}`,
      service
    })) || []
  }
}

/**
 * Calculate total revenue potential for services
 */
export function useServiceRevenuePotential(shopId) {
  return useQuery({
    queryKey: ['services', 'revenue-potential', shopId],
    queryFn: async () => {
      const services = await supabaseService.getServices(shopId, { isActive: true })
      
      return services.reduce((total, service) => {
        return total + (service.price || 0)
      }, 0)
    },
    enabled: !!shopId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}
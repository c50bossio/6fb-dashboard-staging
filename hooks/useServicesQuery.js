/**
 * React Query hooks for services data
 * Replaces ServicesContext and direct Supabase queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Query keys for consistent caching
export const serviceKeys = {
  all: ['services'],
  byShop: (barbershopId) => ['services', 'shop', barbershopId],
  active: (barbershopId) => ['services', 'shop', barbershopId, 'active'],
  byCategory: (barbershopId, category) => ['services', 'shop', barbershopId, 'category', category],
}

/**
 * Get all services for a shop
 */
export function useServices(barbershopId, options = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: serviceKeys.byShop(barbershopId),
    queryFn: () => createClient().getServices(barbershopId, options),
    enabled: enabled && !!barbershopId,
    staleTime: 10 * 60 * 1000, // 10 minutes (services change less frequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Get only active services
 */
export function useActiveServices(barbershopId) {
  return useQuery({
    queryKey: serviceKeys.active(barbershopId),
    queryFn: () => createClient().getServices(barbershopId, { isActive: true }),
    enabled: !!barbershopId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Get services by category
 */
export function useServicesByCategory(barbershopId, category) {
  return useQuery({
    queryKey: serviceKeys.byCategory(barbershopId, category),
    queryFn: () => createClient().getServices(barbershopId, { category, isActive: true }),
    enabled: !!barbershopId && !!category,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Get service categories (derived from services)
 */
export function useServiceCategories(barbershopId) {
  return useQuery({
    queryKey: ['services', 'categories', barbershopId],
    queryFn: async () => {
      const services = await createClient().getServices(barbershopId, { isActive: true })
      const categories = [...new Set(services.map(service => service.category).filter(Boolean))]
      return categories.sort()
    },
    enabled: !!barbershopId,
    staleTime: 15 * 60 * 1000, // Categories change even less frequently
  })
}

/**
 * Create service mutation
 */
export function useCreateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (serviceData) => createClient().createService(serviceData),
    onSuccess: (newService) => {
      toast.success('Service created successfully')
      
      // Invalidate service queries
      queryClient.invalidateQueries({ 
        queryKey: serviceKeys.byShop(newService.barbershop_id) 
      })
      
      // Also invalidate categories as we may have added a new one
      queryClient.invalidateQueries({ 
        queryKey: ['services', 'categories', newService.barbershop_id] 
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
      createClient().updateService(serviceId, updates),
    onSuccess: (updatedService) => {
      toast.success('Service updated successfully')
      
      // Invalidate service queries
      queryClient.invalidateQueries({ 
        queryKey: serviceKeys.byShop(updatedService.barbershop_id) 
      })
      
      // Invalidate categories in case category changed
      queryClient.invalidateQueries({ 
        queryKey: ['services', 'categories', updatedService.barbershop_id] 
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
    mutationFn: (serviceId) => createClient().deleteService(serviceId),
    onSuccess: (deletedService) => {
      toast.success('Service deleted successfully')
      
      // Invalidate service queries
      queryClient.invalidateQueries({ 
        queryKey: serviceKeys.byShop(deletedService.barbershop_id) 
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
        createClient().updateService(service.id, { display_order: service.display_order })
      )
      return Promise.all(promises)
    },
    onSuccess: (updatedServices) => {
      toast.success('Service order updated')
      
      // Invalidate service queries
      if (updatedServices.length > 0) {
        queryClient.invalidateQueries({ 
          queryKey: serviceKeys.byShop(updatedServices[0].barbershop_id) 
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
export function useServiceOptions(barbershopId, category = null) {
  const queryKey = category 
    ? serviceKeys.byCategory(barbershopId, category)
    : serviceKeys.active(barbershopId)

  const { data: services, ...rest } = useQuery({
    queryKey,
    queryFn: () => category 
      ? createClient().getServices(barbershopId, { category, isActive: true })
      : createClient().getServices(barbershopId, { isActive: true }),
    enabled: !!barbershopId,
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
export function useServiceRevenuePotential(barbershopId) {
  return useQuery({
    queryKey: ['services', 'revenue-potential', barbershopId],
    queryFn: async () => {
      const services = await createClient().getServices(barbershopId, { isActive: true })
      
      return services.reduce((total, service) => {
        return total + (service.price || 0)
      }, 0)
    },
    enabled: !!barbershopId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}
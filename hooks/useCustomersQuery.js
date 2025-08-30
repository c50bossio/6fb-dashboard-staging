/**
 * React Query hooks for customers data
 * Replaces CustomersContext and direct Supabase queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Query keys for consistent caching
export const customerKeys = {
  all: ['customers'],
  byShop: (barbershopId) => ['customers', 'shop', barbershopId],
  search: (barbershopId, searchTerm) => ['customers', 'shop', barbershopId, 'search', searchTerm],
  paginated: (barbershopId, page, limit) => ['customers', 'shop', barbershopId, 'page', page, limit],
}

/**
 * Get customers for a shop with pagination
 */
export function useCustomers(barbershopId, options = {}) {
  const { 
    search, 
    limit = 50, 
    offset = 0, 
    enabled = true 
  } = options

  const queryKey = search 
    ? customerKeys.search(barbershopId, search)
    : customerKeys.paginated(barbershopId, Math.floor(offset / limit), limit)

  return useQuery({
    queryKey,
    queryFn: () => createClient().getCustomers(barbershopId, {
      search,
      limit,
      offset
    }),
    enabled: enabled && !!barbershopId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true, // Important for pagination
  })
}

/**
 * Search customers with debounced search term
 */
export function useCustomerSearch(barbershopId, searchTerm, debounceMs = 300) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchTerm, debounceMs])

  return useQuery({
    queryKey: customerKeys.search(barbershopId, debouncedSearch),
    queryFn: () => createClient().getCustomers(barbershopId, {
      search: debouncedSearch,
      limit: 20
    }),
    enabled: !!barbershopId && !!debouncedSearch && debouncedSearch.length >= 2,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get all customers (for exports, reports, etc.)
 */
export function useAllCustomers(barbershopId) {
  return useQuery({
    queryKey: customerKeys.byShop(barbershopId),
    queryFn: () => createClient().getCustomers(barbershopId, { limit: 10000 }), // Large limit
    enabled: !!barbershopId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Get customer count
 */
export function useCustomerCount(barbershopId) {
  return useQuery({
    queryKey: ['customers', 'count', barbershopId],
    queryFn: async () => {
      const customers = await createClient().getCustomers(barbershopId, { limit: 10000 })
      return customers.length
    },
    enabled: !!barbershopId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Create customer mutation
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (customerData) => createClient().createCustomer(customerData),
    onSuccess: (newCustomer) => {
      toast.success('Customer created successfully')
      
      // Invalidate customer queries
      queryClient.invalidateQueries({ 
        queryKey: customerKeys.byShop(newCustomer.barberbarbershop_id) 
      })
      
      // Update count
      queryClient.invalidateQueries({ 
        queryKey: ['customers', 'count', newCustomer.barberbarbershop_id] 
      })
    },
    onError: (error) => {
      console.error('Failed to create customer:', error)
      toast.error('Failed to create customer')
    }
  })
}

/**
 * Update customer mutation
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ customerId, updates }) => 
      createClient().updateCustomer(customerId, updates),
    onSuccess: (updatedCustomer) => {
      toast.success('Customer updated successfully')
      
      // Invalidate customer queries
      queryClient.invalidateQueries({ 
        queryKey: customerKeys.byShop(updatedCustomer.barberbarbershop_id) 
      })
    },
    onError: (error) => {
      console.error('Failed to update customer:', error)
      toast.error('Failed to update customer')
    }
  })
}

/**
 * Optimized real-time customers hook with targeted cache updates
 */
export function useRealtimeCustomers(barbershopId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!barbershopId) return

    const unsubscribe = createClient().subscribeToChanges(
      'customers',
      { barberbarbershop_id: barbershopId },
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        
        // Update paginated customer queries
        queryClient.getQueryCache().findAll(customerKeys.byShop(barbershopId)).forEach(query => {
          if (query.state.data) {
            queryClient.setQueryData(query.queryKey, (oldData) => {
              if (!oldData) return oldData

              switch (eventType) {
                case 'INSERT':
                  // Add new customer at the beginning (assuming newest first)
                  const exists = oldData.find(customer => customer.id === newRecord.id)
                  return exists ? oldData : [newRecord, ...oldData]

                case 'UPDATE':
                  // Update existing customer
                  return oldData.map(customer => 
                    customer.id === newRecord.id ? newRecord : customer
                  )

                case 'DELETE':
                  // Remove deleted customer
                  return oldData.filter(customer => customer.id !== oldRecord.id)

                default:
                  return oldData
              }
            })
          }
        })

        // Update customer count efficiently
        if (eventType === 'INSERT') {
          queryClient.setQueryData(['customers', 'count', barbershopId], (oldCount) => 
            oldCount ? oldCount + 1 : undefined
          )
        } else if (eventType === 'DELETE') {
          queryClient.setQueryData(['customers', 'count', barbershopId], (oldCount) => 
            oldCount && oldCount > 0 ? oldCount - 1 : undefined
          )
        }

        // Update search queries if the change affects them
        const searchQueries = queryClient.getQueryCache()
          .findAll({ predicate: (query) => 
            query.queryKey[0] === 'customers' && 
            query.queryKey[1] === 'shop' && 
            query.queryKey[2] === barbershopId && 
            query.queryKey[3] === 'search'
          })

        searchQueries.forEach(query => {
          const searchTerm = query.queryKey[4]?.toLowerCase()
          const customer = newRecord || oldRecord
          
          // Check if customer matches search term
          const matchesSearch = !searchTerm || 
            customer.name?.toLowerCase().includes(searchTerm) ||
            customer.email?.toLowerCase().includes(searchTerm) ||
            customer.phone?.toLowerCase().includes(searchTerm)

          if (matchesSearch) {
            queryClient.invalidateQueries({ queryKey: query.queryKey })
          }
        })

        // Update loyalty stats for significant changes
        if (eventType === 'INSERT' || eventType === 'DELETE' || 
            (eventType === 'UPDATE' && newRecord.loyalty_points !== oldRecord.loyalty_points)) {
          queryClient.invalidateQueries({ 
            queryKey: ['customers', 'loyalty-stats', barbershopId] 
          })
        }
      }
    )

    return unsubscribe
  }, [barbershopId, queryClient])
}

/**
 * Combined hook for customers with real-time updates
 */
export function useCustomersWithRealtime(barbershopId, options = {}) {
  // Set up real-time subscription
  useRealtimeCustomers(barbershopId)
  
  // Return the customers query
  return useCustomers(barbershopId, options)
}

/**
 * Get customers formatted for select components
 */
export function useCustomerOptions(barbershopId, searchTerm = '') {
  const { data: customers, ...rest } = useCustomerSearch(barbershopId, searchTerm)

  return {
    ...rest,
    data: customers?.map(customer => ({
      value: customer.id,
      label: `${customer.name} ${customer.email ? `(${customer.email})` : ''}`,
      customer
    })) || []
  }
}

/**
 * Get frequent customers (most appointments)
 */
export function useFrequentCustomers(barbershopId, limit = 10) {
  return useQuery({
    queryKey: ['customers', 'frequent', barbershopId, limit],
    queryFn: async () => {
      // This would need customer appointment counts
      // For now, return recent customers
      const customers = await createClient().getCustomers(barbershopId, { 
        limit,
        // Would need to join with appointments for frequency
      })
      return customers
    },
    enabled: !!barbershopId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Get customer loyalty points summary
 */
export function useCustomerLoyaltyStats(barbershopId) {
  return useQuery({
    queryKey: ['customers', 'loyalty-stats', barbershopId],
    queryFn: async () => {
      const customers = await createClient().getCustomers(barbershopId, { limit: 10000 })
      
      const totalPoints = customers.reduce((sum, customer) => 
        sum + (customer.loyalty_points || 0), 0
      )
      
      const customersWithPoints = customers.filter(customer => 
        customer.loyalty_points > 0
      )
      
      return {
        totalCustomers: customers.length,
        totalPoints,
        customersWithPoints: customersWithPoints.length,
        averagePoints: customers.length > 0 ? totalPoints / customers.length : 0
      }
    },
    enabled: !!barbershopId,
    staleTime: 30 * 60 * 1000,
  })
}
/**
 * React Query hooks for customers data
 * Replaces CustomersContext and direct Supabase queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import supabaseService from '@/lib/supabase-service'
import { toast } from 'react-hot-toast'

// Query keys for consistent caching
export const customerKeys = {
  all: ['customers'],
  byShop: (shopId) => ['customers', 'shop', shopId],
  search: (shopId, searchTerm) => ['customers', 'shop', shopId, 'search', searchTerm],
  paginated: (shopId, page, limit) => ['customers', 'shop', shopId, 'page', page, limit],
}

/**
 * Get customers for a shop with pagination
 */
export function useCustomers(shopId, options = {}) {
  const { 
    search, 
    limit = 50, 
    offset = 0, 
    enabled = true 
  } = options

  const queryKey = search 
    ? customerKeys.search(shopId, search)
    : customerKeys.paginated(shopId, Math.floor(offset / limit), limit)

  return useQuery({
    queryKey,
    queryFn: () => supabaseService.getCustomers(shopId, {
      search,
      limit,
      offset
    }),
    enabled: enabled && !!shopId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    keepPreviousData: true, // Important for pagination
  })
}

/**
 * Search customers with debounced search term
 */
export function useCustomerSearch(shopId, searchTerm, debounceMs = 300) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchTerm, debounceMs])

  return useQuery({
    queryKey: customerKeys.search(shopId, debouncedSearch),
    queryFn: () => supabaseService.getCustomers(shopId, {
      search: debouncedSearch,
      limit: 20
    }),
    enabled: !!shopId && !!debouncedSearch && debouncedSearch.length >= 2,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get all customers (for exports, reports, etc.)
 */
export function useAllCustomers(shopId) {
  return useQuery({
    queryKey: customerKeys.byShop(shopId),
    queryFn: () => supabaseService.getCustomers(shopId, { limit: 10000 }), // Large limit
    enabled: !!shopId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Get customer count
 */
export function useCustomerCount(shopId) {
  return useQuery({
    queryKey: ['customers', 'count', shopId],
    queryFn: async () => {
      const customers = await supabaseService.getCustomers(shopId, { limit: 10000 })
      return customers.length
    },
    enabled: !!shopId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Create customer mutation
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (customerData) => supabaseService.createCustomer(customerData),
    onSuccess: (newCustomer) => {
      toast.success('Customer created successfully')
      
      // Invalidate customer queries
      queryClient.invalidateQueries({ 
        queryKey: customerKeys.byShop(newCustomer.barbershop_id) 
      })
      
      // Update count
      queryClient.invalidateQueries({ 
        queryKey: ['customers', 'count', newCustomer.barbershop_id] 
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
      supabaseService.updateCustomer(customerId, updates),
    onSuccess: (updatedCustomer) => {
      toast.success('Customer updated successfully')
      
      // Invalidate customer queries
      queryClient.invalidateQueries({ 
        queryKey: customerKeys.byShop(updatedCustomer.barbershop_id) 
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
export function useRealtimeCustomers(shopId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!shopId) return

    const unsubscribe = supabaseService.subscribeToChanges(
      'customers',
      { barbershop_id: shopId },
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        
        // Update paginated customer queries
        queryClient.getQueryCache().findAll(customerKeys.byShop(shopId)).forEach(query => {
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
          queryClient.setQueryData(['customers', 'count', shopId], (oldCount) => 
            oldCount ? oldCount + 1 : undefined
          )
        } else if (eventType === 'DELETE') {
          queryClient.setQueryData(['customers', 'count', shopId], (oldCount) => 
            oldCount && oldCount > 0 ? oldCount - 1 : undefined
          )
        }

        // Update search queries if the change affects them
        const searchQueries = queryClient.getQueryCache()
          .findAll({ predicate: (query) => 
            query.queryKey[0] === 'customers' && 
            query.queryKey[1] === 'shop' && 
            query.queryKey[2] === shopId && 
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
            queryKey: ['customers', 'loyalty-stats', shopId] 
          })
        }
      }
    )

    return unsubscribe
  }, [shopId, queryClient])
}

/**
 * Combined hook for customers with real-time updates
 */
export function useCustomersWithRealtime(shopId, options = {}) {
  // Set up real-time subscription
  useRealtimeCustomers(shopId)
  
  // Return the customers query
  return useCustomers(shopId, options)
}

/**
 * Get customers formatted for select components
 */
export function useCustomerOptions(shopId, searchTerm = '') {
  const { data: customers, ...rest } = useCustomerSearch(shopId, searchTerm)

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
export function useFrequentCustomers(shopId, limit = 10) {
  return useQuery({
    queryKey: ['customers', 'frequent', shopId, limit],
    queryFn: async () => {
      // This would need customer appointment counts
      // For now, return recent customers
      const customers = await supabaseService.getCustomers(shopId, { 
        limit,
        // Would need to join with appointments for frequency
      })
      return customers
    },
    enabled: !!shopId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Get customer loyalty points summary
 */
export function useCustomerLoyaltyStats(shopId) {
  return useQuery({
    queryKey: ['customers', 'loyalty-stats', shopId],
    queryFn: async () => {
      const customers = await supabaseService.getCustomers(shopId, { limit: 10000 })
      
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
    enabled: !!shopId,
    staleTime: 30 * 60 * 1000,
  })
}
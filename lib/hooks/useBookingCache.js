'use client'

import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import bookingAPI from '@/lib/booking-api'

// Cache configuration
const CACHE_CONFIG = {
  // Refresh intervals (ms)
  refreshInterval: 30000, // 30 seconds for live data
  backgroundRefreshInterval: 60000, // 1 minute for background refresh
  
  // Stale-while-revalidate timing
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 10000, // 10 seconds
  
  // Cache keys
  keys: {
    locations: 'booking/locations',
    barbers: 'booking/barbers',
    services: 'booking/services',
    availableSlots: 'booking/available-slots',
    shopSettings: 'booking/shop-settings',
    customerProfile: 'booking/customer-profile',
  },
  
  // Error retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 5000, // 5 seconds
}

// Optimized fetcher with error handling and caching
const createFetcher = (supabase) => async (key) => {
  const startTime = performance.now()
  
  try {
    // Parse cache key to determine data type
    const [category, type, ...params] = key.split('/')
    
    let data
    switch (type) {
      case 'locations':
        data = await fetchLocations(supabase)
        break
      case 'barbers':
        data = await fetchBarbers(supabase, params)
        break
      case 'services':
        data = await fetchServices(supabase, params)
        break
      case 'available-slots':
        data = await fetchAvailableSlots(supabase, params)
        break
      case 'shop-settings':
        data = await fetchShopSettings(supabase, params)
        break
      case 'customer-profile':
        data = await fetchCustomerProfile(supabase, params)
        break
      default:
        throw new Error(`Unknown cache key: ${key}`)
    }
    
    // Track fetch performance
    const duration = performance.now() - startTime
    if (typeof window !== 'undefined' && window.performance) {
      console.log(`[Cache] ${key}: ${duration.toFixed(2)}ms`)
    }
    
    return data
  } catch (error) {
    console.error(`[Cache Error] ${key}:`, error)
    throw error
  }
}

// Individual fetch functions with optimized queries
async function fetchLocations(supabase) {
  const { data, error } = await supabase
    .from('locations')
    .select(`
      id,
      name,
      address,
      phone,
      timezone,
      is_active,
      business_hours,
      created_at
    `)
    .eq('is_active', true)
    .order('name')
  
  if (error) throw error
  return data || []
}

async function fetchBarbers(supabase, params = []) {
  const locationId = params[0]
  
  let query = supabase
    .from('staff')
    .select(`
      id,
      name,
      email,
      phone,
      avatar_url,
      bio,
      skills,
      location_id,
      is_active,
      working_hours,
      booking_settings,
      created_at
    `)
    .eq('is_active', true)
    .order('name')
  
  if (locationId) {
    query = query.eq('location_id', locationId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data || []
}

async function fetchServices(supabase, params = []) {
  const locationId = params[0]
  const barberId = params[1]
  
  let query = supabase
    .from('services')
    .select(`
      id,
      name,
      description,
      duration,
      price,
      category,
      is_active,
      location_id,
      barber_specialties,
      created_at
    `)
    .eq('is_active', true)
    .order('category, name')
  
  if (locationId) {
    query = query.eq('location_id', locationId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  // Filter by barber specialties if barberId provided
  if (barberId && data) {
    // This would be implemented based on your business logic
    // For now, return all services
  }
  
  return data || []
}

async function fetchAvailableSlots(supabase, params = []) {
  const [barberId, date, serviceId] = params
  
  if (!barberId || !date) {
    return []
  }
  
  try {
    // Use booking API for complex availability logic
    const slots = await bookingAPI.getAvailableSlots({
      barberId,
      date,
      serviceId,
    })
    
    return slots || []
  } catch (error) {
    console.error('Failed to fetch available slots:', error)
    return []
  }
}

async function fetchShopSettings(supabase, params = []) {
  const locationId = params[0]
  
  const { data, error } = await supabase
    .from('shop_settings')
    .select(`
      id,
      location_id,
      booking_settings,
      payment_settings,
      notification_settings,
      business_hours,
      timezone,
      updated_at
    `)
    .eq('location_id', locationId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // Not found is ok
    throw error
  }
  
  return data || {}
}

async function fetchCustomerProfile(supabase, params = []) {
  const userId = params[0]
  
  if (!userId) return null
  
  const { data, error } = await supabase
    .from('customer_profiles')
    .select(`
      id,
      user_id,
      preferences,
      booking_history,
      favorite_barbers,
      favorite_services,
      updated_at
    `)
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // Not found is ok
    throw error
  }
  
  return data
}

// Main hook for booking data caching
export function useBookingCache() {
  const supabase = createClient()
  const fetcher = useMemo(() => createFetcher(supabase), [supabase])
  
  // Fetch locations (always needed)
  const {
    data: locations,
    error: locationsError,
    isLoading: locationsLoading,
    mutate: mutateLocations
  } = useSWR(
    CACHE_CONFIG.keys.locations,
    fetcher,
    {
      refreshInterval: CACHE_CONFIG.refreshInterval,
      revalidateOnFocus: CACHE_CONFIG.revalidateOnFocus,
      revalidateOnReconnect: CACHE_CONFIG.revalidateOnReconnect,
      dedupingInterval: CACHE_CONFIG.dedupingInterval,
      errorRetryCount: CACHE_CONFIG.errorRetryCount,
      errorRetryInterval: CACHE_CONFIG.errorRetryInterval,
    }
  )
  
  // Global mutate function for invalidating all caches
  const mutateAll = useCallback(() => {
    mutateLocations()
    // Add other mutate calls as needed
  }, [mutateLocations])
  
  return {
    locations,
    isLoading: locationsLoading,
    error: locationsError,
    mutate: mutateAll,
  }
}

// Specialized hook for location-specific data
export function useLocationBookingData(locationId) {
  const supabase = createClient()
  const fetcher = useMemo(() => createFetcher(supabase), [supabase])
  
  // Fetch barbers for specific location
  const {
    data: barbers,
    error: barbersError,
    isLoading: barbersLoading,
    mutate: mutateBarbers
  } = useSWR(
    locationId ? `${CACHE_CONFIG.keys.barbers}/${locationId}` : null,
    fetcher,
    {
      refreshInterval: CACHE_CONFIG.refreshInterval,
      revalidateOnFocus: CACHE_CONFIG.revalidateOnFocus,
      revalidateOnReconnect: CACHE_CONFIG.revalidateOnReconnect,
      dedupingInterval: CACHE_CONFIG.dedupingInterval,
    }
  )
  
  // Fetch services for specific location
  const {
    data: services,
    error: servicesError,
    isLoading: servicesLoading,
    mutate: mutateServices
  } = useSWR(
    locationId ? `${CACHE_CONFIG.keys.services}/${locationId}` : null,
    fetcher,
    {
      refreshInterval: CACHE_CONFIG.refreshInterval,
      revalidateOnFocus: CACHE_CONFIG.revalidateOnFocus,
      revalidateOnReconnect: CACHE_CONFIG.revalidateOnReconnect,
      dedupingInterval: CACHE_CONFIG.dedupingInterval,
    }
  )
  
  // Fetch shop settings for specific location
  const {
    data: shopSettings,
    error: shopSettingsError,
    isLoading: shopSettingsLoading,
    mutate: mutateShopSettings
  } = useSWR(
    locationId ? `${CACHE_CONFIG.keys.shopSettings}/${locationId}` : null,
    fetcher,
    {
      refreshInterval: CACHE_CONFIG.backgroundRefreshInterval, // Less frequent for settings
      revalidateOnFocus: false, // Settings don't change often
      revalidateOnReconnect: CACHE_CONFIG.revalidateOnReconnect,
      dedupingInterval: CACHE_CONFIG.dedupingInterval,
    }
  )
  
  const mutateLocationData = useCallback(() => {
    mutateBarbers()
    mutateServices()
    mutateShopSettings()
  }, [mutateBarbers, mutateServices, mutateShopSettings])
  
  return {
    barbers: barbers || [],
    services: services || [],
    shopSettings: shopSettings || {},
    isLoading: barbersLoading || servicesLoading || shopSettingsLoading,
    error: barbersError || servicesError || shopSettingsError,
    mutate: mutateLocationData,
  }
}

// Hook for available time slots with optimized caching
export function useAvailableSlots(barberId, date, serviceId) {
  const supabase = createClient()
  const fetcher = useMemo(() => createFetcher(supabase), [supabase])
  
  const cacheKey = barberId && date 
    ? `${CACHE_CONFIG.keys.availableSlots}/${barberId}/${date}${serviceId ? `/${serviceId}` : ''}`
    : null
  
  const {
    data: availableSlots,
    error: slotsError,
    isLoading: slotsLoading,
    mutate: mutateSlots
  } = useSWR(
    cacheKey,
    fetcher,
    {
      refreshInterval: 60000, // 1 minute - slots change frequently
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds - allow more frequent updates
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  )
  
  return {
    availableSlots: availableSlots || [],
    isLoading: slotsLoading,
    error: slotsError,
    mutate: mutateSlots,
  }
}

// Hook for customer profile with caching
export function useCustomerProfile(userId) {
  const supabase = createClient()
  const fetcher = useMemo(() => createFetcher(supabase), [supabase])
  
  const {
    data: customerProfile,
    error: profileError,
    isLoading: profileLoading,
    mutate: mutateProfile
  } = useSWR(
    userId ? `${CACHE_CONFIG.keys.customerProfile}/${userId}` : null,
    fetcher,
    {
      refreshInterval: 0, // Don't auto-refresh profile data
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: CACHE_CONFIG.dedupingInterval,
    }
  )
  
  return {
    customerProfile,
    isLoading: profileLoading,
    error: profileError,
    mutate: mutateProfile,
  }
}

// Utility function to prefetch data
export function prefetchBookingData(locationId) {
  const supabase = createClient()
  const fetcher = createFetcher(supabase)
  
  // Prefetch common data
  Promise.all([
    fetcher(`${CACHE_CONFIG.keys.barbers}/${locationId}`),
    fetcher(`${CACHE_CONFIG.keys.services}/${locationId}`),
    fetcher(`${CACHE_CONFIG.keys.shopSettings}/${locationId}`),
  ]).catch(error => {
    console.warn('Failed to prefetch booking data:', error)
  })
}

// Utility function to clear all booking caches
export function clearBookingCache() {
  const keys = Object.values(CACHE_CONFIG.keys)
  keys.forEach(key => {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Clear any localStorage cache entries if using
      const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith(key))
      cacheKeys.forEach(k => localStorage.removeItem(k))
    }
  })
}
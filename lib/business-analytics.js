/**
 * Business Analytics - Real-time barbershop metrics from Supabase
 * 
 * This module provides optimized queries for real-time business analytics
 * used throughout the booking rules engine and automation systems.
 */

import { createClient } from '@/lib/supabase/client'
import { logger } from './logger'
import { initializeRLSContext, executeWithRLS, createShopScopedQuery, validateShopAccess } from './rls-context-manager'
import { queryTable } from './supabase-query'

const analyticsLogger = logger.child('business-analytics')

/**
 * Get shop analytics for automation settings and business intelligence
 * @param {string} shopId - Shop/barbershop ID
 * @param {number} monthsBack - Number of months of data to analyze (default: 3)
 * @returns {Promise<Object>} Comprehensive shop analytics
 */
export async function getShopAnalytics(shopId, monthsBack = 3) {
  try {
    if (!shopId) {
      throw new Error('Shop ID is required')
    }

    // Validate shop access through RLS
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      const hasAccess = await validateShopAccess(session.user.id, shopId)
      if (!hasAccess) {
        analyticsLogger.warn('Shop access denied', {
          userId: session.user.id,
          shopId
        })
        throw new Error('Access denied: You do not have permission to view this shop\'s analytics')
      }
    }

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Execute queries with RLS context enforcement
    const { appointments, services, customers } = await executeWithRLS(async () => {
      let appointmentsData = []
      let servicesData = []
      let customersData = []

      try {
        // Get all appointments for the analysis period (RLS-secured)
        const appointmentsQuery = createShopScopedQuery('appointments')
        const { data, error: appointmentsError } = await appointmentsQuery
          .select('id, date, status, total_price, service_id, customer_id, created_at, barber_id')
          .gte('date', startDate.toISOString())

        if (appointmentsError) {
          analyticsLogger.error('Failed to load appointment data', appointmentsError, { shopId })
          throw new Error(`Failed to load appointment data: ${appointmentsError.message}`)
        }

        appointmentsData = data || []
        analyticsLogger.debug('Appointments loaded successfully', {
          shopId,
          count: appointmentsData.length
        })

      } catch (error) {
        analyticsLogger.error('Error in appointments query', error, { shopId })
        throw new Error(`Appointments query failed: ${error.message}`)
      }

      try {
        // Get services for pricing analysis (RLS-secured)
        const servicesQuery = createShopScopedQuery('services')
        const { data, error: servicesError } = await servicesQuery
          .select('id, price, name, duration_minutes')

        if (servicesError) {
          analyticsLogger.warn('Failed to load services data', servicesError, { shopId })
        } else {
          servicesData = data || []
          analyticsLogger.debug('Services loaded successfully', {
            shopId,
            count: servicesData.length
          })
        }

      } catch (error) {
        analyticsLogger.warn('Error in services query', error, { shopId })
        // Don't throw - services are optional for analytics
      }

      try {
        // Get customers for segmentation analysis (RLS-secured)
        const uniqueCustomerIds = [...new Set(appointmentsData.map(apt => apt.customer_id).filter(Boolean))]
        
        if (uniqueCustomerIds.length > 0) {
          const customersQuery = createShopScopedQuery('customers')
          const { data, error: customersError } = await customersQuery
            .select('id, created_at, total_appointments, loyalty_points')
            .in('id', uniqueCustomerIds)
          
          if (customersError) {
            analyticsLogger.warn('Failed to load customers data', customersError, { shopId })
          } else {
            customersData = data || []
            analyticsLogger.debug('Customers loaded successfully', {
              shopId,
              count: customersData.length
            })
          }
        }

      } catch (error) {
        analyticsLogger.warn('Error in customers query', error, { shopId })
        // Don't throw - customers are optional for analytics
      }

      return {
        appointments: appointmentsData,
        services: servicesData,
        customers: customersData
      }
    })

    analyticsLogger.debug('Analytics data loaded', {
      shopId,
      appointmentsCount: appointments.length,
      servicesCount: services.length,
      customersCount: customers.length
    })

    // Filter appointments by time periods
    const allAppointments = appointments.filter(apt => new Date(apt.date) >= startDate)
    const currentMonthAppointments = allAppointments.filter(apt => 
      new Date(apt.date) >= currentMonthStart
    )
    const lastMonthAppointments = allAppointments.filter(apt => 
      new Date(apt.date) >= lastMonthStart && new Date(apt.date) <= lastMonthEnd
    )

    // Calculate key metrics
    const metrics = calculateAnalyticsMetrics({
      allAppointments,
      currentMonthAppointments,
      lastMonthAppointments,
      services: services || [],
      customers: customers || []
    })

    return {
      success: true,
      data: {
        shopId,
        dateRange: {
          startDate: startDate.toISOString(),
          currentMonthStart: currentMonthStart.toISOString(),
          lastMonthStart: lastMonthStart.toISOString()
        },
        metrics,
        rawData: {
          totalAppointments: allAppointments.length,
          totalServices: services?.length || 0,
          totalCustomers: customers?.length || 0
        }
      }
    }

  } catch (error) {
    analyticsLogger.error('Error getting shop analytics', error, { shopId })
    
    // Return appropriate error response
    if (error.message?.includes('Access denied')) {
      return {
        success: false,
        error: error.message,
        data: null // Don't return default data for access denied
      }
    }
    
    return {
      success: false,
      error: error.message,
      data: getDefaultAnalytics()
    }
  }
}

/**
 * Calculate comprehensive analytics metrics from raw data
 */
function calculateAnalyticsMetrics({ 
  allAppointments, 
  currentMonthAppointments, 
  lastMonthAppointments, 
  services, 
  customers 
}) {
  // Appointment status analysis
  const currentCompleted = currentMonthAppointments.filter(apt => apt.status === 'completed')
  const currentNoShows = currentMonthAppointments.filter(apt => apt.status === 'no_show')
  const currentCanceled = currentMonthAppointments.filter(apt => apt.status === 'cancelled')
  
  const lastCompleted = lastMonthAppointments.filter(apt => apt.status === 'completed')
  const lastNoShows = lastMonthAppointments.filter(apt => apt.status === 'no_show')

  // Revenue calculations
  const currentRevenue = currentCompleted.reduce((sum, apt) => 
    sum + (parseFloat(apt.total_price) || 0), 0
  )
  
  const lastMonthRevenue = lastCompleted.reduce((sum, apt) => 
    sum + (parseFloat(apt.total_price) || 0), 0
  )

  // Service pricing analysis
  const averageServicePrice = services.length > 0 
    ? services.reduce((sum, svc) => sum + (parseFloat(svc.price) || 0), 0) / services.length
    : 50 // Default estimate

  // No-show rate calculation
  const noShowRate = currentMonthAppointments.length > 0 
    ? currentNoShows.length / currentMonthAppointments.length 
    : 0

  // Revenue loss from no-shows
  const currentMonthlyLoss = currentNoShows.length * averageServicePrice

  // Client segmentation (simplified algorithm)
  const uniqueCustomers = [...new Set(currentMonthAppointments.map(apt => apt.customer_id))]
  const clientTypes = segmentClients(allAppointments, customers, uniqueCustomers)

  // Trend analysis
  const bookingTrend = lastMonthAppointments.length > 0 
    ? ((currentMonthAppointments.length - lastMonthAppointments.length) / lastMonthAppointments.length) * 100
    : 0

  const revenueTrend = lastMonthRevenue > 0 
    ? ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0

  // Risk indicators
  const riskIndicators = {
    highNoShowRate: noShowRate > 0.15,
    decliningBookings: bookingTrend < -10,
    lowRevenue: currentRevenue < 1000,
    highCancellationRate: currentCanceled.length / Math.max(currentMonthAppointments.length, 1) > 0.10
  }

  return {
    // Core metrics for automation settings
    name: 'Your Barbershop', // Will be overridden by shop settings
    averageMonthlyBookings: currentMonthAppointments.length,
    averageServicePrice: Math.round(averageServicePrice * 100) / 100,
    noShowRate: Math.round(noShowRate * 1000) / 1000, // Precise to 3 decimal places
    currentMonthlyLoss: Math.round(currentMonthlyLoss * 100) / 100,
    lastMonthRevenue: Math.round(lastMonthRevenue * 100) / 100,
    clientTypes,

    // Extended analytics
    currentRevenue: Math.round(currentRevenue * 100) / 100,
    trends: {
      bookings: Math.round(bookingTrend * 100) / 100,
      revenue: Math.round(revenueTrend * 100) / 100
    },
    statusBreakdown: {
      completed: currentCompleted.length,
      noShows: currentNoShows.length,
      cancelled: currentCanceled.length,
      scheduled: currentMonthAppointments.filter(apt => apt.status === 'scheduled').length
    },
    riskIndicators,
    
    // Comparative data
    lastMonth: {
      appointments: lastMonthAppointments.length,
      revenue: Math.round(lastMonthRevenue * 100) / 100,
      noShows: lastNoShows.length,
      noShowRate: lastMonthAppointments.length > 0 
        ? Math.round((lastNoShows.length / lastMonthAppointments.length) * 1000) / 1000
        : 0
    }
  }
}

/**
 * Segment clients into categories based on booking history
 */
function segmentClients(allAppointments, customers, uniqueCustomers) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
  const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))

  let newClients = 0
  let regularClients = 0
  let vipClients = 0
  let loyalClients = 0

  uniqueCustomers.forEach(customerId => {
    const customerAppointments = allAppointments.filter(apt => apt.customer_id === customerId)
    const recentAppointments = customerAppointments.filter(apt => new Date(apt.date) >= thirtyDaysAgo)
    const totalAppointments = customerAppointments.length
    const firstAppointment = customerAppointments.reduce((earliest, apt) => 
      new Date(apt.date) < new Date(earliest.date) ? apt : earliest
    )

    // Client classification logic
    const isNew = new Date(firstAppointment.date) >= thirtyDaysAgo
    const hasHighFrequency = recentAppointments.length >= 2
    const hasLongHistory = new Date(firstAppointment.date) <= ninetyDaysAgo
    const hasHighValue = customerAppointments.reduce((sum, apt) => 
      sum + (parseFloat(apt.total_price) || 0), 0
    ) >= 500

    if (isNew) {
      newClients++
    } else if (hasHighValue && hasLongHistory) {
      loyalClients++
    } else if (hasHighFrequency || hasHighValue) {
      vipClients++
    } else {
      regularClients++
    }
  })

  return {
    new: newClients,
    regular: regularClients,
    vip: vipClients,
    loyal: loyalClients
  }
}

/**
 * Get default analytics structure for error fallback
 */
function getDefaultAnalytics() {
  return {
    name: 'Your Barbershop',
    averageMonthlyBookings: 0,
    averageServicePrice: 0,
    noShowRate: 0.0,
    currentMonthlyLoss: 0,
    lastMonthRevenue: 0,
    clientTypes: { new: 0, regular: 0, vip: 0, loyal: 0 },
    currentRevenue: 0,
    trends: { bookings: 0, revenue: 0 },
    statusBreakdown: { completed: 0, noShows: 0, cancelled: 0, scheduled: 0 },
    riskIndicators: {
      highNoShowRate: false,
      decliningBookings: false,
      lowRevenue: true,
      highCancellationRate: false
    },
    lastMonth: {
      appointments: 0,
      revenue: 0,
      noShows: 0,
      noShowRate: 0
    }
  }
}

/**
 * Get shop ID from user session with multi-tenant support
 * @returns {Promise<string|null>} Shop ID or null if not found
 */
export async function getUserShopId() {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      analyticsLogger.warn('No session found for getUserShopId')
      return null
    }

    const userId = session.user.id

    // Get user profile to determine shop context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError
    }

    // Check direct shop association
    let shopId = profile?.shop_id || profile?.barbershop_id
    
    if (!shopId) {
      // Try to get shop via staff relationship
      const { data: staffData, error: staffError } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (!staffError && staffData) {
        shopId = staffData.barbershop_id
      }
    }

    analyticsLogger.debug('Retrieved user shop ID', { userId, shopId })
    return shopId
    
  } catch (error) {
    analyticsLogger.error('Error getting user shop ID', error)
    return null
  }
}

/**
 * Get real-time analytics for current user's shop
 * @param {number} monthsBack - Number of months to analyze
 * @returns {Promise<Object>} Shop analytics or default values
 */
export async function getCurrentUserShopAnalytics(monthsBack = 3) {
  try {
    // Initialize RLS context automatically
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return {
        success: false,
        error: 'User not authenticated',
        data: getDefaultAnalytics()
      }
    }

    // Initialize RLS context for secure access
    await initializeRLSContext(session)
    
    const shopId = await getUserShopId()
    
    if (!shopId) {
      analyticsLogger.warn('No shop ID found for current user')
      return {
        success: false,
        error: 'No shop association found',
        data: getDefaultAnalytics()
      }
    }

    analyticsLogger.info('Getting analytics for current user', {
      userId: session.user.id,
      shopId,
      monthsBack
    })

    return getShopAnalytics(shopId, monthsBack)
    
  } catch (error) {
    analyticsLogger.error('Error getting current user shop analytics', error)
    return {
      success: false,
      error: error.message,
      data: getDefaultAnalytics()
    }
  }
}

/**
 * Subscribe to real-time analytics updates using client-side Supabase
 * @param {string} shopId - Shop ID to monitor
 * @param {Function} callback - Callback function for updates
 * @param {Object} options - Subscription options
 * @returns {Object} Subscription object with unsubscribe method
 */
export function subscribeToShopAnalytics(shopId, callback, options = {}) {
  if (!shopId || !callback) {
    throw new Error('shopId and callback are required for analytics subscription')
  }

  const {
    debounceMs = 2000, // Debounce rapid changes
    tables = ['appointments', 'customers', 'services'], // Tables to monitor
    includeServices = true,
    includeCustomers = true
  } = options

  analyticsLogger.debug('Setting up real-time analytics subscription', {
    shopId,
    tables,
    debounceMs
  })

  // This function needs to be called from client-side code
  const supabase = createClient()
  let debounceTimeout = null
  const subscriptions = []

  // Debounced analytics refresh function
  const debouncedRefresh = () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    
    debounceTimeout = setTimeout(async () => {
      try {
        analyticsLogger.debug('Refreshing analytics due to real-time changes', { shopId })
        const analytics = await getShopAnalytics(shopId)
        callback(analytics)
      } catch (error) {
        analyticsLogger.error('Error refreshing analytics in real-time subscription', error)
        callback({
          success: false,
          error: error.message,
          data: getDefaultAnalytics()
        })
      }
    }, debounceMs)
  }

  // Subscribe to appointments changes
  if (tables.includes('appointments')) {
    const appointmentsSub = supabase
      .channel(`analytics-appointments-${shopId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `barbershop_id=eq.${shopId}`
      }, (payload) => {
        analyticsLogger.debug('Appointments change detected', {
          shopId,
          event: payload.eventType,
          appointmentId: payload.new?.id || payload.old?.id
        })
        debouncedRefresh()
      })
      .subscribe((status) => {
        analyticsLogger.debug('Appointments subscription status', { status, shopId })
      })
    
    subscriptions.push(appointmentsSub)
  }

  // Subscribe to customers changes (if enabled)
  if (includeCustomers && tables.includes('customers')) {
    const customersSub = supabase
      .channel(`analytics-customers-${shopId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customers',
        filter: `barbershop_id=eq.${shopId}`
      }, (payload) => {
        analyticsLogger.debug('Customers change detected', {
          shopId,
          event: payload.eventType,
          customerId: payload.new?.id || payload.old?.id
        })
        debouncedRefresh()
      })
      .subscribe((status) => {
        analyticsLogger.debug('Customers subscription status', { status, shopId })
      })
    
    subscriptions.push(customersSub)
  }

  // Subscribe to services changes (if enabled)
  if (includeServices && tables.includes('services')) {
    const servicesSub = supabase
      .channel(`analytics-services-${shopId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'services',
        filter: `shop_id=eq.${shopId}`
      }, (payload) => {
        analyticsLogger.debug('Services change detected', {
          shopId,
          event: payload.eventType,
          serviceId: payload.new?.id || payload.old?.id
        })
        debouncedRefresh()
      })
      .subscribe((status) => {
        analyticsLogger.debug('Services subscription status', { status, shopId })
      })
    
    subscriptions.push(servicesSub)
  }

  analyticsLogger.info('Real-time analytics subscriptions established', {
    shopId,
    subscriptionCount: subscriptions.length
  })

  return {
    unsubscribe: () => {
      analyticsLogger.debug('Unsubscribing from real-time analytics', { shopId })
      
      // Clear debounce timeout
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
      
      // Unsubscribe from all channels
      subscriptions.forEach(sub => {
        try {
          sub.unsubscribe()
        } catch (error) {
          analyticsLogger.warn('Error unsubscribing from channel', error)
        }
      })
      
      analyticsLogger.info('Real-time analytics subscriptions closed', { shopId })
    },
    
    // Utility methods
    refresh: () => debouncedRefresh(),
    getSubscriptionCount: () => subscriptions.length
  }
}

/**
 * Get simplified shop metrics for quick display
 * @param {string} shopId - Shop/barbershop ID
 * @returns {Promise<Object>} Essential metrics only
 */
export async function getQuickShopMetrics(shopId) {
  try {
    const analytics = await getShopAnalytics(shopId, 1) // Current month only
    
    if (!analytics.success) {
      return analytics
    }

    const { metrics } = analytics.data
    
    return {
      success: true,
      data: {
        monthlyBookings: metrics.averageMonthlyBookings,
        averagePrice: metrics.averageServicePrice,
        noShowRate: metrics.noShowRate,
        monthlyLoss: metrics.currentMonthlyLoss,
        totalCustomers: metrics.clientTypes.new + metrics.clientTypes.regular + metrics.clientTypes.vip + metrics.clientTypes.loyal
      }
    }
  } catch (error) {
    console.error('Error getting quick shop metrics:', error)
    return {
      success: false,
      error: error.message,
      data: {
        monthlyBookings: 0,
        averagePrice: 0,
        noShowRate: 0,
        monthlyLoss: 0,
        totalCustomers: 0
      }
    }
  }
}

/**
 * Create a managed real-time analytics subscription with automatic cleanup
 * @param {string} shopId - Shop ID to monitor
 * @param {Function} callback - Callback function for updates
 * @param {Object} options - Subscription options
 * @returns {Object} Managed subscription with enhanced features
 */
export function createManagedAnalyticsSubscription(shopId, callback, options = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    maxRetries = 3,
    retryDelay = 5000,
    onError = null,
    onReconnect = null
  } = options

  let subscription = null
  let refreshTimer = null
  let retryCount = 0
  let isActive = true

  const handleError = (error) => {
    analyticsLogger.error('Managed analytics subscription error', error, { shopId })
    if (onError) {
      onError(error)
    }
    
    // Attempt reconnection if retries available
    if (retryCount < maxRetries && isActive) {
      retryCount++
      analyticsLogger.info('Attempting to reconnect analytics subscription', {
        shopId,
        retryCount,
        maxRetries
      })
      
      setTimeout(() => {
        if (isActive) {
          establishConnection()
        }
      }, retryDelay * retryCount)
    }
  }

  const establishConnection = () => {
    try {
      subscription = subscribeToShopAnalytics(shopId, (analytics) => {
        retryCount = 0 // Reset retry count on successful callback
        callback(analytics)
        
        if (onReconnect && retryCount > 0) {
          onReconnect()
        }
      }, {
        ...options,
        onError: handleError
      })
      
      analyticsLogger.debug('Analytics subscription established', { shopId })
      
    } catch (error) {
      handleError(error)
    }
  }

  // Set up auto-refresh if enabled
  if (autoRefresh) {
    refreshTimer = setInterval(async () => {
      if (isActive) {
        try {
          const analytics = await getShopAnalytics(shopId)
          callback(analytics)
        } catch (error) {
          analyticsLogger.warn('Auto-refresh analytics failed', error, { shopId })
        }
      }
    }, refreshInterval)
  }

  // Establish initial connection
  establishConnection()

  return {
    unsubscribe: () => {
      isActive = false
      
      if (subscription) {
        subscription.unsubscribe()
      }
      
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
      
      analyticsLogger.info('Managed analytics subscription closed', { shopId })
    },
    
    refresh: async () => {
      if (subscription?.refresh) {
        subscription.refresh()
      } else {
        const analytics = await getShopAnalytics(shopId)
        callback(analytics)
      }
    },
    
    getStatus: () => ({
      isActive,
      retryCount,
      maxRetries,
      hasSubscription: !!subscription
    })
  }
}

export default {
  getShopAnalytics,
  getCurrentUserShopAnalytics,
  getUserShopId,
  subscribeToShopAnalytics,
  createManagedAnalyticsSubscription,
  getQuickShopMetrics
}
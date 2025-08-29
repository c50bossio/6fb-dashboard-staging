/**
 * Centralized Supabase Service Layer
 * Single source of truth for all database operations
 * Designed to work seamlessly with React Query
 * Replaces multiple contexts with consolidated data access
 */

import { createClient } from '@/lib/supabase/browser-client'
import { logger } from '@/lib/logger'

// Adapter functions for compatibility
const getSupabaseClient = createClient
const executeQuery = async (queryFn) => queryFn()
const getCurrentUser = async () => {
  const client = createClient()
  const { data: { user } } = await client.auth.getUser()
  return user
}

const serviceLogger = logger.child('supabase-service')

/**
 * Optimized Subscription Manager
 * Handles connection deduplication, reference counting, and performance monitoring
 */
class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map() // key: `${table}_${shopId}`, value: subscription info
    this.callbacks = new Map() // key: subscription key, value: Set of callbacks
    this.connectionStatus = 'disconnected'
    this.metrics = {
      totalSubscriptions: 0,
      activeConnections: 0,
      messagesReceived: 0,
      reconnectAttempts: 0,
      lastConnected: null,
      averageLatency: 0
    }
    this.reconnectDelay = 1000 // Start with 1 second
    this.maxReconnectDelay = 30000 // Max 30 seconds
    this.reconnectMultiplier = 1.5
  }

  /**
   * Subscribe to table changes with automatic deduplication
   */
  subscribe(table, shopId, callback, client) {
    const subscriptionKey = `${table}_${shopId}`
    
    // Initialize callback set if not exists
    if (!this.callbacks.has(subscriptionKey)) {
      this.callbacks.set(subscriptionKey, new Set())
    }
    
    // Add callback to set
    this.callbacks.get(subscriptionKey).add(callback)
    this.metrics.totalSubscriptions++
    
    serviceLogger.debug('Subscription added', { 
      table, 
      shopId, 
      callbackCount: this.callbacks.get(subscriptionKey).size 
    })

    // Create actual Supabase subscription if this is the first callback
    if (this.callbacks.get(subscriptionKey).size === 1) {
      this.createSubscription(subscriptionKey, table, shopId, client)
    }

    // Return unsubscribe function
    return () => this.unsubscribe(subscriptionKey, callback)
  }

  /**
   * Unsubscribe from table changes with reference counting
   */
  unsubscribe(subscriptionKey, callback) {
    const callbacks = this.callbacks.get(subscriptionKey)
    if (!callbacks) return

    callbacks.delete(callback)
    this.metrics.totalSubscriptions--
    
    serviceLogger.debug('Subscription removed', { 
      subscriptionKey, 
      remainingCallbacks: callbacks.size 
    })

    // If no callbacks remain, destroy the actual subscription
    if (callbacks.size === 0) {
      this.destroySubscription(subscriptionKey)
      this.callbacks.delete(subscriptionKey)
    }
  }

  /**
   * Create actual Supabase subscription
   */
  createSubscription(subscriptionKey, table, shopId, client) {
    try {
      const channel = client
        .channel(`optimized_${subscriptionKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `barbershop_id=eq.${shopId}`
          },
          (payload) => this.handleMessage(subscriptionKey, payload)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.connectionStatus = 'connected'
            this.metrics.activeConnections++
            this.metrics.lastConnected = new Date()
            this.reconnectDelay = 1000 // Reset reconnect delay on success
            serviceLogger.info('Real-time subscription established', { subscriptionKey })
          } else if (status === 'CHANNEL_ERROR') {
            this.connectionStatus = 'error'
            this.handleConnectionError(subscriptionKey, table, shopId, client)
          }
        })

      this.subscriptions.set(subscriptionKey, {
        channel,
        table,
        shopId,
        client,
        createdAt: new Date()
      })

    } catch (error) {
      serviceLogger.error('Failed to create subscription', error, { subscriptionKey })
      this.handleConnectionError(subscriptionKey, table, shopId, client)
    }
  }

  /**
   * Destroy Supabase subscription
   */
  destroySubscription(subscriptionKey) {
    const subscription = this.subscriptions.get(subscriptionKey)
    if (!subscription) return

    try {
      subscription.channel.unsubscribe()
      this.metrics.activeConnections--
      serviceLogger.info('Real-time subscription destroyed', { subscriptionKey })
    } catch (error) {
      serviceLogger.error('Error destroying subscription', error, { subscriptionKey })
    }

    this.subscriptions.delete(subscriptionKey)
  }

  /**
   * Handle incoming real-time messages with performance tracking
   */
  handleMessage(subscriptionKey, payload) {
    const startTime = performance.now()
    this.metrics.messagesReceived++
    
    const callbacks = this.callbacks.get(subscriptionKey)
    if (!callbacks) {
      serviceLogger.warn('Received message for subscription with no callbacks', { subscriptionKey })
      return
    }

    serviceLogger.debug('Broadcasting real-time update', { 
      subscriptionKey,
      event: payload.eventType,
      id: payload.new?.id || payload.old?.id,
      callbackCount: callbacks.size
    })

    // Broadcast to all callbacks
    callbacks.forEach(callback => {
      try {
        callback(payload)
      } catch (error) {
        serviceLogger.error('Error in subscription callback', error, { subscriptionKey })
      }
    })

    // Update latency metrics
    const latency = performance.now() - startTime
    this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2
  }

  /**
   * Handle connection errors with exponential backoff
   */
  handleConnectionError(subscriptionKey, table, shopId, client) {
    this.connectionStatus = 'error'
    this.metrics.reconnectAttempts++
    
    serviceLogger.warn('Connection error, attempting reconnect', { 
      subscriptionKey, 
      delay: this.reconnectDelay 
    })

    setTimeout(() => {
      if (this.callbacks.has(subscriptionKey) && this.callbacks.get(subscriptionKey).size > 0) {
        // Destroy existing subscription before recreating
        this.destroySubscription(subscriptionKey)
        this.createSubscription(subscriptionKey, table, shopId, client)
        
        // Increase delay for next attempt
        this.reconnectDelay = Math.min(
          this.reconnectDelay * this.reconnectMultiplier,
          this.maxReconnectDelay
        )
      }
    }, this.reconnectDelay)
  }

  /**
   * Get current subscription metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeSubscriptionKeys: Array.from(this.subscriptions.keys()),
      connectionStatus: this.connectionStatus,
      subscriptionsWithCallbacks: this.callbacks.size
    }
  }

  /**
   * Get network status
   */
  isOnline() {
    return this.connectionStatus === 'connected'
  }

  /**
   * Clean up all subscriptions (for app shutdown)
   */
  cleanup() {
    serviceLogger.info('Cleaning up all subscriptions')
    
    for (const subscriptionKey of this.subscriptions.keys()) {
      this.destroySubscription(subscriptionKey)
    }
    
    this.callbacks.clear()
    this.subscriptions.clear()
    this.connectionStatus = 'disconnected'
    this.metrics.activeConnections = 0
  }
}

class SupabaseService {
  constructor() {
    this.client = null
    this.currentUser = null
    this.currentShopId = null
    this.isInitialized = false
    this.subscriptionManager = new SubscriptionManager()
  }

  /**
   * Get the Supabase client instance
   */
  get client() {
    if (!this._client) {
      this._client = getSupabaseClient()
    }
    return this._client
  }

  set client(value) {
    this._client = value
  }

  /**
   * Initialize the service
   * Call this once at app startup
   */
  async initialize() {
    try {
      this._client = getSupabaseClient()
      if (!this._client) {
        throw new Error('Failed to initialize Supabase client')
      }

      // Get current user and shop
      await this.refreshCurrentUser()
      this.isInitialized = true
      
      serviceLogger.info('Supabase service initialized')
    } catch (error) {
      serviceLogger.error('Failed to initialize Supabase service', error)
      throw error
    }
  }

  /**
   * Refresh current user and shop context
   */
  async refreshCurrentUser() {
    try {
      const user = await getCurrentUser()
      this.currentUser = user
      
      if (user) {
        // Get user's shop ID using the established pattern
        const shopId = await this.getUserShopId(user.id)
        this.currentShopId = shopId
        serviceLogger.debug('User context refreshed', { userId: user.id, shopId })
      } else {
        this.currentShopId = null
        serviceLogger.debug('User context cleared')
      }
    } catch (error) {
      serviceLogger.error('Failed to refresh user context', error)
      this.currentUser = null
      this.currentShopId = null
    }
  }

  /**
   * Get user's shop ID following the established pattern
   * Supports both individual barber and staff member subscriptions
   */
  async getUserShopId(userId) {
    try {
      // First get the profile
      const { data: profile, error: profileError } = await this.client
        .from('profiles')
        .select('shop_id, barbershop_id')
        .eq('id', userId)
        .single()

      if (profileError) {
        serviceLogger.warn('Profile not found', { userId, error: profileError.message })
        return null
      }

      // Individual barber subscription (has shop_id directly)
      if (profile.shop_id) {
        return profile.shop_id
      }

      // Check if they have barbershop_id (alternative field)
      if (profile.barbershop_id) {
        return profile.barbershop_id
      }

      // Staff member - lookup through barbershop_staff
      const { data: staffRecord, error: staffError } = await this.client
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (staffError) {
        serviceLogger.warn('Staff record not found', { userId, error: staffError.message })
        return null
      }

      return staffRecord.barbershop_id
    } catch (error) {
      serviceLogger.error('Failed to get user shop ID', error, { userId })
      return null
    }
  }

  // =============================================================================
  // APPOINTMENTS
  // =============================================================================

  async getAppointments(shopId, options = {}) {
    const targetShopId = shopId || this.currentShopId
    if (!targetShopId) {
      throw new Error('No shop ID available')
    }

    return executeQuery(async () => {
      const { startDate, endDate, barberId, status, limit } = options
      let query = this.client
        .from('appointments')
        .select('*')
        .eq('barbershop_id', targetShopId)

      if (startDate) {
        query = query.gte('appointment_date', startDate)
      }
      if (endDate) {
        query = query.lte('appointment_date', endDate)
      }
      if (barberId) {
        query = query.eq('barber_id', barberId)
      }
      if (status) {
        query = query.eq('status', status)
      }
      if (limit) {
        query = query.limit(limit)
      }

      query = query.order('appointment_date', { ascending: true })

      const { data, error } = await query
      if (error) throw error

      return data || []
    })
  }

  async createAppointment(appointmentData) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('appointments')
        .insert({
          ...appointmentData,
          barbershop_id: appointmentData.barbershop_id || this.currentShopId
        })
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  async updateAppointment(appointmentId, updates) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  async deleteAppointment(appointmentId) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('appointments')
        .delete()
        .eq('id', appointmentId)
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  // =============================================================================
  // CUSTOMERS
  // =============================================================================

  async getCustomers(shopId, options = {}) {
    const targetShopId = shopId || this.currentShopId
    if (!targetShopId) {
      throw new Error('No shop ID available')
    }

    return executeQuery(async () => {
      const { search, limit, offset } = options
      let query = this.client
        .from('customers')
        .select('*')
        .eq('barbershop_id', targetShopId)

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      if (limit) {
        query = query.limit(limit)
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 50) - 1)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      return data || []
    })
  }

  async createCustomer(customerData) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('customers')
        .insert({
          ...customerData,
          barbershop_id: customerData.barbershop_id || this.currentShopId
        })
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  async updateCustomer(customerId, updates) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('customers')
        .update(updates)
        .eq('id', customerId)
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  // =============================================================================
  // STAFF
  // =============================================================================

  async getStaff(shopId, options = {}) {
    const targetShopId = shopId || this.currentShopId
    if (!targetShopId) {
      throw new Error('No shop ID available')
    }

    return executeQuery(async () => {
      // Get staff records first
      const { data: staffRecords, error: staffError } = await this.client
        .from('barbershop_staff')
        .select('*')
        .eq('barbershop_id', targetShopId)
        .eq('is_active', true)

      if (staffError) throw staffError

      if (!staffRecords || staffRecords.length === 0) {
        return []
      }

      // Get profile information for each staff member
      const userIds = staffRecords.map(staff => staff.user_id)
      const { data: profiles, error: profileError } = await this.client
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url')
        .in('id', userIds)

      if (profileError) throw profileError

      // Merge staff records with profile data
      const staffWithProfiles = staffRecords.map(staff => {
        const profile = profiles?.find(p => p.id === staff.user_id) || {}
        return {
          ...staff,
          profile
        }
      })

      return staffWithProfiles
    })
  }

  async createStaffMember(staffData) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('barbershop_staff')
        .insert({
          ...staffData,
          barbershop_id: staffData.barbershop_id || this.currentShopId
        })
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  async updateStaffMember(staffId, updates) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('barbershop_staff')
        .update(updates)
        .eq('id', staffId)
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  // =============================================================================
  // SERVICES
  // =============================================================================

  async getServices(shopId, options = {}) {
    const targetShopId = shopId || this.currentShopId
    if (!targetShopId) {
      throw new Error('No shop ID available')
    }

    return executeQuery(async () => {
      const { category, isActive = true } = options
      let query = this.client
        .from('services')
        .select('*')
        .eq('shop_id', targetShopId)

      if (isActive !== null) {
        query = query.eq('is_active', isActive)
      }
      if (category) {
        query = query.eq('category', category)
      }

      query = query.order('display_order', { ascending: true })

      const { data, error } = await query
      if (error) throw error

      return data || []
    })
  }

  async createService(serviceData) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('services')
        .insert({
          ...serviceData,
          shop_id: serviceData.shop_id || this.currentShopId
        })
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  async updateService(serviceId, updates) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('services')
        .update(updates)
        .eq('id', serviceId)
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  async deleteService(serviceId) {
    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('services')
        .update({ is_active: false })
        .eq('id', serviceId)
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  // =============================================================================
  // BUSINESS HOURS
  // =============================================================================

  async getBusinessHours(shopId) {
    const targetShopId = shopId || this.currentShopId
    if (!targetShopId) {
      throw new Error('No shop ID available')
    }

    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('business_hours')
        .select('*')
        .eq('barbershop_id', targetShopId)
        .order('day_of_week', { ascending: true })

      if (error) throw error
      return data || []
    })
  }

  async updateBusinessHours(hoursData) {
    return executeQuery(async () => {
      const updates = hoursData.map(hours => ({
        ...hours,
        barbershop_id: hours.barbershop_id || this.currentShopId
      }))

      const { data, error } = await this.client
        .from('business_hours')
        .upsert(updates, { onConflict: 'barbershop_id,day_of_week' })
        .select()

      if (error) throw error
      return data || []
    })
  }

  // =============================================================================
  // BARBERSHOP DETAILS
  // =============================================================================

  async getBarbershop(shopId) {
    const targetShopId = shopId || this.currentShopId
    if (!targetShopId) {
      throw new Error('No shop ID available')
    }

    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('barbershops')
        .select('*')
        .eq('id', targetShopId)
        .single()

      if (error) throw error
      return data
    })
  }

  async updateBarbershop(updates) {
    if (!this.currentShopId) {
      throw new Error('No shop ID available')
    }

    return executeQuery(async () => {
      const { data, error } = await this.client
        .from('barbershops')
        .update(updates)
        .eq('id', this.currentShopId)
        .select()
        .single()

      if (error) throw error
      return data
    })
  }

  // =============================================================================
  // ANALYTICS & METRICS
  // =============================================================================

  async getDashboardMetrics(shopId, options = {}) {
    const targetShopId = shopId || this.currentShopId
    if (!targetShopId) {
      throw new Error('No shop ID available')
    }

    return executeQuery(async () => {
      const { startDate, endDate } = options
      
      // Get appointment counts and revenue
      let appointmentQuery = this.client
        .from('appointments')
        .select('status, total_price, appointment_date')
        .eq('barbershop_id', targetShopId)

      if (startDate) {
        appointmentQuery = appointmentQuery.gte('appointment_date', startDate)
      }
      if (endDate) {
        appointmentQuery = appointmentQuery.lte('appointment_date', endDate)
      }

      const { data: appointments, error: appointmentError } = await appointmentQuery
      if (appointmentError) throw appointmentError

      // Get customer count
      const { count: customerCount, error: customerError } = await this.client
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('barbershop_id', targetShopId)

      if (customerError) throw customerError

      // Process metrics
      const totalAppointments = appointments?.length || 0
      const completedAppointments = appointments?.filter(apt => apt.status === 'completed') || []
      const totalRevenue = completedAppointments.reduce((sum, apt) => sum + (apt.total_price || 0), 0)
      const cancelledAppointments = appointments?.filter(apt => apt.status === 'cancelled') || []

      return {
        totalAppointments,
        completedAppointments: completedAppointments.length,
        totalRevenue,
        cancelledAppointments: cancelledAppointments.length,
        customerCount: customerCount || 0,
        averageAppointmentValue: completedAppointments.length > 0 
          ? totalRevenue / completedAppointments.length 
          : 0
      }
    })
  }

  // =============================================================================
  // OPTIMIZED REAL-TIME SUBSCRIPTION SYSTEM
  // =============================================================================

  /**
   * Subscribe to real-time changes for a table with deduplication
   * Returns unsubscribe function
   */
  subscribeToChanges(table, filters = {}, callback) {
    if (!this.client || !this.currentShopId) {
      serviceLogger.warn('Cannot subscribe - client not initialized or no shop ID')
      return () => {}
    }

    return this.subscriptionManager.subscribe(table, this.currentShopId, callback, this.client)
  }

  /**
   * Get subscription manager for direct access
   */
  getSubscriptionManager() {
    return this.subscriptionManager
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  getCurrentShopId() {
    return this.currentShopId
  }

  getCurrentUser() {
    return this.currentUser
  }

  isReady() {
    return this.isInitialized && this.client !== null
  }
}

// Create singleton instance
const supabaseService = new SupabaseService()

export default supabaseService

// Named exports for convenience
export {
  supabaseService as SupabaseService
}
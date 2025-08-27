'use client'

/**
 * SupabaseOnboardingManager
 * 
 * Handles real-time onboarding state management with cross-tab synchronization
 * using Supabase database and real-time subscriptions
 */

import { createClient } from '@/lib/supabase/client'

export class SupabaseOnboardingManager {
  constructor() {
    this.supabase = createClient()
    this.cache = new Map() // In-memory cache for performance
    this.subscriptions = new Map() // Track active subscriptions
    this.saveQueue = [] // Queue for offline changes
    this.isOnline = true
    
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.processSaveQueue()
      })
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  /**
   * Save step data with optimistic updates and real-time sync
   */
  async saveStepData(sessionType, stepId, data, barberId = null) {
    const sessionKey = `${sessionType}_${barberId || 'current'}`
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Optimistic update to cache
      this.updateCache(sessionKey, stepId, data)
      
      // Prepare session data
      const sessionData = {
        user_id: user.id,
        barber_id: barberId,
        session_type: sessionType,
        current_step: stepId,
        step_data: data,
        updated_at: new Date().toISOString()
      }

      if (this.isOnline) {
        // Immediate database sync using upsert
        const { data: session, error } = await this.supabase
          .from('onboarding_sessions')
          .upsert(sessionData, {
            onConflict: 'user_id,session_type,barber_id',
            returning: 'minimal'
          })

        if (error) {
          console.error('Failed to save onboarding data:', error)
          // Revert optimistic update and queue for retry
          this.revertCache(sessionKey, stepId)
          this.queueSave(sessionData)
          return { success: false, error: error.message }
        }

        return { success: true, data: session }
      } else {
        // Queue for later when back online
        this.queueSave(sessionData)
        return { success: true, queued: true }
      }

    } catch (error) {
      console.error('Error saving step data:', error)
      this.revertCache(sessionKey, stepId)
      return { success: false, error: error.message }
    }
  }

  /**
   * Mark a step as completed
   */
  async markStepComplete(sessionType, stepId, barberId = null) {
    try {
      const { data: { user }, error: userError } = await this.supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Get current session
      const session = await this.getSession(sessionType, barberId)
      const completedSteps = session?.completed_steps || []
      
      if (!completedSteps.includes(stepId)) {
        completedSteps.push(stepId)
        
        const { error } = await this.supabase
          .from('onboarding_sessions')
          .upsert({
            user_id: user.id,
            barber_id: barberId,
            session_type: sessionType,
            completed_steps: completedSteps,
            progress_percentage: this.calculateProgress(sessionType, completedSteps),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,session_type,barber_id'
          })

        if (error) {
          throw error
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error marking step complete:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get current session data
   */
  async getSession(sessionType, barberId = null) {
    const sessionKey = `${sessionType}_${barberId || 'current'}`
    
    // Check cache first
    if (this.cache.has(sessionKey)) {
      return this.cache.get(sessionKey)
    }

    try {
      const { data: { user }, error: userError } = await this.supabase.auth.getUser()
      if (userError || !user) {
        return null
      }

      // Build query
      let query = this.supabase
        .from('onboarding_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_type', sessionType)

      if (barberId) {
        query = query.eq('barber_id', barberId)
      } else {
        query = query.is('barber_id', null)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching session:', error)
        return null
      }

      // Cache the result
      if (data) {
        this.cache.set(sessionKey, data)
      }

      return data
    } catch (error) {
      console.error('Error getting session:', error)
      return null
    }
  }

  /**
   * Restore session data on component mount
   */
  async restoreSession(sessionType, barberId = null) {
    const session = await this.getSession(sessionType, barberId)
    
    if (session && session.step_data) {
      return {
        stepData: session.step_data,
        currentStep: session.current_step,
        completedSteps: session.completed_steps || [],
        progressPercentage: session.progress_percentage || 0,
        lastUpdated: session.updated_at
      }
    }

    return null
  }

  /**
   * Subscribe to real-time changes for cross-tab synchronization
   */
  subscribeToSession(sessionType, barberId, callback) {
    const channelName = `onboarding-${sessionType}-${barberId || 'current'}`
    
    // Unsubscribe existing if any
    if (this.subscriptions.has(channelName)) {
      this.subscriptions.get(channelName).unsubscribe()
    }

    const subscription = this.supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'onboarding_sessions',
        filter: `session_type=eq.${sessionType}${barberId ? `,barber_id=eq.${barberId}` : ''}`
      }, (payload) => {

        // Update cache
        const sessionKey = `${sessionType}_${barberId || 'current'}`
        if (payload.new) {
          this.cache.set(sessionKey, payload.new)
        }
        
        // Notify callback
        callback({
          type: payload.eventType,
          data: payload.new || payload.old,
          session_type: sessionType,
          barber_id: barberId
        })
      })
      .subscribe()

    this.subscriptions.set(channelName, subscription)
    return subscription
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromSession(sessionType, barberId = null) {
    const channelName = `onboarding-${sessionType}-${barberId || 'current'}`
    const subscription = this.subscriptions.get(channelName)
    
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(channelName)
    }
  }

  /**
   * Clear session data
   */
  async clearSession(sessionType, barberId = null) {
    try {
      const { data: { user }, error: userError } = await this.supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      let query = this.supabase
        .from('onboarding_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('session_type', sessionType)

      if (barberId) {
        query = query.eq('barber_id', barberId)
      } else {
        query = query.is('barber_id', null)
      }

      const { error } = await query

      if (error) {
        throw error
      }

      // Clear from cache
      const sessionKey = `${sessionType}_${barberId || 'current'}`
      this.cache.delete(sessionKey)

      return { success: true }
    } catch (error) {
      console.error('Error clearing session:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanExpiredSessions() {
    try {
      const { error } = await this.supabase
        .from('onboarding_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())

      return { success: !error, error }
    } catch (error) {
      console.error('Error cleaning expired sessions:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Unsubscribe from all active subscriptions (cleanup)
   */
  cleanup() {
    for (const [channelName, subscription] of this.subscriptions.entries()) {
      subscription.unsubscribe()
    }
    this.subscriptions.clear()
    this.cache.clear()
  }

  // Private helper methods

  updateCache(sessionKey, stepId, data) {
    const cached = this.cache.get(sessionKey) || {}
    cached.step_data = { ...cached.step_data, ...data }
    cached.current_step = stepId
    cached.updated_at = new Date().toISOString()
    this.cache.set(sessionKey, cached)
  }

  revertCache(sessionKey, stepId) {
    // Remove optimistic update - could be enhanced with proper versioning
    this.cache.delete(sessionKey)
  }

  queueSave(sessionData) {
    this.saveQueue.push({
      ...sessionData,
      timestamp: Date.now()
    })
    
    // Limit queue size to prevent memory issues
    if (this.saveQueue.length > 50) {
      this.saveQueue = this.saveQueue.slice(-25) // Keep most recent 25
    }
  }

  async processSaveQueue() {
    if (this.saveQueue.length === 0) return

    const queue = [...this.saveQueue]
    this.saveQueue = []

    for (const sessionData of queue) {
      try {
        const { error } = await this.supabase
          .from('onboarding_sessions')
          .upsert(sessionData, {
            onConflict: 'user_id,session_type,barber_id'
          })

        if (error) {
          console.error('Failed to process queued save:', error)
          // Re-queue on failure
          this.saveQueue.push(sessionData)
        }
      } catch (err) {
        console.error('Error processing queued save:', err)
        this.saveQueue.push(sessionData)
      }
    }
  }

  calculateProgress(sessionType, completedSteps) {
    // Define expected steps for each session type
    const stepCounts = {
      'staff_setup': 5,        // Basic staff info, role, schedule, etc.
      'booking_rules': 4,      // Policy selection, customization, etc.
      'financial_setup': 3,    // Payment setup, Stripe Connect, etc.
      'business_setup': 6      // Business info, hours, services, etc.
    }

    const totalSteps = stepCounts[sessionType] || 5
    const completed = completedSteps?.length || 0
    
    return Math.min(100, Math.round((completed / totalSteps) * 100))
  }
}

export default SupabaseOnboardingManager
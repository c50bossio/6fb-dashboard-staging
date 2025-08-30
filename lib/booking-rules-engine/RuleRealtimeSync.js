/**
 * Realtime Synchronization for Booking Rules
 * 
 * Provides event-driven updates using Supabase Realtime channels
 * to ensure all connected clients have the latest rules immediately
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { cacheManager } from './RuleCache'
import { RuleEngine } from './RuleEngine'

class RuleRealtimeSync {
  constructor() {
    this.supabase = null
    this.channels = new Map()
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
  }

  /**
   * Initialize the realtime sync service
   */
  async initialize() {
    try {
      this.supabase = createClient()
      
    } catch (error) {
      console.error('Failed to initialize RuleRealtimeSync:', error)
      throw error
    }
  }

  /**
   * Subscribe to rule changes for a specific barbershop
   */
  subscribe(barberbarbershopId, callbacks = {}) {
    if (!barberbarbershopId) {
      console.warn('Cannot subscribe without barberbarbershopId')
      return null
    }

    // Check if already subscribed
    if (this.channels.has(barberbarbershopId)) {
      
      return this.channels.get(barberbarbershopId)
    }

    const channelName = `booking-rules:${barberbarbershopId}`
    
    // Create channel with proper configuration
    const channel = this.supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: barberbarbershopId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_rules_v2',
          filter: `barberbarberbarbershop_id=eq.${barberbarbershopId}`
        },
        async (payload) => {
          await this.handleRuleChange(barberbarbershopId, payload, callbacks)
        }
      )
      .on(
        'broadcast',
        { event: 'rule_update' },
        async (payload) => {
          await this.handleBroadcast(barberbarbershopId, payload, callbacks)
        }
      )
      .on(
        'presence',
        { event: 'sync' },
        () => {
          const state = channel.presenceState()
          if (callbacks.onPresenceSync) {
            callbacks.onPresenceSync(state)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          
          this.reconnectAttempts = 0
          
          // Track presence
          channel.track({
            user_id: this.getCurrentUserId(),
            online_at: new Date().toISOString()
          })
          
          if (callbacks.onSubscribed) {
            callbacks.onSubscribed()
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Channel error for barbershop ${barberbarbershopId}`)
          this.handleChannelError(barberbarbershopId, callbacks)
        } else if (status === 'TIMED_OUT') {
          console.warn(`Channel timed out for barbershop ${barberbarbershopId}`)
          this.handleChannelTimeout(barberbarbershopId, callbacks)
        } else if (status === 'CLOSED') {
          
          this.channels.delete(barberbarbershopId)
          
          if (callbacks.onClosed) {
            callbacks.onClosed()
          }
        }
      })

    // Store channel reference
    this.channels.set(barberbarbershopId, channel)
    
    // Store callbacks for this barbershop
    if (callbacks) {
      this.listeners.set(barberbarbershopId, callbacks)
    }

    return channel
  }

  /**
   * Handle database changes
   */
  async handleRuleChange(barberbarbershopId, payload, callbacks) {

    const { eventType, new: newRecord, old: oldRecord } = payload
    
    try {
      // Invalidate cache immediately
      const cache = cacheManager.getCache(barberbarbershopId)
      await cache.invalidate()
      
      // Handle different event types
      switch (eventType) {
        case 'INSERT':
        case 'UPDATE':
          if (newRecord && newRecord.is_active) {
            // Update local rule engine
            const engine = RuleEngine.getInstance(barberbarbershopId)
            await engine.loadRules(true) // Force reload
            
            // Notify listeners
            if (callbacks.onRuleUpdate) {
              callbacks.onRuleUpdate({
                type: eventType.toLowerCase(),
                rules: newRecord.rules,
                version: newRecord.version,
                timestamp: new Date().toISOString()
              })
            }
            
            // Broadcast to other tabs/windows
            this.broadcastUpdate(barberbarbershopId, {
              type: 'rule_update',
              rules: newRecord.rules,
              version: newRecord.version
            })
          }
          break
          
        case 'DELETE':
          // Rules were deleted - use defaults
          if (callbacks.onRuleDelete) {
            callbacks.onRuleDelete({
              timestamp: new Date().toISOString()
            })
          }
          break
      }
      
      // Log change for analytics
      this.logRuleChangeEvent(barberbarbershopId, eventType, newRecord, oldRecord)
      
    } catch (error) {
      console.error('Error handling rule change:', error)
      
      if (callbacks.onError) {
        callbacks.onError(error)
      }
    }
  }

  /**
   * Handle broadcast messages
   */
  async handleBroadcast(barberbarbershopId, payload, callbacks) {

    try {
      const { type, data } = payload.payload
      
      if (type === 'rule_update') {
        // Another client updated rules - sync locally
        const cache = cacheManager.getCache(barberbarbershopId)
        await cache.invalidate()
        
        const engine = RuleEngine.getInstance(barberbarbershopId)
        await engine.loadRules(true)
        
        if (callbacks.onRemoteUpdate) {
          callbacks.onRemoteUpdate(data)
        }
      } else if (type === 'evaluation_metrics') {
        // Real-time metrics update
        if (callbacks.onMetricsUpdate) {
          callbacks.onMetricsUpdate(data)
        }
      }
    } catch (error) {
      console.error('Error handling broadcast:', error)
    }
  }

  /**
   * Broadcast an update to other clients
   */
  async broadcastUpdate(barberbarbershopId, data) {
    const channel = this.channels.get(barberbarbershopId)
    
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'rule_update',
        payload: data
      })
    }
  }

  /**
   * Handle channel errors with reconnection logic
   */
  async handleChannelError(barberbarbershopId, callbacks) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      
      `)
      
      setTimeout(() => {
        this.unsubscribe(barberbarbershopId)
        this.subscribe(barberbarbershopId, callbacks)
      }, delay)
    } else {
      console.error(`Max reconnection attempts reached for barbershop ${barberbarbershopId}`)
      
      if (callbacks.onMaxReconnectFailed) {
        callbacks.onMaxReconnectFailed()
      }
    }
  }

  /**
   * Handle channel timeout
   */
  handleChannelTimeout(barberbarbershopId, callbacks) {
    console.warn(`Channel timeout for barbershop ${barberbarbershopId}, attempting reconnect`)
    
    // Attempt immediate reconnection
    this.unsubscribe(barberbarbershopId)
    this.subscribe(barberbarbershopId, callbacks)
  }

  /**
   * Unsubscribe from rule changes
   */
  unsubscribe(barberbarbershopId) {
    const channel = this.channels.get(barberbarbershopId)
    
    if (channel) {
      channel.untrack()
      channel.unsubscribe()
      this.channels.delete(barberbarbershopId)
      this.listeners.delete(barberbarbershopId)
      
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    for (const barberbarbershopId of this.channels.keys()) {
      this.unsubscribe(barberbarbershopId)
    }
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions() {
    return Array.from(this.channels.keys())
  }

  /**
   * Check if subscribed to a barbershop
   */
  isSubscribed(barberbarbershopId) {
    return this.channels.has(barberbarbershopId)
  }

  /**
   * Get presence state for a channel
   */
  getPresenceState(barberbarbershopId) {
    const channel = this.channels.get(barberbarbershopId)
    
    if (channel) {
      return channel.presenceState()
    }
    
    return {}
  }

  /**
   * Log rule change event for analytics
   */
  async logRuleChangeEvent(barberbarbershopId, eventType, newRecord, oldRecord) {
    try {
      // Log to analytics service
      const analyticsData = {
        barberbarbershop_id: barberbarbershopId,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        version: newRecord?.version,
        changed_fields: this.detectChangedFields(oldRecord?.rules, newRecord?.rules)
      }
      
      // Send to analytics endpoint
      await fetch('/api/booking-rules/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyticsData)
      })
    } catch (error) {
      console.error('Failed to log rule change event:', error)
    }
  }

  /**
   * Detect which fields changed between two rule sets
   */
  detectChangedFields(oldRules, newRules) {
    if (!oldRules || !newRules) return []
    
    const changes = []
    
    const detectChanges = (oldObj, newObj, path = '') => {
      for (const key in newObj) {
        const fullPath = path ? `${path}.${key}` : key
        
        if (typeof newObj[key] === 'object' && newObj[key] !== null && !Array.isArray(newObj[key])) {
          detectChanges(oldObj?.[key] || {}, newObj[key], fullPath)
        } else if (JSON.stringify(oldObj?.[key]) !== JSON.stringify(newObj[key])) {
          changes.push({
            field: fullPath,
            old_value: oldObj?.[key],
            new_value: newObj[key]
          })
        }
      }
    }
    
    detectChanges(oldRules, newRules)
    return changes
  }

  /**
   * Get current user ID for presence tracking
   */
  getCurrentUserId() {
    // This would be replaced with actual user ID from auth context
    return typeof window !== 'undefined' 
      ? window.localStorage.getItem('user_id') || 'anonymous'
      : 'server'
  }

  /**
   * Send real-time metrics update
   */
  async sendMetricsUpdate(barberbarbershopId, metrics) {
    const channel = this.channels.get(barberbarbershopId)
    
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'evaluation_metrics',
        payload: {
          type: 'evaluation_metrics',
          data: metrics
        }
      })
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.unsubscribeAll()
    this.channels.clear()
    this.listeners.clear()
  }
}

// Create singleton instance
let instance = null

export function getRuleRealtimeSync() {
  if (!instance) {
    instance = new RuleRealtimeSync()
    instance.initialize()
  }
  return instance
}

export default RuleRealtimeSync
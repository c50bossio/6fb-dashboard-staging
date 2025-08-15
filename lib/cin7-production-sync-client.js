/**
 * Cin7 Production Sync Client
 * Frontend utility library for interacting with the production sync engine
 */

class Cin7ProductionSyncClient {
  constructor(baseUrl = '/api/cin7') {
    this.baseUrl = baseUrl
    this.activeOperations = new Map()
    this.eventListeners = new Map()
  }

  /**
   * Start a production sync operation
   */
  async startSync(barbershopId, userId, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/production-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId,
          userId,
          syncMode: options.syncMode || 'manual',
          options: {
            generateAlerts: options.generateAlerts !== false,
            allowRollback: options.allowRollback !== false,
            forceFieldDiscovery: options.forceFieldDiscovery || false,
            ...options
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Sync failed to start')
      }

      if (result.success && result.results?.operationId) {
        this.startMonitoring(result.results.operationId)
      }

      return result

    } catch (error) {
      console.error('Failed to start sync:', error)
      throw error
    }
  }

  /**
   * Get sync operation status
   */
  async getSyncStatus(operationId) {
    try {
      const response = await fetch(`${this.baseUrl}/production-sync?operationId=${operationId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync status')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to get sync status:', error)
      throw error
    }
  }

  /**
   * Get recent sync operations for a barbershop
   */
  async getRecentSyncs(barbershopId, limit = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/production-sync?barbershopId=${barbershopId}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent syncs')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to get recent syncs:', error)
      throw error
    }
  }

  /**
   * Cancel a running sync operation
   */
  async cancelSync(operationId) {
    try {
      const response = await fetch(`${this.baseUrl}/production-sync?operationId=${operationId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to cancel sync')
      }

      this.stopMonitoring(operationId)

      return await response.json()

    } catch (error) {
      console.error('Failed to cancel sync:', error)
      throw error
    }
  }

  /**
   * Start monitoring a sync operation with real-time updates
   */
  startMonitoring(operationId, interval = 2000) {
    if (this.activeOperations.has(operationId)) {
      console.warn(`Already monitoring operation ${operationId}`)
      return
    }

    console.log(`🔄 Starting monitoring for operation ${operationId}`)

    const monitor = setInterval(async () => {
      try {
        const status = await this.getSyncStatus(operationId)
        
        this.emit('progress', {
          operationId,
          status: status.status,
          progress: this.calculateProgress(status),
          details: status
        })

        if (this.isOperationComplete(status.status)) {
          this.stopMonitoring(operationId)
          
          this.emit('complete', {
            operationId,
            status: status.status,
            finalResult: status
          })
        }

      } catch (error) {
        console.error(`Monitoring error for operation ${operationId}:`, error)
        this.emit('error', {
          operationId,
          error: error.message
        })
      }
    }, interval)

    this.activeOperations.set(operationId, monitor)
  }

  /**
   * Stop monitoring a sync operation
   */
  stopMonitoring(operationId) {
    const monitor = this.activeOperations.get(operationId)
    if (monitor) {
      clearInterval(monitor)
      this.activeOperations.delete(operationId)
      console.log(`⏹️ Stopped monitoring operation ${operationId}`)
    }
  }

  /**
   * Stop monitoring all operations
   */
  stopAllMonitoring() {
    for (const [operationId, monitor] of this.activeOperations) {
      clearInterval(monitor)
    }
    this.activeOperations.clear()
    console.log('⏹️ Stopped monitoring all operations')
  }

  /**
   * Calculate progress percentage from operation status
   */
  calculateProgress(status) {
    if (!status || !status.total_items) {
      return 0
    }

    if (status.status === 'completed') {
      return 100
    }

    if (status.status === 'failed' || status.status === 'cancelled') {
      return -1 // Indicate failure
    }

    const processed = status.processed_items || 0
    const total = status.total_items || 1
    
    return Math.round((processed / total) * 100)
  }

  /**
   * Check if operation status indicates completion
   */
  isOperationComplete(status) {
    return ['completed', 'failed', 'cancelled'].includes(status)
  }

  /**
   * Add event listener for sync events
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event).push(callback)
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) {
      return
    }
    
    const callbacks = this.eventListeners.get(event)
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (!this.eventListeners.has(event)) {
      return
    }

    const callbacks = this.eventListeners.get(event)
    callbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Event listener error for ${event}:`, error)
      }
    })
  }

  /**
   * Get sync metrics and performance data
   */
  async getSyncMetrics(barbershopId, days = 7) {
    try {
      const response = await fetch(`${this.baseUrl}/sync-metrics?barbershopId=${barbershopId}&days=${days}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync metrics')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to get sync metrics:', error)
      throw error
    }
  }

  /**
   * Get sync alerts for a barbershop
   */
  async getSyncAlerts(barbershopId, includeResolved = false) {
    try {
      const params = new URLSearchParams({
        barbershopId,
        includeResolved: includeResolved.toString()
      })
      
      const response = await fetch(`${this.baseUrl}/sync-alerts?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync alerts')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to get sync alerts:', error)
      throw error
    }
  }

  /**
   * Resolve a sync alert
   */
  async resolveAlert(alertId, notes = '') {
    try {
      const response = await fetch(`${this.baseUrl}/sync-alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      })
      
      if (!response.ok) {
        throw new Error('Failed to resolve alert')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to resolve alert:', error)
      throw error
    }
  }

  /**
   * Get field mapping information for a barbershop
   */
  async getFieldMapping(barbershopId) {
    try {
      const response = await fetch(`${this.baseUrl}/field-mapping?barbershopId=${barbershopId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch field mapping')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to get field mapping:', error)
      throw error
    }
  }

  /**
   * Update field mapping configuration
   */
  async updateFieldMapping(barbershopId, mappingConfig) {
    try {
      const response = await fetch(`${this.baseUrl}/field-mapping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId,
          mappingConfig
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update field mapping')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to update field mapping:', error)
      throw error
    }
  }

  /**
   * Validate field mapping before sync
   */
  async validateFieldMapping(barbershopId, mappingConfig) {
    try {
      const response = await fetch(`${this.baseUrl}/field-mapping/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId,
          mappingConfig
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to validate field mapping')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to validate field mapping:', error)
      throw error
    }
  }

  /**
   * Get sync recommendations based on history and performance
   */
  async getSyncRecommendations(barbershopId) {
    try {
      const response = await fetch(`${this.baseUrl}/sync-recommendations?barbershopId=${barbershopId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync recommendations')
      }

      return await response.json()

    } catch (error) {
      console.error('Failed to get sync recommendations:', error)
      throw error
    }
  }
}

/**
 * Utility functions for sync status formatting and display
 */
export const SyncUtils = {
  /**
   * Format sync status for display
   */
  formatStatus(status) {
    const statusMap = {
      'pending': 'Pending',
      'initializing': 'Initializing',
      'discovering_fields': 'Discovering Fields',
      'validating_mapping': 'Validating Mapping',
      'processing_batch': 'Processing',
      'rolling_back': 'Rolling Back',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled'
    }
    
    return statusMap[status] || status
  },

  /**
   * Get status color for UI
   */
  getStatusColor(status) {
    const colorMap = {
      'pending': 'gray',
      'initializing': 'blue',
      'discovering_fields': 'blue',
      'validating_mapping': 'blue',
      'processing_batch': 'blue',
      'rolling_back': 'orange',
      'completed': 'green',
      'failed': 'red',
      'cancelled': 'gray'
    }
    
    return colorMap[status] || 'gray'
  },

  /**
   * Format duration for display
   */
  formatDuration(durationMs) {
    if (!durationMs) return 'N/A'
    
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  },

  /**
   * Format success rate for display
   */
  formatSuccessRate(rate) {
    if (rate === null || rate === undefined) return 'N/A'
    return `${parseFloat(rate).toFixed(1)}%`
  },

  /**
   * Get sync health status based on recent performance
   */
  getSyncHealth(metrics) {
    if (!metrics || !metrics.total_operations) {
      return { status: 'unknown', message: 'No recent sync data available' }
    }

    const successRate = (metrics.successful_operations / metrics.total_operations) * 100
    const avgSuccessRate = metrics.avg_success_rate || 0

    if (successRate >= 95 && avgSuccessRate >= 90) {
      return { status: 'excellent', message: 'Sync performance is excellent' }
    } else if (successRate >= 80 && avgSuccessRate >= 80) {
      return { status: 'good', message: 'Sync performance is good' }
    } else if (successRate >= 60 && avgSuccessRate >= 70) {
      return { status: 'fair', message: 'Sync performance needs attention' }
    } else {
      return { status: 'poor', message: 'Sync performance requires immediate attention' }
    }
  },

  /**
   * Generate sync report summary
   */
  generateSyncReport(operation) {
    if (!operation) return null

    const duration = operation.duration_ms ? this.formatDuration(operation.duration_ms) : 'N/A'
    const successRate = this.formatSuccessRate(operation.success_rate)
    
    return {
      operationId: operation.id,
      status: this.formatStatus(operation.status),
      statusColor: this.getStatusColor(operation.status),
      duration,
      successRate,
      itemsProcessed: operation.processed_items || 0,
      itemsSuccessful: operation.successful_items || 0,
      itemsFailed: operation.failed_items || 0,
      startedAt: operation.started_at,
      completedAt: operation.completed_at,
      syncMode: operation.sync_mode,
      hasErrors: operation.failed_items > 0 || operation.status === 'failed'
    }
  }
}

export default Cin7ProductionSyncClient

export const cin7SyncClient = new Cin7ProductionSyncClient()
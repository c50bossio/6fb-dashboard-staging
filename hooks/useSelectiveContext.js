'use client'

import { useContext, useEffect, useRef, useState } from 'react'

/**
 * Selective Context Subscription Hook
 * 
 * Allows components to subscribe to specific parts of a context,
 * reducing unnecessary re-renders when unrelated context data changes.
 * 
 * Usage:
 * const selectedData = useSelectiveContext(MyContext, context => ({
 *   loading: context.loading,
 *   specificData: context.data.specific
 * }))
 */

export function useSelectiveContext(Context, selector, dependencies = []) {
  const fullContext = useContext(Context)
  const [selectedData, setSelectedData] = useState(() => selector(fullContext))
  const lastSelectionRef = useRef(selectedData)
  const selectorRef = useRef(selector)
  
  // Update selector ref when dependencies change
  useEffect(() => {
    selectorRef.current = selector
  }, dependencies)
  
  // Compare and update selected data only when relevant parts change
  useEffect(() => {
    const newSelection = selectorRef.current(fullContext)
    
    // Deep comparison to avoid unnecessary updates
    if (!deepEqual(lastSelectionRef.current, newSelection)) {
      lastSelectionRef.current = newSelection
      setSelectedData(newSelection)
    }
  }, [fullContext])
  
  if (!fullContext) {
    throw new Error('useSelectiveContext must be used within the appropriate Context Provider')
  }
  
  return selectedData
}

/**
 * Multiple Selective Context Hook
 * 
 * Subscribe to multiple contexts with individual selectors
 */
export function useMultipleSelectiveContexts(contextSelectors) {
  const results = {}
  
  for (const [key, { context, selector, dependencies = [] }] of Object.entries(contextSelectors)) {
    results[key] = useSelectiveContext(context, selector, dependencies)
  }
  
  return results
}

/**
 * Batched Context Updates Hook
 * 
 * Batches multiple context updates to reduce re-renders
 */
export function useBatchedContextUpdates(updateFunctions, batchDelay = 16) {
  const batchRef = useRef(new Set())
  const timeoutRef = useRef(null)
  
  const scheduleUpdate = (updateKey, updateFn) => {
    batchRef.current.add({ key: updateKey, fn: updateFn })
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      const updates = Array.from(batchRef.current)
      batchRef.current.clear()
      
      // Group updates by context and execute
      const contextGroups = {}
      updates.forEach(({ key, fn }) => {
        if (!contextGroups[key]) contextGroups[key] = []
        contextGroups[key].push(fn)
      })
      
      Object.values(contextGroups).forEach(updateGroup => {
        updateGroup.forEach(updateFn => updateFn())
      })
    }, batchDelay)
  }
  
  return scheduleUpdate
}

/**
 * Context Performance Monitor
 * 
 * Monitors context re-renders and provides performance insights
 */
export function useContextPerformanceMonitor(contextName, enabled = process.env.NODE_ENV === 'development') {
  const renderCountRef = useRef(0)
  const lastRenderRef = useRef(Date.now())
  const performanceStatsRef = useRef({
    totalRenders: 0,
    averageInterval: 0,
    maxInterval: 0,
    minInterval: Infinity
  })
  
  useEffect(() => {
    if (!enabled) return
    
    const now = Date.now()
    const interval = now - lastRenderRef.current
    
    renderCountRef.current++
    const stats = performanceStatsRef.current
    
    stats.totalRenders = renderCountRef.current
    stats.averageInterval = stats.totalRenders > 1 
      ? (stats.averageInterval * (stats.totalRenders - 2) + interval) / (stats.totalRenders - 1)
      : 0
    stats.maxInterval = Math.max(stats.maxInterval, interval)
    stats.minInterval = Math.min(stats.minInterval, interval)
    
    lastRenderRef.current = now
    
    // Log performance warnings
    if (interval < 16 && renderCountRef.current > 5) {
      console.warn(`⚠️ High frequency re-renders detected in ${contextName}: ${renderCountRef.current} renders, avg ${stats.averageInterval.toFixed(1)}ms interval`)
    }
    
    if (interval > 1000) {
      console.warn(`⚠️ Long render interval in ${contextName}: ${interval}ms`)
    }
  })
  
  return enabled ? {
    renderCount: renderCountRef.current,
    stats: performanceStatsRef.current,
    reset: () => {
      renderCountRef.current = 0
      performanceStatsRef.current = {
        totalRenders: 0,
        averageInterval: 0,
        maxInterval: 0,
        minInterval: Infinity
      }
    }
  } : null
}

/**
 * Optimized Context Consumer HOC
 * 
 * Higher-order component that automatically applies selective subscriptions
 */
export function withSelectiveContext(Component, contextSelectors) {
  return function SelectiveContextComponent(props) {
    const selectedContexts = useMultipleSelectiveContexts(contextSelectors)
    
    return <Component {...props} {...selectedContexts} />
  }
}

/**
 * Context Subscription Manager
 * 
 * Advanced subscription system for fine-grained context updates
 */
class ContextSubscriptionManager {
  constructor() {
    this.subscriptions = new Map()
    this.lastValues = new Map()
    this.batchQueue = new Set()
    this.isProcessing = false
  }
  
  subscribe(contextId, selector, callback, dependencies = []) {
    const subscriptionId = `${contextId}_${Date.now()}_${Math.random()}`
    
    this.subscriptions.set(subscriptionId, {
      contextId,
      selector,
      callback,
      dependencies: [...dependencies],
      active: true
    })
    
    return () => {
      this.unsubscribe(subscriptionId)
    }
  }
  
  unsubscribe(subscriptionId) {
    this.subscriptions.delete(subscriptionId)
    this.lastValues.delete(subscriptionId)
  }
  
  notify(contextId, newContextValue) {
    const relevantSubscriptions = Array.from(this.subscriptions.entries())
      .filter(([, sub]) => sub.contextId === contextId && sub.active)
    
    for (const [subId, subscription] of relevantSubscriptions) {
      this.batchQueue.add({ subId, subscription, newContextValue })
    }
    
    this.processBatch()
  }
  
  async processBatch() {
    if (this.isProcessing || this.batchQueue.size === 0) return
    
    this.isProcessing = true
    
    // Use requestAnimationFrame for optimal batching
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    const updates = Array.from(this.batchQueue)
    this.batchQueue.clear()
    
    for (const { subId, subscription, newContextValue } of updates) {
      try {
        const newSelection = subscription.selector(newContextValue)
        const lastValue = this.lastValues.get(subId)
        
        if (!deepEqual(lastValue, newSelection)) {
          this.lastValues.set(subId, newSelection)
          subscription.callback(newSelection, lastValue)
        }
      } catch (error) {
        console.error('Context subscription error:', error)
      }
    }
    
    this.isProcessing = false
    
    // Process any queued updates
    if (this.batchQueue.size > 0) {
      this.processBatch()
    }
  }
  
  clear() {
    this.subscriptions.clear()
    this.lastValues.clear()
    this.batchQueue.clear()
  }
}

// Global subscription manager instance
const subscriptionManager = new ContextSubscriptionManager()

/**
 * Advanced Selective Context Hook with subscription management
 */
export function useAdvancedSelectiveContext(Context, selector, options = {}) {
  const { 
    dependencies = [], 
    batchUpdates = true,
    enablePerformanceMonitoring = false 
  } = options
  
  const fullContext = useContext(Context)
  const [selectedData, setSelectedData] = useState(() => selector(fullContext))
  const contextIdRef = useRef(`ctx_${Context.displayName || 'Unknown'}_${Date.now()}`)
  
  // Performance monitoring
  const perfMonitor = useContextPerformanceMonitor(
    Context.displayName || 'Unknown',
    enablePerformanceMonitoring
  )
  
  useEffect(() => {
    const unsubscribe = subscriptionManager.subscribe(
      contextIdRef.current,
      selector,
      (newSelection) => {
        setSelectedData(newSelection)
      },
      dependencies
    )
    
    return unsubscribe
  }, dependencies)
  
  // Notify subscription manager of context changes
  useEffect(() => {
    if (batchUpdates) {
      subscriptionManager.notify(contextIdRef.current, fullContext)
    } else {
      const newSelection = selector(fullContext)
      if (!deepEqual(selectedData, newSelection)) {
        setSelectedData(newSelection)
      }
    }
  }, [fullContext, selector, batchUpdates])
  
  if (!fullContext) {
    throw new Error('useAdvancedSelectiveContext must be used within the appropriate Context Provider')
  }
  
  return {
    data: selectedData,
    performanceStats: perfMonitor
  }
}

// Utility functions

function deepEqual(a, b) {
  if (a === b) return true
  
  if (a == null || b == null) return a === b
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    
    return keysA.every(key => 
      keysB.includes(key) && deepEqual(a[key], b[key])
    )
  }
  
  return false
}

/**
 * Context debugging utilities
 */
export const contextDebugUtils = {
  logContextChanges: (contextName, oldValue, newValue) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔄 Context Change: ${contextName}`)

      )
      console.groupEnd()
    }
  },
  
  measureContextSize: (contextValue) => {
    try {
      const jsonString = JSON.stringify(contextValue)
      return {
        bytes: jsonString.length,
        kb: Math.round(jsonString.length / 1024),
        complexity: calculateObjectComplexity(contextValue)
      }
    } catch {
      return { bytes: 0, kb: 0, complexity: 0 }
    }
  }
}

function findChangedKeys(oldObj, newObj, path = '') {
  const changes = []
  
  if (typeof oldObj !== 'object' || typeof newObj !== 'object') {
    return oldObj !== newObj ? [path || 'root'] : []
  }
  
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key
    const oldVal = oldObj?.[key]
    const newVal = newObj?.[key]
    
    if (!deepEqual(oldVal, newVal)) {
      if (typeof oldVal === 'object' && typeof newVal === 'object') {
        changes.push(...findChangedKeys(oldVal, newVal, currentPath))
      } else {
        changes.push(currentPath)
      }
    }
  }
  
  return changes
}

function calculateObjectComplexity(obj) {
  if (typeof obj !== 'object' || obj === null) return 1
  
  let complexity = 1
  for (const value of Object.values(obj)) {
    complexity += calculateObjectComplexity(value)
  }
  
  return complexity
}
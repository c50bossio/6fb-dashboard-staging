'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * useDebounce hook for optimizing frequent updates
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {*} - Debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const timeoutRef = useRef()

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup on unmount or value change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedValue
}

/**
 * useDebouncedCallback hook for optimizing callback functions
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Array} deps - Dependencies array
 * @returns {Function} - Debounced callback
 */
export function useDebouncedCallback(callback, delay = 300, deps = []) {
  const timeoutRef = useRef()

  const debouncedCallback = useCallback((...args) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay, ...deps])

  // Cancel pending callback
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  // Immediately call callback
  const flush = useCallback((...args) => {
    cancel()
    callback(...args)
  }, [callback, cancel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { 
    debouncedCallback, 
    cancel, 
    flush,
    isPending: () => timeoutRef.current !== undefined
  }
}

/**
 * useThrottledValue hook for limiting update frequency
 * @param {*} value - The value to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {*} - Throttled value
 */
export function useThrottledValue(value, limit = 100) {
  const [throttledValue, setThrottledValue] = useState(value)
  const lastUpdated = useRef(0)
  const timeoutRef = useRef()

  useEffect(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdated.current

    if (timeSinceLastUpdate >= limit) {
      // Update immediately
      setThrottledValue(value)
      lastUpdated.current = now
    } else {
      // Schedule update for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value)
        lastUpdated.current = Date.now()
      }, limit - timeSinceLastUpdate)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, limit])

  return throttledValue
}

export default useDebounce
/**
 * useEffect Dependencies Checker
 * Utility to help identify and fix missing dependencies in useEffect hooks
 * Prevents "Maximum update depth exceeded" errors
 */

import { useEffect, useRef, useCallback, useMemo } from 'react'

/**
 * Enhanced useEffect that warns about missing dependencies
 */
export function useEffectWithDepsCheck(callback, deps, debugName) {
  const prevDeps = useRef(deps)
  const renderCount = useRef(0)
  
  // In development, check for potential issues
  if (process.env.NODE_ENV === 'development') {
    renderCount.current++
    
    // Warn about excessive re-renders
    if (renderCount.current > 10) {
      console.warn(`🔄 useEffect "${debugName}" has triggered ${renderCount.current} times. Check dependencies:`, deps)
    }
    
    // Check if deps are deeply equal but reference different
    if (prevDeps.current && deps) {
      const depsChanged = deps.some((dep, index) => {
        const prevDep = prevDeps.current[index]
        if (typeof dep === 'object' && typeof prevDep === 'object') {
          try {
            return JSON.stringify(dep) !== JSON.stringify(prevDep)
          } catch {
            return dep !== prevDep
          }
        }
        return dep !== prevDep
      })
      
      if (depsChanged) {
        console.log(`📦 useEffect "${debugName}" deps changed:`, {
          previous: prevDeps.current,
          current: deps
        })
      }
    }
    
    prevDeps.current = deps
  }
  
  useEffect(callback, deps)
}

/**
 * Safe useEffect wrapper that prevents infinite loops
 */
export function useSafeEffect(callback, deps, options = {}) {
  const { 
    debugName = 'anonymous',
    maxRenders = 50,
    deepCompare = false 
  } = options
  
  const renderCountRef = useRef(0)
  const lastDepsRef = useRef()
  
  const stableCallback = useCallback(() => {
    renderCountRef.current++
    
    // Circuit breaker for infinite loops
    if (renderCountRef.current > maxRenders) {
      console.error(`🚨 Circuit breaker: useEffect "${debugName}" exceeded ${maxRenders} renders. Likely infinite loop.`)
      return
    }
    
    try {
      return callback()
    } catch (error) {
      console.error(`💥 useEffect "${debugName}" error:`, error)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Custom dependency comparison
  const depsChanged = useMemo(() => {
    if (!lastDepsRef.current) return true
    
    if (deepCompare) {
      try {
        return JSON.stringify(lastDepsRef.current) !== JSON.stringify(deps)
      } catch {
        return lastDepsRef.current !== deps
      }
    }
    
    return lastDepsRef.current.some((dep, index) => dep !== deps[index])
  }, [deps, deepCompare])
  
  useEffect(() => {
    if (depsChanged) {
      lastDepsRef.current = deps
      return stableCallback()
    }
  }, [depsChanged, stableCallback])
}

/**
 * Common useEffect patterns with proper dependencies
 */
export const useEffectPatterns = {
  
  // Fetch data on component mount
  fetchOnMount: (fetchFunction, dependencies = []) => {
    useEffect(() => {
      let cancelled = false
      
      const fetchData = async () => {
        try {
          if (!cancelled) {
            await fetchFunction()
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Fetch error:', error)
          }
        }
      }
      
      fetchData()
      
      return () => {
        cancelled = true
      }
    }, dependencies) // User must provide all dependencies
  },
  
  // Subscribe to real-time updates
  subscribeToUpdates: (subscribeFunction, dependencies = []) => {
    useEffect(() => {
      const subscription = subscribeFunction()
      
      return () => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe()
        }
      }
    }, dependencies) // User must provide all dependencies
  },
  
  // Handle form field changes
  handleFieldChange: (fieldValue, onChangeCallback, dependencies = []) => {
    useEffect(() => {
      if (fieldValue !== undefined && fieldValue !== null) {
        onChangeCallback(fieldValue)
      }
    }, [fieldValue, onChangeCallback, ...dependencies])
  },
  
  // Debounced effect
  debouncedEffect: (callback, delay, dependencies = []) => {
    useEffect(() => {
      const timer = setTimeout(() => {
        callback()
      }, delay)
      
      return () => clearTimeout(timer)
    }, [...dependencies, delay]) // Include delay in deps
  }
}

/**
 * Hook to detect missing dependencies
 */
export function useDependencyWarning(callback, deps, name) {
  const callbackRef = useRef(callback)
  const nameRef = useRef(name)
  
  // Update refs without causing re-renders
  callbackRef.current = callback
  nameRef.current = name
  
  useEffect(() => {
    // Check if callback uses variables not in deps
    const callbackString = callback.toString()
    
    // Simple regex to find variable usage (not foolproof but helpful)
    const variables = callbackString.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || []
    
    // Filter out common JS keywords and React functions
    const suspiciousVars = variables.filter(variable => 
      !['const', 'let', 'var', 'function', 'return', 'if', 'else', 'true', 'false', 'null', 'undefined', 'console', 'useState', 'useEffect'].includes(variable)
    )
    
    // This is just a development helper
    if (process.env.NODE_ENV === 'development' && suspiciousVars.length > 0) {
      console.info(`🔍 useEffect "${name}" uses variables:`, suspiciousVars, 'Current deps:', deps)
    }
    
  }, deps)
}

// Export commonly fixed patterns
export const commonPatterns = {
  // Pattern: API call with loading state
  apiCall: `
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    
    useEffect(() => {
      const fetchData = async () => {
        setLoading(true)
        try {
          const result = await apiFunction(param1, param2)
          setData(result)
        } catch (error) {
          console.error(error)
        } finally {
          setLoading(false)
        }
      }
      
      fetchData()
    }, [param1, param2]) // ✅ Include ALL used variables
  `,
  
  // Pattern: Subscription with cleanup
  subscription: `
    useEffect(() => {
      const subscription = supabase
        .from('table')
        .on('*', handleUpdate)
        .subscribe()
      
      return () => subscription.unsubscribe()
    }, [handleUpdate]) // ✅ Include callback if it uses state
  `,
  
  // Pattern: Form field synchronization  
  formSync: `
    useEffect(() => {
      if (formField && formField !== previousValue) {
        onFieldChange(formField)
      }
    }, [formField, onFieldChange, previousValue]) // ✅ Include all used values
  `
}

export default {
  useEffectWithDepsCheck,
  useSafeEffect,
  useEffectPatterns,
  useDependencyWarning,
  commonPatterns
}
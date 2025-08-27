'use client'

/**
 * OnboardingContext
 * 
 * React Context Provider for managing onboarding state across components
 * with real-time synchronization and cross-tab support
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { SupabaseOnboardingManager } from '@/lib/onboarding/SupabaseOnboardingManager'
import { onboardingStateManager } from '@/lib/onboarding/onboardingState'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import CrossTabConflictModal from '@/components/onboarding/CrossTabConflictModal'

const OnboardingContext = createContext({})

export function OnboardingProvider({ children }) {
  const [manager] = useState(() => new SupabaseOnboardingManager())
  const [sessions, setSessions] = useState(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saving', 'saved', 'error', 'offline'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const supabase = createClient()
  
  // Cross-tab conflict resolution
  const [conflictModal, setConflictModal] = useState({
    isOpen: false,
    conflictData: null,
    onResolve: null
  })
  
  // Track subscriptions for cleanup
  const subscriptionsRef = useRef(new Map())
  
  // Auto-restore sessions on mount and set onboarding as active
  useEffect(() => {
    const initializeOnboarding = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        // Mark onboarding as active to prevent auth redirects
        await onboardingStateManager.setOnboardingActive(user.id, 'general', 'active')
      }
      
      restoreAllSessions()
    }
    
    initializeOnboarding()
    
    // Cleanup subscriptions on unmount
    return () => {
      manager.cleanup()
      for (const subscription of subscriptionsRef.current.values()) {
        subscription.unsubscribe()
      }
    }
  }, [manager, supabase])

  /**
   * Restore all active sessions from database
   */
  const restoreAllSessions = useCallback(async () => {
    setIsLoading(true)
    
    try {
      const sessionTypes = ['staff_setup', 'booking_rules', 'financial_setup', 'business_setup']
      
      for (const sessionType of sessionTypes) {
        const restored = await manager.restoreSession(sessionType)
        if (restored) {
          setSessions(prev => new Map(prev).set(sessionType, restored))
        }
      }
    } catch (error) {
      console.error('Error restoring sessions:', error)
      toast.error('Failed to restore onboarding progress')
    } finally {
      setIsLoading(false)
    }
  }, [manager])

  /**
   * Save step data with debouncing and status tracking
   */
  const saveStep = useCallback(async (sessionType, stepId, data, barberId = null) => {
    setSaveStatus('saving')
    setHasUnsavedChanges(false)
    
    try {
      const result = await manager.saveStepData(sessionType, stepId, data, barberId)
      
      if (result.success) {
        setSaveStatus(result.queued ? 'offline' : 'saved')
        
        // Update local state optimistically
        setSessions(prev => {
          const newSessions = new Map(prev)
          const existing = newSessions.get(sessionType) || {}
          newSessions.set(sessionType, {
            ...existing,
            stepData: { ...existing.stepData, ...data },
            currentStep: stepId,
            lastUpdated: new Date().toISOString()
          })
          return newSessions
        })
        
        if (result.queued) {
          toast('Changes saved offline - will sync when reconnected', {
            icon: '🔄'
          })
        }
        
        return result
      } else {
        setSaveStatus('error')
        toast.error(`Failed to save: ${result.error}`)
        return result
      }
    } catch (error) {
      setSaveStatus('error')
      console.error('Save error:', error)
      toast.error('Failed to save changes')
      return { success: false, error: error.message }
    }
  }, [manager])

  /**
   * Mark step as completed
   */
  const markStepComplete = useCallback(async (sessionType, stepId, barberId = null) => {
    try {
      const result = await manager.markStepComplete(sessionType, stepId, barberId)
      
      if (result.success) {
        setSessions(prev => {
          const newSessions = new Map(prev)
          const existing = newSessions.get(sessionType) || {}
          const completedSteps = [...(existing.completedSteps || []), stepId]
          
          newSessions.set(sessionType, {
            ...existing,
            completedSteps,
            progressPercentage: manager.calculateProgress(sessionType, completedSteps)
          })
          return newSessions
        })
        
        toast.success('Step completed!')
      }
      
      return result
    } catch (error) {
      console.error('Error marking step complete:', error)
      toast.error('Failed to mark step complete')
      return { success: false, error: error.message }
    }
  }, [manager])

  /**
   * Subscribe to real-time changes for cross-tab sync
   */
  const subscribeToChanges = useCallback((sessionType, barberId = null, callback) => {
    const subscriptionKey = `${sessionType}-${barberId || 'current'}`
    
    // Unsubscribe existing if any
    const existing = subscriptionsRef.current.get(subscriptionKey)
    if (existing) {
      existing.unsubscribe()
    }

    const subscription = manager.subscribeToSession(sessionType, barberId, (change) => {
      // Update local state when changes come from other tabs
      if (change.type === 'UPDATE' && change.data) {
        setSessions(prev => {
          const newSessions = new Map(prev)
          newSessions.set(sessionType, {
            stepData: change.data.step_data || {},
            currentStep: change.data.current_step,
            completedSteps: change.data.completed_steps || [],
            progressPercentage: change.data.progress_percentage || 0,
            lastUpdated: change.data.updated_at
          })
          return newSessions
        })
        
        // Handle cross-tab conflict resolution
        if (hasUnsavedChanges) {
          // There are local unsaved changes, show conflict modal
          setConflictModal({
            isOpen: true,
            conflictData: {
              sessionType,
              lastUpdated: change.data.updated_at,
              remoteData: change.data,
              localChanges: sessions.get(sessionType)
            },
            onResolve: (resolution, resolvedData) => {
              // Apply the resolved data
              if (resolvedData) {
                setSessions(prev => {
                  const newSessions = new Map(prev)
                  newSessions.set(sessionType, resolvedData)
                  return newSessions
                })
              }
              setConflictModal({ isOpen: false, conflictData: null, onResolve: null })
            }
          })
        } else {
          // No local changes, safely update and show notification
          toast('Updated from another tab', {
            icon: '🔄',
            duration: 2000
          })
        }
      }
      
      // Call the provided callback
      callback(change)
    })

    subscriptionsRef.current.set(subscriptionKey, subscription)
    return subscription
  }, [manager, hasUnsavedChanges])

  /**
   * Get session data by type
   */
  const getSession = useCallback((sessionType) => {
    return sessions.get(sessionType) || null
  }, [sessions])

  /**
   * Check if there are unsaved changes
   */
  const markUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(true)
    setSaveStatus('saving')
  }, [])

  /**
   * Clear session data
   */
  const clearSession = useCallback(async (sessionType, barberId = null) => {
    try {
      const result = await manager.clearSession(sessionType, barberId)
      
      if (result.success) {
        setSessions(prev => {
          const newSessions = new Map(prev)
          newSessions.delete(sessionType)
          return newSessions
        })
        
        toast.success('Session cleared')
      }
      
      return result
    } catch (error) {
      console.error('Error clearing session:', error)
      toast.error('Failed to clear session')
      return { success: false, error: error.message }
    }
  }, [manager])

  /**
   * Get progress for a specific session type
   */
  const getProgress = useCallback((sessionType) => {
    const session = sessions.get(sessionType)
    return {
      percentage: session?.progressPercentage || 0,
      completedSteps: session?.completedSteps || [],
      currentStep: session?.currentStep
    }
  }, [sessions])

  /**
   * Check if a step is completed
   */
  const isStepCompleted = useCallback((sessionType, stepId) => {
    const session = sessions.get(sessionType)
    return session?.completedSteps?.includes(stepId) || false
  }, [sessions])

  /**
   * Get overall onboarding progress across all session types
   */
  const getOverallProgress = useCallback(() => {
    const sessionTypes = ['staff_setup', 'booking_rules', 'financial_setup', 'business_setup']
    const totalProgress = sessionTypes.reduce((sum, type) => {
      const session = sessions.get(type)
      return sum + (session?.progressPercentage || 0)
    }, 0)
    
    return Math.round(totalProgress / sessionTypes.length)
  }, [sessions])

  const contextValue = {
    // Core actions
    saveStep,
    markStepComplete,
    subscribeToChanges,
    getSession,
    clearSession,
    
    // State queries
    getProgress,
    isStepCompleted,
    getOverallProgress,
    
    // Status
    isLoading,
    saveStatus,
    hasUnsavedChanges,
    markUnsavedChanges,
    
    // Session data
    sessions: Object.fromEntries(sessions.entries()), // Convert Map to plain object for easier use
    
    // Conflict resolution
    conflictModal,
    resolveConflict: (resolution, data) => {
      if (conflictModal.onResolve) {
        conflictModal.onResolve(resolution, data)
      }
    },
    
    // Utilities
    manager,
    restoreAllSessions
  }

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      
      {/* Cross-tab conflict resolution modal */}
      <CrossTabConflictModal
        isOpen={conflictModal.isOpen}
        conflictData={conflictModal.conflictData}
        onClose={() => setConflictModal({ isOpen: false, conflictData: null, onResolve: null })}
        onAcceptRemoteChanges={() => {
          const remoteSession = {
            stepData: conflictModal.conflictData?.remoteData?.step_data || {},
            currentStep: conflictModal.conflictData?.remoteData?.current_step,
            completedSteps: conflictModal.conflictData?.remoteData?.completed_steps || [],
            progressPercentage: conflictModal.conflictData?.remoteData?.progress_percentage || 0,
            lastUpdated: conflictModal.conflictData?.remoteData?.updated_at
          }
          contextValue.resolveConflict('accept_remote', remoteSession)
          setHasUnsavedChanges(false)
        }}
        onKeepLocalChanges={() => {
          // Keep current local state, just close modal
          contextValue.resolveConflict('keep_local', sessions.get(conflictModal.conflictData?.sessionType))
        }}
        onMergeChanges={() => {
          // Basic merge strategy: merge stepData objects
          const localSession = sessions.get(conflictModal.conflictData?.sessionType) || {}
          const remoteData = conflictModal.conflictData?.remoteData || {}
          
          const mergedSession = {
            stepData: { 
              ...remoteData.step_data, 
              ...localSession.stepData 
            }, // Local takes precedence
            currentStep: localSession.currentStep || remoteData.current_step,
            completedSteps: Array.from(new Set([
              ...(remoteData.completed_steps || []),
              ...(localSession.completedSteps || [])
            ])),
            progressPercentage: Math.max(
              localSession.progressPercentage || 0,
              remoteData.progress_percentage || 0
            ),
            lastUpdated: new Date().toISOString()
          }
          
          contextValue.resolveConflict('merge', mergedSession)
          setHasUnsavedChanges(false)
        }}
      />
    </OnboardingContext.Provider>
  )
}

/**
 * Hook to use onboarding context
 */
export function useOnboarding() {
  const context = useContext(OnboardingContext)
  
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  
  return context
}

/**
 * Hook for a specific session type with automatic subscription
 */
export function useOnboardingSession(sessionType, barberId = null) {
  const {
    getSession,
    saveStep,
    markStepComplete,
    subscribeToChanges,
    isStepCompleted,
    getProgress,
    saveStatus,
    hasUnsavedChanges,
    markUnsavedChanges
  } = useOnboarding()
  
  const [localChanges, setLocalChanges] = useState(false)
  const sessionData = getSession(sessionType)
  const progress = getProgress(sessionType)
  
  // Auto-subscribe to changes for this session
  useEffect(() => {
    const subscription = subscribeToChanges(sessionType, barberId, (change) => {
      // Handle cross-tab conflict resolution
      if (localChanges && change.type === 'UPDATE') {
        // Could show a modal here for conflict resolution
        console.warn('Cross-tab conflict detected for', sessionType)
      }
    })
    
    return () => subscription?.unsubscribe()
  }, [sessionType, barberId, subscribeToChanges, localChanges])
  
  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (stepId, data) => {
      setLocalChanges(false)
      return await saveStep(sessionType, stepId, data, barberId)
    }, 2000),
    [sessionType, barberId, saveStep]
  )
  
  const saveWithDebounce = useCallback((stepId, data) => {
    setLocalChanges(true)
    markUnsavedChanges()
    return debouncedSave(stepId, data)
  }, [debouncedSave, markUnsavedChanges])
  
  return {
    sessionData,
    progress,
    saveStep: saveWithDebounce,
    markStepComplete: (stepId) => markStepComplete(sessionType, stepId, barberId),
    isStepCompleted: (stepId) => isStepCompleted(sessionType, stepId),
    saveStatus,
    hasUnsavedChanges,
    hasLocalChanges: localChanges
  }
}

// Utility debounce function
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export default OnboardingContext
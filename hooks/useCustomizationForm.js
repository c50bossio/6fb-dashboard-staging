'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'

/**
 * Custom hook for managing form state, validation, and persistence
 * Optimized for customization components with auto-save and undo/redo
 */
export function useCustomizationForm(initialSettings, options = {}) {
  const {
    tableName = 'profiles',
    autoSaveDelay = 5000,
    enableUndo = true,
    maxUndoSteps = 10,
    onSave,
    onError,
    onUnsavedChanges
  } = options

  const { user } = useAuth()
  const supabase = createClient()
  
  // Form state management
  const [settings, setSettings] = useState(initialSettings)
  const [originalSettings, setOriginalSettings] = useState(initialSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  
  // Undo/Redo state
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  
  // Refs for optimization
  const autoSaveTimeoutRef = useRef()
  const settingsRef = useRef(settings)
  const originalRef = useRef(originalSettings)

  // Update refs when state changes
  useEffect(() => {
    settingsRef.current = settings
    originalRef.current = originalSettings
  }, [settings, originalSettings])

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(settingsRef.current) !== JSON.stringify(originalRef.current)
  }, [])

  // Notify parent of unsaved changes
  useEffect(() => {
    const hasChanges = hasUnsavedChanges()
    if (onUnsavedChanges) {
      onUnsavedChanges(hasChanges)
    }
    
    // Update undo/redo state
    setCanUndo(undoStack.length > 0)
    setCanRedo(redoStack.length > 0)
  }, [settings, originalSettings, undoStack, redoStack, hasUnsavedChanges, onUnsavedChanges])

  // Optimized setting update with undo support
  const updateSetting = useCallback((key, value, skipUndo = false) => {
    setSettings(prev => {
      // Add to undo stack if enabled and not skipping
      if (enableUndo && !skipUndo) {
        setUndoStack(stack => {
          const newStack = [prev, ...stack.slice(0, maxUndoSteps - 1)]
          return newStack
        })
        // Clear redo stack when new change is made
        setRedoStack([])
      }

      // Handle nested object updates
      if (key.includes('.')) {
        const keys = key.split('.')
        const result = { ...prev }
        let current = result
        
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] }
          current = current[keys[i]]
        }
        
        current[keys[keys.length - 1]] = value
        return result
      }
      
      return { ...prev, [key]: value }
    })

    // Mark field as touched for validation
    setTouched(prev => ({ ...prev, [key]: true }))
  }, [enableUndo, maxUndoSteps])

  // Batch update multiple settings
  const updateSettings = useCallback((updates, skipUndo = false) => {
    setSettings(prev => {
      if (enableUndo && !skipUndo) {
        setUndoStack(stack => [prev, ...stack.slice(0, maxUndoSteps - 1)])
        setRedoStack([])
      }
      return { ...prev, ...updates }
    })
    
    // Mark all updated fields as touched
    setTouched(prev => ({
      ...prev,
      ...Object.keys(updates).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    }))
  }, [enableUndo, maxUndoSteps])

  // Undo functionality
  const undo = useCallback(() => {
    if (undoStack.length === 0) return

    const [previousState, ...remainingUndo] = undoStack
    setRedoStack(stack => [settingsRef.current, ...stack.slice(0, maxUndoSteps - 1)])
    setUndoStack(remainingUndo)
    setSettings(previousState)
  }, [undoStack, maxUndoSteps])

  // Redo functionality
  const redo = useCallback(() => {
    if (redoStack.length === 0) return

    const [nextState, ...remainingRedo] = redoStack
    setUndoStack(stack => [settingsRef.current, ...stack.slice(0, maxUndoSteps - 1)])
    setRedoStack(remainingRedo)
    setSettings(nextState)
  }, [redoStack, maxUndoSteps])

  // Debounced auto-save
  const scheduleAutoSave = useCallback(() => {
    if (!user || !hasUnsavedChanges()) return

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Schedule new auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsAutoSaving(true)
        await saveToDatabase(settingsRef.current)
        setOriginalSettings(JSON.parse(JSON.stringify(settingsRef.current)))
      } catch (error) {
        console.error('Auto-save failed:', error)
        if (onError) onError(error)
      } finally {
        setIsAutoSaving(false)
      }
    }, autoSaveDelay)
  }, [user, autoSaveDelay, hasUnsavedChanges, onError])

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges()) {
      scheduleAutoSave()
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [settings, scheduleAutoSave, hasUnsavedChanges])

  // Database save function
  const saveToDatabase = useCallback(async (dataToSave = settingsRef.current) => {
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from(tableName)
      .update({
        ...dataToSave,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) throw error
    
    if (onSave) onSave(dataToSave)
    return dataToSave
  }, [user, tableName, supabase, onSave])

  // Manual save with loading state
  const save = useCallback(async () => {
    if (!hasUnsavedChanges()) return

    try {
      setIsSaving(true)
      setErrors({})
      
      const savedData = await saveToDatabase()
      setOriginalSettings(JSON.parse(JSON.stringify(savedData)))
      
      return savedData
    } catch (error) {
      console.error('Save failed:', error)
      if (onError) onError(error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [hasUnsavedChanges, saveToDatabase, onError])

  // Reset to original state
  const reset = useCallback(() => {
    setSettings(JSON.parse(JSON.stringify(originalRef.current)))
    setErrors({})
    setTouched({})
    setUndoStack([])
    setRedoStack([])
  }, [])

  // Load initial data
  const load = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      
      if (data) {
        const loadedSettings = { ...initialSettings, ...data }
        setSettings(loadedSettings)
        setOriginalSettings(JSON.parse(JSON.stringify(loadedSettings)))
        setErrors({})
        setTouched({})
      }
    } catch (error) {
      console.error('Load failed:', error)
      if (onError) onError(error)
    } finally {
      setIsLoading(false)
    }
  }, [user, tableName, initialSettings, supabase, onError])

  // Form validation
  const validate = useCallback((schema) => {
    try {
      const result = schema.safeParse(settings)
      if (result.success) {
        setErrors({})
        return true
      } else {
        const newErrors = {}
        result.error.errors.forEach(error => {
          const path = error.path.join('.')
          newErrors[path] = error.message
        })
        setErrors(newErrors)
        return false
      }
    } catch (error) {
      console.error('Validation error:', error)
      return false
    }
  }, [settings])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    settings,
    originalSettings,
    isLoading,
    isSaving,
    isAutoSaving,
    errors,
    touched,
    
    // Computed
    hasUnsavedChanges: hasUnsavedChanges(),
    canUndo,
    canRedo,
    
    // Actions
    updateSetting,
    updateSettings,
    save,
    load,
    reset,
    undo,
    redo,
    validate,
    
    // Utilities
    setErrors,
    setTouched
  }
}

export default useCustomizationForm
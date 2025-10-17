'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

// Available calendar views (non-resource views only)
const AVAILABLE_CALENDAR_VIEWS = ['timeGridDay', 'timeGridWeek', 'dayGridMonth', 'listWeek']

// Default preferences
const DEFAULT_PREFERENCES = {
  calendar_view: 'timeGridWeek',
  theme: 'light',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications: {
    email: true,
    sms: true,
    push: false
  }
}

// Validate calendar view to prevent using unavailable views
const validateCalendarView = (view) => {
  return AVAILABLE_CALENDAR_VIEWS.includes(view) ? view : DEFAULT_PREFERENCES.calendar_view
}

export function useUserPreferences() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const saveTimeoutRef = useRef(null)
  const lastSavedRef = useRef({})
  
  // Load preferences on mount or user change
  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES)
      setLoading(false)
      return
    }
    
    loadPreferences()
  }, [user?.id])
  
  // Load preferences from API
  const loadPreferences = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/preferences')
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, use defaults
          setPreferences(DEFAULT_PREFERENCES)
          return
        }
        throw new Error('Failed to load preferences')
      }
      
      const data = await response.json()
      const loadedPreferences = {
        ...DEFAULT_PREFERENCES,
        ...data.preferences,
        // Validate calendar view to prevent crashes
        calendar_view: validateCalendarView(data.preferences?.calendar_view)
      }
      
      setPreferences(loadedPreferences)
      lastSavedRef.current = loadedPreferences
      
    } catch (err) {
      console.error('Error loading preferences:', err)
      setError(err.message)
      // Use defaults on error
      setPreferences(DEFAULT_PREFERENCES)
    } finally {
      setLoading(false)
    }
  }
  
  // Save preferences to API (debounced)
  const savePreferences = useCallback(async (newPreferences) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Optimistic update
    setPreferences(prev => ({
      ...prev,
      ...newPreferences
    }))
    
    // Debounce the actual save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/user/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ preferences: newPreferences })
        })
        
        if (!response.ok) {
          throw new Error('Failed to save preferences')
        }
        
        const data = await response.json()
        lastSavedRef.current = data.preferences
        
      } catch (err) {
        console.error('Error saving preferences:', err)
        setError(err.message)
        
        // Revert to last saved on error
        setPreferences(lastSavedRef.current)
      }
    }, 500) // 500ms debounce
    
  }, [])
  
  // Update a specific preference key
  const updatePreference = useCallback(async (key, value) => {
    // Validate calendar view if updating it
    if (key === 'calendar_view') {
      value = validateCalendarView(value)
    }
    
    // Optimistic update
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Save to backend
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update preference')
      }
      
      const data = await response.json()
      lastSavedRef.current[key] = value
      
    } catch (err) {
      console.error(`Error updating preference ${key}:`, err)
      setError(err.message)
      
      // Revert on error
      setPreferences(prev => ({
        ...prev,
        [key]: lastSavedRef.current[key]
      }))
    }
  }, [])
  
  // Get a specific preference with fallback
  const getPreference = useCallback((key, fallback = null) => {
    return preferences[key] !== undefined ? preferences[key] : fallback
  }, [preferences])
  
  // Reset to defaults
  const resetPreferences = useCallback(async () => {
    setPreferences(DEFAULT_PREFERENCES)
    await savePreferences(DEFAULT_PREFERENCES)
  }, [savePreferences])
  
  // Check if a view is available
  const isViewAvailable = useCallback((view) => {
    return AVAILABLE_CALENDAR_VIEWS.includes(view)
  }, [])
  
  // Get safe calendar view (always returns a valid view)
  const getSafeCalendarView = useCallback(() => {
    return validateCalendarView(preferences.calendar_view)
  }, [preferences.calendar_view])
  
  return {
    preferences,
    loading,
    error,
    updatePreference,
    getPreference,
    savePreferences,
    resetPreferences,
    isViewAvailable,
    getSafeCalendarView,
    availableViews: AVAILABLE_CALENDAR_VIEWS
  }
}
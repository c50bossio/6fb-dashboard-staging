'use client'

import { useEffect, useCallback, useRef } from 'react'
import { getRecoveryManager } from '@/lib/conversation-recovery-manager'

/**
 * Enhanced Conversation Persistence Hook
 * Enhances existing localStorage persistence with recovery features
 * Drop-in enhancement for OptimizedAIChat and VirtualScrollChat
 */
export function useConversationPersistence(sessionId, messages, enabled = true) {
  const recoveryManager = getRecoveryManager()
  const saveTimeoutRef = useRef(null)
  const lastSaveRef = useRef(0)
  
  // Enhanced save function with recovery state
  const saveConversation = useCallback(() => {
    if (!enabled || !sessionId || !messages) return
    
    try {
      // Save conversation (original behavior)
      const conversationData = {
        messages,
        sessionId,
        timestamp: Date.now()
      }
      
      localStorage.setItem(`ai_conversation_${sessionId}`, JSON.stringify(conversationData))
      
      // Update recovery manager metadata
      recoveryManager.updateConversationMetadata(sessionId, {
        messageCount: messages.length,
        lastSaved: Date.now()
      })
      
      // Clear any pending crash recovery for this session
      if (messages.length > 0) {
        recoveryManager.clearRecoveryState()
      }
      
      lastSaveRef.current = Date.now()
      
    } catch (error) {
      console.error('Failed to save conversation:', error)
      
      // On save failure, ensure recovery state is maintained
      recoveryManager.saveRecoveryState(sessionId, messages, {
        saveError: true,
        errorMessage: error.message
      })
    }
  }, [sessionId, messages, enabled, recoveryManager])

  // Enhanced load function
  const loadConversation = useCallback(async (sessionId) => {
    if (!sessionId) return null
    
    try {
      // Try regular load first
      const stored = localStorage.getItem(`ai_conversation_${sessionId}`)
      if (stored) {
        const history = JSON.parse(stored)
        
        // Update access time
        recoveryManager.updateConversationMetadata(sessionId, {
          lastAccessed: Date.now()
        })
        
        return history.messages || []
      }
      
      // Check if this session has recovery data
      const recoveryData = recoveryManager.getRecoveryData()
      if (recoveryData && recoveryData.sessionId === sessionId) {
        return recoveryData.messages || []
      }
      
      return null
      
    } catch (error) {
      console.error('Failed to load conversation:', error)
      
      // Try recovery data as fallback
      const recoveryData = recoveryManager.getRecoveryData()
      if (recoveryData && recoveryData.sessionId === sessionId) {
        console.log('Using recovery data as fallback')
        return recoveryData.messages || []
      }
      
      return null
    }
  }, [recoveryManager])

  // Save recovery state periodically while typing
  const saveRecoveryState = useCallback(() => {
    if (!enabled || !sessionId || !messages?.length) return
    
    // Only save recovery state if we haven't saved recently
    const timeSinceLastSave = Date.now() - lastSaveRef.current
    if (timeSinceLastSave > 30000) { // 30 seconds since last save
      recoveryManager.saveRecoveryState(sessionId, messages, {
        autoSave: true,
        messageCount: messages.length
      })
    }
  }, [sessionId, messages, enabled, recoveryManager])

  // Debounced save effect
  useEffect(() => {
    if (!enabled || !messages?.length) return
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      saveConversation()
    }, 2000)
    
    // Also save recovery state immediately
    saveRecoveryState()
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [messages, saveConversation, saveRecoveryState, enabled])

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (enabled && messages?.length) {
        // Force immediate save on unload
        saveConversation()
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveConversation, messages, enabled])

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && enabled && messages?.length) {
        // Save when tab becomes hidden
        saveConversation()
      } else if (!document.hidden) {
        // Check for recovery when tab becomes visible
        recoveryManager.checkForCrashRecovery?.()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [saveConversation, messages, enabled, recoveryManager])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    saveConversation,
    loadConversation,
    saveRecoveryState,
    recoveryManager
  }
}

/**
 * Hook for conversation recovery features
 */
export function useConversationRecovery() {
  const recoveryManager = getRecoveryManager()
  
  const getRecoveryData = useCallback(() => {
    return recoveryManager.getRecoveryData()
  }, [recoveryManager])
  
  const acceptRecovery = useCallback(() => {
    return recoveryManager.acceptRecovery()
  }, [recoveryManager])
  
  const rejectRecovery = useCallback(() => {
    recoveryManager.rejectRecovery()
  }, [recoveryManager])
  
  const getAllConversations = useCallback(() => {
    return recoveryManager.getAllConversations()
  }, [recoveryManager])
  
  const deleteConversation = useCallback((sessionId) => {
    return recoveryManager.deleteConversation(sessionId)
  }, [recoveryManager])
  
  const exportConversation = useCallback((sessionId, format = 'json') => {
    return recoveryManager.exportConversation(sessionId, format)
  }, [recoveryManager])
  
  const searchConversations = useCallback((query) => {
    return recoveryManager.searchConversations(query)
  }, [recoveryManager])
  
  const getStats = useCallback(() => {
    return recoveryManager.getStats()
  }, [recoveryManager])
  
  return {
    getRecoveryData,
    acceptRecovery,
    rejectRecovery,
    getAllConversations,
    deleteConversation,
    exportConversation,
    searchConversations,
    getStats,
    recoveryManager
  }
}
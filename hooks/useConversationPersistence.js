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
  
  const saveConversation = useCallback(() => {
    if (!enabled || !sessionId || !messages) return
    
    try {
      const conversationData = {
        messages,
        sessionId,
        timestamp: Date.now()
      }
      
      localStorage.setItem(`ai_conversation_${sessionId}`, JSON.stringify(conversationData))
      
      recoveryManager.updateConversationMetadata(sessionId, {
        messageCount: messages.length,
        lastSaved: Date.now()
      })
      
      if (messages.length > 0) {
        recoveryManager.clearRecoveryState()
      }
      
      lastSaveRef.current = Date.now()
      
    } catch (error) {
      console.error('Failed to save conversation:', error)
      
      recoveryManager.saveRecoveryState(sessionId, messages, {
        saveError: true,
        errorMessage: error.message
      })
    }
  }, [sessionId, messages, enabled, recoveryManager])

  const loadConversation = useCallback(async (sessionId) => {
    if (!sessionId) return null
    
    try {
      const stored = localStorage.getItem(`ai_conversation_${sessionId}`)
      if (stored) {
        const history = JSON.parse(stored)
        
        recoveryManager.updateConversationMetadata(sessionId, {
          lastAccessed: Date.now()
        })
        
        return history.messages || []
      }
      
      const recoveryData = recoveryManager.getRecoveryData()
      if (recoveryData && recoveryData.sessionId === sessionId) {
        return recoveryData.messages || []
      }
      
      return null
      
    } catch (error) {
      console.error('Failed to load conversation:', error)
      
      const recoveryData = recoveryManager.getRecoveryData()
      if (recoveryData && recoveryData.sessionId === sessionId) {
        console.log('Using recovery data as fallback')
        return recoveryData.messages || []
      }
      
      return null
    }
  }, [recoveryManager])

  const saveRecoveryState = useCallback(() => {
    if (!enabled || !sessionId || !messages?.length) return
    
    const timeSinceLastSave = Date.now() - lastSaveRef.current
    if (timeSinceLastSave > 30000) { // 30 seconds since last save
      recoveryManager.saveRecoveryState(sessionId, messages, {
        autoSave: true,
        messageCount: messages.length
      })
    }
  }, [sessionId, messages, enabled, recoveryManager])

  useEffect(() => {
    if (!enabled || !messages?.length) return
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveConversation()
    }, 2000)
    
    saveRecoveryState()
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [messages, saveConversation, saveRecoveryState, enabled])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (enabled && messages?.length) {
        saveConversation()
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveConversation, messages, enabled])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && enabled && messages?.length) {
        saveConversation()
      } else if (!document.hidden) {
        recoveryManager.checkForCrashRecovery?.()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [saveConversation, messages, enabled, recoveryManager])

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
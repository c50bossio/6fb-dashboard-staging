'use client'

import { useState, useEffect } from 'react'
import { 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { getRecoveryManager } from '@/lib/conversation-recovery-manager'

/**
 * Conversation Recovery Modal
 * Shows when crash recovery data is available
 */
export default function ConversationRecoveryModal({ onRecover, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false)
  const [recoveryData, setRecoveryData] = useState(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const recoveryManager = getRecoveryManager()

  useEffect(() => {
    // Check for recovery data on mount
    const checkRecovery = () => {
      const recovery = recoveryManager.getRecoveryData()
      if (recovery) {
        setRecoveryData(recovery)
        setIsVisible(true)
      }
    }

    checkRecovery()

    // Listen for recovery events
    const handleRecoveryEvent = (event) => {
      const { type, data } = event.detail
      
      if (type === 'recovery-available') {
        setRecoveryData(data)
        setIsVisible(true)
      } else if (type === 'recovery-accepted' || type === 'recovery-rejected') {
        setIsVisible(false)
        setRecoveryData(null)
      }
    }

    window.addEventListener('conversation-recovery', handleRecoveryEvent)
    return () => {
      window.removeEventListener('conversation-recovery', handleRecoveryEvent)
    }
  }, [recoveryManager])

  const handleRecover = async () => {
    setIsRecovering(true)
    
    try {
      const restored = recoveryManager.acceptRecovery()
      if (restored && onRecover) {
        onRecover(restored)
      }
      setIsVisible(false)
    } catch (error) {
      console.error('Recovery failed:', error)
    } finally {
      setIsRecovering(false)
    }
  }

  const handleDismiss = () => {
    recoveryManager.rejectRecovery()
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
    return date.toLocaleDateString()
  }

  if (!isVisible || !recoveryData) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-800" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Conversation Recovery</h3>
              <p className="text-sm text-gray-500">We found an unsaved conversation</p>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Recovery Details */}
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-amber-800 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  Conversation Details
                </h4>
                
                <div className="space-y-2 text-sm text-yellow-700">
                  <div className="flex justify-between">
                    <span>Messages:</span>
                    <span className="font-medium">{recoveryData.messageCount || 0}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Last Activity:</span>
                    <span className="font-medium">{formatTime(recoveryData.timestamp)}</span>
                  </div>
                  
                  {recoveryData.lastMessage && (
                    <div className="mt-3 p-2 bg-yellow-100 rounded border">
                      <p className="text-xs text-yellow-800 font-medium mb-1">Last Message:</p>
                      <p className="text-xs text-yellow-700">
                        "{recoveryData.lastMessage}..."
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-6">
          <div className="flex items-start space-x-2">
            <ClockIcon className="h-4 w-4 text-gray-500 mt-0.5" />
            <p className="text-xs text-gray-600">
              Recovery data is automatically cleaned up after 24 hours. 
              Would you like to restore this conversation?
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleRecover}
            disabled={isRecovering}
            className="flex-1 bg-olive-600 text-white px-4 py-2 rounded-lg hover:bg-olive-700 disabled:bg-olive-400 transition-colors flex items-center justify-center space-x-2"
          >
            {isRecovering ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Recovering...</span>
              </>
            ) : (
              <span>Recover Conversation</span>
            )}
          </button>
          
          <button
            onClick={handleDismiss}
            disabled={isRecovering}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 transition-colors"
          >
            Dismiss
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          Your conversation was automatically saved before the session ended
        </div>
      </div>
    </div>
  )
}
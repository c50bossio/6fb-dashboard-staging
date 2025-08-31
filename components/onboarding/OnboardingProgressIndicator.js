'use client'

/**
 * OnboardingProgressIndicator
 * 
 * Enhanced progress indicator showing cross-tab sync status and overall progress
 */

import {
  CheckCircleIcon,
  ClockIcon,
  _ExclamationCircleIcon,
  ArrowPathIcon,
  WifiIcon,
  CloudIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useOnboarding } from '@/contexts/OnboardingContext'

export default function OnboardingProgressIndicator({ currentSession, className = '' }) {
  const {
    getOverallProgress,
    saveStatus,
    hasUnsavedChanges,
    sessions
  } = useOnboarding()

  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [isOnline, setIsOnline] = useState(true)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update sync time when saved
  useEffect(() => {
    if (saveStatus === 'saved') {
      setLastSyncTime(new Date())
    }
  }, [saveStatus])

  const overallProgress = getOverallProgress()
  const sessionTypes = ['staff_setup', 'booking_rules', 'financial_setup', 'business_setup']
  
  // Get status for each session
  const getSessionStatus = (sessionType) => {
    const session = sessions[sessionType]
    if (!session) return 'not_started'
    
    const completedSteps = session.completedSteps || []
    const progressPercentage = session.progressPercentage || 0
    
    if (progressPercentage === 100) return 'completed'
    if (progressPercentage > 0 || completedSteps.length > 0) return 'in_progress'
    return 'not_started'
  }

  const sessionLabels = {
    'staff_setup': 'Staff Setup',
    'booking_rules': 'Booking Rules',
    'financial_setup': 'Financial Setup', 
    'business_setup': 'Business Setup'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-yellow-600 bg-yellow-100'
      case 'not_started': return 'text-gray-400 bg-gray-100'
      default: return 'text-gray-400 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircleIcon
      case 'in_progress': return ClockIcon
      case 'not_started': return ClockIcon
      default: return ClockIcon
    }
  }

  const getSaveStatusIcon = () => {
    if (!isOnline) return WifiIcon
    if (saveStatus === 'saving') return ArrowPathIcon
    if (saveStatus === 'offline') return CloudIcon
    if (saveStatus === 'error') return ExclamationCircleIcon
    return CheckCircleIcon
  }

  const getSaveStatusColor = () => {
    if (!isOnline) return 'text-red-600'
    if (saveStatus === 'saving') return 'text-yellow-600'
    if (saveStatus === 'offline') return 'text-orange-600'
    if (saveStatus === 'error') return 'text-red-600'
    return 'text-green-600'
  }

  const getSaveStatusText = () => {
    if (!isOnline) return 'Offline'
    if (saveStatus === 'saving') return 'Saving...'
    if (saveStatus === 'offline') return 'Offline Queue'
    if (saveStatus === 'error') return 'Save Error'
    if (hasUnsavedChanges) return 'Unsaved Changes'
    return 'All Saved'
  }

  const SaveStatusIcon = getSaveStatusIcon()

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">
          Onboarding Progress
        </h3>
        <div className="flex items-center space-x-2">
          <SaveStatusIcon 
            className={`h-4 w-4 ${getSaveStatusColor()} ${
              saveStatus === 'saving' ? 'animate-spin' : ''
            }`}
          />
          <span className={`text-xs ${getSaveStatusColor()}`}>
            {getSaveStatusText()}
          </span>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm text-gray-500">
            {overallProgress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-brand-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Session Status List */}
      <div className="space-y-2">
        {sessionTypes.map((sessionType) => {
          const status = getSessionStatus(sessionType)
          const StatusIcon = getStatusIcon(status)
          const isCurrentSession = currentSession === sessionType
          
          return (
            <div
              key={sessionType}
              className={`flex items-center space-x-3 p-2 rounded ${
                isCurrentSession ? 'bg-brand-50 border border-brand-200' : ''
              }`}
            >
              <div className={`p-1 rounded-full ${getStatusColor(status)}`}>
                <StatusIcon className="h-3 w-3" />
              </div>
              <span className={`text-xs ${
                isCurrentSession ? 'font-medium text-brand-800' : 'text-gray-700'
              }`}>
                {sessionLabels[sessionType]}
              </span>
              {isCurrentSession && (
                <div className="ml-auto">
                  <CpuChipIcon className="h-3 w-3 text-brand-600" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sync Status */}
      {lastSyncTime && isOnline && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Cross-tab info */}
      {Object.keys(sessions).length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            ✨ Changes sync automatically across browser tabs
          </p>
        </div>
      )}
    </div>
  )
}
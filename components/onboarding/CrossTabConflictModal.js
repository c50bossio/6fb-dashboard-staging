'use client'

/**
 * CrossTabConflictModal
 * 
 * Modal component that appears when conflicts are detected between 
 * multiple browser tabs during onboarding
 */

import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function CrossTabConflictModal({
  isOpen,
  onClose,
  onAcceptRemoteChanges,
  onKeepLocalChanges,
  onMergeChanges,
  conflictData
}) {
  const [isResolving, setIsResolving] = useState(false)

  if (!isOpen || !conflictData) return null

  const handleAcceptRemote = async () => {
    setIsResolving(true)
    try {
      await onAcceptRemoteChanges()
    } finally {
      setIsResolving(false)
      onClose()
    }
  }

  const handleKeepLocal = async () => {
    setIsResolving(true)
    try {
      await onKeepLocalChanges()
    } finally {
      setIsResolving(false)
      onClose()
    }
  }

  const handleMergeChanges = async () => {
    setIsResolving(true)
    try {
      await onMergeChanges()
    } finally {
      setIsResolving(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationTriangleIcon 
                className="h-6 w-6 text-yellow-600" 
                aria-hidden="true" 
              />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Changes Detected From Another Tab
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  The {conflictData.sessionType.replace('_', ' ')} step has been updated 
                  from another browser tab. What would you like to do?
                </p>
                
                {conflictData.lastUpdated && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {new Date(conflictData.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-col space-y-3">
            {/* Accept remote changes */}
            <button
              type="button"
              onClick={handleAcceptRemote}
              disabled={isResolving}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResolving ? (
                <>
                  <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                  Updating...
                </>
              ) : (
                'Use Changes From Other Tab'
              )}
            </button>

            {/* Keep local changes */}
            <button
              type="button"
              onClick={handleKeepLocal}
              disabled={isResolving}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep My Current Changes
            </button>

            {/* Merge changes (for advanced users) */}
            {onMergeChanges && (
              <button
                type="button"
                onClick={handleMergeChanges}
                disabled={isResolving}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Try to Merge Both Changes
              </button>
            )}

            {/* Cancel/close */}
            <button
              type="button"
              onClick={onClose}
              disabled={isResolving}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Decide Later
            </button>
          </div>

          {/* Info section */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs text-blue-700">
                  <strong>Tip:</strong> To avoid conflicts, try to complete onboarding 
                  in one tab at a time. Changes are automatically saved as you work.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import React from 'react'
import { 
  Cog6ToothIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const pageName = window.location.pathname.split('/').pop()
  const displayName = pageName.charAt(0).toUpperCase() + pageName.slice(1)
  
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center">
          <Cog6ToothIcon className="h-8 w-8 text-olive-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{displayName} Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure your {displayName.toLowerCase()} preferences and options
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Page Under Development</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            This {displayName.toLowerCase()} settings page is currently being developed. 
            The functionality will be available in an upcoming update.
          </p>
          
          <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-olive-800 mb-2">Coming Soon:</h3>
            <ul className="text-sm text-olive-700 space-y-1">
              <li>• Complete {displayName.toLowerCase()} configuration</li>
              <li>• Real-time settings sync</li>
              <li>• Advanced customization options</li>
              <li>• Integration with existing workflows</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <button
              disabled
              className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
            >
              Save Settings (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

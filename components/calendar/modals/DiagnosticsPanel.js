'use client'

import { memo } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

/**
 * Developer Diagnostics Panel Component
 * Shows real-time debugging information for calendar system
 */
const DiagnosticsPanel = memo(function DiagnosticsPanel({
  isOpen,
  onClose,
  diagnostics = {},
  realtimeHookConnected = false,
  connectionAttempts = 0,
  lastUpdate = null,
  realtimeAppointments = [],
  filteredEvents = [],
  realtimeLoading = false,
  realtimeErrorMsg = null
}) {
  if (!isOpen) return null

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-gray-900 text-white transition-transform duration-300 ${
      isOpen ? 'transform translate-y-0' : 'transform translate-y-full'
    } z-40`}>
      <div className="px-6 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Real-time Diagnostics</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="px-6 py-4 max-h-60 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Connection Status */}
          <div className="bg-gray-800 rounded p-3">
            <div className="font-semibold text-olive-400 mb-2">Connection Status</div>
            <div className={`text-${realtimeHookConnected ? 'green' : 'red'}-400 font-mono`}>
              {diagnostics.subscriptionStatus || 'unknown'}
            </div>
            <div className="text-gray-400 mt-1">
              Attempts: {connectionAttempts}
            </div>
            <div className="text-gray-400">
              Channel: {diagnostics.channelStatus || 'unknown'}
            </div>
          </div>

          {/* Event Counts */}
          <div className="bg-gray-800 rounded p-3">
            <div className="font-semibold text-green-400 mb-2">Event Counts</div>
            <div className="space-y-1 font-mono">
              <div>INSERT: {diagnostics.eventCounts?.INSERT || 0}</div>
              <div>UPDATE: {diagnostics.eventCounts?.UPDATE || 0}</div>
              <div>DELETE: {diagnostics.eventCounts?.DELETE || 0}</div>
            </div>
          </div>

          {/* Timing Info */}
          <div className="bg-gray-800 rounded p-3">
            <div className="font-semibold text-yellow-400 mb-2">Timing</div>
            <div className="text-gray-300 text-xs">
              <div>Last Update:</div>
              <div className="font-mono">
                {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'None'}
              </div>
              <div className="mt-1">Connection Time:</div>
              <div className="font-mono">
                {diagnostics.connectionTime ? `${diagnostics.connectionTime}ms` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Data Status */}
          <div className="bg-gray-800 rounded p-3">
            <div className="font-semibold text-gold-400 mb-2">Data Status</div>
            <div className="space-y-1">
              <div>Appointments: {realtimeAppointments?.length || 0}</div>
              <div>Filtered: {filteredEvents?.length || 0}</div>
              <div>Loading: {realtimeLoading ? 'Yes' : 'No'}</div>
              <div className={`text-${realtimeErrorMsg ? 'red' : 'green'}-400`}>
                Status: {realtimeErrorMsg ? 'Error' : 'OK'}
              </div>
            </div>
          </div>

          {/* Error History */}
          {diagnostics.errorHistory?.length > 0 && (
            <div className="bg-gray-800 rounded p-3 md:col-span-2">
              <div className="font-semibold text-red-400 mb-2">Recent Errors</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {diagnostics.errorHistory.slice(-3).map((error, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-red-400">[{error.type}]</span> {error.message}
                    <div className="text-gray-500">{new Date(error.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription History */}
          {diagnostics.subscriptionStatusHistory?.length > 0 && (
            <div className="bg-gray-800 rounded p-3 md:col-span-2">
              <div className="font-semibold text-olive-400 mb-2">Status History</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {diagnostics.subscriptionStatusHistory.slice(-3).map((status, i) => (
                  <div key={i} className="text-xs font-mono">
                    <span className="text-olive-300">{status.status}</span>
                    <div className="text-gray-500">{new Date(status.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3 mt-4 pt-3 border-t border-gray-700">
          <button
            onClick={() => console.log('Full diagnostics:', diagnostics)}
            className="px-3 py-1 bg-olive-600 hover:bg-olive-700 rounded text-xs"
          >
            Log Full Diagnostics
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
          >
            Force Reload
          </button>
        </div>
      </div>
    </div>
  )
})

DiagnosticsPanel.displayName = 'DiagnosticsPanel'

export default DiagnosticsPanel
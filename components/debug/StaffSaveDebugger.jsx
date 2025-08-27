'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

/**
 * Staff Save Debugger Component
 * Provides real-time debugging for staff save functionality
 */
export default function StaffSaveDebugger({ staff, onSaveAttempt }) {
  const [debugLog, setDebugLog] = useState([])
  const [isDebugging, setIsDebugging] = useState(false)

  const addDebugLog = (level, message, data = null) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    }
    setDebugLog(prev => [...prev, logEntry])
    
    // Also log to browser console for easier debugging
    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'
    console[consoleMethod](`[StaffSaveDebugger ${timestamp}] ${message}`, data || '')
  }

  const testStaffSave = async (staffData) => {
    setIsDebugging(true)
    setDebugLog([])
    
    addDebugLog('info', 'Starting staff save debug test', staffData)
    
    try {
      // Step 1: Validate data before sending
      addDebugLog('info', 'Validating staff data before save...')
      
      if (!staffData.arrangement_type && !staffData.financial_model) {
        addDebugLog('warning', 'No financial arrangement type specified')
      }
      
      if (!staffData.commission_rate && staffData.commission_rate !== 0) {
        addDebugLog('warning', 'No commission rate specified')
      }
      
      // Step 2: Test API endpoint accessibility
      addDebugLog('info', `Testing API endpoint: /api/staff/${staff?.id}`)
      
      const testResponse = await fetch(`/api/staff/${staff?.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      addDebugLog('info', `API endpoint response: ${testResponse.status} ${testResponse.statusText}`)
      
      if (!testResponse.ok) {
        const errorData = await testResponse.text()
        addDebugLog('error', 'API endpoint not accessible', { status: testResponse.status, error: errorData })
        return
      }
      
      // Step 3: Test actual save
      addDebugLog('info', 'Attempting to save staff data...')
      
      const saveResponse = await fetch(`/api/staff/${staff?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      })
      
      addDebugLog('info', `Save response: ${saveResponse.status} ${saveResponse.statusText}`)
      
      const responseData = await saveResponse.text()
      let parsedResponse
      
      try {
        parsedResponse = JSON.parse(responseData)
        addDebugLog('info', 'Save response data', parsedResponse)
      } catch (e) {
        addDebugLog('error', 'Response not valid JSON', responseData)
        return
      }
      
      if (!saveResponse.ok) {
        addDebugLog('error', 'Save failed', {
          status: saveResponse.status,
          error: parsedResponse
        })
        
        // Provide specific error guidance
        if (saveResponse.status === 401) {
          addDebugLog('error', 'AUTHENTICATION ERROR: User not logged in or session expired')
        } else if (saveResponse.status === 403) {
          addDebugLog('error', 'PERMISSION ERROR: User does not have permission to update this staff member')
        } else if (saveResponse.status === 400) {
          addDebugLog('error', 'VALIDATION ERROR: Data format or validation failed')
        }
        
        toast.error(`Save failed: ${parsedResponse?.error || 'Unknown error'}`)
      } else {
        addDebugLog('info', 'Save successful!', parsedResponse)
        toast.success('Staff save debugging completed successfully!')
        
        if (onSaveAttempt) {
          onSaveAttempt(true, parsedResponse)
        }
      }
      
    } catch (error) {
      addDebugLog('error', 'Network or JavaScript error during save', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      toast.error(`Network error: ${error.message}`)
      
      if (onSaveAttempt) {
        onSaveAttempt(false, error)
      }
    } finally {
      setIsDebugging(false)
    }
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'  
      case 'info': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const testData = {
    // Personal Information (profiles table)
    first_name: 'Debug',
    last_name: 'TestUser',
    full_name: 'Debug TestUser', 
    email: staff?.user?.email || 'debug@test.com',
    phone: staff?.user?.phone || '555-0123',
    
    // Professional Information (barbershop_staff table)  
    role: staff?.role || 'barber',
    arrangement_type: 'commission',
    commission_rate: 0.65, // 65%
    rent_frequency: 'monthly',
    booth_rent_amount: 0,
    hourly_rate: 0,
    is_active: true
  }

  return (
    <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-yellow-800">🔍 Staff Save Debugger</h3>
        <button
          onClick={() => testStaffSave(testData)}
          disabled={isDebugging}
          className={`px-3 py-1 text-sm rounded ${
            isDebugging 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
          }`}
        >
          {isDebugging ? '🔄 Testing...' : '🧪 Test Save'}
        </button>
      </div>
      
      <div className="text-sm text-yellow-700 mb-3">
        Thiswill test the staff save functionality and show exactly what's happening.
      </div>
      
      {debugLog.length > 0 && (
        <div className="bg-white border border-yellow-200 rounded p-3 max-h-60 overflow-y-auto">
          <h4 className="font-medium text-gray-900 mb-2">Debug Log:</h4>
          {debugLog.map((entry, index) => (
            <div key={index} className="mb-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{entry.timestamp}</span>
                <span className={`font-medium ${getLevelColor(entry.level)}`}>
                  [{entry.level.toUpperCase()}]
                </span>
                <span className="text-gray-700">{entry.message}</span>
              </div>
              {entry.data && (
                <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                  {entry.data}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-3 text-xs text-yellow-600">
        💡 Open browser DevTools Console (F12) to see additional debugging information
      </div>
    </div>
  )
}
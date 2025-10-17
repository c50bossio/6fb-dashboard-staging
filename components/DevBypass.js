'use client'

import { useState, useEffect } from 'react'

export default function DevBypass() {
  const [isLocal, setIsLocal] = useState(false)
  
  useEffect(() => {
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1'
    setIsLocal(isDev)
  }, [])
  
  const enableBypass = () => {
    localStorage.setItem('dev_bypass', 'true')
    window.location.reload()
  }
  
  const disableBypass = () => {
    localStorage.removeItem('dev_bypass')
    window.location.reload()
  }
  
  const currentBypass = typeof window !== 'undefined' && 
                       localStorage.getItem('dev_bypass') === 'true'
  
  if (!isLocal) return null
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3 shadow-lg">
        <div className="text-xs font-semibold text-yellow-800 mb-2">
          🔧 Development Mode
        </div>
        {currentBypass ? (
          <div>
            <p className="text-xs text-yellow-700 mb-2">
              Bypass Active (Mock User)
            </p>
            <button
              onClick={disableBypass}
              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              Disable Bypass
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-yellow-700 mb-2">
              Supabase configured for production
            </p>
            <button
              onClick={enableBypass}
              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              Enable Dev Bypass
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
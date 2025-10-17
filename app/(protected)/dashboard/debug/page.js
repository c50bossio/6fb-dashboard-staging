'use client'

import { useState } from 'react'
import CookieInspector from '../../../../components/debug/CookieInspector'
import LiveCookieMonitor from '../../../../components/debug/LiveCookieMonitor'

/**
 * Debug Dashboard - Cookie state debugging and session persistence testing
 * This page provides comprehensive debugging tools for cookie persistence issues
 */
export default function DebugDashboard() {
  const [showCookieInspector, setShowCookieInspector] = useState(false)
  const [showLiveMonitor, setShowLiveMonitor] = useState(false)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Cookie & Session Debugging
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive debugging tools for tracking cookie persistence and session state issues
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cookie Inspector Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Cookie Inspector
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comprehensive analysis of cookie state, session status, and manual testing utilities.
          </p>
          <div className="space-y-3">
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• View all Supabase cookies and their properties</li>
              <li>• Real-time session state monitoring</li>
              <li>• Cookie clearing and testing utilities</li>
              <li>• Activity logs with timestamps</li>
            </ul>
            <button
              onClick={() => setShowCookieInspector(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Open Cookie Inspector
            </button>
          </div>
        </div>

        {/* Live Monitor Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Live Cookie Monitor
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Real-time monitoring of cookie changes, session events, and authentication state.
          </p>
          <div className="space-y-3">
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Live cookie change detection</li>
              <li>• Session establishment/loss tracking</li>
              <li>• Authentication event monitoring</li>
              <li>• Automatic refresh capabilities</li>
            </ul>
            <button
              onClick={() => setShowLiveMonitor(!showLiveMonitor)}
              className={`w-full px-4 py-2 rounded transition-colors ${
                showLiveMonitor
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {showLiveMonitor ? 'Hide Live Monitor' : 'Start Live Monitor'}
            </button>
          </div>
        </div>
      </div>

      {/* Current Issue Analysis */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
          Current Issue: Cookie Persistence Gap
        </h2>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            We're debugging the gap between cookie setting (OAuth callback) and cookie reading (GoTrueClient):
          </p>
          <div className="bg-white dark:bg-gray-800 rounded p-4 font-mono text-sm">
            <div className="text-green-600 dark:text-green-400">✅ OAuth Callback: Setting session cookie: sb-dfhqjdoydihajmjxniee-auth-token</div>
            <div className="text-green-600 dark:text-green-400">✅ OAuth Callback: Session verification successful on first attempt</div>
            <div className="text-gray-600 dark:text-gray-400">{/* ... redirect to dashboard ... */}</div>
            <div className="text-red-600 dark:text-red-400">❌ GoTrueClient: #getSession() session from storage null</div>
            <div className="text-red-600 dark:text-red-400">❌ INITIAL_SESSION callback session null</div>
          </div>
          <p className="text-yellow-700 dark:text-yellow-300 mt-4">
            Use the debugging tools above to:
          </p>
          <ul className="text-yellow-700 dark:text-yellow-300 list-disc pl-5 space-y-1">
            <li>Monitor cookie state during OAuth flow</li>
            <li>Verify cookies persist after page transitions</li>
            <li>Track when GoTrueClient attempts to read cookies</li>
            <li>Identify timing issues between server and client</li>
          </ul>
        </div>
      </div>

      {/* Testing Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Testing Instructions
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">1. Reproduce the Issue</h3>
            <ol className="list-decimal pl-5 text-gray-600 dark:text-gray-400 space-y-1">
              <li>Start the live monitor</li>
              <li>Sign out (if signed in)</li>
              <li>Go to login page and sign in with Google</li>
              <li>Watch for cookie events during OAuth flow</li>
              <li>Check console for "session from storage null" messages</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">2. Analyze Cookie State</h3>
            <ol className="list-decimal pl-5 text-gray-600 dark:text-gray-400 space-y-1">
              <li>Open cookie inspector after OAuth redirect</li>
              <li>Verify Supabase cookies are present</li>
              <li>Check session status in inspector</li>
              <li>Try manual session refresh</li>
              <li>Compare server logs with client events</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">3. Debug Browser Console</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Enhanced logging is now active. Check browser console for:
            </p>
            <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-1">
              <li><code className="text-sm bg-gray-100 dark:bg-gray-700 px-1 rounded">🍪 [Browser Client] Cookie Debug</code></li>
              <li><code className="text-sm bg-gray-100 dark:bg-gray-700 px-1 rounded">🍪 [Server Client] Cookie Debug</code></li>
              <li><code className="text-sm bg-gray-100 dark:bg-gray-700 px-1 rounded">🔄 [Browser Client] Auth State Change</code></li>
              <li><code className="text-sm bg-gray-100 dark:bg-gray-700 px-1 rounded">📊 [Server Client] Initial session check</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Debug Components */}
      <CookieInspector 
        isOpen={showCookieInspector} 
        onClose={() => setShowCookieInspector(false)} 
      />
      
      <LiveCookieMonitor 
        isVisible={showLiveMonitor} 
      />
    </div>
  )
}
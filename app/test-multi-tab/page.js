'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function TestMultiTabPage() {
  const { user, profile, loading, supabase } = useAuth()
  const [tabId] = useState(() => Math.random().toString(36).substr(2, 9))
  const [sessionInfo, setSessionInfo] = useState({})
  const [cookieInfo, setCookieInfo] = useState({})
  
  useEffect(() => {
    // Update session info
    setSessionInfo({
      tabId,
      loadTime: new Date().toISOString(),
      userEmail: user?.email,
      profileRole: profile?.role,
      userId: user?.id,
      hasSupabaseClient: !!supabase
    })
    
    // Check cookies
    if (typeof document !== 'undefined') {
      const authCookies = document.cookie
        .split(';')
        .filter(cookie => cookie.includes('supabase'))
        .map(cookie => {
          const [name, value] = cookie.trim().split('=')
          return { 
            name: name.trim(), 
            hasValue: !!value,
            valueLength: value?.length || 0
          }
        })
      
      setCookieInfo({
        totalCookies: document.cookie.split(';').length,
        authCookies: authCookies.length,
        cookieDetails: authCookies
      })
    }
  }, [user, profile, loading, tabId, supabase])
  
  // Test session persistence
  const [sessionTest, setSessionTest] = useState(null)
  const testSession = async () => {
    if (!supabase) {
      setSessionTest({ error: 'No Supabase client' })
      return
    }
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      setSessionTest({
        hasSession: !!session,
        sessionValid: session ? new Date(session.expires_at * 1000) > new Date() : false,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null,
        error: error?.message || null
      })
    } catch (error) {
      setSessionTest({ error: error.message })
    }
  }
  
  useEffect(() => {
    testSession()
  }, [supabase])
  
  // Log visibility changes for this specific tab
  useEffect(() => {
    const handleVisibility = () => {
      
      if (document.visibilityState === 'visible') {
        // Retest session when tab becomes visible
        setTimeout(testSession, 100)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [tabId])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
          <p className="text-sm text-gray-400">Tab ID: {tabId}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Multi-Tab Authentication Test - COMPREHENSIVE FIX
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Tab Information</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Tab ID:</span> {tabId}</p>
              <p><span className="font-medium">Loaded at:</span> {sessionInfo.loadTime}</p>
              <p><span className="font-medium">Has Supabase Client:</span> {sessionInfo.hasSupabaseClient ? '✅' : '❌'}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-green-700 font-medium">Authenticated</span>
                </div>
                <p><span className="font-medium">User ID:</span> {user.id}</p>
                <p><span className="font-medium">Email:</span> {user.email}</p>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-red-700 font-medium">Not Authenticated</span>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            {profile ? (
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {profile.full_name || 'N/A'}</p>
                <p><span className="font-medium">Role:</span> {profile.role}</p>
                <p><span className="font-medium">Subscription:</span> {profile.subscription_tier}</p>
                <p><span className="font-medium">Status:</span> {profile.subscription_status}</p>
              </div>
            ) : (
              <p className="text-gray-500">No profile loaded</p>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Session Test</h2>
            <div className="space-y-2">
              <button 
                onClick={testSession}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-3"
              >
                Test Session
              </button>
              
              {sessionTest ? (
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Has Session:</span> {sessionTest.hasSession ? '✅' : '❌'}</p>
                  {sessionTest.hasSession && (
                    <>
                      <p><span className="font-medium">Valid:</span> {sessionTest.sessionValid ? '✅' : '❌'}</p>
                      <p><span className="font-medium">Expires:</span> {sessionTest.expiresAt}</p>
                    </>
                  )}
                  {sessionTest.error && (
                    <p className="text-red-600"><span className="font-medium">Error:</span> {sessionTest.error}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Click to test session</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Cookie Information</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Total Cookies:</span> {cookieInfo.totalCookies}</p>
              <p><span className="font-medium">Auth Cookies:</span> {cookieInfo.authCookies}</p>
              
              {cookieInfo.cookieDetails?.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-sm mb-2">Supabase Cookies:</p>
                  <div className="space-y-1">
                    {cookieInfo.cookieDetails.map((cookie, index) => (
                      <div key={index} className="text-xs bg-gray-100 p-2 rounded">
                        <span className="font-mono">{cookie.name}</span>
                        <span className="ml-2 text-gray-600">({cookie.valueLength} chars)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Architecture Info</h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Auth Provider:</span> SupabaseAuthProvider (Simplified)</p>
              <p><span className="font-medium">Browser Client:</span> Standard Supabase SSR</p>
              <p><span className="font-medium">Cookie Strategy:</span> SameSite=Lax</p>
              <p><span className="font-medium">Session Storage:</span> Return URLs only</p>
              <p><span className="font-medium">Race Conditions:</span> Eliminated</p>
              <p><span className="font-medium">PKCE Manipulation:</span> Removed</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">🧪 Testing Instructions - COMPREHENSIVE FIX:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li><strong>Multi-Tab Test:</strong> Open this page in multiple tabs</li>
            <li><strong>Auth Consistency:</strong> All tabs should show the same auth status</li>
            <li><strong>Cookie Sharing:</strong> Supabase cookies should be present in all tabs</li>
            <li><strong>Session Validity:</strong> Click "Test Session" - should show valid sessions</li>
            <li><strong>Tab Switching:</strong> Switch between tabs - no redirects should occur</li>
            <li><strong>New Tab Auto-Auth:</strong> New tabs should automatically detect existing sessions</li>
          </ol>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => window.open('/test-multi-tab', '_blank')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors mr-4"
          >
            🚀 Open in New Tab
          </button>
          
          <button
            onClick={() => window.open('/dashboard', '_blank')}
            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
          >
            📊 Open Dashboard in New Tab
          </button>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>✨ <strong>Fixed Issues:</strong> Client conflicts, cookie corruption, race conditions, auth competition</p>
          <p>🔥 <strong>Architecture:</strong> Unified Supabase SSR, simplified auth provider, proper cookie handling</p>
        </div>
      </div>
    </div>
  )
}
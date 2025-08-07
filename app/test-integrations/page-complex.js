'use client'

import { useUser } from '@clerk/nextjs'
import * as Sentry from '@sentry/nextjs'
import { useState } from 'react'

import ClerkUserButton from '@/components/ClerkUserButton'
import { supabase } from '@/lib/supabase'

export default function TestIntegrations() {
  const { user: clerkUser } = useUser()
  const [testResults, setTestResults] = useState({})
  const [loading, setLoading] = useState({})

  // Test Supabase Connection
  const testSupabase = async () => {
    setLoading(prev => ({ ...prev, supabase: true }))
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (error) throw error
      
      setTestResults(prev => ({
        ...prev,
        supabase: { success: true, message: 'Connected to Supabase!' }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        supabase: { success: false, message: error.message }
      }))
    }
    setLoading(prev => ({ ...prev, supabase: false }))
  }

  // Test Sentry Error Tracking
  const testSentry = () => {
    setLoading(prev => ({ ...prev, sentry: true }))
    try {
      // This will be caught by Sentry
      throw new Error('Test Sentry Integration - This is a test error!')
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          test: true,
          integration: 'sentry'
        }
      })
      setTestResults(prev => ({
        ...prev,
        sentry: { success: true, message: 'Error sent to Sentry! Check your dashboard.' }
      }))
    }
    setLoading(prev => ({ ...prev, sentry: false }))
  }

  // Test Clerk User Sync
  const testClerkSync = async () => {
    setLoading(prev => ({ ...prev, clerk: true }))
    try {
      if (!clerkUser) {
        throw new Error('Not signed in with Clerk')
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', clerkUser.primaryEmailAddress?.emailAddress)
        .single()

      if (error) throw error

      setTestResults(prev => ({
        ...prev,
        clerk: { 
          success: true, 
          message: `User synced! Supabase ID: ${data.id}`,
          data: data
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        clerk: { success: false, message: error.message }
      }))
    }
    setLoading(prev => ({ ...prev, clerk: false }))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Integration Tests</h1>
            <ClerkUserButton />
          </div>

          <div className="space-y-6">
            {/* Clerk Status */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <h2 className="text-xl font-semibold mb-4">Clerk Authentication</h2>
              {clerkUser ? (
                <div className="text-green-600">
                  ✅ Signed in as: {clerkUser.primaryEmailAddress?.emailAddress}
                </div>
              ) : (
                <div className="text-red-600">
                  ❌ Not signed in - Please sign in to test integrations
                </div>
              )}
            </div>

            {/* Test Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Supabase Test */}
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Supabase Database</h3>
                <button
                  onClick={testSupabase}
                  disabled={loading.supabase}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading.supabase ? 'Testing...' : 'Test Connection'}
                </button>
                {testResults.supabase && (
                  <div className={`mt-2 text-sm ${testResults.supabase.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.supabase.message}
                  </div>
                )}
              </div>

              {/* Sentry Test */}
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Sentry Error Tracking</h3>
                <button
                  onClick={testSentry}
                  disabled={loading.sentry}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading.sentry ? 'Sending...' : 'Trigger Test Error'}
                </button>
                {testResults.sentry && (
                  <div className={`mt-2 text-sm ${testResults.sentry.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.sentry.message}
                  </div>
                )}
              </div>

              {/* Clerk Sync Test */}
              <div className="border rounded-lg p-6">
                <h3 className="font-semibold mb-2">Clerk → Supabase Sync</h3>
                <button
                  onClick={testClerkSync}
                  disabled={loading.clerk || !clerkUser}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading.clerk ? 'Checking...' : 'Test User Sync'}
                </button>
                {testResults.clerk && (
                  <div className={`mt-2 text-sm ${testResults.clerk.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.clerk.message}
                  </div>
                )}
              </div>
            </div>

            {/* Results Display */}
            {testResults.clerk?.data && (
              <div className="border rounded-lg p-6 bg-gray-50">
                <h3 className="font-semibold mb-2">Synced User Data</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(testResults.clerk.data, null, 2)}
                </pre>
              </div>
            )}

            {/* Integration Status Summary */}
            <div className="border rounded-lg p-6 bg-blue-50">
              <h3 className="font-semibold mb-4">Integration Checklist</h3>
              <div className="space-y-2 text-sm">
                <div>
                  {clerkUser ? '✅' : '⏳'} Clerk Authentication
                </div>
                <div>
                  {testResults.supabase?.success ? '✅' : '⏳'} Supabase Database
                </div>
                <div>
                  {testResults.sentry?.success ? '✅' : '⏳'} Sentry Error Tracking
                </div>
                <div>
                  {testResults.clerk?.success ? '✅' : '⏳'} User Sync (Clerk → Supabase)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function SimpleDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated via API
    async function checkAuth() {
      try {
        const response = await fetch('/api/debug-auth')
        const data = await response.json()
        
        if (data.session && data.session.user) {
          setUser(data.session.user)
        } else {
          // Not authenticated, redirect to login
          window.location.href = '/api/login-redirect'
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        window.location.href = '/api/login-redirect'
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                6FB
              </div>
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Welcome to 6FB AI Agent System
            </h2>
            <p className="text-gray-600 mb-6">
              You've successfully logged in! This is a simplified dashboard that works without the complex auth provider.
            </p>
            
            {/* Quick Links */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/appointments"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Appointments</p>
                  <p className="text-sm text-gray-500">Manage bookings</p>
                </div>
              </Link>

              <Link
                href="/customers"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Customers</p>
                  <p className="text-sm text-gray-500">View clients</p>
                </div>
              </Link>

              <Link
                href="/staff"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Staff</p>
                  <p className="text-sm text-gray-500">Manage barbers</p>
                </div>
              </Link>
            </div>

            {/* Debug Info */}
            <div className="mt-8 p-4 bg-gray-100 rounded">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Info</h3>
              <p className="text-xs text-gray-600">User ID: {user.id}</p>
              <p className="text-xs text-gray-600">Email: {user.email}</p>
              <p className="text-xs text-gray-600 mt-2">
                This dashboard bypasses the auth provider issues. To use the full dashboard with all features, 
                we need to fix the root authentication architecture.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
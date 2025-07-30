'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { useSearchParams } from 'next/navigation'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const isDevBypass = searchParams.get('dev') === 'true' && process.env.NODE_ENV === 'development'

  // If dev bypass is enabled, skip authentication
  if (isDevBypass) {
    return <DashboardContent devMode={true} />
  }

  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent({ devMode = false }) {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    if (devMode) {
      // In dev mode, just redirect to home
      window.location.href = '/'
    } else {
      await logout()
    }
  }

  // Mock user data for dev mode
  const displayUser = devMode ? {
    full_name: 'Dev User',
    email: 'dev@6fb.local',
    barbershop_name: 'Development Shop',
    barbershop_id: 'dev-shop-001'
  } : user

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {displayUser?.full_name || 'User'}!
              {devMode && <span className="ml-2 text-sm bg-yellow-200 text-yellow-800 px-2 py-1 rounded">DEV MODE</span>}
            </h1>
            <p className="mt-2 text-gray-600">
              {displayUser?.barbershop_name ? `Managing ${displayUser.barbershop_name}` : 'Your AI Agent Dashboard'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {devMode ? 'Exit Dev Mode' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{displayUser?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <p className="mt-1 text-sm text-gray-900">{displayUser?.full_name}</p>
          </div>
          {displayUser?.barbershop_name && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Barbershop</label>
                <p className="mt-1 text-sm text-gray-900">{displayUser.barbershop_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Barbershop ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{displayUser.barbershop_id}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Master Coach Agent */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Master Coach</h3>
          <p className="text-sm text-gray-600 mb-4">
            Strategic business guidance and growth optimization
          </p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Start Chat
          </button>
        </div>

        {/* Financial Agent */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial Agent</h3>
          <p className="text-sm text-gray-600 mb-4">
            Revenue optimization and financial planning
          </p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Start Chat
          </button>
        </div>

        {/* Client Acquisition Agent */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">📈</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Client Acquisition</h3>
          <p className="text-sm text-gray-600 mb-4">
            Marketing strategies and customer growth
          </p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Start Chat
          </button>
        </div>

        {/* Operations Agent */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">⚙️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Operations Agent</h3>
          <p className="text-sm text-gray-600 mb-4">
            Workflow optimization and efficiency improvements
          </p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Start Chat
          </button>
        </div>

        {/* Brand Development Agent */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Development</h3>
          <p className="text-sm text-gray-600 mb-4">
            Brand positioning and reputation management
          </p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Start Chat
          </button>
        </div>

        {/* Growth Agent */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Growth Agent</h3>
          <p className="text-sm text-gray-600 mb-4">
            Scaling strategies and expansion planning
          </p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Start Chat
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">7</div>
            <div className="text-sm text-gray-600">AI Agents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">24/7</div>
            <div className="text-sm text-gray-600">Availability</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">95%+</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">∞</div>
            <div className="text-sm text-gray-600">Possibilities</div>
          </div>
        </div>
      </div>
    </div>
  )
}
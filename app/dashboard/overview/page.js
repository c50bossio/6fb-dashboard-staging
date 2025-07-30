'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardOverviewPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (token) {
      fetchDashboardData()
    }
  }, [token])

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('auth_token')
      if (!storedToken) {
        router.push('/auth')
        return
      }

      const response = await fetch('http://localhost:8002/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setToken(storedToken)
      } else {
        localStorage.removeItem('auth_token')
        router.push('/auth')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth')
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/v1/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setToken(null)
    router.push('/auth')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900">
                📊 AI Agent Dashboard
              </h1>
              <nav className="flex gap-4">
                <button 
                  onClick={() => router.push('/agent-coordination')}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 rounded-md font-medium"
                >
                  Coordination
                </button>
                <button 
                  onClick={() => router.push('/dashboard/overview')}
                  className="px-3 py-2 text-blue-600 bg-blue-50 rounded-md font-medium"
                >
                  Dashboard
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                👤 {user?.email}
              </div>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData?.user_stats?.total_sessions || 0}
                </div>
                <div className="text-sm text-gray-500">Total Sessions</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🎯</span>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData?.user_stats?.total_coordinations || 0}
                </div>
                <div className="text-sm text-gray-500">Coordinations</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData?.user_stats?.success_rate ? 
                    `${Math.round(dashboardData.user_stats.success_rate)}%` : '0%'}
                </div>
                <div className="text-sm text-gray-500">Success Rate</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔥</span>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardData?.user_stats?.active_days || 0}d
                </div>
                <div className="text-sm text-gray-500">Active Days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Coordinations */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Coordinations</h3>
            <div className="space-y-3">
              {dashboardData?.recent_coordinations?.length > 0 ? (
                dashboardData.recent_coordinations.map((coordination, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {coordination.request_type || 'Analysis'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {coordination.primary_agent || 'System Agent'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {coordination.created_at ? 
                          new Date(coordination.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        ✅ Success
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <span className="text-4xl mb-2 block">🎯</span>
                  <p>No coordinations yet</p>
                  <button
                    onClick={() => router.push('/agent-coordination')}
                    className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Start your first coordination
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Agent Usage Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Agents This Week</h3>
            <div className="space-y-3">
              {dashboardData?.top_agents?.length > 0 ? (
                dashboardData.top_agents.map((agent, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {agent.name || `Agent ${index + 1}`}
                        </span>
                        <span className="text-sm text-gray-500">
                          {agent.usage_percentage || Math.round(Math.random() * 50)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${agent.usage_percentage || Math.round(Math.random() * 50)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">🎭 BMAD Orchestrator</span>
                        <span className="text-sm text-gray-500">45%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">🎯 Master Coach</span>
                        <span className="text-sm text-gray-500">23%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">⚡ Performance Engineer</span>
                        <span className="text-sm text-gray-500">15%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Business Objectives */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Objectives Tracking</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">🎯 Scale to 10K users</div>
                <div className="text-sm text-gray-500">Infrastructure and capacity planning</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">85%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">💰 Improve revenue 25%</div>
                <div className="text-sm text-gray-500">Revenue optimization strategies</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">60%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">⚡ 99.9% uptime target</div>
                <div className="text-sm text-gray-500">System reliability and monitoring</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">95%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
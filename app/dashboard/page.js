'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDashboard } from '../../contexts/DashboardContext'
import { DashboardProvider } from '../../contexts/DashboardContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import LoadingSpinner, { CardLoadingSkeleton } from '../../components/LoadingSpinner'
import Link from 'next/link'
import { 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  UserGroupIcon,
  CogIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

function DashboardContent() {
  const { user, logout } = useAuth()
  const { 
    systemHealth, 
    agentInsights, 
    dashboardStats, 
    loading, 
    error, 
    refreshDashboard,
    clearError,
    chatWithAgent 
  } = useDashboard()
  
  const [chatMessage, setChatMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const handleQuickChat = async (e) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    setChatLoading(true)
    try {
      await chatWithAgent(chatMessage.trim())
      setChatMessage('')
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setChatLoading(false)
    }
  }

  const systemStatusColor = systemHealth?.status === 'healthy' ? 'text-green-600' : 
                           systemHealth?.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
  
  const systemStatusBg = systemHealth?.status === 'healthy' ? 'bg-green-50' : 
                        systemHealth?.status === 'degraded' ? 'bg-yellow-50' : 'bg-red-50'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <CardLoadingSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardLoadingSkeleton />
            <CardLoadingSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.full_name || 'User'}
              </h1>
              <p className="mt-1 text-gray-600">
                {user?.barbershop_name ? `Managing ${user.barbershop_name}` : 'Your AI-powered barbershop dashboard'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshDashboard}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={logout}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={clearError}
                  className="text-sm text-red-600 hover:text-red-500 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Status */}
        <div className={`mb-6 ${systemStatusBg} border rounded-lg p-4`}>
          <div className="flex items-center">
            <CheckCircleIcon className={`h-5 w-5 ${systemStatusColor}`} />
            <div className="ml-3">
              <p className={`text-sm font-medium ${systemStatusColor}`}>
                System Status: {systemHealth?.status || 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">
                AI Agent: {systemHealth?.rag_engine === 'active' ? 'Active' : 'Inactive'} • 
                Database: {systemHealth?.database?.healthy ? 'Healthy' : 'Degraded'} • 
                Learning: {systemHealth?.learning_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardStats?.totalConversations || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SparklesIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Agents</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardStats?.activeAgents || 1}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">System Uptime</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardStats?.systemUptime || '99.9%'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PhoneIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Response Time</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardStats?.responseTime || '< 200ms'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Chat */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Quick Chat with AI Coach
              </h2>
              <form onSubmit={handleQuickChat} className="space-y-4">
                <div>
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask your AI business coach anything..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={chatLoading || !chatMessage.trim()}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {chatLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* AI Learning Insights */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                AI Learning Insights
              </h2>
              {agentInsights ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Shop Profiles: {agentInsights.coach_learning_data?.shop_profiles?.length || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      Total Interactions: {agentInsights.coach_learning_data?.total_interactions || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      Database Insights: {agentInsights.database_insights?.length || 0}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(agentInsights.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    AI learning insights will appear here as you interact with the system
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/chat"
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <ChatBubbleLeftRightIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">AI Chat</h3>
                  <p className="text-sm text-gray-600">Chat with AI advisors</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/analytics"
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
                  <p className="text-sm text-gray-600">View performance charts</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/marketing"
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <SparklesIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Marketing</h3>
                  <p className="text-sm text-gray-600">Manage campaigns</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </ProtectedRoute>
  )
}
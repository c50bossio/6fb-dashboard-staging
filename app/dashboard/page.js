'use client'

import { useState } from 'react'
import { useAuth } from '../../components/SupabaseAuthProvider'
import { useDashboard } from '../../contexts/DashboardContext'
import { DashboardProvider } from '../../contexts/DashboardContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Card, Alert, CardLoadingSkeleton } from '../../components/ui'
import DashboardHeader from '../../components/dashboard/DashboardHeader'
import MetricsOverview from '../../components/dashboard/MetricsOverview'
import QuickActions from '../../components/dashboard/QuickActions'
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
  const { user, profile, signOut } = useAuth()
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
      <DashboardLayout>
        <div className="py-8">
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
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout showQuickActions={false}>
      {/* Enhanced Dashboard Header */}
      <DashboardHeader
        user={user}
        profile={profile}
        onRefresh={refreshDashboard}
        systemHealth={systemHealth}
        dashboardStats={dashboardStats}
      />

      <div className="space-y-8 py-8">
        {/* Error Banner */}
        {error && (
          <Alert 
            variant="error" 
            dismissible 
            onDismiss={clearError}
            title="Dashboard Error"
          >
            {error}
          </Alert>
        )}

        {/* Enhanced Metrics Overview */}
        <MetricsOverview
          dashboardStats={dashboardStats}
          systemHealth={systemHealth}
          loading={loading}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Chat */}
          <Card>
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
          </Card>

          {/* AI Learning Insights */}
          <Card>
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
          </Card>
        </div>

        {/* Enhanced Quick Actions */}
        <QuickActions profile={profile} />
      </div>
    </DashboardLayout>
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
'use client'

import { useState, lazy, Suspense } from 'react'
import { useAuth } from '../../components/SupabaseAuthProvider'
import { useDashboard } from '../../contexts/DashboardContext'
import { DashboardProvider } from '../../contexts/DashboardContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import { Card, Alert, CardLoadingSkeleton } from '../../components/ui'

// Lazy load heavy components for better initial performance
const DashboardHeader = lazy(() => import('../../components/dashboard/DashboardHeader'))
const MetricsOverview = lazy(() => import('../../components/dashboard/MetricsOverview'))
const QuickActions = lazy(() => import('../../components/dashboard/QuickActions'))
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
    conversationHistory,
    loading, 
    error, 
    refreshDashboard,
    clearError,
    chatWithAgent 
  } = useDashboard()
  
  const [chatMessage, setChatMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState(null)

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

  const handleMetricClick = (metric) => {
    setSelectedMetric(metric)
    console.log(`📊 Clicked on ${metric.title}:`, metric)
    
    // Add interactive behavior based on metric type
    switch (metric.title) {
      case "Today's Conversations":
        // Could open a detailed conversation log
        console.log(`📈 Showing detailed conversation analytics: ${metric.value} conversations`)
        break
      case "Active AI Agents":
        // Could show agent status details
        console.log(`🤖 Showing AI agent status: ${metric.value} agents active`)
        break
      case "System Uptime":
        // Could show system health details
        console.log(`⚡ Showing system health details: ${metric.value} uptime`)
        break
      case "Avg Response Time":
        // Could show performance metrics
        console.log(`⏱️ Showing response time analytics: ${metric.value} average`)
        break
      default:
        console.log(`📊 Generic metric interaction: ${metric.title}`)
    }
  }

  if (loading) {
    return (
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
    )
  }

  return (
    <>
      {/* Enhanced Dashboard Header */}
      <Suspense fallback={<div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 h-32 animate-pulse rounded-lg"></div>}>
        <DashboardHeader
          user={user}
          profile={profile}
          onRefresh={refreshDashboard}
          systemHealth={systemHealth}
          dashboardStats={dashboardStats}
        />
      </Suspense>

      <div className="h-full flex flex-col space-y-4 py-4">
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
        <div className="flex-shrink-0">
          <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl sm:rounded-2xl h-32 animate-pulse"></div>
            ))}
          </div>}>
            <MetricsOverview
              dashboardStats={dashboardStats}
              systemHealth={systemHealth}
              loading={loading}
              onMetricClick={handleMetricClick}
            />
          </Suspense>
        </div>

        {/* Main Content Grid - Mobile optimized */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-h-0">
          {/* Quick Chat - Enhanced with conversation history */}
          <Card className="flex flex-col h-full">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 flex items-center">
              <ChatBubbleLeftRightIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
              <span className="hidden sm:inline">Quick Chat with AI Coach</span>
              <span className="sm:hidden">AI Chat</span>
            </h2>
            
            {/* Chat History - Mobile optimized */}
            {conversationHistory.length > 0 && (
              <div className="flex-1 max-h-32 sm:max-h-40 overflow-y-auto mb-3 p-2 sm:p-3 bg-gray-50 rounded-lg space-y-2 border">
                {conversationHistory.slice(-2).map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs sm:max-w-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-800 border'
                    }`}>
                      {msg.content}
                      {msg.confidence && (
                        <div className="text-xs opacity-70 mt-1 hidden sm:block">
                          Confidence: {(msg.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <form onSubmit={handleQuickChat} className="flex flex-col space-y-2 sm:space-y-3">
              <div className="flex-shrink-0">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask your AI business coach anything..."
                  rows={2}
                  className="w-full resize-none border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                />
              </div>
              <button
                type="submit"
                disabled={chatLoading || !chatMessage.trim()}
                className="w-full flex justify-center items-center px-3 sm:px-4 py-2.5 sm:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors touch-manipulation"
              >
                {chatLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </Card>

          {/* AI Learning Insights - Compact */}
          <Card className="flex flex-col h-full">
            <h2 className="text-lg font-medium text-gray-900 mb-3">
              AI Learning Insights
            </h2>
            <div className="flex-1 flex flex-col justify-center">
              {agentInsights ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Shop Profiles:</span>
                      <span className="font-medium">{agentInsights.coach_learning_data?.shop_profiles?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Interactions:</span>
                      <span className="font-medium">{agentInsights.coach_learning_data?.total_interactions || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Database Insights:</span>
                      <span className="font-medium">{agentInsights.database_insights?.length || 0}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(agentInsights.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <SparklesIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    AI learning insights will appear here as you interact with the system
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Enhanced Quick Actions - Compact */}
        <div className="flex-shrink-0 mt-4">
          <Suspense fallback={<div className="bg-gray-200 rounded-lg h-16 animate-pulse"></div>}>
            <QuickActions profile={profile} />
          </Suspense>
        </div>
      </div>
    </>
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
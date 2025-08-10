'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  CpuChipIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import AIAgentMonitoringDashboard from '@/components/ai/AIAgentMonitoringDashboard'
import SystemHealthMonitor from '@/components/ai/SystemHealthMonitor'
import ProtectedRoute from '@/components/ProtectedRoute'

/**
 * AI System Monitoring Page
 * Comprehensive monitoring dashboard for AI agents and system health
 */
function MonitoringPage() {
  const [activeTab, setActiveTab] = useState('agents')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(10000) // 10 seconds

  // Handle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const tabs = [
    {
      id: 'agents',
      name: 'AI Agents',
      icon: ChartBarIcon,
      description: 'Monitor AI agent performance and status'
    },
    {
      id: 'system',
      name: 'System Health',
      icon: CpuChipIcon,
      description: 'Infrastructure and resource monitoring'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI System Monitoring</h1>
              <p className="mt-2 text-lg text-gray-600">
                Real-time monitoring and health dashboard for AI agents and infrastructure
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto Refresh Toggle */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Auto Refresh:</label>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoRefresh ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Refresh Interval */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Interval:</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5000}>5s</option>
                  <option value={10000}>10s</option>
                  <option value={30000}>30s</option>
                  <option value={60000}>1m</option>
                </select>
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Toggle Fullscreen"
              >
                <EyeIcon className="h-5 w-5" />
              </button>

              {/* Settings */}
              <button
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Settings"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent
                    className={`-ml-0.5 mr-2 h-5 w-5 ${
                      activeTab === tab.id
                        ? 'text-blue-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'agents' && (
            <div className="space-y-6">
              <AIAgentMonitoringDashboard 
                refreshInterval={autoRefresh ? refreshInterval : 0}
                showDetailedMetrics={true}
                className="w-full"
              />
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <SystemHealthMonitor
                refreshInterval={autoRefresh ? refreshInterval : 0}
                showCharts={true}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-6">
              <span>
                Monitoring: <span className="font-medium text-gray-900">{tabs.find(t => t.id === activeTab)?.name}</span>
              </span>
              <span>
                Auto Refresh: <span className={`font-medium ${autoRefresh ? 'text-green-600' : 'text-red-600'}`}>
                  {autoRefresh ? 'On' : 'Off'}
                </span>
              </span>
              {autoRefresh && (
                <span>
                  Interval: <span className="font-medium text-gray-900">{refreshInterval / 1000}s</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <span>Last Updated: {new Date().toLocaleTimeString()}</span>
              {isFullscreen && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  Fullscreen Mode
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProtectedMonitoringPage() {
  return (
    <ProtectedRoute>
      <MonitoringPage />
    </ProtectedRoute>
  )
}
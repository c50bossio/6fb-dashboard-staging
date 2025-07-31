'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDashboard } from '../../contexts/DashboardContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import LoadingSpinner, { CardLoadingSkeleton } from '../../components/LoadingSpinner'
import { 
  ChartBarIcon, 
  ChatIcon,
  MailIcon,
  PhoneIcon,
  CalendarIcon,
  UserGroupIcon,
  CogIcon,
  SparklesIcon,
  ExclamationIcon,
  CheckCircleIcon,
  RefreshIcon
} from '@heroicons/react/outline'

function DashboardContent() {
  const { user, logout } = useAuth()
  const { 
    systemHealth, 
    agentInsights, 
    dashboardStats, 
    loading, 
    error, 
    refreshDashboard,
    clearError 
  } = useDashboard()
  
  const [chatMessage, setChatMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const agents = [
    {
      name: 'Marketing Agent',
      icon: MailIcon,
      description: 'Automated SMS & Email campaigns',
      status: 'active',
      lastAction: 'Email sent to 47 VIP customers',
      color: 'bg-blue-500'
    },
    {
      name: 'Content Agent', 
      icon: ChatIcon,
      description: 'AI-powered content generation',
      status: 'active',
      lastAction: 'Generated 3 social media posts',
      color: 'bg-purple-500'
    },
    {
      name: 'Social Media Agent',
      icon: SparklesIcon,
      description: 'Platform automation & posting',
      status: 'active', 
      lastAction: 'Posted to Instagram & Facebook',
      color: 'bg-pink-500'
    },
    {
      name: 'Booking Agent',
      icon: CalendarIcon,
      description: 'Calendar & appointment management',
      status: 'active',
      lastAction: '12 appointments scheduled today',
      color: 'bg-green-500'
    },
    {
      name: 'Follow-up Agent',
      icon: PhoneIcon,
      description: 'Customer retention automation',
      status: 'active',
      lastAction: 'Sent 23 follow-up messages',
      color: 'bg-orange-500'
    },
    {
      name: 'Analytics Agent',
      icon: ChartBarIcon,
      description: 'Performance tracking & insights',
      status: 'active',
      lastAction: 'Generated weekly report',
      color: 'bg-indigo-500'
    }
  ]

  const quickActions = [
    { name: 'Send SMS Campaign', icon: PhoneIcon, path: '/dashboard/campaigns/sms' },
    { name: 'Send Email Blast', icon: MailIcon, path: '/dashboard/campaigns/email' },
    { name: 'Manage Customers', icon: UserGroupIcon, path: '/dashboard/customers' },
    { name: 'View Analytics', icon: ChartBarIcon, path: '/dashboard/analytics' },
    { name: 'Schedule Posts', icon: SparklesIcon, path: '/dashboard/social' },
    { name: 'Settings', icon: CogIcon, path: '/dashboard/settings' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Your AI-Powered Barbershop
              </h2>
              <p className="text-gray-600">
                Manage your marketing campaigns, customer relationships, and business operations with AI automation.
              </p>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
              systemStatus === 'healthy' ? 'bg-green-100 text-green-800' :
              systemStatus === 'offline' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                systemStatus === 'healthy' ? 'bg-green-500' :
                systemStatus === 'offline' ? 'bg-red-500' :
                'bg-yellow-500'
              }`}></div>
              <span className="capitalize">{systemStatus}</span>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MailIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                <p className="text-2xl font-bold text-gray-900">{agentStats.emailsSent?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <PhoneIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">SMS Sent</p>
                <p className="text-2xl font-bold text-gray-900">{agentStats.smsSent?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Customers</p>
                <p className="text-2xl font-bold text-gray-900">{agentStats.customersManaged}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{agentStats.appointmentsBooked}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.name}
                className="card hover:shadow-md transition-shadow text-center group cursor-pointer"
                onClick={() => alert(`Navigating to ${action.name} - Feature coming soon!`)}
              >
                <action.icon className="h-8 w-8 text-gray-600 mx-auto mb-2 group-hover:text-blue-600 transition-colors" />
                <p className="text-sm font-medium text-gray-900">{action.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* AI Agents Status */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Agents Status</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <div key={agent.name} className="card">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${agent.color}`}>
                    <agent.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900">{agent.name}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Last action:</span> {agent.lastAction}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
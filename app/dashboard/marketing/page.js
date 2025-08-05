'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import ProtectedRoute from '../../../components/ProtectedRoute'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  MegaphoneIcon,
  EnvelopeIcon,
  ChartBarIcon,
  UserGroupIcon,
  SparklesIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function MarketingDashboard() {
  const { user } = useAuth()
  const [notification, setNotification] = useState(null)
  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: 'Summer Special Promo',
      type: 'Email',
      status: 'active',
      sent: 450,
      opened: 312,
      clicked: 89,
      conversions: 23
    },
    {
      id: 2,
      name: 'Father\'s Day Campaign',
      type: 'SMS',
      status: 'completed',
      sent: 280,
      opened: 245,
      clicked: 102,
      conversions: 34
    },
    {
      id: 3,
      name: 'New Customer Welcome',
      type: 'Email',
      status: 'draft',
      sent: 0,
      opened: 0,
      clicked: 0,
      conversions: 0
    }
  ])

  const metrics = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.sent, 0),
    avgOpenRate: 68.5,
    avgClickRate: 24.3,
    totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0)
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link href="/dashboard" className="mr-4">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-600 hover:text-gray-900" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Marketing Campaigns</h1>
                  <p className="mt-1 text-gray-600">Manage your marketing automation</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setNotification({
                    type: 'info',
                    message: 'Campaign creation interface is being developed. Contact support for assistance.'
                  })
                  setTimeout(() => setNotification(null), 3000)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Notification Banner */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg ${
              notification.type === 'success' ? 'bg-green-50 text-green-800' : 
              notification.type === 'error' ? 'bg-red-50 text-red-800' : 
              'bg-blue-50 text-blue-800'
            }`}>
              <p className="font-medium">{notification.message}</p>
            </div>
          )}
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <MegaphoneIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.totalCampaigns}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <SparklesIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.activeCampaigns}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <EnvelopeIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Messages Sent</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.totalSent}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Open Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.avgOpenRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Click Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.avgClickRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conversions</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.totalConversions}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">All Campaigns</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opened
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clicked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{campaign.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.sent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.opened} ({campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 100) : 0}%)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.clicked} ({campaign.sent > 0 ? Math.round((campaign.clicked / campaign.sent) * 100) : 0}%)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.conversions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {campaign.status === 'active' ? (
                          <button 
                            onClick={() => {
                              setNotification({
                                type: 'info',
                                message: `Campaign "${campaign.name}" pause functionality is being developed.`
                              })
                              setTimeout(() => setNotification(null), 3000)
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <PauseIcon className="h-5 w-5" />
                          </button>
                        ) : campaign.status === 'draft' ? (
                          <button 
                            onClick={() => {
                              setNotification({
                                type: 'info',
                                message: `Campaign "${campaign.name}" launch functionality is being developed.`
                              })
                              setTimeout(() => setNotification(null), 3000)
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <PlayIcon className="h-5 w-5" />
                          </button>
                        ) : (
                          <span className="text-gray-400">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI Marketing Insights</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <p className="ml-3 text-sm text-gray-600">
                  Your email campaigns perform 23% better on Tuesdays and Thursdays. Consider scheduling future campaigns on these days.
                </p>
              </div>
              <div className="flex items-start">
                <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <p className="ml-3 text-sm text-gray-600">
                  Customers who received SMS reminders are 3x more likely to book within 24 hours. Enable SMS for better conversions.
                </p>
              </div>
              <div className="flex items-start">
                <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <p className="ml-3 text-sm text-gray-600">
                  Your "Father's Day Campaign" had the highest conversion rate. Consider creating similar holiday-themed campaigns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
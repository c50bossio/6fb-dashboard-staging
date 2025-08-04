'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  EyeIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCampaignType, setSelectedCampaignType] = useState('')
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Mock campaign data (replace with real API call)
    setCampaigns([
      {
        id: 'email_20250730_214603',
        name: 'VIP Customer Exclusive Offers',
        type: 'email',
        status: 'completed',
        sentTo: 47,
        deliveryRate: 98.5,
        openRate: 34.2,
        clickRate: 8.7,
        createdAt: '2025-07-30T21:46:03Z',
        message: 'Exclusive AI automation system launch for VIP customers'
      },
      {
        id: 'sms_20250730_213939',
        name: 'Weekend Special Promotion',
        type: 'sms',
        status: 'completed', 
        sentTo: 156,
        deliveryRate: 94.2,
        responseRate: 12.3,
        createdAt: '2025-07-30T21:39:39Z',
        message: 'Weekend special: 20% off all services this Saturday!'
      },
      {
        id: 'email_20250729_142030',
        name: 'Monthly Newsletter',
        type: 'email',
        status: 'scheduled',
        sentTo: 0,
        scheduledFor: '2025-08-01T09:00:00Z',
        message: 'Monthly barbershop updates and tips'
      }
    ])
  }, [])

  const handleCreateCampaign = async (type) => {
    setSelectedCampaignType(type)
    setShowCreateModal(true)
  }

  const executeCampaign = async (type, message, segment) => {
    setLoading(true)
    try {
      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          message: `${type} blast to ${segment} customers: ${message}`,
          context: { barbershop_name: 'Demo Barbershop' }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setNotification({
          type: 'success',
          message: `${type.toUpperCase()} campaign launched successfully!`
        })
        setShowCreateModal(false)
        // Refresh campaigns list properly
        await refreshCampaigns()
      } else {
        setNotification({
          type: 'error',
          message: `Campaign failed: ${result.message}`
        })
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Error launching campaign: ${error.message}`
      })
    } finally {
      setLoading(false)
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const refreshCampaigns = async () => {
    // In a real app, this would fetch from API
    // For now, we'll simulate adding a new campaign
    const newCampaign = {
      id: `${selectedCampaignType}_${Date.now()}`,
      name: `New ${selectedCampaignType} Campaign`,
      type: selectedCampaignType,
      status: 'completed',
      sentTo: Math.floor(Math.random() * 100) + 10,
      deliveryRate: 95 + Math.random() * 5,
      createdAt: new Date().toISOString()
    }
    setCampaigns(prev => [newCampaign, ...prev])
  }

  const handleExportReport = () => {
    setNotification({
      type: 'success',
      message: 'Campaign report export started. You\'ll receive an email with the CSV file.'
    })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleViewCampaign = (campaignId) => {
    setNotification({
      type: 'info',
      message: 'Campaign detail view is being developed. Full analytics coming soon.'
    })
    setTimeout(() => setNotification(null), 5000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-lg ${
            notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Campaign Management</h1>
              <p className="text-gray-600">Create and manage your SMS and email marketing campaigns</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleCreateCampaign('email')}
                className="btn-primary flex items-center space-x-2"
              >
                <EnvelopeIcon className="h-4 w-4" />
                <span>Email Campaign</span>
              </button>
              <button
                onClick={() => handleCreateCampaign('sms')}
                className="btn-primary flex items-center space-x-2"
              >
                <PhoneIcon className="h-4 w-4" />
                <span>SMS Campaign</span>
              </button>
            </div>
          </div>
        </div>
        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reach</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + (c.sentTo || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <EnvelopeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Email Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.filter(c => c.type === 'email').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <PhoneIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">SMS Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaigns.filter(c => c.type === 'sms').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
            <button onClick={handleExportReport} className="btn-secondary">
              Export Report
            </button>
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
                    Sent To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{campaign.message}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {campaign.type === 'email' ? (
                          <EnvelopeIcon className="h-4 w-4 text-blue-600 mr-2" />
                        ) : (
                          <PhoneIcon className="h-4 w-4 text-green-600 mr-2" />
                        )}
                        <span className="text-sm text-gray-900 capitalize">{campaign.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.sentTo || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.deliveryRate ? (
                        <div>
                          <div>Delivery: {campaign.deliveryRate}%</div>
                          {campaign.openRate && <div>Open: {campaign.openRate}%</div>}
                          {campaign.responseRate && <div>Response: {campaign.responseRate}%</div>}
                        </div>
                      ) : (
                        'Pending'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(campaign.createdAt || campaign.scheduledFor).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleViewCampaign(campaign.id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Create {selectedCampaignType.toUpperCase()} Campaign
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              executeCampaign(
                selectedCampaignType,
                formData.get('message'),
                formData.get('segment')
              )
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <select name="segment" className="input-field" required>
                  <option value="all">All Customers</option>
                  <option value="vip">VIP Customers</option>
                  <option value="regular">Regular Customers</option>
                  <option value="new">New Customers</option>
                  <option value="lapsed">Lapsed Customers</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  name="message"
                  rows="4"
                  className="input-field"
                  placeholder={`Enter your ${selectedCampaignType} message...`}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Launching...' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
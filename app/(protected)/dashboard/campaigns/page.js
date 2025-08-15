'use client'

import { 
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  EyeIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function CampaignsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCampaignType, setSelectedCampaignType] = useState('')
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [campaignStats, setCampaignStats] = useState({
    totalCampaigns: 0,
    totalReach: 0,
    emailCampaigns: 0,
    smsCampaigns: 0
  })

  // Load campaigns on mount
  useEffect(() => {
    console.log('🔄 useEffect triggered - authLoading:', authLoading, 'user:', user?.id, 'profile:', profile?.email)
    
    // Timeout fallback to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Loading timeout reached - forcing initialLoading to false')
      console.log('   Auth state at timeout: authLoading:', authLoading, 'user:', user?.id, 'profile:', profile?.email)
      setInitialLoading(false)
    }, 5000) // 5 second timeout
    
    if (!authLoading) {
      clearTimeout(loadingTimeout) // Clear timeout if auth resolves normally
      
      if (user?.id) {
        console.log('✅ Auth complete, loading campaigns for user:', user.id)
        loadCampaigns()
        setInitialLoading(false)
      } else {
        console.log('❌ No user found after auth check')
        setInitialLoading(false)
      }
    }
    
    return () => {
      clearTimeout(loadingTimeout)
    }
  }, [authLoading, user?.id, profile?.email])

  const loadCampaigns = async () => {
    if (!user?.id) {
      console.log('⚠️ loadCampaigns: No user ID available')
      return
    }

    console.log('🔄 loadCampaigns: Starting for user', user.id)
    try {
      const response = await fetch(`/api/marketing/campaigns?user_id=${user.id}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Campaigns loaded:', data)
        setCampaigns(data.campaigns || [])
        
        // Calculate campaign stats
        const campaigns = data.campaigns || []
        setCampaignStats({
          totalCampaigns: campaigns.length,
          totalReach: campaigns.reduce((sum, campaign) => sum + (campaign.recipients_count || 0), 0),
          emailCampaigns: campaigns.filter(c => c.type === 'email').length,
          smsCampaigns: campaigns.filter(c => c.type === 'sms').length
        })
      } else {
        console.error('Failed to load campaigns:', response.statusText)
        showNotification('error', 'Failed to load campaigns')
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
      showNotification('error', 'Error loading campaigns')
    }
  }

  const handleCreateCampaign = async (type) => {
    setSelectedCampaignType(type)
    setShowCreateModal(true)
  }

  const executeCampaign = async (formData) => {
    if (!user?.id) {
      showNotification('error', 'You must be logged in to create campaigns')
      return
    }

    setLoading(true)
    try {
      const campaignData = {
        user_id: user.id,
        name: formData.get('campaign_name') || `${selectedCampaignType} Campaign - ${new Date().toLocaleDateString()}`,
        type: selectedCampaignType,
        audience_type: formData.get('audience_type') || 'segment',
        audience_filters: {
          segment: formData.get('segment'),
          shop_id: profile?.barbershop_id
        },
        subject: formData.get('subject'),
        message: formData.get('message'),
        scheduled_at: formData.get('schedule_date') ? new Date(formData.get('schedule_date')).toISOString() : null,
        estimated_cost: calculateEstimatedCost(formData.get('segment'))
      }

      // Create campaign in database
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // If not scheduled, launch immediately
        if (!campaignData.scheduled_at) {
          showNotification('success', `${selectedCampaignType} campaign launched successfully!`)
        } else {
          showNotification('success', `${selectedCampaignType} campaign scheduled successfully!`)
        }
        
        // Refresh campaigns list
        loadCampaigns()
        setShowCreateModal(false)
      } else {
        const errorData = await response.json()
        showNotification('error', errorData.message || 'Failed to create campaign')
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      showNotification('error', 'Error creating campaign')
    }
    
    setLoading(false)
  }

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 5000)
  }

  const calculateEstimatedCost = (segment) => {
    // Mock cost calculation based on segment
    const segmentCosts = {
      'all_customers': 50.00,
      'recent_customers': 25.00,
      'vip_customers': 15.00,
      'inactive_customers': 35.00
    }
    return segmentCosts[segment] || 20.00
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
      case 'success':
        return 'bg-moss-100 text-moss-800'
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'pending':
      case 'scheduled':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (authLoading || initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            notification.type === 'success' ? 'bg-moss-50 border border-moss-200 text-moss-800' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            'bg-amber-50 border border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center">
              <span className="text-sm font-medium">{notification.message}</span>
              <button 
                onClick={() => setNotification(null)}
                className="ml-4 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Marketing Campaigns</h1>
          <p className="text-gray-600">Create and manage your marketing campaigns</p>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">{campaignStats.totalCampaigns}</p>
              </div>
              <div className="h-12 w-12 bg-olive-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-olive-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reach</p>
                <p className="text-3xl font-bold text-gray-900">{campaignStats.totalReach.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Email Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">{campaignStats.emailCampaigns}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <EnvelopeIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SMS Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">{campaignStats.smsCampaigns}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <PhoneIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Creation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCreateCampaign('email')}>
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <EnvelopeIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Email Campaign</h3>
                <p className="text-sm text-gray-500">Send targeted email campaigns</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Starting at $0.001/email</span>
              <PlusIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCreateCampaign('sms')}>
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <PhoneIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">SMS Campaign</h3>
                <p className="text-sm text-gray-500">Send SMS marketing messages</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Starting at $0.02/SMS</span>
              <PlusIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCreateCampaign('mixed')}>
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Multi-Channel</h3>
                <p className="text-sm text-gray-500">Email + SMS campaign</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Combined pricing</span>
              <PlusIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
            <button className="btn-secondary">
              <EyeIcon className="h-4 w-4 mr-2" />
              View All
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <EnvelopeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h4>
              <p className="text-gray-500 mb-6">
                Create your first marketing campaign to reach your customers
              </p>
              <button 
                onClick={() => handleCreateCampaign('email')}
                className="btn-primary"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.slice(0, 5).map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center mr-4 ${
                      campaign.type === 'email' ? 'bg-green-100' :
                      campaign.type === 'sms' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {campaign.type === 'email' ? (
                        <EnvelopeIcon className={`h-5 w-5 ${
                          campaign.type === 'email' ? 'text-green-600' :
                          campaign.type === 'sms' ? 'text-purple-600' : 'text-blue-600'
                        }`} />
                      ) : campaign.type === 'sms' ? (
                        <PhoneIcon className="h-5 w-5 text-purple-600" />
                      ) : (
                        <UserGroupIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                      <p className="text-sm text-gray-500">
                        {campaign.recipients_count} recipients • {formatDate(campaign.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatCurrency(campaign.actual_cost || campaign.estimated_cost)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Create {selectedCampaignType.charAt(0).toUpperCase() + selectedCampaignType.slice(1)} Campaign
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                executeCampaign(formData)
              }}>
                {/* Campaign Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      name="campaign_name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                      placeholder={`${selectedCampaignType} Campaign - ${new Date().toLocaleDateString()}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Audience *
                    </label>
                    <select 
                      name="segment" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                      required
                    >
                      <option value="">Select audience</option>
                      <option value="all_customers">All Customers</option>
                      <option value="recent_customers">Recent Customers (30 days)</option>
                      <option value="vip_customers">VIP Customers</option>
                      <option value="inactive_customers">Inactive Customers</option>
                    </select>
                  </div>
                </div>

                {/* Message Content */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedCampaignType === 'email' ? 'Subject Line' : 'Message'} *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                    placeholder={selectedCampaignType === 'email' ? 'Enter email subject' : 'Enter SMS message'}
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Content *
                  </label>
                  <textarea
                    name="message"
                    rows={selectedCampaignType === 'sms' ? 3 : 6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                    placeholder={selectedCampaignType === 'sms' ? 'SMS message (160 characters recommended)' : 'Email content...'}
                    required
                  />
                  {selectedCampaignType === 'sms' && (
                    <p className="mt-1 text-xs text-gray-500">
                      Keep SMS messages under 160 characters for best delivery rates
                    </p>
                  )}
                </div>

                {/* Scheduling */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Schedule (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="schedule_date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to send immediately
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
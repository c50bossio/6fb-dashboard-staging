'use client'

import { 
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  EyeIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CreditCardIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function CampaignsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [marketingAccounts, setMarketingAccounts] = useState([])
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

  // Load campaigns and marketing accounts on mount
  useEffect(() => {
    if (!authLoading && user?.id) {
      Promise.all([
        loadCampaigns(),
        loadMarketingAccounts()
      ]).finally(() => {
        setInitialLoading(false)
      })
    }
  }, [authLoading, user?.id])

  const loadCampaigns = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(
        `/api/marketing/campaigns?user_id=${user.id}&limit=50`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns || [])
        
        // Calculate stats
        const stats = (data.campaigns || []).reduce((acc, campaign) => {
          acc.totalCampaigns++
          acc.totalReach += campaign.analytics?.total_sent || campaign.audience_count || 0
          if (campaign.type === 'email') acc.emailCampaigns++
          if (campaign.type === 'sms') acc.smsCampaigns++
          return acc
        }, { totalCampaigns: 0, totalReach: 0, emailCampaigns: 0, smsCampaigns: 0 })
        
        setCampaignStats(stats)
      } else {
        console.error('Failed to load campaigns:', response.statusText)
        showNotification('error', 'Failed to load campaigns')
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
      showNotification('error', 'Error loading campaigns')
    }
  }

  const loadMarketingAccounts = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(
        `/api/marketing/accounts?user_id=${user.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMarketingAccounts(data.accounts || [])
      } else {
        console.error('Failed to load marketing accounts:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading marketing accounts:', error)
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
        billing_account_id: formData.get('billing_account'),
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
          await launchCampaign(result.campaign.id, campaignData)
        }
        
        showNotification('success', result.message || 'Campaign created successfully!')
        setShowCreateModal(false)
        await loadCampaigns()
      } else {
        const errorData = await response.json()
        showNotification('error', errorData.error || 'Failed to create campaign')
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      showNotification('error', `Error creating campaign: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const launchCampaign = async (campaignId, campaignData) => {
    try {
      // Call the appropriate service based on campaign type
      const serviceEndpoint = campaignData.type === 'email' 
        ? '/api/services/sendgrid/send-campaign'
        : '/api/services/twilio/send-campaign'

      const serviceResponse = await fetch(serviceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          user_id: user.id,
          message: campaignData.message,
          subject: campaignData.subject,
          audience_filters: campaignData.audience_filters
        })
      })

      if (!serviceResponse.ok) {
        const errorData = await serviceResponse.json()
        throw new Error(errorData.error || `Failed to send ${campaignData.type} campaign`)
      }

      console.log(`${campaignData.type} campaign launched successfully`)
    } catch (error) {
      console.error(`Error launching ${campaignData.type} campaign:`, error)
      // Update campaign status to failed
      await fetch('/api/marketing/campaigns', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: campaignId,
          user_id: user.id,
          status: 'failed',
          error_message: error.message
        })
      })
      throw error
    }
  }

  const calculateEstimatedCost = (segment) => {
    // Rough estimates based on segment size
    const segmentSizes = {
      'all': 500,
      'vip': 50,
      'regular': 200,
      'new': 100,
      'lapsed': 150
    }
    
    const estimatedRecipients = segmentSizes[segment] || 100
    const costPerMessage = selectedCampaignType === 'email' ? 0.002 : 0.01 // $0.002 for email, $0.01 for SMS
    
    return estimatedRecipients * costPerMessage
  }

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleExportReport = () => {
    showNotification('success', 'Campaign report export started. You\'ll receive an email with the CSV file.')
  }

  const handleViewCampaign = (campaign) => {
    // TODO: Implement detailed campaign view
    showNotification('info', `Viewing details for campaign: ${campaign.name}`)
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
      case 'completed':
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'scheduled':
      case 'pending_approval':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (authLoading || initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">You must be logged in to access campaigns.</p>
        </div>
      </div>
    )
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
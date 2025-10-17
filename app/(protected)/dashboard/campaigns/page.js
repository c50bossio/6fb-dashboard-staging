'use client'

import { 
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  EyeIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import BillingSetupModal from '@/components/billing/BillingSetupModal'
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
  const [billingModal, setBillingModal] = useState({ isOpen: false, feature: null, estimatedCost: null })

  useEffect(() => {

    const loadingTimeout = setTimeout(() => {

      setInitialLoading(false)
    }, 5000) // 5 second timeout
    
    if (!authLoading) {
      clearTimeout(loadingTimeout) // Clear timeout if auth resolves normally
      
      if (user?.id) {
        
        loadCampaigns()
        setInitialLoading(false)
      } else {
        
        setInitialLoading(false)
      }
    }
    
    return () => {
      clearTimeout(loadingTimeout)
    }
  }, [authLoading, user?.id, profile?.email])

  const loadCampaigns = async () => {
    if (!user?.id) {
      
      return
    }

    try {
      const response = await fetch(`/api/marketing/campaigns?user_id=${user.id}`)
      
      if (response.ok) {
        const data = await response.json()
        
        setCampaigns(data.campaigns || [])
        
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

  const handleLaunchAICampaign = (campaignType, estimatedTokens, estimatedCost) => {
    setBillingModal({
      isOpen: true,
      feature: {
        type: 'ai-agent',
        agentType: `${campaignType} campaign`
      },
      estimatedCost: {
        tokens: estimatedTokens,
        cost: estimatedCost
      }
    })
  }

  const handleBillingSetupComplete = () => {
    setBillingModal({ isOpen: false, feature: null, estimatedCost: null })
    alert('Billing setup complete! AI campaign agent will launch shortly.')
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
          barbershop_id: profile?.barbershop_id
        },
        subject: formData.get('subject'),
        message: formData.get('message'),
        scheduled_at: formData.get('schedule_date') ? new Date(formData.get('schedule_date')).toISOString() : null,
        estimated_cost: calculateEstimatedCost(formData.get('segment'))
      }

      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData)
      })

      if (response.ok) {
        const result = await response.json()
        
        if (!campaignData.scheduled_at) {
          showNotification('success', `${selectedCampaignType} campaign launched successfully!`)
        } else {
          showNotification('success', `${selectedCampaignType} campaign scheduled successfully!`)
        }
        
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
        return 'bg-moss-100 text-moss-800 dark:bg-moss-900/30 dark:text-moss-400'
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'pending':
      case 'scheduled':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400'
    }
  }

  if (authLoading || initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            notification.type === 'success' ? 'bg-moss-50 dark:bg-moss-950/50 border border-moss-200 dark:border-moss-800 text-moss-800 dark:text-moss-300' :
            notification.type === 'error' ? 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' :
            'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}>
            <div className="flex items-center">
              <span className="text-sm font-medium">{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Marketing Campaigns</h1>
          <p className="text-muted-foreground">Create and manage your marketing campaigns</p>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Campaigns</p>
                <p className="text-3xl font-bold text-foreground">{campaignStats.totalCampaigns}</p>
              </div>
              <div className="h-12 w-12 bg-olive-100 dark:bg-olive-900/30 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-olive-600 dark:text-olive-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reach</p>
                <p className="text-3xl font-bold text-foreground">{campaignStats.totalReach.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Campaigns</p>
                <p className="text-3xl font-bold text-foreground">{campaignStats.emailCampaigns}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <EnvelopeIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SMS Campaigns</p>
                <p className="text-3xl font-bold text-foreground">{campaignStats.smsCampaigns}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <PhoneIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Creation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCreateCampaign('email')}>
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-4">
                <EnvelopeIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Email Campaign</h3>
                <p className="text-sm text-muted-foreground">Send targeted email campaigns</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Starting at $0.001/email</span>
              <PlusIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCreateCampaign('sms')}>
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-4">
                <PhoneIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">SMS Campaign</h3>
                <p className="text-sm text-muted-foreground">Send SMS marketing messages</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Starting at $0.01/SMS</span>
              <PlusIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCreateCampaign('mixed')}>
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4">
                <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Multi-Channel</h3>
                <p className="text-sm text-muted-foreground">Email + SMS campaign</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Combined pricing</span>
              <PlusIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* AI-Powered Campaign Upgrade Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-6 mb-8">
          <div className="text-center mb-6">
            <SparklesIcon className="h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-2">AI-Powered Campaign Intelligence</h3>
            <p className="text-muted-foreground">Let AI create, optimize, and send campaigns for maximum impact</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Smart Email Campaign */}
            <div className="bg-card rounded-lg border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center mb-3">
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
                  <EnvelopeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Smart Email Agent</h4>
                  <p className="text-xs text-muted-foreground">AI writes and sends personalized emails</p>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-3 mb-3">
                <p className="text-sm text-green-800 dark:text-green-300">
                  <span className="font-medium">AI will:</span> Analyze customer data, write personalized content,
                  optimize send times, and track results automatically
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">~3K tokens ($0.12) + email costs</span>
                <button
                  onClick={() => handleLaunchAICampaign('smart email', '3', '$0.12')}
                  className="px-3 py-1 bg-green-600 dark:bg-green-700 text-white text-sm rounded-md hover:bg-green-700 dark:hover:bg-green-600"
                >
                  Launch AI Agent
                </button>
              </div>
            </div>

            {/* Smart SMS Campaign */}
            <div className="bg-card rounded-lg border border-purple-200 dark:border-purple-800 p-4">
              <div className="flex items-center mb-3">
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
                  <PhoneIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Smart SMS Agent</h4>
                  <p className="text-xs text-muted-foreground">AI creates targeted SMS campaigns</p>
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-md p-3 mb-3">
                <p className="text-sm text-purple-800 dark:text-purple-300">
                  <span className="font-medium">AI will:</span> Segment customers, craft compelling messages,
                  schedule optimal delivery, and track engagement
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">~2K tokens ($0.08) + SMS costs</span>
                <button
                  onClick={() => handleLaunchAICampaign('smart SMS', '2', '$0.08')}
                  className="px-3 py-1 bg-purple-600 dark:bg-purple-700 text-white text-sm rounded-md hover:bg-purple-700 dark:hover:bg-purple-600"
                >
                  Launch AI Agent
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="bg-blue-100 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-lg p-3 inline-block">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Smart Caching™ reduces AI costs by 60-70%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Recent Campaigns</h3>
            <button className="btn-secondary">
              <EyeIcon className="h-4 w-4 mr-2" />
              View All
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <EnvelopeIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">No campaigns yet</h4>
              <p className="text-muted-foreground mb-6">
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
                <div key={campaign.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center mr-4 ${
                      campaign.type === 'email' ? 'bg-green-100 dark:bg-green-900/30' :
                      campaign.type === 'sms' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {campaign.type === 'email' ? (
                        <EnvelopeIcon className={`h-5 w-5 ${
                          campaign.type === 'email' ? 'text-green-600 dark:text-green-400' :
                          campaign.type === 'sms' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'
                        }`} />
                      ) : campaign.type === 'sms' ? (
                        <PhoneIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{campaign.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {campaign.recipients_count} recipients • {formatDate(campaign.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
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
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Create {selectedCampaignType.charAt(0).toUpperCase() + selectedCampaignType.slice(1)} Campaign
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
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
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      name="campaign_name"
                      className="input-field"
                      placeholder={`${selectedCampaignType} Campaign - ${new Date().toLocaleDateString()}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Target Audience *
                    </label>
                    <select
                      name="segment"
                      className="input-field"
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {selectedCampaignType === 'email' ? 'Subject Line' : 'Message'} *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    className="input-field"
                    placeholder={selectedCampaignType === 'email' ? 'Enter email subject' : 'Enter SMS message'}
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Message Content *
                  </label>
                  <textarea
                    name="message"
                    rows={selectedCampaignType === 'sms' ? 3 : 6}
                    className="input-field"
                    placeholder={selectedCampaignType === 'sms' ? 'SMS message (160 characters recommended)' : 'Email content...'}
                    required
                  />
                  {selectedCampaignType === 'sms' && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Keep SMS messages under 160 characters for best delivery rates
                    </p>
                  )}
                </div>

                {/* Scheduling */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Schedule (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="schedule_date"
                    className="input-field"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
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

        {/* Billing Setup Modal */}
        <BillingSetupModal
          isOpen={billingModal.isOpen}
          onClose={() => setBillingModal({ isOpen: false, feature: null, estimatedCost: null })}
          feature={billingModal.feature}
          estimatedCost={billingModal.estimatedCost}
          onSetupComplete={handleBillingSetupComplete}
        />
      </div>
    </div>
  )
}
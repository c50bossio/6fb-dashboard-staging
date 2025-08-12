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
  const [showBillingSection, setShowBillingSection] = useState(false)
  const [selectedCampaignType, setSelectedCampaignType] = useState('')
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [billingHistory, setBillingHistory] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
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
        `/api/marketing/billing?user_id=${user.id}`,
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

  // Billing functions
  const loadBillingHistory = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/marketing/billing/history?user_id=${user.id}&limit=20`)
      if (response.ok) {
        const data = await response.json()
        setBillingHistory(data.transactions || [])
      }
    } catch (error) {
      console.error('Error loading billing history:', error)
    }
  }

  const loadPaymentMethods = async (accountId) => {
    if (!accountId) return
    
    try {
      const response = await fetch(`/api/marketing/billing/payment-methods?account_id=${accountId}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data.paymentMethods || [])
      }
    } catch (error) {
      console.error('Error loading payment methods:', error)
    }
  }

  // Load billing data when billing section is shown
  useEffect(() => {
    if (showBillingSection && user?.id) {
      loadBillingHistory()
      if (marketingAccounts.length > 0) {
        loadPaymentMethods(marketingAccounts[0].id)
      }
    }
  }, [showBillingSection, user?.id, marketingAccounts])

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
              {marketingAccounts.length === 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-800">
                      You need to set up a billing account before creating campaigns.
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBillingSection(!showBillingSection)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
              >
                <CreditCardIcon className="h-4 w-4" />
                <span>Billing</span>
              </button>
              <button
                onClick={() => handleCreateCampaign('email')}
                disabled={marketingAccounts.length === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${
                  marketingAccounts.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <EnvelopeIcon className="h-4 w-4" />
                <span>Email Campaign</span>
              </button>
              <button
                onClick={() => handleCreateCampaign('sms')}
                disabled={marketingAccounts.length === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${
                  marketingAccounts.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <PhoneIcon className="h-4 w-4" />
                <span>SMS Campaign</span>
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{campaignStats.totalCampaigns}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reach</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaignStats.totalReach.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <EnvelopeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Email Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaignStats.emailCampaigns}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <PhoneIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">SMS Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">
                  {campaignStats.smsCampaigns}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
              <button 
                onClick={handleExportReport}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Export Report
              </button>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-sm text-gray-500">Get started by creating your first email or SMS campaign.</p>
              </div>
            ) : (
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
                        Audience
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
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
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {campaign.subject || campaign.message}
                            </div>
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
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(campaign.status)}`}>
                            {campaign.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div>Count: {campaign.analytics?.total_sent || campaign.audience_count || 0}</div>
                            <div className="text-xs text-gray-500">
                              {campaign.audience_filters?.segment || 'all'} customers
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {campaign.analytics ? (
                            <div>
                              <div>Delivery: {campaign.analytics.delivery_rate || 0}%</div>
                              {campaign.analytics.open_rate && (
                                <div>Open: {campaign.analytics.open_rate}%</div>
                              )}
                              {campaign.analytics.click_rate && (
                                <div>Click: {campaign.analytics.click_rate}%</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">No data</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {campaign.estimated_cost ? formatCurrency(campaign.estimated_cost) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(campaign.created_at || campaign.scheduled_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleViewCampaign(campaign)}
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
            )}
          </div>
        </div>
      </div>

      {/* Billing Section */}
      {showBillingSection && (
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Billing & Payment Methods</h3>
              <button
                onClick={() => setShowBillingSection(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Billing Accounts & Payment Methods */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Billing Accounts</h4>
                {marketingAccounts.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                    <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No billing accounts configured</p>
                    <p className="text-xs text-gray-400 mt-1">Set up a billing account to start sending campaigns</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {marketingAccounts.map((account) => (
                      <div key={account.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-gray-900">{account.account_name}</h5>
                            <p className="text-sm text-gray-500 mt-1">{account.description}</p>
                            <div className="mt-2 flex items-center space-x-4">
                              <span className="text-xs text-gray-600">
                                Limit: {formatCurrency(account.monthly_spend_limit)}/month
                              </span>
                              <span className="text-xs text-gray-600">
                                Spent: {formatCurrency(account.total_spent || 0)}
                              </span>
                            </div>
                          </div>
                          {account.is_verified ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Verified
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment Methods */}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Payment Methods</h4>
                  {paymentMethods.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
                      <CreditCardIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No payment methods</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <CreditCardIcon className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {method.card_brand} •••• {method.card_last4}
                              </p>
                              <p className="text-xs text-gray-500">
                                Expires {method.card_exp_month}/{method.card_exp_year}
                              </p>
                            </div>
                          </div>
                          {method.is_default && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              Default
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Billing History */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Recent Billing History</h4>
                {billingHistory.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                    <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No billing history</p>
                    <p className="text-xs text-gray-400 mt-1">Campaign charges will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {billingHistory.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.campaign_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {transaction.campaign_type} • {transaction.recipients_count} recipients
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(transaction.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(transaction.amount_charged)}
                            </p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(transaction.payment_status)}`}>
                              {transaction.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {billingHistory.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      Showing 10 of {billingHistory.length} transactions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Create {selectedCampaignType.toUpperCase()} Campaign
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
                {/* Billing Account Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CreditCardIcon className="h-4 w-4 inline mr-1" />
                    Billing Account *
                  </label>
                  <select 
                    name="billing_account" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select billing account</option>
                    {marketingAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name} ({account.owner_type})
                        {account.payment_methods?.[0] && ` - ****${account.payment_methods[0].card_last4}`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Platform costs will be charged to the selected account with markup applied.
                  </p>
                </div>

                {/* Campaign Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      name="campaign_name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`${selectedCampaignType} Campaign - ${new Date().toLocaleDateString()}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Audience *
                    </label>
                    <select 
                      name="segment" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                      onChange={(e) => {
                        // Update estimated cost when audience changes
                        const estimatedCost = calculateEstimatedCost(e.target.value)
                        const costElement = document.getElementById('estimated-cost')
                        if (costElement) {
                          costElement.textContent = formatCurrency(estimatedCost)
                        }
                      }}
                    >
                      <option value="all">All Customers (~500)</option>
                      <option value="vip">VIP Customers (~50)</option>
                      <option value="regular">Regular Customers (~200)</option>
                      <option value="new">New Customers (~100)</option>
                      <option value="lapsed">Lapsed Customers (~150)</option>
                    </select>
                  </div>
                </div>

                {/* Email-specific fields */}
                {selectedCampaignType === 'email' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Line *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email subject line..."
                      required
                    />
                  </div>
                )}

                {/* Message */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedCampaignType === 'email' ? 'Email Content' : 'SMS Message'} *
                  </label>
                  <textarea
                    name="message"
                    rows={selectedCampaignType === 'email' ? '8' : '4'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      selectedCampaignType === 'email' 
                        ? 'Enter your email content here. You can use HTML formatting...'
                        : 'Enter your SMS message here (160 characters recommended)...'
                    }
                    required
                  />
                  {selectedCampaignType === 'sms' && (
                    <p className="mt-1 text-xs text-gray-500">
                      Keep SMS messages under 160 characters to avoid additional charges.
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave blank to send immediately, or schedule for a future date/time.
                  </p>
                </div>

                {/* Cost Estimate */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Estimated Campaign Cost</h4>
                      <p className="text-xs text-blue-700">
                        Platform cost + markup for {selectedCampaignType} delivery
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-900" id="estimated-cost">
                        {formatCurrency(calculateEstimatedCost('all'))}
                      </div>
                      <div className="text-xs text-blue-700">
                        {selectedCampaignType === 'email' ? 'per email' : 'per SMS'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className={`px-6 py-2 text-sm font-medium text-white rounded-md ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Campaign'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { 
  ExclamationTriangleIcon,
  BellIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  GiftIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  CurrencyDollarIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

// Risk Level Component
const RiskLevelIndicator = ({ level, score }) => {
  const getRiskConfig = (level) => {
    switch (level) {
      case 'very_high':
        return {
          color: 'bg-red-500',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          label: 'Critical',
          icon: ExclamationTriangleIcon
        }
      case 'high':
        return {
          color: 'bg-orange-500',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          label: 'High Risk',
          icon: ExclamationTriangleIcon
        }
      case 'medium':
        return {
          color: 'bg-yellow-500',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          label: 'Medium Risk',
          icon: ClockIcon
        }
      case 'low':
        return {
          color: 'bg-green-500',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          label: 'Low Risk',
          icon: CheckCircleIcon
        }
      default:
        return {
          color: 'bg-gray-500',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          label: 'Unknown',
          icon: ClockIcon
        }
    }
  }

  const config = getRiskConfig(level)
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full ${config.bgColor} ${config.textColor}`}>
      <Icon className="h-4 w-4 mr-1" />
      <span className="font-medium text-sm">{config.label}</span>
      <span className="ml-2 text-xs">({score}%)</span>
    </div>
  )
}

// Customer Risk Card Component
const CustomerRiskCard = ({ customer, onTakeAction, onDismiss }) => {
  const daysUntilChurn = customer.predicted_churn_date 
    ? Math.ceil((new Date(customer.predicted_churn_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900">
                {customer.customer_name || `Customer ${customer.customer_id.slice(-8)}`}
              </h3>
              <RiskLevelIndicator 
                level={customer.churn_risk_level} 
                score={Math.round(customer.churn_probability)} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Customer Value</p>
                <p className="font-medium">${customer.customer_value?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Visit</p>
                <p className="font-medium">
                  {customer.last_visit_date 
                    ? `${Math.ceil((new Date() - new Date(customer.last_visit_date)) / (1000 * 60 * 60 * 24))} days ago`
                    : 'Never'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Visits</p>
                <p className="font-medium">{customer.total_visits || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Predicted Churn</p>
                <p className="font-medium text-red-600">
                  {daysUntilChurn ? `${daysUntilChurn} days` : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Primary Risk Factors:</p>
              <div className="flex flex-wrap gap-1">
                {customer.primary_risk_factors?.map((factor, index) => (
                  <Badge key={index} className="text-xs bg-red-100 text-red-700">
                    {factor}
                  </Badge>
                )) || <span className="text-xs text-gray-500">No factors identified</span>}
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {customer.recommended_actions?.map((action, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {action}
                  </li>
                )) || <li className="text-gray-500">No recommendations available</li>}
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={() => onTakeAction(customer, 'contact')}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              title="Contact Customer"
            >
              <PhoneIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onTakeAction(customer, 'email')}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              title="Send Email"
            >
              <EnvelopeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onTakeAction(customer, 'offer')}
              className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
              title="Send Offer"
            >
              <GiftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onTakeAction(customer, 'book')}
              className="px-3 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 text-sm"
              title="Book Appointment"
            >
              <CalendarDaysIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDismiss(customer.customer_id)}
              className="px-3 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 text-sm"
              title="Dismiss Alert"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Churn Trends Chart Component
const ChurnTrendsChart = ({ trendsData }) => {
  if (!trendsData || trendsData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No trend data available
      </div>
    )
  }

  const maxValue = Math.max(...trendsData.map(d => d.value))
  
  return (
    <div className="h-64 flex items-end justify-between px-4 py-4 border border-gray-200 rounded-lg bg-gray-50">
      {trendsData.map((point, index) => (
        <div key={index} className="flex flex-col items-center">
          <div 
            className="w-8 bg-red-500 rounded-t"
            style={{ height: `${(point.value / maxValue) * 200}px` }}
            title={`${point.label}: ${point.value}`}
          ></div>
          <span className="text-xs text-gray-600 mt-2 transform -rotate-45">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// Campaign Quick Launch Modal
const CampaignLaunchModal = ({ isOpen, onClose, customer, actionType }) => {
  const [campaignType, setCampaignType] = useState('retention')
  const [message, setMessage] = useState('')
  const [offer, setOffer] = useState('')
  const [loading, setLoading] = useState(false)

  const getDefaultMessage = () => {
    switch (actionType) {
      case 'email':
        return `Hi ${customer?.customer_name || 'there'}, we miss you! Book your next appointment and get 15% off.`
      case 'offer':
        return `Special offer just for you! Get 20% off your next service when you book this week.`
      default:
        return `Hi ${customer?.customer_name || 'there'}, we'd love to see you back at the shop!`
    }
  }

  useEffect(() => {
    if (isOpen && customer) {
      setMessage(getDefaultMessage())
    }
  }, [isOpen, customer, actionType])

  const handleLaunch = async () => {
    setLoading(true)
    // Simulate campaign launch
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Launch Retention Campaign</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Type
            </label>
            <select
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="retention">Retention Campaign</option>
              <option value="win_back">Win-Back Campaign</option>
              <option value="special_offer">Special Offer</option>
              <option value="personalized">Personalized Message</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {actionType === 'offer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offer Details
              </label>
              <input
                type="text"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="e.g., 20% off next service"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={loading || !message.trim()}
            className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 disabled:opacity-50"
          >
            {loading ? 'Launching...' : 'Launch Campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ChurnRiskMonitor() {
  const { user, profile } = useAuth()
  const [riskCustomers, setRiskCustomers] = useState([])
  const [trendsData, setTrendsData] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all')
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedActionType, setSelectedActionType] = useState(null)
  const [monitoringEnabled, setMonitoringEnabled] = useState(true)

  // Fetch churn risk data
  useEffect(() => {
    if (!user || !profile?.barbershop_id) return

    const fetchChurnData = async () => {
      try {
        setLoading(true)
        // Fetch churn risk data from our Next.js API routes
        const [riskResponse, trendsResponse, summaryResponse] = await Promise.all([
          fetch(`/api/customers/analytics/churn?barbershop_id=${profile.barbershop_id}&${selectedRiskLevel !== 'all' ? `risk_level=${selectedRiskLevel}&` : ''}limit=50`),
          fetch(`/api/customers/analytics/insights?barbershop_id=${profile.barbershop_id}&type=churn_trends&time_period=month`),
          fetch(`/api/customers/analytics/insights?barbershop_id=${profile.barbershop_id}&type=churn_summary`)
        ])

        if (riskResponse.ok) {
          const riskData = await riskResponse.json()
          setRiskCustomers(riskData)
        }

        if (trendsResponse.ok) {
          const trends = await trendsResponse.json()
          setTrendsData(trends?.daily_churn_risk || [])
        }

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json()
          setSummary(summaryData)
        }

      } catch (err) {
        setError(err.message)
        console.error('Error fetching churn data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchChurnData()
  }, [user, profile?.barbershop_id, selectedRiskLevel])

  // Handle customer action
  const handleTakeAction = (customer, actionType) => {
    setSelectedCustomer(customer)
    setSelectedActionType(actionType)
    setShowCampaignModal(true)
  }

  // Handle dismiss alert
  const handleDismissAlert = async (customerId) => {
    try {
      await fetch(`/api/customers/analytics/churn/${customerId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbershop_id: profile.barbershop_id })
      })

      // Remove from local state
      setRiskCustomers(prev => prev.filter(c => c.customer_id !== customerId))
    } catch (err) {
      console.error('Error dismissing alert:', err)
    }
  }

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    if (!monitoringEnabled) return

    const interval = setInterval(() => {
      // Refresh data silently
      if (user && profile?.barbershop_id) {
        // Trigger refresh without loading state
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [user, profile?.barbershop_id, monitoringEnabled])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Churn Monitor</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Churn Risk Monitor</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonitoringEnabled(!monitoringEnabled)}
              className={`p-2 rounded-md ${monitoringEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
              title={monitoringEnabled ? 'Monitoring Active' : 'Monitoring Paused'}
            >
              {monitoringEnabled ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
            </button>
            <Badge className={monitoringEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {monitoringEnabled ? 'Live' : 'Paused'}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedRiskLevel}
            onChange={(e) => setSelectedRiskLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white"
          >
            <option value="all">All Risk Levels</option>
            <option value="very_high">Critical Risk</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <Button className="bg-olive-600 hover:bg-olive-700">
            <BellIcon className="h-4 w-4 mr-2" />
            Configure Alerts
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Risk</p>
                <p className="text-3xl font-bold text-red-600">
                  {riskCustomers.filter(c => c.churn_risk_level === 'very_high').length}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Risk</p>
                <p className="text-3xl font-bold text-orange-600">
                  {riskCustomers.filter(c => c.churn_risk_level === 'high').length}
                </p>
              </div>
              <ArrowTrendingDownIcon className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At Risk Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${riskCustomers
                    .filter(c => ['very_high', 'high'].includes(c.churn_risk_level))
                    .reduce((sum, c) => sum + (c.customer_value || 0), 0)
                    .toFixed(0)
                  }
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Monitored</p>
                <p className="text-3xl font-bold text-gray-900">{riskCustomers.length}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Alerts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5" />
                Active Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskCustomers.length > 0 ? (
                <div className="space-y-4">
                  {riskCustomers
                    .filter(c => ['very_high', 'high'].includes(c.churn_risk_level))
                    .slice(0, 5)
                    .map((customer) => (
                      <CustomerRiskCard
                        key={customer.customer_id}
                        customer={customer}
                        onTakeAction={handleTakeAction}
                        onDismiss={handleDismissAlert}
                      />
                    ))}
                  
                  {riskCustomers.filter(c => ['very_high', 'high'].includes(c.churn_risk_level)).length > 5 && (
                    <div className="text-center py-4">
                      <Button variant="outline">
                        View All {riskCustomers.filter(c => ['very_high', 'high'].includes(c.churn_risk_level)).length} Alerts
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-400" />
                  <p>No high-risk customers detected</p>
                  <p className="text-sm mt-1">Your retention strategy is working well!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trends and Quick Actions */}
        <div className="space-y-6">
          {/* Churn Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Churn Risk Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ChurnTrendsChart trendsData={trendsData} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">Launch Email Campaign</p>
                      <p className="text-sm text-gray-600">Send win-back emails to at-risk customers</p>
                    </div>
                  </div>
                </button>
                
                <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <GiftIcon className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium text-gray-900">Create Special Offers</p>
                      <p className="text-sm text-gray-600">Generate personalized discounts</p>
                    </div>
                  </div>
                </button>
                
                <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">Schedule Calls</p>
                      <p className="text-sm text-gray-600">Personal outreach to VIP customers</p>
                    </div>
                  </div>
                </button>
                
                <button className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <ChartBarIcon className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-gray-900">Run Analysis</p>
                      <p className="text-sm text-gray-600">Deep dive into churn patterns</p>
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Campaign Launch Modal */}
      <CampaignLaunchModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        customer={selectedCustomer}
        actionType={selectedActionType}
      />
    </div>
  )
}
'use client'

import { 
  CurrencyDollarIcon,
  UserGroupIcon,
  CalculatorIcon,
  CalendarIcon,
  PencilIcon,
  PlusIcon,
  ChartBarIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  CreditCardIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function FinancialManagement() {
  const [arrangements, setArrangements] = useState([])
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showArrangementModal, setShowArrangementModal] = useState(false)
  const [editingArrangement, setEditingArrangement] = useState(null)
  const [metrics, setMetrics] = useState({
    totalCommissions: 0,
    totalBoothRent: 0,
    pendingPayouts: 0,
    completedPayouts: 0
  })
  const [commissionBalances, setCommissionBalances] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [paymentIntegrationStatus, setPaymentIntegrationStatus] = useState({
    connected: false,
    processing_enabled: false,
    commissions_automated: false
  })
  const [processingPayout, setProcessingPayout] = useState(null)
  const [payoutStatus, setPayoutStatus] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    loadFinancialData()
  }, [])

  // Notification helper
  const addNotification = (notification) => {
    const id = Date.now()
    const newNotification = { id, ...notification, timestamp: new Date() }
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]) // Keep last 10
    
    // Auto-remove after 10 seconds for success notifications
    if (notification.type === 'success') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, 10000)
    }
  }

  const loadFinancialData = async () => {
    try {
      // Load arrangements and metrics
      const arrangementsResponse = await fetch('/api/shop/financial/arrangements')
      if (arrangementsResponse.ok) {
        const data = await arrangementsResponse.json()
        setArrangements(data.arrangements || [])
        setMetrics(data.metrics || {
          totalCommissions: 0,
          totalBoothRent: 0,
          pendingPayouts: 0,
          completedPayouts: 0
        })
      }

      // Load barbers
      const barbersResponse = await fetch('/api/shop/barbers')
      if (barbersResponse.ok) {
        const { barbers } = await barbersResponse.json()
        setBarbers(barbers || [])
      }

      // Load commission balances (from new automated system)
      const balancesResponse = await fetch('/api/shop/financial/commission-balances')
      if (balancesResponse.ok) {
        const { balances } = await balancesResponse.json()
        setCommissionBalances(balances || [])
      }

      // Load recent commission transactions
      const transactionsResponse = await fetch('/api/shop/financial/recent-transactions')
      if (transactionsResponse.ok) {
        const { transactions } = await transactionsResponse.json()
        setRecentTransactions(transactions || [])
      }

      // Check payment integration status
      const integrationResponse = await fetch('/api/shop/financial/integration-status')
      if (integrationResponse.ok) {
        const status = await integrationResponse.json()
        setPaymentIntegrationStatus(status)
      }

    } catch (error) {
      console.error('Error loading financial data:', error)
      setError('Failed to load financial data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveArrangement = async (arrangementData) => {
    try {
      const url = editingArrangement 
        ? `/api/shop/financial/arrangements/${editingArrangement.id}`
        : '/api/shop/financial/arrangements'
      
      const method = editingArrangement ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(arrangementData)
      })
      
      if (response.ok) {
        loadFinancialData()
        setShowArrangementModal(false)
        setEditingArrangement(null)
        alert('Financial arrangement saved successfully!')
      } else {
        alert('Failed to save arrangement. Please try again.')
      }
    } catch (error) {
      console.error('Error saving arrangement:', error)
      alert('An error occurred while saving. Please try again.')
    }
  }

  const handleProcessSinglePayout = async (barberId, barberName, amount) => {
    setConfirmAction({
      type: 'single',
      barberId,
      barberName,
      amount,
      title: 'Confirm Payout',
      message: `Process payout of $${amount.toFixed(2)} to ${barberName}?`,
      details: `This will transfer funds to ${barberName} via their configured payout method.`
    })
    setShowConfirmModal(true)
    return
  }

  const executeSinglePayout = async (barberId, barberName, amount) => {

    setProcessingPayout(barberId)
    setPayoutStatus(null)

    try {
      const response = await fetch('/api/shop/financial/payouts/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'process_single',
          barber_id: barberId
        })
      })

      const result = await response.json()

      if (result.success) {
        setPayoutStatus({
          type: 'success',
          message: result.message || `Payout processed successfully for ${barberName}`
        })
        
        // Add notification
        addNotification({
          type: 'success',
          title: 'Payout Processed',
          message: `$${amount.toFixed(2)} payout to ${barberName} completed successfully`,
          details: `Method: ${result.method || 'Automatic'}`,
          action: 'single_payout'
        })
        
        // Reload financial data to reflect changes
        await loadFinancialData()
      } else {
        setPayoutStatus({
          type: 'error',
          message: result.error || 'Failed to process payout'
        })
        
        // Add error notification
        addNotification({
          type: 'error',
          title: 'Payout Failed',
          message: `Failed to process $${amount.toFixed(2)} payout to ${barberName}`,
          details: result.error || 'Unknown error occurred',
          action: 'single_payout_failed'
        })
      }
    } catch (error) {
      console.error('Error processing payout:', error)
      setPayoutStatus({
        type: 'error',
        message: 'An error occurred while processing the payout'
      })
    } finally {
      setProcessingPayout(null)
    }
  }

  const handleProcessAllPayouts = async () => {
    const pendingPayouts = commissionBalances.filter(b => b.pending_amount > 0)
    const totalAmount = pendingPayouts.reduce((sum, b) => sum + b.pending_amount, 0)
    
    setConfirmAction({
      type: 'all',
      title: 'Confirm Bulk Payouts',
      message: `Process ${pendingPayouts.length} payouts totaling $${totalAmount.toFixed(2)}?`,
      details: `This will process payouts for: ${pendingPayouts.map(p => p.barber_name).join(', ')}`,
      pendingPayouts,
      totalAmount
    })
    setShowConfirmModal(true)
    return
  }

  const executeAllPayouts = async () => {

    setProcessingPayout('all')
    setPayoutStatus(null)

    try {
      const response = await fetch('/api/shop/financial/payouts/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'process_all'
        })
      })

      const result = await response.json()

      if (result.success) {
        setPayoutStatus({
          type: 'success',
          message: result.message || 'All payouts processed successfully'
        })
        
        // Add notification
        addNotification({
          type: 'success',
          title: 'Bulk Payouts Completed',
          message: `Successfully processed ${result.details?.processed || 0} payouts`,
          details: `Total processed: ${result.details?.processed || 0}, Errors: ${result.details?.errors || 0}`,
          action: 'bulk_payout'
        })
        
        // Reload financial data
        await loadFinancialData()
      } else {
        setPayoutStatus({
          type: 'error',
          message: result.error || 'Failed to process payouts'
        })
        
        // Add error notification
        addNotification({
          type: 'error',
          title: 'Bulk Payout Failed',
          message: 'Failed to process bulk payouts',
          details: result.error || 'Unknown error occurred',
          action: 'bulk_payout_failed'
        })
      }
    } catch (error) {
      console.error('Error processing payouts:', error)
      setPayoutStatus({
        type: 'error',
        message: 'An error occurred while processing payouts'
      })
    } finally {
      setProcessingPayout(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Data</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              loadFinancialData()
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
            <p className="text-gray-600 mt-2">Manage commission structures, track automated payouts, and monitor financial performance</p>
          </div>
          
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <BellIcon className="h-6 w-6 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
            
            {/* Notification Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Payout Notifications</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => setNotifications([])}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-start">
                          <div className={`flex-shrink-0 h-2 w-2 rounded-full mt-2 mr-3 ${
                            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            {notification.details && (
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.details}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integration Status */}
      <div className={`mb-6 p-4 rounded-lg flex items-start ${
        paymentIntegrationStatus.commissions_automated 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-yellow-50 border border-yellow-200'
      }`}>
        {paymentIntegrationStatus.commissions_automated ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
        ) : (
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
        )}
        <div className="flex-1">
          <h3 className={`font-medium ${
            paymentIntegrationStatus.commissions_automated ? 'text-green-900' : 'text-yellow-900'
          }`}>
            {paymentIntegrationStatus.commissions_automated 
              ? '🎉 Automated Commission System Active' 
              : 'Commission Automation Setup Required'
            }
          </h3>
          <p className={`text-sm mt-1 ${
            paymentIntegrationStatus.commissions_automated ? 'text-green-800' : 'text-yellow-800'
          }`}>
            {paymentIntegrationStatus.commissions_automated 
              ? 'Payments automatically calculate commissions and update barber balances in real-time.'
              : 'Complete payment setup to enable automatic commission calculation from customer payments.'
            }
          </p>
          {!paymentIntegrationStatus.commissions_automated && (
            <a 
              href="/shop/settings/payment-setup" 
              className="inline-flex items-center mt-2 text-sm text-yellow-700 hover:text-yellow-900 font-medium"
            >
              <CreditCardIcon className="h-4 w-4 mr-1" />
              Complete Payment Setup →
            </a>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.totalCommissions.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Monthly Commissions</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-olive-100 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-olive-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.totalBoothRent.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Monthly Booth Rent</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-amber-800" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.pendingPayouts.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Pending Payouts</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-gold-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-gold-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.completedPayouts.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Completed Payouts</p>
        </div>
      </div>

      {/* Payout Status Notification */}
      {payoutStatus && (
        <div className={`mb-6 p-4 rounded-lg flex items-start ${
          payoutStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {payoutStatus.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
          )}
          <div className="flex-1">
            <p className={`text-sm ${
              payoutStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {payoutStatus.message}
            </p>
          </div>
          <button
            onClick={() => setPayoutStatus(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Real-Time Commission Balances */}
      {paymentIntegrationStatus.commissions_automated && commissionBalances.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-green-600" />
                Live Commission Balances
              </h2>
              <div className="flex items-center space-x-3">
                {commissionBalances.some(balance => balance.pending_amount > 0) && (
                  <button
                    onClick={handleProcessAllPayouts}
                    disabled={processingPayout}
                    className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium"
                  >
                    {processingPayout ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Process All Payouts
                      </>
                    )}
                  </button>
                )}
                <span className="text-sm text-green-600 font-medium">Auto-Updated</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barber
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Earned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Payment
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissionBalances.map((balance) => (
                  <tr key={balance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {balance.barber_name || 'Unknown Barber'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        ${balance.pending_amount?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${balance.total_earned?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {balance.last_transaction_at 
                          ? new Date(balance.last_transaction_at).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {balance.pending_amount > 0 && (
                        <button 
                          onClick={() => handleProcessSinglePayout(balance.barber_id, balance.barber_name, balance.pending_amount)}
                          className="text-olive-600 hover:text-olive-900 font-medium"
                        >
                          Process Payout
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Payout Summary */}
          {commissionBalances.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">
                    Total Barbers: <span className="font-medium text-gray-900">{commissionBalances.length}</span>
                  </span>
                  <span className="text-gray-600">
                    Pending Payouts: <span className="font-medium text-green-600">
                      {commissionBalances.filter(b => b.pending_amount > 0).length}
                    </span>
                  </span>
                  <span className="text-gray-600">
                    Total Pending: <span className="font-medium text-green-600">
                      ${commissionBalances.reduce((sum, b) => sum + (b.pending_amount || 0), 0).toFixed(2)}
                    </span>
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Updates automatically on new payments
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Commission Arrangements</h2>
          <button
            onClick={() => setShowArrangementModal(true)}
            className="px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Arrangement
          </button>
        </div>
      </div>

      {/* Arrangements List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Barber
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Terms
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {arrangements.map((arrangement) => (
              <tr key={arrangement.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {arrangement.barber_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {arrangement.barber_email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    arrangement.type === 'commission' 
                      ? 'bg-moss-100 text-moss-900'
                      : arrangement.type === 'booth_rent'
                      ? 'bg-olive-100 text-olive-800'
                      : 'bg-gold-100 text-gold-800'
                  }`}>
                    {arrangement.type === 'commission' ? 'Commission' :
                     arrangement.type === 'booth_rent' ? 'Booth Rent' : 'Hybrid'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {arrangement.type === 'commission' && (
                      <span>{arrangement.commission_percentage}% Commission</span>
                    )}
                    {arrangement.type === 'booth_rent' && (
                      <span>${arrangement.booth_rent_amount}/{arrangement.booth_rent_frequency}</span>
                    )}
                    {arrangement.type === 'hybrid' && (
                      <div>
                        <div>{arrangement.commission_percentage}% + </div>
                        <div>${arrangement.booth_rent_amount}/{arrangement.booth_rent_frequency}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {arrangement.product_commission_percentage}% product commission
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{arrangement.payment_frequency}</div>
                  <div className="text-xs text-gray-500">{arrangement.payment_method}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    arrangement.is_active 
                      ? 'bg-moss-100 text-moss-900'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {arrangement.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingArrangement(arrangement)
                      setShowArrangementModal(true)
                    }}
                    className="text-olive-600 hover:text-indigo-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {arrangements.length === 0 && (
          <div className="text-center py-12">
            <CalculatorIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No financial arrangements set up yet</p>
            <button
              onClick={() => setShowArrangementModal(true)}
              className="inline-flex items-center px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create First Arrangement
            </button>
          </div>
        )}
      </div>

      {/* Payout Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <PayoutConfirmModal
          action={confirmAction}
          onConfirm={async () => {
            setShowConfirmModal(false)
            if (confirmAction.type === 'single') {
              await executeSinglePayout(confirmAction.barberId, confirmAction.barberName, confirmAction.amount)
            } else if (confirmAction.type === 'all') {
              await executeAllPayouts()
            }
            setConfirmAction(null)
          }}
          onCancel={() => {
            setShowConfirmModal(false)
            setConfirmAction(null)
          }}
        />
      )}

      {/* Arrangement Modal */}
      {showArrangementModal && (
        <ArrangementModal
          arrangement={editingArrangement}
          barbers={barbers}
          onSave={handleSaveArrangement}
          onClose={() => {
            setShowArrangementModal(false)
            setEditingArrangement(null)
          }}
        />
      )}
    </div>
  )
}

function ArrangementModal({ arrangement, barbers, onSave, onClose }) {
  const [formData, setFormData] = useState({
    barber_id: arrangement?.barber_id || '',
    type: arrangement?.type || 'commission',
    commission_percentage: arrangement?.commission_percentage || 60,
    booth_rent_amount: arrangement?.booth_rent_amount || 0,
    booth_rent_frequency: arrangement?.booth_rent_frequency || 'weekly',
    product_commission_percentage: arrangement?.product_commission_percentage || 10,
    payment_method: arrangement?.payment_method || 'direct_deposit',
    payment_frequency: arrangement?.payment_frequency || 'weekly',
    is_active: arrangement?.is_active !== false
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {arrangement ? 'Edit Financial Arrangement' : 'New Financial Arrangement'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Barber Selection */}
            {!arrangement && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Barber *
                </label>
                <select
                  required
                  value={formData.barber_id}
                  onChange={(e) => setFormData({...formData, barber_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Choose a barber...</option>
                  {barbers.map(barber => (
                    <option key={barber.id} value={barber.user_id || barber.id}>
                      {barber.users?.full_name || barber.users?.email || 'Unnamed Barber'}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Arrangement Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arrangement Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="commission">Commission Based</option>
                <option value="booth_rent">Booth Rent</option>
                <option value="hybrid">Hybrid (Commission + Booth Rent)</option>
              </select>
            </div>
            
            {/* Commission Settings */}
            {(formData.type === 'commission' || formData.type === 'hybrid') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Commission Percentage *
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.commission_percentage}
                    onChange={(e) => setFormData({...formData, commission_percentage: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="ml-2 text-gray-600">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Barber keeps this percentage of service revenue
                </p>
              </div>
            )}
            
            {/* Booth Rent Settings */}
            {(formData.type === 'booth_rent' || formData.type === 'hybrid') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booth Rent Amount *
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-600">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.booth_rent_amount}
                      onChange={(e) => setFormData({...formData, booth_rent_amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent Frequency *
                  </label>
                  <select
                    required
                    value={formData.booth_rent_frequency}
                    onChange={(e) => setFormData({...formData, booth_rent_frequency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* Product Commission */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Sales Commission
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.product_commission_percentage}
                  onChange={(e) => setFormData({...formData, product_commission_percentage: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <span className="ml-2 text-gray-600">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Commission on retail product sales
              </p>
            </div>
            
            {/* Payment Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="direct_deposit">Direct Deposit</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="venmo">Venmo</option>
                  <option value="cashapp">CashApp</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Frequency
                </label>
                <select
                  value={formData.payment_frequency}
                  onChange={(e) => setFormData({...formData, payment_frequency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            
            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Arrangement is active
              </label>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700"
              >
                {arrangement ? 'Update Arrangement' : 'Create Arrangement'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function PayoutConfirmModal({ action, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gold-100 mb-4">
            <CurrencyDollarIcon className="h-6 w-6 text-gold-600" />
          </div>
          
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {action.title}
          </h3>
          
          {/* Message */}
          <p className="text-gray-600 mb-4">
            {action.message}
          </p>
          
          {/* Details */}
          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="text-sm text-gray-700">
              {action.details}
            </p>
            
            {/* Additional info for bulk payouts */}
            {action.type === 'all' && action.pendingPayouts && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Barbers:</span>
                  <span className="font-medium">{action.pendingPayouts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium text-green-600">${action.totalAmount?.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            {/* Single payout details */}
            {action.type === 'single' && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Barber:</span>
                  <span className="font-medium">{action.barberName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-600">${action.amount?.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700"
            >
              {action.type === 'all' ? 'Process All Payouts' : 'Process Payout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'

export default function SubscriptionTable({
  subscriptions,
  loading,
  filters,
  onFilterChange,
  pagination,
  onPageChange,
  onSubscriptionAction,
  onExportCSV
}) {
  const [selectedSubscriptions, setSelectedSubscriptions] = useState(new Set())
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionModalData, setActionModalData] = useState(null)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-olive-100 text-olive-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      canceled: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        colors[status] || colors.inactive
      }`}>
        {status?.replace('_', ' ') || 'inactive'}
      </span>
    )
  }

  const getTierBadge = (tier) => {
    const colors = {
      barber: 'bg-green-100 text-green-800',
      shop: 'bg-olive-100 text-olive-800',
      enterprise: 'bg-gold-100 text-gold-800'
    }

    if (!tier) return null

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[tier]}`}>
        {tier}
      </span>
    )
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedSubscriptions(new Set(subscriptions.map(s => s.id)))
    } else {
      setSelectedSubscriptions(new Set())
    }
  }

  const handleSelectSubscription = (id, checked) => {
    const newSelection = new Set(selectedSubscriptions)
    if (checked) {
      newSelection.add(id)
    } else {
      newSelection.delete(id)
    }
    setSelectedSubscriptions(newSelection)
  }

  const handleAction = (action, subscription) => {
    setActionModalData({ action, subscription })
    setShowActionModal(true)
  }

  const confirmAction = async (actionData) => {
    await onSubscriptionAction(actionData.action, actionData.subscription.id, actionData.options)
    setShowActionModal(false)
    setActionModalData(null)
  }

  const handleSort = (column) => {
    const newOrder = filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc'
    onFilterChange({
      sortBy: column,
      sortOrder: newOrder
    })
  }

  const renderPagination = () => {
    const { page, totalPages, hasPrev, hasNext } = pagination

    return (
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
        <div className="text-sm text-gray-700">
          Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} results
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-2 text-sm font-medium border ${
                  pageNum === page
                    ? 'text-olive-600 bg-olive-50 border-olive-500'
                    : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
          
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <h3 className="text-lg font-semibold text-gray-900">Subscriptions</h3>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {/* Search */}
            <input
              type="text"
              placeholder="Search by email, name, or ID..."
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
            />
            
            {/* Tier Filter */}
            <select
              value={filters.tier}
              onChange={(e) => onFilterChange({ tier: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
            >
              <option value="all">All Tiers</option>
              <option value="barber">Barber ($35)</option>
              <option value="shop">Shop ($99)</option>
              <option value="enterprise">Enterprise ($249)</option>
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>

            {/* Export Button */}
            <button
              onClick={onExportCSV}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checked={selectedSubscriptions.size === subscriptions.length && subscriptions.length > 0}
                  className="h-4 w-4 text-olive-600 border-gray-300 rounded focus:ring-olive-500"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email')}
              >
                User
                {filters.sortBy === 'email' && (
                  <span className="ml-1">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subscription
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('subscription_status')}
              >
                Status
                {filters.sortBy === 'subscription_status' && (
                  <span className="ml-1">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                Created
                {filters.sortBy === 'created_at' && (
                  <span className="ml-1">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-300 rounded animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-300 rounded animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-300 rounded animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-300 rounded animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-300 rounded animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-300 rounded animate-pulse"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-300 rounded animate-pulse"></div></td>
                </tr>
              ))
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  No subscriptions found
                </td>
              </tr>
            ) : (
              subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedSubscriptions.has(subscription.id)}
                      onChange={(e) => handleSelectSubscription(subscription.id, e.target.checked)}
                      className="h-4 w-4 text-olive-600 border-gray-300 rounded focus:ring-olive-500"
                    />
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.name || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {subscription.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      {getTierBadge(subscription.subscription_tier)}
                      <div className="text-xs text-gray-500">
                        {subscription.payment_method_brand && subscription.payment_method_last4 && (
                          `${subscription.payment_method_brand} ****${subscription.payment_method_last4}`
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      {getStatusBadge(subscription.subscription_status)}
                      {subscription.subscription_cancel_at_period_end && (
                        <div className="text-xs text-red-600">Cancels at period end</div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>SMS: {subscription.sms_credits_used || 0}/{subscription.sms_credits_included || 0}</div>
                      <div>Email: {subscription.email_credits_used || 0}/{subscription.email_credits_included || 0}</div>
                      <div>AI: {subscription.ai_tokens_used || 0}/{subscription.ai_tokens_included || 0}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(subscription.created_at)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAction('extend_trial', subscription)}
                        className="text-olive-600 hover:text-olive-900"
                      >
                        Extend
                      </button>
                      <button
                        onClick={() => handleAction('reset_usage', subscription)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => handleAction('cancel_subscription', subscription)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && subscriptions.length > 0 && renderPagination()}

      {/* Action Modal */}
      {showActionModal && actionModalData && (
        <ActionModal
          action={actionModalData.action}
          subscription={actionModalData.subscription}
          onConfirm={confirmAction}
          onCancel={() => {
            setShowActionModal(false)
            setActionModalData(null)
          }}
        />
      )}
    </div>
  )
}

// Action Modal Component
function ActionModal({ action, subscription, onConfirm, onCancel }) {
  const [formData, setFormData] = useState({
    reason: '',
    days: 7,
    amount: 0,
    newTier: 'barber'
  })

  const actionLabels = {
    extend_trial: 'Extend Trial',
    reset_usage: 'Reset Usage',
    cancel_subscription: 'Cancel Subscription',
    refund_payment: 'Process Refund',
    update_tier: 'Update Tier'
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm({
      action,
      subscription,
      options: formData
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {actionLabels[action]} - {subscription.email}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason field for most actions */}
            {['cancel_subscription', 'refund_payment'].includes(action) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
                  rows="3"
                  required
                />
              </div>
            )}

            {/* Days field for trial extension */}
            {action === 'extend_trial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days to extend (1-90)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
                />
              </div>
            )}

            {/* Amount field for refunds */}
            {action === 'refund_payment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refund Amount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
                  required
                />
              </div>
            )}

            {/* Tier selection for updates */}
            {action === 'update_tier' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Tier
                </label>
                <select
                  value={formData.newTier}
                  onChange={(e) => setFormData({ ...formData, newTier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
                >
                  <option value="barber">Barber ($35/mo)</option>
                  <option value="shop">Shop ($99/mo)</option>
                  <option value="enterprise">Enterprise ($249/mo)</option>
                </select>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-olive-600 text-white text-sm font-medium rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
              >
                Confirm {actionLabels[action]}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
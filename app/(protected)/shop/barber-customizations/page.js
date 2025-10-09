'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserCircleIcon,
  PaintBrushIcon,
  LinkIcon,
  EyeIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

export default function BarberCustomizationsPage() {
  const [customizations, setCustomizations] = useState([])
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedCustomization, setSelectedCustomization] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState('') // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadCustomizations()
  }, [filterStatus])

  const loadCustomizations = async () => {
    try {
      let url = '/api/shop/barber-customizations'
      if (filterStatus) {
        url += `?approval_status=${filterStatus}`
      }

      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setCustomizations(data.customizations || [])
        setSummary(data.summary || { total: 0, pending: 0, approved: 0, rejected: 0 })
      }
    } catch (error) {
      console.error('Failed to load customizations:', error)
      setMessage({ type: 'error', text: 'Failed to load customizations' })
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (actionType === 'reject' && (!rejectionReason || rejectionReason.trim().length < 10)) {
      setMessage({ type: 'error', text: 'Rejection reason must be at least 10 characters' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/shop/barber-customizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customization_id: selectedCustomization.id,
          action: actionType,
          rejection_reason: actionType === 'reject' ? rejectionReason.trim() : null
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || `Customization ${actionType}ed successfully`
        })

        // Close modal and reset
        setShowModal(false)
        setSelectedCustomization(null)
        setRejectionReason('')
        setActionType('')

        // Reload customizations
        await loadCustomizations()

        // Auto-hide success message
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({
          type: 'error',
          text: data.error || `Failed to ${actionType} customization`
        })
      }
    } catch (error) {
      console.error('Failed to update customization:', error)
      setMessage({ type: 'error', text: 'Failed to update customization' })
    } finally {
      setSubmitting(false)
    }
  }

  const openApprovalModal = (customization, action) => {
    setSelectedCustomization(customization)
    setActionType(action)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedCustomization(null)
    setRejectionReason('')
    setActionType('')
  }

  const getStatusBadge = (customization) => {
    if (customization.is_approved) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          Approved
        </span>
      )
    } else if (customization.rejection_reason) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <XCircleIcon className="h-4 w-4 mr-1" />
          Rejected
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <ClockIcon className="h-4 w-4 mr-1" />
          Pending
        </span>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Barber Customizations
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Review and approve barber landing page customizations
              </p>
            </div>

            {/* Summary Cards */}
            <div className="ml-8 flex space-x-4">
              <div className="text-center px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-400">{summary.pending}</div>
                <div className="text-xs text-yellow-700 dark:text-yellow-500">Pending</div>
              </div>
              <div className="text-center px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-900 dark:text-green-400">{summary.approved}</div>
                <div className="text-xs text-green-700 dark:text-green-500">Approved</div>
              </div>
              <div className="text-center px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-900 dark:text-red-400">{summary.rejected}</div>
                <div className="text-xs text-red-700 dark:text-red-500">Rejected</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className={`p-4 rounded-lg flex items-center ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 mr-2" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Filter by status:
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilterStatus('')}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  filterStatus === ''
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-amber-500'
                }`}
              >
                All ({summary.total})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-amber-500'
                }`}
              >
                Pending ({summary.pending})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  filterStatus === 'approved'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-amber-500'
                }`}
              >
                Approved ({summary.approved})
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  filterStatus === 'rejected'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-amber-500'
                }`}
              >
                Rejected ({summary.rejected})
              </button>
            </div>
          </div>
        </div>

        {/* Customizations List */}
        {customizations.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <UserCircleIcon className="h-16 w-16 mx-auto text-slate-400" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              No customizations found
              {filterStatus && ` with status "${filterStatus}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {customizations.map((customization) => (
              <div
                key={customization.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-start justify-between">
                  {/* Left: Barber Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex-shrink-0">
                        {customization.profile_image_url ? (
                          <img
                            src={customization.profile_image_url}
                            alt={customization.display_name}
                            className="h-16 w-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <UserCircleIcon className="h-10 w-10 text-slate-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {customization.display_name}
                          </h3>
                          {getStatusBadge(customization)}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {customization.barber_name} ({customization.barber_email})
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 font-mono mt-1">
                          /{customization.custom_url_slug}
                        </p>
                      </div>
                    </div>

                    {/* Bio & Details */}
                    {customization.bio && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                        {customization.bio}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {customization.specialties && customization.specialties.length > 0 && (
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Specialties:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {customization.specialties.map((specialty, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded text-xs"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {customization.custom_brand_color && (
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Brand Color:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <div
                              className="h-6 w-6 rounded border border-slate-300"
                              style={{ backgroundColor: customization.custom_brand_color }}
                            />
                            <span className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                              {customization.custom_brand_color}
                            </span>
                          </div>
                        </div>
                      )}

                      <div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">Accepting Bookings:</span>
                        <span className={`ml-2 ${customization.is_accepting_bookings ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {customization.is_accepting_bookings ? 'Yes' : 'No'}
                        </span>
                      </div>

                      {customization.approved_at && (
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Approved:</span>
                          <span className="ml-2 text-slate-600 dark:text-slate-400">
                            {new Date(customization.approved_at).toLocaleDateString()} by {customization.approved_by_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Social Links */}
                    {customization.social_media_links && Object.values(customization.social_media_links).some(v => v) && (
                      <div className="mt-3 flex items-center space-x-3">
                        <LinkIcon className="h-4 w-4 text-slate-500" />
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(customization.social_media_links).map(([platform, url]) =>
                            url && (
                              <a
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded hover:bg-slate-200 dark:hover:bg-slate-600 capitalize"
                              >
                                {platform}
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {customization.rejection_reason && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm font-medium text-red-900 dark:text-red-400">Rejection Reason:</p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">{customization.rejection_reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="ml-6 flex flex-col space-y-2">
                    {!customization.is_approved && (
                      <>
                        <button
                          onClick={() => openApprovalModal(customization, 'approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Approve
                        </button>
                        <button
                          onClick={() => openApprovalModal(customization, 'reject')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center"
                        >
                          <XCircleIcon className="h-4 w-4 mr-2" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval/Rejection Modal */}
      {showModal && selectedCustomization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {actionType === 'approve' ? 'Approve' : 'Reject'} Customization
            </h3>

            <div className="mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Barber: <span className="font-medium text-slate-900 dark:text-white">{selectedCustomization.barber_name}</span>
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Display Name: <span className="font-medium text-slate-900 dark:text-white">{selectedCustomization.display_name}</span>
              </p>
            </div>

            {actionType === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rejection Reason * (min 10 characters)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  placeholder="Explain why this customization is being rejected..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {rejectionReason.length} / 10 characters minimum
                </p>
              </div>
            )}

            {message && message.type === 'error' && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">{message.text}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={submitting}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

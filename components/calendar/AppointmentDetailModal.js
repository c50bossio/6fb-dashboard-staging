'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  BellIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { canModifyAppointment } from '@/lib/calendar-permissions'
import { useAuth } from '@/components/SupabaseAuthProvider'

/**
 * Industry-Standard Appointment Detail Modal
 *
 * Follows patterns from Squire, Booksy, Square Appointments:
 * - Side drawer on desktop, bottom sheet on mobile
 * - Quick view with essential info
 * - Role-based action buttons
 * - Links to edit/reschedule modals
 */
export default function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  onEdit,
  onCheckIn,
  onCancel,
  onReschedule,
  onSendReminder,
  onRefresh
}) {
  const { user, profile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [activeAction, setActiveAction] = useState(null) // 'check-in', 'cancel', 'reminder', etc.

  if (!appointment) return null

  // Extract appointment data from event extendedProps or direct properties
  const appointmentData = appointment.extendedProps || appointment
  const {
    appointment_id,
    client_id,
    client_name,
    client_phone,
    client_email,
    customer_name, // Fallback field name
    customer_phone, // Fallback field name
    customer_email, // Fallback field name
    barber_id,
    barber_name,
    service_id,
    service_name,
    service_price,
    duration_minutes,
    status,
    notes
  } = appointmentData

  // Normalize field names (handle different data structures)
  const customerName = client_name || customer_name || 'Unknown Customer'
  const customerPhone = client_phone || customer_phone
  const customerEmail = client_email || customer_email
  const serviceName = service_name || 'Service'
  const price = service_price || 0
  const duration = duration_minutes || 30

  // Get appointment times
  const startTime = appointment.start instanceof Date
    ? appointment.start
    : new Date(appointment.start)
  const endTime = appointment.end instanceof Date
    ? appointment.end
    : new Date(appointment.end)

  // Check if user can modify this appointment
  const canModify = canModifyAppointment(
    {
      barberId: barber_id,
      customerId: client_id,
      status: status?.toLowerCase()
    },
    profile?.role,
    user?.id
  )

  // Format date and time
  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Status badge styling
  const getStatusBadge = (status) => {
    const statusLower = (status || 'pending').toLowerCase()

    const badges = {
      confirmed: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        icon: CheckCircleIcon,
        label: 'Confirmed'
      },
      pending: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: ClockIcon,
        label: 'Pending'
      },
      completed: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
        icon: CheckCircleIcon,
        label: 'Completed'
      },
      cancelled: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        icon: XMarkIcon,
        label: 'Cancelled'
      },
      checked_in: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-800 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
        icon: UserIcon,
        label: 'Checked In'
      },
      no_show: {
        bg: 'bg-gray-100 dark:bg-gray-900/30',
        text: 'text-gray-800 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-800',
        icon: XMarkIcon,
        label: 'No Show'
      }
    }

    return badges[statusLower] || badges.pending
  }

  const statusBadge = getStatusBadge(status)
  const StatusIcon = statusBadge.icon

  // Handle check-in action
  const handleCheckIn = async () => {
    if (!appointment_id) {
      toast.error('Missing appointment ID')
      return
    }

    setIsLoading(true)
    setActiveAction('check-in')

    try {
      const response = await fetch(`/api/appointments/${appointment_id}/check-in`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check in')
      }

      toast.success(data.message || 'Customer checked in successfully!')

      if (onCheckIn) onCheckIn(data.appointment)
      if (onRefresh) onRefresh()

      onClose()
    } catch (error) {
      console.error('Check-in error:', error)
      toast.error(error.message || 'Failed to check in customer')
    } finally {
      setIsLoading(false)
      setActiveAction(null)
    }
  }

  // Handle cancel action
  const handleCancel = async () => {
    if (!appointment_id && !appointment.id) {
      toast.error('Missing appointment ID')
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to cancel this appointment? The customer will be notified.'
    )

    if (!confirmed) return

    setIsLoading(true)
    setActiveAction('cancel')

    try {
      const id = appointment_id || appointment.id
      const response = await fetch(`/api/appointments?id=${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel appointment')
      }

      toast.success('Appointment cancelled successfully')

      if (onCancel) onCancel(data.data)
      if (onRefresh) onRefresh()

      onClose()
    } catch (error) {
      console.error('Cancel error:', error)
      toast.error(error.message || 'Failed to cancel appointment')
    } finally {
      setIsLoading(false)
      setActiveAction(null)
    }
  }

  // Handle send reminder action
  const handleSendReminder = async () => {
    if (!appointment_id) {
      toast.error('Missing appointment ID')
      return
    }

    setIsLoading(true)
    setActiveAction('reminder')

    try {
      const response = await fetch('/api/appointments/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointment_id,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          appointment_time: startTime.toISOString()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder')
      }

      toast.success('Reminder sent successfully!')

      if (onSendReminder) onSendReminder()
    } catch (error) {
      console.error('Reminder error:', error)
      // Don't fail if endpoint doesn't exist yet
      if (error.message.includes('404')) {
        toast.info('Reminder feature coming soon!')
      } else {
        toast.error(error.message || 'Failed to send reminder')
      }
    } finally {
      setIsLoading(false)
      setActiveAction(null)
    }
  }

  // Handle edit action
  const handleEdit = () => {
    if (onEdit) {
      onEdit(appointment)
    }
  }

  // Handle reschedule action
  const handleReschedule = () => {
    if (onReschedule) {
      onReschedule(appointment)
    }
  }

  // Action button helper
  const ActionButton = ({ onClick, icon: Icon, label, variant = 'default', disabled = false, loading = false }) => {
    const variants = {
      default: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600',
      primary: 'bg-olive-600 text-white border-olive-600 hover:bg-olive-700',
      danger: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40',
      success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40'
    }

    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : (
          <Icon className="h-5 w-5" />
        )}
        {label}
      </button>
    )
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 dark:bg-black/60" />
        </Transition.Child>

        {/* Slide-out drawer */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-auto bg-white dark:bg-gray-800 shadow-xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-olive-600 to-brand-600 px-6 py-6 text-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Dialog.Title className="text-xl font-bold mb-2">
                            Appointment Details
                          </Dialog.Title>
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                            <StatusIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{statusBadge.label}</span>
                          </div>
                        </div>
                        <button
                          onClick={onClose}
                          className="rounded-md text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-6 py-6 space-y-6">
                      {/* Customer Information */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Customer
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-olive-100 dark:bg-olive-900/30 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-olive-600 dark:text-olive-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{customerName}</p>
                            </div>
                          </div>

                          {customerPhone && (
                            <div className="flex items-center gap-3 pl-13">
                              <PhoneIcon className="h-4 w-4 text-gray-400" />
                              <a
                                href={`tel:${customerPhone}`}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {customerPhone}
                              </a>
                            </div>
                          )}

                          {customerEmail && (
                            <div className="flex items-center gap-3 pl-13">
                              <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                              <a
                                href={`mailto:${customerEmail}`}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {customerEmail}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Appointment Information */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Appointment
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {formatDateTime(startTime)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {formatTime(startTime)} - {formatTime(endTime)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {duration} minutes
                            </p>
                          </div>

                          <div className="flex items-start gap-3">
                            <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {barber_name || 'Barber TBD'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Barber</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Service Information */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Service
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {serviceName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {duration} minutes
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-lg font-bold text-olive-600 dark:text-olive-400">
                              <CurrencyDollarIcon className="h-5 w-5" />
                              {price}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {notes && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                            Notes
                          </h3>
                          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{notes}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Footer */}
                    {canModify && (
                      <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/30">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Check In - Only for confirmed appointments */}
                          {status?.toLowerCase() === 'confirmed' && (
                            <ActionButton
                              onClick={handleCheckIn}
                              icon={CheckCircleIcon}
                              label="Check In"
                              variant="success"
                              loading={activeAction === 'check-in'}
                              disabled={isLoading}
                            />
                          )}

                          {/* Edit - For non-completed/cancelled */}
                          {!['completed', 'cancelled'].includes(status?.toLowerCase()) && (
                            <ActionButton
                              onClick={handleEdit}
                              icon={PencilSquareIcon}
                              label="Edit"
                              variant="default"
                              disabled={isLoading}
                            />
                          )}

                          {/* Reschedule */}
                          {!['completed', 'cancelled'].includes(status?.toLowerCase()) && (
                            <ActionButton
                              onClick={handleReschedule}
                              icon={ArrowPathIcon}
                              label="Reschedule"
                              variant="default"
                              disabled={isLoading}
                            />
                          )}

                          {/* Send Reminder */}
                          {!['completed', 'cancelled'].includes(status?.toLowerCase()) && (
                            <ActionButton
                              onClick={handleSendReminder}
                              icon={BellIcon}
                              label="Send Reminder"
                              variant="default"
                              loading={activeAction === 'reminder'}
                              disabled={isLoading}
                            />
                          )}

                          {/* Cancel - For non-completed/cancelled */}
                          {!['completed', 'cancelled'].includes(status?.toLowerCase()) && (
                            <ActionButton
                              onClick={handleCancel}
                              icon={TrashIcon}
                              label="Cancel"
                              variant="danger"
                              loading={activeAction === 'cancel'}
                              disabled={isLoading}
                            />
                          )}

                          {/* Message Customer - Future feature */}
                          <ActionButton
                            onClick={() => toast.info('Messaging feature coming soon!')}
                            icon={ChatBubbleLeftRightIcon}
                            label="Message"
                            variant="default"
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    )}

                    {/* View-Only Footer for users without modify permissions */}
                    {!canModify && (
                      <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/30">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          View-only access to this appointment
                        </p>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

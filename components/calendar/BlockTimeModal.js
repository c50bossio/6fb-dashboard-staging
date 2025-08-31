'use client'

import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon, 
  CalendarIcon, 
  ClockIcon, 
  NoSymbolIcon,
  TrashIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'
import { useState, useEffect, Fragment } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function BlockTimeModal({
  isOpen,
  onClose,
  editingBlock = null,
  onBlockComplete,
  barbershopId
}) {
  const { user: _user } = useAuth()
  const isEditing = !!editingBlock
  
  const [formData, setFormData] = useState({
    scheduled_at: '',
    duration_minutes: 60,
    block_reason: '',
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_count: 4
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Initialize form data when modal opens
  useEffect(() => {
    if (isEditing && editingBlock) {
      // Editing existing block
      let scheduledAt = ''
      if (editingBlock.scheduled_at || editingBlock.start) {
        const date = new Date(editingBlock.scheduled_at || editingBlock.start)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        scheduledAt = `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      // Always calculate duration from start and end times for accuracy
      let duration = 60 // Default fallback
      if (editingBlock.end_time || editingBlock.end) {
        const startTime = new Date(editingBlock.scheduled_at || editingBlock.start)
        const endTime = new Date(editingBlock.end_time || editingBlock.end)
        const diffMs = endTime - startTime
        duration = Math.round(diffMs / (1000 * 60)) // Convert milliseconds to minutes
        console.log('[BlockTimeModal] Calculated duration from times:', {
          start: startTime.toLocaleTimeString(),
          end: endTime.toLocaleTimeString(),
          duration: duration + ' minutes'
        })
      } else if (editingBlock.duration_minutes) {
        // Only use duration_minutes if we don't have end time
        duration = editingBlock.duration_minutes
        console.log('[BlockTimeModal] Using provided duration:', duration, 'minutes')
      }
      
      // Extract the block reason from the notes, removing the emoji prefix
      let blockReason = editingBlock.client_notes || editingBlock.notes || editingBlock.title || ''
      blockReason = blockReason.replace('🚫 Time Blocked - ', '').replace('🚫 ', '').replace('Time Blocked - ', '')
      
      setFormData({
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        block_reason: blockReason,
        is_recurring: false,
        recurrence_pattern: 'weekly',
        recurrence_count: 4
      })
    }
  }, [isEditing, editingBlock])

  const getTimeDisplay = () => {
    if (!formData.scheduled_at) return ''
    
    const start = new Date(formData.scheduled_at)
    const end = new Date(start.getTime() + formData.duration_minutes * 60000)
    
    const dateStr = start.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
    
    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
    
    return {
      date: dateStr,
      time: `${startTime} - ${endTime}`,
      duration: formData.duration_minutes >= 60 
        ? `${Math.floor(formData.duration_minutes / 60)}h ${formData.duration_minutes % 60 > 0 ? `${formData.duration_minutes % 60}min` : ''}`
        : `${formData.duration_minutes} min`
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const startDate = new Date(formData.scheduled_at)
      const endDate = new Date(startDate.getTime() + formData.duration_minutes * 60000)
      
      const blockData = {
        barbershop_id: barbershopId,
        barbershop_id: barbershopId, // Some endpoints expect barbershop_id
        barber_id: user?.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        duration_minutes: formData.duration_minutes,
        customer_name: 'BLOCKED',
        customer_phone: '',
        customer_email: '',
        notes: `🚫 Time Blocked - ${formData.block_reason || 'Time Blocked'}`,
        status: 'blocked',
        // Only include optional fields if they exist in the database
        service_id: null,
        service_name: null,
        price: 0
      }

      const url = isEditing 
        ? `/api/calendar/appointments?id=${editingBlock.id}`
        : '/api/calendar/appointments'
      
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blockData)
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} blocked time`)
      }

      onClose()
      
      if (onBlockComplete) {
        await onBlockComplete({
          ...data.event,
          isBlocked: true
        })
      }
      
    } catch (error) {
      console.error('Error saving blocked time:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!isEditing || !editingBlock?.id) return
    
    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/calendar/appointments?id=${editingBlock.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete blocked time')
      }

      setShowDeleteConfirmation(false)
      onClose()
      
      if (onBlockComplete) {
        // Pass the deleted ID for proper removal from calendar
        await onBlockComplete({ 
          isDeleted: true, 
          deletedId: editingBlock.id 
        })
      }
      
    } catch (error) {
      console.error('Error deleting blocked time:', error)
      setError(error.message)
      setShowDeleteConfirmation(false)
    } finally {
      setDeleting(false)
    }
  }

  const timeDisplay = getTimeDisplay()

  // Common block reason templates
  const blockTemplates = [
    'Lunch Break',
    'Meeting',
    'Personal Time',
    'Training',
    'Admin Work',
    'Break',
    'Vacation',
    'Sick Leave'
  ]

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="px-4 pb-4 pt-5 sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <NoSymbolIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                        {isEditing ? 'Edit Blocked Time' : 'Block Time Slot'}
                      </Dialog.Title>
                      
                      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        {/* Error Display */}
                        {error && (
                          <div className="rounded-md bg-red-50 p-3">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        )}
                        
                        {/* Time Display and Edit */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          {isEditing ? (
                            // Editable time and duration when editing
                            <div className="space-y-3">
                              <div>
                                <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700">
                                  Start Time
                                </label>
                                <input
                                  type="datetime-local"
                                  id="scheduled_at"
                                  value={formData.scheduled_at}
                                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-olive-500 focus:outline-none focus:ring-1 focus:ring-olive-500"
                                  required
                                />
                              </div>
                              
                              <div>
                                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                                  Duration
                                </label>
                                <select
                                  id="duration"
                                  value={formData.duration_minutes}
                                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-olive-500 focus:outline-none focus:ring-1 focus:ring-olive-500"
                                >
                                  <option value="15">15 minutes</option>
                                  <option value="30">30 minutes</option>
                                  <option value="45">45 minutes</option>
                                  <option value="60">1 hour</option>
                                  <option value="90">1.5 hours</option>
                                  <option value="120">2 hours</option>
                                  <option value="180">3 hours</option>
                                  <option value="240">4 hours</option>
                                  <option value="480">Full day (8 hours)</option>
                                </select>
                              </div>
                              
                              {/* Show calculated end time */}
                              <div className="pt-2 border-t border-gray-200">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <ClockIcon className="h-4 w-4" />
                                  <span>End time: {timeDisplay.time?.split(' - ')[1] || 'calculating...'}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Read-only display when creating new block
                            <>
                              <div className="flex items-center space-x-3">
                                <CalendarIcon className="h-5 w-5 text-gray-500" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{timeDisplay.date}</p>
                                  <p className="text-sm text-gray-600">
                                    {timeDisplay.time} ({timeDisplay.duration})
                                  </p>
                                </div>
                              </div>
                              
                              {/* Duration Selector for new blocks */}
                              <div className="mt-3">
                                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                                  Duration
                                </label>
                                <select
                                  id="duration"
                                  value={formData.duration_minutes}
                                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-olive-500 focus:outline-none focus:ring-1 focus:ring-olive-500"
                                >
                                  <option value="15">15 minutes</option>
                                  <option value="30">30 minutes</option>
                                  <option value="45">45 minutes</option>
                                  <option value="60">1 hour</option>
                                  <option value="90">1.5 hours</option>
                                  <option value="120">2 hours</option>
                                  <option value="180">3 hours</option>
                                  <option value="240">4 hours</option>
                                  <option value="480">Full day (8 hours)</option>
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Block Reason */}
                        <div>
                          <label htmlFor="blockReason" className="block text-sm font-medium text-gray-700">
                            Reason for Blocking
                          </label>
                          <input
                            type="text"
                            id="blockReason"
                            value={formData.block_reason}
                            onChange={(e) => setFormData({ ...formData, block_reason: e.target.value })}
                            placeholder="e.g., Lunch break, Meeting, Personal time"
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-olive-500 focus:outline-none focus:ring-1 focus:ring-olive-500"
                          />
                          
                          {/* Quick Templates */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {blockTemplates.map((template) => (
                              <button
                                key={template}
                                type="button"
                                onClick={() => setFormData({ ...formData, block_reason: template })}
                                className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                              >
                                {template}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2 disabled:opacity-50"
                          >
                            {loading ? 'Saving...' : isEditing ? 'Update Block' : 'Block Time'}
                          </button>
                          
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirmation(true)}
                              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Remove Block
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onClose}
                              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
                
                {/* Delete Confirmation Dialog */}
                {showDeleteConfirmation && (
                  <div className="absolute inset-0 bg-white rounded-lg">
                    <div className="px-4 pb-4 pt-5 sm:p-6">
                      <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                          <h3 className="text-lg font-semibold leading-6 text-gray-900">
                            Remove Blocked Time
                          </h3>
                          <div className="mt-2">
                            <p className="text-sm text-gray-500">
                              Are you sure you want to remove this blocked time? This will open up the time slot for bookings.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={handleDelete}
                          className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                        >
                          {deleting ? 'Removing...' : 'Remove Block'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirmation(false)}
                          disabled={deleting}
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
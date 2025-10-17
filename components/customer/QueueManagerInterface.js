'use client'

import {
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import { showSuccess, showError, showWarning } from '../ui/BookedBarberNotification'
import { 
  ClockIcon as ClockSolid,
  UserIcon as UserSolid,
  CalendarDaysIcon as CalendarSolid
} from '@heroicons/react/24/solid'
import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'

const QueueManagerInterface = ({ barbershopId, onQueueUpdate }) => {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [confirmingStartService, setConfirmingStartService] = useState(null)
  const [confirmingMessage, setConfirmingMessage] = useState(null)
  const dragContainerRef = useRef(null)
  
  // Load queue data
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true)
      
      // Use unified queue endpoint
      const response = await fetch(`/api/queue/unified?barbershop_id=${barbershopId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load queue')
      }

      if (data.success && data.queue) {
        setQueue(data.queue)
        onQueueUpdate?.(data.queue)
      } else {
        setQueue([])
        onQueueUpdate?.([])
      }
    } catch (error) {
      console.error('Failed to load queue:', error)
      setError('Failed to load queue data')
    } finally {
      setLoading(false)
    }
  }, [barbershopId, onQueueUpdate])

  useEffect(() => {
    if (barbershopId) {
      loadQueue()
      // Refresh every 30 seconds
      const interval = setInterval(loadQueue, 30000)
      return () => clearInterval(interval)
    }
  }, [barbershopId]) // Remove loadQueue from dependencies to prevent infinite loop

  // Drag and drop handlers
  const handleDragStart = (e, item, index) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedItem({ item, index })
    e.target.style.opacity = '0.5'
    e.target.style.transform = 'rotate(2deg)'
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    e.target.style.transform = 'rotate(0deg)'
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the container entirely
    if (!dragContainerRef.current?.contains(e.relatedTarget)) {
      setDragOverIndex(null)
    }
  }

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem.index === dropIndex) {
      return
    }

    try {
      // Store original positions to detect who moved up
      const originalQueue = [...queue]
      const originalIndex = draggedItem.index
      
      // Optimistic update
      const newQueue = [...queue]
      const [movedItem] = newQueue.splice(draggedItem.index, 1)
      newQueue.splice(dropIndex, 0, movedItem)
      
      // Update priorities
      const updatedQueue = newQueue.map((item, index) => ({
        ...item,
        priority: index + 1
      }))
      
      setQueue(updatedQueue)
      onQueueUpdate?.(updatedQueue)

      // Notify customers who moved up in the queue
      if (originalIndex > dropIndex) {
        // Someone was moved forward, notify people who got bumped up
        const affectedCustomers = updatedQueue.slice(dropIndex + 1, originalIndex + 1)
        
        for (const customer of affectedCustomers) {
          if (customer.client_phone && customer.originalId !== movedItem.originalId) {
            const newPosition = updatedQueue.findIndex(q => q.originalId === customer.originalId) + 1
            const oldPosition = originalQueue.findIndex(q => q.originalId === customer.originalId) + 1
            
            if (newPosition < oldPosition) {
              // This customer moved up, send notification
              try {
                await handleMessage(customer, `Good news! You've moved up to position #${newPosition} in the queue. Your wait time has been reduced.`)
              } catch (notificationError) {
                console.warn('Failed to notify customer of queue position change:', notificationError)
              }
            }
          }
        }
      }

      // Save to backend
      await fetch('/api/queue/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          queue_order: updatedQueue.map((item, index) => ({
            id: item.originalId,
            type: item.type,
            priority: index + 1
          }))
        })
      })

    } catch (error) {
      console.error('Failed to reorder queue:', error)
      // Revert on error
      loadQueue()
    }

    setDragOverIndex(null)
  }

  // CRUD operations
  const handleEdit = (item) => {
    setEditingItem({ ...item })
  }

  const handleSave = async (editedItem) => {
    try {
      const endpoint = editedItem.type === 'appointment' 
        ? `/api/appointments/${editedItem.originalId}` 
        : `/api/walk-ins/${editedItem.originalId}`
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: editedItem.client_name,
          service_name: editedItem.service_name,
          notes: editedItem.notes,
          phone: editedItem.client_phone
        })
      })

      if (response.ok) {
        setEditingItem(null)
        await loadQueue()
      } else {
        throw new Error('Failed to update')
      }
    } catch (error) {
      console.error('Failed to save changes:', error)
      setError('Failed to save changes')
    }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Remove ${item.client_name} from the queue?`)) return

    try {
      const endpoint = item.type === 'appointment' 
        ? `/api/appointments/${item.originalId}` 
        : `/api/walk-ins/${item.originalId}`
      
      const response = await fetch(endpoint, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadQueue()
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
      setError('Failed to remove from queue')
    }
  }

  const handleStatusChange = async (item, newStatus) => {
    try {
      const endpoint = item.type === 'appointment' 
        ? `/api/appointments/${item.originalId}/status` 
        : `/api/walk-ins/${item.originalId}/status`
      
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      await loadQueue()
    } catch (error) {
      console.error('Failed to update status:', error)
      setError('Failed to update status')
    }
  }


  const handleMessage = async (item, message) => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'queue_update',
          message,
          phone: item.client_phone,
          barbershop_id: barbershopId
        })
      })
      
      const result = await response.json()
      
      if (result.success && result.results) {
        // Check if SMS was successful
        const smsResult = result.results.find(r => r.type === 'sms')
        if (smsResult) {
          if (smsResult.status === 'sent') {
            showSuccess(
              'Message Sent Successfully!',
              `Your SMS was delivered to ${item.client_phone}`,
              'The customer will receive your message shortly'
            )
          } else if (smsResult.status === 'failed') {
            showError(
              'SMS Failed',
              smsResult.error || 'Unknown error occurred',
              `Phone: ${item.client_phone} - Please check the format and try again`
            )
          }
        } else {
          showWarning(
            'Message Processed',
            'No SMS result found in response',
            'Check the console for technical details'
          )
        }
      } else {
        const errorMessage = result.error || 'Unknown error occurred'
        showError(
          'Failed to Send Message',
          errorMessage,
          `Phone: ${item.client_phone} - Please try again`
        )
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      showError(
        'Network Error',
        error.message || 'Failed to connect to server',
        'Please check your connection and try again'
      )
    }
  }

  // Bulk operations
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(new Set(queue.map(item => item.originalId)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (itemId, checked) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`Remove ${selectedItems.size} items from the queue?`)) return

    try {
      await Promise.all(
        Array.from(selectedItems).map(itemId => {
          const item = queue.find(q => q.originalId === itemId)
          const endpoint = item.type === 'appointment' 
            ? `/api/appointments/${itemId}` 
            : `/api/walk-ins/${itemId}`
          return fetch(endpoint, { method: 'DELETE' })
        })
      )
      
      setSelectedItems(new Set())
      await loadQueue()
    } catch (error) {
      console.error('Failed to bulk delete:', error)
      setError('Failed to remove selected items')
    }
  }

  const getStatusColor = (status, type) => {
    if (type === 'walk_in') {
      return status === 'WALK_IN_WAITING' 
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-blue-100 text-blue-800 border-blue-200'
    }
    
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'checked_in': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type) => {
    return type === 'appointment' ? CalendarSolid : UserSolid
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserGroupIcon className="h-6 w-6 text-olive-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Queue Management</h3>
              <p className="text-sm text-gray-600">
                {queue.length} customers • {queue.filter(q => q.type === 'appointment').length} appointments • {queue.filter(q => q.type === 'walk_in').length} walk-ins
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {selectedItems.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove Selected ({selectedItems.size})
              </button>
            )}
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={selectedItems.size === queue.length && queue.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Select All</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="divide-y divide-gray-200" ref={dragContainerRef}>
        {queue.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No customers in queue</p>
          </div>
        ) : (
          queue.map((item, index) => {
            const TypeIcon = getTypeIcon(item.type)
            const isSelected = selectedItems.has(item.originalId)
            const isDragOver = dragOverIndex === index
            
            return (
              <div
                key={`${item.type}-${item.originalId}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`px-6 py-4 hover:bg-gray-50 cursor-move transition-all duration-200 ${
                  isDragOver ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                } ${isSelected ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectItem(item.originalId, e.target.checked)}
                    className="rounded border-gray-300"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  {/* Queue Position */}
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {index + 1}
                  </div>

                  {/* Type Icon */}
                  <div className="flex-shrink-0">
                    <TypeIcon className={`h-5 w-5 ${item.type === 'appointment' ? 'text-green-600' : 'text-amber-600'}`} />
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <p className="font-medium text-gray-900 truncate">
                        {item.client_name}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status, item.type)}`}>
                        {item.type === 'appointment' ? 'Appointment' : 'Walk-in'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status, item.type)}`}>
                        {item.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Confirmed'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{item.time}</span>
                      </span>
                      <span>{item.service_name}</span>
                      {item.estimated_wait && (
                        <span className="text-amber-600">
                          ~{item.estimated_wait}min wait
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {item.client_phone && (
                      <button
                        onClick={() => setConfirmingMessage(item)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded"
                        title="Send message"
                      >
                        <ChatBubbleLeftIcon className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      title="Remove from queue"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>

                    {/* Status Change Buttons */}
                    {item.type === 'walk_in' && item.status === 'WALK_IN_WAITING' && (
                      <button
                        onClick={() => setConfirmingStartService(item)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Start Service
                      </button>
                    )}

                    {(item.status === 'checked_in' || item.status === 'IN_SERVICE') && (
                      <button
                        onClick={() => handleStatusChange(item, 'completed')}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit {editingItem.type === 'appointment' ? 'Appointment' : 'Walk-in'}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={editingItem.client_name}
                  onChange={(e) => setEditingItem({...editingItem, client_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <input
                  type="text"
                  value={editingItem.service_name}
                  onChange={(e) => setEditingItem({...editingItem, service_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editingItem.client_phone || ''}
                  onChange={(e) => setEditingItem({...editingItem, client_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({...editingItem, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(editingItem)}
                className="px-4 py-2 text-sm font-medium text-white bg-olive-600 rounded-md hover:bg-olive-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Service Confirmation Modal */}
      {confirmingStartService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Start Service for {confirmingStartService.client_name}?
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                <p className="text-gray-600">
                  This will:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-4">
                  <li>Mark {confirmingStartService.client_name} as being served</li>
                  <li>Remove them from the waiting queue</li>
                  <li>Update queue positions for remaining customers</li>
                  {confirmingStartService.client_phone && (
                    <li>Send an SMS notification: "Great news! Your barber is ready for you now. Please come in!"</li>
                  )}
                  {!confirmingStartService.client_phone && (
                    <li className="text-amber-600">No SMS will be sent (no phone number on file)</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmingStartService(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleStatusChange(confirmingStartService, 'IN_SERVICE')
                  setConfirmingStartService(null)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Start Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Message Confirmation Modal */}
      {confirmingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Send SMS to {confirmingMessage.client_name}?
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <p className="text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                    {confirmingMessage.client_phone}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="sms-message"
                    rows={3}
                    defaultValue="Your turn is coming up soon! Please be ready."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ChatBubbleLeftIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        This will send an SMS message to the customer immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmingMessage(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const message = document.getElementById('sms-message').value
                  await handleMessage(confirmingMessage, message)
                  setConfirmingMessage(null)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Send SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QueueManagerInterface
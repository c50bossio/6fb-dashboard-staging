'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { 
  ExclamationTriangleIcon, 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function RescheduleConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  appointmentDetails,
  newTimeSlot
}) {
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [notificationMethods, setNotificationMethods] = useState({
    email: true,
    sms: false,
    push: false
  })
  const [customMessage, setCustomMessage] = useState('')
  const [loading, setLoading] = useState(false)
  
  if (!appointmentDetails || !newTimeSlot) return null
  
  // Format dates for display
  const formatDateTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
  
  const handleConfirm = async () => {
    setLoading(true)
    
    // Prepare reschedule data
    const rescheduleData = {
      appointmentId: appointmentDetails.id,
      oldTime: {
        start: appointmentDetails.start,
        end: appointmentDetails.end,
        barberId: appointmentDetails.resourceId
      },
      newTime: {
        start: newTimeSlot.start,
        end: newTimeSlot.end,
        barberId: newTimeSlot.resourceId
      },
      notifyCustomer,
      notificationMethods: notifyCustomer ? notificationMethods : null,
      customMessage: notifyCustomer ? customMessage : null
    }
    
    // Call the confirm handler
    await onConfirm(rescheduleData)
    setLoading(false)
  }
  
  const oldBarberName = appointmentDetails.extendedProps?.barberName || 'Previous Barber'
  const newBarberName = newTimeSlot.barberName || 'New Barber'
  const customerName = appointmentDetails.extendedProps?.customer || 
                      (appointmentDetails.title && appointmentDetails.title.includes(' - ') ? appointmentDetails.title.split(' - ')[0] : null) || 
                      'Customer'
  const serviceName = appointmentDetails.extendedProps?.service || 
                     (appointmentDetails.title && appointmentDetails.title.includes(' - ') ? appointmentDetails.title.split(' - ')[1] : null) || 
                     'Unknown Service'
  
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                  </div>
                  
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Confirm Appointment Reschedule
                    </Dialog.Title>
                    
                    <div className="mt-4 space-y-4">
                      {/* Customer and Service Info */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-center space-x-2 text-sm">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{customerName}</span>
                          <span className="text-gray-500">•</span>
                          <span>{serviceName}</span>
                        </div>
                      </div>
                      
                      {/* Original Time */}
                      <div className="border rounded-lg p-3">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          From (Original)
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{formatDateTime(appointmentDetails.start)}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{oldBarberName}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                      
                      {/* New Time */}
                      <div className="border-2 border-olive-500 rounded-lg p-3 bg-olive-50">
                        <div className="text-xs font-medium text-olive-600 uppercase tracking-wide mb-1">
                          To (New)
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <CalendarIcon className="h-4 w-4 mr-2 text-olive-500" />
                            <span className="font-medium">{formatDateTime(newTimeSlot.start)}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <UserIcon className="h-4 w-4 mr-2 text-olive-500" />
                            <span className="font-medium">{newBarberName}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Notification Options */}
                      <div className="border-t pt-4">
                        <div className="flex items-center">
                          <input
                            id="notify-customer"
                            type="checkbox"
                            checked={notifyCustomer}
                            onChange={(e) => setNotifyCustomer(e.target.checked)}
                            className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                          />
                          <label htmlFor="notify-customer" className="ml-2 flex items-center text-sm font-medium text-gray-900">
                            <BellIcon className="h-4 w-4 mr-1" />
                            Notify customer about the change
                          </label>
                        </div>
                        
                        {notifyCustomer && (
                          <div className="mt-3 ml-6 space-y-3">
                            {/* Notification Methods */}
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <input
                                  id="notify-email"
                                  type="checkbox"
                                  checked={notificationMethods.email}
                                  onChange={(e) => setNotificationMethods({
                                    ...notificationMethods,
                                    email: e.target.checked
                                  })}
                                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                                />
                                <label htmlFor="notify-email" className="ml-2 flex items-center text-sm text-gray-700">
                                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                                  Email
                                </label>
                              </div>
                              
                              <div className="flex items-center">
                                <input
                                  id="notify-sms"
                                  type="checkbox"
                                  checked={notificationMethods.sms}
                                  onChange={(e) => setNotificationMethods({
                                    ...notificationMethods,
                                    sms: e.target.checked
                                  })}
                                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                                />
                                <label htmlFor="notify-sms" className="ml-2 flex items-center text-sm text-gray-700">
                                  <DevicePhoneMobileIcon className="h-4 w-4 mr-1" />
                                  SMS Text
                                </label>
                              </div>
                            </div>
                            
                            {/* Custom Message */}
                            <div>
                              <label htmlFor="custom-message" className="block text-xs font-medium text-gray-700 mb-1">
                                Add a message (optional)
                              </label>
                              <textarea
                                id="custom-message"
                                rows={2}
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 text-sm"
                                placeholder="e.g., Sorry for the inconvenience..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    className="inline-flex w-full justify-center rounded-md bg-olive-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-olive-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleConfirm}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Rescheduling...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Confirm Reschedule
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
'use client'

import { Dialog, Transition } from '@headlessui/react'
import { CheckCircleIcon, CalendarDaysIcon, ClockIcon, UserIcon, CurrencyDollarIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import { useState, useEffect, Fragment } from 'react'

export default function BookingConfirmationModal({
  isOpen,
  onClose,
  appointmentData,
  barberName,
  serviceName
}) {
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowCheckmark(true), 300)
      return () => clearTimeout(timer)
    } else {
      setShowCheckmark(false)
      setCopied(false)
    }
  }, [isOpen])

  if (!appointmentData) return null

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    const options = {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }
    return date.toLocaleDateString('en-US', options)
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit', 
      hour12: true
    })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleCopyDetails = async () => {
    const details = `
Appointment Confirmation

📅 ${formatDate(appointmentData.start_time)}
🕐 ${formatTime(appointmentData.start_time)}
💺 Barber: ${barberName}
✂️ Service: ${serviceName}
👤 Customer: ${appointmentData.customer_name || appointmentData.client_name}
📞 Phone: ${appointmentData.customer_phone || appointmentData.client_phone}
${appointmentData.notes ? `📝 Notes: ${appointmentData.notes}` : ''}
${appointmentData.price ? `💰 Price: $${appointmentData.price}` : ''}
${appointmentData.is_recurring ? '🔄 Recurring: Yes' : ''}

Booking ID: ${appointmentData.id}
    `.trim()

    try {
      await navigator.clipboard.writeText(details)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

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

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
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
                {/* Close button */}
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="text-center">
                  {/* Animated checkmark */}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <Transition
                      show={showCheckmark}
                      enter="transform transition duration-500 ease-out"
                      enterFrom="scale-0 rotate-45"
                      enterTo="scale-100 rotate-0"
                      leave="transform transition duration-200 ease-in"
                      leaveFrom="scale-100 rotate-0" 
                      leaveTo="scale-0 rotate-45"
                    >
                      <CheckCircleIconSolid className="h-10 w-10 text-green-600" />
                    </Transition>
                  </div>

                  <Dialog.Title as="h3" className="mt-4 text-xl font-semibold leading-6 text-gray-900">
                    Appointment Booked Successfully!
                  </Dialog.Title>

                  <p className="mt-2 text-sm text-gray-500">
                    Your appointment has been confirmed and added to the calendar.
                  </p>
                </div>

                {/* Appointment details card */}
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="space-y-3">
                    {/* Date & Time */}
                    <div className="flex items-center text-sm">
                      <CalendarDaysIcon className="mr-3 h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDate(appointmentData.start_time)}
                        </div>
                        <div className="text-gray-600">
                          {formatTime(appointmentData.start_time)} - {formatTime(appointmentData.end_time)}
                        </div>
                      </div>
                    </div>

                    {/* Barber */}
                    <div className="flex items-center text-sm">
                      <UserIcon className="mr-3 h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">Barber</div>
                        <div className="text-gray-600">{barberName}</div>
                      </div>
                    </div>

                    {/* Service */}
                    <div className="flex items-center text-sm">
                      <ClockIcon className="mr-3 h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">Service</div>
                        <div className="text-gray-600">
                          {serviceName} 
                          {appointmentData.duration_minutes && ` (${appointmentData.duration_minutes} min)`}
                        </div>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="flex items-center text-sm">
                      <UserIcon className="mr-3 h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">Customer</div>
                        <div className="text-gray-600">
                          {appointmentData.customer_name || appointmentData.client_name}
                          {(appointmentData.customer_phone || appointmentData.client_phone) && (
                            <div className="text-xs text-gray-500">
                              {appointmentData.customer_phone || appointmentData.client_phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    {appointmentData.price && (
                      <div className="flex items-center text-sm">
                        <CurrencyDollarIcon className="mr-3 h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">Price</div>
                          <div className="text-gray-600">${appointmentData.price}</div>
                        </div>
                      </div>
                    )}

                    {/* Recurring indicator */}
                    {appointmentData.is_recurring && (
                      <div className="rounded-md bg-olive-50 p-2">
                        <div className="flex items-center text-sm text-olive-700">
                          <CheckCircleIcon className="mr-2 h-4 w-4" />
                          <span className="font-medium">Recurring Appointment</span>
                        </div>
                        <div className="mt-1 text-xs text-olive-600">
                          This appointment will repeat according to your schedule
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {appointmentData.notes && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="font-medium text-gray-900 text-sm">Notes</div>
                        <div className="mt-1 text-sm text-gray-600">{appointmentData.notes}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking ID */}
                <div className="mt-4 text-center">
                  <div className="text-xs text-gray-500">
                    Booking ID: <span className="font-mono">{appointmentData.id}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-olive-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-olive-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                    onClick={onClose}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    onClick={handleCopyDetails}
                  >
                    {copied ? (
                      <>
                        <CheckCircleIcon className="mr-2 h-4 w-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      'Copy Details'
                    )}
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
'use client'

import { Dialog, Transition } from '@headlessui/react'
import { 
  UserPlusIcon, 
  BuildingStorefrontIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { Fragment } from 'react'

export default function AddBarberGuidanceDialog({ 
  isOpen, 
  onClose, 
  onProceedToAdd,
  shopName = 'your barbershop'
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-olive-100 rounded-full flex items-center justify-center">
                        <UserPlusIcon className="w-6 h-6 text-olive-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold leading-6 text-gray-900"
                      >
                        Add Your First Barber
                      </Dialog.Title>
                      <p className="text-sm text-gray-500">Set up your team at {shopName}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-olive-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                  {/* Main Message */}
                  <div className="text-center">
                    <p className="text-gray-700 mb-4">
                      Great! You're ready to add your first barber. This will set up your team member who can accept bookings.
                    </p>
                  </div>

                  {/* What You'll Add */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircleIcon className="w-4 h-4 mr-2 text-olive-600" />
                      What You'll Set Up
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-start">
                        <UserPlusIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                        <span>Barber name and contact details</span>
                      </div>
                      <div className="flex items-start">
                        <ClockIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                        <span>Working hours and availability</span>
                      </div>
                      <div className="flex items-start">
                        <CurrencyDollarIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                        <span>Services offered and pricing</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Tip */}
                  <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <BuildingStorefrontIcon className="w-5 h-5 text-olive-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-olive-800 mb-1">
                          Pro Tip
                        </h4>
                        <p className="text-sm text-olive-700">
                          Start with one barber to test the system, then add more team members as needed. You can always edit details later.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-6 mt-6 border-t border-gray-100">
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 transition-colors"
                    onClick={onClose}
                  >
                    Maybe Later
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 transition-colors"
                    onClick={onProceedToAdd}
                  >
                    <UserPlusIcon className="w-4 h-4 mr-2" />
                    Add Barber
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </button>
                </div>

                {/* Footer note */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center">
                    Takes about 2-3 minutes to complete
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

// Simplified version for other contexts
export function AddBarberPrompt({ onProceedToAdd, className = '' }) {
  return (
    <div className={`bg-olive-50 border border-olive-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <UserPlusIcon className="w-5 h-5 text-olive-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-olive-800 mb-1">
            Ready to Add Your First Barber?
          </h4>
          <p className="text-sm text-olive-700 mb-3">
            Set up your team member details and start accepting bookings.
          </p>
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-olive-700 bg-olive-100 hover:bg-olive-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 transition-colors"
            onClick={onProceedToAdd}
          >
            <UserPlusIcon className="w-3 h-3 mr-1" />
            Add Barber
          </button>
        </div>
      </div>
    </div>
  )
}
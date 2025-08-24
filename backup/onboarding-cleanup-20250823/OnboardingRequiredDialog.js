'use client'

import { Dialog, Transition } from '@headlessui/react'
import { 
  ExclamationTriangleIcon, 
  BuildingStorefrontIcon,
  ArrowRightIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'
import { Fragment } from 'react'

export default function OnboardingRequiredDialog({ 
  isOpen, 
  onClose, 
  onGoToOnboarding,
  actionAttempted = 'add a barber'
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                    <Dialog.Title
                      as="h3"
                      className="ml-3 text-lg font-semibold leading-6 text-gray-900"
                    >
                      Complete Setup First
                    </Dialog.Title>
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
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    To {actionAttempted}, you'll need to finish setting up your barbershop location first. 
                    This helps us organize your team and appointments properly.
                  </p>

                  <div className="bg-olive-50 border border-olive-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <BuildingStorefrontIcon className="w-5 h-5 text-olive-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-olive-800 mb-1">
                          What's Missing?
                        </h4>
                        <ul className="text-sm text-olive-700 space-y-1">
                          <li>• Barbershop name and location</li>
                          <li>• Basic business information</li>
                          <li>• Initial preferences</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-6">
                    Don't worry - this only takes a few minutes, and you can come back to your calendar right after.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 transition-colors"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 transition-colors"
                    onClick={onGoToOnboarding}
                  >
                    <BuildingStorefrontIcon className="w-4 h-4 mr-2" />
                    Finish Setup
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </button>
                </div>

                {/* Footer note */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center">
                    Your progress will be saved automatically
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
export function OnboardingRequiredAlert({ 
  onGoToOnboarding, 
  actionAttempted = 'perform this action',
  className = ''
}) {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800 mb-1">
            Complete Setup Required
          </h4>
          <p className="text-sm text-amber-700 mb-3">
            To {actionAttempted}, please finish setting up your barbershop location first.
          </p>
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
            onClick={onGoToOnboarding}
          >
            <BuildingStorefrontIcon className="w-3 h-3 mr-1" />
            Finish Setup
          </button>
        </div>
      </div>
    </div>
  )
}
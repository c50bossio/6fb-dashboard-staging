'use client'

import { Dialog, Transition } from '@headlessui/react'
import { MagnifyingGlassIcon, UserIcon, PhoneIcon, EnvelopeIcon, StarIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useState, useEffect, Fragment, useCallback } from 'react'

export default function CustomerSearchModal({
  isOpen,
  onClose,
  onSelectCustomer,
  onCreateNewCustomer,
  barbershopId
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const searchCustomers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setCustomers([])
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}&barbershop_id=${barbershopId}&limit=10`)
      
      if (!response.ok) {
        throw new Error('Failed to search customers')
      }

      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error searching customers:', error)
      setError('Failed to search customers. Please try again.')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCustomers(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchCustomers])

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    onSelectCustomer(customer)
    onClose()
  }

  const handleCreateNew = () => {
    onCreateNewCustomer()
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setCustomers([])
      setSelectedCustomer(null)
      setError('')
    }
  }, [isOpen])

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
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                    Find Customer
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    autoFocus
                  />
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-olive-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Searching customers...</span>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Search Results */}
                {!loading && searchQuery.length >= 2 && customers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Found {customers.length} customer{customers.length !== 1 ? 's' : ''}
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900 truncate">
                                  {customer.display_name}
                                </span>
                                {customer.vip_status && (
                                  <StarIconSolid className="h-4 w-4 text-yellow-400" title="VIP Customer" />
                                )}
                              </div>
                              
                              {customer.contact_info && (
                                <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                                  <PhoneIcon className="h-3 w-3" />
                                  <span className="truncate">{customer.contact_info}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span>Last visit: {customer.last_visit_display}</span>
                                <span>{customer.total_visits} visit{customer.total_visits !== 1 ? 's' : ''}</span>
                              </div>
                              
                              {customer.is_frequent_customer && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-moss-100 text-moss-900">
                                    Frequent Customer
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-2 h-2 bg-olive-500 rounded-full"></div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {!loading && searchQuery.length >= 2 && customers.length === 0 && (
                  <div className="text-center py-8">
                    <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No customers match "{searchQuery}"
                    </p>
                  </div>
                )}

                {/* Instructions */}
                {searchQuery.length < 2 && (
                  <div className="text-center py-8">
                    <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Search for customers</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Type a name, phone number, or email to find existing customers
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create New Customer
                  </button>
                  
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500 focus:outline-none"
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
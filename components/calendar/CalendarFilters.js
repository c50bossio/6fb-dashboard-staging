'use client'

import { Fragment, useState } from 'react'
import { Dialog, Disclosure, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  FunnelIcon,
  ChevronUpIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

const SERVICE_CATEGORIES = [
  { id: 'haircut', label: 'Haircut', color: 'bg-blue-100 text-blue-800' },
  { id: 'beard', label: 'Beard Trim', color: 'bg-green-100 text-green-800' },
  { id: 'color', label: 'Hair Color', color: 'bg-purple-100 text-purple-800' },
  { id: 'treatment', label: 'Treatment', color: 'bg-pink-100 text-pink-800' },
  { id: 'combo', label: 'Combo Service', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
]

const APPOINTMENT_STATUSES = [
  { id: 'confirmed', label: 'Confirmed', icon: CheckCircleIcon, color: 'text-green-600' },
  { id: 'pending', label: 'Pending', icon: ClockIcon, color: 'text-yellow-600' },
  { id: 'in_progress', label: 'In Progress', icon: ClockIcon, color: 'text-blue-600' },
  { id: 'completed', label: 'Completed', icon: CheckCircleIcon, color: 'text-gray-600' },
  { id: 'cancelled', label: 'Cancelled', icon: XCircleIcon, color: 'text-red-600' },
  { id: 'no_show', label: 'No Show', icon: ExclamationCircleIcon, color: 'text-orange-600' }
]

const TIME_RANGES = [
  { id: 'morning', label: 'Morning (6am-12pm)', start: '06:00', end: '12:00' },
  { id: 'afternoon', label: 'Afternoon (12pm-5pm)', start: '12:00', end: '17:00' },
  { id: 'evening', label: 'Evening (5pm-10pm)', start: '17:00', end: '22:00' },
  { id: 'all_day', label: 'All Day', start: '00:00', end: '23:59' }
]

export default function CalendarFilters({
  onFiltersChange,
  showLocationFilter = false,
  showBarberFilter = false,
  locations = [],
  barbers = [],
  initialFilters = {}
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({
    serviceCategories: initialFilters.serviceCategories || [],
    statuses: initialFilters.statuses || ['confirmed', 'pending', 'in_progress'],
    timeRange: initialFilters.timeRange || 'all_day',
    dateRange: initialFilters.dateRange || { start: null, end: null },
    priceRange: initialFilters.priceRange || { min: null, max: null },
    showRecurring: initialFilters.showRecurring !== false,
    showWalkIns: initialFilters.showWalkIns !== false,
    selectedLocations: initialFilters.selectedLocations || [],
    selectedBarbers: initialFilters.selectedBarbers || []
  })
  
  const [activeFilterCount, setActiveFilterCount] = useState(0)
  
  // Calculate active filter count
  const calculateActiveFilters = (currentFilters) => {
    let count = 0
    if (currentFilters.serviceCategories.length > 0) count++
    if (currentFilters.statuses.length < APPOINTMENT_STATUSES.length - 2) count++ // Exclude cancelled and no-show by default
    if (currentFilters.timeRange !== 'all_day') count++
    if (currentFilters.dateRange.start || currentFilters.dateRange.end) count++
    if (currentFilters.priceRange.min || currentFilters.priceRange.max) count++
    if (!currentFilters.showRecurring) count++
    if (!currentFilters.showWalkIns) count++
    if (currentFilters.selectedLocations.length > 0 && currentFilters.selectedLocations.length < locations.length) count++
    if (currentFilters.selectedBarbers.length > 0 && currentFilters.selectedBarbers.length < barbers.length) count++
    return count
  }
  
  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value }
    setFilters(newFilters)
    setActiveFilterCount(calculateActiveFilters(newFilters))
  }
  
  const applyFilters = () => {
    onFiltersChange?.(filters)
    setIsOpen(false)
  }
  
  const resetFilters = () => {
    const defaultFilters = {
      serviceCategories: [],
      statuses: ['confirmed', 'pending', 'in_progress'],
      timeRange: 'all_day',
      dateRange: { start: null, end: null },
      priceRange: { min: null, max: null },
      showRecurring: true,
      showWalkIns: true,
      selectedLocations: [],
      selectedBarbers: []
    }
    setFilters(defaultFilters)
    setActiveFilterCount(0)
    onFiltersChange?.(defaultFilters)
  }
  
  return (
    <>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
      >
        <FunnelIcon className="h-5 w-5 mr-2 text-gray-400" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-olive-100 text-olive-800">
            {activeFilterCount}
          </span>
        )}
      </button>
      
      {/* Filter Dialog */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                  <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                      onClick={() => setIsOpen(false)}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                        Calendar Filters
                      </Dialog.Title>
                      
                      <div className="mt-6 space-y-6">
                        {/* Service Categories */}
                        <Disclosure defaultOpen>
                          {({ open }) => (
                            <>
                              <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100">
                                <span className="flex items-center">
                                  <TagIcon className="h-5 w-5 mr-2" />
                                  Service Categories
                                </span>
                                <ChevronUpIcon className={`${open ? 'rotate-180 transform' : ''} h-5 w-5`} />
                              </Disclosure.Button>
                              <Disclosure.Panel className="px-4 pb-2 pt-4">
                                <div className="grid grid-cols-3 gap-3">
                                  {SERVICE_CATEGORIES.map((category) => (
                                    <label key={category.id} className="flex items-center">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded text-olive-600 focus:ring-olive-500"
                                        checked={filters.serviceCategories.includes(category.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            handleFilterChange('serviceCategories', [...filters.serviceCategories, category.id])
                                          } else {
                                            handleFilterChange('serviceCategories', filters.serviceCategories.filter(c => c !== category.id))
                                          }
                                        }}
                                      />
                                      <span className={`ml-2 text-sm ${category.color} px-2 py-1 rounded`}>
                                        {category.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </Disclosure.Panel>
                            </>
                          )}
                        </Disclosure>
                        
                        {/* Appointment Status */}
                        <Disclosure defaultOpen>
                          {({ open }) => (
                            <>
                              <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100">
                                <span className="flex items-center">
                                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                                  Appointment Status
                                </span>
                                <ChevronUpIcon className={`${open ? 'rotate-180 transform' : ''} h-5 w-5`} />
                              </Disclosure.Button>
                              <Disclosure.Panel className="px-4 pb-2 pt-4">
                                <div className="grid grid-cols-2 gap-3">
                                  {APPOINTMENT_STATUSES.map((status) => (
                                    <label key={status.id} className="flex items-center">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded text-olive-600 focus:ring-olive-500"
                                        checked={filters.statuses.includes(status.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            handleFilterChange('statuses', [...filters.statuses, status.id])
                                          } else {
                                            handleFilterChange('statuses', filters.statuses.filter(s => s !== status.id))
                                          }
                                        }}
                                      />
                                      <span className="ml-2 flex items-center text-sm">
                                        <status.icon className={`h-4 w-4 mr-1 ${status.color}`} />
                                        {status.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </Disclosure.Panel>
                            </>
                          )}
                        </Disclosure>
                        
                        {/* Time Range */}
                        <Disclosure>
                          {({ open }) => (
                            <>
                              <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100">
                                <span className="flex items-center">
                                  <ClockIcon className="h-5 w-5 mr-2" />
                                  Time Range
                                </span>
                                <ChevronUpIcon className={`${open ? 'rotate-180 transform' : ''} h-5 w-5`} />
                              </Disclosure.Button>
                              <Disclosure.Panel className="px-4 pb-2 pt-4">
                                <div className="space-y-2">
                                  {TIME_RANGES.map((range) => (
                                    <label key={range.id} className="flex items-center">
                                      <input
                                        type="radio"
                                        name="timeRange"
                                        className="h-4 w-4 text-olive-600 focus:ring-olive-500"
                                        checked={filters.timeRange === range.id}
                                        onChange={() => handleFilterChange('timeRange', range.id)}
                                      />
                                      <span className="ml-2 text-sm text-gray-700">{range.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </Disclosure.Panel>
                            </>
                          )}
                        </Disclosure>
                        
                        {/* Date Range */}
                        <Disclosure>
                          {({ open }) => (
                            <>
                              <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100">
                                <span className="flex items-center">
                                  <CalendarIcon className="h-5 w-5 mr-2" />
                                  Date Range
                                </span>
                                <ChevronUpIcon className={`${open ? 'rotate-180 transform' : ''} h-5 w-5`} />
                              </Disclosure.Button>
                              <Disclosure.Panel className="px-4 pb-2 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                    <input
                                      type="date"
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                                      value={filters.dateRange.start || ''}
                                      onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                                    <input
                                      type="date"
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                                      value={filters.dateRange.end || ''}
                                      onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </Disclosure.Panel>
                            </>
                          )}
                        </Disclosure>
                        
                        {/* Price Range */}
                        <Disclosure>
                          {({ open }) => (
                            <>
                              <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-50 px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100">
                                <span className="flex items-center">
                                  <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                                  Price Range
                                </span>
                                <ChevronUpIcon className={`${open ? 'rotate-180 transform' : ''} h-5 w-5`} />
                              </Disclosure.Button>
                              <Disclosure.Panel className="px-4 pb-2 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Min Price</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="5"
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                                      placeholder="$0"
                                      value={filters.priceRange.min || ''}
                                      onChange={(e) => handleFilterChange('priceRange', { ...filters.priceRange, min: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Max Price</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="5"
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                                      placeholder="$500"
                                      value={filters.priceRange.max || ''}
                                      onChange={(e) => handleFilterChange('priceRange', { ...filters.priceRange, max: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </Disclosure.Panel>
                            </>
                          )}
                        </Disclosure>
                        
                        {/* Additional Options */}
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded text-olive-600 focus:ring-olive-500"
                              checked={filters.showRecurring}
                              onChange={(e) => handleFilterChange('showRecurring', e.target.checked)}
                            />
                            <span className="ml-2 text-sm text-gray-700">Show Recurring Appointments</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded text-olive-600 focus:ring-olive-500"
                              checked={filters.showWalkIns}
                              onChange={(e) => handleFilterChange('showWalkIns', e.target.checked)}
                            />
                            <span className="ml-2 text-sm text-gray-700">Show Walk-ins</span>
                          </label>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="mt-6 flex justify-between">
                        <button
                          type="button"
                          className="text-sm text-gray-500 hover:text-gray-700"
                          onClick={resetFilters}
                        >
                          Reset All Filters
                        </button>
                        <div className="space-x-3">
                          <button
                            type="button"
                            className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            onClick={() => setIsOpen(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="inline-flex justify-center rounded-md bg-olive-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-olive-500"
                            onClick={applyFilters}
                          >
                            Apply Filters
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  )
}
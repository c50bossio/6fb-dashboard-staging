'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import MobileBottomSheet from './MobileBottomSheet'

/**
 * Mobile-optimized calendar filters component
 * Provides swipe-up drawer with filters and search for mobile devices
 *
 * Features:
 * - Quick search by customer name/phone
 * - Date range filter
 * - Barber filter (multi-select)
 * - Status filter (confirmed, completed, cancelled)
 * - "Today only" quick toggle
 */
export default function MobileCalendarFilters({
  isOpen,
  onClose,
  onApplyFilters,
  barbers = [],
  currentFilters = {}
}) {
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose()
      }
      // Cmd/Ctrl + Enter to apply
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleApply()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
  const [searchQuery, setSearchQuery] = useState(currentFilters.search || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  const [dateRange, setDateRange] = useState(currentFilters.dateRange || 'all')
  const [selectedBarbers, setSelectedBarbers] = useState(currentFilters.barbers || [])
  const [selectedStatuses, setSelectedStatuses] = useState(currentFilters.statuses || [])
  const [todayOnly, setTodayOnly] = useState(currentFilters.todayOnly || false)

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(currentFilters.search || '')
      setDebouncedSearch(currentFilters.search || '')
      setDateRange(currentFilters.dateRange || 'all')
      setSelectedBarbers(currentFilters.barbers || [])
      setSelectedStatuses(currentFilters.statuses || [])
      setTodayOnly(currentFilters.todayOnly || false)
    }
  }, [isOpen, currentFilters])

  // Memoize handlers for better performance
  const handleApply = useCallback(() => {
    const filters = {
      search: searchQuery.trim(),
      dateRange,
      barbers: selectedBarbers,
      statuses: selectedStatuses,
      todayOnly
    }
    onApplyFilters(filters)
    onClose()
  }, [searchQuery, dateRange, selectedBarbers, selectedStatuses, todayOnly, onApplyFilters, onClose])

  const handleClearAll = useCallback(() => {
    setSearchQuery('')
    setDebouncedSearch('')
    setDateRange('all')
    setSelectedBarbers([])
    setSelectedStatuses([])
    setTodayOnly(false)
  }, [])

  const toggleBarber = useCallback((barberId) => {
    setSelectedBarbers(prev =>
      prev.includes(barberId)
        ? prev.filter(id => id !== barberId)
        : [...prev, barberId]
    )
  }, [])

  const toggleStatus = useCallback((status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }, [])

  // Memoize active filters count calculation
  const activeFiltersCount = useMemo(() => {
    return [
      searchQuery.trim() ? 1 : 0,
      dateRange !== 'all' ? 1 : 0,
      selectedBarbers.length > 0 ? 1 : 0,
      selectedStatuses.length > 0 ? 1 : 0,
      todayOnly ? 1 : 0
    ].reduce((a, b) => a + b, 0)
  }, [searchQuery, dateRange, selectedBarbers.length, selectedStatuses.length, todayOnly])

  const statuses = [
    { id: 'CONFIRMED', label: 'Confirmed', color: 'bg-blue-500' },
    { id: 'COMPLETED', label: 'Completed', color: 'bg-green-500' },
    { id: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500' },
    { id: 'NO_SHOW', label: 'No Show', color: 'bg-gray-500' }
  ]

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Appointments"
      maxHeight="85vh"
    >
      <div className="space-y-6 pb-6" role="form" aria-label="Calendar filters">
        {/* Search Bar */}
        <div role="search">
          <label
            htmlFor="customer-search"
            className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
          >
            Search Customer
          </label>
          <div className="relative">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="customer-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name or phone number..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:border-[#546355] focus:ring-2 focus:ring-[#546355] focus:ring-opacity-20 transition-colors"
              autoFocus={isOpen}
              aria-label="Search customers by name or phone"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Today Only Quick Toggle */}
        <div>
          <label
            htmlFor="today-only-toggle"
            className="flex items-center justify-between p-4 bg-[#546355]/10 dark:bg-[#546355]/20 rounded-lg cursor-pointer hover:bg-[#546355]/15 dark:hover:bg-[#546355]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-[#546355] rounded-full" aria-hidden="true">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="block font-semibold text-gray-900 dark:text-gray-100">Today Only</span>
                <span className="block text-sm text-gray-600 dark:text-gray-400">Show only today's appointments</span>
              </div>
            </div>
            <input
              id="today-only-toggle"
              type="checkbox"
              checked={todayOnly}
              onChange={(e) => setTodayOnly(e.target.checked)}
              className="w-6 h-6 text-[#546355] border-gray-300 rounded focus:ring-[#546355] focus:ring-2"
              aria-label="Show only today's appointments"
            />
          </label>
        </div>

        {/* Date Range Filter */}
        <div role="radiogroup" aria-label="Date range filter">
          <p className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Date Range
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'all', label: 'All Dates' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  dateRange === option.value
                    ? 'bg-[#546355] text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                role="radio"
                aria-checked={dateRange === option.value}
                aria-label={`Filter by ${option.label.toLowerCase()}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Barber Filter */}
        {barbers.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Barbers ({selectedBarbers.length} selected)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {barbers.map(barber => (
                <label
                  key={barber.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedBarbers.includes(barber.id)}
                    onChange={() => toggleBarber(barber.id)}
                    className="w-5 h-5 text-[#546355] border-gray-300 rounded focus:ring-[#546355] focus:ring-2"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {barber.avatar_url ? (
                      <img
                        src={barber.avatar_url}
                        alt={barber.title || barber.full_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-[#546355] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {(barber.title || barber.full_name || 'B').charAt(0)}
                      </div>
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {barber.title || barber.full_name}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Status ({selectedStatuses.length} selected)
          </label>
          <div className="space-y-2">
            {statuses.map(status => (
              <label
                key={status.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status.id)}
                  onChange={() => toggleStatus(status.id)}
                  className="w-5 h-5 text-[#546355] border-gray-300 rounded focus:ring-[#546355] focus:ring-2"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-3 h-3 rounded-full ${status.color}`} />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {status.label}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClearAll}
            disabled={activeFiltersCount === 0}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 px-4 bg-[#546355] text-white font-semibold rounded-lg hover:bg-[#3C4A3E] transition-colors shadow-md relative"
          >
            Apply Filters
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#C5A35B] text-white text-xs font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  )
}

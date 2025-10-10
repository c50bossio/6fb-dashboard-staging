'use client'

import { memo } from 'react'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClockIcon,
  QrCodeIcon,
  ShareIcon,
  ClipboardIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

/**
 * Calendar Toolbar Component
 * Contains view switching, navigation controls, and sharing features
 */
const CalendarToolbar = memo(function CalendarToolbar({
  currentView,
  onViewChange,
  currentTime,
  shareDropdownOpen,
  onShareToggle,
  onCloseShareDropdown,
  quickLinks = [],
  copied = {},
  onQRGenerate,
  onCopyLink,
  mounted = false
}) {
  const viewOptions = [
    { value: 'resourceTimeGridDay', label: 'Day View', shortLabel: 'Day' },
    { value: 'resourceTimeGridWeek', label: 'Week View', shortLabel: 'Week' },
    { value: 'dayGridMonth', label: 'Month View', shortLabel: 'Month' },
    { value: 'listWeek', label: 'List View', shortLabel: 'List' }
  ]

  const currentViewOption = viewOptions.find(option => option.value === currentView)

  const organizedLinks = quickLinks.reduce(
    (acc, link) => {
      if (link.type === 'location') {
        acc.locations.push(link)
      } else if (link.type === 'barber') {
        acc.barbers.push(link)
      }
      return acc
    },
    { locations: [], barbers: [] }
  )

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Title and Navigation */}
          <div className="flex items-center space-x-4">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
              Calendar Management
            </h1>
            
            {/* View Switcher */}
            <div className="relative hidden sm:block">
              <select
                value={currentView}
                onChange={(e) => onViewChange(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              >
                {viewOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Mobile View Switcher */}
            <div className="sm:hidden">
              <span className="text-sm font-medium text-gray-700">
                {currentViewOption?.shortLabel || 'Day'}
              </span>
            </div>
          </div>

          {/* Right side: Actions and Time */}
          <div className="flex items-center space-x-3">
            {/* Share/QR Code Dropdown */}
            <div className="relative">
              <button
                onClick={onShareToggle}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
              >
                <ShareIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Share</span>
                <ChevronDownIcon className="ml-1 h-4 w-4" />
              </button>

              {/* Share Dropdown */}
              {shareDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={onCloseShareDropdown}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="p-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Quick Booking Links
                        </h3>
                        <button
                          onClick={onCloseShareDropdown}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      {quickLinks.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No booking links available
                        </div>
                      ) : (
                        <>
                          {/* Locations Section */}
                          {organizedLinks.locations.length > 0 && (
                            <div>
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                🏪 LOCATIONS
                              </div>
                              {organizedLinks.locations.map((link) => {
                                const IconComponent = link.icon
                                return (
                                  <div key={link.id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50 border-b border-gray-100">
                                    <div className="flex items-center space-x-3">
                                      <div className="h-8 w-8 bg-olive-100 rounded-lg flex items-center justify-center">
                                        <IconComponent className="h-4 w-4 text-olive-600" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{link.title}</div>
                                        <div className="text-xs text-gray-500">{link.subtitle}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button 
                                        onClick={() => onQRGenerate({ id: link.id, title: link.title, url: link.url })}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                        title="Generate QR Code"
                                      >
                                        <QrCodeIcon className="h-4 w-4" />
                                      </button>
                                      <button 
                                        onClick={() => onCopyLink(link.url, link.id)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                        title="Copy Link"
                                      >
                                        {copied[link.id] ? (
                                          <CheckIcon className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ClipboardIcon className="h-4 w-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Barbers Section */}
                          {organizedLinks.barbers.length > 0 && (
                            <div>
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                👤 BARBERS
                              </div>
                              {organizedLinks.barbers.map((link) => {
                                const IconComponent = link.icon
                                return (
                                  <div key={link.id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                      <div className="h-8 w-8 bg-gold-100 rounded-lg flex items-center justify-center">
                                        <IconComponent className="h-4 w-4 text-gold-600" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{link.title}</div>
                                        <div className="text-xs text-gray-500">{link.subtitle}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button 
                                        onClick={() => onQRGenerate({ id: link.id, title: link.title, url: link.url })}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                        title="Generate QR Code"
                                      >
                                        <QrCodeIcon className="h-4 w-4" />
                                      </button>
                                      <button 
                                        onClick={() => onCopyLink(link.url, link.id)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                        title="Copy Link"
                                      >
                                        {copied[link.id] ? (
                                          <CheckIcon className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <ClipboardIcon className="h-4 w-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Current Time */}
            {mounted && (
              <div className="hidden sm:flex items-center text-sm text-gray-600">
                <ClockIcon className="h-4 w-4 mr-1" />
                {currentTime}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

CalendarToolbar.displayName = 'CalendarToolbar'

export default CalendarToolbar
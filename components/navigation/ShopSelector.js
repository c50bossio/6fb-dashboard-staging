'use client'

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  ChevronDownIcon,
  BuildingStorefrontIcon,
  CheckIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'

export default function ShopSelector({ collapsed = false }) {
  // Use GlobalDashboardContext as single source of truth
  const {
    availableLocations,
    availableContexts,
    activeContext,
    switchContext,
    isLoading,
    currentLocation
  } = useGlobalDashboard()

  // Find the manager context for the current location (for switching)
  const getContextForLocation = (locationId) => {
    // Find the manager or booking context for this location
    return availableContexts?.find(ctx =>
      ctx.locationId === locationId &&
      (ctx.contextType === 'manager' || ctx.contextType === 'booking')
    )
  }

  const handleLocationSwitch = async (location) => {
    const contextToSwitch = getContextForLocation(location.id)
    if (contextToSwitch) {
      console.log('🔄 [ShopSelector] Switching to location:', location.name)
      await switchContext(contextToSwitch)
    }
  }

  // Show single shop info if only one shop (no dropdown needed)
  if (availableLocations?.length === 1 && currentLocation) {
    if (collapsed) {
      return (
        <div className="px-2 py-3 border-b border-border">
          <div className="flex items-center justify-center">
            <div
              className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center"
              title={`${currentLocation.name} - ${currentLocation.city}, ${currentLocation.state}`}
            >
              <BuildingStorefrontIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <BuildingStorefrontIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {currentLocation.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentLocation.city}, {currentLocation.state}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Don't show if no shops loaded yet and not loading
  if (!availableLocations || (availableLocations.length === 0 && !isLoading)) {
    return null
  }

  if (isLoading) {
    if (collapsed) {
      return (
        <div className="px-2 py-3 border-b border-border">
          <div className="animate-pulse flex items-center justify-center">
            <div className="w-10 h-10 bg-muted rounded-lg"></div>
          </div>
        </div>
      )
    }

    return (
      <div className="px-4 py-3 border-b border-border">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  // Collapsed view - compact icon with dropdown
  if (collapsed) {
    return (
      <div className="px-2 py-3 border-b border-border">
        <Menu as="div" className="relative">
          <Menu.Button
            className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            title={currentLocation?.name || 'Select Shop'}
          >
            <BuildingStorefrontIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-0 mt-2 w-64 bg-card rounded-lg shadow-lg ring-1 ring-border focus:outline-none z-50 max-h-60 overflow-auto">
              <div className="py-1">
                {availableLocations?.map((location) => (
                  <Menu.Item key={location.id}>
                    {({ active }) => (
                      <button
                        onClick={() => handleLocationSwitch(location)}
                        className={`${
                          active ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                        } ${
                          currentLocation?.id === location.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                        } group flex items-center w-full px-4 py-3 text-sm`}
                      >
                        <BuildingStorefrontIcon
                          className={`mr-3 h-5 w-5 flex-shrink-0 ${
                            currentLocation?.id === location.id
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${
                            currentLocation?.id === location.id
                              ? 'text-amber-900 dark:text-amber-100'
                              : 'text-foreground'
                          }`}>
                            {location.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {location.city}, {location.state}
                          </p>
                        </div>
                        {currentLocation?.id === location.id && (
                          <CheckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        )}
                      </button>
                    )}
                  </Menu.Item>
                ))}

                {/* Add Location Button */}
                <div className="border-t border-border mt-1 pt-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => window.location.href = '/enterprise/website'}
                        className={`${
                          active ? 'bg-olive-50 dark:bg-olive-900/20' : ''
                        } group flex items-center w-full px-4 py-3 text-sm text-olive-700 dark:text-olive-300 hover:text-olive-900 dark:hover:text-olive-100`}
                      >
                        <PlusIcon className="mr-3 h-5 w-5 flex-shrink-0" />
                        <span className="font-medium">Add Location</span>
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    )
  }

  // Expanded view - full details with dropdown
  return (
    <div className="px-4 py-3 border-b border-border">
      <Menu as="div" className="relative">
        <Menu.Button className="w-full flex items-center space-x-3 hover:bg-muted rounded-lg p-2 -m-2 transition-colors">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <BuildingStorefrontIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">
              {currentLocation?.name || 'Select Shop'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentLocation ? `${currentLocation.city}, ${currentLocation.state}` : 'No location'}
            </p>
          </div>
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute left-0 right-0 mt-2 bg-card rounded-lg shadow-lg ring-1 ring-border focus:outline-none z-50 max-h-60 overflow-auto">
            <div className="py-1">
              {availableLocations?.map((location) => (
                <Menu.Item key={location.id}>
                  {({ active }) => (
                    <button
                      onClick={() => handleLocationSwitch(location)}
                      className={`${
                        active ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                      } ${
                        currentLocation?.id === location.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                      } group flex items-center w-full px-4 py-3 text-sm`}
                    >
                      <BuildingStorefrontIcon
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${
                          currentLocation?.id === location.id
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-medium ${
                          currentLocation?.id === location.id
                            ? 'text-amber-900 dark:text-amber-100'
                            : 'text-foreground'
                        }`}>
                          {location.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {location.city}, {location.state}
                        </p>
                      </div>
                      {currentLocation?.id === location.id && (
                        <CheckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      )}
                    </button>
                  )}
                </Menu.Item>
              ))}

              {/* Add Location Button - Always visible for enterprise/shop owners */}
              <div className="border-t border-border mt-1 pt-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => window.location.href = '/enterprise/website'}
                      className={`${
                        active ? 'bg-olive-50 dark:bg-olive-900/20' : ''
                      } group flex items-center w-full px-4 py-3 text-sm text-olive-700 dark:text-olive-300 hover:text-olive-900 dark:hover:text-olive-100`}
                    >
                      <PlusIcon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">Add Location</span>
                    </button>
                  )}
                </Menu.Item>
              </div>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  )
}

'use client'

import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'
import { useAuth } from '@/components/SupabaseAuthProvider'
import LocationSelector from '@/components/navigation/LocationSelector'

export default function SettingsBreadcrumb() {
  const pathname = usePathname()
  const router = useRouter()
  const [selectedLocation, setSelectedLocation] = useState(null)
  const { activeContext } = useGlobalDashboard()
  const { profile } = useAuth()

  const userRole = profile?.role || 'CLIENT'
  const showLocationSelector = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)

  // Parse the current path to create breadcrumb items
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs = [
      { name: 'Dashboard', path: '/dashboard', icon: HomeIcon }
    ]

    // Build breadcrumb trail
    let currentPath = ''
    paths.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      // Format segment name
      let name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      // Special handling for known segments
      if (segment === 'shop') name = 'Shop'
      if (segment === 'settings') name = 'Settings'
      if (segment === 'staff') name = 'Staff & Permissions'
      if (segment === 'tax') name = 'Tax & Compliance'
      
      breadcrumbs.push({
        name,
        path: currentPath,
        isLast: index === paths.length - 1
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
              )}
              {crumb.isLast ? (
                <span className="text-gray-900 font-medium flex items-center">
                  {crumb.icon && <crumb.icon className="h-4 w-4 mr-1" />}
                  {crumb.name}
                </span>
              ) : (
                <button
                  onClick={() => router.push(crumb.path)}
                  className="text-gray-600 hover:text-olive-600 transition-colors flex items-center"
                >
                  {crumb.icon && <crumb.icon className="h-4 w-4 mr-1" />}
                  {crumb.name}
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Location Selector */}
        {showLocationSelector && (
          <div className="flex items-center space-x-4">
            <LocationSelector
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
              showContextOptions={true}
              compact={true}
            />
          </div>
        )}
      </div>

      {/* Context Info Bar */}
      {activeContext && showLocationSelector && (
        <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
          <span className="text-blue-700">
            Settings for <span className="font-medium">{activeContext.locationName}</span>
            {' '}• {activeContext.contextType.charAt(0).toUpperCase() + activeContext.contextType.slice(1)} View
          </span>
        </div>
      )}
    </div>
  )
}
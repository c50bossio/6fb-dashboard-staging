'use client'

import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import { usePathname, useRouter } from 'next/navigation'

export default function SettingsBreadcrumb() {
  const pathname = usePathname()
  const router = useRouter()

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
    <nav className="flex items-center space-x-2 text-sm mb-4">
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
  )
}
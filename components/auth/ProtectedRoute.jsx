/**
 * Protected Route Component
 * Wraps components to provide authentication and authorization protection
 */

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { hasRoleAccess, UserRoles } from '@/lib/auth-utils'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ProtectedRoute({ 
  children, 
  requiredRole = null, 
  requiredRoles = [], 
  requiredPermission = null,
  fallbackUrl = '/auth/signin',
  loadingComponent = null,
  unauthorizedComponent = null,
  showLoading = true,
  redirectOnUnauthorized = true
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuthorization = () => {
      if (status === 'loading') {
        setIsChecking(true)
        return
      }

      // User is not authenticated
      if (status === 'unauthenticated' || !session?.user) {
        setIsAuthorized(false)
        setIsChecking(false)
        
        if (redirectOnUnauthorized) {
          const currentPath = window.location.pathname
          const callbackUrl = encodeURIComponent(currentPath)
          router.push(`${fallbackUrl}?callbackUrl=${callbackUrl}`)
        }
        return
      }

      // User is authenticated, check authorization
      const userRole = session.user.role
      let authorized = true

      // Check single required role
      if (requiredRole) {
        authorized = userRole === requiredRole || hasRoleAccess(userRole, requiredRole)
      }

      // Check multiple required roles (user must have one of them)
      if (requiredRoles.length > 0) {
        authorized = requiredRoles.some(role => 
          userRole === role || hasRoleAccess(userRole, role)
        )
      }

      // Check required permission
      if (requiredPermission && session.user.permissions) {
        authorized = session.user.permissions.includes(requiredPermission) ||
                    session.user.permissions.includes('admin_all')
      }

      // Check if user account is active
      if (session.user.isActive === false) {
        authorized = false
      }

      setIsAuthorized(authorized)
      setIsChecking(false)

      // Redirect if unauthorized
      if (!authorized && redirectOnUnauthorized) {
        router.push('/auth/access-denied')
      }
    }

    checkAuthorization()
  }, [session, status, requiredRole, requiredRoles, requiredPermission, router, fallbackUrl, redirectOnUnauthorized])

  // Show loading state
  if (isChecking || status === 'loading') {
    if (loadingComponent) {
      return loadingComponent
    }

    if (showLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }

    return null
  }

  // Show unauthorized state
  if (!isAuthorized) {
    if (unauthorizedComponent) {
      return unauthorizedComponent
    }

    if (!redirectOnUnauthorized) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-600" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have permission to access this resource.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  // User is authorized, render children
  return children
}

// HOC version for easier wrapping
export function withProtectedRoute(Component, protectionOptions = {}) {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute {...protectionOptions}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Role-specific protection components
export function AdminRoute({ children, ...props }) {
  return (
    <ProtectedRoute
      requiredRoles={[UserRoles.SUPER_ADMIN, UserRoles.PLATFORM_ADMIN]}
      {...props}
    >
      {children}
    </ProtectedRoute>
  )
}

export function OwnerRoute({ children, ...props }) {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRoles.SUPER_ADMIN,
        UserRoles.PLATFORM_ADMIN,
        UserRoles.ENTERPRISE_OWNER,
        UserRoles.SHOP_OWNER
      ]}
      {...props}
    >
      {children}
    </ProtectedRoute>
  )
}

export function BarberRoute({ children, ...props }) {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRoles.SUPER_ADMIN,
        UserRoles.PLATFORM_ADMIN,
        UserRoles.ENTERPRISE_OWNER,
        UserRoles.SHOP_OWNER,
        UserRoles.INDIVIDUAL_BARBER,
        UserRoles.BARBER
      ]}
      {...props}
    >
      {children}
    </ProtectedRoute>
  )
}

export function StaffRoute({ children, ...props }) {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRoles.SUPER_ADMIN,
        UserRoles.PLATFORM_ADMIN,
        UserRoles.ENTERPRISE_OWNER,
        UserRoles.SHOP_OWNER,
        UserRoles.SHOP_MANAGER,
        UserRoles.INDIVIDUAL_BARBER,
        UserRoles.BARBER,
        UserRoles.RECEPTIONIST
      ]}
      {...props}
    >
      {children}
    </ProtectedRoute>
  )
}

export function ClientRoute({ children, ...props }) {
  return (
    <ProtectedRoute
      requiredRoles={[UserRoles.CLIENT]}
      {...props}
    >
      {children}
    </ProtectedRoute>
  )
}
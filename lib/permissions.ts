/**
 * Role-Based Access Control (RBAC) Permission Middleware
 * Feature: 011-holistic-staff-management
 *
 * Enforces role-based permissions at the API level following Squire's model:
 * - Single dashboard with filtered data (server-side)
 * - Field-level restrictions for profile editing
 * - Query filtering based on user role
 */

import { createClient } from '@/lib/supabase/client'

export type UserRole = 'ADMIN' | 'MANAGER' | 'BARBER' | 'RECEPTIONIST'

export interface User {
  id: string
  email: string
  role: UserRole
  name?: string
  managed_locations?: string[] // For managers
}

/**
 * Profile editing permissions
 * Barbers can only edit specific fields, admins can edit everything
 */
export const EDITABLE_PROFILE_FIELDS = {
  BARBER: ['bio', 'specialties', 'image', 'phone'],
  RECEPTIONIST: ['bio', 'image', 'phone'],
  MANAGER: ['bio', 'specialties', 'image', 'phone', 'managed_locations'],
  ADMIN: '*' // All fields
} as const

/**
 * Check if user can edit a specific profile
 */
export function canEditProfile(user: User, targetUserId: string): {
  allowed: boolean
  editableFields?: string[]
  reason?: string
} {
  // Admins can edit anyone
  if (user.role === 'ADMIN') {
    return { allowed: true, editableFields: ['*'] }
  }

  // Users can only edit their own profile
  if (user.id !== targetUserId) {
    return { allowed: false, reason: 'Can only edit own profile' }
  }

  // Return allowed fields for this role
  return {
    allowed: true,
    editableFields: EDITABLE_PROFILE_FIELDS[user.role]
  }
}

/**
 * Check if user can view commissions
 */
export function canViewCommissions(user: User, targetUserId?: string): boolean {
  if (user.role === 'ADMIN') return true // Admins see all
  if (user.role === 'MANAGER') return true // Managers see all in their locations
  if (targetUserId && user.id === targetUserId) return true // Barbers see own only
  return false
}

/**
 * Check if user can view bookings
 */
export function canViewBookings(user: User, barberId?: string): boolean {
  if (user.role === 'ADMIN') return true // See all
  if (user.role === 'MANAGER') return true // See managed locations
  if (user.role === 'RECEPTIONIST') return true // See all (create bookings)
  if (user.role === 'BARBER' && barberId && user.id === barberId) return true // Own only
  return false
}

/**
 * Check if user can create bookings
 */
export function canCreateBookings(user: User): boolean {
  return ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(user.role)
}

/**
 * Check if user can modify cancellation policies
 */
export function canManagePolicies(user: User): boolean {
  return user.role === 'ADMIN'
}

/**
 * Filter bookings query based on user role
 * Returns Supabase query filter for role-based access
 */
export function filterBookingsByRole(
  query: any,
  user: User,
  barbershopId?: string
) {
  switch (user.role) {
    case 'ADMIN':
      // Admins see all bookings
      return query

    case 'MANAGER':
      // Managers see bookings for their managed locations
      if (user.managed_locations && user.managed_locations.length > 0) {
        return query.in('location_id', user.managed_locations)
      }
      return query.eq('id', null) // No locations = no bookings

    case 'RECEPTIONIST':
      // Receptionists see all bookings for their barbershop
      if (barbershopId) {
        return query.eq('barbershop_id', barbershopId)
      }
      return query

    case 'BARBER':
      // Barbers see only their own bookings
      return query.eq('barber_id', user.id)

    default:
      // Unknown role = no access
      return query.eq('id', null)
  }
}

/**
 * Validate profile update fields based on role
 * Throws error if trying to update restricted fields
 */
export function validateProfileUpdate(
  user: User,
  targetUserId: string,
  updateData: Record<string, any>
): { valid: boolean; error?: string } {
  const permission = canEditProfile(user, targetUserId)

  if (!permission.allowed) {
    return { valid: false, error: permission.reason }
  }

  // Admins can update any field
  if (permission.editableFields?.[0] === '*') {
    return { valid: true }
  }

  // Check if any field being updated is not in allowed list
  const attemptedFields = Object.keys(updateData)
  const restrictedFields = attemptedFields.filter(
    field => !permission.editableFields?.includes(field)
  )

  if (restrictedFields.length > 0) {
    return {
      valid: false,
      error: `Cannot update restricted fields: ${restrictedFields.join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Get current authenticated user with role
 * Used in API routes for permission checks
 */
export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Fetch user profile with role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role, name, managed_locations')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return null
    }

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      name: profile.name,
      managed_locations: profile.managed_locations
    }
  } catch (error) {
    console.error('Error fetching authenticated user:', error)
    return null
  }
}

/**
 * Permission middleware wrapper for API routes
 * Usage in route.ts:
 *
 * export async function GET(request: Request) {
 *   const user = await requireAuth(request, ['ADMIN', 'MANAGER'])
 *   if (!user) return unauthorizedResponse()
 *   // ... rest of handler
 * }
 */
export async function requireAuth(
  request: Request,
  allowedRoles?: UserRole[]
): Promise<User | null> {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    return null
  }

  // Check if user's role is in allowed list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null
  }

  return user
}

/**
 * Standard unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 })
}

/**
 * Standard forbidden response
 */
export function forbiddenResponse(message = 'Forbidden') {
  return Response.json({ error: message }, { status: 403 })
}

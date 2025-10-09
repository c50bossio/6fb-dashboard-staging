/**
 * Shop Authentication Middleware
 *
 * This utility consolidates authentication boilerplate that appears in ~89 shop API endpoints.
 * Instead of repeating ~40 lines of auth code in every endpoint, use this reusable function.
 *
 * Eliminates ~3,560 lines of duplicated authentication code across the codebase.
 *
 * @example Basic usage:
 * ```javascript
 * import { authenticateShopOwner } from '@/lib/shop-auth'
 *
 * export async function GET(request) {
 *   const { user, profile, shop, supabase } = await authenticateShopOwner(request)
 *
 *   // Now you have authenticated user, profile, shop, and supabase client
 *   const { data } = await supabase.from('appointments')
 *     .select('*')
 *     .eq('barbershop_id', shop.id)
 * }
 * ```
 *
 * @example With role checking:
 * ```javascript
 * const { user, profile, shop } = await authenticateShopOwner(request, {
 *   requiredRoles: ['SHOP_OWNER', 'SUPER_ADMIN']
 * })
 * ```
 *
 * @example Development mode bypass:
 * ```javascript
 * const { user, profile, shop } = await authenticateShopOwner(request, {
 *   allowDevBypass: true  // Allows testing without authentication in development
 * })
 * ```
 */

import { createClient } from '@/lib/supabase/server'
import { unauthorized, forbidden, notFound } from '@/lib/api-response'

/**
 * Authentication options
 * @typedef {Object} AuthOptions
 * @property {string[]} [requiredRoles] - Array of required user roles (e.g., ['SHOP_OWNER', 'SUPER_ADMIN'])
 * @property {boolean} [allowDevBypass=false] - Allow development mode bypass (uses first SHOP_OWNER in DB)
 * @property {boolean} [requireShop=true] - Require shop to exist (set to false for endpoints that create shops)
 */

/**
 * Authentication result
 * @typedef {Object} AuthResult
 * @property {Object} user - Authenticated user from Supabase
 * @property {Object} profile - User profile from profiles table
 * @property {Object|null} shop - Barbershop owned by user (null if requireShop=false)
 * @property {Object} supabase - Supabase client instance
 */

/**
 * Authenticate shop owner with full user context
 *
 * This function consolidates the common authentication pattern used across ~89 shop APIs.
 * It handles:
 * - User authentication via Supabase
 * - Development mode bypass (optional)
 * - Profile fetching with role checking
 * - Shop lookup and ownership verification
 *
 * @param {Request} request - Next.js request object
 * @param {AuthOptions} [options={}] - Authentication options
 * @returns {Promise<AuthResult>} Authentication result with user, profile, shop, and supabase
 * @throws {Response} Returns HTTP error response if authentication fails
 */
export async function authenticateShopOwner(request, options = {}) {
  const {
    requiredRoles = null,
    allowDevBypass = false,
    requireShop = true
  } = options

  const supabase = await createClient()
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Step 1: Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Handle auth failure (unless dev bypass is allowed)
  if (authError || !user) {
    if (isDevelopment && allowDevBypass) {
      // Development bypass: use first shop owner for testing
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()

      if (devUser) {
        return await authenticateWithUserId(supabase, devUser.id, {
          requiredRoles,
          requireShop,
          isDevelopment: true
        })
      }
    }

    throw unauthorized('Authentication required')
  }

  return await authenticateWithUserId(supabase, user.id, {
    requiredRoles,
    requireShop,
    isDevelopment
  })
}

/**
 * Internal helper: Authenticate with user ID
 * Fetches profile and shop information for a given user ID
 *
 * @private
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID to authenticate
 * @param {Object} options - Auth options
 * @returns {Promise<AuthResult>} Authentication result
 * @throws {Response} Returns HTTP error response if authentication fails
 */
async function authenticateWithUserId(supabase, userId, options) {
  const { requiredRoles, requireShop, isDevelopment } = options

  // Step 2: Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, barbershop_id, organization_id')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw notFound('User profile not found')
  }

  // Step 3: Check required roles (skip in development unless explicitly set)
  if (requiredRoles && (!isDevelopment || requiredRoles.length > 0)) {
    if (!requiredRoles.includes(profile.role)) {
      throw forbidden(`Must have one of the following roles: ${requiredRoles.join(', ')}`)
    }
  }

  // Step 4: Get shop(s) owned by this user
  let shop = null

  if (requireShop || profile.barbershop_id) {
    // Try to get shop by owner_id first
    const { data: shops, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, address, phone, email, timezone, business_hours, payment_settings')
      .eq('owner_id', userId)

    if (shopError) {
      console.error('[shop-auth] Error fetching shops:', shopError)

      // If table query fails but we have barbershop_id in profile, try that
      if (profile.barbershop_id) {
        const { data: profileShop } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', profile.barbershop_id)
          .single()

        shop = profileShop
      }
    } else if (shops && shops.length > 0) {
      // Use first shop owned by user
      shop = shops[0]
    } else if (profile.barbershop_id) {
      // If no owned shops but profile has barbershop_id (staff member scenario)
      const { data: profileShop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', profile.barbershop_id)
        .single()

      shop = profileShop
    }

    // If shop is required but not found, throw error
    if (requireShop && !shop) {
      throw notFound('No barbershop found for user. Please create a shop first.')
    }
  }

  // Step 5: Return authenticated context
  return {
    user: {
      id: userId,
      email: profile.email
    },
    profile,
    shop,
    supabase
  }
}

/**
 * Convenience wrapper for APIs that require shop ownership
 * Automatically checks for SHOP_OWNER, ENTERPRISE_OWNER, or SUPER_ADMIN role
 *
 * @param {Request} request - Next.js request object
 * @param {Object} [options={}] - Additional auth options
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function authenticateShopOwnerStrict(request, options = {}) {
  return authenticateShopOwner(request, {
    ...options,
    requiredRoles: ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'],
    requireShop: true
  })
}

/**
 * Convenience wrapper for APIs that work with barbers
 * Allows SHOP_OWNER, BARBER, ENTERPRISE_OWNER, or SUPER_ADMIN roles
 *
 * @param {Request} request - Next.js request object
 * @param {Object} [options={}] - Additional auth options
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function authenticateBarberOrOwner(request, options = {}) {
  return authenticateShopOwner(request, {
    ...options,
    requiredRoles: ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'],
    requireShop: true
  })
}

/**
 * Convenience wrapper for APIs that don't require a shop to exist yet
 * Useful for shop creation endpoints or user onboarding
 *
 * @param {Request} request - Next.js request object
 * @param {Object} [options={}] - Additional auth options
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function authenticateUser(request, options = {}) {
  return authenticateShopOwner(request, {
    ...options,
    requireShop: false
  })
}

/**
 * Middleware wrapper for Next.js API routes
 * Automatically handles authentication and passes context to handler
 *
 * @example
 * ```javascript
 * export const GET = withShopAuth(async (request, { user, profile, shop, supabase }) => {
 *   const { data } = await supabase.from('appointments')
 *     .select('*')
 *     .eq('barbershop_id', shop.id)
 *
 *   return success({ appointments: data })
 * })
 * ```
 *
 * @param {Function} handler - API route handler function
 * @param {AuthOptions} [options={}] - Authentication options
 * @returns {Function} Wrapped API route handler
 */
export function withShopAuth(handler, options = {}) {
  return async function wrappedHandler(request, ...args) {
    try {
      const authResult = await authenticateShopOwner(request, options)
      return await handler(request, authResult, ...args)
    } catch (error) {
      // If error is already a Response (from our auth functions), return it
      if (error instanceof Response || error?.status) {
        return error
      }
      // Otherwise, throw it to be handled by outer catch
      throw error
    }
  }
}

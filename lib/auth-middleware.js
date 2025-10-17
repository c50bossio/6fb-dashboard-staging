import { NextResponse } from 'next/server'
import { createClient } from './supabase/server'

/**
 * Authentication middleware wrapper for API routes
 * Validates user session and attaches user to request object
 *
 * @param {Function} handler - The API route handler function
 * @returns {Function} - Wrapped handler with auth check
 */
export function withAuth(handler) {
  return async function(request, context) {
    try {
      const supabase = await createClient()

      // Get current user from session
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Attach user to request object for use in handler
      request.user = user

      // Call the wrapped handler
      return await handler(request, context)

    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}

/**
 * Get user profile from Supabase profiles table
 *
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - User profile data
 */
export async function getUserProfile(userId) {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('getUserProfile error:', error)
    throw new Error(`Failed to fetch profile: ${error.message}`)
  }

  if (!profile) {
    throw new Error('Profile not found')
  }

  return profile
}

/**
 * Get user profile with optional default for development
 *
 * @param {string} userId - The user ID
 * @param {Object} defaultProfile - Optional default profile if not found
 * @returns {Promise<Object>} - User profile data or default
 */
export async function getUserProfileOrDefault(userId, defaultProfile = null) {
  try {
    return await getUserProfile(userId)
  } catch (error) {
    console.warn('getUserProfileOrDefault: Using default profile', error.message)

    if (defaultProfile) {
      return defaultProfile
    }

    // Return minimal profile structure if no default provided
    return {
      id: userId,
      email: null,
      full_name: null,
      first_name: null,
      last_name: null,
      phone: null,
      avatar_url: null,
      role: 'CLIENT',
      barbershop_id: null,
      onboarding_completed: false,
      onboarding_checklist_progress: {}
    }
  }
}

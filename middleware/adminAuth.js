import { createClient } from '../lib/supabase'

/**
 * Admin Authentication Middleware
 * Verifies that the current user has SUPER_ADMIN role
 * Used to protect admin-only routes and operations
 */
export async function verifyAdminAuth(userId) {
  if (!userId) {
    throw new Error('Authentication required')
  }

  const supabase = createClient()
  
  try {
    // Get user profile from database
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Database error during admin auth check:', error)
      throw new Error('Failed to verify admin credentials')
    }

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Check if user is active
    if (!profile.is_active) {
      throw new Error('User account is inactive')
    }

    // Check if user has SUPER_ADMIN role
    if (profile.role !== 'SUPER_ADMIN') {
      throw new Error('Insufficient permissions - SUPER_ADMIN role required')
    }

    return {
      isAdmin: true,
      userId: profile.id,
      email: profile.email,
      role: profile.role
    }
  } catch (error) {
    console.error('Admin auth verification failed:', error)
    throw error
  }
}

/**
 * Log admin actions for audit trail
 */
export async function logAdminAction(adminUserId, action, details = {}) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: adminUserId,
        action,
        details,
        ip_address: details.ipAddress || null,
        user_agent: details.userAgent || null,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log admin action:', error)
      // Don't throw error here to avoid breaking the main operation
    }
  } catch (error) {
    console.error('Admin audit logging failed:', error)
  }
}

/**
 * Higher-order function to wrap API routes with admin authentication
 */
export function withAdminAuth(handler) {
  return async function authenticatedHandler(request, context) {
    try {
      // Extract user ID from Supabase auth
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid authorization header' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.split(' ')[1]
      const supabase = createClient()
      
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Verify admin permissions
      const adminAuth = await verifyAdminAuth(user.id)
      
      // Add admin context to request
      request.adminContext = adminAuth
      
      // Call the original handler
      return await handler(request, context)
    } catch (error) {
      console.error('Admin auth middleware error:', error)
      
      let statusCode = 500
      if (error.message.includes('Authentication required')) statusCode = 401
      if (error.message.includes('Insufficient permissions')) statusCode = 403
      if (error.message.includes('User profile not found')) statusCode = 404
      
      return new Response(
        JSON.stringify({ 
          error: error.message,
          code: 'ADMIN_AUTH_ERROR'
        }),
        { 
          status: statusCode, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
  }
}

/**
 * Client-side admin role check
 * Used in components to conditionally render admin features
 */
export async function checkAdminRole(supabaseClient) {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser()
    
    if (error || !user) {
      return { isAdmin: false, error: 'Not authenticated' }
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return { isAdmin: false, error: 'Failed to fetch user profile' }
    }

    return {
      isAdmin: profile.role === 'SUPER_ADMIN' && profile.is_active,
      role: profile.role,
      isActive: profile.is_active
    }
  } catch (error) {
    return { isAdmin: false, error: error.message }
  }
}


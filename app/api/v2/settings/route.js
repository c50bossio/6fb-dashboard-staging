/**
 * Unified Settings API (v2)
 * 
 * Replaces fragmented settings endpoints with a single, consolidated API
 * that handles all types of settings with proper inheritance and permissions.
 * 
 * This API eliminates the duplication between:
 * - Shop settings vs general settings
 * - Business info vs barbershop info  
 * - Notification preferences scattered across multiple endpoints
 * 
 * Endpoints:
 * - GET  /api/v2/settings - Get all effective settings for user
 * - GET  /api/v2/settings/{category} - Get specific settings category
 * - PUT  /api/v2/settings/{category} - Update settings category
 * - POST /api/v2/settings/batch - Batch update multiple categories
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import settingsCompatibility from '@/lib/settings-compatibility'

/**
 * GET /api/v2/settings
 * Get all effective settings for the current user with proper inheritance
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const organizationId = searchParams.get('organization_id')
    
    // Get authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => {
            const cookies = request.headers.get('cookie')
            if (!cookies) return undefined
            
            const cookie = cookies
              .split(';')
              .find(c => c.trim().startsWith(`${name}=`))
            
            return cookie ? cookie.split('=')[1] : undefined
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Determine organization ID if not provided
    let targetOrgId = organizationId
    if (!targetOrgId) {
      // Get user's primary organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, barbershop_id')
        .eq('id', user.id)
        .single()
      
      targetOrgId = profile?.shop_id || profile?.barbershop_id
    }

    // Verify user has access to this organization
    if (targetOrgId) {
      const { data: membership } = await supabase
        .from('user_organization_memberships')
        .select('id, role, permissions')
        .eq('user_id', user.id)
        .eq('organization_id', targetOrgId)
        .eq('is_active', true)
        .single()
      
      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to organization', code: 'ACCESS_DENIED' },
          { status: 403 }
        )
      }
    }

    // Get effective settings using compatibility layer
    const settings = await settingsCompatibility.getEffectiveSettings(
      user.id,
      targetOrgId,
      category
    )

    // Add metadata about inheritance and permissions
    const response = {
      settings,
      metadata: {
        user_id: user.id,
        organization_id: targetOrgId,
        category: category || 'all',
        inheritance_chain: ['system', targetOrgId ? 'organization' : null, 'user'].filter(Boolean),
        timestamp: new Date().toISOString()
      }
    }

    // Add organization info if requested
    if (targetOrgId && !category) {
      const orgInfo = await settingsCompatibility.getOrganizationInfo(targetOrgId)
      response.organization = orgInfo
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v2/settings
 * Update settings with proper targeting and validation
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { category, settings: newSettings, organization_id: organizationId } = body
    
    if (!category || !newSettings) {
      return NextResponse.json(
        { error: 'Category and settings are required', code: 'MISSING_REQUIRED' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = [
      'notifications',
      'appearance', 
      'integrations',
      'booking_preferences',
      'payment_settings',
      'staff_management',
      'customer_communication',
      'business_operations',
      'business_info'
    ]

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid settings category', code: 'INVALID_CATEGORY' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => {
            const cookies = request.headers.get('cookie')
            if (!cookies) return undefined
            
            const cookie = cookies
              .split(';')
              .find(c => c.trim().startsWith(`${name}=`))
            
            return cookie ? cookie.split('=')[1] : undefined
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // Determine target organization
    let targetOrgId = organizationId
    if (!targetOrgId && ['business_info', 'booking_preferences', 'integrations'].includes(category)) {
      // These categories typically apply at organization level
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, barbershop_id')
        .eq('id', user.id)
        .single()
      
      targetOrgId = profile?.shop_id || profile?.barbershop_id
    }

    // Verify permissions
    if (targetOrgId) {
      const { data: membership } = await supabase
        .from('user_organization_memberships')
        .select('role, permissions')
        .eq('user_id', user.id)
        .eq('organization_id', targetOrgId)
        .eq('is_active', true)
        .single()
      
      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to organization', code: 'ACCESS_DENIED' },
          { status: 403 }
        )
      }

      // Check if user has permission to edit settings
      const canEditSettings = membership.role === 'owner' || 
                             membership.role === 'admin' ||
                             membership.permissions?.settings?.edit === true

      if (!canEditSettings && targetOrgId) {
        return NextResponse.json(
          { error: 'Insufficient permissions to edit organization settings', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        )
      }
    }

    // Validate settings data based on category
    const validationResult = validateSettingsData(category, newSettings)
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Invalid settings data', code: 'VALIDATION_ERROR', details: validationResult.errors },
        { status: 400 }
      )
    }

    // Update settings using compatibility layer
    const updateResult = await settingsCompatibility.updateSettings(
      user.id,
      category,
      newSettings,
      targetOrgId
    )

    if (!updateResult.success) {
      return NextResponse.json(
        { error: 'Failed to update settings', code: 'UPDATE_FAILED', details: updateResult.error },
        { status: 500 }
      )
    }

    // Get updated settings to return
    const updatedSettings = await settingsCompatibility.getEffectiveSettings(
      user.id,
      targetOrgId,
      category
    )

    return NextResponse.json({
      success: true,
      settings: updatedSettings[category] || updatedSettings,
      metadata: {
        user_id: user.id,
        organization_id: targetOrgId,
        category,
        update_method: updateResult.method,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v2/settings/batch
 * Batch update multiple settings categories
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { updates, organization_id: organizationId } = body
    
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates array is required', code: 'MISSING_REQUIRED' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (name) => {
            const cookies = request.headers.get('cookie')
            if (!cookies) return undefined
            
            const cookie = cookies
              .split(';')
              .find(c => c.trim().startsWith(`${name}=`))
            
            return cookie ? cookie.split('=')[1] : undefined
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    const results = []
    const errors = []

    // Process each update
    for (const update of updates) {
      try {
        const { category, settings } = update
        
        if (!category || !settings) {
          errors.push({ category, error: 'Missing category or settings' })
          continue
        }

        const updateResult = await settingsCompatibility.updateSettings(
          user.id,
          category,
          settings,
          organizationId
        )

        if (updateResult.success) {
          results.push({
            category,
            success: true,
            method: updateResult.method
          })
        } else {
          errors.push({
            category,
            error: updateResult.error
          })
        }
      } catch (error) {
        errors.push({
          category: update.category || 'unknown',
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: updates.length,
        successful: results.length,
        failed: errors.length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Batch settings update error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Validate settings data based on category
 */
function validateSettingsData(category, settings) {
  const errors = []

  switch (category) {
    case 'notifications':
      if (typeof settings !== 'object') {
        errors.push('Notifications settings must be an object')
      }
      if (settings.email_enabled !== undefined && typeof settings.email_enabled !== 'boolean') {
        errors.push('email_enabled must be a boolean')
      }
      if (settings.sms_enabled !== undefined && typeof settings.sms_enabled !== 'boolean') {
        errors.push('sms_enabled must be a boolean')
      }
      break

    case 'business_info':
      if (settings.name && typeof settings.name !== 'string') {
        errors.push('Business name must be a string')
      }
      if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
        errors.push('Invalid email format')
      }
      if (settings.phone && typeof settings.phone !== 'string') {
        errors.push('Phone must be a string')
      }
      break

    case 'booking_preferences':
      if (settings.booking_window_days !== undefined) {
        const days = parseInt(settings.booking_window_days)
        if (isNaN(days) || days < 1 || days > 365) {
          errors.push('Booking window days must be between 1 and 365')
        }
      }
      if (settings.cancellation_policy && !['1_hour', '2_hours', '24_hours', '48_hours'].includes(settings.cancellation_policy)) {
        errors.push('Invalid cancellation policy')
      }
      break

    case 'appearance':
      if (settings.primary_color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(settings.primary_color)) {
        errors.push('Primary color must be a valid hex color')
      }
      if (settings.theme && !['professional', 'modern', 'classic', 'custom'].includes(settings.theme)) {
        errors.push('Invalid theme selection')
      }
      break

    default:
      // Generic validation for other categories
      if (typeof settings !== 'object' || settings === null) {
        errors.push(`${category} settings must be an object`)
      }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
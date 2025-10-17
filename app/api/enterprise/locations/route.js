/**
 * ⚠️ DEPRECATED ENDPOINT - Use /api/user/locations instead
 * 
 * This endpoint has been replaced with a unified locations API that follows
 * industry best practices from GitHub, Shopify, and Stripe.
 * 
 * New endpoint: /api/user/locations
 * - Single source of truth for all location operations
 * - Consistent with context selector data
 * - Simpler permission model: "If you can see it, you can manage it"
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserAccessibleLocations, canAccessLocation, createLocationWithAccess } from '@/lib/utils/enterprise-access'
import { checkEnterpriseSchema } from '@/lib/database/schema-detector'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('[Enterprise Locations API] Authentication failed:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Enterprise Locations API] Authenticated user: ${user.id}`)

    // Get user's profile - select only fields we know exist
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, shop_id, barbershop_id, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[Enterprise Locations API] Failed to get user profile:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    console.log(`[Enterprise Locations API] User profile:`, {
      id: profile.id,
      role: profile.role,
      hasShopId: !!(profile.shop_id || profile.barbershop_id),
      hasOrgId: !!profile.organization_id
    })

    // Check if user has enterprise access
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      console.log(`[Enterprise Locations API] Insufficient permissions for role: ${profile?.role}`)
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Use smart enterprise access logic
    const accessResult = await getUserAccessibleLocations(user.id, profile.role, profile)
    
    console.log(`[Enterprise Locations API] Access result:`, {
      locationCount: accessResult.locations?.length || 0,
      accessMethod: accessResult.accessMethod,
      hasError: !!accessResult.error
    })

    if (accessResult.error) {
      console.error('[Enterprise Locations API] Access error:', accessResult.error)
      return NextResponse.json({ 
        error: 'Failed to get accessible locations',
        details: accessResult.error 
      }, { status: 500 })
    }

    const barbershops = accessResult.locations || []

    if (barbershops && barbershops.length > 0) {
      console.log(`[Enterprise Locations API] Processing ${barbershops.length} locations for transformation`)
      
      // Enhanced transformation with better data handling
      const locations = barbershops.map((shop) => {
        // Handle business hours safely
        let businessHours
        try {
          businessHours = shop.business_hours || {}
          if (typeof businessHours === 'string') {
            businessHours = JSON.parse(businessHours)
          }
        } catch (e) {
          businessHours = {}
        }

        // Default hours if not set
        const defaultHours = {
          monday: { open: '9:00 AM', close: '6:00 PM' },
          tuesday: { open: '9:00 AM', close: '6:00 PM' },
          wednesday: { open: '9:00 AM', close: '6:00 PM' },
          thursday: { open: '9:00 AM', close: '6:00 PM' },
          friday: { open: '9:00 AM', close: '6:00 PM' },
          saturday: { open: '9:00 AM', close: '5:00 PM' },
          sunday: { open: 'Closed', close: 'Closed' }
        }

        return {
          id: shop.id,
          name: shop.name || 'Unnamed Location',
          address: shop.address || 'Address not set',
          city: shop.city || 'City not set',
          state: shop.state || 'State not set',
          phone: shop.phone || 'Phone not set',
          email: shop.email || 'contact@barbershop.com',
          manager: 'Manager TBD', // Will be populated when we add manager lookup
          managerId: shop.owner_id || null,
          status: shop.location_status || 'active',
          hours: { ...defaultHours, ...businessHours },
          staff: [], // Will be loaded separately if needed
          metrics: {
            revenue: 0,
            bookings: 0,
            customers: 0,
            rating: 4.5,
            utilization: 0
          },
          services: [], // Will be loaded separately if needed
          // Add schema state for debugging
          _debug: {
            hasOrganizationId: shop.organization_id !== undefined,
            accessMethod: accessResult.accessMethod
          }
        }
      })

      console.log(`[Enterprise Locations API] Successfully transformed ${locations.length} locations using access method: ${accessResult.accessMethod}`)
      
      return NextResponse.json({
        success: true,
        data: locations,
        meta: {
          accessMethod: accessResult.accessMethod,
          schemaState: accessResult.schemaState
        }
      })
    }

    // If no locations found, return empty array
    console.log('[Enterprise Locations API] No locations found - returning empty array')
    return NextResponse.json({
      success: true,
      data: []
    })

  } catch (error) {
    console.error('Error in enterprise locations API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('[Enterprise Locations API POST] Authentication failed:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile - using safe field selection
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, shop_id, barbershop_id, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[Enterprise Locations API POST] Failed to get user profile:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Check if user has enterprise access
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      console.error('[Enterprise Locations API POST] Insufficient permissions:', { 
        userId: user.id, 
        userRole: profile?.role,
        requiredRoles: ['ENTERPRISE_OWNER', 'SUPER_ADMIN']
      })
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check database schema to understand capabilities
    const schemaState = await checkEnterpriseSchema()
    console.log('[Enterprise Locations API POST] Schema state:', schemaState)

    const { action, locationId, data } = body
    console.log('[Enterprise Locations API] Processing action:', action, 'for user:', user.id)

    switch (action) {
      case 'createLocation':
        console.log('[Enterprise Locations API] Creating location with data:', data)
        
        // Validate required fields
        if (!data.name || !data.city || !data.state) {
          return NextResponse.json({ 
            error: 'Required fields missing: name, city, and state are required' 
          }, { status: 400 })
        }
        
        try {
          // Use smart location creation with proper access control
          const creationResult = await createLocationWithAccess(user.id, {
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            zip_code: data.zipCode,
            phone: data.phone,
            email: data.email,
            location_status: 'active',
            business_hours: data.businessHours || {
              monday: { open: '9:00 AM', close: '6:00 PM' },
              tuesday: { open: '9:00 AM', close: '6:00 PM' },
              wednesday: { open: '9:00 AM', close: '6:00 PM' },
              thursday: { open: '9:00 AM', close: '6:00 PM' },
              friday: { open: '9:00 AM', close: '6:00 PM' },
              saturday: { open: '9:00 AM', close: '5:00 PM' },
              sunday: { open: 'Closed', close: 'Closed' }
            },
            timezone: data.timezone || 'America/New_York',
            settings: data.settings || {},
            metadata: { createdVia: 'enterprise-api', schemaSupport: schemaState }
          })
          
          console.log('[Enterprise Locations API] Location created successfully with access method:', creationResult.accessMethod)

          return NextResponse.json({ 
            success: true, 
            message: 'Location created successfully', 
            location: creationResult.location,
            meta: {
              accessMethod: creationResult.accessMethod,
              schemaSupport: schemaState
            }
          })
          
        } catch (createError) {
          console.error('[Enterprise Locations API] Create location error:', {
            error: createError,
            errorMessage: createError.message,
            userData: { userId: user.id, role: profile.role },
            schemaState
          })
          
          // Provide specific error messages based on error type
          let errorMessage = createError.message || 'Failed to create location'
          let statusCode = 500
          
          if (createError.message?.includes('organization_id')) {
            errorMessage = 'Database schema issue: organization support not available. Please contact support.'
            statusCode = 503
          } else if (createError.message?.includes('permission')) {
            errorMessage = 'You do not have permission to create locations in this organization.'
            statusCode = 403
          }
          
          return NextResponse.json({ 
            error: errorMessage,
            details: createError.message,
            schemaInfo: schemaState
          }, { status: statusCode })
        }
        
      case 'updateLocation':
        console.log('[Enterprise Locations API] Updating location with ID:', locationId)
        
        // Update location details
        if (!locationId) {
          console.error('[Enterprise Locations API] Missing locationId')
          return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
        }

        try {
          // Use smart access control to verify permissions
          const accessResult = await canAccessLocation(user.id, locationId, profile.role)
          
          console.log('[Enterprise Locations API] Access check result:', {
            locationId,
            userId: user.id,
            canAccess: accessResult.canAccess,
            reason: accessResult.reason,
            checks: accessResult.checks
          })

          if (!accessResult.canAccess) {
            console.error('[Enterprise Locations API] Access denied for location:', {
              locationId,
              userId: user.id,
              userRole: profile.role,
              reason: accessResult.reason,
              checks: accessResult.checks
            })
            return NextResponse.json({ 
              error: 'Access denied for this location',
              details: accessResult.reason || 'You do not have permission to edit this location.',
              debugInfo: {
                schemaState,
                accessChecks: accessResult.checks
              }
            }, { status: 403 })
          }

          // Prepare update data
          const updateData = {
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            zip_code: data.zipCode,
            phone: data.phone,
            email: data.email,
            business_hours: data.businessHours,
            timezone: data.timezone || 'America/New_York',
            settings: data.settings,
            metadata: data.metadata,
            updated_at: new Date().toISOString()
          }

          // Clean undefined values
          Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
              delete updateData[key]
            }
          })

          console.log('[Enterprise Locations API] Updating location with data:', {
            locationId,
            updateFields: Object.keys(updateData),
            accessMethod: accessResult.reason
          })

          const { data: updatedLocation, error: updateError } = await supabase
            .from('barbershops')
            .update(updateData)
            .eq('id', locationId)
            .select()
            .single()

          if (updateError) {
            console.error('[Enterprise Locations API] Update location error:', {
              error: updateError,
              errorMessage: updateError.message,
              errorCode: updateError.code,
              locationId,
              updateData
            })
            
            return NextResponse.json({ 
              error: 'Failed to update location', 
              details: updateError.message,
              code: updateError.code,
              schemaInfo: schemaState
            }, { status: 500 })
          }

          console.log('[Enterprise Locations API] Location updated successfully:', updatedLocation.id)

          return NextResponse.json({ 
            success: true, 
            message: 'Location updated successfully', 
            location: updatedLocation,
            meta: {
              accessMethod: accessResult.reason,
              schemaSupport: schemaState
            }
          })
          
        } catch (accessError) {
          console.error('[Enterprise Locations API] Error checking location access:', accessError)
          return NextResponse.json({ 
            error: 'Failed to verify location access',
            details: accessError.message,
            schemaInfo: schemaState
          }, { status: 500 })
        }
        
      case 'deleteLocation':
        // Delete location
        if (!locationId) {
          return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
        }

        try {
          // Use smart access control to verify permissions
          const accessResult = await canAccessLocation(user.id, locationId, profile.role)
          
          if (!accessResult.canAccess) {
            console.error('[Enterprise Locations API] Delete access denied:', accessResult.reason)
            return NextResponse.json({ 
              error: 'Location not found or access denied',
              details: accessResult.reason
            }, { status: 404 })
          }

          // Get location details for validation
          const { data: locationToDelete, error: locationError } = await supabase
            .from('barbershops')
            .select('id, name')
            .eq('id', locationId)
            .single()

          if (locationError || !locationToDelete) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
          }

        // Check if location has any associated data (appointments, staff, etc.)
        const { count: appointmentCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', locationId)

        const { count: staffCount } = await supabase
          .from('barbershop_staff')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', locationId)

        if (appointmentCount > 0 || staffCount > 0) {
          return NextResponse.json({ 
            error: 'Cannot delete location with existing appointments or staff. Please transfer data first.',
            details: { appointmentCount, staffCount }
          }, { status: 400 })
        }

        const { error: deleteError } = await supabase
          .from('barbershops')
          .delete()
          .eq('id', locationId)

        if (deleteError) {
          console.error('Delete location error:', deleteError)
          return NextResponse.json({ error: 'Failed to delete location', details: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true, 
          message: `Location "${locationToDelete.name}" deleted successfully` 
        })
        
        } catch (error) {
          console.error('[Enterprise Locations API] Delete location error:', error)
          return NextResponse.json({ 
            error: 'Failed to delete location', 
            details: error.message 
          }, { status: 500 })
        }
        
        break;
        
      case 'toggleStatus':
        // Toggle location active/inactive
        if (!locationId) {
          return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
        }

        // Get current status
        const { data: currentLocation } = await supabase
          .from('barbershops')
          .select('location_status, organization_id')
          .eq('id', locationId)
          .single()

        if (!currentLocation || currentLocation.organization_id !== profile.organization_id) {
          return NextResponse.json({ error: 'Location not found or access denied' }, { status: 404 })
        }

        const newStatus = currentLocation.location_status === 'active' ? 'inactive' : 'active'

        const { data: statusUpdated, error: statusError } = await supabase
          .from('barbershops')
          .update({ 
            location_status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', locationId)
          .select()
          .single()

        if (statusError) {
          console.error('Toggle status error:', statusError)
          return NextResponse.json({ error: 'Failed to update location status', details: statusError.message }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true, 
          message: `Location status changed to ${newStatus}`,
          location: statusUpdated
        })
        
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in enterprise locations POST:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
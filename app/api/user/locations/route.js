import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { getUserAccessibleLocations } from '@/lib/services/user-locations'
import { canAccessLocation } from '@/lib/utils/enterprise-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Unified User Locations API - Single Source of Truth
 * 
 * This endpoint replaces the complex enterprise-access.js logic with a simple,
 * unified approach that follows industry best practices from GitHub/Shopify/Stripe.
 * 
 * Rule: If you can see it in the context selector, you can manage it.
 */

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Development mode bypass - return mock data when no user is authenticated
    const isDevelopmentMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_MODE === 'true'
    
    if (authError || !user) {
      console.log('[User Locations API] Authentication failed:', authError?.message)
      
      if (isDevelopmentMode) {
        console.log('[User Locations API] Using development mode bypass - returning mock location data')
        
        const mockLocations = [
          {
            id: '1ca6138d-eae8-46ed-abf4-5d6c52fbd21b',
            name: 'Downtown Barbershop (DEV)',
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            phone: '(555) 123-4567',
            email: 'dev@barbershop.com',
            manager: 'Dev Manager',
            managerId: 'dev-manager-123',
            status: 'active',
            hours: {
              monday: { open: '9:00 AM', close: '6:00 PM' },
              tuesday: { open: '9:00 AM', close: '6:00 PM' },
              wednesday: { open: '9:00 AM', close: '6:00 PM' },
              thursday: { open: '9:00 AM', close: '6:00 PM' },
              friday: { open: '9:00 AM', close: '6:00 PM' },
              saturday: { open: '9:00 AM', close: '5:00 PM' },
              sunday: { open: 'Closed', close: 'Closed' }
            },
            staff: [],
            metrics: {
              revenue: 15000,
              bookings: 125,
              customers: 85,
              rating: 4.7,
              utilization: 78
            },
            services: [],
            _debug: {
              accessMethod: 'development-mode-bypass',
              fallback: true,
              userRole: 'SHOP_OWNER',
              originalLocationStatus: 'active',
              hasIsActive: true
            }
          }
        ]
        
        return NextResponse.json({
          success: true,
          data: mockLocations,
          meta: {
            count: mockLocations.length,
            accessMethod: 'development-mode-bypass',
            userRole: 'SHOP_OWNER',
            message: 'Development mode - mock data returned',
            timestamp: new Date().toISOString()
          }
        })
      }
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[User Locations API] Authenticated user: ${user.id}`)

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, shop_id, barbershop_id, organization_id, full_name, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[User Locations API] Failed to get user profile:', profileError)
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    console.log(`[User Locations API] User profile:`, {
      id: profile.id,
      role: profile.role,
      hasShopId: !!(profile.shop_id || profile.barbershop_id),
      hasOrgId: !!profile.organization_id
    })

    // Use the centralized service to get accessible locations
    const locations = await getUserAccessibleLocations(user.id, profile.role, profile)
    
    console.log(`[User Locations API] Found ${locations.length} locations using unified service`)

    if (locations && locations.length > 0) {
      // Transform for Location Management UI compatibility
      const transformedLocations = locations.map((location) => {
        // Handle business hours safely
        let businessHours
        try {
          businessHours = location.business_hours || {}
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
          id: location.id,
          name: location.name || 'Unnamed Location',
          address: location.address || 'Address not set',
          city: location.city || 'City not set',
          state: location.state || 'State not set',
          phone: location.phone || 'Phone not set',
          email: location.email || 'contact@barbershop.com',
          manager: 'Manager TBD', // Will be populated when we add manager lookup
          managerId: location.owner_id || null,
          status: location.location_status || 'active', // This comes from the user-locations service
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
          // Add debug info
          _debug: {
            accessMethod: 'unified-service',
            fallback: location.metadata?.fallback || false,
            userRole: profile.role,
            originalLocationStatus: location.location_status,
            hasIsActive: 'is_active' in location ? location.is_active : 'not_present'
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: transformedLocations,
        meta: {
          count: transformedLocations.length,
          accessMethod: 'unified-service',
          userRole: profile.role,
          timestamp: new Date().toISOString()
        }
      })
    }

    // If no locations found, return empty array
    console.log('[User Locations API] No locations found - returning empty array')
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        count: 0,
        accessMethod: 'unified-service', 
        userRole: profile.role,
        message: 'No accessible locations found',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[User Locations API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Check if user has location management permissions
    if (!['ENTERPRISE_OWNER', 'SHOP_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { action, locationId, data } = body

    switch (action) {
      case 'createLocation':
        // Implementation for creating locations
        return NextResponse.json({ 
          success: false, 
          error: 'Create location not yet implemented in unified API' 
        }, { status: 501 })
        
      case 'updateLocation':
        console.log('[User Locations API] Updating location with ID:', locationId)
        
        // Validate required parameters
        if (!locationId) {
          console.error('[User Locations API] Missing locationId')
          return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
        }

        try {
          // Use smart access control to verify permissions
          const accessResult = await canAccessLocation(user.id, locationId, profile.role)
          
          console.log('[User Locations API] Access check result:', {
            locationId,
            userId: user.id,
            canAccess: accessResult.canAccess,
            reason: accessResult.reason,
            checks: accessResult.checks
          })

          if (!accessResult.canAccess) {
            console.error('[User Locations API] Access denied for location:', {
              locationId,
              userId: user.id,
              userRole: profile.role,
              reason: accessResult.reason,
              checks: accessResult.checks
            })
            return NextResponse.json({ 
              error: 'Access denied for this location',
              details: accessResult.reason || 'You do not have permission to edit this location.'
            }, { status: 403 })
          }

          // Prepare update data - handle zipCode -> zip_code mapping
          const updateData = {
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            zip_code: data.zipCode || data.zip_code, // Support both field names
            phone: data.phone,
            email: data.email,
            business_hours: data.businessHours || data.business_hours,
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

          console.log('[User Locations API] Updating location with data:', {
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
            console.error('[User Locations API] Update location error:', {
              error: updateError,
              errorMessage: updateError.message,
              errorCode: updateError.code,
              locationId,
              updateData
            })
            
            return NextResponse.json({ 
              error: 'Failed to update location', 
              details: updateError.message,
              code: updateError.code
            }, { status: 500 })
          }

          console.log('[User Locations API] Location updated successfully:', updatedLocation.id)

          return NextResponse.json({ 
            success: true, 
            message: 'Location updated successfully', 
            location: updatedLocation,
            meta: {
              accessMethod: accessResult.reason,
              updatedFields: Object.keys(updateData)
            }
          })
          
        } catch (accessError) {
          console.error('[User Locations API] Error checking location access:', accessError)
          return NextResponse.json({ 
            error: 'Failed to verify location access',
            details: accessError.message
          }, { status: 500 })
        }
        
      case 'deleteLocation':
        console.log('[User Locations API] Deleting location with ID:', locationId)
        
        // Validate required parameters
        if (!locationId) {
          return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
        }

        try {
          // Use smart access control to verify permissions
          const accessResult = await canAccessLocation(user.id, locationId, profile.role)
          
          if (!accessResult.canAccess) {
            console.error('[User Locations API] Delete access denied:', accessResult.reason)
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
            console.error('[User Locations API] Delete location error:', deleteError)
            return NextResponse.json({ 
              error: 'Failed to delete location', 
              details: deleteError.message 
            }, { status: 500 })
          }

          console.log('[User Locations API] Location deleted successfully:', locationToDelete.name)

          return NextResponse.json({ 
            success: true, 
            message: `Location "${locationToDelete.name}" deleted successfully` 
          })
          
        } catch (error) {
          console.error('[User Locations API] Delete location error:', error)
          return NextResponse.json({ 
            error: 'Failed to delete location', 
            details: error.message 
          }, { status: 500 })
        }
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[User Locations API POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
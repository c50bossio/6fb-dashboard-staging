import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAccessLocation } from '@/lib/utils/enterprise-access'

// GET - Fetch single location details
export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Fetch the location
    const { data: location, error: locationError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', id)
      .single()
    
    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
    
    // Use smart enterprise access control logic
    const accessResult = await canAccessLocation(user.id, id, profile?.role)
    
    if (!accessResult.canAccess) {
      console.error('[Location API GET] Access denied:', {
        locationId: id,
        userId: user.id,
        userRole: profile?.role,
        reason: accessResult.reason,
        checks: accessResult.checks
      })
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        details: accessResult.reason 
      }, { status: 403 })
    }
    
    console.log('[Location API GET] Access granted:', {
      locationId: id,
      userId: user.id,
      accessMethod: accessResult.reason
    })
    
    // Get additional location data
    const [staffResponse, servicesResponse, customersResponse] = await Promise.all([
      supabase
        .from('barbershop_staff')
        .select('*', { count: 'exact' })
        .eq('barbershop_id', id)
        .eq('is_active', true),
      
      supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', id)
        .eq('is_active', true),
      
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', id)
    ])
    
    return NextResponse.json({
      ...location,
      staff: staffResponse.data || [],
      staffCount: staffResponse.count || 0,
      services: servicesResponse.data || [],
      customerCount: customersResponse.count || 0
    })
    
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update location information
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = params
    const body = await request.json()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's profile with all fields needed for smart access control
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, shop_id, barbershop_id, organization_id')
      .eq('id', user.id)
      .single()
    
    // Fetch the location to check ownership
    const { data: location, error: locationError } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', id)
      .single()
    
    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
    
    // 🔥 CRITICAL FIX: Use smart enterprise access control logic (fixes Tomb45 Channelside edit issue)
    const accessResult = await canAccessLocation(user.id, id, profile?.role)
    
    if (!accessResult.canAccess) {
      console.error('[Location API PATCH] ❌ Access denied for location edit:', {
        locationId: id,
        locationName: 'Tomb45 Channelside', // This is the specific location causing issues
        userId: user.id,
        userRole: profile?.role,
        userShopId: profile?.shop_id || profile?.barbershop_id,
        userOrgId: profile?.organization_id,
        reason: accessResult.reason,
        checks: accessResult.checks,
        locationOwnerId: location.owner_id
      })
      return NextResponse.json({ 
        error: 'Access denied for this location',
        details: accessResult.reason || 'You do not have permission to edit this location.',
        debugInfo: {
          accessChecks: accessResult.checks,
          userContext: {
            role: profile?.role,
            shopId: profile?.shop_id || profile?.barbershop_id,
            orgId: profile?.organization_id
          }
        }
      }, { status: 403 })
    }
    
    console.log('[Location API PATCH] ✅ Access granted for location edit:', {
      locationId: id,
      locationName: 'Tomb45 Channelside',
      userId: user.id,
      accessMethod: accessResult.reason,
      userShopId: profile?.shop_id || profile?.barbershop_id,
      locationOwnerId: location.owner_id
    })
    
    // Validate required fields
    if (body.name && !body.name.trim()) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 })
    }
    
    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    }
    
    // Add allowed fields to update
    const allowedFields = [
      'name', 'address', 'city', 'state', 'zip', 'zip_code',
      'phone', 'email', 'description', 'website', 'logo_url',
      'business_hours', 'social_links', 'is_active'
    ]
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })
    
    // Handle both zip and zip_code fields
    if (body.zip !== undefined) {
      updateData.zip = body.zip
      updateData.zip_code = body.zip
    }
    
    // Update the location
    const { data: updatedLocation, error: updateError } = await supabase
      .from('barbershops')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating location:', updateError)
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(updatedLocation)
    
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete or deactivate location
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
    // Check for query parameter to determine hard vs soft delete
    const url = new URL(request.url)
    const hardDelete = url.searchParams.get('hard') === 'true'
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's profile with all fields needed for smart access control
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, shop_id, barbershop_id, organization_id')
      .eq('id', user.id)
      .single()
    
    // Fetch the location to check ownership
    const { data: location, error: locationError } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', id)
      .single()
    
    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
    
    // Use smart enterprise access control logic for DELETE operations
    const accessResult = await canAccessLocation(user.id, id, profile?.role)
    
    if (!accessResult.canAccess) {
      console.error('[Location API DELETE] Access denied for location deletion:', {
        locationId: id,
        userId: user.id,
        userRole: profile?.role,
        reason: accessResult.reason,
        checks: accessResult.checks,
        locationOwnerId: location.owner_id
      })
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        details: accessResult.reason 
      }, { status: 403 })
    }
    
    console.log('[Location API DELETE] Access granted for location deletion:', {
      locationId: id,
      userId: user.id,
      accessMethod: accessResult.reason,
      hardDelete
    })
    
    // Check for active appointments before deletion
    const { count: activeAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', id)
      .gte('appointment_date', new Date().toISOString())
    
    if (activeAppointments > 0 && hardDelete) {
      return NextResponse.json(
        { 
          error: 'Cannot delete location with active appointments',
          activeAppointments 
        },
        { status: 400 }
      )
    }
    
    if (hardDelete && isAdmin) {
      // Hard delete - only for admins
      // First, clean up related data
      await Promise.all([
        supabase.from('barbershop_staff').delete().eq('barbershop_id', id),
        supabase.from('services').delete().eq('shop_id', id),
        supabase.from('appointments').delete().eq('barbershop_id', id),
        supabase.from('customers').delete().eq('barbershop_id', id)
      ])
      
      // Then delete the location
      const { error: deleteError } = await supabase
        .from('barbershops')
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        console.error('Error deleting location:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete location' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ 
        message: 'Location deleted successfully',
        type: 'hard_delete' 
      })
    } else {
      // Soft delete - mark as inactive
      const { error: updateError } = await supabase
        .from('barbershops')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (updateError) {
        console.error('Error deactivating location:', updateError)
        return NextResponse.json(
          { error: 'Failed to deactivate location' },
          { status: 500 }
        )
      }
      
      // Also deactivate related services and staff
      await Promise.all([
        supabase
          .from('barbershop_staff')
          .update({ is_active: false })
          .eq('barbershop_id', id),
        
        supabase
          .from('services')
          .update({ is_active: false })
          .eq('barbershop_id', id)
      ])
      
      return NextResponse.json({ 
        message: 'Location deactivated successfully',
        type: 'soft_delete' 
      })
    }
    
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
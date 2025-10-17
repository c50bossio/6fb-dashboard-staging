import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // Check if user has enterprise access
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get specific location
    const { data: location, error: locationError } = await supabase
      .from('barbershops')
      .select(`
        *,
        staff:barbershop_staff(count),
        services(count),
        appointments(count)
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (locationError) {
      console.error('Location fetch error:', locationError)
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      location
    })

  } catch (error) {
    console.error('Error in individual location GET:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = params
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // Check if user has enterprise access
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify location belongs to user's organization
    const { data: existingLocation } = await supabase
      .from('barbershops')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (!existingLocation || existingLocation.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Location not found or access denied' }, { status: 404 })
    }

    // Update location
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    }

    const { data: updatedLocation, error: updateError } = await supabase
      .from('barbershops')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update location error:', updateError)
      return NextResponse.json({ error: 'Failed to update location', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      location: updatedLocation
    })

  } catch (error) {
    console.error('Error in individual location PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = params
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // Check if user has enterprise access
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify location belongs to user's organization
    const { data: locationToDelete } = await supabase
      .from('barbershops')
      .select('id, organization_id, name')
      .eq('id', id)
      .single()

    if (!locationToDelete || locationToDelete.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Location not found or access denied' }, { status: 404 })
    }

    // Check if location has any associated data (appointments, staff, etc.)
    const { count: appointmentCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', id)

    const { count: staffCount } = await supabase
      .from('barbershop_staff')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', id)

    if (appointmentCount > 0 || staffCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete location with existing appointments or staff. Please transfer data first.',
        details: { appointmentCount, staffCount }
      }, { status: 400 })
    }

    // Delete the location
    const { error: deleteError } = await supabase
      .from('barbershops')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete location error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete location', details: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Location "${locationToDelete.name}" deleted successfully`
    })

  } catch (error) {
    console.error('Error in individual location DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
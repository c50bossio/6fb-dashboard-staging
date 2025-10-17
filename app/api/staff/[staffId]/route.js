import { NextResponse } from 'next/server'
import { getDisplayName, splitFullName, combineNames, normalizeNameData } from '@/lib/name-utils'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

// GET - Fetch individual staff member details
export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const { staffId } = params

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff member details from profiles table directly
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        can_take_appointments,
        is_visible_for_booking,
        service_provider_since
      `)
      .eq('id', staffId)
      .single()

    if (profileError) {
      // console.error('Error fetching staff member:', profileError)
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Get barbershop details separately
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('id', profile.barbershop_id)
      .single()

    // Transform profile to staff format for compatibility
    const staffMember = {
      id: profile.id,
      user_id: profile.id,
      barbershop_id: profile.barbershop_id,
      role: profile.role,
      is_active: profile.is_active ?? true,
      can_take_appointments: profile.can_take_appointments ?? (profile.role === 'BARBER' || profile.role === 'ENTERPRISE_OWNER' || profile.role === 'SHOP_OWNER'),
      is_visible_for_booking: profile.is_visible_for_booking ?? true,
      service_provider_since: profile.service_provider_since || profile.created_at,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      // Include profile data directly as user field for compatibility
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url
      },
      barbershop: barbershop,
      // Include full profile for access to additional fields
      profile: profile
    }

    // Get commission balance if exists
    const { data: commissionBalance } = await supabase
      .from('barber_commission_balances')
      .select('*')
      .eq('barber_id', profile.id)
      .single()

    // Get recent appointments (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, start_time, status, price')
      .eq('barber_id', profile.id)
      .gte('start_time', thirtyDaysAgo.toISOString())
      .order('start_time', { ascending: false })

    return NextResponse.json({
      success: true,
      staff: {
        ...staffMember,
        commission_balance: commissionBalance,
        recent_appointments: appointments || []
      }
    })

  } catch (error) {
    // console.error('GET /api/staff/[staffId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update staff member (full update)
export async function PUT(request, { params }) {
  try {
    const supabase = await createClient()
    const { staffId } = params
    const body = await request.json()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership - user must be barbershop owner
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', staffId)
      .single()

    if (!profileCheck) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Get barbershop details separately
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', profileCheck.barbershop_id)
      .single()

    if (!barbershop || barbershop.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to update this staff member' }, { status: 403 })
    }

    // Update profiles record with staff-related fields
    const updateData = {
      role: body.role || 'BARBER',
      is_active: body.is_active !== undefined ? body.is_active : true,
      arrangement_type: body.financial_model || 'commission', // Map financial_model to arrangement_type
      commission_rate: body.commission_rate || 0.5,
      hourly_rate: body.hourly_rate || 0,
      booth_rent_amount: body.booth_rent_amount || 0,
      can_take_appointments: body.can_take_appointments ?? (body.role === 'BARBER' || body.role === 'ENTERPRISE_OWNER' || body.role === 'SHOP_OWNER'),
      is_visible_for_booking: body.is_visible_for_booking ?? true,
      metadata: {
        ...(body.metadata || {}),
        updated_at: new Date().toISOString(),
        updated_by: user.id
      },
      updated_at: new Date().toISOString()
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', staffId)
      .select()
      .single()

    if (updateError) {
      // console.error('Error updating staff:', updateError)
      return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
    }

    // Transform updated profile back to staff format for response
    const updatedStaff = {
      id: updatedProfile.id,
      user_id: updatedProfile.id,
      barbershop_id: updatedProfile.barbershop_id,
      role: updatedProfile.role,
      is_active: updatedProfile.is_active,
      financial_model: updatedProfile.arrangement_type, // Map back for compatibility
      commission_rate: updatedProfile.commission_rate,
      hourly_rate: updatedProfile.hourly_rate,
      booth_rent_amount: updatedProfile.booth_rent_amount,
      can_take_appointments: updatedProfile.can_take_appointments,
      is_visible_for_booking: updatedProfile.is_visible_for_booking,
      metadata: updatedProfile.metadata
    }

    // Update profile information if provided - with comprehensive error handling
    // Support both camelCase and snake_case field names
    if (body.full_name || body.fullName || body.first_name || body.firstName || 
        body.last_name || body.lastName || body.phone || body.email) {
      const profileUpdate = {}
      
      // Handle first_name + last_name combination (user input - highest priority)
      if (body.first_name !== undefined || body.firstName !== undefined || 
          body.last_name !== undefined || body.lastName !== undefined) {
        const firstName = body.first_name || body.firstName || ''
        const lastName = body.last_name || body.lastName || ''
        const combined = `${firstName} ${lastName}`.trim()
        if (combined) { // Only set if not empty
          profileUpdate.full_name = combined
        }
      }
      // Handle full_name field as fallback (if first/last didn't produce a value)
      else if (body.full_name !== undefined && body.full_name.trim()) {
        profileUpdate.full_name = body.full_name.trim()
      } else if (body.fullName !== undefined && body.fullName.trim()) {
        profileUpdate.full_name = body.fullName.trim()
      }
      
      if (body.phone !== undefined) profileUpdate.phone = body.phone
      if (body.email !== undefined) profileUpdate.email = body.email

      console.log('Profile update data:', {
        profileUpdate,
        hasUpdates: Object.keys(profileUpdate).length > 0
      })

      // Only perform update if we have fields to update
      if (Object.keys(profileUpdate).length === 0) {
        // 
        return NextResponse.json({
          success: true,
          staff: updatedStaff,
          message: 'Staff member updated successfully (no profile changes)'
        })
      }

      // Use service client for profile updates to bypass RLS restrictions
      // Shop owners are authorized to update their staff's profile information
      const serviceClient = await createServiceRoleClient()
      if (!serviceClient) {
        // console.error('🚨 [STAFF PROFILE PUT] Service client not available - check SUPABASE_SERVICE_ROLE_KEY')
        return NextResponse.json({
          error: 'Service client not available for profile updates',
          details: {
            staffUpdateSucceeded: true,
            profileUpdateFailed: true,
            profileError: 'Service client initialization failed'
          }
        }, { status: 500 })
      }

      // First, verify the profile exists
      const { data: existingProfile, error: checkError } = await serviceClient
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', staffId)
        .single()

      // 

      // 

      const { data: profileData, error: profileError } = await serviceClient
        .from('profiles')
        .update(profileUpdate)
        .eq('id', staffId)
        .select()

      // 

      if (profileError) {
        console.error('🚨 [STAFF PROFILE PUT] Profile update failed:', {
          error: profileError,
          staffId: params.staffId,
          userId: updatedStaff.user_id,
          attemptedUpdates: profileUpdate
        })
        
        return NextResponse.json({
          error: `Staff information updated but profile update failed: ${profileError.message}`,
          details: {
            staffUpdateSucceeded: true,
            profileUpdateFailed: true,
            profileError: profileError.message,
            code: profileError.code
          }
        }, { status: 500 })
      }

      console.log('Profile update successful:', {
        profileData
      })
      
      // Fetch the updated profile to include in response
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, phone, avatar_url')
        .eq('id', staffId)
        .single()
      
      // Include updated profile in staff data with name format conversion
      if (updatedProfile) {
        // Convert full_name to first_name/last_name format for frontend compatibility
        const nameParts = updatedProfile.full_name ? updatedProfile.full_name.split(' ') : ['', '']
        updatedStaff.user = {
          ...updatedProfile,
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || ''
        }
      }
    }

    return NextResponse.json({
      success: true,
      staff: updatedStaff,
      message: 'Staff member updated successfully'
    })

  } catch (error) {
    // console.error('PUT /api/staff/[staffId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update of staff member
export async function PATCH(request, { params }) {
  // 
  // 
  // 
  
  try {
    const supabase = await createClient()
    let userId = params.staffId  // STANDARDIZED: staffId is actually the user_id (let instead of const for reassignment)
    const body = await request.json()
    
    // 
    // 

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      // console.error('❌ [API ROUTE] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // PROFILE-BASED SYSTEM: Check if the profile exists directly
    const { data: profileCheck, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, barbershop_id, role')
      .eq('id', userId)
      .single()

    if (profileCheckError || !profileCheck) {
      console.error('❌ [API ROUTE] Profile not found for ID:', params.staffId, profileCheckError)
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Use profile data as staffCheck for compatibility
    const staffCheck = {
      id: profileCheck.id,
      user_id: profileCheck.id,
      barbershop_id: profileCheck.barbershop_id,
      metadata: {}
    }

    // 

    // Get barbershop details separately for authorization
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', staffCheck.barbershop_id)
      .single()

    if (barbershopError || !barbershop) {
      // console.error('❌ [API ROUTE] Barbershop not found:', staffCheck.barbershop_id, barbershopError)
      return NextResponse.json({ error: 'Barbershop not found' }, { status: 404 })
    }

    // AUTHORIZATION: Verify user owns the barbershop
    if (barbershop.owner_id !== user.id) {
      console.warn('⚠️ [API ROUTE] Unauthorized access attempt:', {
        requestingUser: user.id,
        barbershopOwner: barbershop.owner_id,
        targetStaff: userId
      })
      return NextResponse.json({ error: 'Unauthorized to update this staff member' }, { status: 403 })
    }

    // 

    // Build update object with only provided fields
    const updateData = {}
    
    if (body.role !== undefined) updateData.role = body.role
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    
    // Appointment capability fields
    if (body.can_take_appointments !== undefined) updateData.can_take_appointments = body.can_take_appointments
    if (body.is_visible_for_booking !== undefined) updateData.is_visible_for_booking = body.is_visible_for_booking
    
    // Handle both field names for backward compatibility
    if (body.arrangement_type !== undefined) updateData.arrangement_type = body.arrangement_type
    if (body.financial_model !== undefined) updateData.financial_model = body.financial_model
    if (body.commission_rate !== undefined) updateData.commission_rate = body.commission_rate
    if (body.hourly_rate !== undefined) updateData.hourly_rate = body.hourly_rate
    if (body.booth_rent_amount !== undefined) updateData.booth_rent_amount = body.booth_rent_amount
    if (body.rent_frequency !== undefined) updateData.rent_frequency = body.rent_frequency
    if (body.hybrid_base_rent !== undefined) updateData.hybrid_base_rent = body.hybrid_base_rent
    if (body.hybrid_revenue_threshold !== undefined) updateData.hybrid_revenue_threshold = body.hybrid_revenue_threshold
    if (body.hybrid_commission_rate !== undefined) updateData.hybrid_commission_rate = body.hybrid_commission_rate
    
    // Handle metadata updates (merge with existing)
    if (body.metadata) {
      updateData.metadata = {
        ...(staffCheck.metadata || {}),
        ...body.metadata,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      }
    }

    // 

    // Update profile fields that are staff-related  
    let updatedStaff = staffCheck  // Start with existing data
    
    if (Object.keys(updateData).length > 0) {
      // Update profiles table with staff-related fields
      const { data: staffUpdateResult, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: updateData.role || profileCheck.role,
          is_active: updateData.is_active !== undefined ? updateData.is_active : true,
          // Appointment capability fields
          can_take_appointments: updateData.can_take_appointments,
          is_visible_for_booking: updateData.is_visible_for_booking,
          // Financial arrangement fields
          arrangement_type: updateData.arrangement_type,
          commission_rate: updateData.commission_rate,
          hourly_rate: updateData.hourly_rate,
          booth_rent_amount: updateData.booth_rent_amount,
          rent_frequency: updateData.rent_frequency,
          hybrid_base_rent: updateData.hybrid_base_rent,
          hybrid_revenue_threshold: updateData.hybrid_revenue_threshold,
          hybrid_commission_rate: updateData.hybrid_commission_rate,
          metadata: updateData.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)  // Update the profile directly
        .select()
        .single()

      if (updateError) {
        console.error('❌ [API ROUTE] Error updating staff profile:', updateError)
        return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
      }
      
      // Transform back to staff format
      updatedStaff = {
        id: staffUpdateResult.id,
        user_id: staffUpdateResult.id,
        barbershop_id: staffUpdateResult.barbershop_id,
        role: staffUpdateResult.role,
        is_active: staffUpdateResult.is_active,
        // Appointment capability fields
        can_take_appointments: staffUpdateResult.can_take_appointments,
        is_visible_for_booking: staffUpdateResult.is_visible_for_booking,
        // Financial arrangement fields
        arrangement_type: staffUpdateResult.arrangement_type,
        commission_rate: staffUpdateResult.commission_rate,
        hourly_rate: staffUpdateResult.hourly_rate,
        booth_rent_amount: staffUpdateResult.booth_rent_amount,
        rent_frequency: staffUpdateResult.rent_frequency,
        hybrid_base_rent: staffUpdateResult.hybrid_base_rent,
        hybrid_revenue_threshold: staffUpdateResult.hybrid_revenue_threshold,
        hybrid_commission_rate: staffUpdateResult.hybrid_commission_rate,
        metadata: staffUpdateResult.metadata || {}
      }
      console.log('✅ [API ROUTE] Staff profile updated successfully')
    } else {
      console.log('ℹ️ [API ROUTE] No staff fields to update')
    }

    // Update profile fields if provided - with comprehensive error handling
    const profileUpdates = {}
    
    // Handle first_name + last_name combination (user input - highest priority)
    if (body.first_name !== undefined || body.firstName !== undefined || 
        body.last_name !== undefined || body.lastName !== undefined) {
      const firstName = body.first_name || body.firstName || ''
      const lastName = body.last_name || body.lastName || ''
      const combined = `${firstName} ${lastName}`.trim()
      if (combined) { // Only set if not empty
        profileUpdates.full_name = combined
      }
    }
    // Handle full_name field as fallback (if first/last didn't produce a value)
    else if (body.full_name !== undefined && body.full_name.trim()) {
      profileUpdates.full_name = body.full_name.trim()
    } else if (body.fullName !== undefined && body.fullName.trim()) {
      profileUpdates.full_name = body.fullName.trim()
    }
    
    if (body.phone !== undefined) profileUpdates.phone = body.phone
    if (body.email !== undefined) profileUpdates.email = body.email

    console.log('Profile updates to apply:', {
      hasUpdates: Object.keys(profileUpdates).length > 0,
      updates: profileUpdates,
      originalRequestBody: {
        first_name: body.first_name,
        firstName: body.firstName,
        last_name: body.last_name,
        lastName: body.lastName,
        full_name: body.full_name,
        fullName: body.fullName
      }
    })

    if (Object.keys(profileUpdates).length > 0) {
      console.log('Applying profile updates:', profileUpdates)

      // Use service client for profile updates to bypass RLS restrictions
      // Shop owners are authorized to update their staff's profile information
      const serviceClient = await createServiceRoleClient()
      
      // 
      
      if (!serviceClient) {
        // console.error('🚨 [STAFF PROFILE UPDATE] Service client not available - check SUPABASE_SERVICE_ROLE_KEY')
        return NextResponse.json({
          error: 'Service client not available for profile updates',
          details: {
            staffUpdateSucceeded: true,
            profileUpdateFailed: true,
            profileError: 'Service client initialization failed',
            envCheck: {
              supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
              serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
            }
          }
        }, { status: 500 })
      }

      // First, verify the profile exists
      const { data: existingProfile, error: checkError } = await serviceClient
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', userId)  // Use userId directly
        .single()

      console.log('🔍 Profile check:', { existingProfile, checkError })

      console.log('📝 About to update profiles table with:', profileUpdates)

      const { data: profileData, error: profileError } = await serviceClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)  // Use userId directly, not updatedStaff.user_id
        .select()

      // 

      if (profileError) {
        console.error('🚨 [STAFF PROFILE UPDATE] Profile update failed:', {
          error: profileError,
          errorDetails: {
            message: profileError.message,
            code: profileError.code,
            details: profileError.details,
            hint: profileError.hint
          },
          staffId: params.staffId,
          userId: userId,  // Use the resolved userId
          attemptedUpdates: profileUpdates,
          existingProfile: existingProfile
        })
        
        // If profile update fails, we should rollback the staff update
        // For now, log the error and return a detailed error message
        return NextResponse.json({
          error: `Staff information updated but profile update failed: ${profileError.message}`,
          details: {
            staffUpdateSucceeded: true,
            profileUpdateFailed: true,
            profileError: profileError.message,
            code: profileError.code,
            dbError: profileError,
            attemptedUpdates: profileUpdates
          }
        }, { status: 500 })
      }

      console.log('Profile update successful:', {
        profileData
      })
      
      // Fetch the updated profile to include in response
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, phone, avatar_url')
        .eq('id', staffId)
        .single()
      
      // Include updated profile in staff data with name format conversion
      if (updatedProfile) {
        // Convert full_name to first_name/last_name format for frontend compatibility
        const nameParts = updatedProfile.full_name ? updatedProfile.full_name.split(' ') : ['', '']
        updatedStaff.user = {
          ...updatedProfile,
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || ''
        }
      }
    }

    // Always fetch the current user profile to include in response
    // This ensures the frontend gets the updated user data regardless of whether profile fields were changed
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, first_name, last_name, phone, avatar_url')
      .eq('id', userId)  // Use userId directly
      .single()
    
    // Include profile data in staff response with name format conversion
    if (currentProfile) {
      // Convert full_name to first_name/last_name format for frontend compatibility
      const nameParts = currentProfile.full_name ? currentProfile.full_name.split(' ') : ['', '']
      updatedStaff.user = {
        ...currentProfile,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || ''
      }
    }

    return NextResponse.json({
      success: true,
      staff: updatedStaff,
      message: 'Staff member updated successfully'
    })

  } catch (error) {
    // console.error('PATCH /api/staff/[staffId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete (deactivate) staff member
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { staffId } = params
    
    // Get query params for hard delete option
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership using profiles table
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', staffId)
      .single()

    if (!profileCheck) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Get barbershop details separately
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', profileCheck.barbershop_id)
      .single()

    if (!barbershop || barbershop.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this staff member' }, { status: 403 })
    }

    if (hardDelete) {
      // Hard delete - remove profile record completely (dangerous operation)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', staffId)

      if (deleteError) {
        // console.error('Error deleting staff:', deleteError)
        return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Staff member permanently deleted'
      })
    } else {
      // Soft delete - just deactivate profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_active: false,
          can_take_appointments: false, // Also disable appointments
          metadata: {
            ...(profileCheck.metadata || {}),
            deactivated_at: new Date().toISOString(),
            deactivated_by: user.id
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)
        .select()
        .single()

      if (updateError) {
        // console.error('Error deactivating staff:', updateError)
        return NextResponse.json({ error: 'Failed to deactivate staff member' }, { status: 500 })
      }

      // Transform back to staff format for response
      const updatedStaff = {
        id: updatedProfile.id,
        user_id: updatedProfile.id,
        barbershop_id: updatedProfile.barbershop_id,
        is_active: updatedProfile.is_active,
        can_take_appointments: updatedProfile.can_take_appointments,
        metadata: updatedProfile.metadata
      }

      return NextResponse.json({
        success: true,
        staff: updatedStaff,
        message: 'Staff member deactivated successfully'
      })
    }

  } catch (error) {
    // console.error('DELETE /api/staff/[staffId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
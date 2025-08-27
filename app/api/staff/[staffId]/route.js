import { NextResponse } from 'next/server'
import { getDisplayName, splitFullName, combineNames, normalizeNameData } from '@/lib/name-utils'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase-simple'

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

    // Get staff member details - using separate queries to avoid PostgREST foreign key issues
    const { data: staffMember, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('*')
      .eq('id', staffId)
      .single()

    if (staffError) {
      // console.error('Error fetching staff member:', staffError)
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Get user profile details separately
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, email, full_name, phone, avatar_url')
      .eq('id', staffMember.user_id)
      .single()

    // Get barbershop details separately
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('id', staffMember.barbershop_id)
      .single()

    // Merge the data in JavaScript
    staffMember.user = userProfile
    staffMember.barbershop = barbershop

    // Get commission balance if exists
    const { data: commissionBalance } = await supabase
      .from('barber_commission_balances')
      .select('*')
      .eq('barber_id', staffMember.user_id)
      .single()

    // Get recent appointments (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, start_time, status, price')
      .eq('barber_id', staffMember.user_id)
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
    const { data: staffCheck } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('id', staffId)
      .single()

    if (!staffCheck) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Get barbershop details separately
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', staffCheck.barbershop_id)
      .single()

    if (!barbershop || barbershop.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to update this staff member' }, { status: 403 })
    }

    // Update staff record
    const updateData = {
      role: body.role || 'barber',
      is_active: body.is_active !== undefined ? body.is_active : true,
      financial_model: body.financial_model || 'commission',
      commission_rate: body.commission_rate || 0.5,
      hourly_rate: body.hourly_rate || 0,
      booth_rent_amount: body.booth_rent_amount || 0,
      metadata: {
        ...(body.metadata || {}),
        updated_at: new Date().toISOString(),
        updated_by: user.id
      }
    }

    const { data: updatedStaff, error: updateError } = await supabase
      .from('barbershop_staff')
      .update(updateData)
      .eq('id', staffId)
      .select()
      .single()

    if (updateError) {
      // console.error('Error updating staff:', updateError)
      return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
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

      // ,
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
      const serviceClient = createServiceClient()
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
        .from('users')
        .select('id, email, full_name')
        .eq('id', updatedStaff.user_id)
        .single()

      // 

      // 

      const { data: profileData, error: profileError } = await serviceClient
        .from('users')
        .update(profileUpdate)
        .eq('id', updatedStaff.user_id)
        .select()

      // 

      if (profileError) {
        // console.error('🚨 [STAFF PROFILE PUT] Profile update failed:', {
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

      // ,
        profileData
      })
      
      // Fetch the updated profile to include in response
      const { data: updatedProfile } = await supabase
        .from('users')
        .select('id, email, full_name, phone, avatar_url')
        .eq('id', updatedStaff.user_id)
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

    // BACKWARD COMPATIBLE: Check if staffId is a user_id or barbershop_staff.id
    // First try to find by user_id
    let { data: staffCheck, error: staffCheckError } = await supabase
      .from('barbershop_staff')
      .select('id, barbershop_id, metadata, user_id')
      .eq('user_id', userId)
      .single()

    // If not found, try to find by barbershop_staff.id (backward compatibility)
    if (!staffCheck) {
      // 
      const result = await supabase
        .from('barbershop_staff')
        .select('id, barbershop_id, metadata, user_id')
        .eq('id', userId)  // userId might actually be the barbershop_staff.id
        .single()
      
      if (result.data) {
        staffCheck = result.data
        userId = staffCheck.user_id  // Update userId to the actual user_id
        // 
      }
    }

    if (!staffCheck) {
      // console.error('❌ [API ROUTE] Staff not found for ID:', params.staffId)
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
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
      // console.warn('⚠️ [API ROUTE] Unauthorized access attempt:', {
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

    // Only update barbershop_staff if there are fields to update
    let updatedStaff = staffCheck  // Start with existing data
    
    if (Object.keys(updateData).length > 0) {
      // Update barbershop_staff record using the staff record ID (not user_id)
      const { data: staffUpdateResult, error: updateError } = await supabase
        .from('barbershop_staff')
        .update(updateData)
        .eq('id', staffCheck.id)  // Use the actual barbershop_staff.id
        .select()
        .single()

      if (updateError) {
        // console.error('❌ [API ROUTE] Error updating staff:', updateError)
        return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
      }
      
      updatedStaff = staffUpdateResult
      // 
    } else {
      // 
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

    // .length > 0,
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
      // 
      })

      // Use service client for profile updates to bypass RLS restrictions
      // Shop owners are authorized to update their staff's profile information
      const serviceClient = createServiceClient()
      
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
        .from('users')
        .select('id, email, full_name')
        .eq('id', userId)  // Use userId directly
        .single()

      // 

      // 

      const { data: profileData, error: profileError } = await serviceClient
        .from('users')
        .update(profileUpdates)
        .eq('id', userId)  // Use userId directly, not updatedStaff.user_id
        .select()

      // 

      if (profileError) {
        // console.error('🚨 [STAFF PROFILE UPDATE] Profile update failed:', {
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

      // ,
        profileData
      })
      
      // Fetch the updated profile to include in response
      const { data: updatedProfile } = await supabase
        .from('users')
        .select('id, email, full_name, phone, avatar_url')
        .eq('id', updatedStaff.user_id)
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
      .from('users')
      .select('id, email, full_name, phone, avatar_url')
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

    // Verify ownership
    const { data: staffCheck } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id, user_id')
      .eq('id', staffId)
      .single()

    if (!staffCheck) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Get barbershop details separately
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', staffCheck.barbershop_id)
      .single()

    if (!barbershop || barbershop.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this staff member' }, { status: 403 })
    }

    if (hardDelete) {
      // Hard delete - remove record completely
      const { error: deleteError } = await supabase
        .from('barbershop_staff')
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
      // Soft delete - just deactivate
      const { data: updatedStaff, error: updateError } = await supabase
        .from('barbershop_staff')
        .update({ 
          is_active: false,
          metadata: {
            deactivated_at: new Date().toISOString(),
            deactivated_by: user.id
          }
        })
        .eq('id', staffId)
        .select()
        .single()

      if (updateError) {
        // console.error('Error deactivating staff:', updateError)
        return NextResponse.json({ error: 'Failed to deactivate staff member' }, { status: 500 })
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
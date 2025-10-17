import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/no-show/policies
 * Fetch no-show policy for the barbershop
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get current user using Supabase auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Get no-show policy
    const { data: policy, error: policyError } = await supabase
      .from('no_show_policies')
      .select('*')
      .eq('barbershop_id', profile.barbershop_id)
      .eq('is_active', true)
      .single()
    
    if (policyError && policyError.code !== 'PGRST116') {
      throw policyError
    }

    // If no policy exists, return default values
    if (!policy) {
      return NextResponse.json({
        barbershop_id: profile.barbershop_id,
        strikes_before_block: 3,
        strike_expiry_days: 90,
        no_show_fee_enabled: true,
        no_show_fee_amount: 25.00,
        no_show_fee_type: 'fixed',
        grace_period_enabled: true,
        default_grace_minutes: 15,
        send_warning_at_strikes: 2,
        send_block_notification: true,
        allow_self_recovery: false,
        recovery_fee_amount: 50.00,
        recovery_requires_deposit: true,
        recovery_deposit_amount: 100.00,
        auto_charge_fees: false,
        auto_block_enabled: true,
        auto_send_notifications: true,
        policy_name: 'Default No-Show Policy',
        is_active: true,
        is_default: true // Flag to indicate this is default, not saved
      })
    }

    return NextResponse.json(policy)
    
  } catch (error) {
    console.error('Error fetching no-show policy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch no-show policy' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/no-show/policies
 * Create or update no-show policy
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get current user using Supabase auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const policyData = await request.json()
    
    // Get user's barbershop and check authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization - only owners and managers can modify policies
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'manager', 'owner']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if policy exists
    const { data: existingPolicy } = await supabase
      .from('no_show_policies')
      .select('id')
      .eq('barbershop_id', profile.barbershop_id)
      .single()

    let result
    
    if (existingPolicy) {
      // Update existing policy
      const { data, error } = await supabase
        .from('no_show_policies')
        .update({
          ...policyData,
          barbershop_id: profile.barbershop_id,
          updated_at: new Date().toISOString(),
          created_by: user.id
        })
        .eq('id', existingPolicy.id)
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      // Create new policy
      const { data, error } = await supabase
        .from('no_show_policies')
        .insert({
          ...policyData,
          barbershop_id: profile.barbershop_id,
          created_by: user.id,
          is_active: true
        })
        .select()
        .single()
      
      if (error) throw error
      result = data
    }

    // Log the policy change
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: existingPolicy ? 'update_no_show_policy' : 'create_no_show_policy',
        details: {
          barbershop_id: profile.barbershop_id,
          policy_changes: policyData
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      policy: result,
      message: 'No-show policy saved successfully' 
    })
    
  } catch (error) {
    console.error('Error saving no-show policy:', error)
    return NextResponse.json(
      { error: 'Failed to save no-show policy' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/no-show/policies
 * Deactivate no-show policy (soft delete)
 */
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    
    // Get current user using Supabase auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's barbershop and check authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization - only owners can delete policies
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'owner']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Soft delete by deactivating the policy
    const { error } = await supabase
      .from('no_show_policies')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('barbershop_id', profile.barbershop_id)
      .eq('is_active', true)
    
    if (error) throw error

    // Log the deletion
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'deactivate_no_show_policy',
        details: {
          barbershop_id: profile.barbershop_id
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      message: 'No-show policy deactivated successfully' 
    })
    
  } catch (error) {
    console.error('Error deactivating no-show policy:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate no-show policy' },
      { status: 500 }
    )
  }
}
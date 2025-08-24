import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { RuleValidator } from '@/lib/booking-rules-engine/RuleValidator'
import { RuleAuditor } from '@/lib/booking-rules-engine/RuleAuditor'
import { cacheManager } from '@/lib/booking-rules-engine/RuleCache'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get request body
    const { barbershop_id, rules, reason } = await request.json()
    
    if (!barbershop_id || !rules) {
      return NextResponse.json(
        { error: 'barbershop_id and rules are required' },
        { status: 400 }
      )
    }
    
    // Check user has permission to update this barbershop's rules
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', barbershop_id)
      .single()
    
    if (shopError || !barbershop) {
      return NextResponse.json(
        { error: 'Barbershop not found' },
        { status: 404 }
      )
    }
    
    // Check if user is owner or staff with admin role
    const isOwner = barbershop.owner_id === user.id
    
    if (!isOwner) {
      const { data: staffRole } = await supabase
        .from('barbershop_staff')
        .select('role')
        .eq('barbershop_id', barbershop_id)
        .eq('user_id', user.id)
        .single()
      
      if (!staffRole || !['admin', 'manager'].includes(staffRole.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
    
    // Validate rules
    const validator = new RuleValidator()
    const validation = validator.validate(rules)
    
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Invalid rules',
        validation: {
          errors: validation.errors,
          warnings: validation.warnings
        }
      }, { status: 400 })
    }
    
    // Get current rules for audit
    const { data: currentRules } = await supabase
      .from('booking_rules_v2')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true)
      .single()
    
    // Determine version
    const newVersion = currentRules ? currentRules.version + 1 : 1
    
    // Begin transaction-like operation
    let newRuleRecord = null
    
    try {
      // Deactivate current rules if they exist
      if (currentRules) {
        await supabase
          .from('booking_rules_v2')
          .update({ 
            is_active: false,
            effective_until: new Date().toISOString()
          })
          .eq('id', currentRules.id)
      }
      
      // Insert new rules
      const { data: newRule, error: insertError } = await supabase
        .from('booking_rules_v2')
        .insert({
          barbershop_id,
          rules,
          version: newVersion,
          is_active: true,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()
      
      if (insertError) throw insertError
      
      newRuleRecord = newRule
      
      // Log the change
      await supabase
        .from('booking_rule_changes')
        .insert({
          barbershop_id,
          changed_by: user.id,
          old_rules: currentRules?.rules || null,
          new_rules: rules,
          change_reason: reason || 'Manual update via settings',
          change_source: 'api'
        })
      
      // Invalidate cache
      const cache = cacheManager.getCache(barbershop_id)
      await cache.invalidate()
      
      // Log to auditor
      const auditor = new RuleAuditor(barbershop_id)
      await auditor.logRuleChange(
        currentRules?.rules || {},
        rules,
        user.id
      )
      
    } catch (error) {
      // Rollback: reactivate old rules if something went wrong
      if (currentRules && !newRuleRecord) {
        await supabase
          .from('booking_rules_v2')
          .update({ 
            is_active: true,
            effective_until: null
          })
          .eq('id', currentRules.id)
      }
      
      throw error
    }
    
    return NextResponse.json({
      success: true,
      rule: newRuleRecord,
      validation: {
        warnings: validation.warnings
      }
    })
    
  } catch (error) {
    console.error('Error updating booking rules:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update booking rules',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get request body
    const { barbershop_id, field, value } = await request.json()
    
    if (!barbershop_id || !field || value === undefined) {
      return NextResponse.json(
        { error: 'barbershop_id, field, and value are required' },
        { status: 400 }
      )
    }
    
    // Check permissions (same as POST)
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', barbershop_id)
      .single()
    
    const isOwner = barbershop?.owner_id === user.id
    
    if (!isOwner) {
      const { data: staffRole } = await supabase
        .from('barbershop_staff')
        .select('role')
        .eq('barbershop_id', barbershop_id)
        .eq('user_id', user.id)
        .single()
      
      if (!staffRole || !['admin', 'manager'].includes(staffRole.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
    
    // Get current rules
    const { data: currentRules, error: fetchError } = await supabase
      .from('booking_rules_v2')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }
    
    // Update the specific field
    let updatedRules = currentRules?.rules || {}
    
    // Handle nested fields (e.g., "scheduling.advance_booking_days")
    const fieldParts = field.split('.')
    let target = updatedRules
    
    for (let i = 0; i < fieldParts.length - 1; i++) {
      if (!target[fieldParts[i]]) {
        target[fieldParts[i]] = {}
      }
      target = target[fieldParts[i]]
    }
    
    target[fieldParts[fieldParts.length - 1]] = value
    
    // Validate the updated rules
    const validator = new RuleValidator()
    const validation = validator.validate(updatedRules)
    
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Invalid rule update',
        validation: {
          errors: validation.errors,
          warnings: validation.warnings
        }
      }, { status: 400 })
    }
    
    // Update or create rules
    if (currentRules) {
      // Update existing
      const { data: updated, error: updateError } = await supabase
        .from('booking_rules_v2')
        .update({
          rules: updatedRules,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentRules.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      // Invalidate cache
      const cache = cacheManager.getCache(barbershop_id)
      await cache.invalidate()
      
      return NextResponse.json({
        success: true,
        rule: updated,
        field,
        value
      })
    } else {
      // Create new
      const { data: created, error: createError } = await supabase
        .from('booking_rules_v2')
        .insert({
          barbershop_id,
          rules: updatedRules,
          version: 1,
          is_active: true,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()
      
      if (createError) throw createError
      
      return NextResponse.json({
        success: true,
        rule: created,
        field,
        value
      })
    }
    
  } catch (error) {
    console.error('Error updating booking rule field:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update booking rule field',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
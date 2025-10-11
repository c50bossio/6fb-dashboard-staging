/**
 * Unified Compensation API Endpoint
 * Handles all compensation operations with hierarchical inheritance
 * Supports shop defaults + individual barber overrides
 * Integrates with Stripe for payments
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import CompensationEngine from '@/lib/compensation/CompensationEngine'

export const runtime = 'nodejs'

/**
 * GET - Retrieve compensation data
 * Query params:
 * - barberId: specific barber (optional)
 * - type: 'defaults' | 'overrides' | 'effective' | 'all'
 * - includePayments: include payment history
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    const type = searchParams.get('type') || 'effective'
    const includePayments = searchParams.get('includePayments') === 'true'

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', user.id)
      .single()

    if (!profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    const barbershopId = profile.barbershop_id
    const engine = new CompensationEngine(barbershopId, barberId)

    let result = {}

    switch (type) {
      case 'defaults':
        result.shop_defaults = await engine.getShopDefaults()
        break
      
      case 'overrides':
        if (!barberId) {
          return NextResponse.json({ error: 'barberId required for overrides' }, { status: 400 })
        }
        result.barber_overrides = await engine.getBarberOverrides(barberId)
        break
      
      case 'effective':
        if (barberId) {
          result.effective_compensation = await engine.getEffectiveCompensation(barberId)
        } else {
          result.all_barber_compensation = await engine.getAllBarberCompensation()
        }
        break
      
      case 'all':
        result.shop_defaults = await engine.getShopDefaults()
        result.all_barber_compensation = await engine.getAllBarberCompensation()
        break
      
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

    // Include payment history if requested
    if (includePayments) {
      const paymentHistory = await engine.getPaymentHistory(barberId, {
        limit: 50
      })
      result.payment_history = paymentHistory.data
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in GET /api/v1/compensation/unified:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    )
  }
}

/**
 * POST - Create/Update compensation configuration
 * Body can contain:
 * - shop_defaults: Update shop default compensation
 * - barber_override: Create/update barber override
 * - payout_schedule: Set up automatic payouts
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data: requestData } = body

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check permissions
    if (!['SHOP_OWNER', 'MANAGER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const barbershopId = profile.barbershop_id
    const engine = new CompensationEngine(barbershopId)

    let result = {}

    switch (action) {
      case 'update_shop_defaults':
        result = await engine.saveShopDefaults(requestData, user.id)
        break
      
      case 'create_barber_override':
        const { barber_id, overrides, options = {} } = requestData
        result = await engine.createBarberOverride(
          barber_id, 
          overrides, 
          user.id, 
          options
        )
        break
      
      case 'setup_automatic_payouts':
        const { barberId, schedule } = requestData
        result = await engine.setupAutomaticPayouts(barberId, schedule)
        break
      
      case 'process_payment':
        const { targetBarberId, amount, paymentOptions = {} } = requestData
        result = await engine.processCompensationPayment(
          targetBarberId, 
          amount, 
          paymentOptions
        )
        break
      
      case 'collect_booth_rent':
        const { rentBarberId, rentAmount, rentOptions = {} } = requestData
        result = await engine.collectBoothRent(
          rentBarberId, 
          rentAmount, 
          rentOptions
        )
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      data: result.data || result,
      message: result.message || 'Operation completed successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/v1/compensation/unified:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    )
  }
}

/**
 * PUT - Update existing compensation configuration
 */
export async function PUT(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, barber_id, updates } = body

    // Get user's barbershop and verify permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    const barbershopId = profile.barbershop_id
    const engine = new CompensationEngine(barbershopId)

    let result = {}

    switch (type) {
      case 'shop_defaults':
        result = await engine.saveShopDefaults(updates, user.id)
        break
      
      case 'barber_override':
        if (!barber_id) {
          return NextResponse.json({ error: 'barber_id required' }, { status: 400 })
        }
        result = await engine.updateBarberOverride(barber_id, updates, user.id)
        break
      
      default:
        return NextResponse.json({ error: 'Invalid update type' }, { status: 400 })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      type,
      data: result.data,
      updated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in PUT /api/v1/compensation/unified:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove compensation configurations
 */
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const barberId = searchParams.get('barberId')

    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check permissions
    if (!['SHOP_OWNER', 'MANAGER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const barbershopId = profile.barbershop_id

    let result = {}

    switch (type) {
      case 'barber_override':
        if (!barberId) {
          return NextResponse.json({ error: 'barberId required' }, { status: 400 })
        }
        
        // Deactivate barber override (revert to shop defaults)
        const { error } = await supabase
          .from('barber_compensation_overrides')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershopId)
          .eq('barber_id', barberId)
          .eq('is_active', true)

        if (error) throw error

        result = { message: 'Barber override removed - reverted to shop defaults' }
        break
      
      case 'payout_schedule':
        if (!barberId) {
          return NextResponse.json({ error: 'barberId required' }, { status: 400 })
        }
        
        // Deactivate automatic payout schedule
        const { error: payoutError } = await supabase
          .from('automatic_payout_schedules')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershopId)
          .eq('barber_id', barberId)
          .eq('is_active', true)

        if (payoutError) throw payoutError

        result = { message: 'Automatic payout schedule disabled' }
        break
      
      default:
        return NextResponse.json({ error: 'Invalid delete type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      type,
      barber_id: barberId,
      result
    })

  } catch (error) {
    console.error('Error in DELETE /api/v1/compensation/unified:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    )
  }
}
/**
 * Compensation Calculation API
 * Calculates compensation based on revenue and effective compensation settings
 * Supports all models: commission, booth rent, tiered, hybrid
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import CompensationEngine from '@/lib/compensation/CompensationEngine'

export const runtime = 'nodejs'

/**
 * POST - Calculate compensation for given revenue
 * Body:
 * {
 *   revenue: number,
 *   barberId: string,
 *   period?: 'daily' | 'weekly' | 'monthly',
 *   options?: { period_start, period_end, include_history }
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { revenue, barberId, period = 'monthly', options = {} } = body

    if (!revenue || revenue < 0) {
      return NextResponse.json({ 
        error: 'Valid revenue amount required' 
      }, { status: 400 })
    }

    if (!barberId) {
      return NextResponse.json({ 
        error: 'barberId required for calculation' 
      }, { status: 400 })
    }

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

    // Calculate compensation
    const calculation = await engine.calculateCompensation(revenue, {
      barberId,
      period,
      ...options
    })

    // Get effective compensation settings for context
    const effectiveCompensation = await engine.getEffectiveCompensation(barberId)

    return NextResponse.json({
      calculation,
      effective_compensation: effectiveCompensation,
      input: {
        revenue,
        barber_id: barberId,
        period,
        options
      },
      metadata: {
        calculated_at: new Date().toISOString(),
        barbershop_id: barbershopId,
        calculator_version: '1.0'
      }
    })

  } catch (error) {
    console.error('Error in POST /api/v1/compensation/calculate:', error)
    return NextResponse.json(
      { error: 'Calculation failed', details: error.message }, 
      { status: 500 }
    )
  }
}

/**
 * GET - Bulk calculation endpoint for multiple scenarios
 * Query params:
 * - barberId: barber to calculate for
 * - revenues: comma-separated revenue amounts
 * - period: calculation period
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
    const revenuesParam = searchParams.get('revenues')
    const period = searchParams.get('period') || 'monthly'

    if (!barberId) {
      return NextResponse.json({ 
        error: 'barberId required' 
      }, { status: 400 })
    }

    if (!revenuesParam) {
      return NextResponse.json({ 
        error: 'revenues parameter required (comma-separated)' 
      }, { status: 400 })
    }

    // Parse revenues
    const revenues = revenuesParam
      .split(',')
      .map(r => parseFloat(r.trim()))
      .filter(r => !isNaN(r) && r >= 0)

    if (revenues.length === 0) {
      return NextResponse.json({ 
        error: 'Valid revenue amounts required' 
      }, { status: 400 })
    }

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

    // Calculate for each revenue amount
    const calculations = await Promise.all(
      revenues.map(async (revenue) => {
        try {
          const calc = await engine.calculateCompensation(revenue, {
            barberId,
            period
          })
          return {
            revenue,
            ...calc,
            success: true
          }
        } catch (error) {
          return {
            revenue,
            success: false,
            error: error.message
          }
        }
      })
    )

    // Get effective compensation for context
    const effectiveCompensation = await engine.getEffectiveCompensation(barberId)

    return NextResponse.json({
      calculations,
      effective_compensation: effectiveCompensation,
      summary: {
        total_scenarios: calculations.length,
        successful_calculations: calculations.filter(c => c.success).length,
        failed_calculations: calculations.filter(c => !c.success).length
      },
      metadata: {
        calculated_at: new Date().toISOString(),
        barbershop_id: barbershopId,
        period
      }
    })

  } catch (error) {
    console.error('Error in GET /api/v1/compensation/calculate:', error)
    return NextResponse.json(
      { error: 'Bulk calculation failed', details: error.message }, 
      { status: 500 }
    )
  }
}
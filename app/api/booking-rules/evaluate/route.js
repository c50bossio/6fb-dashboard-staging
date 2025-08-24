import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { RuleEngine } from '@/lib/booking-rules-engine/RuleEngine'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient()
    
    // Get request body
    const bookingRequest = await request.json()
    
    // Validate required fields
    if (!bookingRequest.barbershop_id) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      )
    }
    
    if (!bookingRequest.date || !bookingRequest.time) {
      return NextResponse.json(
        { error: 'date and time are required' },
        { status: 400 }
      )
    }
    
    // Initialize rule engine
    const ruleEngine = new RuleEngine(bookingRequest.barbershop_id)
    
    // Evaluate the booking request
    const startTime = Date.now()
    const evaluation = await ruleEngine.evaluate(bookingRequest)
    const evaluationTime = Date.now() - startTime
    
    // Add performance metrics
    evaluation.metadata.evaluationTime = evaluationTime
    
    // Log if evaluation was slow
    if (evaluationTime > 100) {
      console.warn(`Slow rule evaluation: ${evaluationTime}ms for barbershop ${bookingRequest.barbershop_id}`)
    }
    
    // Return evaluation result
    return NextResponse.json({
      success: true,
      evaluation,
      performance: {
        evaluationTimeMs: evaluationTime,
        cached: evaluationTime < 10 // Assume cached if very fast
      }
    })
    
  } catch (error) {
    console.error('Rule evaluation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to evaluate booking rules',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    
    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Get active rules for barbershop
    const { data: rules, error } = await supabase
      .from('booking_rules_v2')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw error
    }
    
    // If no rules found, get from legacy tables
    if (!rules) {
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('booking_settings, payment_settings, business_hours')
        .eq('id', barbershopId)
        .single()
      
      const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('booking_rules')
        .eq('barbershop_id', barbershopId)
        .single()
      
      // Merge legacy settings
      const legacyRules = {
        ...barbershop?.booking_settings,
        ...barbershop?.payment_settings,
        business_hours: barbershop?.business_hours,
        ...businessSettings?.booking_rules
      }
      
      return NextResponse.json({
        success: true,
        rules: legacyRules,
        source: 'legacy',
        version: 0
      })
    }
    
    return NextResponse.json({
      success: true,
      rules: rules.rules,
      source: 'v2',
      version: rules.version,
      metadata: {
        effective_from: rules.effective_from,
        effective_until: rules.effective_until,
        updated_at: rules.updated_at
      }
    })
    
  } catch (error) {
    console.error('Error fetching booking rules:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch booking rules',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const barbershop_id = searchParams.get('barbershop_id')

    if (!barbershop_id) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 })
    }

    // Check if barbershop is enrolled in marketplace
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('marketplace_enrollment')
      .select(`
        id,
        tier_level,
        discount_percentage,
        credit_limit,
        credit_used,
        status,
        enrolled_at,
        updated_at
      `)
      .eq('barbershop_id', barbershop_id)
      .eq('status', 'active')
      .single()

    if (enrollmentError && enrollmentError.code !== 'PGRST116') {
      console.error('Error checking enrollment:', enrollmentError)
      return NextResponse.json({ error: 'Failed to check enrollment' }, { status: 500 })
    }

    return NextResponse.json({
      enrolled: !!enrollment,
      enrollment: enrollment || null
    })

  } catch (error) {
    console.error('Enrollment check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      barbershop_id,
      tier_level,
      business_name,
      contact_email,
      contact_phone,
      tax_id,
      business_address
    } = body

    if (!barbershop_id || !tier_level || !business_name || !contact_email) {
      return NextResponse.json({ 
        error: 'Missing required fields: barbershop_id, tier_level, business_name, contact_email' 
      }, { status: 400 })
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('marketplace_enrollment')
      .select('id')
      .eq('barbershop_id', barbershop_id)
      .eq('status', 'active')
      .single()

    if (existingEnrollment) {
      return NextResponse.json({ 
        error: 'Already enrolled in marketplace' 
      }, { status: 409 })
    }

    // Define tier benefits
    const tierBenefits = {
      'standard': { discount: 0, creditLimit: 1000 },
      'silver': { discount: 5, creditLimit: 5000 },
      'gold': { discount: 10, creditLimit: 10000 },
      'platinum': { discount: 15, creditLimit: 25000 }
    }

    const benefits = tierBenefits[tier_level] || tierBenefits.standard

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('marketplace_enrollment')
      .insert({
        barbershop_id,
        tier_level,
        discount_percentage: benefits.discount,
        credit_limit: benefits.creditLimit,
        credit_used: 0,
        status: 'active',
        business_name,
        contact_email,
        contact_phone,
        tax_id,
        business_address,
        enrolled_at: new Date().toISOString()
      })
      .select()
      .single()

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError)
      return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      enrollment 
    })

  } catch (error) {
    console.error('Enrollment creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      barbershop_id,
      tier_level
    } = body

    if (!barbershop_id || !tier_level) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Define tier benefits
    const tierBenefits = {
      'standard': { discount: 0, creditLimit: 1000 },
      'silver': { discount: 5, creditLimit: 5000 },
      'gold': { discount: 10, creditLimit: 10000 },
      'platinum': { discount: 15, creditLimit: 25000 }
    }

    const benefits = tierBenefits[tier_level] || tierBenefits.standard

    // Update enrollment
    const { data: enrollment, error: updateError } = await supabase
      .from('marketplace_enrollment')
      .update({
        tier_level,
        discount_percentage: benefits.discount,
        credit_limit: benefits.creditLimit,
        updated_at: new Date().toISOString()
      })
      .eq('barbershop_id', barbershop_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating enrollment:', updateError)
      return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      enrollment 
    })

  } catch (error) {
    console.error('Enrollment update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
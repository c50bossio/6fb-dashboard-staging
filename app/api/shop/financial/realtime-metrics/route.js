import { NextResponse } from 'next/server'
import financialService from '@/lib/financial-service'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search parameters
    const { searchParams } = new URL(request.url)
    const barberbarbershopId = searchParams.get('barberbarbershop_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!barberbarbershopId) {
      return NextResponse.json(
        { error: 'Barbershop ID is required' }, 
        { status: 400 }
      )
    }

    // Verify user has access to this barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id')
      .eq('id', barberbarbershopId)
      .single()

    if (!barbershop) {
      return NextResponse.json(
        { error: 'Barbershop not found' }, 
        { status: 404 }
      )
    }

    // Check if user is owner or staff member
    const isOwner = barbershop.owner_id === user.id
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: staffRecord } = await supabase
        .from('barbershop_staff')
        .select('id')
        .eq('barberbarbershop_id', barberbarbershopId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      hasAccess = !!staffRecord
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' }, 
        { status: 403 }
      )
    }

    // Build date range
    const dateRange = {}
    if (startDate) dateRange.start = startDate
    if (endDate) dateRange.end = endDate

    // Get real-time financial metrics
    const { data: metrics, error } = await financialService.getRealtimeFinancialMetrics(
      barberbarbershopId, 
      dateRange
    )

    if (error) {
      console.error('Error fetching realtime metrics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch financial metrics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
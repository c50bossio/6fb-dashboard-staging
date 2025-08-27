import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import financialService from '@/lib/financial-service'

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
    const barbershopId = searchParams.get('barbershop_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'Barbershop ID is required' }, 
        { status: 400 }
      )
    }

    // Verify user has access to this barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id')
      .eq('id', barbershopId)
      .single()

    if (!barbershop) {
      return NextResponse.json(
        { error: 'Barbershop not found' }, 
        { status: 404 }
      )
    }

    // Check if user is owner or staff member with appropriate permissions
    const isOwner = barbershop.owner_id === user.id
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: staffRecord } = await supabase
        .from('barbershop_staff')
        .select('id, role')
        .eq('barbershop_id', barbershopId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      // Allow managers and owners to view tier analytics
      hasAccess = !!staffRecord && ['manager', 'owner'].includes(staffRecord.role)
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

    // Get tier progression analytics
    const { data: analytics, error } = await financialService.getTierProgressionAnalytics(
      barbershopId, 
      dateRange
    )

    if (error) {
      console.error('Error fetching tier analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tier analytics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { RuleAuditor } from '@/lib/booking-rules-engine/RuleAuditor'
import { cookies } from 'next/headers'

export async function GET(request) {
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const metric = searchParams.get('metric') // 'summary', 'trends', 'effectiveness', 'violations'
    
    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      )
    }
    
    // Check user has permission to view this barbershop's analytics
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', barbershopId)
      .single()
    
    const isOwner = barbershop?.owner_id === user.id
    
    if (!isOwner) {
      const { data: staffRole } = await supabase
        .from('barbershop_staff')
        .select('role')
        .eq('barbershop_id', barbershopId)
        .eq('user_id', user.id)
        .single()
      
      if (!staffRole) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
    
    // Initialize auditor
    const auditor = new RuleAuditor(barbershopId)
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    
    let analyticsData
    
    switch (metric) {
      case 'trends':
        analyticsData = await auditor.getViolationTrends(30)
        break
        
      case 'effectiveness':
        analyticsData = await auditor.getRuleEffectiveness()
        break
        
      case 'violations':
        analyticsData = await getViolationBreakdown(supabase, barbershopId, start, end)
        break
        
      case 'realtime':
        analyticsData = auditor.getMetrics()
        break
        
      default:
        // Default to summary
        analyticsData = await auditor.getAnalytics(start, end)
        break
    }
    
    return NextResponse.json({
      success: true,
      barbershop_id: barbershopId,
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      metric,
      data: analyticsData
    })
    
  } catch (error) {
    console.error('Error fetching booking rule analytics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

async function getViolationBreakdown(supabase, barbershopId, startDate, endDate) {
  const { data: evaluations, error } = await supabase
    .from('booking_rule_evaluations')
    .select('result, timestamp')
    .eq('barbershop_id', barbershopId)
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
  
  if (error) throw error
  
  // Process violations by type and time
  const violationTypes = {}
  const violationsByHour = new Array(24).fill(0)
  const violationsByDay = new Array(7).fill(0)
  const violationTimeline = []
  
  for (const eval_ of evaluations || []) {
    const timestamp = new Date(eval_.timestamp)
    const hour = timestamp.getHours()
    const day = timestamp.getDay()
    
    for (const violation of eval_.result?.violations || []) {
      // Count by type
      if (!violationTypes[violation.code]) {
        violationTypes[violation.code] = {
          count: 0,
          messages: new Set(),
          examples: []
        }
      }
      
      violationTypes[violation.code].count++
      violationTypes[violation.code].messages.add(violation.message)
      
      if (violationTypes[violation.code].examples.length < 5) {
        violationTypes[violation.code].examples.push({
          timestamp: eval_.timestamp,
          message: violation.message
        })
      }
      
      // Count by time
      violationsByHour[hour]++
      violationsByDay[day]++
    }
    
    // Build timeline
    if (eval_.result?.violations?.length > 0) {
      violationTimeline.push({
        timestamp: eval_.timestamp,
        count: eval_.result.violations.length,
        types: eval_.result.violations.map(v => v.code)
      })
    }
  }
  
  // Convert sets to arrays
  for (const type in violationTypes) {
    violationTypes[type].messages = Array.from(violationTypes[type].messages)
  }
  
  // Sort timeline
  violationTimeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  
  return {
    summary: {
      total_evaluations: evaluations.length,
      evaluations_with_violations: violationTimeline.length,
      violation_rate: evaluations.length > 0 
        ? (violationTimeline.length / evaluations.length) * 100 
        : 0
    },
    by_type: violationTypes,
    by_hour: violationsByHour,
    by_day: violationsByDay,
    timeline: violationTimeline.slice(-100) // Last 100 violations
  }
}

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
    const { barbershop_id, format } = await request.json()
    
    if (!barbershop_id) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      )
    }
    
    // Check permissions (same as GET)
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', barbershop_id)
      .single()
    
    const isOwner = barbershop?.owner_id === user.id
    
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only shop owners can export analytics' },
        { status: 403 }
      )
    }
    
    // Initialize auditor
    const auditor = new RuleAuditor(barbershop_id)
    
    // Export analytics
    const exportData = await auditor.exportAnalytics(format || 'json')
    
    // Set appropriate headers based on format
    const headers = new Headers()
    
    if (format === 'csv') {
      headers.set('Content-Type', 'text/csv')
      headers.set('Content-Disposition', `attachment; filename="booking-rules-analytics-${barbershop_id}.csv"`)
    } else {
      headers.set('Content-Type', 'application/json')
      headers.set('Content-Disposition', `attachment; filename="booking-rules-analytics-${barbershop_id}.json"`)
    }
    
    return new NextResponse(exportData, { headers })
    
  } catch (error) {
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to export analytics',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
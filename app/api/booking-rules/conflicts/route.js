import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { ConflictDetector } from '@/lib/booking-rules-engine/ConflictDetector'
import { cookies } from 'next/headers'

// Initialize conflict detector singleton
let conflictDetector = null

function getConflictDetector() {
  if (!conflictDetector) {
    conflictDetector = new ConflictDetector()
  }
  return conflictDetector
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
    const { 
      barbershop_id, 
      barber_id, 
      start_time, 
      duration,
      exclude_appointment_id // Optional: exclude a specific appointment (for rescheduling)
    } = await request.json()
    
    if (!barbershop_id || !barber_id || !start_time || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Verify user has permission to check conflicts for this barbershop
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
      
      if (!staffRole) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
    
    // Use conflict detector to find conflicts
    const detector = getConflictDetector()
    const conflicts = await detector.findConflicts({
      barbershop_id,
      barber_id,
      start_time,
      duration
    })
    
    // Filter out the excluded appointment if provided
    const filteredConflicts = exclude_appointment_id
      ? conflicts.filter(c => c.id !== exclude_appointment_id)
      : conflicts
    
    // Analyze conflict severity
    const analysis = analyzeConflicts(filteredConflicts)
    
    return NextResponse.json({
      success: true,
      conflicts: filteredConflicts,
      has_conflicts: filteredConflicts.length > 0,
      analysis,
      checked_at: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error checking conflicts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check conflicts',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

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
    const barbershop_id = searchParams.get('barbershop_id')
    const barber_id = searchParams.get('barber_id')
    const date = searchParams.get('date')
    const duration = parseInt(searchParams.get('duration') || '30')
    
    if (!barbershop_id || !barber_id || !date) {
      return NextResponse.json(
        { error: 'barbershop_id, barber_id, and date are required' },
        { status: 400 }
      )
    }
    
    // Verify permissions (same as POST)
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('owner_id, business_settings')
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
      
      if (!staffRole) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
    
    // Get business hours from settings
    const businessHours = barbershop?.business_settings?.hours || {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { closed: true }
    }
    
    const slotInterval = barbershop?.business_settings?.slot_interval || 30
    const bufferTime = barbershop?.business_settings?.buffer_time || 0
    
    // Use conflict detector to find available slots
    const detector = getConflictDetector()
    const availableSlots = await detector.findAvailableSlots({
      barbershop_id,
      barber_id,
      date,
      duration,
      business_hours: businessHours,
      slot_interval: slotInterval,
      buffer_time: bufferTime
    })
    
    // Get statistics
    const stats = detector.getStats()
    const barberStats = stats.trees[barber_id] || null
    
    return NextResponse.json({
      success: true,
      date,
      barber_id,
      duration,
      available_slots: availableSlots,
      total_slots: availableSlots.length,
      tree_stats: barberStats,
      business_hours: businessHours[new Date(date).toLocaleLowerCase('en-US', { weekday: 'long' }).toLowerCase()]
    })
    
  } catch (error) {
    console.error('Error finding available slots:', error)
    return NextResponse.json(
      { 
        error: 'Failed to find available slots',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * Analyze conflicts to determine severity and provide recommendations
 */
function analyzeConflicts(conflicts) {
  if (conflicts.length === 0) {
    return {
      severity: 'none',
      message: 'No conflicts detected',
      recommendation: 'This time slot is available for booking'
    }
  }
  
  // Check conflict types
  const hasExactOverlap = conflicts.some(c => c.conflict_type === 'exact_overlap')
  const hasContainedWithin = conflicts.some(c => c.conflict_type === 'contained_within')
  const hasContains = conflicts.some(c => c.conflict_type === 'contains')
  
  if (hasExactOverlap) {
    return {
      severity: 'critical',
      message: 'Exact time conflict with existing appointment',
      recommendation: 'This exact time slot is already booked. Please choose a different time.',
      conflict_count: conflicts.length
    }
  }
  
  if (hasContains) {
    return {
      severity: 'high',
      message: 'This booking would overlap multiple existing appointments',
      recommendation: 'This time range covers existing appointments. Consider a shorter duration or different time.',
      conflict_count: conflicts.length
    }
  }
  
  if (hasContainedWithin) {
    return {
      severity: 'high',
      message: 'This time falls within an existing appointment',
      recommendation: 'This time is part of a longer appointment. Please select a different time.',
      conflict_count: conflicts.length
    }
  }
  
  // Partial overlaps
  const startsBeforeCount = conflicts.filter(c => c.conflict_type === 'starts_before').length
  const endsAfterCount = conflicts.filter(c => c.conflict_type === 'ends_after').length
  
  if (startsBeforeCount > 0 || endsAfterCount > 0) {
    return {
      severity: 'medium',
      message: 'Partial overlap with existing appointment(s)',
      recommendation: 'Adjust the start time or duration to avoid overlapping with neighboring appointments.',
      conflict_count: conflicts.length,
      overlap_details: {
        starts_before: startsBeforeCount,
        ends_after: endsAfterCount
      }
    }
  }
  
  return {
    severity: 'low',
    message: 'Minor scheduling conflict detected',
    recommendation: 'Review the conflicting appointments and adjust if necessary.',
    conflict_count: conflicts.length
  }
}

export async function DELETE(request) {
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
    const barber_id = searchParams.get('barber_id')
    
    // Clear cache for specific barber or all
    const detector = getConflictDetector()
    
    if (barber_id) {
      detector.clearCache(barber_id)
      console.log(`Cleared conflict detection cache for barber ${barber_id}`)
    } else {
      detector.clearAllCaches()
      console.log('Cleared all conflict detection caches')
    }
    
    return NextResponse.json({
      success: true,
      message: barber_id 
        ? `Cache cleared for barber ${barber_id}`
        : 'All caches cleared',
      cleared_at: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { 
        error: 'Failed to clear cache',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
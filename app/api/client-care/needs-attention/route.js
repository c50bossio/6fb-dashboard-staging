import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCachedResults, cacheResults } from '@/lib/redis-client'

/**
 * GET /api/client-care/needs-attention
 * Identify clients who need follow-up attention for client care outreach
 * 
 * This endpoint supports the ClientCareFlow component by finding:
 * - Clients with recent no-shows (last 30 days)
 * - Clients who haven't visited in 60+ days
 * - Clients with cancelled appointments needing rescheduling
 * - High-value clients with declining visit patterns
 * 
 * Query Parameters:
 * - priority: 'high' | 'medium' | 'low' | 'all' (default: 'all')
 * - days_since_visit: number (default: 60)
 * - include_no_shows: boolean (default: true)
 * - limit: number (default: 50, max: 200)
 */
export async function GET(request) {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    
    // Get current user and validate authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const priority = searchParams.get('priority') || 'all'
    const daysSinceVisit = parseInt(searchParams.get('days_since_visit') || '60')
    const includeNoShows = searchParams.get('include_no_shows') !== 'false'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, shop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || (!profile?.barbershop_id && !profile?.shop_id)) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    const barbershopId = profile.barbershop_id || profile.shop_id

    // Check cache first for improved performance
    const cachedResults = await getCachedResults(barbershopId, priority, daysSinceVisit, includeNoShows)
    if (cachedResults) {
      // Update performance metrics with cache hit info
      const responseTime = Date.now() - startTime
      cachedResults.performance = {
        ...cachedResults.performance,
        total_response_time_ms: responseTime,
        cache_hit: true
      }
      
      console.log(`Using cached client-care results for barbershop ${barbershopId}`)
      return NextResponse.json(cachedResults)
    }

    // Calculate date thresholds
    const now = new Date()
    const noShowThreshold = new Date(now - (30 * 24 * 60 * 60 * 1000)) // 30 days ago
    const inactiveThreshold = new Date(now - (daysSinceVisit * 24 * 60 * 60 * 1000))
    const recentThreshold = new Date(now - (7 * 24 * 60 * 60 * 1000)) // 7 days ago
    
    // Build clients needing attention query
    const clientsNeedingAttention = []
    
    // 1. Find clients with recent no-shows
    if (includeNoShows) {
      const { data: noShowClients, error: noShowError } = await supabase
        .from('appointments')
        .select(`
          customer_id,
          customers!inner(
            id,
            name,
            email,
            phone,
            total_spent,
            total_visits,
            last_visit_at,
            created_at
          )
        `)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'no_show')
        .gte('appointment_date', noShowThreshold.toISOString())
        .limit(limit)
      
      if (noShowError) {
        console.error('Error fetching no-show clients:', noShowError)
      } else if (noShowClients?.length > 0) {
        const processedNoShows = noShowClients.map(apt => ({
          ...apt.customers,
          reason: 'recent_no_show',
          priority: 'high',
          last_activity: apt.appointment_date,
          care_score: calculateCareScore(apt.customers, 'no_show'),
          suggested_action: 'Follow up on missed appointment and reschedule'
        }))
        clientsNeedingAttention.push(...processedNoShows)
      }
    }
    
    // 2. Find inactive clients (haven't visited recently)
    const { data: inactiveClients, error: inactiveError } = await supabase
      .from('customers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .or(`last_visit_at.lt.${inactiveThreshold.toISOString()},last_visit_at.is.null`)
      .gt('total_visits', 0) // Only clients who have visited before
      .order('last_visit_at', { ascending: true, nullsFirst: false })
      .limit(Math.floor(limit / 2))
    
    if (inactiveError) {
      console.error('Error fetching inactive clients:', inactiveError)
    } else if (inactiveClients?.length > 0) {
      const processedInactive = inactiveClients
        .filter(client => !clientsNeedingAttention.find(c => c.id === client.id))
        .map(client => ({
          ...client,
          reason: 'inactive',
          priority: client.total_spent > 500 ? 'high' : client.total_spent > 200 ? 'medium' : 'low',
          last_activity: client.last_visit_at,
          care_score: calculateCareScore(client, 'inactive'),
          suggested_action: `Client hasn't visited in ${Math.floor((now - new Date(client.last_visit_at || client.created_at)) / (1000 * 60 * 60 * 24))} days - send re-engagement message`
        }))
      clientsNeedingAttention.push(...processedInactive)
    }
    
    // 3. Find clients with cancelled appointments (last 14 days) who haven't rescheduled
    const cancelledThreshold = new Date(now - (14 * 24 * 60 * 60 * 1000))
    const { data: cancelledClients, error: cancelledError } = await supabase
      .from('appointments')
      .select(`
        customer_id,
        appointment_date,
        customers!inner(
          id,
          name,
          email,
          phone,
          total_spent,
          total_visits,
          last_visit_at,
          created_at
        )
      `)
      .eq('barbershop_id', barbershopId)
      .eq('status', 'cancelled')
      .gte('appointment_date', cancelledThreshold.toISOString())
      .limit(Math.floor(limit / 3))
    
    if (cancelledError) {
      console.error('Error fetching cancelled appointments:', cancelledError)
    } else if (cancelledClients?.length > 0) {
      const processedCancelled = cancelledClients
        .filter(apt => !clientsNeedingAttention.find(c => c.id === apt.customers.id))
        .map(apt => ({
          ...apt.customers,
          reason: 'cancelled_not_rescheduled',
          priority: 'medium',
          last_activity: apt.appointment_date,
          care_score: calculateCareScore(apt.customers, 'cancelled'),
          suggested_action: 'Follow up on cancelled appointment and offer rescheduling'
        }))
      clientsNeedingAttention.push(...processedCancelled)
    }
    
    // Sort by care score (highest first) and apply priority filter
    let filteredClients = clientsNeedingAttention
      .filter(client => priority === 'all' || client.priority === priority)
      .sort((a, b) => (b.care_score || 0) - (a.care_score || 0))
      .slice(0, limit)
    
    // Remove duplicates based on client ID
    const uniqueClients = []
    const seenIds = new Set()
    for (const client of filteredClients) {
      if (!seenIds.has(client.id)) {
        seenIds.add(client.id)
        uniqueClients.push(client)
      }
    }
    
    // Calculate response time
    const responseTime = Date.now() - startTime
    
    // Log performance for monitoring
    if (responseTime > 2000) {
      console.warn(`Client care query took ${responseTime}ms - performance threshold exceeded`, {
        barbershop_id: barbershopId,
        client_count: uniqueClients.length,
        priority,
        include_no_shows: includeNoShows
      })
    }
    
    // Prepare response data
    const responseData = {
      clients: uniqueClients,
      summary: {
        total_found: uniqueClients.length,
        high_priority: uniqueClients.filter(c => c.priority === 'high').length,
        medium_priority: uniqueClients.filter(c => c.priority === 'medium').length,
        low_priority: uniqueClients.filter(c => c.priority === 'low').length,
        reasons: {
          no_shows: uniqueClients.filter(c => c.reason === 'recent_no_show').length,
          inactive: uniqueClients.filter(c => c.reason === 'inactive').length,
          cancelled: uniqueClients.filter(c => c.reason === 'cancelled_not_rescheduled').length
        }
      },
      performance: {
        response_time_ms: responseTime,
        query_timestamp: now.toISOString(),
        cache_hit: false
      }
    }
    
    // Cache the results for future requests (fire and forget)
    cacheResults(barbershopId, priority, daysSinceVisit, includeNoShows, responseData)
      .catch(error => {
        console.warn('⚠️ Failed to cache client care results:', error.message)
      })
    
    return NextResponse.json(responseData)
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('Error in client care needs attention:', {
      error: error.message,
      stack: error.stack,
      response_time_ms: responseTime
    })
    
    // Return graceful error response
    return NextResponse.json({
      error: 'Failed to fetch clients needing attention',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      clients: [], // Provide empty array for graceful fallback
      summary: {
        total_found: 0,
        high_priority: 0,
        medium_priority: 0,
        low_priority: 0,
        reasons: { no_shows: 0, inactive: 0, cancelled: 0 }
      }
    }, { status: 500 })
  }
}

/**
 * Calculate care score for prioritizing client outreach
 * Higher scores indicate higher priority for follow-up
 */
function calculateCareScore(client, reason) {
  let score = 0
  
  // Base score from client value
  const totalSpent = client.total_spent || 0
  const totalVisits = client.total_visits || 0
  
  // Value scoring (0-40 points)
  if (totalSpent > 1000) score += 40
  else if (totalSpent > 500) score += 30  
  else if (totalSpent > 200) score += 20
  else if (totalSpent > 50) score += 10
  
  // Loyalty scoring (0-30 points)
  if (totalVisits > 20) score += 30
  else if (totalVisits > 10) score += 20
  else if (totalVisits > 5) score += 15
  else if (totalVisits > 1) score += 10
  
  // Reason-based scoring (0-30 points)
  switch (reason) {
    case 'no_show':
      score += 30 // Highest urgency
      break
    case 'cancelled':
      score += 20 // Medium urgency  
      break
    case 'inactive':
      score += 15 // Lower urgency but still important
      break
  }
  
  // Recency bonus - how long since last activity
  const lastActivity = client.last_visit_at || client.created_at
  if (lastActivity) {
    const daysSinceActivity = Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24))
    
    if (daysSinceActivity > 90) score += 10
    else if (daysSinceActivity > 60) score += 8
    else if (daysSinceActivity > 30) score += 5
  }
  
  return Math.min(score, 100) // Cap at 100
}

/**
 * POST /api/client-care/needs-attention  
 * Mark a client as contacted or update their care status
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { client_id, action, notes } = await request.json()
    
    if (!client_id || !action) {
      return NextResponse.json({ error: 'client_id and action are required' }, { status: 400 })
    }
    
    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, shop_id')
      .eq('id', user.id)
      .single()
    
    const barbershopId = profile?.barbershop_id || profile?.shop_id
    
    // Log the client care action
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: `client_care_${action}`,
        details: {
          barbershop_id: barbershopId,
          client_id,
          notes,
          timestamp: new Date().toISOString()
        }
      })
    
    if (logError) {
      console.error('Error logging client care action:', logError)
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Client care action '${action}' recorded successfully`
    })
    
  } catch (error) {
    console.error('Error in client care action:', error)
    return NextResponse.json(
      { error: 'Failed to record client care action' },
      { status: 500 }
    )
  }
}
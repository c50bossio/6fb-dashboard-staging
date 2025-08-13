import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      type,
      rating,
      message,
      email,
      timestamp,
      url,
      userAgent
    } = body

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get user info from session if available
    const authHeader = request.headers.get('authorization')
    let userId = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // Store feedback in database
    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: userId,
        type: type || 'general',
        rating: rating || null,
        message,
        email: email || null,
        page_url: url || null,
        user_agent: userAgent || null,
        created_at: timestamp || new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving feedback:', error)
      
      // Fallback to logging if database fails
      console.log('Feedback received:', {
        type,
        rating,
        message,
        email,
        timestamp,
        url
      })
      
      // Still return success to user
      return NextResponse.json({
        success: true,
        message: 'Feedback received'
      })
    }

    // Send notification to admin if high-priority
    if (type === 'bug' || rating <= 2) {
      await notifyAdmin({
        type,
        rating,
        message,
        email,
        url
      })
    }

    // Track analytics event
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      // PostHog tracking would go here
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      id: data?.id
    })

  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    // Admin endpoint to retrieve feedback
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check admin authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Build query
    let query = supabase
      .from('user_feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    // Calculate statistics
    const stats = await calculateFeedbackStats()

    return NextResponse.json({
      feedback: data || [],
      total: count || 0,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: (offset + limit) < count
      }
    })

  } catch (error) {
    console.error('Feedback retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 }
    )
  }
}

async function notifyAdmin(feedback) {
  // Send email notification to admin
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@6fbagent.com'
    
    // In production, you would use an email service
    console.log('Admin notification:', {
      to: adminEmail,
      subject: `Urgent Feedback: ${feedback.type}`,
      body: `
        Type: ${feedback.type}
        Rating: ${feedback.rating}/5
        Message: ${feedback.message}
        From: ${feedback.email || 'Anonymous'}
        Page: ${feedback.url}
      `
    })
    
    // Also create an in-app notification
    await supabase
      .from('notifications')
      .insert({
        type: 'feedback_alert',
        title: `New ${feedback.type} feedback`,
        message: feedback.message.substring(0, 100),
        severity: feedback.type === 'bug' ? 'high' : 'medium',
        data: feedback
      })
      
  } catch (error) {
    console.error('Failed to notify admin:', error)
  }
}

async function calculateFeedbackStats() {
  try {
    const { data } = await supabase
      .from('user_feedback')
      .select('type, rating')
    
    if (!data) return null
    
    const stats = {
      total: data.length,
      byType: {},
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }
    
    let totalRating = 0
    let ratingCount = 0
    
    data.forEach(item => {
      // Count by type
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1
      
      // Calculate rating stats
      if (item.rating) {
        totalRating += item.rating
        ratingCount++
        stats.ratingDistribution[item.rating]++
      }
    })
    
    stats.averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0
    
    return stats
  } catch (error) {
    console.error('Failed to calculate stats:', error)
    return null
  }
}
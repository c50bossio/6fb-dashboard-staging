/**
 * User Notifications API
 * GET /api/user/notifications - Fetch user's notifications
 */

import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by read status if requested
    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('❌ Error fetching notifications:', error)
      return Response.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Transform notifications to match UI format
    const transformedNotifications = (notifications || []).map(notif => ({
      id: notif.id,
      message: notif.message || notif.title,
      time: getRelativeTime(notif.created_at),
      read: notif.read || false,
      type: notif.type,
      metadata: notif.metadata
    }))

    return Response.json({
      success: true,
      notifications: transformedNotifications,
      count: transformedNotifications.length
    })

  } catch (error) {
    console.error('❌ Notifications API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get relative time string
 */
function getRelativeTime(timestamp) {
  const now = new Date()
  const past = new Date(timestamp)
  const diffInSeconds = Math.floor((now - past) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
}

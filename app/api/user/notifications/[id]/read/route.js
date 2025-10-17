/**
 * Mark Notification as Read API
 * PUT /api/user/notifications/[id]/read - Mark a notification as read
 */

import { createClient } from '@/lib/supabase/server'

export async function PUT(request, { params }) {
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

    const { id } = await params

    // Verify notification belongs to user and update read status
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id) // Security: ensure user owns this notification
      .select()
      .single()

    if (error) {
      console.error('❌ Error marking notification as read:', error)
      return Response.json(
        { error: 'Failed to mark notification as read' },
        { status: 500 }
      )
    }

    if (!notification) {
      return Response.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      notification: {
        id: notification.id,
        read: notification.read,
        read_at: notification.read_at
      }
    })

  } catch (error) {
    console.error('❌ Mark notification read API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

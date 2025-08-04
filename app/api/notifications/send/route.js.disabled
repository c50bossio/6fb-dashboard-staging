import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UnifiedNotificationService } from '@/services/unified_notification_service'

export async function POST(req) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, userId, data } = await req.json()
    
    const notificationService = new UnifiedNotificationService()
    let result

    switch (type) {
      case 'booking_confirmation':
        result = await notificationService.sendBookingConfirmation(userId || user.id, data)
        break
        
      case 'booking_reminder':
        result = await notificationService.sendBookingReminder(userId || user.id, data)
        break
        
      case 'payment_success':
        result = await notificationService.sendPaymentSuccess(userId || user.id, data)
        break
        
      case 'subscription_renewed':
        result = await notificationService.sendSubscriptionRenewed(userId || user.id, data)
        break
        
      case 'agent_task_completed':
        result = await notificationService.sendAgentTaskCompleted(userId || user.id, data)
        break
        
      case 'welcome':
        result = await notificationService.sendWelcomeEmail(userId || user.id, data)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' }, 
          { status: 400 }
        )
    }

    // Log notification in database
    await supabase.from('notification_logs').insert({
      user_id: userId || user.id,
      type,
      data,
      sent_at: new Date().toISOString(),
      success: true,
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Notification send error:', error)
    
    // Log failed notification
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('notification_logs').insert({
        user_id: user.id,
        type: req.body?.type,
        data: req.body?.data,
        sent_at: new Date().toISOString(),
        success: false,
        error: error.message,
      })
    }
    
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    )
  }
}
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json({
        alerts: [],
        summary: {
          total_alerts: 0,
          unread_alerts: 0,
          high_priority: 0,
          action_required: 0,
          categories: {
            operational: 0,
            performance: 0,
            inventory: 0,
            customer_service: 0,
            appointments: 0,
            financial: 0,
            maintenance: 0,
            marketing: 0
          }
        },
        last_updated: new Date().toISOString(),
        message: 'No barbershop found. Please create or link a barbershop.'
      }, { status: 404 })
    }
    
    const today = new Date()
    const currentHour = today.getHours()
    const isBusinessHours = currentHour >= 9 && currentHour <= 19
    
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (notifError) {
      console.error('Error fetching notifications:', notifError)
    }
    
    const alerts = (notifications || []).map(notif => ({
      id: notif.id,
      type: notif.type || 'info',
      priority: notif.priority || 'medium',
      title: notif.title || 'Notification',
      message: notif.message || '',
      category: notif.category || 'general',
      created_at: notif.created_at,
      is_read: notif.is_read || false,
      action_required: notif.action_required || false,
      action_url: notif.action_url || null
    }))
    
    const systemAlerts = []
    
    const nextHour = new Date(today.getTime() + 60 * 60 * 1000)
    const { data: upcomingBookings } = await supabase
      .from('bookings')
      .select(`
        id,
        scheduled_at,
        client_name,
        services(name),
        barbershop_staff(first_name, last_name)
      `)
      .eq('barbershop_id', shop.id)
      .eq('status', 'confirmed')
      .gte('scheduled_at', today.toISOString())
      .lte('scheduled_at', nextHour.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
    
    if (upcomingBookings && upcomingBookings.length > 0) {
      const booking = upcomingBookings[0]
      const scheduledTime = new Date(booking.scheduled_at)
      const minutesUntil = Math.round((scheduledTime - today) / (1000 * 60))
      
      systemAlerts.push({
        id: `upcoming-${booking.id}`,
        type: 'info',
        priority: 'medium',
        title: 'Upcoming Appointment',
        message: `${booking.client_name} in ${minutesUntil} minutes for ${booking.services?.name || 'service'} with ${booking.barbershop_staff?.first_name || 'barber'}.`,
        category: 'appointments',
        created_at: new Date().toISOString(),
        is_read: false,
        action_required: false,
        action_url: '/shop/schedule'
      })
    }
    
    const { data: lowInventory } = await supabase
      .from('inventory')
      .select('product_name, current_stock, reorder_level')
      .eq('barbershop_id', shop.id)
      .lt('current_stock', 'reorder_level')
      .limit(3)
    
    lowInventory?.forEach(item => {
      systemAlerts.push({
        id: `inventory-${item.product_name}`,
        type: 'warning',
        priority: 'high',
        title: 'Low Inventory Alert',
        message: `${item.product_name} is running low (${item.current_stock} remaining). Consider reordering.`,
        category: 'inventory',
        created_at: new Date().toISOString(),
        is_read: false,
        action_required: true,
        action_url: '/shop/inventory'
      })
    })
    
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', shop.id)
      .eq('status', 'completed')
      .gte('scheduled_at', new Date(today.setHours(0, 0, 0, 0)).toISOString())
      .lte('scheduled_at', new Date(today.setHours(23, 59, 59, 999)).toISOString())
    
    const { data: todayRevenue } = await supabase
      .from('transactions')
      .select('amount')
      .eq('barbershop_id', shop.id)
      .eq('status', 'completed')
      .gte('created_at', new Date(today.setHours(0, 0, 0, 0)).toISOString())
      .lte('created_at', new Date(today.setHours(23, 59, 59, 999)).toISOString())
    
    const totalRevenue = todayRevenue?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    
    if (currentHour >= 17 && totalRevenue > 0) {
      systemAlerts.push({
        id: 'daily-summary',
        type: 'success',
        priority: 'low',
        title: 'Daily Summary Ready',
        message: `Today's performance: ${todayBookings || 0} appointments completed, $${totalRevenue.toFixed(2)} revenue.`,
        category: 'performance',
        created_at: new Date().toISOString(),
        is_read: false,
        action_required: false
      })
    }
    
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)
    const { data: inactiveCustomers, count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shop.id)
      .lt('last_visit_at', sixtyDaysAgo.toISOString())
    
    if (count && count > 0) {
      systemAlerts.push({
        id: 'inactive-customers',
        type: 'info',
        priority: 'low',
        title: 'Marketing Opportunity',
        message: `${count} customers haven't visited in 60+ days. Consider sending a promotional offer.`,
        category: 'marketing',
        created_at: new Date().toISOString(),
        is_read: false,
        action_required: false,
        action_url: '/shop/marketing'
      })
    }
    
    const allAlerts = [...alerts, ...systemAlerts]
    
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    allAlerts.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })
    
    const summary = {
      total_alerts: allAlerts.length,
      unread_alerts: allAlerts.filter(a => !a.is_read).length,
      high_priority: allAlerts.filter(a => a.priority === 'high').length,
      action_required: allAlerts.filter(a => a.action_required).length,
      categories: {
        operational: allAlerts.filter(a => a.category === 'operational').length,
        performance: allAlerts.filter(a => a.category === 'performance').length,
        inventory: allAlerts.filter(a => a.category === 'inventory').length,
        customer_service: allAlerts.filter(a => a.category === 'customer_service').length,
        appointments: allAlerts.filter(a => a.category === 'appointments').length,
        financial: allAlerts.filter(a => a.category === 'financial').length,
        maintenance: allAlerts.filter(a => a.category === 'maintenance').length,
        marketing: allAlerts.filter(a => a.category === 'marketing').length
      }
    }
    
    return NextResponse.json({
      alerts: allAlerts,
      summary,
      last_updated: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in /api/shop/alerts:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        alerts: [],
        summary: {
          total_alerts: 0,
          unread_alerts: 0,
          high_priority: 0,
          action_required: 0,
          categories: {}
        }
      },
      { status: 500 }
    )
  }
}
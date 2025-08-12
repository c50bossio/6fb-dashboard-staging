import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const today = new Date()
    const currentHour = today.getHours()
    const isBusinessHours = currentHour >= 9 && currentHour <= 19
    const dayOfWeek = today.getDay()
    
    // Generate dynamic alerts based on time and conditions
    const alerts = []
    
    // Time-based alerts
    if (currentHour === 9) {
      alerts.push({
        id: 'morning-opening',
        type: 'info',
        priority: 'medium',
        title: 'Shop Opening',
        message: 'Good morning! Shop is now open. 3 appointments scheduled for today.',
        category: 'operational',
        created_at: new Date().toISOString(),
        is_read: false,
        action_required: false
      })
    }
    
    if (currentHour === 18) {
      alerts.push({
        id: 'evening-summary',
        type: 'success',
        priority: 'low',
        title: 'Daily Summary Ready',
        message: 'Today\'s performance: 6 appointments completed, $420 revenue.',
        category: 'performance',
        created_at: new Date().toISOString(),
        is_read: false,
        action_required: false
      })
    }
    
    // Busy day alert
    if (isBusinessHours && Math.random() > 0.3) {
      alerts.push({
        id: 'busy-day',
        type: 'success',
        priority: 'medium',
        title: 'Busy Day Alert',
        message: 'Great job! You\'re 20% above average bookings today.',
        category: 'performance',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        is_read: false,
        action_required: false
      })
    }
    
    // Inventory alerts
    if (Math.random() > 0.6) {
      alerts.push({
        id: 'low-inventory',
        type: 'warning',
        priority: 'high',
        title: 'Low Inventory Alert',
        message: 'Hair styling gel is running low (2 bottles remaining). Consider reordering.',
        category: 'inventory',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        is_read: false,
        action_required: true,
        action_url: '/shop/inventory'
      })
    }
    
    // Customer service alerts
    if (Math.random() > 0.7) {
      alerts.push({
        id: 'customer-feedback',
        type: 'info',
        priority: 'medium',
        title: 'New Customer Review',
        message: 'John Smith left a 5-star review: "Amazing service as always!"',
        category: 'customer_service',
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        is_read: false,
        action_required: false,
        action_url: '/shop/reviews'
      })
    }
    
    // Appointment alerts
    if (isBusinessHours) {
      alerts.push({
        id: 'upcoming-appointment',
        type: 'info',
        priority: 'medium',
        title: 'Appointment Reminder',
        message: 'Next appointment in 15 minutes: Michael Johnson with Jamie Chen.',
        category: 'appointments',
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        is_read: false,
        action_required: false,
        action_url: '/shop/schedule'
      })
    }
    
    // Financial alerts
    if (dayOfWeek === 1) { // Monday
      alerts.push({
        id: 'weekly-payout',
        type: 'info',
        priority: 'medium',
        title: 'Weekly Payout Processing',
        message: 'Processing weekly payouts for barbers. $2,400 total commissions.',
        category: 'financial',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        is_read: false,
        action_required: false,
        action_url: '/shop/financial'
      })
    }
    
    // Equipment maintenance alerts
    if (Math.random() > 0.8) {
      alerts.push({
        id: 'equipment-maintenance',
        type: 'warning',
        priority: 'medium',
        title: 'Equipment Maintenance Due',
        message: 'Chair #2 is due for monthly maintenance check. Schedule service.',
        category: 'maintenance',
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        is_read: false,
        action_required: true
      })
    }
    
    // Marketing alerts
    if (Math.random() > 0.5) {
      alerts.push({
        id: 'marketing-opportunity',
        type: 'info',
        priority: 'low',
        title: 'Marketing Opportunity',
        message: '3 customers haven\'t visited in 60+ days. Consider sending a promotional offer.',
        category: 'marketing',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        is_read: false,
        action_required: false,
        action_url: '/shop/marketing'
      })
    }
    
    // Performance milestone alerts
    if (Math.random() > 0.7) {
      alerts.push({
        id: 'milestone-achievement',
        type: 'success',
        priority: 'low',
        title: 'Milestone Achieved!',
        message: 'Congratulations! You\'ve reached 100 five-star reviews this year.',
        category: 'achievements',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        is_read: false,
        action_required: false
      })
    }
    
    // Sort alerts by priority and time
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    alerts.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })
    
    // Calculate summary statistics
    const summary = {
      total_alerts: alerts.length,
      unread_alerts: alerts.filter(a => !a.is_read).length,
      high_priority: alerts.filter(a => a.priority === 'high').length,
      action_required: alerts.filter(a => a.action_required).length,
      categories: {
        operational: alerts.filter(a => a.category === 'operational').length,
        performance: alerts.filter(a => a.category === 'performance').length,
        inventory: alerts.filter(a => a.category === 'inventory').length,
        customer_service: alerts.filter(a => a.category === 'customer_service').length,
        appointments: alerts.filter(a => a.category === 'appointments').length,
        financial: alerts.filter(a => a.category === 'financial').length,
        maintenance: alerts.filter(a => a.category === 'maintenance').length,
        marketing: alerts.filter(a => a.category === 'marketing').length
      }
    }
    
    return NextResponse.json({
      alerts,
      summary,
      last_updated: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in /api/shop/alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const { alert_id, is_read } = await request.json()
    
    // Mock updating alert read status
    return NextResponse.json({
      success: true,
      alert_id,
      is_read,
      updated_at: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
export const runtime = 'edge'

/**
 * AI Task Management System
 * Automatically generates and manages business tasks based on analytics and insights
 */

// In-memory task storage (replace with database in production)
const taskStorage = new Map()
const taskTemplates = new Map()

// Initialize task templates
initializeTaskTemplates()

export async function POST(request) {
  try {
    const { action, barbershop_id, task_data } = await request.json()

    switch (action) {
      case 'generate_tasks':
        return await generateSmartTasks(barbershop_id)
      case 'get_tasks':
        return await getTasks(barbershop_id, task_data)
      case 'complete_task':
        return await completeTask(task_data)
      case 'snooze_task':
        return await snoozeTask(task_data)
      case 'dismiss_task':
        return await dismissTask(task_data)
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Task Manager error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process task management request'
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id') || 'demo'
    const status = searchParams.get('status') // pending, completed, snoozed
    const priority = searchParams.get('priority') // high, medium, low
    
    const tasks = await getTasks(barbershop_id, { status, priority })
    return tasks
  } catch (error) {
    console.error('Task retrieval error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve tasks'
    }, { status: 500 })
  }
}

/**
 * Generate smart tasks based on business analytics and patterns
 */
async function generateSmartTasks(barbershop_id) {
  try {
    // Fetch current business analytics
    const analyticsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/analytics/live-data?barbershop_id=${barbershop_id}`)
    const analyticsData = await analyticsResponse.json()
    
    // Fetch business monitor alerts
    const monitorResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/ai/business-monitor?barbershop_id=${barbershop_id}`)
    const monitorData = await monitorResponse.json()
    
    const metrics = analyticsData.success ? analyticsData.data : {}
    const alerts = monitorData.success ? monitorData.data.alerts || [] : []
    
    const generatedTasks = []
    
    // Generate tasks based on revenue analysis
    const revenueTasks = generateRevenueBasedTasks(metrics)
    generatedTasks.push(...revenueTasks)
    
    // Generate tasks based on customer analysis
    const customerTasks = generateCustomerBasedTasks(metrics)
    generatedTasks.push(...customerTasks)
    
    // Generate tasks based on operational metrics
    const operationalTasks = generateOperationalTasks(metrics)
    generatedTasks.push(...operationalTasks)
    
    // Generate tasks based on alerts
    const alertTasks = generateAlertBasedTasks(alerts)
    generatedTasks.push(...alertTasks)
    
    // Generate routine maintenance tasks
    const routineTasks = generateRoutineTasks()
    generatedTasks.push(...routineTasks)
    
    // Store tasks
    const existingTasks = taskStorage.get(barbershop_id) || []
    const newTasks = generatedTasks.filter(newTask => 
      !existingTasks.some(existing => existing.template_id === newTask.template_id)
    )
    
    taskStorage.set(barbershop_id, [...existingTasks, ...newTasks])
    
    return NextResponse.json({
      success: true,
      tasks_generated: newTasks.length,
      total_active_tasks: [...existingTasks, ...newTasks].filter(t => t.status === 'pending').length,
      new_tasks: newTasks,
      all_tasks: [...existingTasks, ...newTasks].filter(t => t.status === 'pending')
    })
  } catch (error) {
    console.error('Task generation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate smart tasks'
    }, { status: 500 })
  }
}

/**
 * Generate revenue-focused tasks
 */
function generateRevenueBasedTasks(metrics) {
  const tasks = []
  const currentRevenue = metrics.daily_revenue || 0
  const targetRevenue = 450
  
  // Low revenue task
  if (currentRevenue < targetRevenue * 0.8) {
    tasks.push(createTask('revenue_boost', {
      title: '💰 Boost Daily Revenue',
      description: `Current revenue ($${currentRevenue}) is below target ($${targetRevenue})`,
      actions: [
        'Send promotional SMS to inactive customers',
        'Post special offer on social media',
        'Call 3 regular customers to schedule appointments'
      ],
      estimated_impact: `+$${Math.round((targetRevenue - currentRevenue) * 0.6)}`,
      estimated_time: '30 minutes',
      priority: 'high'
    }))
  }
  
  // Upselling opportunity
  const avgTransaction = metrics.avg_transaction_value || 52
  if (avgTransaction < 65) {
    tasks.push(createTask('upselling_focus', {
      title: '📈 Focus on Upselling',
      description: `Average transaction ($${avgTransaction}) below optimal ($65)`,
      actions: [
        'Offer beard trim add-on to next 3 haircut customers',
        'Suggest premium products to customers with dry hair',
        'Promote hair styling service for special occasions'
      ],
      estimated_impact: `+$${Math.round((65 - avgTransaction) * 5)}`,
      estimated_time: '15 minutes per customer',
      priority: 'medium'
    }))
  }
  
  return tasks
}

/**
 * Generate customer-focused tasks
 */
function generateCustomerBasedTasks(metrics) {
  const tasks = []
  const totalCustomers = metrics.total_customers || 0
  const returningCustomers = metrics.returning_customers || 0
  const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0
  
  // Low retention task
  if (retentionRate < 70) {
    tasks.push(createTask('customer_retention', {
      title: '❤️ Improve Customer Retention',
      description: `Retention rate (${retentionRate.toFixed(1)}%) needs improvement`,
      actions: [
        'Send personalized thank-you messages to recent customers',
        'Call customers who haven\'t booked in 45+ days',
        'Create loyalty card system with 10th cut free'
      ],
      estimated_impact: '+15% retention rate',
      estimated_time: '45 minutes',
      priority: 'high'
    }))
  }
  
  // Customer feedback task
  tasks.push(createTask('collect_feedback', {
    title: '📝 Collect Customer Feedback',
    description: 'Gather insights to improve service quality',
    actions: [
      'Ask next 5 customers for feedback after service',
      'Send follow-up survey to customers from this week',
      'Check Google and Yelp reviews, respond to any new ones'
    ],
    estimated_impact: 'Improved service quality',
    estimated_time: '20 minutes',
    priority: 'low',
    recurring: 'weekly'
  }))
  
  return tasks
}

/**
 * Generate operational tasks
 */
function generateOperationalTasks(metrics) {
  const tasks = []
  const avgServiceTime = metrics.avg_service_time || 45
  const utilizationRate = metrics.utilization_rate || 75
  
  // Long service times
  if (avgServiceTime > 50) {
    tasks.push(createTask('optimize_service_time', {
      title: '⚡ Optimize Service Efficiency',
      description: `Average service time (${avgServiceTime} min) could be improved`,
      actions: [
        'Pre-organize tools and products between clients',
        'Time each step of service to identify bottlenecks',
        'Practice efficient cutting techniques during slow periods'
      ],
      estimated_impact: '+2-3 more customers per day',
      estimated_time: '30 minutes',
      priority: 'medium'
    }))
  }
  
  // Low utilization
  if (utilizationRate < 80) {
    tasks.push(createTask('improve_scheduling', {
      title: '📅 Optimize Scheduling',
      description: `Chair utilization (${utilizationRate}%) has room for improvement`,
      actions: [
        'Review appointment gaps and offer discounts for off-peak slots',
        'Allow walk-ins during slow periods',
        'Adjust staff schedule to match demand patterns'
      ],
      estimated_impact: '+$50-100 daily revenue',
      estimated_time: '25 minutes',
      priority: 'medium'
    }))
  }
  
  return tasks
}

/**
 * Generate tasks based on business alerts
 */
function generateAlertBasedTasks(alerts) {
  const tasks = []
  
  alerts.forEach(alert => {
    if (alert.type === 'critical' || alert.type === 'warning') {
      tasks.push(createTask(`alert_${alert.id}`, {
        title: `⚠️ Address: ${alert.title}`,
        description: alert.message,
        actions: alert.actions || [
          'Investigate the root cause of this issue',
          'Implement immediate corrective measures',
          'Monitor progress over next few days'
        ],
        estimated_impact: 'Prevent revenue loss',
        estimated_time: '30-60 minutes',
        priority: alert.type === 'critical' ? 'high' : 'medium',
        alert_based: true
      }))
    }
    
    if (alert.type === 'opportunity') {
      tasks.push(createTask(`opportunity_${alert.id}`, {
        title: `💡 Capitalize: ${alert.title}`,
        description: alert.message,
        actions: alert.actions || [
          'Analyze the opportunity thoroughly',
          'Create action plan to capitalize on opportunity',
          'Execute plan within optimal timeframe'
        ],
        estimated_impact: 'Increased revenue/growth',
        estimated_time: '45 minutes',
        priority: 'medium',
        alert_based: true
      }))
    }
  })
  
  return tasks
}

/**
 * Generate routine maintenance tasks
 */
function generateRoutineTasks() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const tasks = []
  
  // Weekly social media task (Mondays)
  if (dayOfWeek === 1) {
    tasks.push(createTask('weekly_social_media', {
      title: '📱 Weekly Social Media Update',
      description: 'Maintain online presence and attract new customers',
      actions: [
        'Post 3 pieces of content this week (before/after, tips, promotions)',
        'Respond to any comments or messages',
        'Check and update business hours/info if needed'
      ],
      estimated_impact: '5-10 new customer inquiries',
      estimated_time: '30 minutes',
      priority: 'medium',
      recurring: 'weekly'
    }))
  }
  
  // Equipment maintenance (First of month)
  if (today.getDate() === 1) {
    tasks.push(createTask('monthly_equipment_check', {
      title: '🔧 Monthly Equipment Maintenance',
      description: 'Ensure all equipment is in optimal condition',
      actions: [
        'Clean and oil all clippers and trimmers',
        'Check sharpness of scissors and sharpen if needed',
        'Deep clean workstation and sterilize all tools'
      ],
      estimated_impact: 'Improved service quality',
      estimated_time: '60 minutes',
      priority: 'medium',
      recurring: 'monthly'
    }))
  }
  
  return tasks
}

/**
 * Create a structured task object
 */
function createTask(template_id, taskData) {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    template_id,
    title: taskData.title,
    description: taskData.description,
    actions: taskData.actions || [],
    estimated_impact: taskData.estimated_impact,
    estimated_time: taskData.estimated_time,
    priority: taskData.priority || 'medium',
    status: 'pending',
    created_at: new Date().toISOString(),
    due_date: taskData.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    recurring: taskData.recurring || null,
    alert_based: taskData.alert_based || false,
    completion_reward: generateCompletionReward(taskData.priority)
  }
}

/**
 * Generate completion rewards based on task priority
 */
function generateCompletionReward(priority) {
  const rewards = {
    high: ['🎯 Major business impact!', '💪 Taking charge of your success!', '🚀 This will drive real growth!'],
    medium: ['👍 Good business management!', '📈 Steady progress!', '✨ Building better habits!'],
    low: ['☑️ Task completed!', '🙂 Nice work!', '✅ Staying organized!']
  }
  
  const rewardList = rewards[priority] || rewards.medium
  return rewardList[Math.floor(Math.random() * rewardList.length)]
}

/**
 * Get tasks for a business
 */
async function getTasks(barbershop_id, filters = {}) {
  const allTasks = taskStorage.get(barbershop_id) || []
  
  let filteredTasks = allTasks
  
  if (filters.status) {
    filteredTasks = filteredTasks.filter(task => task.status === filters.status)
  }
  
  if (filters.priority) {
    filteredTasks = filteredTasks.filter(task => task.priority === filters.priority)
  }
  
  // Sort by priority and creation date
  const priorityOrder = { high: 3, medium: 2, low: 1 }
  filteredTasks.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    return new Date(b.created_at) - new Date(a.created_at)
  })
  
  return NextResponse.json({
    success: true,
    total_tasks: filteredTasks.length,
    pending_tasks: allTasks.filter(t => t.status === 'pending').length,
    completed_today: allTasks.filter(t => 
      t.status === 'completed' && 
      new Date(t.completed_at).toDateString() === new Date().toDateString()
    ).length,
    tasks: filteredTasks
  })
}

/**
 * Mark a task as completed
 */
async function completeTask(task_data) {
  const { task_id, barbershop_id } = task_data
  const tasks = taskStorage.get(barbershop_id) || []
  
  const taskIndex = tasks.findIndex(task => task.id === task_id)
  if (taskIndex === -1) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  
  tasks[taskIndex].status = 'completed'
  tasks[taskIndex].completed_at = new Date().toISOString()
  
  taskStorage.set(barbershop_id, tasks)
  
  return NextResponse.json({
    success: true,
    message: 'Task completed successfully',
    reward: tasks[taskIndex].completion_reward,
    task: tasks[taskIndex]
  })
}

/**
 * Snooze a task for later
 */
async function snoozeTask(task_data) {
  const { task_id, barbershop_id, snooze_until } = task_data
  const tasks = taskStorage.get(barbershop_id) || []
  
  const taskIndex = tasks.findIndex(task => task.id === task_id)
  if (taskIndex === -1) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  
  tasks[taskIndex].status = 'snoozed'
  tasks[taskIndex].snoozed_until = snooze_until || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
  
  taskStorage.set(barbershop_id, tasks)
  
  return NextResponse.json({
    success: true,
    message: 'Task snoozed successfully',
    task: tasks[taskIndex]
  })
}

/**
 * Dismiss a task permanently
 */
async function dismissTask(task_data) {
  const { task_id, barbershop_id } = task_data
  const tasks = taskStorage.get(barbershop_id) || []
  
  const filteredTasks = tasks.filter(task => task.id !== task_id)
  taskStorage.set(barbershop_id, filteredTasks)
  
  return NextResponse.json({
    success: true,
    message: 'Task dismissed successfully'
  })
}

/**
 * Initialize task templates
 */
function initializeTaskTemplates() {
  // This could be expanded with more sophisticated templates
  taskTemplates.set('revenue_boost', {
    category: 'revenue',
    complexity: 'medium',
    frequency: 'as_needed'
  })
  
  taskTemplates.set('customer_retention', {
    category: 'customer',
    complexity: 'high',
    frequency: 'as_needed'
  })
  
  taskTemplates.set('weekly_social_media', {
    category: 'marketing',
    complexity: 'low',
    frequency: 'weekly'
  })
}
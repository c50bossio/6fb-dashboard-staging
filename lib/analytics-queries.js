// Analytics query helpers for the existing analytics_events table structure
import { createClient } from '@/lib/supabase/server'

export const analyticsQueries = {
  // Get onboarding funnel stats
  async getOnboardingFunnel(userId = null) {
    const supabase = createClient()
    
    let query = supabase
      .from('analytics_events')
      .select('event_name, event_properties, created_at')
      .like('event_name', 'onboarding_%')
      .order('created_at', { ascending: false })
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching onboarding funnel:', error)
      return null
    }
    
    // Process the data into funnel metrics
    const funnel = {
      started: 0,
      stepsCompleted: {},
      completed: 0,
      abandoned: 0,
      averageTimeToComplete: null,
      dropoffPoints: []
    }
    
    data?.forEach(event => {
      switch (event.event_name) {
        case 'onboarding_started':
          funnel.started++
          break
        case 'onboarding_completed':
          funnel.completed++
          if (event.event_properties?.total_time_seconds) {
            // Calculate average time
            const time = event.event_properties.total_time_seconds
            funnel.averageTimeToComplete = funnel.averageTimeToComplete 
              ? (funnel.averageTimeToComplete + time) / 2 
              : time
          }
          break
        case 'onboarding_abandoned':
          funnel.abandoned++
          if (event.event_properties?.last_step) {
            funnel.dropoffPoints.push(event.event_properties.last_step)
          }
          break
        default:
          if (event.event_name.startsWith('onboarding_step_')) {
            const stepName = event.event_properties?.step_name || event.event_name.replace('onboarding_step_', '')
            funnel.stepsCompleted[stepName] = (funnel.stepsCompleted[stepName] || 0) + 1
          }
      }
    })
    
    funnel.completionRate = funnel.started > 0 
      ? Math.round((funnel.completed / funnel.started) * 100) 
      : 0
    
    return funnel
  },

  // Get user's onboarding progress
  async getUserOnboardingProgress(userId) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_name, event_properties, created_at')
      .eq('user_id', userId)
      .like('event_name', 'onboarding_%')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching user progress:', error)
      return null
    }
    
    const progress = {
      started: false,
      startedAt: null,
      completed: false,
      completedAt: null,
      currentStep: null,
      completedSteps: [],
      skippedSteps: [],
      totalTimeSpent: 0
    }
    
    data?.forEach(event => {
      if (event.event_name === 'onboarding_started') {
        progress.started = true
        progress.startedAt = event.created_at
      } else if (event.event_name === 'onboarding_completed') {
        progress.completed = true
        progress.completedAt = event.created_at
        progress.completedSteps = event.event_properties?.completed_steps || []
        progress.skippedSteps = event.event_properties?.skipped_steps || []
      } else if (event.event_name.startsWith('onboarding_step_')) {
        const stepName = event.event_properties?.step_name
        if (stepName && !progress.completedSteps.includes(stepName)) {
          progress.completedSteps.push(stepName)
        }
        progress.currentStep = stepName
        
        if (event.event_properties?.time_spent_seconds) {
          progress.totalTimeSpent += event.event_properties.time_spent_seconds
        }
      }
    })
    
    return progress
  },

  // Get recent events
  async getRecentEvents(limit = 100) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching recent events:', error)
      return []
    }
    
    return data
  },

  // Get event counts by name
  async getEventCounts(startDate = null, endDate = null) {
    const supabase = createClient()
    
    let query = supabase
      .from('analytics_events')
      .select('event_name, created_at')
    
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching event counts:', error)
      return {}
    }
    
    // Count events by name
    const counts = {}
    data?.forEach(event => {
      counts[event.event_name] = (counts[event.event_name] || 0) + 1
    })
    
    return counts
  },

  // Get onboarding completion rate over time
  async getCompletionRateOverTime(days = 30) {
    const supabase = createClient()
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_name, created_at')
      .in('event_name', ['onboarding_started', 'onboarding_completed'])
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching completion rate:', error)
      return []
    }
    
    // Group by date
    const dailyStats = {}
    
    data?.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0]
      
      if (!dailyStats[date]) {
        dailyStats[date] = { started: 0, completed: 0 }
      }
      
      if (event.event_name === 'onboarding_started') {
        dailyStats[date].started++
      } else if (event.event_name === 'onboarding_completed') {
        dailyStats[date].completed++
      }
    })
    
    // Calculate completion rates
    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      started: stats.started,
      completed: stats.completed,
      completionRate: stats.started > 0 
        ? Math.round((stats.completed / stats.started) * 100) 
        : 0
    }))
  }
}

// Export individual functions for convenience
export const getOnboardingFunnel = analyticsQueries.getOnboardingFunnel
export const getUserOnboardingProgress = analyticsQueries.getUserOnboardingProgress
export const getRecentEvents = analyticsQueries.getRecentEvents
export const getEventCounts = analyticsQueries.getEventCounts
export const getCompletionRateOverTime = analyticsQueries.getCompletionRateOverTime
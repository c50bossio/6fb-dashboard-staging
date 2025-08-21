// Real-time notification system for barber management
import { createClient } from '@/lib/supabase/client'

class BarberNotificationManager {
  constructor() {
    this.supabase = createClient()
    this.subscribers = new Map()
    this.channels = new Map()
  }

  // Subscribe to barber-related notifications
  subscribe(barbershopId, callback) {
    const subscriberId = Math.random().toString(36).substring(7)
    this.subscribers.set(subscriberId, callback)

    // Subscribe to barber staff changes
    const staffChannel = this.supabase
      .channel(`barber_staff_${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barbershop_staff',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          this.handleStaffChange(payload, callback)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barber_onboarding',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          this.handleOnboardingChange(payload, callback)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barber_performance',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          this.handlePerformanceChange(payload, callback)
        }
      )
      .subscribe()

    this.channels.set(subscriberId, staffChannel)
    return subscriberId
  }

  // Unsubscribe from notifications
  unsubscribe(subscriberId) {
    const channel = this.channels.get(subscriberId)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(subscriberId)
    }
    this.subscribers.delete(subscriberId)
  }

  // Handle staff changes
  handleStaffChange(payload, callback) {
    const { eventType, new: newRecord, old: oldRecord } = payload

    let notification = {}

    switch (eventType) {
      case 'INSERT':
        notification = {
          type: 'barber_added',
          title: 'New Barber Added',
          message: `A new barber has been added to your team`,
          data: newRecord,
          timestamp: new Date().toISOString(),
          priority: 'medium'
        }
        break

      case 'UPDATE':
        // Check specific fields that changed
        if (newRecord.is_active !== oldRecord.is_active) {
          notification = {
            type: newRecord.is_active ? 'barber_activated' : 'barber_deactivated',
            title: newRecord.is_active ? 'Barber Activated' : 'Barber Deactivated',
            message: `Barber status has been ${newRecord.is_active ? 'activated' : 'deactivated'}`,
            data: newRecord,
            timestamp: new Date().toISOString(),
            priority: 'medium'
          }
        } else if (newRecord.onboarding_completed && !oldRecord.onboarding_completed) {
          notification = {
            type: 'onboarding_completed',
            title: 'Onboarding Complete',
            message: `Barber has completed their onboarding process`,
            data: newRecord,
            timestamp: new Date().toISOString(),
            priority: 'high'
          }
        }
        break

      case 'DELETE':
        notification = {
          type: 'barber_removed',
          title: 'Barber Removed',
          message: `A barber has been removed from your team`,
          data: oldRecord,
          timestamp: new Date().toISOString(),
          priority: 'high'
        }
        break
    }

    if (notification.type) {
      callback(notification)
    }
  }

  // Handle onboarding changes
  handleOnboardingChange(payload, callback) {
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (eventType === 'UPDATE') {
      // Check if progress increased
      const oldProgress = oldRecord?.onboarding_progress || 0
      const newProgress = newRecord?.onboarding_progress || 0

      if (newProgress > oldProgress) {
        const notification = {
          type: 'onboarding_progress',
          title: 'Onboarding Progress',
          message: `Barber onboarding is now ${newProgress}% complete`,
          data: {
            barberId: newRecord.barber_id,
            progress: newProgress,
            previousProgress: oldProgress
          },
          timestamp: new Date().toISOString(),
          priority: 'low'
        }
        callback(notification)
      }

      // Check if fully onboarded
      if (newRecord.fully_onboarded && !oldRecord.fully_onboarded) {
        const notification = {
          type: 'onboarding_completed',
          title: 'Onboarding Complete!',
          message: `Barber has completed all onboarding requirements`,
          data: {
            barberId: newRecord.barber_id
          },
          timestamp: new Date().toISOString(),
          priority: 'high'
        }
        callback(notification)
      }
    }
  }

  // Handle performance changes
  handlePerformanceChange(payload, callback) {
    const { eventType, new: newRecord } = payload

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      // Check for significant performance milestones
      const revenue = newRecord.total_revenue || 0
      const appointments = newRecord.total_appointments || 0
      const rating = newRecord.average_rating || 0

      let notifications = []

      // Revenue milestones
      if (revenue >= 1000 && revenue < 1100) {
        notifications.push({
          type: 'revenue_milestone',
          title: 'Revenue Milestone!',
          message: `Barber reached $${revenue} in revenue this ${newRecord.period_type}`,
          data: newRecord,
          timestamp: new Date().toISOString(),
          priority: 'medium'
        })
      }

      // High rating achievement
      if (rating >= 4.8 && appointments >= 10) {
        notifications.push({
          type: 'high_rating',
          title: 'Excellent Performance!',
          message: `Barber achieved ${rating}/5.0 rating with ${appointments} appointments`,
          data: newRecord,
          timestamp: new Date().toISOString(),
          priority: 'medium'
        })
      }

      notifications.forEach(notification => callback(notification))
    }
  }

  // Send specific notifications
  async sendBarberWelcomeNotification(barberEmail, shopName) {
    // This would integrate with your email service
    console.log(`Sending welcome email to ${barberEmail} for ${shopName}`)
    
    return {
      type: 'email_sent',
      title: 'Welcome Email Sent',
      message: `Welcome email sent to ${barberEmail}`,
      timestamp: new Date().toISOString()
    }
  }

  async sendOnboardingReminder(barberId, pendingSteps) {
    // This would send reminders for pending onboarding steps
    console.log(`Sending onboarding reminder for barber ${barberId}`, pendingSteps)
    
    return {
      type: 'reminder_sent',
      title: 'Onboarding Reminder Sent',
      message: `Reminder sent for ${pendingSteps.length} pending steps`,
      timestamp: new Date().toISOString()
    }
  }

  // Performance alerts
  async checkPerformanceAlerts(barbershopId) {
    try {
      // Get recent performance data
      const { data: performance } = await this.supabase
        .from('barber_performance')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('period_type', 'weekly')
        .gte('period_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      const alerts = []

      performance?.forEach(record => {
        // Low performance alert
        if (record.total_appointments < 5 && record.period_type === 'weekly') {
          alerts.push({
            type: 'low_performance',
            title: 'Low Performance Alert',
            message: `Barber only had ${record.total_appointments} appointments this week`,
            data: record,
            priority: 'high',
            timestamp: new Date().toISOString()
          })
        }

        // High cancellation rate
        const cancellationRate = record.cancelled_appointments / Math.max(record.total_appointments, 1)
        if (cancellationRate > 0.2) {
          alerts.push({
            type: 'high_cancellation',
            title: 'High Cancellation Rate',
            message: `Barber has ${Math.round(cancellationRate * 100)}% cancellation rate`,
            data: record,
            priority: 'medium',
            timestamp: new Date().toISOString()
          })
        }
      })

      return alerts
    } catch (error) {
      console.error('Error checking performance alerts:', error)
      return []
    }
  }
}

// Export singleton instance
export const barberNotifications = new BarberNotificationManager()

// React hook for easy integration
export function useBarberNotifications(barbershopId) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!barbershopId) return

    const handleNotification = (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50)) // Keep last 50
    }

    const subscriberId = barberNotifications.subscribe(barbershopId, handleNotification)

    return () => {
      barberNotifications.unsubscribe(subscriberId)
    }
  }, [barbershopId])

  const clearNotifications = () => setNotifications([])
  const removeNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index))
  }

  return {
    notifications,
    clearNotifications,
    removeNotification
  }
}
import { Novu } from '@novu/node'

// Initialize Novu client only if API key is available
export const novu = process.env.NOVU_API_KEY ? new Novu(process.env.NOVU_API_KEY) : null

// Notification templates
export const NOTIFICATION_TEMPLATES = {
  // Booking notifications
  BOOKING_CONFIRMED: 'booking-confirmed',
  BOOKING_REMINDER: 'booking-reminder',
  BOOKING_CANCELLED: 'booking-cancelled',
  
  // Payment notifications
  PAYMENT_SUCCESS: 'payment-success',
  PAYMENT_FAILED: 'payment-failed',
  SUBSCRIPTION_RENEWED: 'subscription-renewed',
  SUBSCRIPTION_CANCELLED: 'subscription-cancelled',
  
  // Agent notifications
  AGENT_TASK_COMPLETED: 'agent-task-completed',
  AGENT_ERROR: 'agent-error',
  
  // System notifications
  WELCOME_EMAIL: 'welcome-email',
  PASSWORD_RESET: 'password-reset',
  SYSTEM_ALERT: 'system-alert',
}

// Helper functions
export async function triggerNotification(template, subscriberId, payload) {
  if (!novu) {
    console.warn('Novu client not initialized - notification skipped')
    return { success: false, message: 'Novu not configured' }
  }
  
  try {
    const result = await novu.trigger(template, {
      to: {
        subscriberId,
      },
      payload,
    })
    return result
  } catch (error) {
    console.error('Novu notification error:', error)
    throw error
  }
}

// Create or update subscriber
export async function createSubscriber(userId, email, firstName, lastName, phone) {
  if (!novu) {
    console.warn('Novu client not initialized - subscriber creation skipped')
    return { success: false, message: 'Novu not configured' }
  }
  
  try {
    const subscriber = await novu.subscribers.identify(userId, {
      email,
      firstName,
      lastName,
      phone,
      data: {
        userId,
      },
    })
    return subscriber
  } catch (error) {
    console.error('Novu subscriber error:', error)
    throw error
  }
}

// Update subscriber preferences
export async function updateSubscriberPreferences(subscriberId, preferences) {
  if (!novu) {
    console.warn('Novu client not initialized - preferences update skipped')
    return { success: false, message: 'Novu not configured' }
  }
  
  try {
    const result = await novu.subscribers.setPreference(subscriberId, preferences)
    return result
  } catch (error) {
    console.error('Novu preferences error:', error)
    throw error
  }
}

// Get subscriber preferences
export async function getSubscriberPreferences(subscriberId) {
  if (!novu) {
    console.warn('Novu client not initialized - returning default preferences')
    return { preferences: [] }
  }
  
  try {
    const preferences = await novu.subscribers.getPreference(subscriberId)
    return preferences
  } catch (error) {
    console.error('Novu get preferences error:', error)
    throw error
  }
}
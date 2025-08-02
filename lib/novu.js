import { Novu } from '@novu/node'

// Initialize Novu client
export const novu = new Novu(process.env.NOVU_API_KEY)

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
  try {
    const preferences = await novu.subscribers.getPreference(subscriberId)
    return preferences
  } catch (error) {
    console.error('Novu get preferences error:', error)
    throw error
  }
}
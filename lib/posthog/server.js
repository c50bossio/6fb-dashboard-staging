import { PostHog } from 'posthog-node'

let posthogClient = null

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(
      process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY,
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        flushAt: 1, // Flush events immediately in serverless environment
        flushInterval: 0, // Don't batch events
      }
    )
  }
  return posthogClient
}

export { EVENTS } from './client'

export async function trackServerEvent(distinctId, eventName, properties = {}) {
  const client = getPostHogClient()
  client.capture({
    distinctId,
    event: eventName,
    properties: {
      ...properties,
      $lib: 'node',
      source: 'server',
    },
  })
}

export async function identifyUser(userId, properties = {}) {
  const client = getPostHogClient()
  client.identify({
    distinctId: userId,
    properties,
  })
}

export async function setUserProperty(userId, properties = {}) {
  const client = getPostHogClient()
  client.capture({
    distinctId: userId,
    event: '$set',
    properties: {
      $set: properties,
    },
  })
}

export async function trackRevenue(userId, amount, properties = {}) {
  const client = getPostHogClient()
  client.capture({
    distinctId: userId,
    event: 'revenue',
    properties: {
      revenue: amount,
      ...properties,
    },
  })
}

export async function getFeatureFlag(userId, flagName) {
  const client = getPostHogClient()
  return await client.isFeatureEnabled(flagName, userId)
}

export async function getAllFeatureFlags(userId) {
  const client = getPostHogClient()
  return await client.getAllFlags(userId)
}

export async function shutdownPostHog() {
  const client = getPostHogClient()
  await client.shutdown()
}
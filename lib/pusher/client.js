'use client'

import PusherClient from 'pusher-js'

let pusherClient = null

export function getPusherClient() {
  if (!pusherClient && typeof window !== 'undefined') {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    })
    
    if (process.env.NODE_ENV === 'development') {
      PusherClient.logToConsole = true
    }
  }
  
  return pusherClient
}

export { CHANNELS, EVENTS } from './server'
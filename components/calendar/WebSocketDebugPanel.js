'use client'

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

export default function WebSocketDebugPanel() {
  const [status, setStatus] = useState('initializing')
  const [events, setEvents] = useState([])
  
  useEffect(() => {
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables')
      setStatus('error: missing env vars')
      return
    }
    
    
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    
    const channel = supabase
      .channel('debug-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings'
        }, 
        (payload) => {
          setEvents(prev => [...prev, {
            type: payload.eventType,
            time: new Date().toISOString()
          }].slice(-5))
        }
      )
      .subscribe((subscriptionStatus) => {
        setStatus(subscriptionStatus)
        
        if (typeof window !== 'undefined') {
          window.debugPanelStatus = subscriptionStatus
          window.debugPanelConnected = subscriptionStatus === 'SUBSCRIBED'
        }
      })
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  
  return (
    <div className="fixed bottom-20 right-4 bg-white border-2 border-olive-500 rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <h3 className="font-bold text-sm mb-2">WebSocket Debug Panel</h3>
      <div className="text-xs space-y-1">
        <div>
          Status: <span className={status === 'SUBSCRIBED' ? 'text-green-600' : 'text-amber-800'}>
            {status}
          </span>
        </div>
        <div>
          Events: {events.length > 0 ? (
            <ul className="mt-1">
              {events.map((e, i) => (
                <li key={i}>{e.type} at {new Date(e.time).toLocaleTimeString()}</li>
              ))}
            </ul>
          ) : 'None yet'}
        </div>
      </div>
    </div>
  )
}
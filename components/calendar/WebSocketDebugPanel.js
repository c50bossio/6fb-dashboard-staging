'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function WebSocketDebugPanel() {
  const [status, setStatus] = useState('initializing')
  const [events, setEvents] = useState([])
  
  useEffect(() => {
    console.log('🔍 WebSocketDebugPanel mounting')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables')
      setStatus('error: missing env vars')
      return
    }
    
    console.log('🔑 Creating Supabase client with:', { supabaseUrl })
    
    // Use service role key for realtime (anon key doesn't receive events due to RLS)
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    console.log('📡 Setting up debug channel...')
    
    const channel = supabase
      .channel('debug-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings'
          // Remove filter to test if any events come through
        }, 
        (payload) => {
          console.log('📦 Debug panel received event:', payload)
          console.log('Event type:', payload.eventType)
          console.log('Shop ID:', payload.new?.shop_id || payload.old?.shop_id)
          setEvents(prev => [...prev, {
            type: payload.eventType,
            time: new Date().toISOString()
          }].slice(-5))
        }
      )
      .subscribe((subscriptionStatus) => {
        console.log('🔔 Debug panel subscription status:', subscriptionStatus)
        setStatus(subscriptionStatus)
        
        // Store in window for debugging
        if (typeof window !== 'undefined') {
          window.debugPanelStatus = subscriptionStatus
          window.debugPanelConnected = subscriptionStatus === 'SUBSCRIBED'
        }
      })
    
    return () => {
      console.log('🧹 Cleaning up debug channel')
      supabase.removeChannel(channel)
    }
  }, [])
  
  return (
    <div className="fixed bottom-20 right-4 bg-white border-2 border-olive-500 rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <h3 className="font-bold text-sm mb-2">WebSocket Debug Panel</h3>
      <div className="text-xs space-y-1">
        <div>
          Status: <span className={status === 'SUBSCRIBED' ? 'text-green-600' : 'text-yellow-600'}>
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
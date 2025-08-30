'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export function useRealtimeAppointments(barberbarbershopId) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [stats, setStats] = useState({})
  const [log, setLog] = useState([])
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [retryTimer, setRetryTimer] = useState(null)
  
  if (typeof window !== 'undefined') {
    window.realtimeHookDebug = {
      called: true,
      barberbarbershopId,
      timestamp: new Date().toISOString()
    }
  }

  const refresh = async () => {
    if (!barberbarbershopId) return
    
    try {
      const response = await fetch('/api/calendar/appointments')
      const data = await response.json()
      
      if (data.appointments) {
        setAppointments(data.appointments)
        setLastUpdate(new Date().toISOString())
      }
      
      setLoading(false)
    } catch (err) {
      console.error('❌ Error fetching appointments:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!barberbarbershopId) {
      setLoading(false)
      return
    }

    if (typeof window !== 'undefined') {
      window.realtimeHookDebug = {
        ...window.realtimeHookDebug,
        useEffectRan: true,
        useEffectTimestamp: new Date().toISOString()
      }
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables')
      setError('Missing Supabase configuration')
      setLoading(false)
      return
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Initial fetch
    refresh()

    const channel = supabase
      .channel(`bookings-${barberbarbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'bookings',
          filter: `barberbarbershop_id=eq.${barberbarbershopId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setAppointments(prev => {
              const updated = prev.map(appointment => {
                if (appointment.id === payload.new.id) {
                  const isCancelled = payload.new.status === 'cancelled'

                  return {
                    ...appointment,
                    title: isCancelled 
                      ? `❌ ${appointment.extendedProps?.customer || 'Customer'} - ${appointment.extendedProps?.service || "Unknown Service"}`
                      : appointment.title.replace('❌ ', ''),
                    backgroundColor: isCancelled ? '#ef4444' : appointment.backgroundColor,
                    borderColor: isCancelled ? '#dc2626' : appointment.borderColor,
                    classNames: isCancelled ? ['cancelled-appointment'] : [],
                    extendedProps: {
                      ...appointment.extendedProps,
                      status: payload.new.status
                    }
                  }
                }
                return appointment
              })
              
              return updated
            })
            
            setLastUpdate(new Date().toISOString())
          }
          
          if (payload.eventType === 'INSERT') {
            refresh() // Refresh to get the new appointment with proper styling
          }
          
          if (payload.eventType === 'DELETE') {
            setAppointments(prev => prev.filter(apt => apt.id !== payload.old.id))
            setLastUpdate(new Date().toISOString())
          }
        }
      )
      .subscribe((status) => {
        console.log('🔄 Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setConnectionAttempts(0)
          setError(null)
          console.log('✅ Real-time connected successfully')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Real-time connection failed:', status)
          setIsConnected(false)
          
          // Implement retry with exponential backoff
          const attempts = connectionAttempts + 1
          setConnectionAttempts(attempts)
          
          if (attempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000)
            console.log(`⏳ Retrying connection in ${delay}ms (attempt ${attempts})`)
            
            const timer = setTimeout(() => {
              supabase.removeChannel(channel)
              // Re-subscribe will happen on next useEffect cycle
              setConnectionAttempts(attempts)
            }, delay)
            
            setRetryTimer(timer)
          } else {
            setError('Unable to establish real-time connection after 5 attempts')
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false)
          console.log('📡 Real-time connection closed')
        }
      })

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
      supabase.removeChannel(channel)
    }
  }, [barberbarbershopId])

  return {
    appointments,
    loading,
    error,
    isConnected,
    lastUpdate,
    stats,
    refresh,
    log,
    connectionAttempts,
    diagnostics: {
      subscriptionStatus: isConnected ? 'connected' : connectionAttempts > 0 ? 'retrying' : 'attempting'
    }
  }
}

// Export for backward compatibility
export default useRealtimeAppointments
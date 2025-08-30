'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export function useRealtimeAppointments(barbershopId) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [stats, setStats] = useState({})
  const [log, setLog] = useState([])
  
  if (typeof window !== 'undefined') {
    window.realtimeHookDebug = {
      called: true,
      barbershopId,
      timestamp: new Date().toISOString()
    }
  }

  const refresh = async () => {
    if (!barbershopId) return
    
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
    if (!barbershopId) {
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
      .channel(`bookings-${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'bookings',
          filter: `barbershop_id=eq.${barbershopId}`
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
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time connection failed')
          setIsConnected(false)
          setError('Real-time connection failed')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [barbershopId])

  return {
    appointments,
    loading,
    error,
    isConnected,
    lastUpdate,
    stats,
    refresh,
    log,
    connectionAttempts: 1,
    diagnostics: {
      subscriptionStatus: isConnected ? 'connected' : 'attempting'
    }
  }
}

// Export for backward compatibility
export default useRealtimeAppointments
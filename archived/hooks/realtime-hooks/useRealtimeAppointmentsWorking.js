'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export function useRealtimeAppointments(barbershopId) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  if (typeof window !== 'undefined') {
    window.realtimeHookDebug = {
      called: true,
      barbershopId,
      timestamp: new Date().toISOString()
    }
  }

  useEffect(() => {

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
    
    const fetchAppointments = async () => {
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

    fetchAppointments()

    const channel = supabase
      .channel(`bookings-${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${barbershopId}`
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
            
            fetchAppointments() // Refresh to get the new appointment with proper styling
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
    connectionAttempts: 1,
    diagnostics: {
      subscriptionStatus: isConnected ? 'connected' : 'attempting'
    }
  }
}
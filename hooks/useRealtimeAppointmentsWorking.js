'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export function useRealtimeAppointments(barbershopId) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  // Debug info
  if (typeof window !== 'undefined') {
    window.realtimeHookDebug = {
      called: true,
      barbershopId,
      timestamp: new Date().toISOString()
    }
  }

  useEffect(() => {
    console.log('🔥 WORKING HOOK: Starting real-time connection for shop:', barbershopId)
    
    // Store debug info
    if (typeof window !== 'undefined') {
      window.realtimeHookDebug = {
        ...window.realtimeHookDebug,
        useEffectRan: true,
        useEffectTimestamp: new Date().toISOString()
      }
    }
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('🔐 Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      url: supabaseUrl
    })
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables')
      setError('Missing Supabase configuration')
      setLoading(false)
      return
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Function to fetch appointments
    const fetchAppointments = async () => {
      try {
        console.log('📡 Fetching appointments for shop:', barbershopId)
        
        const response = await fetch('/api/calendar/appointments')
        const data = await response.json()
        
        if (data.appointments) {
          console.log('✅ Loaded', data.appointments.length, 'appointments')
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

    // Fetch initial data
    fetchAppointments()

    // Set up real-time subscription
    console.log('🔄 Setting up real-time subscription...')
    
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
          console.log('📡 Real-time event received:', {
            eventType: payload.eventType,
            table: payload.table,
            id: payload.new?.id || payload.old?.id,
            status: payload.new?.status || payload.old?.status
          })
          
          if (payload.eventType === 'UPDATE') {
            console.log('🔄 Processing UPDATE event for appointment:', payload.new?.id)
            
            // Update the appointment in our state
            setAppointments(prev => {
              const updated = prev.map(appointment => {
                if (appointment.id === payload.new.id) {
                  const isCancelled = payload.new.status === 'cancelled'
                  
                  console.log('✅ Updating appointment in real-time:', {
                    id: payload.new.id,
                    oldTitle: appointment.title,
                    newStatus: payload.new.status,
                    isCancelled
                  })
                  
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
            console.log('🎉 Real-time update completed!')
          }
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ New appointment added, refreshing...')
            fetchAppointments() // Refresh to get the new appointment with proper styling
          }
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ Appointment deleted, removing from state')
            setAppointments(prev => prev.filter(apt => apt.id !== payload.old.id))
            setLastUpdate(new Date().toISOString())
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time connection established')
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time connection failed')
          setIsConnected(false)
          setError('Real-time connection failed')
        }
      })

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up real-time subscription')
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
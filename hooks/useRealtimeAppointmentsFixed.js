'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export function useRealtimeAppointments(barbershopId) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [diagnostics, setDiagnostics] = useState({
    subscriptionStatus: 'initializing',
    channelStatus: null,
    supabaseConfigured: false,
    lastConnectionAttempt: null,
    errorHistory: [],
    eventCounts: { INSERT: 0, UPDATE: 0, DELETE: 0 }
  })

  useEffect(() => {
    const startTime = Date.now()
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('🔐 Initializing Supabase client in hook:', {
      url: supabaseUrl,
      hasKey: !!supabaseAnonKey,
      keyPrefix: supabaseAnonKey?.substring(0, 40) + '...'
    })
    
    setDiagnostics(prev => ({
      ...prev,
      subscriptionStatus: 'attempting',
      lastConnectionAttempt: new Date().toISOString(),
      supabaseConfigured: !!(supabaseUrl && supabaseAnonKey)
    }))
    setConnectionAttempts(prev => prev + 1)
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Supabase not configured')
      setLoading(false)
      setAppointments([])
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log('🔄 Initializing real-time connection for shop:', barbershopId)

    // Function to fetch appointments
    const fetchAppointments = async () => {
      try {
        console.log('📡 Fetching initial appointments...')
        
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            barbers:barber_id (*),
            services:service_id (*),
            customers:customer_id (*)
          `)
          .eq('shop_id', barbershopId)
          .order('start_time')
        
        if (error) throw error

        console.log('📡 Found', data?.length || 0, 'appointments')

        // Transform to FullCalendar format
        const events = data.map(booking => {
          const isCancelled = booking.status === 'cancelled'
          return {
            id: booking.id,
            resourceId: booking.barber_id,
            title: `${isCancelled ? '❌ ' : ''}${booking.customers?.name || booking.customer_name || 'Customer'} - ${booking.services?.name || booking.service_name || "Unknown Service"}`,
            start: booking.start_time,
            end: booking.end_time,
            backgroundColor: isCancelled ? '#ef4444' : (booking.barbers?.color || '#3b82f6'),
            borderColor: isCancelled ? '#dc2626' : (booking.barbers?.color || '#3b82f6'),
            classNames: isCancelled ? ['cancelled-appointment'] : [],
            extendedProps: {
              customer: booking.customers?.name || booking.customer_name,
              customerPhone: booking.customers?.phone || booking.customer_phone,
              customerEmail: booking.customers?.email || booking.customer_email,
              service: booking.services?.name || booking.service_name,
              service_id: booking.service_id,
              barber_id: booking.barber_id,
              duration: booking.services?.duration || booking.duration_minutes,
              price: booking.price || booking.services?.price,
              status: booking.status,
              notes: booking.notes,
              cancelled_at: booking.cancelled_at
            }
          }
        })

        setAppointments(events)
        setLoading(false)
        setDiagnostics(prev => ({ 
          ...prev, 
          subscriptionStatus: 'data_loaded',
          appointmentCount: events.length
        }))
        
      } catch (err) {
        console.error('❌ Error fetching appointments:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    // Common handler for real-time events
    const handleRealtimeEvent = async (eventType, payload) => {
      const eventTime = new Date().toISOString()
      console.log(`📡 Real-time ${eventType} event:`, {
        appointmentId: payload.new?.id || payload.old?.id,
        timestamp: eventTime
      })
      
      setLastUpdate(eventTime)
      setDiagnostics(prev => ({
        ...prev,
        eventCounts: {
          ...prev.eventCounts,
          [eventType]: (prev.eventCounts[eventType] || 0) + 1
        },
        lastEventReceived: eventTime,
        subscriptionStatus: 'active'
      }))
      
      if (eventType === 'INSERT' && payload.new) {
        // Fetch complete record for INSERT
        const { data: newBooking } = await supabase
          .from('bookings')
          .select(`
            *,
            barbers:barber_id (*),
            services:service_id (*),
            customers:customer_id (*)
          `)
          .eq('id', payload.new.id)
          .single()

        if (newBooking) {
          const isCancelled = newBooking.status === 'cancelled'
          const newEvent = {
            id: newBooking.id,
            resourceId: newBooking.barber_id,
            title: `${isCancelled ? '❌ ' : ''}${newBooking.customers?.name || newBooking.customer_name || 'Customer'} - ${newBooking.services?.name || newBooking.service_name || "Unknown Service"}`,
            start: newBooking.start_time,
            end: newBooking.end_time,
            backgroundColor: isCancelled ? '#ef4444' : (newBooking.barbers?.color || '#3b82f6'),
            borderColor: isCancelled ? '#dc2626' : (newBooking.barbers?.color || '#3b82f6'),
            classNames: isCancelled ? ['cancelled-appointment'] : [],
            extendedProps: {
              customer: newBooking.customers?.name || newBooking.customer_name,
              customerPhone: newBooking.customers?.phone || newBooking.customer_phone,
              customerEmail: newBooking.customers?.email || newBooking.customer_email,
              service: newBooking.services?.name || newBooking.service_name,
              service_id: newBooking.service_id,
              barber_id: newBooking.barber_id,
              duration: newBooking.services?.duration || newBooking.duration_minutes,
              price: newBooking.price || newBooking.services?.price,
              status: newBooking.status,
              notes: newBooking.notes
            }
          }
          
          setAppointments(prev => {
            const existingIndex = prev.findIndex(apt => apt.id === newEvent.id)
            if (existingIndex !== -1) {
              console.log('📡 Appointment exists, updating:', newEvent.id)
              const updated = [...prev]
              updated[existingIndex] = newEvent
              return updated
            }
            console.log('📡 Adding new appointment:', newEvent.id)
            return [...prev, newEvent]
          })
        }
      } else if (eventType === 'UPDATE' && payload.new) {
        // Fetch complete record for UPDATE
        const { data: updatedBooking } = await supabase
          .from('bookings')
          .select(`
            *,
            barbers:barber_id (*),
            services:service_id (*),
            customers:customer_id (*)
          `)
          .eq('id', payload.new.id)
          .single()

        if (updatedBooking) {
          const isCancelled = updatedBooking.status === 'cancelled'
          const updatedEvent = {
            id: updatedBooking.id,
            resourceId: updatedBooking.barber_id,
            title: `${isCancelled ? '❌ ' : ''}${updatedBooking.customers?.name || 'Customer'} - ${updatedBooking.services?.name || "Unknown Service"}`,
            start: updatedBooking.start_time,
            end: updatedBooking.end_time,
            backgroundColor: isCancelled ? '#ef4444' : (updatedBooking.barbers?.color || '#3b82f6'),
            borderColor: isCancelled ? '#dc2626' : (updatedBooking.barbers?.color || '#3b82f6'),
            classNames: isCancelled ? ['cancelled-appointment'] : [],
            extendedProps: {
              customer: updatedBooking.customers?.name,
              customerPhone: updatedBooking.customers?.phone,
              customerEmail: updatedBooking.customers?.email,
              service: updatedBooking.services?.name,
              service_id: updatedBooking.service_id,
              barber_id: updatedBooking.barber_id,
              duration: updatedBooking.services?.duration,
              price: updatedBooking.price || updatedBooking.services?.price,
              status: updatedBooking.status,
              notes: updatedBooking.notes
            }
          }
          setAppointments(prev => 
            prev.map(event => event.id === updatedEvent.id ? updatedEvent : event)
          )
        }
      } else if (eventType === 'DELETE' && payload.old) {
        const deletedId = payload.old.id
        console.log('📡 DELETE received for:', deletedId)
        
        // Only delete if the appointment exists in our current state
        // This ensures we only delete appointments from our shop
        setAppointments(prev => {
          const exists = prev.find(event => event.id === deletedId)
          if (exists) {
            const filtered = prev.filter(event => event.id !== deletedId)
            console.log('📡 Removed appointment from our shop. Count:', prev.length, '→', filtered.length)
            return filtered
          } else {
            console.log('📡 Ignoring DELETE - appointment not in our shop')
            return prev
          }
        })
      }
    }

    // Initial fetch
    fetchAppointments()

    // Set up realtime subscription with separate handlers for each event type
    console.log('📡 Setting up real-time subscription for shop:', barbershopId)
    
    const channel = supabase
      .channel(`bookings-${barbershopId}`)
      // INSERT events with filter
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${barbershopId}`
        },
        (payload) => handleRealtimeEvent('INSERT', payload)
      )
      // UPDATE events with filter
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${barbershopId}`
        },
        (payload) => handleRealtimeEvent('UPDATE', payload)
      )
      // DELETE events - Supabase doesn't include shop_id even with REPLICA IDENTITY FULL
      // So we track appointment IDs and only delete ones we know about
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          // Since shop_id isn't available in DELETE payload, we check if this appointment
          // exists in our current state (which means it belongs to our shop)
          const appointmentId = payload.old?.id
          if (appointmentId) {
            console.log('📡 DELETE event for appointment:', appointmentId)
            // We'll handle the delete since we can't filter by shop_id
            handleRealtimeEvent('DELETE', payload)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        
        setDiagnostics(prev => ({
          ...prev,
          channelStatus: status
        }))
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setDiagnostics(prev => ({
            ...prev,
            subscriptionStatus: 'connected',
            connectionTime: Date.now() - startTime
          }))
          console.log('✅ Real-time subscription established')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
          setError('Real-time connection failed')
        } else if (status === 'CLOSED') {
          setIsConnected(false)
        }
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up real-time subscription')
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [barbershopId])

  // Debug log periodically
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('📊 Real-time diagnostics:', {
        connected: isConnected,
        appointments: appointments.length,
        events: diagnostics.eventCounts
      })
    }, 30000)
    
    return () => clearInterval(interval)
  }, [isConnected, appointments.length, diagnostics.eventCounts])

  return { 
    appointments, 
    loading, 
    error, 
    isConnected, 
    lastUpdate,
    connectionAttempts,
    diagnostics,
    refetch: () => window.location.reload() 
  }
}
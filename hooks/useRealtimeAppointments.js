'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

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
    eventCounts: { INSERT: 0, UPDATE: 0, DELETE: 0 },
    shopIdMatches: { INSERT: 0, UPDATE: 0, DELETE: 0 },
    dataSourceBreakdown: { database: 0, mock: 0, optimistic: 0 },
    lastEvents: [],
    connectionHealth: 'unknown',
    appointmentHistory: []
  })

  useEffect(() => {
    const startTime = Date.now() // ✅ FIX: Define startTime for connection timing
    
    if (typeof window !== 'undefined') {
      window.useEffectRan = true
      window.useEffectTimestamp = new Date().toISOString()
      window.realtimeDebugSimple = {
        useEffectCalled: true,
        barbershopId,
        timestamp: new Date().toISOString()
      }
    }
    
    // // 
    
    if (typeof window !== 'undefined') {
      const debugInfo = {
        hookCalled: true,
        barbershopId,
        supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasSupabaseClient: !!supabase,
        timestamp: new Date().toISOString(),
        windowDefined: typeof window !== 'undefined'
      }
      
      localStorage.setItem('realtimeDebug', JSON.stringify(debugInfo))
      window.realtimeDebugInfo = debugInfo  // Also store on window for easy access
    }
    
    setDiagnostics(prev => ({
      ...prev,
      subscriptionStatus: 'attempting',
      lastConnectionAttempt: new Date().toISOString(),
      supabaseConfigured: !!supabase
    }))
    setConnectionAttempts(prev => prev + 1)
    
    if (!supabase) {
      // // 
      setLoading(false)
      setAppointments([])
      return
    }
    
    // // 

    const fetchAppointments = async () => {
      try {
        // // 
        
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

        // // 

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
        
        const dataSourceBreakdown = {
          database: events.filter(e => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.id)).length,
          mock: events.filter(e => e.id?.toString().startsWith('mock-') || e.extendedProps?.isMockData).length,
          optimistic: events.filter(e => e.id?.toString().includes('temp-')).length
        }
        
        setDiagnostics(prev => ({ 
          ...prev, 
          subscriptionStatus: 'data_loaded',
          appointmentCount: events.length,
          dataSourceBreakdown,
          appointmentHistory: [{
            action: 'initial_load',
            count: events.length,
            timestamp: new Date().toISOString(),
            breakdown: dataSourceBreakdown
          }, ...prev.appointmentHistory.slice(0, 4)] // Keep last 5 history entries
        }))
        
      } catch (err) {
        console.error('❌ Error fetching appointments:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    const handleRealtimeEvent = async (eventType, payload) => {
      const eventTime = new Date().toISOString()
      const appointmentId = payload.new?.id || payload.old?.id
      const shopId = payload.new?.shop_id || payload.old?.shop_id
      const isOurShop = shopId === barbershopId
      
      // // 
      
      setLastUpdate(eventTime)
      
      const eventRecord = {
        type: eventType,
        appointmentId,
        timestamp: eventTime,
        shopId,
        isOurShop,
        hasShopId: !!shopId,
        status: payload.new?.status || payload.old?.status
      }
      
      setDiagnostics(prev => ({
        ...prev,
        eventCounts: {
          ...prev.eventCounts,
          [eventType]: (prev.eventCounts[eventType] || 0) + 1
        },
        shopIdMatches: {
          ...prev.shopIdMatches,
          [eventType]: (prev.shopIdMatches[eventType] || 0) + (isOurShop ? 1 : 0)
        },
        lastEvents: [eventRecord, ...prev.lastEvents.slice(0, 9)], // Keep last 10 events
        lastEventReceived: eventTime,
        subscriptionStatus: 'active',
        connectionHealth: 'healthy'
      }))
      
      if (eventType === 'INSERT' && payload.new) {
        // // 
        
        if (payload.new.shop_id && payload.new.shop_id !== barbershopId) {
          // // 
          return
        }
        
        try {
          const { data: newBooking, error } = await supabase
            .from('bookings')
            .select(`
              *,
              barbers:barber_id (*),
              services:service_id (*),
              customers:customer_id (*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            console.error('📡 Error fetching INSERT data:', error)
            if (payload.new.shop_id === barbershopId) {
              // // 
              const fallbackEvent = {
                id: payload.new.id,
                resourceId: payload.new.barber_id,
                title: `${payload.new.customer_name || 'Customer'} - ${payload.new.service_name || "Unknown Service"}`,
                start: payload.new.start_time,
                end: payload.new.end_time,
                backgroundColor: '#3b82f6',
                borderColor: '#3b82f6',
                classNames: payload.new.status === 'cancelled' ? ['cancelled-appointment'] : [],
                extendedProps: {
                  customer: payload.new.customer_name,
                  service: payload.new.service_name,
                  status: payload.new.status,
                  notes: payload.new.notes
                }
              }
              
              setAppointments(prev => {
                if (!prev.find(apt => apt.id === fallbackEvent.id)) {
                  // // 
                  return [...prev, fallbackEvent]
                }
                return prev
              })
            }
            return
          }

          if (newBooking && newBooking.shop_id === barbershopId) {
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
                // // 
                const updated = [...prev]
                updated[existingIndex] = newEvent
                return updated
              }
              // // 
              return [...prev, newEvent]
            })
          } else {
            // // 
          }
        } catch (err) {
          console.error('📡 Unexpected error in INSERT handler:', err)
        }
      } else if (eventType === 'UPDATE' && payload.new) {
        if (typeof window !== 'undefined') {
          window.lastWebSocketUpdate = {
            timestamp: new Date().toISOString(),
            appointmentId: payload.new?.id,
            status: payload.new?.status,
            shopId: payload.new?.shop_id
          }
        }
        
        // // .toISOString(),
          payloadKeys: Object.keys(payload),
          newKeys: payload.new ? Object.keys(payload.new) : [],
          oldKeys: payload.old ? Object.keys(payload.old) : []
        })
        
        // // 
        
        if (payload.new.shop_id && payload.new.shop_id !== barbershopId) {
          return
        }
        
        setAppointments(prev => {
          
          const updated = prev.map(appointment => {
            if (appointment.id === payload.new.id) {
              const isCancelled = payload.new.status === 'cancelled'
              
              // // 
              
              const updatedAppointment = {
                ...appointment,
                title: isCancelled 
                  ? `❌ ${appointment.extendedProps?.customer || 'Customer'} - ${appointment.extendedProps?.service || "Unknown Service"}`
                  : appointment.title.replace('❌ ', ''),
                backgroundColor: isCancelled ? '#ef4444' : appointment.backgroundColor,
                borderColor: isCancelled ? '#dc2626' : appointment.borderColor,
                classNames: isCancelled ? ['cancelled-appointment'] : [],
                extendedProps: {
                  ...appointment.extendedProps,
                  status: payload.new.status,
                  notes: payload.new.notes || appointment.extendedProps.notes
                }
              }
              
              // // 
              
              return updatedAppointment
            }
            return appointment
          })

          return updated
        })
        
        setLastUpdate(new Date().toISOString())
      } else if (eventType === 'DELETE' && payload.old) {
        const deletedId = payload.old.id
        // // 
        
        if (payload.old.shop_id && payload.old.shop_id !== barbershopId) {
          // // 
          return
        }
        
        setAppointments(prev => {
          const existingAppointment = prev.find(event => event.id === deletedId)
          if (!existingAppointment) {
            // // 
            return prev
          }
          
          const isCancelled = existingAppointment.extendedProps?.status === 'cancelled'
          const hasShopConfirmation = payload.old.shop_id === barbershopId
          
          if (isCancelled || hasShopConfirmation || !payload.old.shop_id) {
            const filtered = prev.filter(event => event.id !== deletedId)
            // // 
            return filtered
          } else {
            // // 
            return prev
          }
        })
      }
    }

    fetchAppointments()

    // // 
    
    const channel = supabase
      .channel(`bookings-${barbershopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          // // .toISOString()
          })
          if (typeof window !== 'undefined') {
            window.lastAnyEvent = {
              eventType: payload.eventType,
              timestamp: new Date().toISOString()
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          if (payload.new?.shop_id === barbershopId) {
            handleRealtimeEvent('INSERT', payload)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          // // 
          if (payload.new?.shop_id === barbershopId) {
            handleRealtimeEvent('UPDATE', payload)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          const appointmentId = payload.old?.id
          if (appointmentId) {
            // // 
            handleRealtimeEvent('DELETE', payload)
          }
        }
      )
      .subscribe((status, error) => {
        const statusTimestamp = new Date().toISOString()
        // //  - startTime
        })
        
        if (typeof window !== 'undefined') {
          window.websocketStatus = {
            status,
            error,
            timestamp: statusTimestamp,
            channelName: `bookings-${barbershopId}`
          }
        }
        
        setDiagnostics(prev => ({
          ...prev,
          channelStatus: status,
          lastStatusUpdate: statusTimestamp
        }))
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setDiagnostics(prev => ({
            ...prev,
            subscriptionStatus: 'connected',
            connectionTime: Date.now() - startTime,
            connectedAt: statusTimestamp
          }))
          // // 
          // // 
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
          setError('Real-time connection failed')
          console.error('❌ WEBSOCKET ERROR:', { status, barbershopId, timestamp: statusTimestamp })
        } else if (status === 'CLOSED') {
          setIsConnected(false)
          console.warn('⚠️ WEBSOCKET CLOSED:', { barbershopId, timestamp: statusTimestamp })
        }
      })

    return () => {
      // // .toISOString(),
        hadChannel: !!channel
      })
      
      if (channel) {
        try {
          supabase.removeChannel(channel)
          // // 
        } catch (error) {
          console.error('❌ Error removing channel:', error)
        }
      } else {
        console.warn('⚠️ No channel to clean up')
      }
      
      setIsConnected(false)
      setDiagnostics(prev => ({
        ...prev,
        subscriptionStatus: 'disconnected',
        channelStatus: 'CLOSED'
      }))
    }
  }, [barbershopId])

  useEffect(() => {
    const interval = setInterval(() => {
      // // 
    }, 30000)
    
    return () => clearInterval(interval)
  }, [isConnected, appointments.length])
  
  useEffect(() => {
    // // .toISOString(),
      lastUpdate: lastUpdate
    })
  }, [appointments])

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
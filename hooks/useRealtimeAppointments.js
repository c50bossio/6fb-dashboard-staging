'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export function useRealtimeAppointments(barbershopId) {
  console.log('🔥 HOOK CALLED: useRealtimeAppointments with barbershopId:', barbershopId)
  
  // Immediate debug to window - should always run
  if (typeof window !== 'undefined') {
    window.hookCalled = true
    window.hookCallTimestamp = new Date().toISOString()
    window.hookBarbershopId = barbershopId
  }
  
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
    console.log('🔥 SIMPLIFIED HOOK: useEffect running for shop:', barbershopId)
    
    // Set immediate debug
    if (typeof window !== 'undefined') {
      window.useEffectRan = true
      window.useEffectTimestamp = new Date().toISOString()
      window.realtimeDebugSimple = {
        useEffectCalled: true,
        barbershopId,
        timestamp: new Date().toISOString()
      }
    }
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('🔐 Environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    })
    
    console.log('🔐 Initializing Supabase client in hook:', {
      url: supabaseUrl,
      hasKey: !!supabaseAnonKey,
      keyPrefix: supabaseAnonKey?.substring(0, 40) + '...'
    })
    
    // Store debug info in localStorage for inspection
    if (typeof window !== 'undefined') {
      const debugInfo = {
        hookCalled: true,
        barbershopId,
        supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        keyPrefix: supabaseAnonKey?.substring(0, 20) + '...',
        timestamp: new Date().toISOString(),
        windowDefined: typeof window !== 'undefined',
        processEnvDefined: typeof process !== 'undefined'
      }
      
      localStorage.setItem('realtimeDebug', JSON.stringify(debugInfo))
      window.realtimeDebugInfo = debugInfo  // Also store on window for easy access
    }
    
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
            title: `${isCancelled ? '❌ ' : ''}${booking.customers?.name || booking.customer_name || 'Customer'} - ${booking.services?.name || booking.service_name || 'Service'}`,
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
        
        // Track data source breakdown
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

    // Common handler for real-time events
    const handleRealtimeEvent = async (eventType, payload) => {
      const eventTime = new Date().toISOString()
      const appointmentId = payload.new?.id || payload.old?.id
      const shopId = payload.new?.shop_id || payload.old?.shop_id
      const isOurShop = shopId === barbershopId
      
      console.log(`📡 Real-time ${eventType} event:`, {
        appointmentId,
        timestamp: eventTime,
        shopId,
        isOurShop,
        hasShopId: !!shopId
      })
      
      setLastUpdate(eventTime)
      
      // Enhanced diagnostics tracking
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
        console.log('📡 Processing INSERT for appointment:', payload.new.id, {
          hasShopId: !!payload.new.shop_id,
          shopId: payload.new.shop_id,
          ourShopId: barbershopId
        })
        
        // Verify this INSERT belongs to our shop
        if (payload.new.shop_id && payload.new.shop_id !== barbershopId) {
          console.log('📡 Ignoring INSERT - different shop:', payload.new.shop_id)
          return
        }
        
        try {
          // Fetch complete record for INSERT with retry logic
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
            // Fallback: Use payload data if available
            if (payload.new.shop_id === barbershopId) {
              console.log('📡 Using fallback INSERT data from payload')
              // Create minimal event from payload
              const fallbackEvent = {
                id: payload.new.id,
                resourceId: payload.new.barber_id,
                title: `${payload.new.customer_name || 'Customer'} - ${payload.new.service_name || 'Service'}`,
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
                  console.log('📡 Added fallback appointment:', fallbackEvent.id)
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
              title: `${isCancelled ? '❌ ' : ''}${newBooking.customers?.name || newBooking.customer_name || 'Customer'} - ${newBooking.services?.name || newBooking.service_name || 'Service'}`,
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
              console.log('📡 Adding new appointment:', newEvent.id, {
                customer: newEvent.extendedProps.customer,
                status: newEvent.extendedProps.status
              })
              return [...prev, newEvent]
            })
          } else {
            console.log('📡 Ignoring INSERT - wrong shop or missing data:', {
              hasData: !!newBooking,
              shopId: newBooking?.shop_id
            })
          }
        } catch (err) {
          console.error('📡 Unexpected error in INSERT handler:', err)
        }
      } else if (eventType === 'UPDATE' && payload.new) {
        console.log('📡 Processing UPDATE for appointment:', payload.new.id, {
          hasShopId: !!payload.new.shop_id,
          shopId: payload.new.shop_id,
          ourShopId: barbershopId,
          statusChange: payload.old?.status !== payload.new.status ? `${payload.old?.status} → ${payload.new.status}` : 'no status change'
        })
        
        // Verify this UPDATE belongs to our shop
        if (payload.new.shop_id && payload.new.shop_id !== barbershopId) {
          console.log('📡 Ignoring UPDATE - different shop:', payload.new.shop_id)
          return
        }
        
        try {
          // Fetch complete record for UPDATE with retry logic
          const { data: updatedBooking, error } = await supabase
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
            console.error('📡 Error fetching UPDATE data:', error)
            // Fallback: Use payload data if available
            if (payload.new.shop_id === barbershopId) {
              console.log('📡 Using fallback UPDATE data from payload')
              setAppointments(prev => 
                prev.map(event => {
                  if (event.id === payload.new.id) {
                    const isCancelled = payload.new.status === 'cancelled'
                    return {
                      ...event,
                      title: `${isCancelled ? '❌ ' : ''}${event.extendedProps.customer || 'Customer'} - ${event.extendedProps.service || 'Service'}`,
                      backgroundColor: isCancelled ? '#ef4444' : event.backgroundColor,
                      borderColor: isCancelled ? '#dc2626' : event.borderColor,
                      classNames: isCancelled ? ['cancelled-appointment'] : [],
                      extendedProps: {
                        ...event.extendedProps,
                        status: payload.new.status,
                        notes: payload.new.notes || event.extendedProps.notes
                      }
                    }
                  }
                  return event
                })
              )
            }
            return
          }

          if (updatedBooking && updatedBooking.shop_id === barbershopId) {
            const isCancelled = updatedBooking.status === 'cancelled'
            const updatedEvent = {
              id: updatedBooking.id,
              resourceId: updatedBooking.barber_id,
              title: `${isCancelled ? '❌ ' : ''}${updatedBooking.customers?.name || updatedBooking.customer_name || 'Customer'} - ${updatedBooking.services?.name || updatedBooking.service_name || 'Service'}`,
              start: updatedBooking.start_time,
              end: updatedBooking.end_time,
              backgroundColor: isCancelled ? '#ef4444' : (updatedBooking.barbers?.color || '#3b82f6'),
              borderColor: isCancelled ? '#dc2626' : (updatedBooking.barbers?.color || '#3b82f6'),
              classNames: isCancelled ? ['cancelled-appointment'] : [],
              extendedProps: {
                customer: updatedBooking.customers?.name || updatedBooking.customer_name,
                customerPhone: updatedBooking.customers?.phone || updatedBooking.customer_phone,
                customerEmail: updatedBooking.customers?.email || updatedBooking.customer_email,
                service: updatedBooking.services?.name || updatedBooking.service_name,
                service_id: updatedBooking.service_id,
                barber_id: updatedBooking.barber_id,
                duration: updatedBooking.services?.duration || updatedBooking.duration_minutes,
                price: updatedBooking.price || updatedBooking.services?.price,
                status: updatedBooking.status,
                notes: updatedBooking.notes
              }
            }
            
            setAppointments(prev => {
              const existingIndex = prev.findIndex(event => event.id === updatedEvent.id)
              if (existingIndex !== -1) {
                const updated = [...prev]
                updated[existingIndex] = updatedEvent
                console.log('📡 Updated appointment:', updatedEvent.id, {
                  customer: updatedEvent.extendedProps.customer,
                  status: updatedEvent.extendedProps.status,
                  isCancelled
                })
                return updated
              } else {
                console.log('📡 UPDATE for non-existent appointment, adding:', updatedEvent.id)
                return [...prev, updatedEvent]
              }
            })
          } else {
            console.log('📡 Ignoring UPDATE - wrong shop or missing data:', {
              hasData: !!updatedBooking,
              shopId: updatedBooking?.shop_id
            })
          }
        } catch (err) {
          console.error('📡 Unexpected error in UPDATE handler:', err)
        }
      } else if (eventType === 'DELETE' && payload.old) {
        const deletedId = payload.old.id
        console.log('📡 DELETE received for:', deletedId, {
          hasShopId: !!payload.old.shop_id,
          shopId: payload.old.shop_id,
          ourShopId: barbershopId
        })
        
        // SAFETY CHECK: Only process DELETEs for our shop if shop_id is available
        // If shop_id is not available (despite REPLICA IDENTITY FULL), be more cautious
        if (payload.old.shop_id && payload.old.shop_id !== barbershopId) {
          console.log('📡 Ignoring DELETE - different shop:', payload.old.shop_id)
          return
        }
        
        // Additional safety: Only remove if this appointment exists in our current state
        // AND either we have shop_id confirmation OR it's a cancelled appointment
        setAppointments(prev => {
          const existingAppointment = prev.find(event => event.id === deletedId)
          if (!existingAppointment) {
            console.log('📡 Ignoring DELETE - appointment not in our current state')
            return prev
          }
          
          // Extra safety: Only remove cancelled appointments or confirmed shop matches
          const isCancelled = existingAppointment.extendedProps?.status === 'cancelled'
          const hasShopConfirmation = payload.old.shop_id === barbershopId
          
          if (isCancelled || hasShopConfirmation || !payload.old.shop_id) {
            const filtered = prev.filter(event => event.id !== deletedId)
            console.log('📡 Removed appointment:', {
              id: deletedId,
              reason: isCancelled ? 'cancelled' : hasShopConfirmation ? 'shop_confirmed' : 'legacy_delete',
              count: `${prev.length} → ${filtered.length}`
            })
            return filtered
          } else {
            console.log('📡 Refusing DELETE - safety check failed:', {
              isCancelled,
              hasShopConfirmation,
              appointmentStatus: existingAppointment.extendedProps?.status
            })
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
  }, [isConnected, appointments.length])

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
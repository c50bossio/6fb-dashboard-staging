'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

let supabaseClient = null

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('🔑 V2 Creating Supabase client with:', { 
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey 
  })
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ V2: Supabase environment variables missing')
    return null
  }
  
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
  
  console.log('✅ V2: Supabase client created')
  return client
}

export function useRealtimeAppointmentsV2(shopId) {
  console.log('🚀 useRealtimeAppointmentsV2 HOOK CALLED with shopId:', shopId)
  
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [stats, setStats] = useState({
    inserts: 0,
    updates: 0,
    deletes: 0,
    connected: false
  })
  
  const channelRef = useRef(null)
  const supabaseRef = useRef(null)
  
  const log = useCallback((message, data = {}) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] 🔄 WebSocket V2: ${message}`, data)
    
    if (typeof window !== 'undefined') {
      if (!window.websocketLogs) {
        window.websocketLogs = []
      }
      window.websocketLogs.push({ timestamp, message, data })
      if (window.websocketLogs.length > 50) {
        window.websocketLogs.shift()
      }
    }
  }, [])
  
  const transformToEvent = useCallback((booking) => {
    const isCancelled = booking.status === 'cancelled'
    
    return {
      id: booking.id,
      resourceId: booking.barber_id,
      title: `${isCancelled ? '❌ ' : ''}${booking.customer_name || 'Customer'} - ${booking.service_name || "Unknown Service"}`,
      start: booking.start_time,
      end: booking.end_time,
      backgroundColor: isCancelled ? '#ef4444' : '#3b82f6',
      borderColor: isCancelled ? '#dc2626' : '#3b82f6',
      classNames: isCancelled ? ['cancelled-appointment'] : [],
      extendedProps: {
        customer: booking.customer_name,
        customerPhone: booking.customer_phone,
        customerEmail: booking.customer_email,
        service: booking.service_name,
        service_id: booking.service_id,
        barber_id: booking.barber_id,
        duration: booking.duration_minutes,
        price: booking.price,
        status: booking.status,
        notes: booking.notes,
        shop_id: booking.shop_id
      }
    }
  }, [])
  
  const fetchAppointments = useCallback(async (supabase) => {
    try {
      log('Fetching appointments for shop', { shopId })
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('shop_id', shopId)
        .order('start_time', { ascending: true })
      
      if (error) throw error
      
      const events = data.map(transformToEvent)
      setAppointments(events)
      setLoading(false)
      
      log('Initial appointments loaded', { 
        count: events.length,
        cancelled: events.filter(e => e.extendedProps?.status === 'cancelled').length
      })
      
      return events
    } catch (err) {
      console.error('❌ Error fetching appointments:', err)
      setError(err.message)
      setLoading(false)
      return []
    }
  }, [shopId, transformToEvent, log])
  
  const handleRealtimeEvent = useCallback((eventType, payload) => {
    const eventData = payload.new || payload.old
    
    log(`Realtime ${eventType} event`, {
      id: eventData?.id,
      shop_id: eventData?.shop_id,
      status: eventData?.status
    })
    
    setStats(prev => ({
      ...prev,
      [eventType.toLowerCase() + 's']: prev[eventType.toLowerCase() + 's'] + 1
    }))
    
    setLastUpdate(new Date().toISOString())
    
    switch (eventType) {
      case 'INSERT':
        if (payload.new && payload.new.shop_id === shopId) {
          const newEvent = transformToEvent(payload.new)
          setAppointments(prev => {
            if (prev.find(apt => apt.id === newEvent.id)) {
              log('Skipping duplicate INSERT', { id: newEvent.id })
              return prev
            }
            log('Adding new appointment', { id: newEvent.id, title: newEvent.title })
            return [...prev, newEvent]
          })
        }
        break
        
      case 'UPDATE':
        if (payload.new && payload.new.shop_id === shopId) {
          const updatedEvent = transformToEvent(payload.new)
          setAppointments(prev => {
            const index = prev.findIndex(apt => apt.id === updatedEvent.id)
            if (index === -1) {
              log('UPDATE for unknown appointment, adding', { id: updatedEvent.id })
              return [...prev, updatedEvent]
            }
            const updated = [...prev]
            updated[index] = updatedEvent
            log('Updated appointment', { 
              id: updatedEvent.id, 
              title: updatedEvent.title,
              status: updatedEvent.extendedProps?.status
            })
            return updated
          })
        }
        break
        
      case 'DELETE':
        if (payload.old) {
          const deletedId = payload.old.id
          setAppointments(prev => {
            const filtered = prev.filter(apt => apt.id !== deletedId)
            if (filtered.length < prev.length) {
              log('Removed appointment', { id: deletedId })
            }
            return filtered
          })
        }
        break
    }
  }, [shopId, transformToEvent, log])
  
  useEffect(() => {
    console.log('🔄 V2 useEffect running for shopId:', shopId)
    
    if (typeof window !== 'undefined') {
      window.v2HookRunning = true
      window.v2ShopId = shopId
      window.v2Timestamp = new Date().toISOString()
    }
    
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.error('❌ V2: Supabase client initialization failed')
      setError('Supabase client initialization failed')
      setLoading(false)
      return
    }
    
    supabaseRef.current = supabase
    
    log('Initializing WebSocket V2', { shopId })
    
    fetchAppointments(supabase)
    
    if (channelRef.current) {
      log('Cleaning up existing channel')
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    
    const channelName = `bookings-v2-${shopId}`
    log('Creating channel', { channelName })
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${shopId}`
        },
        (payload) => {
          log('Raw payload received', {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            hasNew: !!payload.new,
            hasOld: !!payload.old
          })
          
          handleRealtimeEvent(payload.eventType, payload)
        }
      )
      .subscribe((status, err) => {
        console.log('🔔 V2 SUBSCRIPTION STATUS:', status, 'Error:', err)
        log('Channel subscription status', { status, error: err })
        
        if (typeof window !== 'undefined') {
          if (!window.v2SubscriptionHistory) window.v2SubscriptionHistory = []
          window.v2SubscriptionHistory.push({ 
            status, 
            error: err, 
            timestamp: new Date().toISOString() 
          })
          window.v2LastStatus = status
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ V2 CONNECTED! Setting isConnected to true')
          setIsConnected(true)
          setStats(prev => ({ ...prev, connected: true }))
          log('✅ WebSocket connected successfully!')
          
          if (typeof window !== 'undefined') {
            window.websocketV2Connected = true
            window.websocketV2Status = status
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ V2 CONNECTION FAILED:', status, err)
          setIsConnected(false)
          setStats(prev => ({ ...prev, connected: false }))
          setError(`WebSocket error: ${status}`)
          log('❌ WebSocket connection failed', { status, error: err })
        } else if (status === 'CLOSED') {
          console.log('⚠️ V2 CONNECTION CLOSED')
          setIsConnected(false)
          setStats(prev => ({ ...prev, connected: false }))
          log('WebSocket connection closed')
        }
      })
    
    channelRef.current = channel
    
    return () => {
      log('Cleaning up WebSocket V2')
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [shopId, fetchAppointments, handleRealtimeEvent, log])
  
  const refresh = useCallback(async () => {
    if (supabaseRef.current) {
      log('Manual refresh triggered')
      await fetchAppointments(supabaseRef.current)
    }
  }, [fetchAppointments, log])
  
  return {
    appointments,
    loading,
    error,
    isConnected,
    lastUpdate,
    stats,
    refresh,
    log
  }
}
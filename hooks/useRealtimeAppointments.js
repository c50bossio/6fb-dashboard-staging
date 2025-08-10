'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function useRealtimeAppointments(barbershopId) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    if (!supabase) {
      console.log('Supabase not configured, skipping realtime updates')
      setLoading(false)
      return
    }

    // Function to fetch appointments
    const fetchAppointments = async () => {
      try {
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

        // Transform to FullCalendar format
        const events = data.map(booking => ({
          id: booking.id,
          resourceId: booking.barber_id,
          title: `${booking.customers?.name || 'Customer'} - ${booking.services?.name || 'Service'}`,
          start: booking.start_time,
          end: booking.end_time,
          backgroundColor: booking.barbers?.color || '#3b82f6',
          borderColor: booking.barbers?.color || '#3b82f6',
          extendedProps: {
            customer: booking.customers?.name,
            customerPhone: booking.customers?.phone,
            customerEmail: booking.customers?.email,
            service: booking.services?.name,
            service_id: booking.service_id,
            barber_id: booking.barber_id,
            duration: booking.services?.duration,
            price: booking.price || booking.services?.price,
            status: booking.status,
            notes: booking.notes
          }
        }))

        setAppointments(events)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching appointments:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    // Initial fetch
    fetchAppointments()

    // Set up realtime subscription
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${barbershopId}`
        },
        async (payload) => {
          console.log('📡 Realtime update received:', payload)
          setLastUpdate(new Date().toISOString())
          
          switch (payload.eventType) {
            case 'INSERT':
              // Fetch the complete record with relations
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
                const newEvent = {
                  id: newBooking.id,
                  resourceId: newBooking.barber_id,
                  title: `${newBooking.customers?.name || 'Customer'} - ${newBooking.services?.name || 'Service'}`,
                  start: newBooking.start_time,
                  end: newBooking.end_time,
                  backgroundColor: newBooking.barbers?.color || '#3b82f6',
                  borderColor: newBooking.barbers?.color || '#3b82f6',
                  extendedProps: {
                    customer: newBooking.customers?.name,
                    customerPhone: newBooking.customers?.phone,
                    customerEmail: newBooking.customers?.email,
                    service: newBooking.services?.name,
                    service_id: newBooking.service_id,
                    barber_id: newBooking.barber_id,
                    duration: newBooking.services?.duration,
                    price: newBooking.price || newBooking.services?.price,
                    status: newBooking.status,
                    notes: newBooking.notes
                  }
                }
                setAppointments(prev => [...prev, newEvent])
              }
              break

            case 'UPDATE':
              // Fetch the updated record with relations
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
                const updatedEvent = {
                  id: updatedBooking.id,
                  resourceId: updatedBooking.barber_id,
                  title: `${updatedBooking.customers?.name || 'Customer'} - ${updatedBooking.services?.name || 'Service'}`,
                  start: updatedBooking.start_time,
                  end: updatedBooking.end_time,
                  backgroundColor: updatedBooking.barbers?.color || '#3b82f6',
                  borderColor: updatedBooking.barbers?.color || '#3b82f6',
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
              break

            case 'DELETE':
              setAppointments(prev => prev.filter(event => event.id !== payload.old.id))
              break
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime connection status:', status)
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setLastUpdate(new Date().toISOString())
          console.log('✅ Real-time subscription established')
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setError('Real-time connection failed')
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
          setError('Real-time connection timed out')
        }
      })

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [barbershopId])

  return { 
    appointments, 
    loading, 
    error, 
    isConnected, 
    lastUpdate, 
    refetch: () => window.location.reload() 
  }
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '../lib/supabase/client'

export function useRealtime(channelName, barbershopId = 'demo-shop-001') {
  const [data, setData] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  const supabase = createClient()
  const intervalRef = useRef(null)
  const channelRef = useRef(null)

  const fetchRealtimeData = useCallback(async () => {
    try {
      let realtimeData = {}
      
      if (channelName === 'metrics' || channelName === 'dashboard') {
        const [metricsResponse, businessResponse] = await Promise.all([
          fetch(`/api/realtime/metrics?barbershop_id=${barbershopId}`).then(r => r.json()),
          fetch(`/api/dashboard/metrics?barbershop_id=${barbershopId}`).then(r => r.json())
        ])
        
        const metrics = metricsResponse || {}
        const businessMetrics = businessResponse || {}
        
        realtimeData = {
          ...metrics,
          ...businessMetrics,
          timestamp: new Date().toISOString(),
          session_id: `db-session-${barbershopId}`
        }
      } else if (channelName === 'appointments') {
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id, start_time, end_time, status, customer_name, service_name')
          .eq('barbershop_id', barbershopId)
          .gte('start_time', new Date().toISOString().split('T')[0])
          .order('start_time', { ascending: true })
        
        realtimeData = {
          appointments: appointments || [],
          total_appointments: appointments?.length || 0,
          timestamp: new Date().toISOString()
        }
      } else if (channelName === 'notifications') {
        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10)
        
        realtimeData = {
          notifications: notifications || [],
          unread_count: notifications?.length || 0,
          timestamp: new Date().toISOString()
        }
      }
      
      setData(realtimeData)
      setLastUpdate(new Date())
      setError(null)
      
      console.log(`📡 Realtime data updated for ${channelName}:`, Object.keys(realtimeData))
      
    } catch (err) {
      console.error('Realtime fetch error:', err)
      setError(err.message)
    }
  }, [channelName, barbershopId, supabase])

  const setupRealtimeSubscription = useCallback(() => {
    if (!barbershopId) return

    try {
      let tableName = 'appointments' // Default table
      
      if (channelName === 'metrics' || channelName === 'dashboard') {
        tableName = 'business_metrics'
      } else if (channelName === 'notifications') {
        tableName = 'notifications'
      } else if (channelName === 'appointments') {
        tableName = 'appointments'
      }
      
      const channel = supabase
        .channel(`${channelName}-${barbershopId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all changes
            schema: 'public',
            table: tableName,
            filter: `barbershop_id=eq.${barbershopId}`
          },
          (payload) => {
            console.log(`📡 Database change detected in ${tableName}:`, payload.eventType)
            fetchRealtimeData()
          }
        )
        .subscribe((status) => {
          console.log(`📡 Realtime subscription status: ${status}`)
          setIsConnected(status === 'SUBSCRIBED')
        })
      
      channelRef.current = channel
      
    } catch (err) {
      console.error('Failed to setup realtime subscription:', err)
      setError(err.message)
      setIsConnected(false)
    }
  }, [channelName, barbershopId, supabase, fetchRealtimeData])

  useEffect(() => {
    console.log(`📡 Initializing realtime connection for ${channelName}`)
    
    fetchRealtimeData()
    
    setupRealtimeSubscription()
    
    intervalRef.current = setInterval(fetchRealtimeData, 30000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [fetchRealtimeData, setupRealtimeSubscription])

  const refresh = useCallback(() => {
    console.log(`🔄 Manual refresh requested for ${channelName}`)
    fetchRealtimeData()
  }, [fetchRealtimeData])

  const sendData = useCallback(async (payload) => {
    try {
      let insertData = { ...payload, barbershop_id: barbershopId }
      
      if (channelName === 'notifications') {
        const { error } = await supabase
          .from('notifications')
          .insert([insertData])
        
        if (error) throw error
        console.log(`📤 Sent notification to ${channelName}`)
      } else {
        console.log(`📤 Send not implemented for ${channelName}`)
      }
      
    } catch (err) {
      console.error('Failed to send data:', err)
      setError(err.message)
    }
  }, [channelName, barbershopId, supabase])

  return {
    data,
    isConnected,
    error,
    lastUpdate,
    refresh,
    sendData
  }
}

export function useRealtimeMetrics(barbershopId) {
  return useRealtime('metrics', barbershopId)
}

export function useRealtimeAppointments(barbershopId) {
  return useRealtime('appointments', barbershopId)
}

export function useRealtimeNotifications(barbershopId) {
  return useRealtime('notifications', barbershopId)
}

export async function checkRealtimeSupport() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('business_metrics')
      .select('id')
      .limit(1)
    
    if (error) throw error
    
    return {
      supported: true,
      database: 'connected',
      realtime: 'available'
    }
    
  } catch (error) {
    console.error('Realtime support check failed:', error)
    return {
      supported: false,
      error: error.message
    }
  }
}

export default useRealtime
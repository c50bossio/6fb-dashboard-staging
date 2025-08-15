/**
 * Real-time Dashboard Hook
 * Connects to SSE endpoint for live dashboard updates
 */

import { useState, useEffect, useRef } from 'react';

export function useRealtimeDashboard(barbershopId = 'demo-shop-001', enabled = true) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    console.log('🔄 Starting real-time dashboard connection...');
    
    const eventSource = new EventSource(`/api/realtime/dashboard?barbershop_id=${barbershopId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ Real-time dashboard connected');
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        
        switch (eventData.type) {
          case 'connected':
            console.log('📡 Dashboard stream connected:', eventData.message);
            setConnected(true);
            break;
            
          case 'dashboard_update':
            console.log('📊 Dashboard update received:', eventData.timestamp);
            setData(eventData.data);
            setLastUpdate(new Date(eventData.timestamp));
            break;
            
          case 'heartbeat':
            break;
            
          case 'error':
            console.error('❌ Dashboard stream error:', eventData.error);
            setError(eventData.error);
            break;
            
          default:
            console.log('📨 Unknown dashboard event:', eventData.type);
        }
      } catch (err) {
        console.error('Failed to parse dashboard event:', err);
        setError('Failed to parse update data');
      }
    };

    eventSource.onerror = (err) => {
      console.error('💥 Dashboard EventSource error:', err);
      setConnected(false);
      setError('Connection error');
      
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          console.log('🔄 Attempting to reconnect dashboard stream...');
        }
      }, 5000);
    };

    return () => {
      console.log('🔌 Closing real-time dashboard connection');
      eventSource.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [barbershopId, enabled]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
      console.log('🛑 Real-time dashboard manually disconnected');
    }
  };

  const reconnect = () => {
    disconnect();
  };

  return {
    data,
    connected,
    lastUpdate,
    error,
    disconnect,
    reconnect,
    connectionInfo: {
      status: connected ? 'connected' : 'disconnected',
      lastUpdate: lastUpdate ? lastUpdate.toLocaleTimeString() : null,
      error: error
    }
  };
}
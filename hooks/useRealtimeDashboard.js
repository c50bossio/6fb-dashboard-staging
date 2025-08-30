/**
 * Real-time Dashboard Hook
 * Connects to SSE endpoint for live dashboard updates
 */

import { useState, useEffect, useRef } from 'react';

export function useRealtimeDashboard(barberbarbershopId, enabled = true) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const eventSource = new EventSource(`/api/realtime/dashboard?barberbarbershop_id=${barberbarbershopId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        
        switch (eventData.type) {
          case 'connected':
            
            setConnected(true);
            break;
            
          case 'dashboard_update':
            
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
          
        }
      }, 5000);
    };

    return () => {
      
      eventSource.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [barberbarbershopId, enabled]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
      
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
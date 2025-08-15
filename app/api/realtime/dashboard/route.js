export const runtime = 'edge'

/**
 * Real-time Dashboard Updates using Server-Sent Events (SSE)
 * Provides live updates for dashboard metrics and performance data
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const barbershopId = searchParams.get('barbershop_id') || 'demo-shop-001';
  
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  };

  const stream = new ReadableStream({
    start(controller) {
      console.log('🔄 Starting real-time dashboard stream for:', barbershopId);
      
      const initEvent = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Real-time dashboard connected'
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(initEvent));

      const interval = setInterval(async () => {
        try {
          const analyticsResponse = await fetch(`http://localhost:9999/api/analytics/live-data?barbershop_id=${barbershopId}`);
          const analyticsData = await analyticsResponse.json();
          
          const cacheResponse = await fetch('http://localhost:9999/api/cache/stats');
          const cacheData = await cacheResponse.json();

          const updateEvent = {
            type: 'dashboard_update',
            timestamp: new Date().toISOString(),
            data: {
              analytics: analyticsData.success ? {
                revenue: analyticsData.data.total_revenue,
                customers: analyticsData.data.total_customers,
                appointments: analyticsData.data.total_appointments,
                cached: analyticsData.meta?.cache_info?.hit || false
              } : null,
              performance: {
                cache_hit_rate: cacheData.success ? cacheData.cache_performance.hit_rate : '0%',
                cache_efficiency: cacheData.success ? cacheData.cache_performance.efficiency_rating : 'unknown',
                last_update: new Date().toISOString()
              }
            }
          };

          const eventData = `data: ${JSON.stringify(updateEvent)}\n\n`;
          controller.enqueue(new TextEncoder().encode(eventData));
          
        } catch (error) {
          console.error('Real-time update error:', error);
          
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            timestamp: new Date().toISOString(),
            error: 'Failed to fetch update data'
          })}\n\n`;
          
          controller.enqueue(new TextEncoder().encode(errorEvent));
        }
      }, 15000); // Update every 15 seconds

      const heartbeat = setInterval(() => {
        const heartbeatEvent = `data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`;
        
        controller.enqueue(new TextEncoder().encode(heartbeatEvent));
      }, 30000); // Heartbeat every 30 seconds

      request.signal?.addEventListener('abort', () => {
        console.log('🔌 Real-time dashboard client disconnected');
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });
    }
  });

  return new Response(stream, { headers });
}
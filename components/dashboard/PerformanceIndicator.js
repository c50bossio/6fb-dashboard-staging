/**
 * Real-time Performance Indicator
 * Shows cache performance, API response times, and system health
 */

'use client';

import { useState, useEffect } from 'react';
import {
  BoltIcon,
  ClockIcon,
  ServerIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function PerformanceIndicator({ className = '' }) {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
    
    // Update every 30 seconds
    const interval = setInterval(loadPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceData = async () => {
    try {
      // Load cache statistics
      const cacheResponse = await fetch('/api/cache/stats?detailed=true');
      const cacheData = await cacheResponse.json();

      // Test API response time
      const startTime = Date.now();
      const apiResponse = await fetch('/api/analytics/live-data?barbershop_id=demo-shop-001');
      const apiResponseTime = Date.now() - startTime;
      const apiData = await apiResponse.json();

      setPerformanceData({
        cache: cacheData.success ? cacheData : null,
        api: {
          responseTime: apiResponseTime,
          cached: apiData.meta?.cache_info?.hit || false,
          success: apiResponse.ok
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Performance data load error:', error);
      setPerformanceData({
        error: error.message,
        timestamp: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-gray-400 animate-spin" />
          <span className="text-sm text-gray-600">Loading performance metrics...</span>
        </div>
      </div>
    );
  }

  if (performanceData?.error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <span className="text-sm text-red-600">Performance monitoring unavailable</span>
        </div>
      </div>
    );
  }

  const cachePerf = performanceData?.cache?.cache_performance;
  const apiPerf = performanceData?.api;

  // Determine overall performance status
  const getPerformanceStatus = () => {
    const cacheHitRate = cachePerf ? parseInt(cachePerf.hit_rate) : 0;
    const apiSpeed = apiPerf?.responseTime || 1000;
    
    if (cacheHitRate >= 70 && apiSpeed <= 300) return 'excellent';
    if (cacheHitRate >= 50 && apiSpeed <= 500) return 'good';
    if (cacheHitRate >= 30 && apiSpeed <= 1000) return 'fair';
    return 'poor';
  };

  const performanceStatus = getPerformanceStatus();
  const statusColors = {
    excellent: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-olive-600 bg-olive-50 border-olive-200',
    fair: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    poor: 'text-red-600 bg-red-50 border-red-200'
  };

  const statusIcons = {
    excellent: CheckCircleIcon,
    good: CheckCircleIcon,
    fair: ExclamationTriangleIcon,
    poor: ExclamationTriangleIcon
  };

  const StatusIcon = statusIcons[performanceStatus];

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusColors[performanceStatus]}`}>
            <StatusIcon className="h-4 w-4" />
            <span className="capitalize">{performanceStatus}</span>
          </div>
          
          <div className="text-xs text-gray-500">
            System Performance
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* Cache Performance */}
          {cachePerf && (
            <div className="flex items-center gap-1">
              <ServerIcon className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">
                {cachePerf.hit_rate}
              </span>
              <span className="text-gray-500">cache</span>
            </div>
          )}
          
          {/* API Response Time */}
          {apiPerf && (
            <div className="flex items-center gap-1">
              <BoltIcon className={`h-4 w-4 ${apiPerf.responseTime <= 300 ? 'text-green-400' : apiPerf.responseTime <= 500 ? 'text-yellow-400' : 'text-red-400'}`} />
              <span className="font-medium text-gray-900">
                {apiPerf.responseTime}ms
              </span>
              {apiPerf.cached && (
                <span className="text-xs text-green-600 bg-green-100 px-1 rounded">cached</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detailed metrics on hover */}
      {performanceData?.cache && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-gray-500">Cache Hits</div>
              <div className="font-medium text-gray-900">
                {cachePerf.total_hits}/{cachePerf.total_requests}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Storage</div>
              <div className="font-medium text-gray-900">
                {performanceData.cache.cache_storage.utilization}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Updated</div>
              <div className="font-medium text-gray-900">
                {performanceData.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/**
 * Real-time Connection Indicator
 * Shows live connection status and last update time
 */

'use client';

import { useRealtimeDashboard } from '../../hooks/useRealtimeDashboard';
import {
  WifiIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function RealtimeIndicator({ barbershopId, className = '' }) {
  const { connected, lastUpdate, error, data, reconnect, connectionInfo } = useRealtimeDashboard(barbershopId, true);

  const getStatusColor = () => {
    if (error) return 'text-red-600 bg-red-50 border-red-200';
    if (connected) return 'text-green-600 bg-green-50 border-green-200';
    return 'text-amber-800 bg-yellow-50 border-yellow-200';
  };

  const getStatusIcon = () => {
    if (error) return ExclamationTriangleIcon;
    if (connected) return CheckCircleIcon;
    return WifiIcon;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
        <StatusIcon className="h-3 w-3" />
        <span>
          {error ? 'Error' : connected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {/* Last Update Time */}
      {lastUpdate && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ClockIcon className="h-3 w-3" />
          <span>{lastUpdate.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Real-time Data Preview */}
      {data?.analytics && (
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <span className="font-medium">${(data.analytics.revenue || 0).toLocaleString()}</span>
            <span>revenue</span>
            {data.analytics.cached && (
              <span className="text-green-600 bg-green-100 px-1 rounded">cached</span>
            )}
          </div>
        </div>
      )}

      {/* Reconnect Button (if error) */}
      {error && (
        <button
          onClick={reconnect}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          <ArrowPathIcon className="h-3 w-3" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
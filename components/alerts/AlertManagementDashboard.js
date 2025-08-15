'use client';

import { 
  BellIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const AlertManagementDashboard = ({ 
  barbershopId, 
  userId, 
  className = '' 
}) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filters, setFilters] = useState({
    priority: 'all',
    category: 'all',
    status: 'active'
  });
  const [groupedView, setGroupedView] = useState(true);
  const [preferences, setPreferences] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  
  const wsRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        barbershop_id: barbershopId,
        user_id: userId,
        limit: '50'
      });
      
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.category !== 'all') params.append('category', filters.category);
      
      const response = await fetch(`/api/alerts/active?${params}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data.alerts || []);
        setAnalytics(data.data.summary || null);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [barbershopId, userId, filters]);
  
  const fetchPreferences = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        barbershop_id: barbershopId,
        user_id: userId
      });
      
      const response = await fetch(`/api/alerts/configure?${params}`);
      if (!response.ok) throw new Error('Failed to fetch preferences');
      
      const data = await response.json();
      if (data.success) {
        setPreferences(data.data.user_preferences || null);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
  }, [barbershopId, userId]);
  
  const initializeRealTime = useCallback(() => {
    if (!realTimeEnabled || !window.Pusher) return;
    
    try {
      const pusher = new window.Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
      });
      
      const channel = pusher.subscribe(`dashboard-${userId}`);
      
      channel.bind('alert-created', (data) => {
        if (data.alert && data.alert.barbershop_id === barbershopId) {
          setAlerts(prev => [data.alert, ...prev]);
          showRealTimeNotification('New Alert', data.alert.title, 'info');
        }
      });
      
      channel.bind('alert-updated', (data) => {
        if (data.alert_id) {
          setAlerts(prev => prev.map(alert => 
            alert.alert_id === data.alert_id 
              ? { ...alert, ...data.updates }
              : alert
          ));
        }
      });
      
      channel.bind('metrics-update', (data) => {
        if (data.metrics) {
          setAnalytics(prev => ({ ...prev, ...data.metrics }));
        }
      });
      
      wsRef.current = pusher;
      
    } catch (err) {
      console.error('Real-time connection failed:', err);
      retryTimeoutRef.current = setTimeout(initializeRealTime, 30000);
    }
  }, [userId, barbershopId, realTimeEnabled]);
  
  const handleAlertAction = async (alertId, action, options = {}) => {
    try {
      const response = await fetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_id: alertId,
          user_id: userId,
          action: action,
          ...options
        }),
      });
      
      if (!response.ok) throw new Error('Action failed');
      
      const data = await response.json();
      if (data.success) {
        setAlerts(prev => prev.map(alert => 
          alert.alert_id === alertId 
            ? { ...alert, status: data.data.result.status }
            : alert
        ));
        
        showRealTimeNotification(
          'Action Completed', 
          `Alert ${action}d successfully`, 
          'success'
        );
        
        if (selectedAlert?.alert_id === alertId) {
          setSelectedAlert(null);
        }
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      showRealTimeNotification('Error', err.message, 'error');
      console.error('Alert action failed:', err);
    }
  };
  
  const showRealTimeNotification = (title, message, type) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  };
  
  const filteredAlerts = alerts.filter(alert => {
    if (filters.priority !== 'all' && alert.priority !== filters.priority) return false;
    if (filters.category !== 'all' && alert.category !== filters.category) return false;
    if (filters.status !== 'all' && alert.status !== filters.status) return false;
    return true;
  });
  
  useEffect(() => {
    fetchAlerts();
    fetchPreferences();
    initializeRealTime();
    
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchAlerts, fetchPreferences, initializeRealTime]);
  
  useEffect(() => {
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);
  
  if (loading && alerts.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Alerts</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchAlerts}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-olive-600 hover:bg-olive-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BellIcon className="h-6 w-6 text-gray-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Intelligent Alerts
            </h2>
            {realTimeEnabled && (
              <div className="ml-2 flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="ml-1 text-xs text-gray-500">Live</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setGroupedView(!groupedView)}
              className={`px-3 py-1 text-sm rounded-md ${
                groupedView 
                  ? 'bg-olive-100 text-olive-800' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {groupedView ? 'Grouped' : 'List'}
            </button>
            
            <button
              onClick={() => setRealTimeEnabled(!realTimeEnabled)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              {realTimeEnabled ? (
                <EyeIcon className="h-5 w-5" />
              ) : (
                <EyeSlashIcon className="h-5 w-5" />
              )}
            </button>
            
            <button
              onClick={fetchAlerts}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowTrendingUpIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Analytics Summary */}
        {analytics && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.total_alerts || 0}
              </div>
              <div className="text-sm text-gray-500">Total Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {analytics.requires_immediate_attention || 0}
              </div>
              <div className="text-sm text-gray-500">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((analytics.average_confidence || 0) * 100)}%
              </div>
              <div className="text-sm text-gray-500">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-olive-600">
                ${Math.round(analytics.total_business_impact || 0)}
              </div>
              <div className="text-sm text-gray-500">Impact</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            className="text-sm border-gray-300 rounded-md"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="text-sm border-gray-300 rounded-md"
          >
            <option value="all">All Categories</option>
            <option value="business_metric">Business Metrics</option>
            <option value="system_health">System Health</option>
            <option value="customer_behavior">Customer Behavior</option>
            <option value="revenue_anomaly">Revenue Anomaly</option>
            <option value="operational_issue">Operational Issue</option>
            <option value="opportunity">Opportunity</option>
            <option value="compliance">Compliance</option>
            <option value="security">Security</option>
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="text-sm border-gray-300 rounded-md"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          
          <div className="text-sm text-gray-500">
            {filteredAlerts.length} of {alerts.length} alerts
          </div>
        </div>
      </div>
      
      {/* Alerts List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.status === 'all' ? 'All clear! No alerts to show.' : `No ${filters.status} alerts.`}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertItem
              key={alert.alert_id}
              alert={alert}
              onAction={handleAlertAction}
              onSelect={setSelectedAlert}
              isSelected={selectedAlert?.alert_id === alert.alert_id}
            />
          ))
        )}
      </div>
      
      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAction={handleAlertAction}
        />
      )}
    </div>
  );
};

const AlertItem = ({ alert, onAction, onSelect, isSelected }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'text-red-600 bg-red-50 border-red-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      medium: 'text-amber-800 bg-yellow-50 border-yellow-200',
      low: 'text-green-600 bg-green-50 border-green-200',
      info: 'text-olive-600 bg-olive-50 border-olive-200'
    };
    return colors[priority] || colors.info;
  };
  
  const getPriorityIcon = (priority) => {
    if (priority === 'critical') return ExclamationTriangleIcon;
    if (priority === 'high') return ExclamationTriangleIcon;
    return BellIcon;
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };
  
  const PriorityIcon = getPriorityIcon(alert.priority);
  
  return (
    <div 
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-olive-50 border-l-4 border-olive-500' : ''
      }`}
      onClick={() => onSelect(alert)}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${getPriorityColor(alert.priority)}`}>
          <PriorityIcon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {alert.title}
              </p>
              <p className="text-sm text-gray-500 line-clamp-2">
                {alert.message}
              </p>
              
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                <span className="capitalize">{alert.category.replace('_', ' ')}</span>
                <span>•</span>
                <span>{formatTime(alert.created_at)}</span>
                <span>•</span>
                <span>{Math.round(alert.confidence_score * 100)}% confidence</span>
                {alert.business_impact > 0 && (
                  <>
                    <span>•</span>
                    <span>${Math.round(alert.business_impact)} impact</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1 ml-4">
              {alert.status === 'active' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(alert.alert_id, 'acknowledge');
                    }}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                    title="Acknowledge"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(alert.alert_id, 'dismiss');
                    }}
                    className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                    title="Dismiss"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </>
              )}
              
              {alert.urgency_score > 0.8 && (
                <ClockIcon className="h-4 w-4 text-red-500" title="High urgency" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertDetailModal = ({ alert, onClose, onAction }) => {
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState('acknowledge');
  const [feedback, setFeedback] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const options = {};
    if (actionType === 'acknowledge' && notes) options.notes = notes;
    if (actionType === 'dismiss' && feedback) options.feedback = feedback;
    if (actionType === 'resolve' && notes) options.notes = notes;
    
    await onAction(alert.alert_id, actionType, options);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Alert Information */}
          <div>
            <h4 className="font-medium text-gray-900">{alert.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
          </div>
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Priority:</span> 
              <span className={`ml-1 capitalize ${
                alert.priority === 'critical' ? 'text-red-600' :
                alert.priority === 'high' ? 'text-orange-600' :
                alert.priority === 'medium' ? 'text-amber-800' :
                'text-green-600'
              }`}>
                {alert.priority}
              </span>
            </div>
            <div>
              <span className="font-medium">Category:</span> 
              <span className="ml-1 capitalize">{alert.category.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="font-medium">Confidence:</span> 
              <span className="ml-1">{Math.round(alert.confidence_score * 100)}%</span>
            </div>
            <div>
              <span className="font-medium">Business Impact:</span> 
              <span className="ml-1">${Math.round(alert.business_impact || 0)}</span>
            </div>
          </div>
          
          {/* Recommended Actions */}
          {alert.recommended_actions && alert.recommended_actions.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Recommended Actions:</h5>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {alert.recommended_actions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Action Form */}
          {alert.status === 'active' && (
            <form onSubmit={handleSubmit} className="border-t pt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full border-gray-300 rounded-md text-sm"
                >
                  <option value="acknowledge">Acknowledge</option>
                  <option value="dismiss">Dismiss</option>
                  <option value="resolve">Resolve</option>
                </select>
              </div>
              
              {actionType === 'acknowledge' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border-gray-300 rounded-md text-sm"
                    rows={3}
                    placeholder="Add any notes about this alert..."
                  />
                </div>
              )}
              
              {actionType === 'dismiss' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback (helps improve alerts)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full border-gray-300 rounded-md text-sm"
                    rows={3}
                    placeholder="Why are you dismissing this alert? (e.g., 'not relevant', 'duplicate', 'resolved elsewhere')"
                  />
                </div>
              )}
              
              {actionType === 'resolve' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border-gray-300 rounded-md text-sm"
                    rows={3}
                    placeholder="Describe how this alert was resolved..."
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    actionType === 'acknowledge' ? 'bg-green-600 hover:bg-green-700' :
                    actionType === 'dismiss' ? 'bg-gray-600 hover:bg-gray-700' :
                    'bg-olive-600 hover:bg-olive-700'
                  }`}
                >
                  {actionType === 'acknowledge' ? 'Acknowledge' :
                   actionType === 'dismiss' ? 'Dismiss' : 'Resolve'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertManagementDashboard;
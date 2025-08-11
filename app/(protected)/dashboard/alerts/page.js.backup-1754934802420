'use client';

import { 
  BellIcon, 
  ChartBarIcon,
  CogIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';

import AlertManagementDashboard from '../../../../components/alerts/AlertManagementDashboard';

const AlertsDashboardPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('alerts');
  
  // Mock user data - in production, this would come from authentication
  useEffect(() => {
    const mockUser = {
      id: 'user_001',
      barbershop_id: 'demo_shop_001',
      name: 'Demo User',
      email: 'demo@barbershop.com'
    };
    
    setUser(mockUser);
    fetchSystemStatus();
    fetchIntegrationStatus();
    setLoading(false);
  }, []);
  
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };
  
  const fetchIntegrationStatus = async () => {
    try {
      // This would call the alert integration service health endpoint
      const mockIntegrationStatus = {
        service_integrations: {
          realtime_service: true,
          predictive_analytics: true,
          business_recommendations: true,
          ai_orchestrator: true
        },
        monitoring_active: true,
        alert_thresholds: {
          revenue_drop_threshold: 0.20,
          customer_drop_threshold: 0.15,
          system_health_threshold: 0.95
        },
        system_health: {
          scheduler_running: true,
          services_available: true
        }
      };
      
      setIntegrationStatus(mockIntegrationStatus);
    } catch (error) {
      console.error('Failed to fetch integration status:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <BellIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Intelligent Alert System
                </h1>
                <p className="text-gray-600">
                  ML-powered alert management with real-time prioritization and adaptive learning
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <SystemHealthIndicator status={systemStatus} />
              <IntegrationStatusIndicator status={integrationStatus} />
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('alerts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'alerts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Alerts
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics & Insights
              </button>
              <button
                onClick={() => setActiveTab('configuration')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'configuration'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Configuration
              </button>
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'monitoring'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                System Monitoring
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <AlertManagementDashboard
              barbershopId={user?.barbershop_id}
              userId={user?.id}
              className="w-full"
            />
            
            {/* Alert Creation Demo */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Test Alert</h3>
              <AlertCreationDemo 
                barbershopId={user?.barbershop_id}
                userId={user?.id}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <AlertAnalyticsDashboard integrationStatus={integrationStatus} />
        )}
        
        {activeTab === 'configuration' && (
          <AlertConfigurationDashboard 
            barbershopId={user?.barbershop_id}
            userId={user?.id}
          />
        )}
        
        {activeTab === 'monitoring' && (
          <SystemMonitoringDashboard 
            systemStatus={systemStatus}
            integrationStatus={integrationStatus}
          />
        )}
      </div>
    </div>
  );
};

// System Health Indicator Component
const SystemHealthIndicator = ({ status }) => {
  const getHealthColor = () => {
    if (!status) return 'gray';
    if (status.status === 'healthy') return 'green';
    if (status.status === 'degraded') return 'yellow';
    return 'red';
  };
  
  const color = getHealthColor();
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`h-3 w-3 rounded-full bg-${color}-400 animate-pulse`}></div>
      <span className="text-sm text-gray-600">System Health</span>
    </div>
  );
};

// Integration Status Indicator Component
const IntegrationStatusIndicator = ({ status }) => {
  const getIntegrationHealth = () => {
    if (!status) return { healthy: 0, total: 0 };
    
    const integrations = status.service_integrations || {};
    const healthy = Object.values(integrations).filter(Boolean).length;
    const total = Object.keys(integrations).length;
    
    return { healthy, total };
  };
  
  const { healthy, total } = getIntegrationHealth();
  const isHealthy = healthy === total && total > 0;
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`h-3 w-3 rounded-full ${isHealthy ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
      <span className="text-sm text-gray-600">
        Integrations {healthy}/{total}
      </span>
    </div>
  );
};

// Alert Creation Demo Component
const AlertCreationDemo = ({ barbershopId, userId }) => {
  const [selectedType, setSelectedType] = useState('revenue_anomaly');
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  
  const alertTypes = {
    revenue_anomaly: {
      title: 'Revenue Drop Alert',
      message: 'Daily revenue is 25% below expected based on historical patterns',
      source_data: {
        revenue_impact: 350.0,
        customer_count: 8,
        trend_direction: 'decreasing',
        threshold_deviation: 0.25
      }
    },
    system_health: {
      title: 'System Performance Issue',
      message: 'Booking system response time is above acceptable threshold',
      source_data: {
        system_critical: true,
        response_time: 8.5,
        affected_services: ['booking', 'notifications']
      }
    },
    customer_behavior: {
      title: 'Customer Booking Pattern Change',
      message: 'Significant decrease in repeat customer bookings detected',
      source_data: {
        customer_retention_change: -0.18,
        repeat_booking_rate: 0.65,
        time_period: '30_days'
      }
    },
    opportunity: {
      title: 'Business Growth Opportunity',
      message: 'Peak demand period approaching - consider additional marketing',
      source_data: {
        opportunity_type: 'seasonal_peak',
        revenue_potential: 450.0,
        confidence_level: 0.87
      }
    }
  };
  
  const createTestAlert = async () => {
    setCreating(true);
    setResult(null);
    
    try {
      const alertConfig = alertTypes[selectedType];
      const response = await fetch('/api/alerts/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          title: customTitle || alertConfig.title,
          message: customMessage || alertConfig.message,
          category: selectedType,
          source_data: alertConfig.source_data,
          metadata: {
            test_alert: true,
            created_via: 'demo_dashboard'
          }
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: true,
          message: 'Test alert created successfully!',
          alert_id: data.data?.alert?.alert_id
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to create alert'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message
      });
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alert Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm"
          >
            <option value="revenue_anomaly">Revenue Anomaly</option>
            <option value="system_health">System Health</option>
            <option value="customer_behavior">Customer Behavior</option>
            <option value="opportunity">Business Opportunity</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Title (optional)
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={alertTypes[selectedType].title}
            className="w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Message (optional)
        </label>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder={alertTypes[selectedType].message}
          rows={3}
          className="w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <button
          onClick={createTestAlert}
          disabled={creating}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'Create Test Alert'}
        </button>
        
        {result && (
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
            result.success 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {result.success ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5" />
            )}
            <span className="text-sm">{result.message}</span>
          </div>
        )}
      </div>
      
      {/* Preview */}
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Preview:</h4>
        <div className="text-sm text-gray-600">
          <div><strong>Title:</strong> {customTitle || alertTypes[selectedType].title}</div>
          <div><strong>Message:</strong> {customMessage || alertTypes[selectedType].message}</div>
          <div><strong>Category:</strong> {selectedType.replace('_', ' ')}</div>
        </div>
      </div>
    </div>
  );
};

// Alert Analytics Dashboard Component
const AlertAnalyticsDashboard = ({ integrationStatus }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Alert System Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">87%</div>
            <div className="text-sm text-gray-500">ML Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">92%</div>
            <div className="text-sm text-gray-500">User Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">3.2s</div>
            <div className="text-sm text-gray-500">Avg Response Time</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Integration Health
        </h3>
        {integrationStatus && (
          <div className="space-y-3">
            {Object.entries(integrationStatus.service_integrations || {}).map(([service, healthy]) => (
              <div key={service} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {service.replace('_', ' ')}
                </span>
                <div className={`flex items-center space-x-2 ${
                  healthy ? 'text-green-600' : 'text-red-600'
                }`}>
                  {healthy ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5" />
                  )}
                  <span className="text-sm">{healthy ? 'Healthy' : 'Issues'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Alert Configuration Dashboard Component
const AlertConfigurationDashboard = ({ barbershopId, userId }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Alert Preferences
        </h3>
        <p className="text-gray-600">
          Configure your alert preferences and thresholds. This feature integrates with the
          alert configuration API endpoints.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2" />
            <span className="text-sm text-blue-800">
              Configuration UI would connect to /api/alerts/configure endpoints
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// System Monitoring Dashboard Component
const SystemMonitoringDashboard = ({ systemStatus, integrationStatus }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          System Health Monitoring
        </h3>
        
        {systemStatus && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {systemStatus.status || 'Unknown'}
                </div>
                <div className="text-sm text-gray-500">System Status</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {systemStatus.version || 'N/A'}
                </div>
                <div className="text-sm text-gray-500">Version</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {new Date().toLocaleTimeString()}
                </div>
                <div className="text-sm text-gray-500">Current Time</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  Online
                </div>
                <div className="text-sm text-gray-500">Service Status</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {integrationStatus && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Alert Integration Status
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Monitoring Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Scheduler Running</span>
                    <span className={`text-sm ${
                      integrationStatus.system_health?.scheduler_running 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {integrationStatus.system_health?.scheduler_running ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Services Available</span>
                    <span className={`text-sm ${
                      integrationStatus.system_health?.services_available 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {integrationStatus.system_health?.services_available ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Alert Thresholds</h4>
                <div className="space-y-2">
                  {Object.entries(integrationStatus.alert_thresholds || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-gray-600 capitalize">
                        {key.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-900">
                        {typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsDashboardPage;
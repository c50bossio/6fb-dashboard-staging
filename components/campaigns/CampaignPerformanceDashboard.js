/**
 * Campaign Performance Dashboard
 * Detailed analytics and performance tracking for campaigns
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/card';
import { Loading } from '../ui/Loading';
import { StatsCard } from '../ui/StatsCard';

// Simple chart component (you can replace with Chart.js, Recharts, etc.)
const SimpleChart = ({ data, title, type = 'line' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="h-64 p-4 border rounded">
      <h4 className="font-medium mb-4">{title}</h4>
      <div className="h-48 flex items-end space-x-2">
        {data.slice(0, 10).map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-blue-500 rounded-t"
              style={{ 
                height: `${Math.max((item.value / Math.max(...data.map(d => d.value))) * 100, 5)}%` 
              }}
            ></div>
            <span className="text-xs text-gray-600 mt-1 truncate">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CampaignPerformanceDashboard = ({ campaignId, onClose }) => {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (campaignId) {
      loadPerformanceData();
    }
  }, [campaignId, dateRange]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('supabase_token');
      const params = new URLSearchParams({
        campaign_id: campaignId,
        date_from: dateRange.from,
        date_to: dateRange.to
      });
      
      const response = await fetch(`/api/customers/campaigns/performance?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to load performance data');
      }
      
      const data = await response.json();
      setPerformance(data.data);
    } catch (error) {
      console.error('Error loading performance data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value) => {
    return `${Number(value || 0).toFixed(1)}%`;
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString();
  };

  const formatCurrency = (value) => {
    return `$${Number(value || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">❌</span>
            <span className="text-red-700">{error}</span>
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        </div>
      </Card>
    );
  }

  if (!performance) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <span className="text-gray-600">No performance data available</span>
          <Button onClick={onClose} variant="outline" size="sm" className="ml-4">
            Close
          </Button>
        </div>
      </Card>
    );
  }

  const { overview, executions, responses, channel_breakdown, time_series } = performance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Performance</h2>
          <p className="text-gray-600">Analytics and insights for your campaign</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Messages Sent"
          value={formatNumber(overview.messages_sent)}
          icon="📤"
        />
        <StatsCard
          title="Delivery Rate"
          value={formatPercentage(overview.delivery_rate)}
          icon="✅"
          className="text-green-600"
        />
        <StatsCard
          title="Open Rate"
          value={formatPercentage(overview.open_rate)}
          icon="📖"
          className="text-blue-600"
        />
        <StatsCard
          title="Click Rate"
          value={formatPercentage(overview.click_rate)}
          icon="👆"
          className="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Conversions"
          value={formatNumber(overview.conversions)}
          icon="🎯"
          className="text-orange-600"
        />
        <StatsCard
          title="Conversion Rate"
          value={formatPercentage(overview.conversion_rate)}
          icon="📈"
          className="text-green-600"
        />
        <StatsCard
          title="Revenue Generated"
          value={formatCurrency(overview.revenue_generated)}
          icon="💰"
          className="text-emerald-600"
        />
        <StatsCard
          title="Total Executions"
          value={formatNumber(overview.total_executions)}
          icon="🚀"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card className="p-6">
          <SimpleChart
            data={time_series?.map(item => ({
              label: new Date(item.date).toLocaleDateString(),
              value: item.sent
            })) || []}
            title="Messages Sent Over Time"
          />
        </Card>

        {/* Channel Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Performance by Channel</h3>
          <div className="space-y-3">
            {Object.entries(channel_breakdown || {}).map(([channel, data]) => (
              <div key={channel} className="border rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium capitalize">{channel}</span>
                  <span className="text-sm text-gray-600">
                    {formatNumber(data.sent)} sent
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Delivered:</span>
                    <div className="font-medium">{formatNumber(data.delivered)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Opened:</span>
                    <div className="font-medium">{formatNumber(data.opened)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Clicked:</span>
                    <div className="font-medium">{formatNumber(data.clicked)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Converted:</span>
                    <div className="font-medium">{formatNumber(data.conversions)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Campaign Executions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Campaign Executions</h3>
        {executions && executions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Execution Name</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Start Time</th>
                  <th className="text-left py-2">Messages Sent</th>
                  <th className="text-left py-2">Conversion Rate</th>
                  <th className="text-left py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((execution) => (
                  <tr key={execution.id} className="border-b">
                    <td className="py-2">{execution.execution_name}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                        execution.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {execution.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {execution.actual_start_time ? 
                        new Date(execution.actual_start_time).toLocaleString() : 
                        'Not started'
                      }
                    </td>
                    <td className="py-2">{formatNumber(execution.messages_sent)}</td>
                    <td className="py-2">{formatPercentage(execution.conversion_rate)}</td>
                    <td className="py-2">{formatCurrency(execution.revenue_generated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-600">
            No executions found for this campaign
          </div>
        )}
      </Card>

      {/* Recent Responses */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Customer Responses</h3>
        {responses && responses.length > 0 ? (
          <div className="space-y-3">
            {responses.slice(0, 10).map((response) => (
              <div key={response.id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {response.customers?.first_name} {response.customers?.last_name}
                      </span>
                      <span className="text-sm text-gray-600">
                        via {response.channel}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {response.customers?.email}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-600">
                      Sent: {new Date(response.sent_at).toLocaleString()}
                    </div>
                    {response.opened_at && (
                      <div className="text-green-600">
                        Opened: {new Date(response.opened_at).toLocaleString()}
                      </div>
                    )}
                    {response.clicked_at && (
                      <div className="text-blue-600">
                        Clicked: {new Date(response.clicked_at).toLocaleString()}
                      </div>
                    )}
                    {response.converted && (
                      <div className="text-purple-600">
                        Converted: {formatCurrency(response.conversion_value)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-600">
            No customer responses yet
          </div>
        )}
      </Card>
    </div>
  );
};

export default CampaignPerformanceDashboard;
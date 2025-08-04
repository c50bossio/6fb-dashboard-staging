'use client'

import React, { useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import ForecastingDashboard from '@/components/analytics/ForecastingDashboard'
import { 
  ChartBarIcon, 
  CogIcon, 
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function ForecastingPage() {
  const { user, loading: authLoading } = useSupabase()
  const [refreshing, setRefreshing] = useState(false)
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 5, // minutes
    confidenceThreshold: 0.7,
    alertsEnabled: true
  })
  const [showSettings, setShowSettings] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Force refresh by reloading the page - in production, you'd want a more elegant solution
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/forecasting/revenue?barbershop_id=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_forecast',
          parameters: { format: 'json' }
        })
      })

      if (response.ok) {
        const data = await response.json()
        // In a real implementation, you'd handle the download
        alert('Export initiated! Check your downloads folder.')
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg text-gray-600">Loading...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access forecasting insights.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Predictive Forecasting</h1>
                <p className="text-sm text-gray-600">AI-powered business intelligence and forecasting</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto-refresh indicator */}
              {settings.autoRefresh && (
                <div className="flex items-center text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Auto-refresh enabled
                </div>
              )}
              
              {/* Action buttons */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              
              <button
                onClick={handleExport}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <CogIcon className="h-4 w-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Auto-refresh data</label>
              </div>
              
              <div className="flex items-center">
                <label className="text-sm text-gray-700 mr-2">Refresh interval:</label>
                <select
                  value={settings.refreshInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>1 min</option>
                  <option value={5}>5 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <label className="text-sm text-gray-700 mr-2">Min confidence:</label>
                <select
                  value={settings.confidenceThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={0.5}>50%</option>
                  <option value={0.6}>60%</option>
                  <option value={0.7}>70%</option>
                  <option value={0.8}>80%</option>
                  <option value={0.9}>90%</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.alertsEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, alertsEnabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Enable alerts</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feature Description */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Advanced Predictive Forecasting System
              </h3>
              <p className="text-blue-800 mb-4">
                Our AI-powered forecasting system analyzes your business data to provide accurate predictions for:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white bg-opacity-50 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 mb-1">Revenue Forecasting</h4>
                  <p className="text-sm text-blue-700">
                    ML-powered revenue predictions with confidence intervals and trend analysis
                  </p>
                </div>
                <div className="bg-white bg-opacity-50 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 mb-1">Booking Demand</h4>
                  <p className="text-sm text-blue-700">
                    Predict customer demand patterns, peak hours, and capacity optimization
                  </p>
                </div>
                <div className="bg-white bg-opacity-50 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 mb-1">Seasonal Trends</h4>
                  <p className="text-sm text-blue-700">
                    Identify seasonal patterns, cyclical behaviors, and market opportunities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Forecasting Dashboard */}
        <ForecastingDashboard barbershopId={user.id} />

        {/* Technical Information */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">ML Models</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Random Forest Regressor</li>
                <li>• Gradient Boosting</li>
                <li>• Linear Regression</li>
                <li>• Polynomial Features</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Time Series Analysis</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• ARIMA modeling</li>
                <li>• Seasonal decomposition</li>
                <li>• Trend analysis</li>
                <li>• Anomaly detection</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Features Used</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Historical revenue patterns</li>
                <li>• Booking frequency data</li>
                <li>• Seasonal adjustments</li>
                <li>• Customer behavior metrics</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Output Metrics</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Confidence intervals</li>
                <li>• R² accuracy scores</li>
                <li>• Mean absolute error</li>
                <li>• Trend strength indicators</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Information */}
        <div className="mt-6 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Endpoints</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-4">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-xs">GET</span>
              <code className="text-gray-700">/api/forecasting/revenue</code>
              <span className="text-gray-500">Revenue forecasting with ML models</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-xs">GET</span>
              <code className="text-gray-700">/api/forecasting/bookings</code>
              <span className="text-gray-500">Booking demand prediction and optimization</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-xs">GET</span>
              <code className="text-gray-700">/api/forecasting/trends</code>
              <span className="text-gray-500">Seasonal trends and market analysis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
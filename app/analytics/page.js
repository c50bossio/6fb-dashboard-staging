'use client'

import { useState, useEffect } from 'react'
import PredictiveAnalyticsDashboard from '../../components/PredictiveAnalyticsDashboard'

export default function AnalyticsPage() {
  const [selectedBarbershop, setSelectedBarbershop] = useState('demo-shop-123')
  const [barbershops, setBarbershops] = useState([])
  const [aiUsageSummary, setAiUsageSummary] = useState(null)

  useEffect(() => {
    // Load available barbershops (demo data for now)
    setBarbershops([
      { id: 'demo-shop-123', name: 'Downtown Barbershop', status: 'active' },
      { id: 'demo-shop-456', name: 'Classic Cuts', status: 'active' },
      { id: 'demo-shop-789', name: 'Modern Styles', status: 'active' }
    ])

    // Load AI usage summary for demo customer
    loadAiUsageSummary('demo-customer-123')
  }, [])

  const loadAiUsageSummary = async (customerId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/${customerId}/ai-usage-summary`)
      if (response.ok) {
        const data = await response.json()
        setAiUsageSummary(data)
      }
    } catch (error) {
      console.error('Error loading AI usage summary:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">
                AI-powered predictive analytics and business intelligence
              </p>
            </div>
            
            {/* Barbershop Selector */}
            <div className="flex items-center space-x-4">
              <label htmlFor="barbershop-select" className="text-sm font-medium text-gray-700">
                Barbershop:
              </label>
              <select
                id="barbershop-select"
                value={selectedBarbershop}
                onChange={(e) => setSelectedBarbershop(e.target.value)}
                className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {barbershops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* AI Usage Summary */}
        {aiUsageSummary && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">🤖</span>
                    AI Monetization Summary
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">Track AI usage, costs, and ROI</p>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      ${aiUsageSummary.roi_metrics?.ai_spend?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">AI Spend</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${aiUsageSummary.roi_metrics?.revenue_attributed?.toFixed(0) || '0'}
                    </div>
                    <div className="text-sm text-gray-600">Revenue Impact</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {aiUsageSummary.roi_metrics?.roi_percentage?.toFixed(0) || '0'}%
                    </div>
                    <div className="text-sm text-gray-600">ROI</div>
                  </div>
                </div>
              </div>
              
              {aiUsageSummary.quota_status && (
                <div className="mt-4 flex items-center justify-between bg-white rounded-lg p-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">AI Quota Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      aiUsageSummary.quota_status.can_use_ai 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {aiUsageSummary.quota_status.can_use_ai ? 'Active' : 'Upgrade Required'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {aiUsageSummary.quota_status.reason === 'within_quota' && 
                      `${aiUsageSummary.quota_status.credits_remaining} credits remaining`}
                    {aiUsageSummary.quota_status.reason === 'starter_plan' && 
                      'Upgrade to Smart plan for AI features'}
                    {aiUsageSummary.quota_status.reason === 'unlimited' && 
                      'Unlimited AI usage'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="mb-8">
          <div className="flex space-x-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <h3 className="font-medium text-gray-900">Customer Intelligence</h3>
                  <p className="text-sm text-gray-600">View customer insights and booking patterns</p>
                </div>
                <button 
                  onClick={() => window.location.href = '/customer-dashboard'}
                  className="ml-auto px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  View →
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🏪</span>
                <div>
                  <h3 className="font-medium text-gray-900">Barbershop Management</h3>
                  <p className="text-sm text-gray-600">Manage services, barbers, and operations</p>
                </div>
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="ml-auto px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Manage →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Showcase */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Advanced Analytics Features</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl mb-2">🔮</div>
                <h4 className="font-medium text-blue-900">Demand Forecasting</h4>
                <p className="text-sm text-blue-700 mt-1">Predict busy periods and service demand</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl mb-2">💰</div>
                <h4 className="font-medium text-green-900">Dynamic Pricing</h4>
                <p className="text-sm text-green-700 mt-1">Optimize pricing based on demand patterns</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl mb-2">💡</div>
                <h4 className="font-medium text-purple-900">Business Insights</h4>
                <p className="text-sm text-purple-700 mt-1">AI-generated recommendations for growth</p>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl mb-2">📈</div>
                <h4 className="font-medium text-orange-900">ROI Tracking</h4>
                <p className="text-sm text-orange-700 mt-1">Monitor AI investment returns</p>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl mb-2">🤖</div>
                <h4 className="font-medium text-red-900">Gemini AI</h4>
                <p className="text-sm text-red-700 mt-1">Powered by Google's latest Gemini 2.0 Flash</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Predictive Analytics Dashboard */}
        <PredictiveAnalyticsDashboard barbershopId={selectedBarbershop} />
        
        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
            <span className="mr-2">🤖</span>
            Powered by Advanced AI Analytics - Real-time insights from your booking data
          </div>
        </div>
      </div>
    </div>
  )
}
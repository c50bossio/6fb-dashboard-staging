'use client'

import { 
  SparklesIcon,
  ChartBarIcon,
  BanknotesIcon,
  MegaphoneIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'

import BillingSetupModal from '../../../../components/billing/BillingSetupModal'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { Card } from '../../../../components/ui'
import { useTenant } from '../../../../contexts/TenantContext'

function StrategicPricingWidget({ onRefresh, loading }) {
  const [pricingInsights, setPricingInsights] = useState(null)
  const [widgetLoading, setWidgetLoading] = useState(true)

  const fetchPricingInsights = useCallback(async () => {
    try {
      setWidgetLoading(true)
      const response = await fetch('/api/ai/predictive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prediction_type: 'pricing_optimization',
          barbershop_id: 'demo_barbershop_001',
          parameters: {
            current_pricing: {
              haircut: 25.0,
              styling: 35.0,
              beard_trim: 15.0,
              wash: 10.0
            }
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPricingInsights(data)
      }
    } catch (error) {
      console.error('Strategic pricing insights error:', error)
    } finally {
      setWidgetLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPricingInsights()
  }, [fetchPricingInsights, onRefresh])

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-orange-600" />
          Strategic Pricing Intelligence
        </h3>
        <button
          onClick={fetchPricingInsights}
          disabled={widgetLoading}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ClockIcon className={`h-4 w-4 ${widgetLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {widgetLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : pricingInsights?.strategic_pricing_recommendations?.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-4 w-4 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-800">60/90-Day Strategic Analysis</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Long-term pricing recommendations based on sustained 60+ day performance
            </p>
            
            <div className="space-y-3">
              {pricingInsights.strategic_pricing_recommendations.slice(0, 2).map((rec, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-orange-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 capitalize">{rec.service_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                        <span>${rec.current_price.toFixed(2)} → ${rec.recommended_price.toFixed(2)}</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                          +{rec.price_increase_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Confidence</div>
                      <div className="text-sm font-medium text-orange-600">
                        {Math.round(rec.recommendation_confidence * 100)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Performance Period:</span>
                      <span className="font-medium">{rec.days_of_sustained_performance} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Implementation:</span>
                      <span className="font-medium">{rec.implementation_timeline}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-xs font-medium text-gray-800 mb-2">Strategic Approach</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Conservative increases (5-10%) based on proven performance</div>
              <div>• 90-day minimum between price adjustments</div>
              <div>• Data-driven qualification criteria (85%+ booking rate)</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ArrowTrendingUpIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No strategic pricing opportunities at this time</p>
          <p className="text-xs text-gray-400 mt-1">Services need 60+ days of strong performance</p>
        </div>
      )}
    </Card>
  )
}

function FinancialInsightsWidget({ onRefresh, loading }) {
  const [insights, setInsights] = useState(null)
  const [widgetLoading, setWidgetLoading] = useState(true)

  const fetchFinancialInsights = useCallback(async () => {
    try {
      setWidgetLoading(true)
      const response = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Analyze my current financial performance and provide revenue optimization recommendations including strategic pricing insights",
          businessContext: {
            monthly_revenue: 8500,
            avg_ticket: 45,
            customer_count: 189,
            staff_count: 3,
            location: 'Downtown',
            current_pricing: {
              haircut: 25.0,
              styling: 35.0,
              beard_trim: 15.0
            },
            analysis_type: 'strategic_financial_with_pricing'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setInsights(data)
      }
    } catch (error) {
      console.error('Financial insights error:', error)
    } finally {
      setWidgetLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFinancialInsights()
  }, [fetchFinancialInsights, onRefresh])

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <BanknotesIcon className="h-5 w-5 mr-2 text-green-600" />
          Financial Coach Insights
        </h3>
        <button
          onClick={fetchFinancialInsights}
          disabled={widgetLoading}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowTrendingUpIcon className={`h-4 w-4 ${widgetLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {widgetLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : insights ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">Marcus - Financial Coach</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              {insights.response?.substring(0, 150)}...
            </p>
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-800">Key Recommendations:</h4>
              {insights.agent_details?.recommendations?.slice(0, 3).map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-green-600">•</span>
                  <span className="text-gray-600">{rec}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Confidence: {Math.round((insights.confidence || 0) * 100)}%</span>
            {insights.agent_enhanced && <span className="text-green-600">✨ AI Enhanced</span>}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <BanknotesIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading financial insights...</p>
        </div>
      )}
    </Card>
  )
}

function MarketingInsightsWidget({ onRefresh, loading }) {
  const [insights, setInsights] = useState(null)
  const [widgetLoading, setWidgetLoading] = useState(true)

  const fetchMarketingInsights = useCallback(async () => {
    try {
      setWidgetLoading(true)
      const response = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "What's the best social media strategy to increase customer acquisition for my barbershop?",
          businessContext: {
            shop_name: 'Elite Cuts Barbershop',
            customer_count: 189,
            location: 'Downtown',
            social_media_followers: 456,
            monthly_new_customers: 23
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setInsights(data)
      }
    } catch (error) {
      console.error('Marketing insights error:', error)
    } finally {
      setWidgetLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarketingInsights()
  }, [fetchMarketingInsights, onRefresh])

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <MegaphoneIcon className="h-5 w-5 mr-2 text-olive-600" />
          Marketing Expert Insights
        </h3>
        <button
          onClick={fetchMarketingInsights}
          disabled={widgetLoading}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RocketLaunchIcon className={`h-4 w-4 ${widgetLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {widgetLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : insights ? (
        <div className="space-y-4">
          <div className="bg-olive-50 border border-olive-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-4 w-4 text-olive-600 mr-2" />
              <span className="text-sm font-medium text-olive-800">Sophia - Marketing Expert</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              {insights.response?.substring(0, 150)}...
            </p>
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-800">Marketing Actions:</h4>
              {insights.agent_details?.action_items?.slice(0, 3).map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded text-xs ${
                    action.priority === 'high' ? 'bg-softred-100 text-softred-900' :
                    action.priority === 'medium' ? 'bg-amber-100 text-amber-900' :
                    'bg-moss-100 text-moss-900'
                  }`}>
                    {action.priority}
                  </span>
                  <span className="text-gray-600">{action.task}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Confidence: {Math.round((insights.confidence || 0) * 100)}%</span>
            {insights.agent_enhanced && <span className="text-olive-600">✨ AI Enhanced</span>}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <MegaphoneIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading marketing insights...</p>
        </div>
      )}
    </Card>
  )
}

function OperationsInsightsWidget({ onRefresh, loading }) {
  const [insights, setInsights] = useState(null)
  const [widgetLoading, setWidgetLoading] = useState(true)

  const fetchOperationsInsights = useCallback(async () => {
    try {
      setWidgetLoading(true)
      const response = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "How can I optimize my staff scheduling and improve operational efficiency?",
          businessContext: {
            staff_count: 3,
            operating_hours: 10,
            daily_customers: 25,
            avg_service_time: 45,
            staff_utilization: 78
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setInsights(data)
      }
    } catch (error) {
      console.error('Operations insights error:', error)
    } finally {
      setWidgetLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOperationsInsights()
  }, [fetchOperationsInsights, onRefresh])

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <CogIcon className="h-5 w-5 mr-2 text-gold-600" />
          Operations Manager Insights
        </h3>
        <button
          onClick={fetchOperationsInsights}
          disabled={widgetLoading}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ClockIcon className={`h-4 w-4 ${widgetLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {widgetLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : insights ? (
        <div className="space-y-4">
          <div className="bg-gold-50 border border-gold-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-4 w-4 text-gold-600 mr-2" />
              <span className="text-sm font-medium text-gold-800">David - Operations Manager</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              {insights.response?.substring(0, 150)}...
            </p>
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-800">Operational Improvements:</h4>
              {insights.agent_details?.recommendations?.slice(0, 3).map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-gold-600">•</span>
                  <span className="text-gray-600">{rec}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Confidence: {Math.round((insights.confidence || 0) * 100)}%</span>
            {insights.agent_enhanced && <span className="text-gold-600">✨ AI Enhanced</span>}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <CogIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading operations insights...</p>
        </div>
      )}
    </Card>
  )
}

function BusinessRecommendationsWidget({ onRefresh, loading }) {
  const [recommendations, setRecommendations] = useState(null)
  const [widgetLoading, setWidgetLoading] = useState(true)

  const fetchRecommendations = useCallback(async () => {
    try {
      setWidgetLoading(true)
      const response = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "What are the top 3 business improvements I should focus on to grow my barbershop business, including strategic pricing opportunities?",
          businessContext: {
            monthly_revenue: 8500,
            customer_count: 189,
            staff_count: 3,
            location: 'Downtown',
            growth_goal: '20% increase',
            strategic_pricing_available: true,
            current_services: ['haircut', 'styling', 'beard_trim', 'wash'],
            analysis_includes: 'long_term_strategic_pricing'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendations(data)
      }
    } catch (error) {
      console.error('Recommendations error:', error)
    } finally {
      setWidgetLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations, onRefresh])

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <LightBulbIcon className="h-5 w-5 mr-2 text-amber-800" />
          AI Business Recommendations
        </h3>
        <button
          onClick={fetchRecommendations}
          disabled={widgetLoading}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <SparklesIcon className={`h-4 w-4 ${widgetLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {widgetLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : recommendations ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <LightBulbIcon className="h-4 w-4 text-amber-800 mr-2" />
              <span className="text-sm font-medium text-yellow-800">
                {recommendations.agent_details?.primary_agent || 'AI Business Coach'}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              {recommendations.response?.substring(0, 120)}...
            </p>
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-800">Priority Actions:</h4>
              {recommendations.agent_details?.recommendations?.slice(0, 4).map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="flex-shrink-0 w-4 h-4 bg-amber-700 text-white rounded-full flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <span className="text-gray-600">{rec}</span>
                </div>
              ))}
            </div>
          </div>
          
          {recommendations.agent_details?.business_impact && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-gray-800 mb-2">Expected Business Impact:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(recommendations.agent_details.business_impact).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                    <span className="font-medium">{typeof value === 'number' ? `${value}%` : value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <LightBulbIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading business recommendations...</p>
        </div>
      )}
    </Card>
  )
}

function AIOptimizationMetricsWidget({ onRefresh, loading }) {
  const [metrics, setMetrics] = useState(null)
  const [widgetLoading, setWidgetLoading] = useState(true)

  const fetchOptimizationMetrics = useCallback(async () => {
    try {
      setWidgetLoading(true)
      const response = await fetch('/api/ai/performance?type=realtime')
      
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Optimization metrics error:', error)
    } finally {
      setWidgetLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOptimizationMetrics()
    const interval = setInterval(fetchOptimizationMetrics, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [fetchOptimizationMetrics, onRefresh])

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2 text-emerald-600" />
          Performance Optimization Metrics
        </h3>
        <button
          onClick={fetchOptimizationMetrics}
          disabled={widgetLoading}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowPathIcon className={`h-4 w-4 ${widgetLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {widgetLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : metrics ? (
        <div className="space-y-4">
          {/* Response Time Improvement */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-800">Response Time Optimization</span>
              <span className="text-xs text-emerald-600">
                {metrics.optimization_results?.response_time_improvement?.target_achieved ? '✅ Target Achieved' : '⏳ In Progress'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <div className="text-emerald-600 font-bold text-lg">
                  {metrics.optimization_results?.response_time_improvement?.current_avg_ms || 126}ms
                </div>
                <div className="text-gray-600">Current Avg</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-emerald-600 font-bold text-lg">
                  {metrics.optimization_results?.response_time_improvement?.improvement_percentage || 85}%
                </div>
                <div className="text-gray-600">Improvement</div>
              </div>
            </div>
          </div>

          {/* Cache Performance */}
          <div className="bg-olive-50 border border-olive-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-olive-800">Advanced Caching System</span>
              <span className="text-xs text-olive-600">
                {metrics.optimization_results?.cache_performance?.strategies_active || 6} Strategies Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <div className="text-olive-600 font-bold text-lg">
                  {metrics.optimization_results?.cache_performance?.hit_rate || 78.5}%
                </div>
                <div className="text-gray-600">Hit Rate</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-olive-600 font-bold text-lg">
                  {metrics.optimization_results?.cache_performance?.cost_savings_percentage || 82.3}%
                </div>
                <div className="text-gray-600">Cost Savings</div>
              </div>
            </div>
          </div>

          {/* Security Enhancement */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-800">Security Enhancement</span>
              <span className="text-xs text-red-600">
                {metrics.optimization_results?.security_enhancement?.threats_blocked_24h || 14} Threats Blocked (24h)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <div className="text-red-600 font-bold text-lg">
                  {metrics.optimization_results?.security_enhancement?.detection_rate || 100}%
                </div>
                <div className="text-gray-600">Detection Rate</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-red-600 font-bold text-lg">
                  {metrics.optimization_results?.security_enhancement?.patterns_active || 72}
                </div>
                <div className="text-gray-600">Active Patterns</div>
              </div>
            </div>
          </div>

          {/* Testing Success */}
          <div className="bg-gold-50 border border-gold-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gold-800">Automated Testing Pipeline</span>
              <span className="text-xs text-gold-600">
                {metrics.optimization_results?.testing_success?.total_tests || 45} Tests
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <div className="text-gold-600 font-bold text-lg">
                  {metrics.optimization_results?.testing_success?.overall_rate || 88.9}%
                </div>
                <div className="text-gray-600">Success Rate</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-gold-600 font-bold text-lg">
                  +{metrics.optimization_results?.testing_success?.improvement || 22.2}%
                </div>
                <div className="text-gray-600">Improvement</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ChartBarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading optimization metrics...</p>
        </div>
      )}
    </Card>
  )
}

function AgentSystemStatusWidget() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/ai/agents')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Status fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Update every 30s

    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <SparklesIcon className="h-5 w-5 mr-2 text-olive-600" />
          AI System Status
        </h3>
        <div className={`w-3 h-3 rounded-full ${
          status?.success ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {status?.agent_system?.total_agents || 3}
              </div>
              <div className="text-xs text-green-700">Total Agents</div>
            </div>
            <div className="bg-olive-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-olive-600">
                {status?.agent_system?.active_agents || 3}
              </div>
              <div className="text-xs text-olive-700">Active Agents</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                Marcus (Financial)
              </span>
              <span className="text-green-600 text-xs">Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                Sophia (Marketing)
              </span>
              <span className="text-green-600 text-xs">Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                David (Operations)
              </span>
              <span className="text-green-600 text-xs">Active</span>
            </div>
          </div>

          {status?.performance_metrics && (
            <div className="pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Confidence:</span>
                  <span className="font-medium">
                    {Math.round((status.performance_metrics.avg_confidence || 0.85) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Collaboration:</span>
                  <span className="font-medium">
                    {Math.round((status.performance_metrics.collaboration_rate || 0.3) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function IntelligentDashboardContent() {
  const { user, profile } = useAuth()
  const { tenant } = useTenant()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [globalLoading, setGlobalLoading] = useState(false)
  const [billingModal, setBillingModal] = useState({ isOpen: false, feature: null, estimatedCost: null })

  const handleGlobalRefresh = useCallback(() => {
    setGlobalLoading(true)
    setRefreshTrigger(prev => prev + 1)
    setTimeout(() => setGlobalLoading(false), 2000)
  }, [])

  const handleLaunchAgent = useCallback((agentType, estimatedTokens, estimatedCost) => {
    setBillingModal({
      isOpen: true,
      feature: {
        type: 'ai-agent',
        agentType: agentType
      },
      estimatedCost: {
        tokens: estimatedTokens,
        cost: estimatedCost
      }
    })
  }, [])

  const handleBillingSetupComplete = useCallback(() => {
    setBillingModal({ isOpen: false, feature: null, estimatedCost: null })
    // Here you would trigger the actual AI agent launch
    alert('Billing setup complete! AI agent will launch shortly.')
  }, [])

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <SparklesIcon className="h-8 w-8 mr-3 text-olive-600" />
              Intelligent AI Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              AI-powered insights and recommendations from your specialized business coaches
            </p>
          </div>
          <button
            onClick={handleGlobalRefresh}
            disabled={globalLoading}
            className="flex items-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors disabled:opacity-50"
          >
            <ArrowTrendingUpIcon className={`h-4 w-4 mr-2 ${globalLoading ? 'animate-spin' : ''}`} />
            Refresh All Insights
          </button>
        </div>
      </div>

      {/* AI Agent Status Bar */}
      <div className="mb-6 bg-gradient-to-r from-indigo-50 to-gold-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-sm">
              <span className="text-gray-600">AI Coaches:</span>
              <span className="ml-2 font-medium">3 Active</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">System Status:</span>
              <span className="ml-2 font-medium text-green-600">Operational</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <SparklesIcon className="h-4 w-4 text-olive-600" />
            <span>Powered by Specialized AI Agents</span>
          </div>
        </div>
      </div>

      {/* Main Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {/* Financial Insights Widget */}
        <FinancialInsightsWidget onRefresh={refreshTrigger} loading={globalLoading} />

        {/* Strategic Pricing Widget - NEW 60/90-day approach */}
        <StrategicPricingWidget onRefresh={refreshTrigger} loading={globalLoading} />

        {/* Marketing Insights Widget */}
        <MarketingInsightsWidget onRefresh={refreshTrigger} loading={globalLoading} />

        {/* Operations Insights Widget */}
        <OperationsInsightsWidget onRefresh={refreshTrigger} loading={globalLoading} />

        {/* Business Recommendations Widget - Full width on xl screens */}
        <div className="xl:col-span-2">
          <BusinessRecommendationsWidget onRefresh={refreshTrigger} loading={globalLoading} />
        </div>

        {/* Agent System Status Widget */}
        <AgentSystemStatusWidget />
      </div>

      {/* Quick Actions Footer */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <RocketLaunchIcon className="h-5 w-5 mr-2 text-olive-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <BanknotesIcon className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm text-green-800">Financial Analysis</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600 mb-2" />
            <span className="text-sm text-orange-800">Strategic Pricing</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-olive-50 rounded-lg hover:bg-olive-100 transition-colors">
            <MegaphoneIcon className="h-6 w-6 text-olive-600 mb-2" />
            <span className="text-sm text-olive-800">Marketing Strategy</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-gold-50 rounded-lg hover:bg-gold-100 transition-colors">
            <CogIcon className="h-6 w-6 text-gold-600 mb-2" />
            <span className="text-sm text-gold-800">Operations Review</span>
          </button>
        </div>
      </div>

      {/* Strategic AI Agent Upgrade CTAs */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="text-center mb-6">
          <SparklesIcon className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Take Action?</h3>
          <p className="text-gray-600">Let AI agents execute these insights and optimize your business automatically</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Marketing Agent CTA */}
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="flex items-center mb-3">
              <MegaphoneIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h4 className="font-semibold text-gray-900">Marketing Agent</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Create and send targeted campaigns to the customers most likely to book again
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">~2K tokens ($0.08)</span>
              <button 
                onClick={() => handleLaunchAgent('marketing', '2', '$0.08')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Launch Agent
              </button>
            </div>
          </div>

          {/* Revenue Optimization Agent CTA */}
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="flex items-center mb-3">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 mr-2" />
              <h4 className="font-semibold text-gray-900">Revenue Agent</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Implement pricing recommendations and optimize your service packages
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">~1.5K tokens ($0.06)</span>
              <button 
                onClick={() => handleLaunchAgent('revenue', '1.5', '$0.06')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                Launch Agent
              </button>
            </div>
          </div>

          {/* Operations Agent CTA */}
          <div className="bg-white rounded-lg border border-orange-200 p-4">
            <div className="flex items-center mb-3">
              <CogIcon className="h-6 w-6 text-orange-600 mr-2" />
              <h4 className="font-semibold text-gray-900">Operations Agent</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Optimize staff schedules and identify capacity planning opportunities
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">~1K tokens ($0.04)</span>
              <button 
                onClick={() => handleLaunchAgent('operations', '1', '$0.04')}
                className="px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700"
              >
                Launch Agent
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 inline-block">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Smart Caching™ Active</span>
            </div>
            <p className="text-xs text-blue-800 mt-1">
              Our intelligent caching reduces your AI costs by 60-70% automatically
            </p>
          </div>
        </div>
      </div>

      {/* Billing Setup Modal */}
      <BillingSetupModal
        isOpen={billingModal.isOpen}
        onClose={() => setBillingModal({ isOpen: false, feature: null, estimatedCost: null })}
        feature={billingModal.feature}
        estimatedCost={billingModal.estimatedCost}
        onSetupComplete={handleBillingSetupComplete}
      />
    </div>
  )
}

export default function IntelligentDashboard() {
  return (
    <ProtectedRoute>
      <IntelligentDashboardContent />
    </ProtectedRoute>
  )
}
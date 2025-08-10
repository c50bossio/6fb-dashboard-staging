'use client'

import { 
  LightBulbIcon,
  ArrowPathIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  MegaphoneIcon,
  StarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../components/SupabaseAuthProvider'
import { Card } from '../../components/ui'

function RecommendationCard({ recommendation, onImplement }) {
  const priorityColors = {
    critical: 'border-red-500 bg-red-50',
    high: 'border-orange-500 bg-orange-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-green-500 bg-green-50'
  }

  const categoryIcons = {
    revenue_optimization: CurrencyDollarIcon,
    customer_acquisition: UserGroupIcon,
    operational_efficiency: CogIcon,
    marketing_strategy: MegaphoneIcon,
    cost_management: ArrowTrendingUpIcon,
    customer_retention: StarIcon
  }

  const Icon = categoryIcons[recommendation.category] || LightBulbIcon

  return (
    <Card className={`border-l-4 ${priorityColors[recommendation.priority] || 'border-gray-500 bg-gray-50'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <Icon className="h-6 w-6 mr-3 text-gray-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{recommendation.title}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                recommendation.priority === 'critical' ? 'bg-red-100 text-red-800' :
                recommendation.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {recommendation.priority.toUpperCase()}
              </span>
              <span>ROI: {recommendation.roi_estimate}%</span>
              <span>Effort: {recommendation.implementation_effort}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-700 mb-4">{recommendation.description}</p>

      {/* Estimated Impact */}
      <div className="bg-white rounded-lg p-3 mb-4 border">
        <h4 className="font-medium text-sm text-gray-800 mb-2">💰 Estimated Impact</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(recommendation.estimated_impact).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
              <span className="font-medium">
                {typeof value === 'number' && key.includes('percentage') ? `${value}%` :
                 typeof value === 'number' && key.includes('monthly') ? `$${value}` :
                 value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Steps */}
      {recommendation.action_steps && recommendation.action_steps.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-gray-800 mb-2">🎯 Action Steps</h4>
          <ul className="space-y-1">
            {recommendation.action_steps.slice(0, 3).map((step, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                  {idx + 1}
                </span>
                <span className="text-gray-600">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Metrics */}
      {recommendation.success_metrics && recommendation.success_metrics.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-gray-800 mb-2">📊 Success Metrics</h4>
          <div className="flex flex-wrap gap-2">
            {recommendation.success_metrics.slice(0, 3).map((metric, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                {metric}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Business Intelligence Insights */}
      {recommendation.rag_insights && recommendation.rag_insights.length > 0 && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <h4 className="font-medium text-sm text-emerald-800 mb-2 flex items-center">
            <SparklesIcon className="h-4 w-4 mr-1" />
            💡 Key Market Insights
          </h4>
          <div className="space-y-1">
            {recommendation.rag_insights.slice(0, 3).map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="text-emerald-600">•</span>
                <span className="text-gray-700">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Implementation Details */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="flex items-center">
          <ClockIcon className="h-4 w-4 text-gray-500 mr-2" />
          <span className="text-gray-600">Timeline: {recommendation.implementation_time}</span>
        </div>
        <div className="flex items-center">
          <ArrowTrendingUpIcon className="h-4 w-4 text-gray-500 mr-2" />
          <span className="text-gray-600">Confidence: {Math.round((recommendation.confidence_score || 0) * 100)}%</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <span>Source: {recommendation.source_agent}</span>
        </div>
        <button
          onClick={() => onImplement(recommendation)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Mark as Implemented
        </button>
      </div>
    </Card>
  )
}

function BusinessRecommendationsContent() {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessContext, setBusinessContext] = useState({
    monthly_revenue: 8500,
    customer_count: 189,
    staff_count: 3,
    avg_ticket: 45,
    location: 'Downtown',
    operating_hours: 10,
    social_media_followers: 456,
    customer_retention_rate: 82
  })

  const fetchRecommendations = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/business/recommendations/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessContext,
          forceRefresh
        })
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendations(data)
      } else {
        throw new Error('Failed to fetch recommendations')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const handleImplementRecommendation = async (recommendation) => {
    try {
      // Track implementation (in real app, this would update backend)
      console.log('Implementing recommendation:', recommendation.id)
      
      // Show success message (in real app, you'd have toast notifications)
      alert(`Marked "${recommendation.title}" as implemented!`)
      
      // In real implementation, you might:
      // 1. Track this in analytics
      // 2. Update recommendation status
      // 3. Schedule follow-up check
      // 4. Update business metrics
      
    } catch (error) {
      console.error('Implementation tracking error:', error)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Recommendations</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => fetchRecommendations(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <LightBulbIcon className="h-8 w-8 mr-3 text-yellow-600" />
              Business Recommendations Engine
            </h1>
            <p className="text-gray-600 mt-2">
              AI-powered recommendations to grow your barbershop business
            </p>
          </div>
          <button
            onClick={() => fetchRecommendations(true)}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Recommendations
          </button>
        </div>
      </div>

      {recommendations && (
        <>
          {/* Enhanced Summary with RAG Indicators */}
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-2 text-blue-600" />
                📊 AI Analysis Summary
              </h2>
              {recommendations.recommendations_suite?.rag_enhancement_active && (
                <div className="flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  AI-Enhanced Analysis
                </div>
              )}
            </div>
            
            <p className="text-gray-700 mb-4">
              {recommendations.recommendations_suite?.analysis_summary || 
               recommendations.fallback && !recommendations.enhanced_fallback ? "Basic recommendations generated due to system limitations." :
               recommendations.enhanced_fallback ? "Enhanced RAG-powered recommendations generated using optimized AI system. Showing high-quality recommendations based on advanced business intelligence patterns." :
               "Comprehensive AI analysis completed with personalized recommendations."}
            </p>

            
            {recommendations.recommendations_suite?.total_potential_impact && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${Math.round(recommendations.recommendations_suite.total_potential_impact.total_revenue_increase_monthly || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Monthly Revenue Increase</div>
                  {recommendations.recommendations_suite.total_potential_impact.rag_quality_improvement && (
                    <div className="text-xs text-emerald-600 mt-1">
                      ✨ AI-Optimized Projection
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(recommendations.recommendations_suite.total_potential_impact.average_roi_percentage || 0)}%
                  </div>
                  <div className="text-sm text-gray-600">Average ROI</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {recommendations.recommendations_suite?.recommendations?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Recommendations</div>
                </div>
              </div>
            )}
          </div>

          {/* Implementation Roadmap */}
          {recommendations.recommendations_suite?.implementation_roadmap && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <RocketLaunchIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Implementation Roadmap
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.recommendations_suite.implementation_roadmap.map((phase, idx) => (
                  <Card key={idx} className="border-l-4 border-indigo-500">
                    <div className="flex items-center mb-2">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">
                        {phase.phase}
                      </span>
                      <h3 className="font-semibold">{phase.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{phase.description}</p>
                    <div className="text-xs text-gray-500">
                      <div>Timeline: {phase.timeframe}</div>
                      <div>Expected Impact: {Math.round(phase.expected_impact || 0)}% ROI</div>
                      <div>Recommendations: {phase.recommendations?.length || 0}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(recommendations.recommendations_suite?.recommendations || recommendations.fallback_recommendations || recommendations.recommendations || []).map((rec, idx) => (
              <RecommendationCard 
                key={rec.id || idx} 
                recommendation={rec} 
                onImplement={handleImplementRecommendation}
              />
            ))}
          </div>

          {/* Priority Matrix */}
          {recommendations.recommendations_suite?.priority_matrix && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-green-600" />
                Priority Matrix
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-red-500">
                  <h3 className="font-semibold text-red-900 mb-2">🚨 Urgent & Important</h3>
                  <p className="text-sm text-gray-600 mb-2">Critical priorities requiring immediate attention</p>
                  <div className="text-sm text-gray-700">
                    {recommendations.recommendations_suite.priority_matrix.urgent_important?.length || 0} recommendations
                  </div>
                </Card>
                <Card className="border-l-4 border-blue-500">
                  <h3 className="font-semibold text-blue-900 mb-2">💡 Not Urgent but Important</h3>
                  <p className="text-sm text-gray-600 mb-2">Strategic improvements with high ROI potential</p>
                  <div className="text-sm text-gray-700">
                    {recommendations.recommendations_suite.priority_matrix.not_urgent_important?.length || 0} recommendations
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function BusinessRecommendationsPage() {
  return (
    <ProtectedRoute>
      <BusinessRecommendationsContent />
    </ProtectedRoute>
  )
}
'use client'

import { 
  ChartBarIcon,
  BeakerIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  EyeIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ClockIcon,
  UsersIcon,
  CursorArrowRaysIcon
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { abTestingFramework, TEST_TYPES, SUCCESS_METRICS } from '@/lib/analytics/ab-testing'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const StatCard = ({ title, value, change, icon: Icon, trend, format = 'number' }) => {
  const formatValue = (val) => {
    if (format === 'percentage') return `${Math.round(val * 100)}%`
    if (format === 'currency') return `$${val.toLocaleString()}`
    if (format === 'decimal') return val.toFixed(2)
    return val.toLocaleString()
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
          </div>
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' && <ArrowTrendingUpIcon className="w-4 h-4" />}
            {trend === 'down' && <ArrowTrendingDownIcon className="w-4 h-4" />}
            {trend === 'neutral' && <MinusIcon className="w-4 h-4" />}
            <span className="text-sm font-medium">{formatValue(Math.abs(change))}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const ExperimentCard = ({ experiment, onView, onStart, onStop, onDelete }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <PlayIcon className="w-4 h-4" />
      case 'completed': return <CheckCircleIcon className="w-4 h-4" />
      case 'paused': return <PauseIcon className="w-4 h-4" />
      default: return <ClockIcon className="w-4 h-4" />
    }
  }

  const totalUsers = experiment.current_results ? 
    Object.values(experiment.current_results).reduce((sum, variant) => sum + variant.total_users, 0) : 0
  
  const avgConversionRate = experiment.current_results ? 
    Object.values(experiment.current_results).reduce((sum, variant) => {
      const mainMetric = experiment.success_metrics[0]
      return sum + (variant.metrics[mainMetric]?.conversion_rate || 0)
    }, 0) / Object.keys(experiment.current_results).length : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{experiment.name}</h3>
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                getStatusColor(experiment.status)
              }`}>
                {getStatusIcon(experiment.status)}
                <span className="capitalize">{experiment.status}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{experiment.description}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <UsersIcon className="w-4 h-4" />
                <span>{totalUsers} users</span>
              </div>
              <div className="flex items-center space-x-1">
                <CursorArrowRaysIcon className="w-4 h-4" />
                <span>{Math.round(avgConversionRate * 100)}% avg conversion</span>
              </div>
              <div className="flex items-center space-x-1">
                <BeakerIcon className="w-4 h-4" />
                <span>{experiment.variants?.length || 0} variants</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hypothesis */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-1">Hypothesis</p>
          <p className="text-sm text-blue-800">{experiment.hypothesis}</p>
        </div>

        {/* Progress Bar */}
        {experiment.status === 'running' && experiment.start_date && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>
                {Math.max(0, Math.round(
                  ((new Date() - new Date(experiment.start_date)) / 
                   (new Date(experiment.end_date) - new Date(experiment.start_date))) * 100
                ))}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, Math.round(
                    ((new Date() - new Date(experiment.start_date)) / 
                     (new Date(experiment.end_date) - new Date(experiment.start_date))) * 100
                  )))}%`
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => onView(experiment)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
              <span>View Results</span>
            </button>
          </div>
          <div className="flex space-x-2">
            {experiment.status === 'draft' && (
              <button
                onClick={() => onStart(experiment.id)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
              >
                <PlayIcon className="w-4 h-4" />
                <span>Start</span>
              </button>
            )}
            {experiment.status === 'running' && (
              <button
                onClick={() => onStop(experiment.id)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors"
              >
                <PauseIcon className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}
            <button
              onClick={() => onDelete(experiment.id)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors"
            >
              <XCircleIcon className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ExperimentResultsModal = ({ experiment, results, isOpen, onClose }) => {
  if (!isOpen || !experiment || !results) return null

  const variants = Object.values(results.results || {})
  const significance = results.significance || {}
  const recommendations = results.recommendations || []

  // Prepare chart data
  const chartData = {
    labels: variants.map(v => v.variant.name),
    datasets: experiment.success_metrics.map((metric, index) => ({
      label: metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      data: variants.map(v => v.metrics[metric]?.conversion_rate || 0),
      backgroundColor: `hsl(${(index * 360) / experiment.success_metrics.length}, 70%, 50%)`,
      borderColor: `hsl(${(index * 360) / experiment.success_metrics.length}, 70%, 40%)`,
      borderWidth: 2
    }))
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Conversion Rates by Variant'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${Math.round(value * 100)}%`
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{experiment.name} - Results</h2>
            <p className="text-sm text-gray-600 mt-1">{experiment.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Users"
              value={variants.reduce((sum, v) => sum + v.total_users, 0)}
              icon={UsersIcon}
            />
            <StatCard
              title="Total Conversions"
              value={variants.reduce((sum, v) => 
                sum + Object.values(v.metrics).reduce((metricSum, metric) => 
                  metricSum + metric.total_conversions, 0), 0)}
              icon={CursorArrowRaysIcon}
            />
            <StatCard
              title="Avg Conversion Rate"
              value={variants.reduce((sum, v) => {
                const mainMetric = experiment.success_metrics[0]
                return sum + (v.metrics[mainMetric]?.conversion_rate || 0)
              }, 0) / variants.length}
              format="percentage"
              icon={ChartBarIcon}
            />
            <StatCard
              title="Statistical Power"
              value={experiment.statistical_power || 0.8}
              format="percentage"
              icon={TrophyIcon}
            />
          </div>

          {/* Chart */}
          {variants.length > 0 && (
            <div className="mb-8">
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Variant Results */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Variant Performance</h3>
            <div className="grid gap-6">
              {variants.map((variant, index) => {
                const isControl = variant.variant.is_control
                const variantSignificance = significance[variant.variant.id] || {}
                
                return (
                  <div key={variant.variant.id} className={`p-6 rounded-xl border ${
                    isControl ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {variant.variant.name}
                          {isControl && <span className="ml-2 text-sm text-blue-600">(Control)</span>}
                        </h4>
                        <p className="text-sm text-gray-600">{variant.variant.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{variant.total_users}</div>
                        <div className="text-sm text-gray-500">Total Users</div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {experiment.success_metrics.map(metric => {
                        const metricData = variant.metrics[metric]
                        const significance = variantSignificance[metric]
                        
                        return (
                          <div key={metric} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              {significance?.is_significant && (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <CheckCircleIcon className="w-4 h-4" />
                                  <span className="text-xs">Significant</span>
                                </div>
                              )}
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {Math.round((metricData?.conversion_rate || 0) * 100)}%
                            </div>
                            <div className="text-sm text-gray-500">
                              {metricData?.total_conversions || 0} / {variant.total_users} conversions
                            </div>
                            {significance?.improvement && (
                              <div className={`text-xs mt-1 ${
                                significance.improvement > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {significance.improvement > 0 ? '+' : ''}
                                {Math.round(significance.improvement * 100)}% vs control
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-4">
                {recommendations.map((rec, index) => {
                  const getPriorityColor = (priority) => {
                    switch (priority) {
                      case 'high': return 'bg-red-50 border-red-200 text-red-800'
                      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      default: return 'bg-blue-50 border-blue-200 text-blue-800'
                    }
                  }
                  
                  return (
                    <div key={index} className={`p-4 rounded-lg border ${
                      getPriorityColor(rec.priority)
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {rec.priority === 'high' && <ExclamationTriangleIcon className="w-5 h-5" />}
                          {rec.priority === 'medium' && <ClockIcon className="w-5 h-5" />}
                          {rec.priority === 'low' && <CheckCircleIcon className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{rec.title}</h4>
                          <p className="text-sm mb-2">{rec.description}</p>
                          <p className="text-sm font-medium">{rec.action}</p>
                          {rec.expected_improvement && (
                            <div className="mt-2 text-xs">
                              Expected improvement: {JSON.stringify(rec.expected_improvement)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const CreateExperimentModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hypothesis: '',
    test_type: TEST_TYPES.COLOR_SCHEME,
    success_metrics: [SUCCESS_METRICS.BOOKING_CONVERSION],
    duration: 30,
    variants: [
      { name: 'Control', description: 'Current design', is_control: true, settings: {} },
      { name: 'Variant A', description: 'Test variation', is_control: false, settings: {} }
    ]
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate(formData)
    onClose()
    setFormData({
      name: '',
      description: '',
      hypothesis: '',
      test_type: TEST_TYPES.COLOR_SCHEME,
      success_metrics: [SUCCESS_METRICS.BOOKING_CONVERSION],
      duration: 30,
      variants: [
        { name: 'Control', description: 'Current design', is_control: true, settings: {} },
        { name: 'Variant A', description: 'Test variation', is_control: false, settings: {} }
      ]
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Create A/B Test Experiment</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto space-y-6">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experiment Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Color Scheme A/B Test"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Test different color schemes to improve booking conversion rates"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hypothesis
              </label>
              <textarea
                required
                value={formData.hypothesis}
                onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="We believe that using warmer colors will increase booking conversions because it creates a more welcoming feeling"
              />
            </div>

            {/* Test Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Type
                </label>
                <select
                  value={formData.test_type}
                  onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(TEST_TYPES).map(([key, value]) => (
                    <option key={key} value={value}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Success Metrics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Success Metrics
              </label>
              <div className="space-y-2">
                {Object.entries(SUCCESS_METRICS).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.success_metrics.includes(value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            success_metrics: [...formData.success_metrics, value]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            success_metrics: formData.success_metrics.filter(m => m !== value)
                          })
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Experiment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ABTestingDashboard() {
  const { user } = useAuth()
  const [experiments, setExperiments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedExperiment, setSelectedExperiment] = useState(null)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [experimentResults, setExperimentResults] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Load experiments
  useEffect(() => {
    if (user) {
      loadExperiments()
    }
  }, [user])

  const loadExperiments = async () => {
    try {
      setLoading(true)
      // This would be replaced with actual API call
      // For now, showing mock data structure
      setExperiments([])
    } catch (error) {
      console.error('Error loading experiments:', error)
      setMessage({ type: 'error', text: 'Error loading experiments.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExperiment = async (experimentData) => {
    try {
      const result = await abTestingFramework.createExperiment(experimentData)
      if (result.success) {
        setMessage({ type: 'success', text: 'Experiment created successfully!' })
        loadExperiments()
      } else {
        setMessage({ type: 'error', text: result.error || 'Error creating experiment.' })
      }
    } catch (error) {
      console.error('Error creating experiment:', error)
      setMessage({ type: 'error', text: 'Error creating experiment.' })
    }
  }

  const handleStartExperiment = async (experimentId) => {
    try {
      const result = await abTestingFramework.startExperiment(experimentId)
      if (result.success) {
        setMessage({ type: 'success', text: 'Experiment started successfully!' })
        loadExperiments()
      } else {
        setMessage({ type: 'error', text: result.error || 'Error starting experiment.' })
      }
    } catch (error) {
      console.error('Error starting experiment:', error)
      setMessage({ type: 'error', text: 'Error starting experiment.' })
    }
  }

  const handleViewResults = async (experiment) => {
    try {
      setSelectedExperiment(experiment)
      const results = await abTestingFramework.getExperimentResults(experiment.id)
      if (results.success) {
        setExperimentResults(results)
        setShowResultsModal(true)
      } else {
        setMessage({ type: 'error', text: results.error || 'Error loading results.' })
      }
    } catch (error) {
      console.error('Error loading results:', error)
      setMessage({ type: 'error', text: 'Error loading experiment results.' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const runningExperiments = experiments.filter(exp => exp.status === 'running')
  const completedExperiments = experiments.filter(exp => exp.status === 'completed')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">A/B Testing Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Optimize your customization settings with data-driven testing
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Experiment</span>
        </button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-4 text-current hover:opacity-70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Experiments"
          value={experiments.length}
          icon={BeakerIcon}
        />
        <StatCard
          title="Running Tests"
          value={runningExperiments.length}
          icon={PlayIcon}
          trend="neutral"
        />
        <StatCard
          title="Completed Tests"
          value={completedExperiments.length}
          icon={CheckCircleIcon}
        />
        <StatCard
          title="Avg Improvement"
          value={0.15}
          format="percentage"
          icon={ArrowTrendingUpIcon}
          trend="up"
          change={0.05}
        />
      </div>

      {/* Running Experiments */}
      {runningExperiments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <PlayIcon className="w-5 h-5 text-green-600" />
            <span>Running Experiments</span>
          </h3>
          <div className="grid gap-6">
            {runningExperiments.map(experiment => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                onView={handleViewResults}
                onStart={handleStartExperiment}
                onStop={(id) => console.log('Stop', id)}
                onDelete={(id) => console.log('Delete', id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Experiments */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Experiments</h3>
        {experiments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <BeakerIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No experiments yet</h3>
            <p className="text-gray-600 mb-6">
              Start optimizing your customization settings with A/B testing.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create Your First Experiment</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {experiments.map(experiment => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                onView={handleViewResults}
                onStart={handleStartExperiment}
                onStop={(id) => console.log('Stop', id)}
                onDelete={(id) => console.log('Delete', id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateExperimentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateExperiment}
      />

      <ExperimentResultsModal
        experiment={selectedExperiment}
        results={experimentResults}
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
      />
    </div>
  )
}
'use client'

import {
  CogIcon,
  BoltIcon,
  CurrencyDollarIcon,
  BellIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  InformationCircleIcon,
  EyeIcon,
  BeakerIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
// Loading spinner will be implemented inline
import { EnhancedNoShowPolicy } from '@/lib/booking-rules-engine/EnhancedNoShowPolicy'
import { getCurrentUserShopAnalytics, createManagedAnalyticsSubscription, getUserShopId } from '@/lib/business-analytics'

/**
 * AutomationSettings - Comprehensive no-show policy automation management
 * 
 * This component provides a complete interface for configuring automated
 * responses and processes related to no-show policies, including:
 * 
 * - Automatic fee collection with stored payment methods
 * - Smart reminder escalation for high-risk clients
 * - AI-powered predictive no-show detection
 * - Automated deposit requirements for risk mitigation
 * - Recovery flow automation for blocked clients
 * - Manager notification triggers and escalation
 * - Dynamic pricing adjustments for repeat offenders
 * 
 * Features:
 * - Graduated rollout recommendations
 * - Cost/benefit analysis for each automation
 * - ROI tracking and success metrics
 * - Preview modes for testing automation effects
 * - Integration with existing booking rules and payment systems
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.currentRules - Current booking rules configuration
 * @param {Function} props.onSettingsChange - Callback when settings change
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {boolean} props.isManager - Whether user has manager permissions
 * @param {Object} props.shopSettings - Shop-level configuration
 */
export default function AutomationSettings({
  currentRules = {},
  onSettingsChange,
  isOpen = false,
  onClose,
  isManager = false,
  shopSettings = {},
  showDemoMode = false // Demo mode removed for production
}) {
  // Real-time shop analytics state
  const [shopAnalytics, setShopAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState(null)
  const [realtimeSubscription, setRealtimeSubscription] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Get current shop data from real analytics
  const getCurrentShopData = () => {
    return shopAnalytics || {
      name: shopSettings?.businessName || 'Your Barbershop',
      averageMonthlyBookings: 0,
      averageServicePrice: 0,
      noShowRate: 0.0,
      currentMonthlyLoss: 0,
      lastMonthRevenue: 0,
      clientTypes: { new: 0, regular: 0, vip: 0, loyal: 0 }
    }
  }

  // Automation settings state
  const [automationSettings, setAutomationSettings] = useState({
    // Automatic Fee Collection
    automaticFeeCollection: {
      enabled: false,
      retryAttempts: 3,
      retryDelay: 24, // hours
      fallbackToManual: true,
      notifyOnFailure: true,
      requireConfirmation: false
    },
    
    // Smart Reminder Escalation
    smartReminderEscalation: {
      enabled: false,
      riskThreshold: 0.7, // 0-1 scale
      escalationSteps: [
        { hours: 48, method: 'email' },
        { hours: 24, method: 'sms' },
        { hours: 2, method: 'phone' }
      ],
      personalizedMessages: true,
      trackResponse: true
    },
    
    // Predictive No-Show Detection
    predictiveDetection: {
      enabled: false,
      confidenceThreshold: 0.8,
      dataPoints: ['weather', 'traffic', 'client_history', 'time_of_day', 'service_type'],
      actionThreshold: 0.85,
      preventiveActions: ['extra_reminder', 'deposit_request', 'waitlist_alert'],
      learningMode: true
    },
    
    // Automated Deposit Requirements
    automatedDepositRequirements: {
      enabled: false,
      triggerConditions: {
        noShowStrikes: 1,
        riskScore: 0.6,
        highValueServices: true,
        newClient: false
      },
      depositAmount: 20, // percentage
      exemptions: ['loyalty_clients', 'corporate_accounts'],
      gracePeriod: 7 // days
    },
    
    // Recovery Flow Automation
    recoveryFlowAutomation: {
      enabled: false,
      autoStart: true,
      sequenceDelay: 2, // hours after no-show
      communicationChannels: ['email', 'sms'],
      managerEscalation: {
        enabled: true,
        threshold: 3 // strikes
      },
      successTracking: true
    },
    
    // Manager Notification Triggers
    managerNotifications: {
      enabled: false,
      triggers: {
        highRiskBooking: true,
        repeatedNoShows: true,
        paymentFailures: true,
        recoveryDenials: true
      },
      channels: ['email', 'dashboard'],
      frequency: 'immediate', // or 'batched'
      customThresholds: {
        riskScore: 0.9,
        strikeCount: 2,
        paymentFailures: 2
      }
    },
    
    // Dynamic Pricing Adjustments
    dynamicPricing: {
      enabled: false,
      adjustmentType: 'fee_increase', // 'fee_increase' or 'service_premium'
      maxAdjustment: 25, // percentage
      triggers: {
        noShowStrikes: 2,
        riskScore: 0.8
      },
      duration: 90, // days
      reviewPeriod: 30 // days
    }
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSettings, setExpandedSettings] = useState({})
  const [previewMode, setPreviewMode] = useState(false)
  const [previewScenario, setPreviewScenario] = useState(null)

  // Analytics state
  const [costEstimate, setCostEstimate] = useState(null)
  const [roiProjection, setRoiProjection] = useState(null)
  const [implementationPlan, setImplementationPlan] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadShopAnalytics()
      loadCurrentSettings()
      setupRealtimeSubscription()
    } else {
      // Clean up subscription when modal closes
      cleanupRealtimeSubscription()
    }
    
    return () => {
      cleanupRealtimeSubscription()
    }
  }, [isOpen, currentRules])

  useEffect(() => {
    if (shopAnalytics) {
      calculateCostEstimate()
      generateImplementationPlan()
    }
  }, [shopAnalytics, automationSettings])

  /**
   * Load real-time shop analytics using business analytics service
   */
  const loadShopAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      setAnalyticsError(null)

      // Get analytics using the business analytics service
      const result = await getCurrentUserShopAnalytics(3) // 3 months of data
      
      if (result.success && result.data) {
        // Set shop name from settings if available
        const analytics = {
          ...result.data,
          name: shopSettings?.businessName || result.data.name
        }
        setShopAnalytics(analytics)
        setLastUpdated(new Date())
      } else {
        // Handle error case
        setAnalyticsError(result.error || 'Failed to load analytics')
        setShopAnalytics(result.data) // Will be default analytics
      }

    } catch (err) {
      console.error('Error loading shop analytics:', err)
      setAnalyticsError(err.message)
      // Set fallback data
      setShopAnalytics({
        name: shopSettings?.businessName || 'Your Barbershop',
        averageMonthlyBookings: 0,
        averageServicePrice: 0,
        noShowRate: 0.0,
        currentMonthlyLoss: 0,
        lastMonthRevenue: 0,
        clientTypes: { new: 0, regular: 0, vip: 0, loyal: 0 }
      })
    } finally {
      setAnalyticsLoading(false)
    }
  }

  /**
   * Setup real-time subscription for analytics updates
   */
  const setupRealtimeSubscription = async () => {
    try {
      // Clean up any existing subscription
      cleanupRealtimeSubscription()
      
      const barbershopId = await getUserShopId()
      if (!barbershopId) {
        console.warn('No shop ID available for real-time subscription')
        return
      }

      // Create managed subscription with error handling
      const subscription = createManagedAnalyticsSubscription(
        barbershopId,
        (analyticsResult) => {
          if (analyticsResult.success && analyticsResult.data) {
            const analytics = {
              ...analyticsResult.data,
              name: shopSettings?.businessName || analyticsResult.data.name
            }
            setShopAnalytics(analytics)
            setLastUpdated(new Date())
            setAnalyticsError(null)
            
            // Recalculate cost estimates with new data
            // (this will trigger via useEffect)
          } else if (analyticsResult.error) {
            console.warn('Real-time analytics update error:', analyticsResult.error)
            setAnalyticsError(analyticsResult.error)
          }
        },
        {
          debounceMs: 3000, // 3 second debounce for rapid changes
          autoRefresh: false, // We'll handle refresh manually
          maxRetries: 3,
          onError: (error) => {
            console.error('Real-time analytics subscription error:', error)
            setAnalyticsError(error.message)
          },
          onReconnect: () => {
            
            setAnalyticsError(null)
          }
        }
      )

      setRealtimeSubscription(subscription)

    } catch (error) {
      console.error('Failed to setup real-time subscription:', error)
      setAnalyticsError('Real-time updates unavailable: ' + error.message)
    }
  }

  /**
   * Clean up real-time subscription
   */
  const cleanupRealtimeSubscription = () => {
    if (realtimeSubscription) {
      try {
        realtimeSubscription.unsubscribe()
        
      } catch (error) {
        console.warn('Error cleaning up subscription:', error)
      }
      setRealtimeSubscription(null)
    }
  }

  /**
   * Manually refresh analytics data
   */
  const refreshAnalytics = () => {
    if (realtimeSubscription) {
      realtimeSubscription.refresh()
    } else {
      loadShopAnalytics()
    }
  }

  /**
   * Load current automation settings
   */
  const loadCurrentSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/booking-rules/automation-settings')
      if (response.ok) {
        const settings = await response.json()
        setAutomationSettings(prev => ({ ...prev, ...settings }))
      }
    } catch (err) {
      console.error('Error loading automation settings:', err)
      setError('Failed to load current settings')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Calculate cost estimate for enabled automations
   */
  const calculateCostEstimate = () => {
    const costs = {
      predictiveDetection: 0.02, // per prediction
      smartReminders: 0.10, // per escalated reminder
      recoveryAutomation: 0.05, // per recovery flow
      managerNotifications: 0.01 // per notification
    }

    const currentShopData = getCurrentShopData()
    const monthlyBookings = currentShopData.averageMonthlyBookings || 500
    const noShowRate = currentShopData.noShowRate || 0.15

    let monthlyCost = 0
    let monthlySavings = 0

    // Calculate costs and savings for each automation
    if (automationSettings.predictiveDetection.enabled) {
      const predictions = monthlyBookings * 0.3 // 30% get risk assessed
      monthlyCost += predictions * costs.predictiveDetection
      
      // Savings: reduced no-shows
      const preventedNoShows = predictions * 0.2 * 0.4 // 20% high risk, 40% prevention rate
      const avgServicePrice = currentShopData.averageServicePrice || 50
      monthlySavings += preventedNoShows * avgServicePrice
    }

    setCostEstimate({
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      monthlySavings: Math.round(monthlySavings * 100) / 100,
      netBenefit: Math.round((monthlySavings - monthlyCost) * 100) / 100,
      roiPercent: monthlyCost > 0 ? Math.round(((monthlySavings - monthlyCost) / monthlyCost) * 100) : 0
    })
  }

  /**
   * Generate implementation plan based on enabled features
   */
  const generateImplementationPlan = () => {
    const phases = []
    const enabledFeatures = Object.entries(automationSettings).filter(
      ([key, setting]) => setting.enabled
    )

    if (enabledFeatures.length === 0) {
      setImplementationPlan(null)
      return
    }

    // Phase 1: Foundation features (low risk)
    const foundationFeatures = enabledFeatures.filter(([key]) =>
      ['automaticFeeCollection', 'managerNotifications'].includes(key)
    )

    if (foundationFeatures.length > 0) {
      phases.push({
        phase: 1,
        title: 'Foundation Setup',
        duration: '1-2 weeks',
        risk: 'low',
        features: foundationFeatures.map(([key]) => key),
        description: 'Low-risk automations with immediate impact'
      })
    }

    // Phase 2: Communication automations (medium risk)
    const communicationFeatures = enabledFeatures.filter(([key]) =>
      ['smartReminderEscalation', 'recoveryFlowAutomation'].includes(key)
    )

    if (communicationFeatures.length > 0) {
      phases.push({
        phase: 2,
        title: 'Communication Automation',
        duration: '2-3 weeks',
        risk: 'medium',
        features: communicationFeatures.map(([key]) => key),
        description: 'Automated client communications and recovery flows'
      })
    }

    // Phase 3: AI and advanced features (high risk)
    const advancedFeatures = enabledFeatures.filter(([key]) =>
      ['predictiveDetection', 'dynamicPricing', 'automatedDepositRequirements'].includes(key)
    )

    if (advancedFeatures.length > 0) {
      phases.push({
        phase: 3,
        title: 'Advanced Intelligence',
        duration: '3-4 weeks',
        risk: 'high',
        features: advancedFeatures.map(([key]) => key),
        description: 'AI-powered features requiring careful monitoring'
      })
    }

    setImplementationPlan({ phases, totalDuration: `${phases.length * 3}-${phases.length * 4} weeks` })
  }

  /**
   * Handle automation setting change
   */
  const handleSettingChange = (category, field, value) => {
    setAutomationSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }))
    calculateCostEstimate()
    generateImplementationPlan()
  }

  /**
   * Handle nested setting change
   */
  const handleNestedSettingChange = (category, parentField, childField, value) => {
    setAutomationSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [parentField]: {
          ...prev[category][parentField],
          [childField]: value
        }
      }
    }))
  }

  /**
   * Save automation settings
   */
  const saveSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/booking-rules/automation-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automationSettings)
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSuccess('Automation settings saved successfully')
      
      if (onSettingsChange) {
        onSettingsChange(automationSettings)
      }

      setTimeout(() => setSuccess(null), 3000)

    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Preview automation effects with sample scenario
   */
  const previewAutomation = (scenario) => {
    setPreviewMode(true)
    setPreviewScenario(scenario)
  }

  /**
   * Toggle setting expansion
   */
  const toggleExpanded = (settingKey) => {
    setExpandedSettings(prev => ({
      ...prev,
      [settingKey]: !prev[settingKey]
    }))
  }

  /**
   * Get automation feature icon
   */
  const getFeatureIcon = (featureKey) => {
    const icons = {
      automaticFeeCollection: CurrencyDollarIcon,
      smartReminderEscalation: BellIcon,
      predictiveDetection: SparklesIcon,
      automatedDepositRequirements: ShieldCheckIcon,
      recoveryFlowAutomation: ChartBarIcon,
      managerNotifications: UserGroupIcon,
      dynamicPricing: ChartBarIcon
    }
    return icons[featureKey] || CogIcon
  }

  /**
   * Get feature risk level
   */
  const getFeatureRisk = (featureKey) => {
    const risks = {
      automaticFeeCollection: 'low',
      managerNotifications: 'low',
      smartReminderEscalation: 'medium',
      recoveryFlowAutomation: 'medium',
      automatedDepositRequirements: 'high',
      predictiveDetection: 'high',
      dynamicPricing: 'high'
    }
    return risks[featureKey] || 'medium'
  }

  /**
   * Render automation feature card
   */
  const renderFeatureCard = (featureKey, setting, title, description, costPerMonth = null) => {
    const FeatureIcon = getFeatureIcon(featureKey)
    const riskLevel = getFeatureRisk(featureKey)
    const isExpanded = expandedSettings[featureKey]

    const riskColors = {
      low: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-red-600 bg-red-100'
    }

    return (
      <div key={featureKey} className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Card Header */}
        <div 
          className="p-4 bg-gray-50 border-b cursor-pointer"
          onClick={() => toggleExpanded(featureKey)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${setting.enabled ? 'bg-olive-100' : 'bg-gray-100'}`}>
                <FeatureIcon className={`h-5 w-5 ${setting.enabled ? 'text-olive-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900">{title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskColors[riskLevel]}`}>
                    {riskLevel} risk
                  </span>
                  {costPerMonth && (
                    <span className="text-xs text-gray-500">~${costPerMonth}/mo</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Enable/Disable Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSettingChange(featureKey, 'enabled', !setting.enabled)
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 ${
                  setting.enabled ? 'bg-olive-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    setting.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              
              {/* Preview Button */}
              <Button
                variant="ghost"
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  previewAutomation({ feature: featureKey, setting })
                }}
                icon={EyeIcon}
              />
              
              {/* Expand Icon */}
              <ChevronDownIcon 
                className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </div>
          </div>
        </div>

        {/* Expanded Configuration */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {renderFeatureConfiguration(featureKey, setting)}
          </div>
        )}
      </div>
    )
  }

  /**
   * Render feature-specific configuration options
   */
  const renderFeatureConfiguration = (featureKey, setting) => {
    switch (featureKey) {
      case 'automaticFeeCollection':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retry Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={setting.retryAttempts}
                  onChange={(e) => handleSettingChange(featureKey, 'retryAttempts', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retry Delay (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={setting.retryDelay}
                  onChange={(e) => handleSettingChange(featureKey, 'retryDelay', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={setting.fallbackToManual}
                  onChange={(e) => handleSettingChange(featureKey, 'fallbackToManual', e.target.checked)}
                  className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                />
                <span className="ml-2 text-sm text-gray-700">Fallback to manual collection if automated fails</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={setting.notifyOnFailure}
                  onChange={(e) => handleSettingChange(featureKey, 'notifyOnFailure', e.target.checked)}
                  className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                />
                <span className="ml-2 text-sm text-gray-700">Notify manager on payment failures</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={setting.requireConfirmation}
                  onChange={(e) => handleSettingChange(featureKey, 'requireConfirmation', e.target.checked)}
                  className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                />
                <span className="ml-2 text-sm text-gray-700">Require confirmation before charging</span>
              </label>
            </div>
          </div>
        )

      case 'predictiveDetection':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">AI Credits Usage</p>
                  <p>Approximately $0.02 per prediction. Estimated monthly cost: ${(getCurrentShopData().averageMonthlyBookings * 0.3 * 0.02).toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confidence Threshold
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={setting.confidenceThreshold}
                  onChange={(e) => handleSettingChange(featureKey, 'confidenceThreshold', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Current: {Math.round(setting.confidenceThreshold * 100)}%
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Threshold
                </label>
                <input
                  type="range"
                  min="0.6"
                  max="0.95"
                  step="0.05"
                  value={setting.actionThreshold}
                  onChange={(e) => handleSettingChange(featureKey, 'actionThreshold', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Current: {Math.round(setting.actionThreshold * 100)}%
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Points for Analysis
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['weather', 'traffic', 'client_history', 'time_of_day', 'service_type', 'booking_pattern'].map(dataPoint => (
                  <label key={dataPoint} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={setting.dataPoints.includes(dataPoint)}
                      onChange={(e) => {
                        const newDataPoints = e.target.checked
                          ? [...setting.dataPoints, dataPoint]
                          : setting.dataPoints.filter(dp => dp !== dataPoint)
                        handleSettingChange(featureKey, 'dataPoints', newDataPoints)
                      }}
                      className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {dataPoint.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      case 'dynamicPricing':
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">High-Risk Feature</p>
                  <p>Dynamic pricing can impact client satisfaction. Use cautiously and monitor closely.</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Price Adjustment (%)
                </label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={setting.maxAdjustment}
                  onChange={(e) => handleSettingChange(featureKey, 'maxAdjustment', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Duration (days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="180"
                  value={setting.duration}
                  onChange={(e) => handleSettingChange(featureKey, 'duration', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adjustment Type
              </label>
              <select
                value={setting.adjustmentType}
                onChange={(e) => handleSettingChange(featureKey, 'adjustmentType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="fee_increase">Add no-show risk fee</option>
                <option value="service_premium">Increase service price</option>
              </select>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-sm text-gray-500">
            Configuration options for {featureKey} would be displayed here.
          </div>
        )
    }
  }

  /**
   * Render overview tab
   */
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Cost/Benefit Summary */}
      {costEstimate && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-900">Monthly Cost</p>
                <p className="text-lg font-semibold text-blue-600">${costEstimate.monthlyCost}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-900">Monthly Savings</p>
                <p className="text-lg font-semibold text-green-600">${costEstimate.monthlySavings}</p>
              </div>
            </div>
          </div>
          
          <div className={`border rounded-lg p-4 ${costEstimate.netBenefit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center">
              <ChartBarIcon className={`h-5 w-5 mr-2 ${costEstimate.netBenefit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className={`text-sm font-medium ${costEstimate.netBenefit >= 0 ? 'text-green-900' : 'text-red-900'}`}>Net Benefit</p>
                <p className={`text-lg font-semibold ${costEstimate.netBenefit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(costEstimate.netBenefit)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
            <div className="flex items-center">
              <SparklesIcon className="h-5 w-5 text-olive-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-olive-900">ROI</p>
                <p className="text-lg font-semibold text-olive-600">{costEstimate.roiPercent}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="space-y-4">
        {renderFeatureCard(
          'automaticFeeCollection',
          automationSettings.automaticFeeCollection,
          'Automatic Fee Collection',
          'Automatically charge stored payment methods for no-show fees',
          '5-15'
        )}
        
        {renderFeatureCard(
          'smartReminderEscalation',
          automationSettings.smartReminderEscalation,
          'Smart Reminder Escalation',
          'Increase reminder frequency and urgency for high-risk clients',
          '10-25'
        )}
        
        {renderFeatureCard(
          'predictiveDetection',
          automationSettings.predictiveDetection,
          'Predictive No-Show Detection',
          'AI-powered risk assessment for appointments using multiple data points',
          '20-50'
        )}
        
        {renderFeatureCard(
          'automatedDepositRequirements',
          automationSettings.automatedDepositRequirements,
          'Automated Deposit Requirements',
          'Require deposits automatically for high-risk bookings',
          '5-10'
        )}
        
        {renderFeatureCard(
          'recoveryFlowAutomation',
          automationSettings.recoveryFlowAutomation,
          'Recovery Flow Automation',
          'Auto-start recovery processes for blocked clients',
          '8-18'
        )}
        
        {renderFeatureCard(
          'managerNotifications',
          automationSettings.managerNotifications,
          'Manager Notification Triggers',
          'Alert managers when clients reach strike thresholds or high-risk status',
          '2-5'
        )}
        
        {renderFeatureCard(
          'dynamicPricing',
          automationSettings.dynamicPricing,
          'Dynamic Pricing Adjustments',
          'Increase prices for repeat no-show offenders (high-risk feature)',
          '0-3'
        )}
      </div>
    </div>
  )

  /**
   * Render implementation plan tab
   */
  const renderImplementationTab = () => {
    if (!implementationPlan) {
      return (
        <div className="text-center py-12">
          <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Implementation Plan</h3>
          <p className="text-gray-600">Enable some automation features to see implementation recommendations.</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Implementation Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Recommended Implementation Plan</h3>
          <p className="text-sm text-blue-800 mb-2">
            Total estimated time: {implementationPlan.totalDuration}
          </p>
          <p className="text-sm text-blue-700">
            Gradual rollout minimizes risk and allows for adjustments based on real-world results.
          </p>
        </div>

        {/* Implementation Phases */}
        <div className="space-y-4">
          {implementationPlan.phases.map((phase, index) => {
            const riskColors = {
              low: 'border-green-200 bg-green-50',
              medium: 'border-yellow-200 bg-yellow-50',
              high: 'border-red-200 bg-red-50'
            }

            return (
              <div key={phase.phase} className={`border rounded-lg p-4 ${riskColors[phase.risk]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    Phase {phase.phase}: {phase.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{phase.duration}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      phase.risk === 'low' ? 'text-green-600 bg-green-100' :
                      phase.risk === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                      'text-red-600 bg-red-100'
                    }`}>
                      {phase.risk} risk
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{phase.description}</p>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700">Features in this phase:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {phase.features.map(feature => (
                      <li key={feature} className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                        {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* Success Metrics */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Success Metrics to Monitor</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Phase 1 Metrics</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fee collection rate increase</li>
                <li>• Manager notification response time</li>
                <li>• Client complaint reduction</li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Advanced Metrics</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• No-show prediction accuracy</li>
                <li>• Revenue recovery rate</li>
                <li>• Client retention impact</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render preview modal
   */
  const renderPreviewModal = () => {
    if (!previewMode || !previewScenario) return null

    return (
      <Modal isOpen={previewMode} onClose={() => setPreviewMode(false)} size="large">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Automation Preview: {previewScenario.feature}
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Sample Scenario</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Client: John Smith (2 previous no-shows)</p>
              <p>Appointment: Haircut + Beard Trim ($65) - Tomorrow 2:00 PM</p>
              <p>Risk Score: 0.82 (High Risk)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-olive-600 bg-olive-50 p-4">
              <h4 className="font-medium text-olive-900 mb-2">Automation Actions</h4>
              <ul className="text-sm text-olive-800 space-y-1">
                <li>✓ Extra reminder sent 4 hours before appointment</li>
                <li>✓ Deposit required ($13) for future bookings</li>
                <li>✓ Manager notification sent about high-risk client</li>
                <li>✓ Recovery flow prepared if no-show occurs</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Predicted Impact</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">No-show probability: 82% → 35%</p>
                  <p className="text-blue-700">Revenue protection: $65</p>
                </div>
                <div>
                  <p className="text-blue-700">Automation cost: $0.12</p>
                  <p className="text-blue-700">Net benefit: $64.88</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={() => setPreviewMode(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  if (!isOpen) return null

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BoltIcon className="h-6 w-6 text-olive-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Automation Settings
                </h2>
                <p className="text-sm text-gray-600">
                  Configure automated no-show policy features
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Analytics Status */}
              {analyticsLoading && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-olive-600"></div>
                  <span className="text-sm text-gray-600">Loading shop data...</span>
                </div>
              )}
              
              {analyticsError && (
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  <div className="flex-1">
                    <span className="text-sm text-red-600 font-medium">Analytics Loading Error</span>
                    <div className="text-xs text-red-500 mt-1">
                      {typeof analyticsError === 'string' 
                        ? analyticsError 
                        : analyticsError.message || 'Failed to load analytics data'
                      }
                    </div>
                  </div>
                  <button
                    onClick={refreshAnalytics}
                    className="text-xs text-blue-600 hover:text-blue-800 ml-2 px-2 py-1 border border-blue-200 rounded"
                    title="Retry loading analytics data"
                  >
                    Retry
                  </button>
                </div>
              )}
              
              {!analyticsLoading && !analyticsError && lastUpdated && (
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${
                    realtimeSubscription ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-xs text-gray-500">
                    {realtimeSubscription ? 'Live updates' : 'Static data'} • 
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                  <button
                    onClick={refreshAnalytics}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Refresh analytics data"
                  >
                    ↻
                  </button>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-olive-600 text-olive-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('implementation')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'implementation'
                    ? 'border-olive-600 text-olive-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Implementation Plan
              </button>
            </nav>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Error</h4>
                  <p className="text-sm text-red-800 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Success</h4>
                  <p className="text-sm text-green-800 mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {(loading || analyticsLoading) ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'implementation' && renderImplementationTab()}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-between items-center border-t pt-4">
            <div className="text-sm text-gray-600">
              <InformationCircleIcon className="inline h-4 w-4 mr-1" />
              Changes take effect immediately after saving
            </div>
            <div className="flex space-x-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={saveSettings}
                loading={loading}
                disabled={loading}
              >
                Save Automation Settings
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      {renderPreviewModal()}
    </>
  )
}

// Helper component for ChevronDownIcon
const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

/**
 * Hook for managing automation settings externally
 */
export function useAutomationSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState(null)

  const openSettings = (currentSettings) => {
    setSettings(currentSettings)
    setIsOpen(true)
  }

  const closeSettings = () => {
    setIsOpen(false)
    setSettings(null)
  }

  return {
    isOpen,
    settings,
    openSettings,
    closeSettings
  }
}
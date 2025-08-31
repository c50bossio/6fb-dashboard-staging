'use client'

import {
  ShieldCheckIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  GiftIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  ChartPieIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { InfoTooltip, InfoCard, LegendCard } from '@/components/ui/InfoTooltip'
import { Input } from '@/components/ui/Input'
import { cn, formatPercentage } from '@/lib/utils'

/**
 * GracePeriodManager - Flexible grace period settings with segment-based configuration
 * 
 * Features:
 * - Grace allowances per client segment
 * - Grace reset conditions and triggers
 * - Visual grace period preview and utilization
 * - Automatic vs manual grace period assignment
 * - Seasonal and event-based grace adjustments
 * - Grace history tracking and analytics
 * - Mobile responsive interface
 * - Bulk grace period operations
 */

const DEFAULT_GRACE_SETTINGS = {
  segments: {
    new: {
      id: 'new',
      name: 'New Client',
      icon: UserGroupIcon,
      color: 'blue',
      graceAllowances: {
        initial: 2,
        rolling12Months: 3,
        perQuarter: 1,
        lifetime: 5
      },
      resetConditions: {
        timeBasedReset: true,
        resetPeriodMonths: 12,
        behaviorBasedReset: false,
        loyaltyThreshold: 0
      },
      autoGraceConditions: {
        firstTime: true,
        seasonalEvents: false,
        emergencyOverride: true,
        managerDiscretion: true
      }
    },
    regular: {
      id: 'regular', 
      name: 'Regular Client',
      icon: CalendarDaysIcon,
      color: 'green',
      graceAllowances: {
        initial: 1,
        rolling12Months: 2,
        perQuarter: 1,
        lifetime: 8
      },
      resetConditions: {
        timeBasedReset: true,
        resetPeriodMonths: 6,
        behaviorBasedReset: true,
        loyaltyThreshold: 5
      },
      autoGraceConditions: {
        firstTime: false,
        seasonalEvents: true,
        emergencyOverride: true,
        managerDiscretion: true
      }
    },
    vip: {
      id: 'vip',
      name: 'VIP Client',
      icon: StarIcon,
      color: 'gold',
      graceAllowances: {
        initial: 3,
        rolling12Months: 4,
        perQuarter: 2,
        lifetime: 12
      },
      resetConditions: {
        timeBasedReset: true,
        resetPeriodMonths: 3,
        behaviorBasedReset: true,
        loyaltyThreshold: 3
      },
      autoGraceConditions: {
        firstTime: true,
        seasonalEvents: true,
        emergencyOverride: true,
        managerDiscretion: true
      }
    },
    loyal: {
      id: 'loyal',
      name: 'Loyal Client',
      icon: TrophyIcon,
      color: 'purple',
      graceAllowances: {
        initial: 5,
        rolling12Months: 6,
        perQuarter: 3,
        lifetime: 20
      },
      resetConditions: {
        timeBasedReset: true,
        resetPeriodMonths: 1,
        behaviorBasedReset: true,
        loyaltyThreshold: 1
      },
      autoGraceConditions: {
        firstTime: true,
        seasonalEvents: true,
        emergencyOverride: true,
        managerDiscretion: true
      }
    }
  },
  globalSettings: {
    enableGracePeriods: true,
    requireManagerApproval: false,
    trackGraceUsage: true,
    notifyOnGraceUsage: true,
    seasonalAdjustments: {
      holidays: { multiplier: 1.5, active: true },
      backToSchool: { multiplier: 1.2, active: false },
      summerVacation: { multiplier: 1.3, active: false }
    }
  }
}

const MOCK_GRACE_HISTORY = [
  {
    clientName: 'John Smith',
    segment: 'new',
    graceUsed: 1,
    graceAllowed: 2,
    lastGraceDate: '2024-01-15',
    reason: 'First-time grace',
    nextReset: '2025-01-15'
  },
  {
    clientName: 'Sarah Johnson',
    segment: 'regular',
    graceUsed: 2,
    graceAllowed: 2,
    lastGraceDate: '2024-01-20',
    reason: 'Emergency override',
    nextReset: '2024-07-20'
  },
  {
    clientName: 'Mike Wilson',
    segment: 'vip',
    graceUsed: 1,
    graceAllowed: 4,
    lastGraceDate: '2024-01-10',
    reason: 'Holiday season',
    nextReset: '2024-04-10'
  },
  {
    clientName: 'Emily Davis',
    segment: 'loyal',
    graceUsed: 0,
    graceAllowed: 6,
    lastGraceDate: null,
    reason: null,
    nextReset: '2024-02-01'
  }
]

const SEASONAL_EVENTS = [
  { key: 'holidays', label: 'Holiday Season', period: 'Dec-Jan', icon: GiftIcon },
  { key: 'backToSchool', label: 'Back to School', period: 'Aug-Sep', icon: CalendarDaysIcon },
  { key: 'summerVacation', label: 'Summer Vacation', period: 'Jun-Aug', icon: SparklesIcon }
]

export function GracePeriodManager({ 
  graceSettings = DEFAULT_GRACE_SETTINGS, 
  onSettingsChange,
  disabled = false,
  className = ''
}) {
  const [editingSettings, setEditingSettings] = useState(graceSettings)
  const [selectedSegment, setSelectedSegment] = useState('new')
  const [previewVisible, setPreviewVisible] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState([])

  // Load grace period rules from API
  useEffect(() => {
    loadGracePeriodRules()
  }, [])

  useEffect(() => {
    setHasUnsavedChanges(JSON.stringify(editingSettings) !== JSON.stringify(graceSettings))
  }, [editingSettings, graceSettings])

  const loadGracePeriodRules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/no-show/grace-periods')
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules || [])
        
        // If we have rules, transform them to settings format
        if (data.rules && data.rules.length > 0) {
          // Transform API rules to component format
          // This is a simplified transformation - you may need to adjust
          const transformedSettings = {
            ...DEFAULT_GRACE_SETTINGS,
            // Map rules to segments based on applies_to_segment
          }
          setEditingSettings(transformedSettings)
        }
      }
    } catch (error) {
      console.error('Error loading grace period rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveGracePeriodRules = async () => {
    try {
      // Transform settings to API format and save each rule
      const promises = Object.values(editingSettings.segments).map(segment => {
        const rule = {
          rule_name: `${segment.name} Grace Period`,
          rule_description: `Grace period rules for ${segment.name.toLowerCase()} clients`,
          applies_to_segment: segment.id,
          grace_minutes: segment.graceAllowances.initial * 15, // Convert to minutes
          priority: segment.id === 'vip' ? 100 : segment.id === 'new' ? 75 : 50,
          min_appointment_count: segment.id === 'new' ? 0 : 5,
          max_strike_count: segment.id === 'high_risk' ? 999 : 2,
          is_active: true
        }
        
        return fetch('/api/no-show/grace-periods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rule)
        })
      })
      
      await Promise.all(promises)
      
      if (onSettingsChange) {
        onSettingsChange(editingSettings)
      }
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving grace period rules:', error)
    }
  }

  const updateSegmentSetting = (segmentId, category, field, value) => {
    setEditingSettings(prev => ({
      ...prev,
      segments: {
        ...prev.segments,
        [segmentId]: {
          ...prev.segments[segmentId],
          [category]: {
            ...prev.segments[segmentId][category],
            [field]: typeof value === 'string' ? Math.max(0, Math.min(100, parseFloat(value) || 0)) : value
          }
        }
      }
    }))
  }

  const updateGlobalSetting = (field, value) => {
    setEditingSettings(prev => ({
      ...prev,
      globalSettings: {
        ...prev.globalSettings,
        [field]: value
      }
    }))
  }

  const updateSeasonalSetting = (event, field, value) => {
    setEditingSettings(prev => ({
      ...prev,
      globalSettings: {
        ...prev.globalSettings,
        seasonalAdjustments: {
          ...prev.globalSettings.seasonalAdjustments,
          [event]: {
            ...prev.globalSettings.seasonalAdjustments[event],
            [field]: field === 'multiplier' ? Math.max(0.1, Math.min(5.0, parseFloat(value) || 1)) : value
          }
        }
      }
    }))
  }

  const calculateGraceUtilization = (segment) => {
    const segmentClients = MOCK_GRACE_HISTORY.filter(client => client.segment === segment.id)
    if (segmentClients.length === 0) return 0
    
    const totalUsed = segmentClients.reduce((sum, client) => sum + client.graceUsed, 0)
    const totalAllowed = segmentClients.reduce((sum, client) => sum + client.graceAllowed, 0)
    
    return totalAllowed > 0 ? (totalUsed / totalAllowed) * 100 : 0
  }

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      gold: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800'
    }
    return colors[color] || colors.blue
  }

  const getIconColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      gold: 'text-yellow-600',
      purple: 'text-purple-600'
    }
    return colors[color] || colors.blue
  }

  const handleSave = async () => {
    await saveGracePeriodRules()
  }

  const handleReset = () => {
    setEditingSettings(graceSettings)
    setHasUnsavedChanges(false)
  }

  const currentSegment = editingSettings.segments[selectedSegment]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShieldCheckIcon className="h-6 w-6 text-olive-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Grace Period Management</h3>
            <p className="text-sm text-gray-600">Configure flexible grace periods by client segment</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="small"
            icon={ChartPieIcon}
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            Analytics
          </Button>
          
          {hasUnsavedChanges && (
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="small"
                onClick={handleReset}
                disabled={disabled}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleSave}
                disabled={disabled}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cog6ToothIcon className="h-5 w-5" />
            <span>Global Grace Settings</span>
          </CardTitle>
          <CardDescription>
            System-wide grace period configurations and seasonal adjustments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={editingSettings.globalSettings.enableGracePeriods}
                onChange={(e) => updateGlobalSetting('enableGracePeriods', e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable Grace Periods</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={editingSettings.globalSettings.requireManagerApproval}
                onChange={(e) => updateGlobalSetting('requireManagerApproval', e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
              />
              <span className="text-sm font-medium text-gray-700">Require Manager Approval</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={editingSettings.globalSettings.trackGraceUsage}
                onChange={(e) => updateGlobalSetting('trackGraceUsage', e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
              />
              <span className="text-sm font-medium text-gray-700">Track Grace Usage</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={editingSettings.globalSettings.notifyOnGraceUsage}
                onChange={(e) => updateGlobalSetting('notifyOnGraceUsage', e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
              />
              <span className="text-sm font-medium text-gray-700">Notify on Grace Usage</span>
            </label>
          </div>

          {/* Seasonal Adjustments */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <GiftIcon className="h-4 w-4" />
              <span>Seasonal Adjustments</span>
            </h4>
            
            <div className="space-y-3">
              {SEASONAL_EVENTS.map(event => {
                const settings = editingSettings.globalSettings.seasonalAdjustments[event.key]
                const IconComponent = event.icon
                
                return (
                  <div key={event.key} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{event.label}</p>
                        <p className="text-xs text-gray-500">{event.period}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">×</span>
                        <Input
                          type="number"
                          value={settings.multiplier}
                          onChange={(e) => updateSeasonalSetting(event.key, 'multiplier', e.target.value)}
                          disabled={disabled || !settings.active}
                          className="w-16 text-center"
                          min="1"
                          max="3"
                          step="0.1"
                        />
                      </div>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={settings.active}
                          onChange={(e) => updateSeasonalSetting(event.key, 'active', e.target.checked)}
                          disabled={disabled}
                          className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segment Selection */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Client Segments</h3>
          <InfoTooltip
            title="Client Segments"
            content="Clients are automatically categorized into segments based on their booking history, loyalty, and value. Each segment has different grace period allowances."
            position="right"
          />
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {Object.entries(editingSettings.segments).map(([segmentId, segment]) => {
            const IconComponent = segment.icon
            const isSelected = selectedSegment === segmentId
            
            // Get segment description for tooltip
            const segmentDescriptions = {
              new: "Clients with 0-5 total appointments. Get extra grace periods to build trust and establish relationship.",
              regular: "Clients with 6-20 appointments and consistent booking patterns. Balanced grace policy.",
              vip: "High-value clients or those with premium service packages. More generous grace allowances.",
              loyal: "Long-term clients (12+ months) with excellent attendance record. Most generous grace policy."
            }
            
            return (
              <div key={segmentId} className="relative">
                <button
                  onClick={() => setSelectedSegment(segmentId)}
                  disabled={disabled}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg border transition-all duration-200 whitespace-nowrap',
                    isSelected 
                      ? getColorClasses(segment.color)
                      : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                  )}
                >
                  <IconComponent className={cn(
                    'h-5 w-5',
                    isSelected ? getIconColorClasses(segment.color) : 'text-gray-500'
                  )} />
                  <span className="font-medium">{segment.name}</span>
                  <InfoTooltip
                    title={segment.name}
                    content={segmentDescriptions[segmentId]}
                    position="top"
                    size="xs"
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Segment Configuration */}
      {currentSegment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <currentSegment.icon className={cn('h-5 w-5', getIconColorClasses(currentSegment.color))} />
              <span>{currentSegment.name} Grace Settings</span>
            </CardTitle>
            <CardDescription>
              Configure grace allowances and reset conditions for {currentSegment.name.toLowerCase()}s
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grace Allowances */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <CalendarDaysIcon className="h-4 w-4" />
                <span>Grace Allowances</span>
                <InfoTooltip
                  title="Grace Allowances"
                  content="Different types of grace period limits that work together to provide flexible but controlled grace policies. These limits stack and reset at different intervals."
                  position="right"
                />
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                    <span>Initial Grace</span>
                    <InfoTooltip
                      title="Initial Grace"
                      content="Grace periods available immediately when client first misses an appointment. Helps establish trust with new clients."
                      position="top"
                      size="xs"
                    />
                  </label>
                  <Input
                    type="number"
                    value={currentSegment.graceAllowances.initial}
                    onChange={(e) => updateSegmentSetting(selectedSegment, 'graceAllowances', 'initial', e.target.value)}
                    disabled={disabled}
                    min="0"
                    max="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">For first-time no-shows</p>
                </div>
                
                <div>
                  <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                    <span>Rolling 12 Months</span>
                    <InfoTooltip
                      title="Rolling 12 Months"
                      content="Total grace periods that reset automatically every 12 months. This is your main annual grace budget per client."
                      position="top"
                      size="xs"
                    />
                  </label>
                  <Input
                    type="number"
                    value={currentSegment.graceAllowances.rolling12Months}
                    onChange={(e) => updateSegmentSetting(selectedSegment, 'graceAllowances', 'rolling12Months', e.target.value)}
                    disabled={disabled}
                    min="0"
                    max="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">Resets annually</p>
                </div>
                
                <div>
                  <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                    <span>Per Quarter</span>
                    <InfoTooltip
                      title="Per Quarter"
                      content="Maximum grace periods allowed in any 3-month period. Prevents clients from using all their annual grace in a short time."
                      position="top"
                      size="xs"
                    />
                  </label>
                  <Input
                    type="number"
                    value={currentSegment.graceAllowances.perQuarter}
                    onChange={(e) => updateSegmentSetting(selectedSegment, 'graceAllowances', 'perQuarter', e.target.value)}
                    disabled={disabled}
                    min="0"
                    max="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Prevents clustering</p>
                </div>
                
                <div>
                  <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                    <span>Lifetime Total</span>
                    <InfoTooltip
                      title="Lifetime Total"
                      content="Maximum grace periods a client can ever receive throughout their entire relationship with your shop. Acts as an ultimate safeguard."
                      position="top"
                      size="xs"
                    />
                  </label>
                  <Input
                    type="number"
                    value={currentSegment.graceAllowances.lifetime}
                    onChange={(e) => updateSegmentSetting(selectedSegment, 'graceAllowances', 'lifetime', e.target.value)}
                    disabled={disabled}
                    min="0"
                    max="50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Hard lifetime limit</p>
                </div>
              </div>
              
              {/* Grace Allowances Info Card */}
              <InfoCard
                title="How Grace Allowances Work Together"
                icon={InformationCircleIcon}
                className="mt-4"
              >
                <div className="space-y-2">
                  <p><strong>Example:</strong> A Regular Client has 1 Initial, 2 Rolling 12-month, 1 Per Quarter, and 8 Lifetime grace allowances.</p>
                  <p><strong>What this means:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Gets 1 automatic grace period on their first no-show</li>
                    <li>Can use up to 2 grace periods per year (resets every 12 months)</li>
                    <li>Can't use more than 1 grace period in any 3-month window</li>
                    <li>Can never exceed 8 total grace periods throughout their relationship</li>
                  </ul>
                  <p className="mt-2"><strong>The system always applies the most restrictive limit.</strong></p>
                </div>
              </InfoCard>
            </div>

            {/* Reset Conditions */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <ArrowPathIcon className="h-4 w-4" />
                <span>Reset Conditions</span>
                <InfoTooltip
                  title="Reset Conditions"
                  content="When and how grace periods get restored to clients. This allows loyal clients to regain grace periods through good behavior or time passage."
                  position="right"
                />
              </h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={currentSegment.resetConditions.timeBasedReset}
                      onChange={(e) => updateSegmentSetting(selectedSegment, 'resetConditions', 'timeBasedReset', e.target.checked)}
                      disabled={disabled}
                      className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Time-based Reset</span>
                    <InfoTooltip
                      title="Time-based Reset"
                      content="Automatically restore grace periods after a set number of months, regardless of client behavior. Good for giving everyone a fresh start periodically."
                      position="top"
                      size="xs"
                    />
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={currentSegment.resetConditions.behaviorBasedReset}
                      onChange={(e) => updateSegmentSetting(selectedSegment, 'resetConditions', 'behaviorBasedReset', e.target.checked)}
                      disabled={disabled}
                      className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Behavior-based Reset</span>
                    <InfoTooltip
                      title="Behavior-based Reset"
                      content="Restore grace periods when clients show improved behavior by completing a streak of successful appointments. Rewards good behavior."
                      position="top"
                      size="xs"
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                      <span>Reset Period (months)</span>
                      <InfoTooltip
                        title="Reset Period"
                        content="How often time-based resets occur. Shorter periods are more forgiving, longer periods maintain stricter grace accountability."
                        position="top"
                        size="xs"
                      />
                    </label>
                    <Input
                      type="number"
                      value={currentSegment.resetConditions.resetPeriodMonths}
                      onChange={(e) => updateSegmentSetting(selectedSegment, 'resetConditions', 'resetPeriodMonths', e.target.value)}
                      disabled={disabled || !currentSegment.resetConditions.timeBasedReset}
                      min="1"
                      max="24"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {currentSegment.resetConditions.timeBasedReset 
                        ? `Resets every ${currentSegment.resetConditions.resetPeriodMonths} months`
                        : 'Enable time-based reset to use'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                      <span>Loyalty Threshold</span>
                      <InfoTooltip
                        title="Loyalty Threshold"
                        content="Number of consecutive successful appointments required to trigger a behavior-based reset. Higher numbers make resets harder to earn but more meaningful."
                        position="top"
                        size="xs"
                      />
                    </label>
                    <Input
                      type="number"
                      value={currentSegment.resetConditions.loyaltyThreshold}
                      onChange={(e) => updateSegmentSetting(selectedSegment, 'resetConditions', 'loyaltyThreshold', e.target.value)}
                      disabled={disabled || !currentSegment.resetConditions.behaviorBasedReset}
                      min="0"
                      max="20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {currentSegment.resetConditions.behaviorBasedReset 
                        ? `Requires ${currentSegment.resetConditions.loyaltyThreshold} successful appointments`
                        : 'Enable behavior-based reset to use'
                      }
                    </p>
                  </div>
                </div>
                
                {/* Reset Conditions Info Card */}
                <InfoCard
                  title="Reset Strategies"
                  icon={ArrowPathIcon}
                  className="mt-4"
                >
                  <div className="space-y-2">
                    <p><strong>Time-based:</strong> Good for giving all clients periodic fresh starts. More predictable and fair.</p>
                    <p><strong>Behavior-based:</strong> Rewards clients who improve their attendance. More merit-based.</p>
                    <p><strong>Both enabled:</strong> Clients get the benefit of whichever occurs first - either good behavior OR time passage.</p>
                    <p className="text-xs"><em>Tip: VIP and Loyal clients typically benefit from shorter reset periods or lower loyalty thresholds.</em></p>
                  </div>
                </InfoCard>
              </div>
            </div>

            {/* Auto Grace Conditions */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                <span>Auto Grace Triggers</span>
                <InfoTooltip
                  title="Automatic Grace Period Triggers"
                  content="These conditions determine when the system should automatically grant a grace period instead of applying a strike. When enabled, no-shows that meet these criteria won't count against the client's record."
                  position="top-right"
                  size="sm"
                />
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={currentSegment.autoGraceConditions.firstTime}
                    onChange={(e) => updateSegmentSetting(selectedSegment, 'autoGraceConditions', 'firstTime', e.target.checked)}
                    disabled={disabled}
                    className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center space-x-1">
                    <span>First-time No-show</span>
                    <InfoTooltip
                      title="First-time Client Grace"
                      content="Automatically grants grace for a client's very first no-show. Helps build goodwill with new clients who may genuinely have made a mistake or forgotten."
                      position="top"
                      size="xs"
                    />
                  </span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={currentSegment.autoGraceConditions.seasonalEvents}
                    onChange={(e) => updateSegmentSetting(selectedSegment, 'autoGraceConditions', 'seasonalEvents', e.target.checked)}
                    disabled={disabled}
                    className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center space-x-1">
                    <span>Seasonal Events</span>
                    <InfoTooltip
                      title="Seasonal Event Considerations"
                      content="Automatically grants grace during high-traffic periods like holidays, severe weather, or local events. The system can detect patterns that suggest external factors caused the no-show."
                      position="top"
                      size="xs"
                    />
                  </span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={currentSegment.autoGraceConditions.emergencyOverride}
                    onChange={(e) => updateSegmentSetting(selectedSegment, 'autoGraceConditions', 'emergencyOverride', e.target.checked)}
                    disabled={disabled}
                    className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center space-x-1">
                    <span>Emergency Override</span>
                    <InfoTooltip
                      title="Emergency Situations"
                      content="Allows staff to quickly apply grace periods for genuine emergencies (medical, family crisis, car trouble). This bypass requires manager approval and creates an audit trail."
                      position="top"
                      size="xs"
                    />
                  </span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={currentSegment.autoGraceConditions.managerDiscretion}
                    onChange={(e) => updateSegmentSetting(selectedSegment, 'autoGraceConditions', 'managerDiscretion', e.target.checked)}
                    disabled={disabled}
                    className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                  />
                  <span className="text-sm text-gray-700 flex items-center space-x-1">
                    <span>Manager Discretion</span>
                    <InfoTooltip
                      title="Manager Discretion Mode"
                      content="Enables managers to grant case-by-case grace periods for valuable clients or special circumstances. This preserves client relationships while maintaining accountability through manager approval."
                      position="top"
                      size="xs"
                    />
                  </span>
                </label>
              </div>

              {/* Info Card for Auto Grace Strategy */}
              <div className="mt-4">
                <InfoCard
                  title="Auto Grace Strategy Guide"
                  icon={AdjustmentsHorizontalIcon}
                  defaultExpanded={false}
                  className="mt-3"
                >
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-blue-800 mb-1">Recommended Combinations:</h5>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>New Client Friendly:</strong> Enable First-time + Manager Discretion</li>
                        <li><strong>Balanced Approach:</strong> Enable First-time + Emergency Override</li>
                        <li><strong>Strict Policy:</strong> Only Emergency Override (for documented emergencies)</li>
                        <li><strong>High-End Service:</strong> Enable all options to maximize client retention</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-800 mb-1">Business Impact:</h5>
                      <p className="text-xs">Auto grace periods can increase client retention by 15-25% but may reduce booking discipline. Balance grace with accountability based on your client base and service positioning.</p>
                    </div>
                  </div>
                </InfoCard>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grace Analytics */}
      {showAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ChartPieIcon className="h-5 w-5" />
              <span>Grace Period Analytics</span>
              <InfoTooltip
                title="Grace Period Analytics"
                content="Track how different client segments are using their grace periods. This helps you identify if your policies are too lenient or too strict for different client types."
                position="top-right"
                size="sm"
              />
            </CardTitle>
            <CardDescription>
              Current grace period utilization and client history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Utilization Overview */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                  <span>Utilization by Client Segment</span>
                  <InfoTooltip
                    title="Grace Period Utilization"
                    content="Shows what percentage of available grace periods each client segment is using. High utilization may indicate you need stricter policies, while low utilization suggests policies are working well."
                    position="top"
                    size="xs"
                  />
                </h4>
                
                {/* Legend for utilization colors */}
                <LegendCard 
                  title="Utilization Status"
                  items={[
                    { colorClass: 'bg-green-500', label: 'Good (0-60%)' },
                    { colorClass: 'bg-yellow-500', label: 'Caution (60-80%)' },
                    { colorClass: 'bg-red-500', label: 'High (80%+)' }
                  ]}
                  className="ml-4"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(editingSettings.segments).map(([segmentId, segment]) => {
                const utilization = calculateGraceUtilization(segment)
                const IconComponent = segment.icon
                
                return (
                  <div key={segmentId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <IconComponent className={cn('h-4 w-4', getIconColorClasses(segment.color))} />
                      <span className="text-sm font-medium text-gray-900">{segment.name}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {formatPercentage(utilization)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Grace utilization
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          utilization > 80 ? 'bg-red-500' :
                          utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        )}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Client History */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <span>Recent Grace Period Usage</span>
                <InfoTooltip
                  title="Individual Client Usage"
                  content="Review how individual clients are using their grace periods. Clients approaching their limits may need additional attention or policy adjustments to maintain good relationships."
                  position="top"
                  size="xs"
                />
              </h4>
              <div className="space-y-3">
                {MOCK_GRACE_HISTORY.map((client, index) => {
                  const segment = editingSettings.segments[client.segment]
                  const utilization = client.graceAllowed > 0 ? (client.graceUsed / client.graceAllowed) * 100 : 0
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-semibold text-gray-700">
                          {client.clientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{client.clientName}</p>
                          <p className="text-sm text-gray-500">
                            {segment?.name} • Last grace: {client.lastGraceDate || 'Never'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {client.graceUsed}/{client.graceAllowed}
                          </div>
                          <div className="text-xs text-gray-500">Used</div>
                        </div>
                        
                        <div className="w-16">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={cn(
                                'h-2 rounded-full transition-all duration-300',
                                utilization >= 100 ? 'bg-red-500' :
                                utilization >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                              )}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {client.reason && (
                          <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {client.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
              
              {/* Analytics Interpretation Guide */}
              <div className="mt-6">
                <InfoCard
                  title="How to Use Analytics Data"
                  icon={ChartPieIcon}
                  defaultExpanded={false}
                  className="mt-4"
                >
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-blue-800 mb-2">Interpreting Utilization Rates:</h5>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>0-40% (Green):</strong> Excellent - Policies are working, clients respect boundaries</li>
                        <li><strong>40-60% (Green):</strong> Good - Normal usage, monitor for trends</li>
                        <li><strong>60-80% (Yellow):</strong> Caution - Consider reviewing segment policies</li>
                        <li><strong>80%+ (Red):</strong> High Risk - Immediate attention needed, policies may be too lenient</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-blue-800 mb-2">Recommended Actions:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <strong>High Utilization Clients:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Personal outreach to understand issues</li>
                            <li>Consider moving to stricter segment</li>
                            <li>Additional appointment reminders</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Segment Adjustments:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Reduce grace allowances if utilization {'>'}80%</li>
                            <li>Add behavior-based resets</li>
                            <li>Enable manager approval requirements</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-blue-800 mb-1">Best Practices:</h5>
                      <p className="text-xs">Review analytics weekly, make gradual policy adjustments, and always communicate changes to clients in advance. Balance client retention with operational discipline.</p>
                    </div>
                  </div>
                </InfoCard>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grace Period Preview */}
      {previewVisible && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5" />
              <span>Grace Period Preview</span>
            </CardTitle>
            <CardDescription>
              Visual timeline showing how grace periods work across client segments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(editingSettings.segments).map(([segmentId, segment]) => {
                const IconComponent = segment.icon
                const maxAllowances = Math.max(...Object.values(segment.graceAllowances))
                
                return (
                  <div key={segmentId} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <IconComponent className={cn('h-5 w-5', getIconColorClasses(segment.color))} />
                      <span className="font-medium text-gray-900">{segment.name}</span>
                      <div className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        getColorClasses(segment.color)
                      )}>
                        {segment.graceAllowances.rolling12Months} per year
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Initial</p>
                        <p className="font-semibold">{segment.graceAllowances.initial}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Per Quarter</p>
                        <p className="font-semibold">{segment.graceAllowances.perQuarter}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Annual</p>
                        <p className="font-semibold">{segment.graceAllowances.rolling12Months}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Lifetime</p>
                        <p className="font-semibold">{segment.graceAllowances.lifetime}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                      {segment.resetConditions.timeBasedReset && (
                        <span>• Resets every {segment.resetConditions.resetPeriodMonths} months</span>
                      )}
                      {segment.autoGraceConditions.firstTime && (
                        <span>• Auto-grace for first no-show</span>
                      )}
                      {segment.autoGraceConditions.seasonalEvents && (
                        <span>• Seasonal adjustments apply</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Grace Period Best Practices:</p>
              <ul className="space-y-1">
                <li>• Be generous with grace periods for new clients to build trust</li>
                <li>• Implement behavior-based resets to reward consistent clients</li>
                <li>• Use seasonal adjustments during high-stress periods (holidays, back-to-school)</li>
                <li>• Track grace utilization to identify clients who may need additional support</li>
                <li>• Require manager approval for high-value client grace overrides</li>
                <li>• Reset grace periods regularly to prevent permanent client flags</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GracePeriodManager
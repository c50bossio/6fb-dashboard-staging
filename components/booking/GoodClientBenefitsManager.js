'use client'

import {
  ShieldCheckIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  GiftIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  ChartPieIcon,
  SparklesIcon,
  HeartIcon,
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
 * GoodClientBenefitsManager - Flexible client benefits settings with segment-based configuration
 * 
 * Replaces the cold "grace period" terminology with warm "good client benefits" language.
 * Recognizes and rewards clients who have earned special consideration through their loyalty.
 */

const DEFAULT_BENEFITS = {
  // New client tier - building relationship
  new_clients: {
    enabled: true,
    allowances: 2,
    timeWindow: 30, // days
    description: "Welcome new clients with understanding as they learn our booking system",
    icon: 'heart',
    color: 'blue'
  },
  
  // Regular client tier - established relationship
  regular_clients: {
    enabled: true, 
    allowances: 3,
    timeWindow: 60,
    description: "Reward loyal regulars who've earned your trust and flexibility",
    icon: 'star',
    color: 'green'
  },
  
  // VIP client tier - premium relationship
  vip_clients: {
    enabled: true,
    allowances: 5,
    timeWindow: 90,
    description: "Premium care for your most valued clients who deserve extra consideration",
    icon: 'trophy',
    color: 'gold'
  },
  
  // Life circumstances - special situations
  special_circumstances: {
    enabled: true,
    allowances: 'unlimited',
    timeWindow: 'case_by_case',
    description: "Understanding for clients facing health, family, or work challenges",
    icon: 'heart',
    color: 'purple'
  }
}

const BENEFIT_ICONS = {
  heart: HeartIcon,
  star: StarIcon,
  trophy: TrophyIcon,
  gift: GiftIcon,
  shield: ShieldCheckIcon
}

const SEGMENT_QUALIFICATIONS = {
  new_clients: {
    totalVisits: { min: 0, max: 3 },
    accountAge: { max: 30 }, // days
    description: "Less than 4 visits or account less than 30 days old"
  },
  regular_clients: {
    totalVisits: { min: 4, max: 20 },
    accountAge: { min: 30, max: 365 },
    description: "4-20 visits and account 30-365 days old"
  },
  vip_clients: {
    totalVisits: { min: 20 },
    accountAge: { min: 365 },
    avgMonthlySpend: { min: 150 },
    description: "20+ visits, 1+ year client, $150+ monthly average"
  },
  special_circumstances: {
    description: "Manual designation for clients with special life situations"
  }
}

export default function GoodClientBenefitsManager({
  barberbarbershopId,
  currentRules = {},
  onUpdate,
  isManager = false
}) {
  const [benefits, setBenefits] = useState(currentRules.goodClientBenefits || DEFAULT_BENEFITS)
  const [previewSegment, setPreviewSegment] = useState('regular_clients')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Track changes
  useEffect(() => {
    const originalBenefits = currentRules.goodClientBenefits || DEFAULT_BENEFITS
    setHasUnsavedChanges(JSON.stringify(benefits) !== JSON.stringify(originalBenefits))
  }, [benefits, currentRules.goodClientBenefits])

  const handleBenefitChange = (segment, field, value) => {
    setBenefits(prev => ({
      ...prev,
      [segment]: {
        ...prev[segment],
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await onUpdate?.(benefits)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving good client benefits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setBenefits(currentRules.goodClientBenefits || DEFAULT_BENEFITS)
    setHasUnsavedChanges(false)
  }

  const getBenefitSummary = () => {
    const enabledBenefits = Object.entries(benefits).filter(([_, config]) => config.enabled)
    return {
      totalSegments: enabledBenefits.length,
      avgAllowances: enabledBenefits.reduce((sum, [_, config]) => 
        sum + (typeof config.allowances === 'number' ? config.allowances : 5), 0
      ) / enabledBenefits.length,
      clientsCovered: '85%' // This would be calculated from actual data
    }
  }

  const summary = getBenefitSummary()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <GiftIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Good Client Benefits</h3>
              <p className="text-sm text-gray-600">
                Reward loyalty and show understanding for clients who've earned your trust
              </p>
            </div>
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
                <Button size="sm" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isManager && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Manager approval required</strong> for changes to client benefit settings
            </p>
          </div>
        )}
      </div>

      {/* Benefits Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{summary.totalSegments}</p>
                <p className="text-sm text-gray-600">Benefit Tiers Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <StarIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{summary.avgAllowances.toFixed(1)}</p>
                <p className="text-sm text-gray-600">Avg Benefits Per Tier</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <HeartIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{summary.clientsCovered}</p>
                <p className="text-sm text-gray-600">Clients Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Benefit Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Client Benefit Tiers</CardTitle>
          <CardDescription>
            Configure benefits for different client segments based on their relationship with your barbershop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(benefits).map(([segmentKey, config]) => {
            const IconComponent = BENEFIT_ICONS[config.icon] || StarIcon
            const qualification = SEGMENT_QUALIFICATIONS[segmentKey]
            
            return (
              <div key={segmentKey} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <IconComponent className={`h-6 w-6 mr-3 ${
                      config.color === 'blue' ? 'text-blue-500' :
                      config.color === 'green' ? 'text-green-500' :
                      config.color === 'gold' ? 'text-yellow-500' :
                      config.color === 'purple' ? 'text-purple-500' :
                      'text-gray-500'
                    }`} />
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {segmentKey.replace('_', ' ')}
                      </h4>
                      <p className="text-sm text-gray-600">{config.description}</p>
                      {qualification && (
                        <p className="text-xs text-gray-500 mt-1">
                          <strong>Qualifies:</strong> {qualification.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => handleBenefitChange(segmentKey, 'enabled', e.target.checked)}
                      disabled={!isManager}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enabled</span>
                  </label>
                </div>

                {config.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Benefit Allowances
                      </label>
                      {segmentKey === 'special_circumstances' ? (
                        <div className="flex items-center p-3 bg-purple-50 border border-purple-200 rounded-md">
                          <HeartIcon className="h-5 w-5 text-purple-500 mr-2" />
                          <span className="text-sm text-purple-800">Case-by-case consideration</span>
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={config.allowances}
                          onChange={(e) => handleBenefitChange(segmentKey, 'allowances', parseInt(e.target.value) || 1)}
                          disabled={!isManager}
                          className="w-full"
                        />
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Window (days)
                      </label>
                      {segmentKey === 'special_circumstances' ? (
                        <div className="flex items-center p-3 bg-purple-50 border border-purple-200 rounded-md">
                          <ClockIcon className="h-5 w-5 text-purple-500 mr-2" />
                          <span className="text-sm text-purple-800">Manager discretion</span>
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="7"
                          max="365"
                          value={config.timeWindow}
                          onChange={(e) => handleBenefitChange(segmentKey, 'timeWindow', parseInt(e.target.value) || 30)}
                          disabled={!isManager}
                          className="w-full"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Best Practices */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
        <div className="flex items-start">
          <InformationCircleIcon className="h-6 w-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium mb-2">Good Client Benefits Best Practices:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Reward loyalty:</strong> Give your best clients the most understanding</li>
              <li>• <strong>Build relationships:</strong> Show that you value them as people, not just bookings</li>
              <li>• <strong>Be flexible:</strong> Life happens - good clients deserve understanding</li>
              <li>• <strong>Communicate value:</strong> Let clients know they've earned these benefits</li>
              <li>• <strong>Stay personal:</strong> Use your discretion for special circumstances</li>
              <li>• <strong>Focus on retention:</strong> Happy clients refer friends and stay loyal</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import {
  HeartIcon,
  StarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

/**
 * SimplifiedClientBenefits - Easy-to-use client understanding system
 * 
 * Replaces complex 4-tier system with simple 2-category approach:
 * 1. Regular Clients - Industry standard 2 chances per 60 days
 * 2. Trusted Clients - Unlimited understanding for your best clients
 */

const SIMPLE_BENEFITS = {
  regular_clients: {
    enabled: true,
    secondChances: 2,
    resetPeriod: 60, // days
    description: "Standard understanding for all clients",
    icon: 'user',
    color: 'blue'
  },
  trusted_clients: {
    enabled: true,
    secondChances: 'unlimited',
    resetPeriod: 'never',
    description: "Extra flexibility for your most loyal clients", 
    icon: 'star',
    color: 'gold'
  }
}

const QUICK_SETUP_PRESETS = {
  strict: {
    name: "Professional",
    description: "Standard business approach - clear boundaries",
    settings: { regular_clients: { secondChances: 1, resetPeriod: 30 }, trusted_clients: { secondChances: 3, resetPeriod: 90 } }
  },
  balanced: {
    name: "Balanced",
    description: "Industry standard - understanding with boundaries",
    settings: { regular_clients: { secondChances: 2, resetPeriod: 60 }, trusted_clients: { secondChances: 'unlimited', resetPeriod: 'never' } }
  },
  flexible: {
    name: "Relationship-Focused", 
    description: "Extra understanding - build stronger relationships",
    settings: { regular_clients: { secondChances: 3, resetPeriod: 90 }, trusted_clients: { secondChances: 'unlimited', resetPeriod: 'never' } }
  }
}

export default function SimplifiedClientBenefits({
  barbershopId,
  currentRules = {},
  onUpdate,
  isManager = false
}) {
  const [benefits, setBenefits] = useState(currentRules.goodClientBenefits || SIMPLE_BENEFITS)
  const [selectedPreset, setSelectedPreset] = useState('balanced')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showQuickSetup, setShowQuickSetup] = useState(!currentRules.goodClientBenefits)

  // Track changes
  useEffect(() => {
    const originalBenefits = currentRules.goodClientBenefits || SIMPLE_BENEFITS
    setHasUnsavedChanges(JSON.stringify(benefits) !== JSON.stringify(originalBenefits))
  }, [benefits, currentRules.goodClientBenefits])

  const handlePresetSelect = (presetKey) => {
    const preset = QUICK_SETUP_PRESETS[presetKey]
    setSelectedPreset(presetKey)
    
    setBenefits(prev => ({
      regular_clients: {
        ...prev.regular_clients,
        ...preset.settings.regular_clients
      },
      trusted_clients: {
        ...prev.trusted_clients,
        ...preset.settings.trusted_clients
      }
    }))
    
    setShowQuickSetup(false)
  }

  const handleBenefitChange = (clientType, field, value) => {
    setBenefits(prev => ({
      ...prev,
      [clientType]: {
        ...prev[clientType],
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
      console.error('Error saving client benefits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setBenefits(currentRules.goodClientBenefits || SIMPLE_BENEFITS)
    setHasUnsavedChanges(false)
  }

  const renderQuickSetup = () => (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center text-blue-900">
          <HeartIcon className="h-6 w-6 mr-2" />
          Quick Setup
        </CardTitle>
        <CardDescription className="text-blue-700">
          Choose your approach to client understanding. You can always customize later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {Object.entries(QUICK_SETUP_PRESETS).map(([key, preset]) => (
            <div
              key={key}
              onClick={() => handlePresetSelect(key)}
              className={`
                p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md
                ${selectedPreset === key 
                  ? 'border-blue-500 bg-blue-100 shadow-lg' 
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{preset.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    Regular: {preset.settings.regular_clients.secondChances} chances per {preset.settings.regular_clients.resetPeriod} days • 
                    Trusted: {preset.settings.trusted_clients.secondChances === 'unlimited' ? 'Unlimited' : `${preset.settings.trusted_clients.secondChances} chances`}
                  </div>
                </div>
                {selectedPreset === key && (
                  <CheckCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-blue-200">
          <Button 
            onClick={() => handlePresetSelect(selectedPreset)}
            className="w-full"
            size="lg"
          >
            Use {QUICK_SETUP_PRESETS[selectedPreset].name} Approach
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderSimpleSettings = () => (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HeartIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Client Understanding</h3>
              <p className="text-sm text-gray-600">
                Show understanding when good clients miss appointments
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
      </div>

      {/* Client Categories - Simplified */}
      <div className="grid gap-6">
        {/* Regular Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserGroupIcon className="h-6 w-6 text-blue-500 mr-2" />
              Regular Clients
            </CardTitle>
            <CardDescription>
              All your clients get this level of understanding by default
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={benefits.regular_clients?.enabled}
                  onChange={(e) => handleBenefitChange('regular_clients', 'enabled', e.target.checked)}
                  disabled={!isManager}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Show understanding</span>
              </label>
            </div>

            {benefits.regular_clients?.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Second Chances
                    <InfoTooltip content="How many missed appointments before taking action" />
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={benefits.regular_clients?.secondChances || 2}
                    onChange={(e) => handleBenefitChange('regular_clients', 'secondChances', parseInt(e.target.value) || 2)}
                    disabled={!isManager}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reset Period (days)
                    <InfoTooltip content="After this many days, chances reset back to full" />
                  </label>
                  <Input
                    type="number"
                    min="7"
                    max="365"
                    value={benefits.regular_clients?.resetPeriod || 60}
                    onChange={(e) => handleBenefitChange('regular_clients', 'resetPeriod', parseInt(e.target.value) || 60)}
                    disabled={!isManager}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trusted Clients */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <StarIcon className="h-6 w-6 text-yellow-500 mr-2" />
              Trusted Clients
            </CardTitle>
            <CardDescription>
              Your most loyal clients who've earned extra understanding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={benefits.trusted_clients?.enabled}
                  onChange={(e) => handleBenefitChange('trusted_clients', 'enabled', e.target.checked)}
                  disabled={!isManager}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Enable trusted client benefits</span>
              </label>
            </div>

            {benefits.trusted_clients?.enabled && (
              <>
                <div className="p-4 bg-yellow-100 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-800">
                      Trusted clients get unlimited understanding
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-2">
                    You manually promote your best clients to "Trusted" status. They'll get extra flexibility and caring outreach instead of consequences.
                  </p>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">How to promote clients to Trusted:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Go to client's profile</li>
                    <li>Click "Promote to Trusted Client"</li>
                    <li>They'll automatically get unlimited understanding</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )


  return (
    <div className="space-y-6">
      {showQuickSetup ? renderQuickSetup() : (
        <>
          {renderSimpleSettings()}
          
          {/* Quick Setup Option */}
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Want to try a different approach?</p>
                  <p className="text-sm text-gray-600">Quick setup with proven industry standards</p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setShowQuickSetup(true)}
                >
                  Quick Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Best Practices */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
        <div className="flex items-start">
          <InformationCircleIcon className="h-6 w-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium mb-2">Simple Client Understanding Best Practices:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Start simple:</strong> Most shops do great with 2 chances per 60 days</li>
              <li>• <strong>Promote trusted clients:</strong> Reward loyalty with extra understanding</li>
              <li>• <strong>Communicate clearly:</strong> Let clients know they have second chances</li>
              <li>• <strong>Show care:</strong> Use understanding as relationship-building opportunity</li>
              <li>• <strong>Stay flexible:</strong> Life happens - good clients deserve empathy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
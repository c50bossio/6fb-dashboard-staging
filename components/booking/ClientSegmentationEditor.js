'use client'

import {
  UserGroupIcon,
  StarIcon,
  TrophyIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

/**
 * ClientSegmentationEditor - Visual editor for defining client types and segmentation criteria
 * 
 * Features:
 * - New Client threshold configuration
 * - Regular Client criteria setting
 * - VIP/Loyal Client requirements
 * - Custom segment creation
 * - Real-time segment preview with mock data
 * - Visual feedback for criteria changes
 * - Mobile responsive design
 */

const DEFAULT_SEGMENTS = {
  newClient: {
    id: 'new',
    name: 'New Client',
    icon: UserGroupIcon,
    color: 'blue',
    criteria: {
      maxBookings: 3,
      maxMonths: 6,
      totalSpent: 0
    },
    description: 'First-time or recent clients still building trust'
  },
  regularClient: {
    id: 'regular',
    name: 'Regular Client',
    icon: CalendarDaysIcon,
    color: 'green',
    criteria: {
      minBookings: 4,
      minMonths: 3,
      minTotalSpent: 100,
      maxCancellations: 2
    },
    description: 'Established clients with consistent booking history'
  },
  vipClient: {
    id: 'vip',
    name: 'VIP Client',
    icon: StarIcon,
    color: 'gold',
    criteria: {
      minBookings: 12,
      minMonths: 6,
      minTotalSpent: 500,
      maxCancellations: 1,
      avgServiceValue: 75
    },
    description: 'High-value clients deserving premium treatment'
  },
  loyalClient: {
    id: 'loyal',
    name: 'Loyal Client', 
    icon: TrophyIcon,
    color: 'purple',
    criteria: {
      minBookings: 20,
      minMonths: 12,
      minTotalSpent: 1000,
      maxCancellations: 0,
      referralCount: 2
    },
    description: 'Top-tier clients with exceptional loyalty and value'
  }
}

const MOCK_CLIENTS = [
  { name: 'John Smith', bookings: 2, months: 2, totalSpent: 150, cancellations: 0, referrals: 0, avgServiceValue: 75 },
  { name: 'Sarah Johnson', bookings: 8, months: 4, totalSpent: 320, cancellations: 1, referrals: 1, avgServiceValue: 40 },
  { name: 'Mike Wilson', bookings: 15, months: 8, totalSpent: 750, cancellations: 0, referrals: 3, avgServiceValue: 50 },
  { name: 'Emily Davis', bookings: 25, months: 18, totalSpent: 1200, cancellations: 0, referrals: 5, avgServiceValue: 48 },
  { name: 'Alex Brown', bookings: 6, months: 3, totalSpent: 180, cancellations: 3, referrals: 0, avgServiceValue: 30 },
]

export function ClientSegmentationEditor({ 
  segments = DEFAULT_SEGMENTS, 
  onSegmentsChange,
  disabled = false,
  className = ''
}) {
  const [editingSegments, setEditingSegments] = useState(segments)
  const [previewVisible, setPreviewVisible] = useState(true)
  const [validationErrors, setValidationErrors] = useState({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    validateSegments()
    setHasUnsavedChanges(JSON.stringify(editingSegments) !== JSON.stringify(segments))
  }, [editingSegments, segments])

  const validateSegments = () => {
    const errors = {}
    
    Object.entries(editingSegments).forEach(([key, segment]) => {
      const segmentErrors = []
      
      // Check for overlapping criteria
      if (segment.criteria.maxBookings && segment.criteria.minBookings && 
          segment.criteria.maxBookings < segment.criteria.minBookings) {
        segmentErrors.push('Max bookings cannot be less than min bookings')
      }
      
      if (segment.criteria.minTotalSpent && segment.criteria.minTotalSpent < 0) {
        segmentErrors.push('Minimum spend cannot be negative')
      }
      
      if (!segment.name?.trim()) {
        segmentErrors.push('Segment name is required')
      }
      
      if (segmentErrors.length > 0) {
        errors[key] = segmentErrors
      }
    })
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const updateSegmentCriteria = (segmentId, field, value) => {
    const numValue = Math.max(0, Math.min(10000, parseFloat(value) || 0))
    setEditingSegments(prev => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        criteria: {
          ...prev[segmentId].criteria,
          [field]: numValue
        }
      }
    }))
  }

  const updateSegmentName = (segmentId, name) => {
    setEditingSegments(prev => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        name: name
      }
    }))
  }

  const addCustomSegment = () => {
    const newId = `custom_${Date.now()}`
    setEditingSegments(prev => ({
      ...prev,
      [newId]: {
        id: newId,
        name: 'Custom Segment',
        icon: AdjustmentsHorizontalIcon,
        color: 'gray',
        criteria: {
          minBookings: 1,
          minMonths: 1,
          minTotalSpent: 0
        },
        description: 'Custom client segment',
        custom: true
      }
    }))
  }

  const removeSegment = (segmentId) => {
    if (editingSegments[segmentId]?.custom) {
      setEditingSegments(prev => {
        const { [segmentId]: removed, ...rest } = prev
        return rest
      })
    }
  }

  const handleSave = () => {
    if (validateSegments()) {
      onSegmentsChange?.(editingSegments)
      setHasUnsavedChanges(false)
    }
  }

  const handleReset = () => {
    setEditingSegments(segments)
    setHasUnsavedChanges(false)
  }

  const categorizeClient = (client) => {
    for (const [segmentId, segment] of Object.entries(editingSegments)) {
      const { criteria } = segment
      let matches = true

      // Check all criteria
      if (criteria.minBookings && client.bookings < criteria.minBookings) matches = false
      if (criteria.maxBookings && client.bookings > criteria.maxBookings) matches = false
      if (criteria.minMonths && client.months < criteria.minMonths) matches = false
      if (criteria.maxMonths && client.months > criteria.maxMonths) matches = false
      if (criteria.minTotalSpent && client.totalSpent < criteria.minTotalSpent) matches = false
      if (criteria.maxCancellations && client.cancellations > criteria.maxCancellations) matches = false
      if (criteria.referralCount && client.referrals < criteria.referralCount) matches = false
      if (criteria.avgServiceValue && client.avgServiceValue < criteria.avgServiceValue) matches = false

      if (matches) {
        return { segmentId, segment }
      }
    }
    
    return { segmentId: 'uncategorized', segment: { name: 'Uncategorized', color: 'gray' } }
  }

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      gold: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
    }
    return colors[color] || colors.gray
  }

  const getIconColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600', 
      gold: 'text-yellow-600',
      purple: 'text-purple-600',
      gray: 'text-gray-600'
    }
    return colors[color] || colors.gray
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <UserGroupIcon className="h-6 w-6 text-olive-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Client Segmentation</h3>
            <p className="text-sm text-gray-600">Define client types and their criteria</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="small"
            icon={EyeIcon}
            onClick={() => setPreviewVisible(!previewVisible)}
          >
            {previewVisible ? 'Hide' : 'Show'} Preview
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
                disabled={disabled || Object.keys(validationErrors).length > 0}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Segment Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(editingSegments).map(([segmentId, segment]) => {
          const IconComponent = segment.icon
          const errors = validationErrors[segmentId] || []
          
          return (
            <Card key={segmentId} className={cn(
              'relative transition-all duration-200',
              errors.length > 0 && 'border-red-200 bg-red-50'
            )}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'p-2 rounded-lg border',
                      getColorClasses(segment.color)
                    )}>
                      <IconComponent className={cn('h-5 w-5', getIconColorClasses(segment.color))} />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={segment.name}
                        onChange={(e) => updateSegmentName(segmentId, e.target.value)}
                        className="font-semibold"
                        disabled={disabled}
                        placeholder="Segment name"
                      />
                    </div>
                  </div>
                  
                  {segment.custom && (
                    <Button
                      variant="ghost"
                      size="small"
                      icon={TrashIcon}
                      onClick={() => removeSegment(segmentId)}
                      className="text-red-600 hover:text-red-700"
                      disabled={disabled}
                    />
                  )}
                </div>
                
                <CardDescription>
                  {segment.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Booking Criteria */}
                <div className="grid grid-cols-2 gap-3">
                  {segment.criteria.hasOwnProperty('minBookings') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Bookings
                      </label>
                      <Input
                        type="number"
                        value={segment.criteria.minBookings || ''}
                        onChange={(e) => updateSegmentCriteria(segmentId, 'minBookings', e.target.value)}
                        disabled={disabled}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  )}
                  
                  {segment.criteria.hasOwnProperty('maxBookings') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Bookings
                      </label>
                      <Input
                        type="number"
                        value={segment.criteria.maxBookings || ''}
                        onChange={(e) => updateSegmentCriteria(segmentId, 'maxBookings', e.target.value)}
                        disabled={disabled}
                        placeholder="∞"
                        min="0"
                      />
                    </div>
                  )}
                </div>

                {/* Time & Spend Criteria */}
                <div className="grid grid-cols-2 gap-3">
                  {segment.criteria.hasOwnProperty('minMonths') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Months
                      </label>
                      <Input
                        type="number"
                        value={segment.criteria.minMonths || ''}
                        onChange={(e) => updateSegmentCriteria(segmentId, 'minMonths', e.target.value)}
                        disabled={disabled}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  )}
                  
                  {segment.criteria.hasOwnProperty('minTotalSpent') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Total Spent ($)
                      </label>
                      <Input
                        type="number"
                        value={segment.criteria.minTotalSpent || ''}
                        onChange={(e) => updateSegmentCriteria(segmentId, 'minTotalSpent', e.target.value)}
                        disabled={disabled}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  )}
                </div>

                {/* Advanced Criteria */}
                {(segment.criteria.hasOwnProperty('maxCancellations') || 
                  segment.criteria.hasOwnProperty('referralCount') || 
                  segment.criteria.hasOwnProperty('avgServiceValue')) && (
                  <div className="grid grid-cols-2 gap-3">
                    {segment.criteria.hasOwnProperty('maxCancellations') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Cancellations
                        </label>
                        <Input
                          type="number"
                          value={segment.criteria.maxCancellations || ''}
                          onChange={(e) => updateSegmentCriteria(segmentId, 'maxCancellations', e.target.value)}
                          disabled={disabled}
                          placeholder="∞"
                          min="0"
                        />
                      </div>
                    )}
                    
                    {segment.criteria.hasOwnProperty('referralCount') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Referrals
                        </label>
                        <Input
                          type="number"
                          value={segment.criteria.referralCount || ''}
                          onChange={(e) => updateSegmentCriteria(segmentId, 'referralCount', e.target.value)}
                          disabled={disabled}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    )}
                    
                    {segment.criteria.hasOwnProperty('avgServiceValue') && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Avg Service Value ($)
                        </label>
                        <Input
                          type="number"
                          value={segment.criteria.avgServiceValue || ''}
                          onChange={(e) => updateSegmentCriteria(segmentId, 'avgServiceValue', e.target.value)}
                          disabled={disabled}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Validation Errors */}
                {errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Configuration Issues:</p>
                        <ul className="text-sm text-red-700 mt-1 space-y-1">
                          {errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Add Custom Segment */}
        <Card className="border-dashed border-2 border-gray-300 hover:border-olive-400 transition-colors duration-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PlusIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-center mb-4">
              Add a custom client segment with your own criteria
            </p>
            <Button
              variant="secondary"
              icon={PlusIcon}
              onClick={addCustomSegment}
              disabled={disabled}
            >
              Add Custom Segment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      {previewVisible && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5" />
              <span>Segmentation Preview</span>
            </CardTitle>
            <CardDescription>
              See how sample clients would be categorized with current criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_CLIENTS.map((client, index) => {
                const { segment } = categorizeClient(client)
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-semibold text-gray-700">
                        {client.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-500">
                          {client.bookings} bookings • {client.months}mo • ${client.totalSpent}
                        </p>
                      </div>
                    </div>
                    
                    <div className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium border',
                      getColorClasses(segment.color)
                    )}>
                      {segment.name}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Panel */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Segmentation Tips:</p>
              <ul className="space-y-1">
                <li>• Segments are evaluated in order - more specific criteria should come first</li>
                <li>• Clients match the first segment that meets all their criteria</li>
                <li>• Consider seasonal variations in spending and booking patterns</li>
                <li>• Regular review ensures segments reflect your actual client base</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientSegmentationEditor
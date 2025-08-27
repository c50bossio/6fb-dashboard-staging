'use client'

import {
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TrashIcon,
  PlusIcon,
  Bars3Icon,
  BoltIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  EyeIcon,
  CalculatorIcon,
  ChartBarIcon,
  BeakerIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { cn, formatCurrency, formatPercentage } from '@/lib/utils'

/**
 * PenaltyProgressionEditor - Visual editor for custom penalty step configuration
 * 
 * Features:
 * - Drag-and-drop penalty step reordering
 * - Strike-by-strike penalty configuration
 * - Real-time penalty progression preview
 * - Warning vs fee threshold controls
 * - Visual penalty escalation chart
 * - Mobile responsive drag interface
 * - Bulk editing capabilities
 * - Cost impact calculator
 */

const DEFAULT_PENALTY_STEPS = [
  {
    id: 'step-1',
    strikeNumber: 1,
    type: 'warning',
    action: 'email_warning',
    feeAmount: 0,
    feePercentage: 0,
    description: 'First warning - educational email',
    waitingPeriod: 0,
    requiresApproval: false,
    active: true
  },
  {
    id: 'step-2',
    strikeNumber: 2,
    type: 'warning',
    action: 'deposit_required',
    feeAmount: 0,
    feePercentage: 50,
    description: 'Deposit required for future bookings',
    waitingPeriod: 7,
    requiresApproval: false,
    active: true
  },
  {
    id: 'step-3',
    strikeNumber: 3,
    type: 'fee',
    action: 'charge_fee',
    feeAmount: 25,
    feePercentage: 0,
    description: 'Fixed penalty fee charged',
    waitingPeriod: 0,
    requiresApproval: false,
    active: true
  },
  {
    id: 'step-4',
    strikeNumber: 4,
    type: 'fee',
    action: 'charge_percentage',
    feeAmount: 0,
    feePercentage: 100,
    description: 'Full service cost charged',
    waitingPeriod: 14,
    requiresApproval: true,
    active: true
  },
  {
    id: 'step-5',
    strikeNumber: 5,
    type: 'suspension',
    action: 'account_suspension',
    feeAmount: 0,
    feePercentage: 0,
    description: 'Account suspended - manager review required',
    waitingPeriod: 30,
    requiresApproval: true,
    active: true
  }
]

const ACTION_TYPES = {
  email_warning: { label: 'Email Warning', icon: InformationCircleIcon, severity: 'low' },
  sms_warning: { label: 'SMS Warning', icon: InformationCircleIcon, severity: 'low' },
  deposit_required: { label: 'Require Deposit', icon: ShieldExclamationIcon, severity: 'medium' },
  charge_fee: { label: 'Fixed Fee', icon: CurrencyDollarIcon, severity: 'high' },
  charge_percentage: { label: 'Percentage Fee', icon: CalculatorIcon, severity: 'high' },
  booking_restriction: { label: 'Limit Booking Days', icon: ExclamationTriangleIcon, severity: 'medium' },
  account_suspension: { label: 'Suspend Account', icon: BoltIcon, severity: 'critical' },
  manager_review: { label: 'Manager Review', icon: EyeIcon, severity: 'critical' }
}

const MOCK_SCENARIOS = [
  { name: 'Basic Cut', cost: 35, clientType: 'regular' },
  { name: 'Premium Service', cost: 85, clientType: 'vip' },
  { name: 'Quick Trim', cost: 25, clientType: 'new' },
  { name: 'Full Package', cost: 120, clientType: 'loyal' }
]

export function PenaltyProgressionEditor({ 
  penaltySteps = DEFAULT_PENALTY_STEPS, 
  onStepsChange,
  disabled = false,
  className = ''
}) {
  const [editingSteps, setEditingSteps] = useState(penaltySteps)
  const [draggedItem, setDraggedItem] = useState(null)
  const [previewVisible, setPreviewVisible] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState(MOCK_SCENARIOS[0])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const dragCounterRef = useRef(0)

  useEffect(() => {
    setHasUnsavedChanges(JSON.stringify(editingSteps) !== JSON.stringify(penaltySteps))
  }, [editingSteps, penaltySteps])

  // Cleanup drag counter on unmount
  useEffect(() => {
    return () => {
      dragCounterRef.current = 0
    }
  }, [])

  const handleDragStart = (e, stepId) => {
    setDraggedItem(stepId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', stepId)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    dragCounterRef.current = 0
  }

  const handleDragOver = (e) => {
    if (disabled) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e) => {
    if (disabled) return
    e.preventDefault()
    dragCounterRef.current++
  }

  const handleDragLeave = (e) => {
    if (disabled) return
    dragCounterRef.current--
  }

  const handleDrop = (e, targetId) => {
    if (disabled) return
    e.preventDefault()
    
    const sourceId = draggedItem
    if (sourceId === targetId) return

    const sourceIndex = editingSteps.findIndex(step => step.id === sourceId)
    const targetIndex = editingSteps.findIndex(step => step.id === targetId)

    if (sourceIndex === -1 || targetIndex === -1) return

    const newSteps = [...editingSteps]
    const [movedStep] = newSteps.splice(sourceIndex, 1)
    newSteps.splice(targetIndex, 0, movedStep)

    // Update strike numbers based on new order
    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      strikeNumber: index + 1
    }))

    setEditingSteps(updatedSteps)
  }

  const updateStep = (stepId, field, value) => {
    setEditingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, [field]: value }
        : step
    ))
  }

  const addNewStep = () => {
    const newStep = {
      id: `step-${Date.now()}`,
      strikeNumber: editingSteps.length + 1,
      type: 'warning',
      action: 'email_warning',
      feeAmount: 0,
      feePercentage: 0,
      description: 'New penalty step',
      waitingPeriod: 0,
      requiresApproval: false,
      active: true
    }
    setEditingSteps(prev => [...prev, newStep])
  }

  const removeStep = (stepId) => {
    setEditingSteps(prev => {
      const filtered = prev.filter(step => step.id !== stepId)
      return filtered.map((step, index) => ({
        ...step,
        strikeNumber: index + 1
      }))
    })
  }

  const moveStep = (stepId, direction) => {
    const currentIndex = editingSteps.findIndex(step => step.id === stepId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (targetIndex < 0 || targetIndex >= editingSteps.length) return

    const newSteps = [...editingSteps]
    const [movedStep] = newSteps.splice(currentIndex, 1)
    newSteps.splice(targetIndex, 0, movedStep)
    
    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      strikeNumber: index + 1
    }))
    
    setEditingSteps(updatedSteps)
  }

  const calculatePenalty = (step, serviceAmount) => {
    if (step.feeAmount > 0) return step.feeAmount
    if (step.feePercentage > 0) return (serviceAmount * step.feePercentage) / 100
    return 0
  }

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'text-blue-600 bg-blue-50 border-blue-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      critical: 'text-red-600 bg-red-50 border-red-200'
    }
    return colors[severity] || colors.low
  }

  const getTypeColor = (type) => {
    const colors = {
      warning: 'bg-blue-100 text-blue-800 border-blue-200',
      fee: 'bg-red-100 text-red-800 border-red-200',
      suspension: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[type] || colors.warning
  }

  const handleSave = () => {
    onStepsChange?.(editingSteps)
    setHasUnsavedChanges(false)
  }

  const handleReset = () => {
    setEditingSteps(penaltySteps)
    setHasUnsavedChanges(false)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="h-6 w-6 text-olive-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Penalty Progression</h3>
            <p className="text-sm text-gray-600">Configure step-by-step penalty escalation</p>
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
                disabled={disabled}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Penalty Steps Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bars3Icon className="h-5 w-5 text-gray-400" />
            <span>Penalty Steps</span>
            <span className="text-sm text-gray-500">({editingSteps.length} steps)</span>
          </CardTitle>
          <CardDescription>
            Drag and drop to reorder steps. Each step represents a progressive penalty level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {editingSteps.map((step, index) => {
            const actionType = ACTION_TYPES[step.action] || ACTION_TYPES.email_warning
            const IconComponent = actionType.icon
            
            return (
              <div
                key={step.id}
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, step.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, step.id)}
                className={cn(
                  'group relative bg-white border rounded-lg p-4 transition-all duration-200',
                  draggedItem === step.id && 'opacity-50 scale-95',
                  draggedItem && draggedItem !== step.id && 'scale-95',
                  !disabled && 'hover:border-olive-300 hover:shadow-md cursor-move'
                )}
              >
                {/* Step Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Bars3Icon className="h-4 w-4 text-gray-400" />
                      <div className="w-8 h-8 bg-olive-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-olive-700">{step.strikeNumber}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        'p-1.5 rounded-lg border',
                        getSeverityColor(actionType.severity)
                      )}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      
                      <div className={cn(
                        'px-2 py-1 rounded-md text-xs font-medium border',
                        getTypeColor(step.type)
                      )}>
                        {step.type.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="small"
                      icon={ArrowUpIcon}
                      onClick={() => moveStep(step.id, 'up')}
                      disabled={disabled || index === 0}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    <Button
                      variant="ghost"
                      size="small"
                      icon={ArrowDownIcon}
                      onClick={() => moveStep(step.id, 'down')}
                      disabled={disabled || index === editingSteps.length - 1}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    <Button
                      variant="ghost"
                      size="small"
                      icon={TrashIcon}
                      onClick={() => removeStep(step.id)}
                      disabled={disabled || editingSteps.length <= 1}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
                    />
                  </div>
                </div>

                {/* Step Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Type
                    </label>
                    <select
                      value={step.action}
                      onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-olive-500 focus:ring-2 focus:ring-olive-500 focus:ring-offset-2"
                    >
                      {Object.entries(ACTION_TYPES).map(([key, type]) => (
                        <option key={key} value={key}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {(step.action === 'charge_fee' || step.feeAmount > 0) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fixed Fee ($)
                      </label>
                      <Input
                        type="number"
                        value={step.feeAmount}
                        onChange={(e) => updateStep(step.id, 'feeAmount', Math.max(0, Math.min(1000, parseFloat(e.target.value) || 0)))}
                        disabled={disabled}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}

                  {(step.action === 'charge_percentage' || step.action === 'deposit_required' || step.feePercentage > 0) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Percentage (%)
                      </label>
                      <Input
                        type="number"
                        value={step.feePercentage}
                        onChange={(e) => updateStep(step.id, 'feePercentage', Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        disabled={disabled}
                        placeholder="0"
                        min="0"
                        max="100"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Waiting Period (days)
                    </label>
                    <Input
                      type="number"
                      value={step.waitingPeriod}
                      onChange={(e) => updateStep(step.id, 'waitingPeriod', Math.max(0, Math.min(365, parseInt(e.target.value) || 0)))}
                      disabled={disabled}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Input
                      value={step.description}
                      onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                      disabled={disabled}
                      placeholder="Describe what happens at this step"
                    />
                  </div>

                  <div className="md:col-span-3 flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={step.requiresApproval}
                        onChange={(e) => updateStep(step.id, 'requiresApproval', e.target.checked)}
                        disabled={disabled}
                        className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                      />
                      <span className="text-sm text-gray-700">Requires manager approval</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={step.active}
                        onChange={(e) => updateStep(step.id, 'active', e.target.checked)}
                        disabled={disabled}
                        className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add New Step */}
          <Button
            variant="ghost"
            icon={PlusIcon}
            onClick={addNewStep}
            disabled={disabled}
            className="w-full border-2 border-dashed border-gray-300 hover:border-olive-400 py-6"
          >
            Add New Penalty Step
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {previewVisible && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <BeakerIcon className="h-5 w-5" />
                <span>Penalty Progression Preview</span>
              </CardTitle>
              
              <select
                value={selectedScenario.name}
                onChange={(e) => setSelectedScenario(MOCK_SCENARIOS.find(s => s.name === e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-olive-500 focus:ring-2 focus:ring-olive-500 focus:ring-offset-2"
              >
                {MOCK_SCENARIOS.map(scenario => (
                  <option key={scenario.name} value={scenario.name}>
                    {scenario.name} ({formatCurrency(scenario.cost)})
                  </option>
                ))}
              </select>
            </div>
            <CardDescription>
              See how penalties escalate for different service costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Service</p>
                  <p className="font-semibold">{selectedScenario.name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Cost</p>
                  <p className="font-semibold">{formatCurrency(selectedScenario.cost)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Client Type</p>
                  <p className="font-semibold capitalize">{selectedScenario.clientType}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Total Steps</p>
                  <p className="font-semibold">{editingSteps.filter(s => s.active).length}</p>
                </div>
              </div>

              <div className="relative">
                {/* Progress Timeline */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                <div className="space-y-6">
                  {editingSteps.filter(step => step.active).map((step, index) => {
                    const penalty = calculatePenalty(step, selectedScenario.cost)
                    const actionType = ACTION_TYPES[step.action]
                    const IconComponent = actionType.icon
                    
                    return (
                      <div key={step.id} className="relative flex items-start space-x-4">
                        {/* Timeline Node */}
                        <div className={cn(
                          'relative z-10 w-8 h-8 rounded-full border-2 bg-white flex items-center justify-center',
                          getSeverityColor(actionType.severity).includes('blue') && 'border-blue-500',
                          getSeverityColor(actionType.severity).includes('yellow') && 'border-yellow-500',
                          getSeverityColor(actionType.severity).includes('orange') && 'border-orange-500',
                          getSeverityColor(actionType.severity).includes('red') && 'border-red-500'
                        )}>
                          <span className="text-xs font-bold">{step.strikeNumber}</span>
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <div className="bg-white border rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <IconComponent className="h-4 w-4 text-gray-600" />
                                <p className="font-medium text-gray-900">{actionType.label}</p>
                                {penalty > 0 && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                    {formatCurrency(penalty)}
                                  </span>
                                )}
                              </div>
                              
                              <div className={cn(
                                'px-2 py-1 rounded text-xs font-medium',
                                getTypeColor(step.type)
                              )}>
                                Strike {step.strikeNumber}
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                            
                            {(step.waitingPeriod > 0 || step.requiresApproval) && (
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                {step.waitingPeriod > 0 && (
                                  <span>⏱ {step.waitingPeriod} day waiting period</span>
                                )}
                                {step.requiresApproval && (
                                  <span>✋ Requires approval</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Progression Summary</p>
                    <p className="text-sm text-gray-600">
                      Total potential penalty: {formatCurrency(
                        editingSteps
                          .filter(s => s.active)
                          .reduce((sum, step) => sum + calculatePenalty(step, selectedScenario.cost), 0)
                      )}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    icon={PlayCircleIcon}
                  >
                    Test Progression
                  </Button>
                </div>
              </div>
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
              <p className="font-medium mb-2">Penalty Progression Best Practices:</p>
              <ul className="space-y-1">
                <li>• Start with educational warnings before imposing financial penalties</li>
                <li>• Use percentage-based fees for higher-value services to maintain fairness</li>
                <li>• Include waiting periods for serious penalties to allow client response</li>
                <li>• Require manager approval for account suspensions or high penalties</li>
                <li>• Consider client segment when designing penalty thresholds</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PenaltyProgressionEditor
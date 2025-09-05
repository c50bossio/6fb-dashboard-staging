/**
 * TierStructureBuilder Component
 * Visual editor for creating and configuring marginal commission tier structures
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Trash2, Plus, Move, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import financialService from '@/lib/financial-service'

const DEFAULT_TIERS = [
  { level: 1, name: 'Base', min_revenue: 0, max_revenue: 1000, commission_percentage: 50, color_code: '#CD7F32' },
  { level: 2, name: 'Growth', min_revenue: 1000, max_revenue: 3000, commission_percentage: 60, color_code: '#C0C0C0' },
  { level: 3, name: 'Performance', min_revenue: 3000, max_revenue: 5000, commission_percentage: 70, color_code: '#FFD700' },
  { level: 4, name: 'Elite', min_revenue: 5000, max_revenue: null, commission_percentage: 80, color_code: '#E5E4E2' }
]

const PRESET_TEMPLATES = {
  'basic': {
    name: 'Basic 50/50',
    description: 'Simple flat 50% commission',
    calculation_method: 'flat',
    tiers: [
      { level: 1, name: 'Standard', min_revenue: 0, max_revenue: null, commission_percentage: 50, color_code: '#6B7280' }
    ]
  },
  'growth': {
    name: 'Growth 3-Tier',
    description: 'Progressive tiers for growing barbers',
    calculation_method: 'marginal',
    tiers: [
      { level: 1, name: 'Starter', min_revenue: 0, max_revenue: 2000, commission_percentage: 55, color_code: '#CD7F32' },
      { level: 2, name: 'Growing', min_revenue: 2000, max_revenue: 5000, commission_percentage: 65, color_code: '#C0C0C0' },
      { level: 3, name: 'Established', min_revenue: 5000, max_revenue: null, commission_percentage: 75, color_code: '#FFD700' }
    ]
  },
  'performance': {
    name: 'Performance 5-Tier',
    description: 'Comprehensive performance-based system',
    calculation_method: 'marginal',
    tiers: DEFAULT_TIERS.concat([
      { level: 5, name: 'Master', min_revenue: 10000, max_revenue: null, commission_percentage: 85, color_code: '#9B59B6' }
    ])
  }
}

export default function TierStructureBuilder({ 
  barbershopId, 
  existingStructure = null,
  onSave,
  onCancel
}) {
  const [structure, setStructure] = useState({
    name: '',
    description: '',
    calculation_method: 'marginal',
    reset_period: 'monthly',
    reset_day: 1,
    is_default: false,
    is_active: true
  })
  
  const [tiers, setTiers] = useState(DEFAULT_TIERS)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [previewAmount, setPreviewAmount] = useState(3500)

  // Load existing structure if provided
  useEffect(() => {
    if (existingStructure) {
      setStructure({
        name: existingStructure.name || '',
        description: existingStructure.description || '',
        calculation_method: existingStructure.calculation_method || 'marginal',
        reset_period: existingStructure.reset_period || 'monthly',
        reset_day: existingStructure.reset_day || 1,
        is_default: existingStructure.is_default || false,
        is_active: existingStructure.is_active !== false
      })
      
      if (existingStructure.tiers && existingStructure.tiers.length > 0) {
        setTiers(existingStructure.tiers.sort((a, b) => a.tier_level - b.tier_level))
      }
    }
  }, [existingStructure])

  const handleStructureChange = (field, value) => {
    setStructure(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleTierChange = (index, field, value) => {
    const updatedTiers = [...tiers]
    updatedTiers[index] = {
      ...updatedTiers[index],
      [field]: field === 'commission_percentage' ? parseFloat(value) || 0 : value
    }
    
    // Auto-adjust adjacent tier boundaries for marginal calculation
    if (field === 'max_revenue' && structure.calculation_method === 'marginal') {
      if (index < tiers.length - 1 && value !== null && value !== '') {
        updatedTiers[index + 1] = {
          ...updatedTiers[index + 1],
          min_revenue: parseFloat(value) || 0
        }
      }
    }
    
    setTiers(updatedTiers)
  }

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1]
    const newTier = {
      level: tiers.length + 1,
      name: `Tier ${tiers.length + 1}`,
      min_revenue: lastTier?.max_revenue || 0,
      max_revenue: null,
      commission_percentage: Math.min(90, (lastTier?.commission_percentage || 50) + 10),
      color_code: '#6366F1'
    }
    
    setTiers([...tiers, newTier])
  }

  const removeTier = (index) => {
    if (tiers.length <= 1) return // Must have at least one tier
    
    const updatedTiers = tiers.filter((_, i) => i !== index)
    // Renumber tiers
    const renumberedTiers = updatedTiers.map((tier, i) => ({
      ...tier,
      level: i + 1
    }))
    
    setTiers(renumberedTiers)
  }

  const loadTemplate = (templateKey) => {
    const template = PRESET_TEMPLATES[templateKey]
    if (!template) return
    
    setStructure(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      calculation_method: template.calculation_method
    }))
    
    setTiers(template.tiers.map(tier => ({ ...tier })))
  }

  const validateStructure = () => {
    const newErrors = {}
    
    if (!structure.name?.trim()) {
      newErrors.name = 'Structure name is required'
    }
    
    if (tiers.length === 0) {
      newErrors.tiers = 'At least one tier is required'
    }
    
    // Validate tier ranges for marginal calculation
    if (structure.calculation_method === 'marginal') {
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i]
        const nextTier = tiers[i + 1]
        
        if (tier.min_revenue < 0) {
          newErrors[`tier_${i}_min`] = 'Minimum revenue cannot be negative'
        }
        
        if (tier.max_revenue !== null && tier.max_revenue <= tier.min_revenue) {
          newErrors[`tier_${i}_max`] = 'Maximum must be greater than minimum'
        }
        
        if (nextTier && tier.max_revenue !== nextTier.min_revenue && tier.max_revenue !== null) {
          newErrors[`tier_${i}_gap`] = 'Tier ranges must be continuous'
        }
        
        if (tier.commission_percentage < 0 || tier.commission_percentage > 100) {
          newErrors[`tier_${i}_rate`] = 'Commission rate must be between 0-100%'
        }
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const previewCalculation = () => {
    if (tiers.length === 0 || !previewAmount) return null
    
    if (structure.calculation_method === 'marginal') {
      return financialService.calculateMarginalCommission(previewAmount, tiers, { current_period_revenue: 0 })
    } else {
      // Flat calculation preview
      const applicableTier = [...tiers].reverse().find(tier => previewAmount >= (tier.min_revenue || 0))
      if (!applicableTier) return null
      
      const commission = previewAmount * (applicableTier.commission_percentage / 100)
      return {
        success: true,
        barberAmount: commission,
        shopAmount: previewAmount - commission,
        effectiveCommissionRate: applicableTier.commission_percentage,
        tierBreakdown: [{
          tier_name: applicableTier.name,
          tier_rate: applicableTier.commission_percentage,
          revenue_in_bracket: previewAmount,
          commission_earned: commission
        }]
      }
    }
  }

  const handleSave = async () => {
    if (!validateStructure()) {
      return
    }
    
    setSaving(true)
    
    try {
      const structureData = {
        ...structure,
        barbershop_id: barbershopId,
        tiers: tiers.map((tier, index) => ({
          ...tier,
          tier_level: index + 1
        }))
      }
      
      const result = await financialService.saveTierStructure(barbershopId, structureData)
      
      if (result.error) {
        setErrors({ save: result.error })
      } else {
        onSave?.(result.data)
      }
    } catch (error) {
      setErrors({ save: error.message })
    } finally {
      setSaving(false)
    }
  }

  const preview = previewCalculation()

  return (
    <div className="space-y-6">
      {/* Header & Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Tier Structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Templates */}
          <div>
            <Label className="text-sm font-medium">Quick Templates</Label>
            <div className="flex gap-2 mt-2">
              {Object.entries(PRESET_TEMPLATES).map(([key, template]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => loadTemplate(key)}
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Basic Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="structure-name">Structure Name *</Label>
              <Input
                id="structure-name"
                value={structure.name}
                onChange={(e) => handleStructureChange('name', e.target.value)}
                placeholder="e.g., Q1 2025 Performance Tiers"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="calculation-method">Calculation Method</Label>
              <Select
                value={structure.calculation_method}
                onValueChange={(value) => handleStructureChange('calculation_method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marginal">Marginal (Progressive Brackets)</SelectItem>
                  <SelectItem value="flat">Flat (All at tier rate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={structure.description}
              onChange={(e) => handleStructureChange('description', e.target.value)}
              placeholder="Brief description of this tier structure"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="reset-period">Reset Period</Label>
              <Select
                value={structure.reset_period}
                onValueChange={(value) => handleStructureChange('reset_period', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reset-day">Reset Day</Label>
              <Input
                id="reset-day"
                type="number"
                min="1"
                max="31"
                value={structure.reset_day}
                onChange={(e) => handleStructureChange('reset_day', parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="flex items-center space-x-2 mt-6">
              <Switch
                checked={structure.is_default}
                onCheckedChange={(checked) => handleStructureChange('is_default', checked)}
              />
              <Label>Default Structure</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Method Info */}
      {structure.calculation_method === 'marginal' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Marginal (Progressive) Calculation:</strong> Like tax brackets, each tier rate only applies to revenue within that range. 
            Example: First $1k at 50%, next $2k at 60%, remaining at 70%.
          </AlertDescription>
        </Alert>
      )}

      {/* Tier Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tier Configuration</CardTitle>
          <Button onClick={addTier} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Tier
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tiers.map((tier, index) => (
              <div
                key={`tier-${tier.level}-${index}`}
                className="border rounded-lg p-4 space-y-3"
                style={{ borderLeft: `4px solid ${tier.color_code}` }}
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Tier {tier.level}</Badge>
                  {tiers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTier(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor={`tier-${index}-name`}>Tier Name</Label>
                    <Input
                      id={`tier-${index}-name`}
                      value={tier.name}
                      onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                      placeholder="e.g., Bronze"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`tier-${index}-min`}>Min Revenue ($)</Label>
                    <Input
                      id={`tier-${index}-min`}
                      type="number"
                      min="0"
                      step="100"
                      value={tier.min_revenue || 0}
                      onChange={(e) => handleTierChange(index, 'min_revenue', parseFloat(e.target.value) || 0)}
                      className={errors[`tier_${index}_min`] ? 'border-red-500' : ''}
                    />
                    {errors[`tier_${index}_min`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`tier_${index}_min`]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`tier-${index}-max`}>Max Revenue ($)</Label>
                    <div className="relative">
                      <Input
                        id={`tier-${index}-max`}
                        type="number"
                        min={tier.min_revenue + 1}
                        step="100"
                        value={tier.max_revenue || ''}
                        onChange={(e) => handleTierChange(index, 'max_revenue', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Unlimited"
                        className={errors[`tier_${index}_max`] ? 'border-red-500' : ''}
                      />
                    </div>
                    {errors[`tier_${index}_max`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`tier_${index}_max`]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`tier-${index}-rate`}>Commission (%)</Label>
                    <Input
                      id={`tier-${index}-rate`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={tier.commission_percentage}
                      onChange={(e) => handleTierChange(index, 'commission_percentage', e.target.value)}
                      className={errors[`tier_${index}_rate`] ? 'border-red-500' : ''}
                    />
                    {errors[`tier_${index}_rate`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`tier_${index}_rate`]}</p>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Range: ${tier.min_revenue?.toLocaleString()} - {tier.max_revenue ? `$${tier.max_revenue.toLocaleString()}` : 'Unlimited'}
                  {structure.calculation_method === 'marginal' && (
                    <span className="ml-2">
                      (This rate applies only to revenue in this bracket)
                    </span>
                  )}
                </div>

                {errors[`tier_${index}_gap`] && (
                  <p className="text-xs text-red-500">{errors[`tier_${index}_gap`]}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Calculator */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="preview-amount">Test Revenue Amount ($)</Label>
                <Input
                  id="preview-amount"
                  type="number"
                  min="0"
                  step="100"
                  value={previewAmount}
                  onChange={(e) => setPreviewAmount(parseFloat(e.target.value) || 0)}
                  className="w-40"
                />
              </div>

              {preview.success && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Barber Earns</p>
                      <p className="text-xl font-bold text-green-600">
                        ${preview.barberAmount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Shop Keeps</p>
                      <p className="text-xl font-bold text-blue-600">
                        ${preview.shopAmount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Effective Rate</p>
                      <p className="text-xl font-bold text-purple-600">
                        {preview.effectiveCommissionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {preview.tierBreakdown && preview.tierBreakdown.length > 1 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Breakdown by Tier:</p>
                      <div className="space-y-1">
                        {preview.tierBreakdown.map((bracket, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>
                              {bracket.tier_name} ({bracket.tier_rate}%): 
                              ${bracket.revenue_in_bracket.toFixed(2)}
                            </span>
                            <span className="font-medium">
                              = ${bracket.commission_earned.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Structure'}
        </Button>
      </div>

      {errors.save && (
        <Alert variant="destructive">
          <AlertDescription>{errors.save}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
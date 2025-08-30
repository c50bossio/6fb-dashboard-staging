'use client'

import { 
  PlusIcon, 
  TrashIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import financialService from '@/lib/financial-service'

const TIER_COLORS = [
  '#6B7280', // Gray
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#EC4899'  // Pink
]

const RESET_PERIODS = [
  { value: 'monthly', label: 'Monthly', description: 'Tiers reset on the 1st of each month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Tiers reset every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'Tiers reset annually' }
]

const THRESHOLD_TYPES = [
  { value: 'revenue', label: 'Revenue Based', description: 'Based on total revenue generated', icon: CurrencyDollarIcon },
  { value: 'booking_count', label: 'Booking Count', description: 'Based on number of bookings completed', icon: ChartBarIcon },
  { value: 'client_count', label: 'Client Count', description: 'Based on unique clients served', icon: ChartBarIcon }
]

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num || 0)
}

export default function TierConfigurationInterface({ barberbarbershopId, onSave }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [structure, setStructure] = useState({
    name: 'Standard Performance Tiers',
    description: 'Progressive commission tiers that reward high-performing barbers',
    reset_period: 'monthly',
    reset_day: 1,
    is_default: true,
    tiers: [
      {
        tier_level: 1,
        name: 'Starter',
        threshold_type: 'revenue',
        threshold_amount: 0,
        commission_percentage: 50.00,
        color_code: TIER_COLORS[0]
      },
      {
        tier_level: 2,
        name: 'Professional',
        threshold_type: 'revenue',
        threshold_amount: 5000,
        commission_percentage: 60.00,
        color_code: TIER_COLORS[1]
      },
      {
        tier_level: 3,
        name: 'Elite',
        threshold_type: 'revenue',
        threshold_amount: 15000,
        commission_percentage: 70.00,
        color_code: TIER_COLORS[2]
      }
    ]
  })
  const [errors, setErrors] = useState({})
  const [previewData, setPreviewData] = useState(null)

  // Load existing tier structure
  const loadTierStructure = useCallback(async () => {
    if (!barberbarbershopId) return
    
    try {
      const { data, error } = await financialService.getTierStructure(barberbarbershopId)
      
      if (error) {
        console.error('Error loading tier structure:', error)
        return
      }
      
      if (data && data.tiers) {
        setStructure({
          id: data.id,
          name: data.name,
          description: data.description,
          reset_period: data.reset_period,
          reset_day: data.reset_day,
          is_default: data.is_default,
          tiers: data.tiers.map(tier => ({
            ...tier,
            threshold_amount: parseFloat(tier.threshold_amount) || 0,
            commission_percentage: parseFloat(tier.commission_percentage) || 0
          }))
        })
      }
    } catch (error) {
      console.error('Error loading tier structure:', error)
    } finally {
      setLoading(false)
    }
  }, [barberbarbershopId])

  useEffect(() => {
    loadTierStructure()
  }, [loadTierStructure])

  // Validate tier configuration
  const validateConfiguration = useCallback(() => {
    const newErrors = {}
    
    // Validate basic structure
    if (!structure.name?.trim()) {
      newErrors.name = 'Structure name is required'
    }
    
    if (!structure.tiers || structure.tiers.length === 0) {
      newErrors.tiers = 'At least one tier is required'
      return newErrors
    }
    
    // Validate tiers
    const tierErrors = []
    const thresholds = []
    
    structure.tiers.forEach((tier, index) => {
      const tierError = {}
      
      if (!tier.name?.trim()) {
        tierError.name = 'Tier name is required'
      }
      
      if (tier.commission_percentage < 0 || tier.commission_percentage > 100) {
        tierError.commission_percentage = 'Commission must be between 0% and 100%'
      }
      
      if (tier.threshold_amount < 0) {
        tierError.threshold_amount = 'Threshold cannot be negative'
      }
      
      // Check for duplicate thresholds
      if (thresholds.includes(tier.threshold_amount)) {
        tierError.threshold_amount = 'Duplicate threshold amount'
      }
      thresholds.push(tier.threshold_amount)
      
      // Check tier level ordering
      if (tier.tier_level !== index + 1) {
        tierError.tier_level = 'Tier levels must be sequential'
      }
      
      if (Object.keys(tierError).length > 0) {
        tierErrors[index] = tierError
      }
    })
    
    if (tierErrors.length > 0 && tierErrors.some(Boolean)) {
      newErrors.tiers = tierErrors
    }
    
    // Validate ascending thresholds
    const sortedThresholds = [...thresholds].sort((a, b) => a - b)
    if (JSON.stringify(thresholds) !== JSON.stringify(sortedThresholds)) {
      newErrors.threshold_order = 'Tier thresholds must be in ascending order'
    }
    
    // Validate ascending commission rates (recommended)
    const commissionRates = structure.tiers.map(t => t.commission_percentage)
    const sortedRates = [...commissionRates].sort((a, b) => a - b)
    if (JSON.stringify(commissionRates) !== JSON.stringify(sortedRates)) {
      newErrors.commission_order = 'Warning: Commission rates should typically increase with higher tiers'
    }
    
    setErrors(newErrors)
    return newErrors
  }, [structure])

  // Generate preview data for tier structure
  const generatePreview = useCallback(() => {
    const revenueExamples = [2500, 7500, 12500, 20000, 30000]
    const previews = []
    
    revenueExamples.forEach(revenue => {
      let applicableTier = structure.tiers[0]
      
      for (const tier of structure.tiers) {
        if (revenue >= tier.threshold_amount) {
          applicableTier = tier
        } else {
          break
        }
      }
      
      const commission = revenue * (applicableTier.commission_percentage / 100)
      const shopAmount = revenue - commission
      
      previews.push({
        revenue,
        tier: applicableTier,
        commission,
        shopAmount,
        commissionRate: applicableTier.commission_percentage
      })
    })
    
    setPreviewData(previews)
  }, [structure.tiers])

  useEffect(() => {
    generatePreview()
  }, [generatePreview])

  // Add new tier
  const addTier = () => {
    const newTierLevel = structure.tiers.length + 1
    const lastTier = structure.tiers[structure.tiers.length - 1]
    
    const newTier = {
      tier_level: newTierLevel,
      name: `Tier ${newTierLevel}`,
      threshold_type: lastTier?.threshold_type || 'revenue',
      threshold_amount: (lastTier?.threshold_amount || 0) + 5000,
      commission_percentage: Math.min(100, (lastTier?.commission_percentage || 50) + 5),
      color_code: TIER_COLORS[newTierLevel - 1] || TIER_COLORS[TIER_COLORS.length - 1]
    }
    
    setStructure(prev => ({
      ...prev,
      tiers: [...prev.tiers, newTier]
    }))
  }

  // Remove tier
  const removeTier = (index) => {
    if (structure.tiers.length <= 1) return
    
    setStructure(prev => ({
      ...prev,
      tiers: prev.tiers
        .filter((_, i) => i !== index)
        .map((tier, i) => ({ ...tier, tier_level: i + 1 }))
    }))
  }

  // Update tier
  const updateTier = (index, field, value) => {
    setStructure(prev => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) => 
        i === index 
          ? { ...tier, [field]: value }
          : tier
      )
    }))
  }

  // Save tier structure
  const handleSave = async () => {
    const validationErrors = validateConfiguration()
    
    if (Object.keys(validationErrors).length > 0) {
      return
    }
    
    setSaving(true)
    
    try {
      const { data, error } = await financialService.saveTierStructure(barberbarbershopId, structure)
      
      if (error) {
        throw new Error(error)
      }
      
      setStructure(prev => ({ ...prev, id: data.id }))
      
      if (onSave) {
        onSave(data)
      }
      
      // Show success message

    } catch (error) {
      console.error('Error saving tier structure:', error)
      setErrors({ save: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Commission Tier Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create progressive commission structures that reward high-performing barbers
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={loadTierStructure}
            disabled={loading}
          >
            Reset Changes
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || Object.keys(errors).length > 0}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {/* Basic Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Structure Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
              value={structure.name}
              onChange={(e) => setStructure(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Standard Performance Tiers"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reset Period
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
              value={structure.reset_period}
              onChange={(e) => setStructure(prev => ({ ...prev, reset_period: e.target.value }))}
            >
              {RESET_PERIODS.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {RESET_PERIODS.find(p => p.value === structure.reset_period)?.description}
            </p>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
            rows={3}
            value={structure.description}
            onChange={(e) => setStructure(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe how this tier structure works..."
          />
        </div>
      </Card>

      {/* Tier Configuration */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Commission Tiers</h3>
          <Button 
            variant="outline" 
            onClick={addTier}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Tier</span>
          </Button>
        </div>
        
        {errors.threshold_order && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{errors.threshold_order}</p>
            </div>
          </div>
        )}
        
        {errors.commission_order && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700">{errors.commission_order}</p>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {structure.tiers.map((tier, index) => (
            <div key={tier.tier_level} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tier.color_code }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900">
                    Tier {tier.tier_level}
                  </span>
                </div>
                
                {structure.tiers.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeTier(index)}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tier Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                    value={tier.name}
                    onChange={(e) => updateTier(index, 'name', e.target.value)}
                    placeholder="e.g., Professional"
                  />
                  {errors.tiers?.[index]?.name && (
                    <p className="text-xs text-red-600 mt-1">{errors.tiers[index].name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Threshold Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                    value={tier.threshold_type}
                    onChange={(e) => updateTier(index, 'threshold_type', e.target.value)}
                  >
                    {THRESHOLD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tier.threshold_type === 'revenue' ? 'Revenue Threshold' : 
                     tier.threshold_type === 'booking_count' ? 'Booking Threshold' : 
                     'Client Threshold'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={tier.threshold_type === 'revenue' ? "100" : "1"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                    value={tier.threshold_amount}
                    onChange={(e) => updateTier(index, 'threshold_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  {errors.tiers?.[index]?.threshold_amount && (
                    <p className="text-xs text-red-600 mt-1">{errors.tiers[index].threshold_amount}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                    value={tier.commission_percentage}
                    onChange={(e) => updateTier(index, 'commission_percentage', parseFloat(e.target.value) || 0)}
                    placeholder="60"
                  />
                  {errors.tiers?.[index]?.commission_percentage && (
                    <p className="text-xs text-red-600 mt-1">{errors.tiers[index].commission_percentage}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                {tier.threshold_type === 'revenue' && tier.threshold_amount > 0 && (
                  <p>Barbers earn {tier.commission_percentage}% commission when they generate {formatCurrency(tier.threshold_amount)}+ in revenue</p>
                )}
                {tier.threshold_type === 'booking_count' && tier.threshold_amount > 0 && (
                  <p>Barbers earn {tier.commission_percentage}% commission when they complete {formatNumber(tier.threshold_amount)}+ bookings</p>
                )}
                {tier.threshold_type === 'client_count' && tier.threshold_amount > 0 && (
                  <p>Barbers earn {tier.commission_percentage}% commission when they serve {formatNumber(tier.threshold_amount)}+ unique clients</p>
                )}
                {tier.threshold_amount === 0 && (
                  <p>Starting tier - {tier.commission_percentage}% commission rate</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Preview */}
      {previewData && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Commission Preview</h3>
          <p className="text-sm text-gray-600 mb-4">
            See how commissions would be calculated at different revenue levels
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barber Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shop Earnings
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((preview, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(preview.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: preview.tier.color_code }}
                        ></div>
                        <span className="text-sm text-gray-900">{preview.tier.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {preview.commissionRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(preview.commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(preview.shopAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Save Errors */}
      {errors.save && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Failed to Save</h3>
              <p className="text-sm text-red-700 mt-1">{errors.save}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
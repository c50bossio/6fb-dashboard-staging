/**
 * Barber Override Dialog
 * Creates and edits individual barber compensation overrides
 * Supports approval workflows and effective date management
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Save,
  AlertCircle,
  Info,
  Percent,
  Home,
  BarChart3,
  Shuffle,
  User,
  Calendar,
  DollarSign,
  Building2
} from 'lucide-react'

export default function BarberOverrideDialog({ 
  open, 
  onOpenChange, 
  barber, 
  shopDefaults, 
  onSave 
}) {
  const [loading, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [overrideData, setOverrideData] = useState({
    use_shop_defaults: true,
    override_model_type: null,
    override_commission_rate: 0.40,
    override_booth_rent_amount: 1500,
    override_booth_rent_frequency: 'monthly',
    override_hybrid_base_rent: 800,
    override_hybrid_commission_rate: 0.20,
    override_hybrid_threshold: 3000,
    override_product_commission_rate: 0.10,
    override_reason: '',
    effective_start_date: new Date().toISOString().split('T')[0],
    effective_end_date: null,
    requires_approval: true
  })

  // Initialize form data when dialog opens
  useEffect(() => {
    if (barber && open) {
      const isUsingDefaults = barber.compensation_source === 'shop_default'
      
      setOverrideData({
        use_shop_defaults: isUsingDefaults,
        override_model_type: isUsingDefaults ? null : barber.model_type,
        override_commission_rate: barber.commission_rate || shopDefaults?.commission_rate || 0.40,
        override_booth_rent_amount: barber.booth_rent_amount || shopDefaults?.booth_rent_amount || 1500,
        override_booth_rent_frequency: barber.booth_rent_frequency || shopDefaults?.booth_rent_frequency || 'monthly',
        override_hybrid_base_rent: barber.hybrid_base_rent || shopDefaults?.hybrid_base_rent || 800,
        override_hybrid_commission_rate: barber.hybrid_commission_rate || shopDefaults?.hybrid_commission_rate || 0.20,
        override_hybrid_threshold: barber.hybrid_threshold || shopDefaults?.hybrid_threshold || 3000,
        override_product_commission_rate: barber.product_commission_rate || shopDefaults?.product_commission_rate || 0.10,
        override_reason: barber.override_reason || '',
        effective_start_date: barber.effective_start_date ? 
          new Date(barber.effective_start_date).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0],
        effective_end_date: barber.effective_end_date ? 
          new Date(barber.effective_end_date).toISOString().split('T')[0] : 
          null,
        requires_approval: true
      })
      setError(null)
    }
  }, [barber, shopDefaults, open])

  const handleFieldChange = (field, value) => {
    setOverrideData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      // Validation
      if (!overrideData.use_shop_defaults) {
        if (!overrideData.override_model_type) {
          throw new Error('Please select a compensation model for the override')
        }
        
        if (!overrideData.override_reason?.trim()) {
          throw new Error('Please provide a reason for the custom compensation terms')
        }

        // Model-specific validation
        if (overrideData.override_model_type === 'commission') {
          if (overrideData.override_commission_rate <= 0 || overrideData.override_commission_rate >= 1) {
            throw new Error('Commission rate must be between 0% and 100%')
          }
        }
        
        if (overrideData.override_model_type === 'booth_rent') {
          if (overrideData.override_booth_rent_amount <= 0) {
            throw new Error('Booth rent amount must be greater than 0')
          }
        }
        
        if (overrideData.override_model_type === 'hybrid') {
          if (overrideData.override_hybrid_base_rent <= 0) {
            throw new Error('Hybrid base rent must be greater than 0')
          }
          if (overrideData.override_hybrid_commission_rate <= 0 || overrideData.override_hybrid_commission_rate >= 1) {
            throw new Error('Hybrid commission rate must be between 0% and 100%')
          }
          if (overrideData.override_hybrid_threshold <= 0) {
            throw new Error('Hybrid threshold must be greater than 0')
          }
        }
      }

      const saveData = overrideData.use_shop_defaults 
        ? { use_shop_defaults: true }
        : overrideData

      const options = {
        requires_approval: overrideData.requires_approval,
        effective_start_date: overrideData.effective_start_date,
        effective_end_date: overrideData.effective_end_date
      }

      await onSave(barber.barber_id, saveData, options)
      
    } catch (error) {
      console.error('Error saving override:', error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const getModelIcon = (modelType) => {
    switch (modelType) {
      case 'commission': return <Percent className="h-4 w-4" />
      case 'booth_rent': return <Home className="h-4 w-4" />
      case 'tiered': return <BarChart3 className="h-4 w-4" />
      case 'hybrid': return <Shuffle className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '??'
  }

  const formatPercentage = (decimal) => {
    return `${(decimal * 100).toFixed(1)}%`
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const currentModel = overrideData.use_shop_defaults 
    ? shopDefaults?.model_type 
    : overrideData.override_model_type

  if (!barber) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={barber.barber?.avatar_url} />
              <AvatarFallback>
                {getInitials(barber.barber?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>{barber.barber?.full_name}'s Compensation Override</span>
              <div className="flex items-center gap-2 mt-1">
                {barber.compensation_source === 'shop_default' ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Currently using shop defaults
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Has custom terms
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Create or modify custom compensation terms for this barber. 
            Leave "Use Shop Defaults" enabled to remove any existing overrides.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Override Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="use-shop-defaults">Use Shop Defaults</Label>
              <p className="text-sm text-gray-600">
                Enable to use barbershop defaults, disable to create custom terms
              </p>
            </div>
            <Switch
              id="use-shop-defaults"
              checked={overrideData.use_shop_defaults}
              onCheckedChange={(checked) => handleFieldChange('use_shop_defaults', checked)}
            />
          </div>

          {/* Show current shop defaults when using defaults */}
          {overrideData.use_shop_defaults && shopDefaults && (
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Current Shop Default:</strong>{' '}
                {getModelIcon(shopDefaults.model_type)}
                <span className="ml-1 capitalize">
                  {shopDefaults.model_type?.replace('_', ' ')} Model
                </span>
                {shopDefaults.model_type === 'commission' && (
                  <span> - {formatPercentage(shopDefaults.commission_rate)} shop commission</span>
                )}
                {shopDefaults.model_type === 'booth_rent' && (
                  <span> - {formatCurrency(shopDefaults.booth_rent_amount)}/{shopDefaults.booth_rent_frequency}</span>
                )}
                {shopDefaults.model_type === 'hybrid' && (
                  <span> - {formatCurrency(shopDefaults.hybrid_base_rent)} + {formatPercentage(shopDefaults.hybrid_commission_rate)}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Custom Override Configuration */}
          {!overrideData.use_shop_defaults && (
            <>
              {/* Model Selection */}
              <div className="space-y-4">
                <Label htmlFor="override-model">Compensation Model</Label>
                <Select 
                  value={overrideData.override_model_type || ''} 
                  onValueChange={(value) => handleFieldChange('override_model_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select compensation model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commission">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Commission Split
                      </div>
                    </SelectItem>
                    <SelectItem value="booth_rent">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Booth Rental
                      </div>
                    </SelectItem>
                    <SelectItem value="tiered">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Tiered Commission
                      </div>
                    </SelectItem>
                    <SelectItem value="hybrid">
                      <div className="flex items-center gap-2">
                        <Shuffle className="h-4 w-4" />
                        Hybrid Model
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model-Specific Configuration */}
              {currentModel === 'commission' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Commission Split Configuration
                  </h4>
                  <div>
                    <Label htmlFor="override-commission">Shop Commission Rate</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="override-commission"
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={overrideData.override_commission_rate}
                        onChange={(e) => handleFieldChange('override_commission_rate', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">
                        ({formatPercentage(overrideData.override_commission_rate)} shop, {formatPercentage(1 - overrideData.override_commission_rate)} barber)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {currentModel === 'booth_rent' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Booth Rental Configuration
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="override-booth-rent">Rent Amount</Label>
                      <Input
                        id="override-booth-rent"
                        type="number"
                        min="0"
                        step="50"
                        value={overrideData.override_booth_rent_amount}
                        onChange={(e) => handleFieldChange('override_booth_rent_amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="override-frequency">Frequency</Label>
                      <Select 
                        value={overrideData.override_booth_rent_frequency} 
                        onValueChange={(value) => handleFieldChange('override_booth_rent_frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {currentModel === 'hybrid' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shuffle className="h-4 w-4" />
                    Hybrid Model Configuration
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="override-hybrid-base">Base Rent</Label>
                      <Input
                        id="override-hybrid-base"
                        type="number"
                        min="0"
                        step="50"
                        value={overrideData.override_hybrid_base_rent}
                        onChange={(e) => handleFieldChange('override_hybrid_base_rent', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="override-hybrid-commission">Commission Rate</Label>
                      <Input
                        id="override-hybrid-commission"
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={overrideData.override_hybrid_commission_rate}
                        onChange={(e) => handleFieldChange('override_hybrid_commission_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="override-hybrid-threshold">Threshold</Label>
                      <Input
                        id="override-hybrid-threshold"
                        type="number"
                        min="0"
                        step="100"
                        value={overrideData.override_hybrid_threshold}
                        onChange={(e) => handleFieldChange('override_hybrid_threshold', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentModel === 'tiered' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Tiered Commission Configuration
                  </h4>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Tiered commission structures require separate tier configuration. 
                      This will be available after saving the basic model settings.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Product Commission (all models) */}
              <div>
                <Label htmlFor="override-product-commission">Product Commission Rate</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="override-product-commission"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={overrideData.override_product_commission_rate}
                    onChange={(e) => handleFieldChange('override_product_commission_rate', parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">
                    ({formatPercentage(overrideData.override_product_commission_rate)} on product sales)
                  </span>
                </div>
              </div>

              {/* Override Reason */}
              <div>
                <Label htmlFor="override-reason">Reason for Custom Terms *</Label>
                <Textarea
                  id="override-reason"
                  value={overrideData.override_reason}
                  onChange={(e) => handleFieldChange('override_reason', e.target.value)}
                  placeholder="Explain why this barber needs custom compensation terms (e.g., experience level, special arrangement, performance-based, etc.)"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {/* Effective Dates */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            <div>
              <Label htmlFor="start-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Effective Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={overrideData.effective_start_date}
                onChange={(e) => handleFieldChange('effective_start_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Effective End Date (Optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={overrideData.effective_end_date || ''}
                onChange={(e) => handleFieldChange('effective_end_date', e.target.value || null)}
              />
              <p className="text-xs text-gray-600 mt-1">
                Leave blank for permanent arrangement
              </p>
            </div>
          </div>

          {/* Approval Settings */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="requires-approval">Requires Manager Approval</Label>
              <p className="text-sm text-gray-600">
                Custom compensation terms will be pending until approved by management
              </p>
            </div>
            <Switch
              id="requires-approval"
              checked={overrideData.requires_approval}
              onCheckedChange={(checked) => handleFieldChange('requires_approval', checked)}
            />
          </div>
        </div>

        {/* Save Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {!overrideData.use_shop_defaults && overrideData.requires_approval && (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Changes will be pending approval
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Override'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
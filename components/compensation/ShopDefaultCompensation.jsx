/**
 * Shop Default Compensation Component
 * Manages shop-level default compensation settings
 * All barbers inherit these settings unless individually overridden
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Percent, 
  Home, 
  BarChart3, 
  Shuffle,
  Save,
  AlertCircle,
  Info,
  Users,
  Settings
} from 'lucide-react'

export default function ShopDefaultCompensation({ 
  barbershopId, 
  currentDefaults, 
  barbersUsingDefaults = 0,
  onUpdate 
}) {
  const [defaults, setDefaults] = useState({
    model_type: 'commission',
    commission_rate: 0.40,
    booth_rent_amount: 1500,
    booth_rent_frequency: 'monthly',
    tier_structure_id: null,
    use_marginal_calculation: true,
    hybrid_base_rent: 800,
    hybrid_commission_rate: 0.20,
    hybrid_threshold: 3000,
    product_commission_rate: 0.10,
    payment_methods: ['balance', 'ach', 'card'],
    billing_cycle: 'monthly',
    payment_due_day: 1,
    apply_to_new_barbers: true,
    allow_barber_overrides: true,
    require_approval_for_overrides: true
  })

  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Load current defaults
  useEffect(() => {
    if (currentDefaults) {
      setDefaults(prev => ({
        ...prev,
        ...currentDefaults,
        // Handle metadata fields
        apply_to_new_barbers: currentDefaults._metadata?.shop_config?.apply_to_new_barbers ?? true,
        allow_barber_overrides: currentDefaults._metadata?.shop_config?.allow_barber_overrides ?? true,
        require_approval_for_overrides: currentDefaults._metadata?.shop_config?.require_approval_for_overrides ?? true
      }))
    }
  }, [currentDefaults])

  // Track changes
  useEffect(() => {
    if (currentDefaults) {
      const currentValues = {
        ...currentDefaults,
        apply_to_new_barbers: currentDefaults._metadata?.shop_config?.apply_to_new_barbers ?? true,
        allow_barber_overrides: currentDefaults._metadata?.shop_config?.allow_barber_overrides ?? true,
        require_approval_for_overrides: currentDefaults._metadata?.shop_config?.require_approval_for_overrides ?? true
      }
      
      const hasChanged = Object.keys(defaults).some(key => {
        if (key.startsWith('_')) return false // Skip metadata
        return defaults[key] !== currentValues[key]
      })
      
      setHasChanges(hasChanged)
    }
  }, [defaults, currentDefaults])

  const handleFieldChange = (field, value) => {
    setDefaults(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)

    try {
      await onUpdate(defaults)
      setSaveMessage({
        type: 'success',
        message: `Shop defaults updated successfully! ${barbersUsingDefaults} barbers using defaults will be affected.`
      })
      setHasChanges(false)
    } catch (error) {
      setSaveMessage({
        type: 'error',
        message: error.message || 'Failed to update shop defaults'
      })
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
      default: return <Settings className="h-4 w-4" />
    }
  }

  const formatPercentage = (decimal) => {
    return `${(decimal * 100).toFixed(0)}%`
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  return (
    <div className="space-y-6">
      {/* Save Message */}
      {saveMessage && (
        <Alert variant={saveMessage.type === 'error' ? 'destructive' : 'default'}>
          {saveMessage.type === 'error' ? 
            <AlertCircle className="h-4 w-4" /> : 
            <Info className="h-4 w-4" />
          }
          <AlertDescription>{saveMessage.message}</AlertDescription>
        </Alert>
      )}

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Shop Default Compensation Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {getModelIcon(defaults.model_type)}
              <div>
                <h3 className="font-medium capitalize">
                  {defaults.model_type.replace('_', ' ')} Model
                </h3>
                <p className="text-sm text-gray-600">
                  Default compensation structure for all barbers
                </p>
              </div>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {barbersUsingDefaults} barbers affected
            </Badge>
          </div>

          {/* Model Selector */}
          <div className="space-y-4">
            <Label htmlFor="model-type">Compensation Model</Label>
            <Select 
              value={defaults.model_type} 
              onValueChange={(value) => handleFieldChange('model_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
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
        </CardContent>
      </Card>

      {/* Model-Specific Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Commission Model */}
          {defaults.model_type === 'commission' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="commission-rate">Shop Commission Rate</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="commission-rate"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={defaults.commission_rate}
                    onChange={(e) => handleFieldChange('commission_rate', parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">
                    ({formatPercentage(defaults.commission_rate)} shop, {formatPercentage(1 - defaults.commission_rate)} barber)
                  </span>
                </div>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Shop keeps {formatPercentage(defaults.commission_rate)} of service revenue, 
                  barber keeps {formatPercentage(1 - defaults.commission_rate)}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Booth Rent Model */}
          {defaults.model_type === 'booth_rent' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="booth-rent">Booth Rent Amount</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="booth-rent"
                    type="number"
                    min="0"
                    step="50"
                    value={defaults.booth_rent_amount}
                    onChange={(e) => handleFieldChange('booth_rent_amount', parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                  <Select 
                    value={defaults.booth_rent_frequency} 
                    onValueChange={(value) => handleFieldChange('booth_rent_frequency', value)}
                  >
                    <SelectTrigger className="w-32">
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

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Barbers pay {formatCurrency(defaults.booth_rent_amount)} {defaults.booth_rent_frequency} 
                  and keep 100% of their service revenue
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Tiered Model */}
          {defaults.model_type === 'tiered' && (
            <div className="space-y-4">
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Tiered commission structures require separate tier configuration. 
                  This will be available after saving the basic model settings.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Hybrid Model */}
          {defaults.model_type === 'hybrid' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="hybrid-base-rent">Base Rent</Label>
                  <Input
                    id="hybrid-base-rent"
                    type="number"
                    min="0"
                    step="50"
                    value={defaults.hybrid_base_rent}
                    onChange={(e) => handleFieldChange('hybrid_base_rent', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="hybrid-commission">Commission Rate</Label>
                  <Input
                    id="hybrid-commission"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={defaults.hybrid_commission_rate}
                    onChange={(e) => handleFieldChange('hybrid_commission_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="hybrid-threshold">Threshold</Label>
                  <Input
                    id="hybrid-threshold"
                    type="number"
                    min="0"
                    step="100"
                    value={defaults.hybrid_threshold}
                    onChange={(e) => handleFieldChange('hybrid_threshold', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Base rent: {formatCurrency(defaults.hybrid_base_rent)}/month + 
                  {formatPercentage(defaults.hybrid_commission_rate)} commission on revenue above {formatCurrency(defaults.hybrid_threshold)}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Product Commission (all models) */}
          <div>
            <Label htmlFor="product-commission">Product Commission Rate</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="product-commission"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={defaults.product_commission_rate}
                onChange={(e) => handleFieldChange('product_commission_rate', parseFloat(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-sm text-gray-600">
                ({formatPercentage(defaults.product_commission_rate)} on product sales)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="billing-cycle">Billing Cycle</Label>
              <Select 
                value={defaults.billing_cycle} 
                onValueChange={(value) => handleFieldChange('billing_cycle', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-due-day">Payment Due Day</Label>
              <Input
                id="payment-due-day"
                type="number"
                min="1"
                max="31"
                value={defaults.payment_due_day}
                onChange={(e) => handleFieldChange('payment_due_day', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shop Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Shop Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="apply-new-barbers">Apply to New Barbers</Label>
              <p className="text-sm text-gray-600">
                Automatically apply these defaults to newly added staff
              </p>
            </div>
            <Switch
              id="apply-new-barbers"
              checked={defaults.apply_to_new_barbers}
              onCheckedChange={(checked) => handleFieldChange('apply_to_new_barbers', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allow-overrides">Allow Individual Overrides</Label>
              <p className="text-sm text-gray-600">
                Let barbers request custom compensation terms
              </p>
            </div>
            <Switch
              id="allow-overrides"
              checked={defaults.allow_barber_overrides}
              onCheckedChange={(checked) => handleFieldChange('allow_barber_overrides', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="require-approval">Require Approval for Overrides</Label>
              <p className="text-sm text-gray-600">
                Manager approval needed for custom terms
              </p>
            </div>
            <Switch
              id="require-approval"
              checked={defaults.require_approval_for_overrides}
              onCheckedChange={(checked) => handleFieldChange('require_approval_for_overrides', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div>
          {hasChanges && (
            <p className="text-sm text-orange-600">
              You have unsaved changes that will affect {barbersUsingDefaults} barbers
            </p>
          )}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving || !hasChanges}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Shop Defaults'}
        </Button>
      </div>
    </div>
  )
}
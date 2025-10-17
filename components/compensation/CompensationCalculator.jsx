/**
 * Compensation Calculator
 * Interactive calculator for understanding compensation amounts
 * Supports all compensation models with real-time calculations
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/Separator'
import { 
  Calculator,
  DollarSign,
  Percent,
  Home,
  BarChart3,
  Shuffle,
  TrendingUp,
  Info,
  User,
  Building2,
  ArrowRight,
  Play
} from 'lucide-react'

export default function CompensationCalculator({ barbers = [], barbershopId }) {
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [calculationInputs, setCalculationInputs] = useState({
    service_revenue: 2000,
    product_sales: 500,
    days_worked: 22,
    hours_worked: 176,
    custom_model_type: 'commission',
    custom_commission_rate: 0.40,
    custom_booth_rent_amount: 1500,
    custom_booth_rent_frequency: 'monthly',
    custom_hybrid_base_rent: 800,
    custom_hybrid_commission_rate: 0.20,
    custom_hybrid_threshold: 3000,
    custom_product_commission_rate: 0.10
  })
  
  const [calculationResults, setCalculationResults] = useState(null)
  const [comparisonMode, setComparisonMode] = useState(false)

  // Calculate compensation based on inputs and model
  const calculateCompensation = (inputs, compensationModel) => {
    const {
      service_revenue = 0,
      product_sales = 0,
      days_worked = 22,
      hours_worked = 176
    } = inputs

    let shopAmount = 0
    let barberAmount = 0
    let breakdown = {}

    switch (compensationModel.model_type) {
      case 'commission':
        const shopCommission = service_revenue * compensationModel.commission_rate
        const barberCommission = service_revenue - shopCommission
        const productCommission = product_sales * (compensationModel.product_commission_rate || 0)
        
        shopAmount = shopCommission
        barberAmount = barberCommission + productCommission
        
        breakdown = {
          service_revenue: service_revenue,
          shop_commission: shopCommission,
          barber_commission: barberCommission,
          product_sales: product_sales,
          product_commission: productCommission,
          barber_total: barberAmount
        }
        break
        
      case 'booth_rent':
        let monthlyRent = compensationModel.booth_rent_amount
        if (compensationModel.booth_rent_frequency === 'weekly') {
          monthlyRent = monthlyRent * 4.33
        } else if (compensationModel.booth_rent_frequency === 'daily') {
          monthlyRent = monthlyRent * days_worked
        }
        
        const productCommissionBR = product_sales * (compensationModel.product_commission_rate || 0)
        shopAmount = monthlyRent
        barberAmount = service_revenue + productCommissionBR - shopAmount
        
        breakdown = {
          service_revenue: service_revenue,
          product_sales: product_sales,
          product_commission: productCommissionBR,
          rent_paid: monthlyRent,
          barber_keeps: service_revenue + productCommissionBR,
          net_barber_amount: barberAmount
        }
        break
        
      case 'hybrid':
        const baseRent = compensationModel.hybrid_base_rent
        const threshold = compensationModel.hybrid_threshold
        const commissionRate = compensationModel.hybrid_commission_rate
        
        let commission = 0
        if (service_revenue > threshold) {
          commission = (service_revenue - threshold) * commissionRate
        }
        
        const productCommissionHy = product_sales * (compensationModel.product_commission_rate || 0)
        shopAmount = baseRent + commission
        barberAmount = service_revenue - commission + productCommissionHy - baseRent
        
        breakdown = {
          service_revenue: service_revenue,
          base_rent: baseRent,
          revenue_over_threshold: Math.max(0, service_revenue - threshold),
          commission_on_excess: commission,
          product_sales: product_sales,
          product_commission: productCommissionHy,
          total_to_shop: shopAmount,
          barber_total: barberAmount
        }
        break
        
      case 'tiered':
        // Placeholder for tiered calculation
        shopAmount = service_revenue * 0.35 // Average
        barberAmount = service_revenue - shopAmount
        breakdown = {
          service_revenue: service_revenue,
          estimated_shop_share: shopAmount,
          estimated_barber_share: barberAmount,
          note: 'Tiered calculation requires tier structure configuration'
        }
        break
        
      default:
        shopAmount = 0
        barberAmount = service_revenue + product_sales
        breakdown = { note: 'Unknown compensation model' }
    }

    return {
      shopAmount,
      barberAmount,
      breakdown,
      totalRevenue: service_revenue + product_sales,
      model_type: compensationModel.model_type
    }
  }

  const handleCalculate = () => {
    let results = []
    
    if (selectedBarber) {
      // Calculate for selected barber's actual terms
      const barberModel = {
        model_type: selectedBarber.model_type,
        commission_rate: selectedBarber.commission_rate,
        booth_rent_amount: selectedBarber.booth_rent_amount,
        booth_rent_frequency: selectedBarber.booth_rent_frequency,
        hybrid_base_rent: selectedBarber.hybrid_base_rent,
        hybrid_commission_rate: selectedBarber.hybrid_commission_rate,
        hybrid_threshold: selectedBarber.hybrid_threshold,
        product_commission_rate: selectedBarber.product_commission_rate
      }
      
      const result = calculateCompensation(calculationInputs, barberModel)
      results.push({
        label: `${selectedBarber.barber?.full_name} (Current Terms)`,
        ...result
      })
    } else {
      // Calculate for custom model
      const customModel = {
        model_type: calculationInputs.custom_model_type,
        commission_rate: calculationInputs.custom_commission_rate,
        booth_rent_amount: calculationInputs.custom_booth_rent_amount,
        booth_rent_frequency: calculationInputs.custom_booth_rent_frequency,
        hybrid_base_rent: calculationInputs.custom_hybrid_base_rent,
        hybrid_commission_rate: calculationInputs.custom_hybrid_commission_rate,
        hybrid_threshold: calculationInputs.custom_hybrid_threshold,
        product_commission_rate: calculationInputs.custom_product_commission_rate
      }
      
      const result = calculateCompensation(calculationInputs, customModel)
      results.push({
        label: `Custom ${calculationInputs.custom_model_type.replace('_', ' ')} Model`,
        ...result
      })
    }
    
    setCalculationResults(results)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatPercentage = (decimal) => {
    return `${(decimal * 100).toFixed(1)}%`
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

  const handleInputChange = (field, value) => {
    setCalculationInputs(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Compensation Calculator
          </h3>
          <p className="text-sm text-gray-600">
            Calculate compensation amounts and run "what-if" scenarios
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Calculation Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Barber Selection */}
            <div>
              <Label htmlFor="barber-select">Calculate For</Label>
              <Select 
                value={selectedBarber?.barber_id || 'custom'} 
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setSelectedBarber(null)
                  } else {
                    const barber = barbers.find(b => b.barber_id === value)
                    setSelectedBarber(barber)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Custom Model (What-If)
                    </div>
                  </SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.barber_id} value={barber.barber_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {barber.barber?.full_name || 'Unknown Barber'}
                        <Badge variant="outline" size="sm">
                          {barber.model_type?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Revenue Inputs */}
            <div className="space-y-4">
              <h4 className="font-medium">Monthly Revenue</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-revenue">Service Revenue</Label>
                  <Input
                    id="service-revenue"
                    type="number"
                    min="0"
                    step="50"
                    value={calculationInputs.service_revenue}
                    onChange={(e) => handleInputChange('service_revenue', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="product-sales">Product Sales</Label>
                  <Input
                    id="product-sales"
                    type="number"
                    min="0"
                    step="25"
                    value={calculationInputs.product_sales}
                    onChange={(e) => handleInputChange('product_sales', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Work Schedule */}
            <div className="space-y-4">
              <h4 className="font-medium">Work Schedule</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="days-worked">Days Worked</Label>
                  <Input
                    id="days-worked"
                    type="number"
                    min="1"
                    max="31"
                    value={calculationInputs.days_worked}
                    onChange={(e) => handleInputChange('days_worked', parseInt(e.target.value) || 22)}
                  />
                </div>
                <div>
                  <Label htmlFor="hours-worked">Hours Worked</Label>
                  <Input
                    id="hours-worked"
                    type="number"
                    min="1"
                    step="1"
                    value={calculationInputs.hours_worked}
                    onChange={(e) => handleInputChange('hours_worked', parseFloat(e.target.value) || 176)}
                  />
                </div>
              </div>
            </div>

            {/* Custom Model Configuration (only when not using existing barber) */}
            {!selectedBarber && (
              <div className="space-y-4">
                <h4 className="font-medium">Custom Model Settings</h4>
                
                <div>
                  <Label htmlFor="custom-model">Model Type</Label>
                  <Select 
                    value={calculationInputs.custom_model_type} 
                    onValueChange={(value) => handleInputChange('custom_model_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commission">Commission Split</SelectItem>
                      <SelectItem value="booth_rent">Booth Rental</SelectItem>
                      <SelectItem value="tiered">Tiered Commission</SelectItem>
                      <SelectItem value="hybrid">Hybrid Model</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Model-specific inputs */}
                {calculationInputs.custom_model_type === 'commission' && (
                  <div>
                    <Label htmlFor="custom-commission">Shop Commission Rate</Label>
                    <Input
                      id="custom-commission"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={calculationInputs.custom_commission_rate}
                      onChange={(e) => handleInputChange('custom_commission_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                {calculationInputs.custom_model_type === 'booth_rent' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="custom-rent">Rent Amount</Label>
                      <Input
                        id="custom-rent"
                        type="number"
                        min="0"
                        step="50"
                        value={calculationInputs.custom_booth_rent_amount}
                        onChange={(e) => handleInputChange('custom_booth_rent_amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="custom-frequency">Frequency</Label>
                      <Select 
                        value={calculationInputs.custom_booth_rent_frequency} 
                        onValueChange={(value) => handleInputChange('custom_booth_rent_frequency', value)}
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
                )}

                {calculationInputs.custom_model_type === 'hybrid' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="custom-base-rent">Base Rent</Label>
                        <Input
                          id="custom-base-rent"
                          type="number"
                          min="0"
                          step="50"
                          value={calculationInputs.custom_hybrid_base_rent}
                          onChange={(e) => handleInputChange('custom_hybrid_base_rent', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-hybrid-commission">Commission Rate</Label>
                        <Input
                          id="custom-hybrid-commission"
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={calculationInputs.custom_hybrid_commission_rate}
                          onChange={(e) => handleInputChange('custom_hybrid_commission_rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-threshold">Threshold</Label>
                        <Input
                          id="custom-threshold"
                          type="number"
                          min="0"
                          step="100"
                          value={calculationInputs.custom_hybrid_threshold}
                          onChange={(e) => handleInputChange('custom_hybrid_threshold', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="custom-product-commission">Product Commission Rate</Label>
                  <Input
                    id="custom-product-commission"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={calculationInputs.custom_product_commission_rate}
                    onChange={(e) => handleInputChange('custom_product_commission_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}

            <Button onClick={handleCalculate} className="w-full flex items-center gap-2">
              <Play className="h-4 w-4" />
              Calculate Compensation
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!calculationResults ? (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Enter inputs and click "Calculate Compensation" to see results</p>
              </div>
            ) : (
              <div className="space-y-6">
                {calculationResults.map((result, index) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-center gap-2">
                      {getModelIcon(result.model_type)}
                      <h4 className="font-medium">{result.label}</h4>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(result.totalRevenue)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Barber Earns</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(result.barberAmount)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">Shop Gets</p>
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(result.shopAmount)}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm text-gray-700">Breakdown:</h5>
                      {Object.entries(result.breakdown).map(([key, value]) => {
                        if (key === 'note') {
                          return (
                            <Alert key={key}>
                              <Info className="h-4 w-4" />
                              <AlertDescription>{value}</AlertDescription>
                            </Alert>
                          )
                        }
                        
                        return (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="capitalize text-gray-600">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="font-medium">
                              {typeof value === 'number' ? formatCurrency(value) : value}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {index < calculationResults.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Scenario Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Low Month', service: 1200, product: 200 },
              { label: 'Average Month', service: 2500, product: 500 },
              { label: 'High Month', service: 4000, product: 800 }
            ].map((scenario, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => {
                  handleInputChange('service_revenue', scenario.service)
                  handleInputChange('product_sales', scenario.product)
                  setTimeout(handleCalculate, 100)
                }}
                className="flex flex-col items-center p-4 h-auto"
              >
                <span className="font-medium">{scenario.label}</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(scenario.service)} + {formatCurrency(scenario.product)}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
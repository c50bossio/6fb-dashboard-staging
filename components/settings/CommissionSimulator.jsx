/**
 * CommissionSimulator Component
 * Interactive calculator for previewing commission calculations
 * across different tier structures and scenarios
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Calculator, TrendingUp, Info, DollarSign } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import financialService from '@/lib/financial-service'

export default function CommissionSimulator({ 
  barbershopId,
  availableStructures = [],
  defaultStructureId = null
}) {
  const [selectedStructureId, setSelectedStructureId] = useState(defaultStructureId)
  const [selectedStructure, setSelectedStructure] = useState(null)
  const [currentRevenue, setCurrentRevenue] = useState(0)
  const [transactionAmount, setTransactionAmount] = useState(150)
  const [revenueRange, setRevenueRange] = useState([0, 10000])
  const [calculation, setCalculation] = useState(null)
  const [comparisonChart, setComparisonChart] = useState([])
  const [loading, setLoading] = useState(false)

  // Scenario presets
  const SCENARIOS = {
    'new_barber': { current: 0, transaction: 75, label: 'New Barber - First Cut' },
    'average_day': { current: 1200, transaction: 150, label: 'Average Day - Regular Client' },
    'premium_service': { current: 2800, transaction: 300, label: 'Premium Service - Special Occasion' },
    'tier_threshold': { current: 4900, transaction: 200, label: 'Near Tier Threshold' },
    'high_performer': { current: 8500, transaction: 180, label: 'High Performer - Busy Day' }
  }

  // Load tier structure details when selection changes
  useEffect(() => {
    if (selectedStructureId && availableStructures.length > 0) {
      const structure = availableStructures.find(s => s.id === selectedStructureId)
      setSelectedStructure(structure)
    }
  }, [selectedStructureId, availableStructures])

  // Recalculate when inputs change
  useEffect(() => {
    if (selectedStructure && selectedStructure.tiers) {
      calculateCommission()
    }
  }, [selectedStructure, currentRevenue, transactionAmount])

  // Generate comparison chart data
  useEffect(() => {
    if (selectedStructure && selectedStructure.tiers) {
      generateComparisonChart()
    }
  }, [selectedStructure, revenueRange])

  const calculateCommission = async () => {
    if (!selectedStructure || !selectedStructure.tiers) return

    setLoading(true)
    try {
      const currentProgress = {
        current_period_revenue: currentRevenue
      }

      let result
      if (selectedStructure.calculation_method === 'marginal') {
        result = financialService.calculateMarginalCommission(
          transactionAmount,
          selectedStructure.tiers,
          currentProgress
        )
      } else {
        // Flat calculation
        const totalRevenue = currentRevenue + transactionAmount
        const applicableTier = [...selectedStructure.tiers]
          .reverse()
          .find(tier => totalRevenue >= (tier.min_revenue || 0))
        
        if (applicableTier) {
          const commission = transactionAmount * (applicableTier.commission_percentage / 100)
          result = {
            success: true,
            barberAmount: commission,
            shopAmount: transactionAmount - commission,
            effectiveCommissionRate: applicableTier.commission_percentage,
            tierBreakdown: [{
              tier_name: applicableTier.name,
              tier_rate: applicableTier.commission_percentage,
              revenue_in_bracket: transactionAmount,
              commission_earned: commission
            }],
            calculationMethod: 'flat'
          }
        }
      }

      setCalculation(result)
    } catch (error) {
      console.error('Simulation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateComparisonChart = () => {
    if (!selectedStructure || !selectedStructure.tiers) return

    const [minRevenue, maxRevenue] = revenueRange
    const step = (maxRevenue - minRevenue) / 20
    const points = []

    for (let revenue = minRevenue; revenue <= maxRevenue; revenue += step) {
      let effectiveRate = 0
      let totalCommission = 0

      if (selectedStructure.calculation_method === 'marginal') {
        const result = financialService.calculateMarginalCommission(
          revenue,
          selectedStructure.tiers,
          { current_period_revenue: 0 }
        )
        if (result.success) {
          effectiveRate = result.effectiveCommissionRate
          totalCommission = result.barberAmount
        }
      } else {
        const applicableTier = [...selectedStructure.tiers]
          .reverse()
          .find(tier => revenue >= (tier.min_revenue || 0))
        
        if (applicableTier) {
          effectiveRate = applicableTier.commission_percentage
          totalCommission = revenue * (effectiveRate / 100)
        }
      }

      points.push({
        revenue: Math.round(revenue),
        effectiveRate: Math.round(effectiveRate * 10) / 10,
        commission: Math.round(totalCommission),
        shopAmount: Math.round(revenue - totalCommission)
      })
    }

    setComparisonChart(points)
  }

  const loadScenario = (scenarioKey) => {
    const scenario = SCENARIOS[scenarioKey]
    if (scenario) {
      setCurrentRevenue(scenario.current)
      setTransactionAmount(scenario.transaction)
    }
  }

  const getCurrentTierInfo = () => {
    if (!selectedStructure || !selectedStructure.tiers || currentRevenue === 0) return null

    if (selectedStructure.calculation_method === 'marginal') {
      // Find which tiers the current revenue spans
      const applicableTiers = selectedStructure.tiers.filter(tier => {
        const tierMax = tier.max_revenue || Infinity
        return currentRevenue > tier.min_revenue && tier.min_revenue < currentRevenue
      })
      return applicableTiers.length > 0 ? applicableTiers[applicableTiers.length - 1] : selectedStructure.tiers[0]
    } else {
      // Flat: find the tier the barber qualifies for
      return [...selectedStructure.tiers]
        .reverse()
        .find(tier => currentRevenue >= (tier.min_revenue || 0)) || selectedStructure.tiers[0]
    }
  }

  const getNextTierInfo = () => {
    if (!selectedStructure || !selectedStructure.tiers) return null

    const sortedTiers = [...selectedStructure.tiers].sort((a, b) => a.tier_level - b.tier_level)
    const nextTier = sortedTiers.find(tier => (tier.min_revenue || 0) > currentRevenue)
    
    return nextTier
  }

  const currentTier = getCurrentTierInfo()
  const nextTier = getNextTierInfo()

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Commission Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Structure Selection */}
          <div>
            <Label htmlFor="structure-select">Tier Structure</Label>
            <Select
              value={selectedStructureId || ''}
              onValueChange={setSelectedStructureId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tier structure to simulate" />
              </SelectTrigger>
              <SelectContent>
                {availableStructures.map(structure => (
                  <SelectItem key={structure.id} value={structure.id}>
                    {structure.name} ({structure.calculation_method})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Scenarios */}
          <div>
            <Label className="text-sm font-medium">Quick Scenarios</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(SCENARIOS).map(([key, scenario]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => loadScenario(key)}
                >
                  {scenario.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Input Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="current-revenue">Current Period Revenue ($)</Label>
              <Input
                id="current-revenue"
                type="number"
                min="0"
                step="50"
                value={currentRevenue}
                onChange={(e) => setCurrentRevenue(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Revenue earned so far this period
              </p>
            </div>

            <div>
              <Label htmlFor="transaction-amount">Transaction Amount ($)</Label>
              <Input
                id="transaction-amount"
                type="number"
                min="0"
                step="25"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Amount of this specific transaction
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Position */}
      {currentTier && (
        <Card>
          <CardHeader>
            <CardTitle>Current Tier Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge 
                    variant="secondary" 
                    style={{ backgroundColor: currentTier.color_code + '20', color: currentTier.color_code }}
                  >
                    {currentTier.name} - {currentTier.commission_percentage}%
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    Range: ${(currentTier.min_revenue || 0).toLocaleString()} - {
                      currentTier.max_revenue ? `$${currentTier.max_revenue.toLocaleString()}` : 'Unlimited'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">${currentRevenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Current Revenue</p>
                </div>
              </div>

              {nextTier && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress to {nextTier.name}</span>
                    <span>
                      ${currentRevenue.toLocaleString()} / ${nextTier.min_revenue.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(currentRevenue / nextTier.min_revenue) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ${(nextTier.min_revenue - currentRevenue).toLocaleString()} until {nextTier.name} tier ({nextTier.commission_percentage}%)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Result */}
      {calculation && calculation.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Transaction Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Results */}
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700">Barber Earns</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${calculation.barberAmount.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700">Shop Keeps</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${calculation.shopAmount.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-700">Effective Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {calculation.effectiveCommissionRate.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Tier Breakdown */}
              {calculation.tierBreakdown && calculation.tierBreakdown.length > 0 && (
                <div className="md:col-span-2">
                  <h4 className="font-medium mb-3">
                    {calculation.calculationMethod === 'marginal' ? 'Marginal Breakdown' : 'Tier Applied'}
                  </h4>
                  <div className="space-y-2">
                    {calculation.tierBreakdown.map((bracket, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{bracket.tier_name}</span>
                          <span className="text-sm text-gray-600 ml-2">({bracket.tier_rate}%)</span>
                          {calculation.calculationMethod === 'marginal' && (
                            <p className="text-xs text-gray-500">
                              ${bracket.revenue_in_bracket.toFixed(2)} in this bracket
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            +${bracket.commission_earned.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {calculation.calculationMethod === 'marginal' && calculation.tierBreakdown.length > 1 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded border-t-2 border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Commission</span>
                        <span className="text-lg font-bold text-blue-600">
                          ${calculation.barberAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* New Revenue Total */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">New Period Total</p>
                  <p className="font-bold">${(currentRevenue + transactionAmount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transaction</p>
                  <p className="font-bold">+${transactionAmount.toLocaleString()}</p>
                </div>
                {nextTier && (
                  <div>
                    <p className="text-sm text-gray-600">To Next Tier</p>
                    <p className="font-bold">
                      ${Math.max(0, nextTier.min_revenue - currentRevenue - transactionAmount).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Chart */}
      {comparisonChart.length > 0 && selectedStructure && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Commission Rate Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Range Controls */}
              <div>
                <Label>Revenue Range for Analysis ($)</Label>
                <div className="px-4 py-2">
                  <Slider
                    value={revenueRange}
                    onValueChange={setRevenueRange}
                    max={20000}
                    min={0}
                    step={500}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>${revenueRange[0].toLocaleString()}</span>
                    <span>${revenueRange[1].toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Simple Chart */}
              <div className="h-64 overflow-x-auto">
                <div className="flex items-end space-x-1 h-full min-w-full">
                  {comparisonChart.map((point, index) => (
                    <div key={index} className="flex flex-col items-center flex-1 min-w-0">
                      <div className="w-full bg-blue-200 rounded-t flex flex-col justify-end" style={{ height: '200px' }}>
                        <div 
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                          style={{ height: `${(point.effectiveRate / 100) * 180}px` }}
                          title={`Revenue: $${point.revenue.toLocaleString()}\nRate: ${point.effectiveRate}%\nCommission: $${point.commission.toLocaleString()}`}
                        />
                      </div>
                      <div className="text-xs text-center mt-1 transform -rotate-45 origin-left">
                        {point.revenue >= 1000 ? `$${(point.revenue / 1000).toFixed(0)}k` : `$${point.revenue}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Info */}
              <div className="text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {selectedStructure.calculation_method === 'marginal' 
                    ? 'Shows effective commission rate across revenue levels (marginal calculation)'
                    : 'Shows commission rate tiers (flat calculation)'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Structure Selected */}
      {!selectedStructure && (
        <Card>
          <CardContent className="text-center py-12">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Select a tier structure above to start simulating commission calculations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
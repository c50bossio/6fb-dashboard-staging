/**
 * Unified Compensation Hub
 * Single source of truth for all compensation management
 * Handles shop defaults + individual barber overrides
 * Integrates with Stripe for payments
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { 
  Settings, 
  Users, 
  Calculator, 
  DollarSign, 
  TrendingUp,
  Edit,
  Check,
  AlertTriangle,
  Info,
  Building2,
  User
} from 'lucide-react'

// Import sub-components
import ShopDefaultCompensation from './ShopDefaultCompensation'
import BarberCompensationGrid from './BarberCompensationGrid'
import CompensationCalculator from './CompensationCalculator'
import PaymentManagement from './PaymentManagement'

export default function UnifiedCompensationHub({ barbershopId, currentUser }) {
  const [activeTab, setActiveTab] = useState('defaults')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [compensationData, setCompensationData] = useState({
    shop_defaults: null,
    all_barber_compensation: [],
    payment_history: []
  })
  const [stats, setStats] = useState({
    total_barbers: 0,
    using_defaults: 0,
    custom_arrangements: 0,
    pending_payments: 0,
    total_monthly_compensation: 0
  })

  // Load all compensation data
  useEffect(() => {
    if (barbershopId) {
      loadCompensationData()
    }
  }, [barbershopId])

  const loadCompensationData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load all compensation data
      const response = await fetch(`/api/v1/compensation/unified?type=all&includePayments=true`)
      
      if (!response.ok) {
        throw new Error('Failed to load compensation data')
      }

      const data = await response.json()
      setCompensationData(data)

      // Calculate stats
      const allBarbers = data.all_barber_compensation || []
      const usingDefaults = allBarbers.filter(b => b.compensation_source === 'shop_default')
      const customArrangements = allBarbers.filter(b => b.compensation_source !== 'shop_default')
      
      setStats({
        total_barbers: allBarbers.length,
        using_defaults: usingDefaults.length,
        custom_arrangements: customArrangements.length,
        pending_payments: 0, // TODO: Calculate from payment data
        total_monthly_compensation: 0 // TODO: Calculate estimated monthly
      })

    } catch (error) {
      console.error('Error loading compensation data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleShopDefaultsUpdate = async (newDefaults) => {
    try {
      const response = await fetch('/api/v1/compensation/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_shop_defaults',
          data: newDefaults
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update shop defaults')
      }

      // Reload data to reflect changes
      await loadCompensationData()
      
      return { success: true }
    } catch (error) {
      console.error('Error updating shop defaults:', error)
      throw error
    }
  }

  const handleBarberOverrideUpdate = async (barberId, overrides, options = {}) => {
    try {
      const response = await fetch('/api/v1/compensation/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_barber_override',
          data: {
            barber_id: barberId,
            overrides,
            options
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update barber compensation')
      }

      // Reload data to reflect changes
      await loadCompensationData()
      
      return { success: true }
    } catch (error) {
      console.error('Error updating barber compensation:', error)
      throw error
    }
  }

  const handleRemoveOverride = async (barberId) => {
    try {
      const response = await fetch(`/api/v1/compensation/unified?type=barber_override&barberId=${barberId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove barber override')
      }

      // Reload data to reflect changes
      await loadCompensationData()
      
      return { success: true }
    } catch (error) {
      console.error('Error removing barber override:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading compensation data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Total Barbers</p>
                <p className="text-2xl font-bold">{stats.total_barbers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Using Defaults</p>
                <p className="text-2xl font-bold text-blue-600">{stats.using_defaults}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <User className="h-4 w-4 text-orange-500" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Custom Terms</p>
                <p className="text-2xl font-bold text-orange-600">{stats.custom_arrangements}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Pending Payments</p>
                <p className="text-2xl font-bold text-green-600">${stats.pending_payments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Monthly Est.</p>
                <p className="text-2xl font-bold text-purple-600">${stats.total_monthly_compensation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Compensation Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Compensation Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="defaults" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Shop Defaults
              </TabsTrigger>
              <TabsTrigger value="barbers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staff Management
              </TabsTrigger>
              <TabsTrigger value="calculator" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calculator
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payments
              </TabsTrigger>
            </TabsList>

            {/* Shop Defaults Tab */}
            <TabsContent value="defaults" className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Shop defaults apply to all barbers unless they have individual custom arrangements. 
                  Changes here will affect {stats.using_defaults} barbers currently using defaults.
                </AlertDescription>
              </Alert>

              <ShopDefaultCompensation
                barbershopId={barbershopId}
                currentDefaults={compensationData.shop_defaults}
                barbersUsingDefaults={stats.using_defaults}
                onUpdate={handleShopDefaultsUpdate}
              />
            </TabsContent>

            {/* Staff Management Tab */}
            <TabsContent value="barbers" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Staff Compensation</h3>
                  <p className="text-sm text-gray-600">
                    Manage individual barber compensation arrangements
                  </p>
                </div>
                <Button onClick={loadCompensationData} variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <BarberCompensationGrid
                barbers={compensationData.all_barber_compensation}
                shopDefaults={compensationData.shop_defaults}
                onUpdateBarber={handleBarberOverrideUpdate}
                onRemoveOverride={handleRemoveOverride}
              />
            </TabsContent>

            {/* Calculator Tab */}
            <TabsContent value="calculator" className="space-y-6">
              <CompensationCalculator
                barbers={compensationData.all_barber_compensation}
                barbershopId={barbershopId}
              />
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6">
              <PaymentManagement
                barbershopId={barbershopId}
                barbers={compensationData.all_barber_compensation}
                paymentHistory={compensationData.payment_history}
                onProcessPayment={async (barberId, amount, options) => {
                  // Handle payment processing
                  const response = await fetch('/api/v1/compensation/unified', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      action: 'process_payment',
                      data: {
                        targetBarberId: barberId,
                        amount,
                        paymentOptions: options
                      }
                    })
                  })

                  if (!response.ok) {
                    throw new Error('Payment processing failed')
                  }

                  const result = await response.json()
                  await loadCompensationData() // Refresh data
                  return result
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
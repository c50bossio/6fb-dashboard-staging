/**
 * CommissionSettings Component
 * Main commission and tier management interface for UnifiedSettingsInterface
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Settings, Users, Calculator, TrendingUp, Plus, Edit, Trash2 } from 'lucide-react'
import TierStructureBuilder from './TierStructureBuilder'
import CommissionSimulator from './CommissionSimulator'
import BarberProgressDashboard from './BarberProgressDashboard'
import financialService from '@/lib/financial-service'

export default function CommissionSettings({ 
  barbershopId, 
  onUpdate,
  currentUser
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [tierStructures, setTierStructures] = useState([])
  const [barberArrangements, setBarberArrangements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingStructure, setEditingStructure] = useState(null)

  // Load data on component mount
  useEffect(() => {
    loadCommissionData()
  }, [barbershopId])

  const loadCommissionData = async () => {
    if (!barbershopId) return

    setLoading(true)
    setError(null)

    try {
      // Load tier structures
      const structuresResult = await financialService.getTierStructure(barbershopId)
      if (structuresResult.data) {
        setTierStructures([structuresResult.data])
      }

      // Load barber arrangements
      const arrangementsResult = await financialService.getShopArrangements(barbershopId)
      if (arrangementsResult.data) {
        setBarberArrangements(arrangementsResult.data)
      }

    } catch (error) {
      console.error('Error loading commission data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStructureSave = async (structureData) => {
    try {
      await loadCommissionData() // Refresh data
      setShowBuilder(false)
      setEditingStructure(null)
      onUpdate?.()
    } catch (error) {
      console.error('Error after structure save:', error)
    }
  }

  const handleEditStructure = (structure) => {
    setEditingStructure(structure)
    setShowBuilder(true)
    setActiveTab('structure')
  }

  const handleDeleteStructure = async (structureId) => {
    if (!confirm('Are you sure you want to delete this tier structure? This will affect all barbers using it.')) {
      return
    }

    try {
      // Implementation would depend on your delete method
      // await financialService.deleteTierStructure(structureId)
      await loadCommissionData()
      onUpdate?.()
    } catch (error) {
      setError(error.message)
    }
  }

  const getDefaultStructure = () => {
    return tierStructures.find(s => s.is_default) || tierStructures[0]
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading commission settings...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tier Structure
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulator
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Barber Progress
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Current Structure Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Current Commission Structure</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingStructure(getDefaultStructure())
                  setActiveTab('structure')
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Structure
              </Button>
            </CardHeader>
            <CardContent>
              {getDefaultStructure() ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Structure Name</p>
                      <p className="font-medium">{getDefaultStructure().name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Calculation Method</p>
                      <Badge variant={getDefaultStructure().calculation_method === 'marginal' ? 'default' : 'secondary'}>
                        {getDefaultStructure().calculation_method === 'marginal' ? 'Marginal (Progressive)' : 'Flat Rate'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reset Period</p>
                      <p className="font-medium capitalize">{getDefaultStructure().reset_period}</p>
                    </div>
                  </div>

                  {getDefaultStructure().tiers && (
                    <div>
                      <p className="text-sm font-medium mb-2">Tier Summary ({getDefaultStructure().tiers.length} tiers)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {getDefaultStructure().tiers
                          .sort((a, b) => a.tier_level - b.tier_level)
                          .map(tier => (
                            <div 
                              key={tier.tier_level}
                              className="p-3 rounded border-l-4 bg-gray-50"
                              style={{ borderLeftColor: tier.color_code }}
                            >
                              <p className="font-medium text-sm">{tier.name}</p>
                              <p className="text-xs text-gray-600">
                                ${(tier.min_revenue || 0).toLocaleString()} - {tier.max_revenue ? `$${tier.max_revenue.toLocaleString()}` : '∞'}
                              </p>
                              <p className="text-sm font-bold text-green-600">{tier.commission_percentage}%</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {getDefaultStructure().description && (
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm text-blue-800">{getDefaultStructure().description}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No commission structure configured</p>
                  <Button onClick={() => setActiveTab('structure')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Structure
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {barberArrangements.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Barbers</p>
                      <p className="text-2xl font-bold">{barberArrangements.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Using Tier System</p>
                      <p className="text-2xl font-bold">
                        {barberArrangements.filter(a => a.use_tier_system).length}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Commission Types</p>
                      <p className="text-sm">
                        {Array.from(new Set(barberArrangements.map(a => a.type))).join(', ')}
                      </p>
                    </div>
                    <Settings className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col justify-center"
                  onClick={() => setActiveTab('simulator')}
                >
                  <Calculator className="h-6 w-6 mb-2" />
                  Test Commission Calculations
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col justify-center"
                  onClick={() => setActiveTab('progress')}
                >
                  <Users className="h-6 w-6 mb-2" />
                  View Barber Progress
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structure Management Tab */}
        <TabsContent value="structure" className="space-y-6">
          {showBuilder || editingStructure ? (
            <TierStructureBuilder
              barbershopId={barbershopId}
              existingStructure={editingStructure}
              onSave={handleStructureSave}
              onCancel={() => {
                setShowBuilder(false)
                setEditingStructure(null)
              }}
            />
          ) : (
            <div className="space-y-6">
              {/* Existing Structures */}
              {tierStructures.length > 0 ? (
                <div className="space-y-4">
                  {tierStructures.map(structure => (
                    <Card key={structure.id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {structure.name}
                            {structure.is_default && <Badge variant="default">Default</Badge>}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {structure.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStructure(structure)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!structure.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteStructure(structure.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Method</p>
                            <Badge variant={structure.calculation_method === 'marginal' ? 'default' : 'secondary'}>
                              {structure.calculation_method === 'marginal' ? 'Marginal' : 'Flat'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Reset Period</p>
                            <p className="font-medium capitalize">{structure.reset_period}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Tiers</p>
                            <p className="font-medium">{structure.tiers?.length || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <Badge variant={structure.is_active ? 'default' : 'secondary'}>
                              {structure.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No tier structures configured</p>
                    <p className="text-sm text-gray-500 mb-6">
                      Create your first commission tier structure to start using performance-based commissions
                    </p>
                    <Button onClick={() => setShowBuilder(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Tier Structure
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Add New Button */}
              {tierStructures.length > 0 && (
                <Button onClick={() => setShowBuilder(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Tier Structure
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Simulator Tab */}
        <TabsContent value="simulator">
          <CommissionSimulator
            barbershopId={barbershopId}
            availableStructures={tierStructures}
            defaultStructureId={getDefaultStructure()?.id}
          />
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress">
          <BarberProgressDashboard
            barbershopId={barbershopId}
            tierStructures={tierStructures}
            arrangements={barberArrangements}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
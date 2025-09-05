'use client'

import { Plus, Edit, Save, X, Package, TrendingUp, Settings, AlertCircle } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/Textarea'
import financialService from '@/lib/financial-service'

interface ProductCommissionCategory {
  id?: string
  category_name: string
  category_display_name: string
  category_description: string
  default_commission_rate: number
  min_commission_rate: number
  max_commission_rate: number
  allows_tier_integration: boolean
  tier_weight_multiplier: number
  is_active: boolean
}

interface BarberProductCommissionConfig {
  barberId: string
  barberName: string
  product_commission_rate: number
  product_category_overrides: Record<string, number>
  products_count_for_tiers: boolean
  product_tier_weight: number
}

interface ProductCommissionConfigProps {
  barbershopId: string
  onConfigChange?: (config: any) => void
}

const ProductCommissionConfig: React.FC<ProductCommissionConfigProps> = ({
  barbershopId,
  onConfigChange
}) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Category Management State
  const [categories, setCategories] = useState<ProductCommissionCategory[]>([])
  const [editingCategory, setEditingCategory] = useState<ProductCommissionCategory | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  
  // Barber Configuration State
  const [barbers, setBarbers] = useState<BarberProductCommissionConfig[]>([])
  const [editingBarber, setEditingBarber] = useState<string | null>(null)
  
  // Form State
  const [categoryForm, setCategoryForm] = useState<Partial<ProductCommissionCategory>>({
    category_name: '',
    category_display_name: '',
    category_description: '',
    default_commission_rate: 0.10,
    min_commission_rate: 0.05,
    max_commission_rate: 0.25,
    allows_tier_integration: true,
    tier_weight_multiplier: 1.0,
    is_active: true
  })

  useEffect(() => {
    loadProductCommissionConfig()
  }, [barbershopId])

  const loadProductCommissionConfig = async () => {
    setLoading(true)
    try {
      // Load categories
      const categoriesResult = await financialService.getProductCommissionCategories(barbershopId)
      if (categoriesResult.error) {
        throw new Error(categoriesResult.error)
      }
      setCategories(categoriesResult.data || [])

      // Load barber configurations
      const barbersResult = await financialService.getShopArrangements(barbershopId)
      if (barbersResult && typeof barbersResult === 'object' && 'error' in barbersResult && barbersResult.error) {
        throw new Error(barbersResult.error)
      }
      
      // Transform arrangements to barber configs
      const barberConfigs = barbersResult.data
        ?.filter(arr => arr.product_commission_rate !== null || Object.keys(arr.product_category_overrides || {}).length > 0)
        ?.map(arr => ({
          barberId: arr.barber_id,
          barberName: arr.barber_name || 'Unknown Barber',
          product_commission_rate: arr.product_commission_rate || 0,
          product_category_overrides: arr.product_category_overrides || {},
          products_count_for_tiers: arr.products_count_for_tiers ?? true,
          product_tier_weight: arr.product_tier_weight || 0.5
        })) || []

      setBarbers(barberConfigs)

    } catch (error) {
      console.error('Error loading product commission config:', error)
      toast.error('Failed to load product commission configuration')
    }
    setLoading(false)
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.category_name || !categoryForm.category_display_name) {
      toast.error('Please fill in required fields')
      return
    }

    setSaving(true)
    try {
      const result = await financialService.saveProductCommissionCategory(barbershopId, {
        ...categoryForm,
        default_commission_rate: parseFloat(categoryForm.default_commission_rate?.toString() || '0'),
        min_commission_rate: parseFloat(categoryForm.min_commission_rate?.toString() || '0'),
        max_commission_rate: parseFloat(categoryForm.max_commission_rate?.toString() || '0'),
        tier_weight_multiplier: parseFloat(categoryForm.tier_weight_multiplier?.toString() || '1')
      })

      if (result.error) {
        throw new Error(result.error)
      }

      toast.success(editingCategory ? 'Category updated successfully' : 'Category created successfully')
      
      // Refresh categories
      await loadProductCommissionConfig()
      
      // Reset form
      setShowCategoryForm(false)
      setEditingCategory(null)
      resetCategoryForm()

      onConfigChange?.({ categories: result.data })

    } catch (error) {
      console.error('Error saving category:', error)
      toast.error('Failed to save category')
    }
    setSaving(false)
  }

  const handleEditCategory = (category: ProductCommissionCategory) => {
    setEditingCategory(category)
    setCategoryForm(category)
    setShowCategoryForm(true)
  }

  const resetCategoryForm = () => {
    setCategoryForm({
      category_name: '',
      category_display_name: '',
      category_description: '',
      default_commission_rate: 0.10,
      min_commission_rate: 0.05,
      max_commission_rate: 0.25,
      allows_tier_integration: true,
      tier_weight_multiplier: 1.0,
      is_active: true
    })
  }

  const handleInitializeDefaults = async () => {
    setSaving(true)
    try {
      const result = await financialService.initializeDefaultProductCategories(barbershopId)
      
      if (result.error) {
        throw new Error(result.error)
      }

      toast.success('Default product categories initialized')
      await loadProductCommissionConfig()

    } catch (error) {
      console.error('Error initializing defaults:', error)
      toast.error('Failed to initialize default categories')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading product commission configuration...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Commission Configuration</h1>
          <p className="text-gray-600">Configure commission rates and settings for product sales</p>
        </div>
        <div className="flex space-x-2">
          {categories.length === 0 && (
            <Button
              onClick={handleInitializeDefaults}
              disabled={saving}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Initialize Defaults</span>
            </Button>
          )}
          <Button
            onClick={() => setShowCategoryForm(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </Button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Product Categories</span>
          </TabsTrigger>
          <TabsTrigger value="barbers" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Barber Overrides</span>
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Tier Integration</span>
          </TabsTrigger>
        </TabsList>

        {/* Product Categories Tab */}
        <TabsContent value="categories">
          {showCategoryForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingCategory ? 'Edit Category' : 'Add Product Category'}
                </CardTitle>
                <CardDescription>
                  Configure commission rates and settings for a product category
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_name">Category Name*</Label>
                    <Input
                      id="category_name"
                      value={categoryForm.category_name}
                      onChange={(e) => setCategoryForm({...categoryForm, category_name: e.target.value})}
                      placeholder="hair_care"
                      disabled={!!editingCategory}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name*</Label>
                    <Input
                      id="display_name"
                      value={categoryForm.category_display_name}
                      onChange={(e) => setCategoryForm({...categoryForm, category_display_name: e.target.value})}
                      placeholder="Hair Care Products"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={categoryForm.category_description}
                    onChange={(e) => setCategoryForm({...categoryForm, category_description: e.target.value})}
                    placeholder="Shampoos, conditioners, hair treatments"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_rate">Default Commission Rate*</Label>
                    <div className="relative">
                      <Input
                        id="default_rate"
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={categoryForm.default_commission_rate}
                        onChange={(e) => setCategoryForm({...categoryForm, default_commission_rate: parseFloat(e.target.value)})}
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                        {((categoryForm.default_commission_rate || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_rate">Min Rate</Label>
                    <div className="relative">
                      <Input
                        id="min_rate"
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={categoryForm.min_commission_rate}
                        onChange={(e) => setCategoryForm({...categoryForm, min_commission_rate: parseFloat(e.target.value)})}
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                        {((categoryForm.min_commission_rate || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_rate">Max Rate</Label>
                    <div className="relative">
                      <Input
                        id="max_rate"
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={categoryForm.max_commission_rate}
                        onChange={(e) => setCategoryForm({...categoryForm, max_commission_rate: parseFloat(e.target.value)})}
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                        {((categoryForm.max_commission_rate || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Tier Integration</Label>
                      <p className="text-sm text-gray-600">
                        Allow sales to contribute to tier progression
                      </p>
                    </div>
                    <Switch
                      checked={categoryForm.allows_tier_integration}
                      onCheckedChange={(checked) => setCategoryForm({...categoryForm, allows_tier_integration: checked})}
                    />
                  </div>

                  {categoryForm.allows_tier_integration && (
                    <div className="space-y-2">
                      <Label htmlFor="tier_weight">Tier Weight Multiplier</Label>
                      <Input
                        id="tier_weight"
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={categoryForm.tier_weight_multiplier}
                        onChange={(e) => setCategoryForm({...categoryForm, tier_weight_multiplier: parseFloat(e.target.value)})}
                      />
                      <p className="text-xs text-gray-500">
                        1.0 = Full weight, 0.5 = Half weight in tier calculations
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-sm text-gray-600">
                      Enable this category for commission calculations
                    </p>
                  </div>
                  <Switch
                    checked={categoryForm.is_active}
                    onCheckedChange={(checked) => setCategoryForm({...categoryForm, is_active: checked})}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleSaveCategory}
                    disabled={saving}
                    className="flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Category'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCategoryForm(false)
                      setEditingCategory(null)
                      resetCategoryForm()
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categories List */}
          <div className="grid gap-4">
            {categories.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Product Categories</h3>
                  <p className="text-gray-600 mb-4">
                    Create product categories to configure commission rates for different types of products.
                  </p>
                  <Button
                    onClick={handleInitializeDefaults}
                    disabled={saving}
                    className="flex items-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Initialize Default Categories</span>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium">{category.category_display_name}</h3>
                          <Badge variant={category.is_active ? "default" : "secondary"}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {category.allows_tier_integration && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              Tier Integration
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{category.category_description}</p>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Default Rate:</span>
                            <div className="font-medium">{(category.default_commission_rate * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Range:</span>
                            <div className="font-medium">
                              {(category.min_commission_rate * 100).toFixed(1)}% - {(category.max_commission_rate * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Tier Weight:</span>
                            <div className="font-medium">
                              {category.allows_tier_integration ? `${category.tier_weight_multiplier}x` : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <div className="font-medium font-mono text-xs">{category.category_name}</div>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        className="ml-4"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Barber Overrides Tab */}
        <TabsContent value="barbers">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Barber-specific product commission overrides will be configured through the Financial Arrangements interface. 
              This section shows current configurations.
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-4 mt-4">
            {barbers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-32 text-center">
                  <p className="text-gray-600">No barber-specific product commission configurations found.</p>
                </CardContent>
              </Card>
            ) : (
              barbers.map((barber) => (
                <Card key={barber.barberId}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium mb-2">{barber.barberName}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Base Product Rate:</span>
                            <div className="font-medium">{(barber.product_commission_rate * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Tier Integration:</span>
                            <div className="font-medium">
                              {barber.products_count_for_tiers ? `Yes (${barber.product_tier_weight}x)` : 'No'}
                            </div>
                          </div>
                        </div>
                        
                        {Object.keys(barber.product_category_overrides).length > 0 && (
                          <div className="mt-3">
                            <span className="text-gray-500 text-sm">Category Overrides:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Object.entries(barber.product_category_overrides).map(([category, rate]) => (
                                <Badge key={category} variant="outline">
                                  {category}: {(rate * 100).toFixed(1)}%
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tier Integration Tab */}
        <TabsContent value="integration">
          <Card>
            <CardHeader>
              <CardTitle>Product Sales & Tier Integration</CardTitle>
              <CardDescription>
                How product sales integrate with the progressive commission tier system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Integration Overview</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Product sales can contribute to tier progression alongside service revenue</li>
                  <li>• Each category has a configurable weight multiplier for tier calculations</li>
                  <li>• Barbers can have individual product tier weights (typically 50% of service weight)</li>
                  <li>• Product commission rates are separate from service commission rates</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Active Categories with Tier Integration</h4>
                  <div className="space-y-2">
                    {categories.filter(cat => cat.is_active && cat.allows_tier_integration).map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{category.category_display_name}</div>
                          <div className="text-sm text-gray-600">{(category.default_commission_rate * 100).toFixed(1)}% commission</div>
                        </div>
                        <Badge variant="outline">
                          {category.tier_weight_multiplier}x weight
                        </Badge>
                      </div>
                    ))}
                    {categories.filter(cat => cat.is_active && cat.allows_tier_integration).length === 0 && (
                      <p className="text-gray-600 text-sm">No categories configured for tier integration</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Business Rules</h4>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-green-50 rounded">
                      <div className="font-medium text-green-900">Returns & Refunds</div>
                      <p className="text-green-800 mt-1">
                        Commission adjustments automatically recalculate tier progress and balances
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded">
                      <div className="font-medium text-orange-900">Tier Upgrades</div>
                      <p className="text-orange-800 mt-1">
                        Product sales can trigger tier upgrades with smaller bonuses than service upgrades
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <div className="font-medium text-purple-900">Combined Progress</div>
                      <p className="text-purple-800 mt-1">
                        Service + weighted product revenue = total tier progression amount
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tip:</strong> Set lower tier weights for products (0.3-0.7x) to maintain service-focused tier progression 
                  while still rewarding product sales performance.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProductCommissionConfig
'use client'

import { 
  Package, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Search, 
  Edit, 
  TrendingDown,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  cost_price?: number
  current_stock: number
  on_hand: number
  sku?: string
  barcode?: string
  category?: string
  supplier?: string
  reorder_point: number
  last_sold_at?: string
  image_url?: string
  thumbnail_url?: string
  tax_rate?: number
  commission_rate?: number
  show_in_pos: boolean
  pos_display_order: number
}

interface StockAdjustment {
  product_id: string
  adjustment: number
  reason: string
}

interface InventoryManagerProps {
  barbershopId: string
}

export function InventoryManager({ barbershopId }: InventoryManagerProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')
  const [adjustmentDialog, setAdjustmentDialog] = useState<{
    open: boolean
    product?: Product
    adjustment: number
    reason: string
  }>({
    open: false,
    adjustment: 0,
    reason: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    loadProducts()
  }, [barbershopId])

  useEffect(() => {
    filterProducts()
  }, [products, searchTerm, selectedCategory, stockFilter])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        barbershop_id: barbershopId,
        in_stock_only: 'false' // Show all products for inventory management
      })

      const response = await fetch(`/api/pos/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter(product => 
        product.current_stock <= product.reorder_point && product.current_stock > 0
      )
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(product => product.current_stock === 0)
    }

    setFilteredProducts(filtered)
  }

  const adjustStock = async () => {
    if (!adjustmentDialog.product) return

    try {
      const response = await fetch('/api/pos/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: adjustmentDialog.product.id,
          adjustment: adjustmentDialog.adjustment,
          reason: adjustmentDialog.reason
        })
      })

      if (response.ok) {
        toast({
          title: "Stock Adjusted",
          description: `${adjustmentDialog.product.name} stock updated`,
          variant: "default"
        })

        // Close dialog and refresh data
        setAdjustmentDialog({ open: false, adjustment: 0, reason: '' })
        loadProducts()
      } else {
        throw new Error('Failed to adjust stock')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to adjust stock",
        variant: "destructive"
      })
    }
  }

  const openAdjustmentDialog = (product: Product, initialAdjustment: number = 0) => {
    setAdjustmentDialog({
      open: true,
      product,
      adjustment: initialAdjustment,
      reason: ''
    })
  }

  const getStockStatus = (product: Product) => {
    if (product.current_stock === 0) {
      return { status: 'out', color: 'destructive' as const, label: 'Out of Stock' }
    } else if (product.current_stock <= product.reorder_point) {
      return { status: 'low', color: 'warning' as const, label: 'Low Stock' }
    } else {
      return { status: 'good', color: 'default' as const, label: 'In Stock' }
    }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const lowStockCount = products.filter(p => p.current_stock <= p.reorder_point && p.current_stock > 0).length
  const outOfStockCount = products.filter(p => p.current_stock === 0).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Inventory Management</h2>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="secondary">{products.length} total products</Badge>
            {lowStockCount > 0 && (
              <Badge variant="warning" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {lowStockCount} low stock
              </Badge>
            )}
            {outOfStockCount > 0 && (
              <Badge variant="destructive">{outOfStockCount} out of stock</Badge>
            )}
          </div>
        </div>
        <Button onClick={loadProducts} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Stock Levels</option>
              <option value="low">Low Stock Only</option>
              <option value="out">Out of Stock Only</option>
            </select>

            <div className="text-sm text-muted-foreground flex items-center">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Product</th>
                  <th className="text-left p-4 font-medium">SKU/Barcode</th>
                  <th className="text-left p-4 font-medium">Category</th>
                  <th className="text-left p-4 font-medium">Current Stock</th>
                  <th className="text-left p-4 font-medium">Reorder Point</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product)
                  return (
                    <tr key={product.id} className="border-b hover:bg-muted/25">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {product.thumbnail_url && (
                            <img
                              src={product.thumbnail_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ${product.price.toFixed(2)}
                              {product.cost_price && (
                                <span className="ml-2">
                                  (Cost: ${product.cost_price.toFixed(2)})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {product.sku && <div>SKU: {product.sku}</div>}
                          {product.barcode && <div className="text-muted-foreground">
                            Barcode: {product.barcode}
                          </div>}
                        </div>
                      </td>
                      <td className="p-4">
                        {product.category && (
                          <Badge variant="outline">{product.category}</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{product.current_stock}</div>
                        {product.last_sold_at && (
                          <div className="text-sm text-muted-foreground">
                            Last sold: {new Date(product.last_sold_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-4">{product.reorder_point}</td>
                      <td className="p-4">
                        <Badge variant={stockStatus.color}>{stockStatus.label}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAdjustmentDialog(product, 10)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAdjustmentDialog(product, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAdjustmentDialog(product)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog 
        open={adjustmentDialog.open} 
        onOpenChange={(open) => setAdjustmentDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {adjustmentDialog.product?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Stock</Label>
                <Input value={adjustmentDialog.product?.current_stock || 0} disabled />
              </div>
              <div>
                <Label>Adjustment</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentDialog(prev => ({
                      ...prev,
                      adjustment: prev.adjustment - 1
                    }))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustmentDialog.adjustment}
                    onChange={(e) => setAdjustmentDialog(prev => ({
                      ...prev,
                      adjustment: parseInt(e.target.value) || 0
                    }))}
                    className="text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentDialog(prev => ({
                      ...prev,
                      adjustment: prev.adjustment + 1
                    }))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  New stock: {(adjustmentDialog.product?.current_stock || 0) + adjustmentDialog.adjustment}
                </p>
              </div>
            </div>
            
            <div>
              <Label>Reason for Adjustment</Label>
              <Textarea
                placeholder="e.g., Restocking, Damaged goods, Inventory correction..."
                value={adjustmentDialog.reason}
                onChange={(e) => setAdjustmentDialog(prev => ({
                  ...prev,
                  reason: e.target.value
                }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAdjustmentDialog({ open: false, adjustment: 0, reason: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={adjustStock}
                disabled={!adjustmentDialog.reason.trim() || adjustmentDialog.adjustment === 0}
              >
                {adjustmentDialog.adjustment > 0 ? <TrendingUp className="h-4 w-4 mr-2" /> : <TrendingDown className="h-4 w-4 mr-2" />}
                Adjust Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
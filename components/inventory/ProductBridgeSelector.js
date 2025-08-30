'use client'

import { 
  Search, 
  Filter,
  ShoppingCart,
  Plus,
  Check,
  X,
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/Button'

export default function ProductBridgeSelector({ 
  barberbarbershopId, 
  onClose, 
  onProductsAdded 
}) {
  const [masterProducts, setMasterProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedProducts, setSelectedProducts] = useState(new Set())
  const [categories, setCategories] = useState([])

  // Fetch available master products
  useEffect(() => {
    fetchMasterProducts()
  }, [barberbarbershopId, selectedCategory, searchTerm])

  const fetchMasterProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        barberbarbershop_id: barberbarbershopId,
        exclude_existing: 'true'
      })

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/inventory/bridge?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch master products')
      }

      const data = await response.json()
      setMasterProducts(data.products || [])
      setCategories(data.categories || [])

    } catch (err) {
      console.error('Error fetching master products:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleProductSelect = (productId) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const handleAddToInventory = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/inventory/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberbarbershop_id: barberbarbershopId,
          master_product_ids: Array.from(selectedProducts)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add products to inventory')
      }

      const result = await response.json()
      
      // Call callback with success info
      if (onProductsAdded) {
        onProductsAdded(result)
      }

      // Close modal
      if (onClose) {
        onClose()
      }

    } catch (err) {
      console.error('Error adding products to inventory:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = masterProducts.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-600" />
                Add CIN7 Products to Inventory
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select products from your synced CIN7 catalog to add to your local inventory tracking.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredProducts.length === 0}
            >
              {selectedProducts.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
            <span>{filteredProducts.length} products available</span>
            <span>•</span>
            <span>{selectedProducts.size} selected</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-32">
              <AlertCircle className="w-12 w-12 text-red-500 mb-2" />
              <p className="text-red-600 text-center mb-4">{error}</p>
              <Button variant="outline" onClick={fetchMasterProducts}>
                Try Again
              </Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32">
              <Package className="w-12 h-12 text-gray-400 mb-2" />
              <p className="text-gray-600 text-center">
                {masterProducts.length === 0 
                  ? "No CIN7 products found. Make sure to sync your CIN7 inventory first."
                  : "No products match your search criteria."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedProducts.has(product.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleProductSelect(product.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 line-clamp-2 text-sm">
                        {product.name}
                      </h3>
                      {product.brand && (
                        <p className="text-xs text-gray-500 mt-1">{product.brand}</p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedProducts.has(product.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedProducts.has(product.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>

                  {product.image_url && (
                    <div className="aspect-square bg-gray-100 rounded mb-3 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">
                      SKU: {product.sku}
                    </div>
                    
                    {product.category && (
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Wholesale:</span>
                      <span className="font-medium">${product.wholesale_price}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">MSRP:</span>
                      <span className="font-medium">${product.msrp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAddToInventory}
                disabled={selectedProducts.size === 0 || saving}
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {saving ? 'Adding...' : `Add ${selectedProducts.size} Product${selectedProducts.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
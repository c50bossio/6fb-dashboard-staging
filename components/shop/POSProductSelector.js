'use client'

import {
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'

export default function POSProductSelector({ products = [], onSave }) {
  const [selectedProducts, setSelectedProducts] = useState(new Set())
  const [productOrder, setProductOrder] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all') // all, selected, unselected
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize selected products and order from existing data
  useEffect(() => {
    const posProducts = products.filter(p => p.show_in_pos)
    setSelectedProducts(new Set(posProducts.map(p => p.id)))
    
    // Sort by pos_display_order
    const sorted = [...posProducts].sort((a, b) => 
      (a.pos_display_order || 0) - (b.pos_display_order || 0)
    )
    setProductOrder(sorted.map(p => p.id))
  }, [products])

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'selected' && selectedProducts.has(product.id)) ||
      (filterStatus === 'unselected' && !selectedProducts.has(product.id))
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleToggleProduct = (productId) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
      setProductOrder(prev => prev.filter(id => id !== productId))
    } else {
      newSelected.add(productId)
      setProductOrder(prev => [...prev, productId])
    }
    setSelectedProducts(newSelected)
  }

  const handleSelectAll = () => {
    const allIds = filteredProducts.map(p => p.id)
    setSelectedProducts(new Set(allIds))
    setProductOrder(allIds)
  }

  const handleDeselectAll = () => {
    setSelectedProducts(new Set())
    setProductOrder([])
  }

  const handleSelectCategory = (category) => {
    const categoryProducts = products.filter(p => p.category === category)
    const categoryIds = categoryProducts.map(p => p.id)
    const newSelected = new Set([...selectedProducts, ...categoryIds])
    setSelectedProducts(newSelected)
    
    // Add new products to order
    const newInOrder = categoryIds.filter(id => !productOrder.includes(id))
    setProductOrder([...productOrder, ...newInOrder])
  }

  const handleMoveUp = (productId) => {
    const index = productOrder.indexOf(productId)
    if (index > 0) {
      const newOrder = [...productOrder]
      ;[newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]]
      setProductOrder(newOrder)
    }
  }

  const handleMoveDown = (productId) => {
    const index = productOrder.indexOf(productId)
    if (index < productOrder.length - 1) {
      const newOrder = [...productOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      setProductOrder(newOrder)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Prepare update data
      const updates = products.map(product => ({
        id: product.id,
        show_in_pos: selectedProducts.has(product.id),
        pos_display_order: productOrder.indexOf(product.id)
      }))

      // Call the save function
      if (onSave) {
        await onSave(updates)
      } else {
        // Direct API call if no onSave provided
        const response = await fetch('/api/shop/products/pos-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        })
        
        if (response.ok) {
          alert(`✅ POS settings saved!\n\n${selectedProducts.size} products enabled for POS`)
        } else {
          throw new Error('Failed to save POS settings')
        }
      }
    } catch (error) {
      console.error('Error saving POS settings:', error)
      alert('❌ Failed to save POS settings')
    } finally {
      setIsSaving(false)
    }
  }

  // Get product details for ordered display
  const orderedProducts = productOrder
    .map(id => products.find(p => p.id === id))
    .filter(Boolean)

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <ShoppingCartIcon className="h-7 w-7 mr-2 text-blue-600" />
          POS Product Selection
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Select which products appear in your Point of Sale and set their display order
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Total Products</p>
              <p className="text-2xl font-bold text-blue-600">{products.length}</p>
            </div>
            <CubeIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">POS Enabled</p>
              <p className="text-2xl font-bold text-green-600">{selectedProducts.size}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900">Categories</p>
              <p className="text-2xl font-bold text-purple-600">{categories.length}</p>
            </div>
            <TagIcon className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-900">Total Value</p>
              <p className="text-2xl font-bold text-amber-600">
                ${orderedProducts.reduce((sum, p) => sum + (p.retail_price * p.current_stock), 0).toFixed(0)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name, SKU, or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Products</option>
          <option value="selected">POS Enabled</option>
          <option value="unselected">Not in POS</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={handleSelectAll}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Select All Visible
        </button>
        <button
          onClick={handleDeselectAll}
          className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
        >
          Deselect All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => handleSelectCategory(cat)}
            className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
          >
            + All {cat}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">POS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.has(product.id)
                const orderIndex = productOrder.indexOf(product.id)
                
                return (
                  <tr key={product.id} className={isSelected ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleProduct(product.id)}
                        className={`p-1 rounded ${isSelected ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        {isSelected ? (
                          <CheckCircleIcon className="h-6 w-6" />
                        ) : (
                          <XCircleIcon className="h-6 w-6" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {product.thumbnail_url || product.image_url ? (
                          <img
                            src={product.thumbnail_url || product.image_url}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover mr-3"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div 
                          className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center mr-3"
                          style={{ display: product.thumbnail_url || product.image_url ? 'none' : 'flex' }}
                        >
                          <PhotoIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {product.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">${product.retail_price}</div>
                      {product.cost_price && (
                        <div className="text-xs text-gray-500">Cost: ${product.cost_price}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-sm font-medium ${
                        product.current_stock === 0 ? 'text-red-600' :
                        product.current_stock < (product.min_stock_level || 5) ? 'text-amber-600' :
                        'text-gray-900'
                      }`}>
                        {product.current_stock}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-600 mr-2">
                            #{orderIndex + 1}
                          </span>
                          <button
                            onClick={() => handleMoveUp(product.id)}
                            disabled={orderIndex === 0}
                            className={`p-1 rounded ${
                              orderIndex === 0 ? 'text-gray-300' : 'text-gray-600 hover:text-blue-600'
                            }`}
                          >
                            <ArrowUpIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(product.id)}
                            disabled={orderIndex === productOrder.length - 1}
                            className={`p-1 rounded ${
                              orderIndex === productOrder.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:text-blue-600'
                            }`}
                          >
                            <ArrowDownIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Section */}
      {selectedProducts.size > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">POS Preview (Display Order)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {orderedProducts.slice(0, 12).map((product, index) => (
              <div key={product.id} className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                  {product.thumbnail_url || product.image_url ? (
                    <img
                      src={product.thumbnail_url || product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover rounded"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  ) : (
                    <PhotoIcon className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="text-xs font-medium text-gray-900 truncate">{product.name}</div>
                <div className="text-xs text-gray-500">${product.retail_price}</div>
                <div className="text-xs text-gray-400">#{index + 1}</div>
              </div>
            ))}
            {orderedProducts.length > 12 && (
              <div className="bg-gray-100 rounded-lg p-2 border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">
                    +{orderedProducts.length - 12} more
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-6 py-2 rounded-md text-white font-medium ${
            isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSaving ? 'Saving...' : `Save POS Settings (${selectedProducts.size} products)`}
        </button>
      </div>
    </div>
  )
}
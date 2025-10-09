'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import {
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  FunnelIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

export default function ProductsManagement() {
  const { user, profile } = useAuth()
  const [products, setProducts] = useState([])
  const [metrics, setMetrics] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'hair care', label: 'Hair Care' },
    { value: 'styling', label: 'Styling' },
    { value: 'beard care', label: 'Beard Care' },
    { value: 'tools', label: 'Tools' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/shop/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setMetrics(data.metrics || {})
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async (productData) => {
    try {
      const response = await fetch('/api/shop/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      if (response.ok) {
        await loadProducts()
        setShowAddModal(false)
      } else {
        console.error('Failed to create product')
      }
    } catch (error) {
      console.error('Error creating product:', error)
    }
  }

  const handleUpdateProduct = async (productId, updates) => {
    try {
      const response = await fetch(`/api/shop/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        await loadProducts()
        setShowEditModal(false)
        setSelectedProduct(null)
      } else {
        console.error('Failed to update product')
      }
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/shop/products/${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadProducts()
      } else {
        console.error('Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getStockStatus = (product) => {
    const stock = product.current_stock || product.stock_quantity || 0
    const threshold = product.min_stock_level || product.low_stock_threshold || 5

    if (stock === 0) return { status: 'out', label: 'Out of Stock', color: 'bg-red-100 text-red-700' }
    if (stock <= threshold) return { status: 'low', label: 'Low Stock', color: 'bg-yellow-100 text-amber-800' }
    return { status: 'ok', label: 'In Stock', color: 'bg-green-100 text-green-700' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-olive-100 flex items-center justify-center">
              <ShoppingBagIcon className="h-8 w-8 text-olive-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-card-foreground">
                Product Inventory
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your shop's product catalog and inventory
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-olive-100 rounded-lg">
              <ShoppingBagIcon className="h-6 w-6 text-olive-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">
            {metrics.totalProducts || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total Products</p>
        </div>

        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">$</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">
            ${metrics.totalValue?.toFixed(2) || '0.00'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Inventory Value</p>
        </div>

        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-800" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">
            {metrics.lowStock || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Low Stock Items</p>
        </div>

        <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-card-foreground">
            {metrics.outOfStock || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Out of Stock</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border mb-6">
        <div className="p-6 border-b border-gray-200 dark:border-border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, SKU, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full dark:bg-muted dark:border-border dark:text-card-foreground"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-muted dark:border-border dark:text-card-foreground"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          {filteredProducts.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-border">
              <thead className="bg-gray-50 dark:bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-card divide-y divide-gray-200 dark:divide-border">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product)
                  const stock = product.current_stock || product.stock_quantity || 0
                  const price = product.retail_price || product.price || 0

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-card-foreground">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-300">
                              {product.brand && `${product.brand} • `}
                              {product.sku && `SKU: ${product.sku}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-muted dark:text-gray-300">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-card-foreground">
                        ${price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-card-foreground">
                        {stock} units
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedProduct(product)
                            setShowEditModal(true)
                          }}
                          className="text-olive-600 hover:text-olive-900 mr-4"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {searchTerm || categoryFilter !== 'all'
                  ? 'No products match your filters'
                  : 'No products in your inventory'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add First Product
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modals (simplified for this implementation) */}
      {showAddModal && (
        <ProductFormModal
          onClose={() => setShowAddModal(false)}
          onSave={handleCreateProduct}
          categories={categories.filter(c => c.value !== 'all')}
        />
      )}

      {showEditModal && selectedProduct && (
        <ProductFormModal
          product={selectedProduct}
          onClose={() => {
            setShowEditModal(false)
            setSelectedProduct(null)
          }}
          onSave={(updates) => handleUpdateProduct(selectedProduct.id, updates)}
          categories={categories.filter(c => c.value !== 'all')}
        />
      )}
    </div>
  )
}

// Simple Product Form Modal Component
function ProductFormModal({ product, onClose, onSave, categories }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || 'hair care',
    brand: product?.brand || '',
    sku: product?.sku || '',
    retail_price: product?.retail_price || product?.price || 0,
    cost: product?.cost || 0,
    current_stock: product?.current_stock || product?.stock_quantity || 0,
    min_stock_level: product?.min_stock_level || product?.low_stock_threshold || 5,
    commission_rate: product?.commission_rate || 10.00,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-card-foreground">
          {product ? 'Edit Product' : 'Add New Product'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 dark:bg-muted dark:border-border dark:text-card-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 dark:bg-muted dark:border-border dark:text-card-foreground"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 dark:bg-muted dark:border-border dark:text-card-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 dark:bg-muted dark:border-border dark:text-card-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Retail Price *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.retail_price}
                onChange={(e) => setFormData({ ...formData, retail_price: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 dark:bg-muted dark:border-border dark:text-card-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 dark:bg-muted dark:border-border dark:text-card-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                required
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 dark:bg-muted dark:border-border dark:text-card-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Low Stock Alert
              </label>
              <input
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 dark:bg-muted dark:border-border dark:text-card-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 dark:bg-muted dark:border-border dark:text-card-foreground"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-border dark:hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
            >
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

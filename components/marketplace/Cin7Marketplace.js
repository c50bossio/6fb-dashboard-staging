'use client'

import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon,
  TagIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  XMarkIcon,
  InformationCircleIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'

export default function Cin7Marketplace({ barbershopId, onProductsImported }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedProducts, setSelectedProducts] = useState(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [stats, setStats] = useState({})
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Product categories
  const categories = [
    { id: '', name: 'All Categories' },
    { id: 'hair_products', name: 'Hair Products' },
    { id: 'tools', name: 'Tools & Equipment' },
    { id: 'consumables', name: 'Consumables' },
    { id: 'retail', name: 'Retail Products' },
    { id: 'supplies', name: 'Shop Supplies' },
    { id: 'tomb45', name: 'Tomb45 Products' },
    { id: 'tune45', name: 'Tune 45 Products' }
  ]

  // Load products from CIN7
  const loadProducts = async (resetPage = false) => {
    if (loading) return
    
    try {
      setLoading(true)
      setError(null)
      
      const currentPage = resetPage ? 1 : page
      const params = new URLSearchParams({
        barbershop_id: barbershopId,
        page: currentPage.toString(),
        limit: '20'
      })
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      
      if (selectedCategory) {
        params.append('category', selectedCategory)
      }
      
      if (selectedBrand.trim()) {
        params.append('brand', selectedBrand.trim())
      }

      const response = await fetch(`/api/cin7/products?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to load products')
      }
      
      if (data.success) {
        if (resetPage || currentPage === 1) {
          setProducts(data.products || [])
        } else {
          setProducts(prev => [...prev, ...(data.products || [])])
        }
        
        setStats(data.stats || {})
        setHasMore(data.pagination?.has_more || false)
        
        if (resetPage) {
          setPage(2)
        } else {
          setPage(prev => prev + 1)
        }
      } else {
        throw new Error(data.error || 'Failed to load products')
      }
      
    } catch (err) {
      console.error('Error loading CIN7 products:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Load products on component mount and filter changes
  useEffect(() => {
    if (barbershopId) {
      loadProducts(true)
    }
  }, [barbershopId, searchTerm, selectedCategory, selectedBrand])

  // Handle product selection
  const handleProductSelect = (product) => {
    const newSelected = new Set(selectedProducts)
    
    if (newSelected.has(product.cin7_id)) {
      newSelected.delete(product.cin7_id)
    } else {
      newSelected.add(product.cin7_id)
    }
    
    setSelectedProducts(newSelected)
  }

  // Handle bulk import
  const handleImportSelected = async () => {
    if (selectedProducts.size === 0) return
    
    try {
      setImportLoading(true)
      
      const response = await fetch('/api/cin7/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          product_ids: Array.from(selectedProducts),
          import_options: {
            enable_pos_sales: true,
            skip_existing: false,
            update_existing: true,
            default_stock_levels: {
              initial_stock: 0,
              min_stock: 5,
              max_stock: 100,
              reorder_quantity: 20,
              location: 'Main Storage'
            },
            pricing_adjustments: {
              retail_multiplier: 1.0, // No markup by default
              cost_multiplier: 1.0
            }
          }
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Import failed')
      }
      
      if (data.success) {
        // Clear selection
        setSelectedProducts(new Set())
        
        // Reload products to update import status
        await loadProducts(true)
        
        // Notify parent component
        if (onProductsImported) {
          onProductsImported(data.stats)
        }
        
        // Show success message
        alert(`Successfully imported ${data.stats.success_count} products to your POS system!`)
      } else {
        throw new Error(data.error || 'Import failed')
      }
      
    } catch (err) {
      console.error('Error importing products:', err)
      alert(`Import failed: ${err.message}`)
    } finally {
      setImportLoading(false)
    }
  }

  // Handle load more
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadProducts(false)
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setSelectedBrand('')
    setShowFilters(false)
  }

  if (error && products.length === 0) {
    return (
      <div className="p-6 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load marketplace</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            onClick={() => loadProducts(true)}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">CIN7 Marketplace</h3>
              <p className="text-sm text-gray-500">Browse and import wholesale products to your POS</p>
            </div>
          </div>
          
          {selectedProducts.size > 0 && (
            <button
              type="button"
              onClick={handleImportSelected}
              disabled={importLoading}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
              {importLoading ? 'Importing...' : `Import ${selectedProducts.size} Selected`}
            </button>
          )}
        </div>

        {/* Stats */}
        {stats.total_found > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{stats.total_found} products found</span>
            <span>{stats.already_imported} already in POS</span>
            {stats.tomb45_products > 0 && <span>{stats.tomb45_products} Tomb45 products</span>}
            {stats.tune45_products > 0 && <span>{stats.tune45_products} Tune 45 products</span>}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-1.5" />
            Filters
          </button>

          {/* Clear Filters */}
          {(searchTerm || selectedCategory || selectedBrand) && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-4 w-4 mr-1.5" />
              Clear
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                placeholder="Enter brand name..."
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="p-6">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-48 rounded-lg"></div>
                <div className="mt-4 space-y-2">
                  <div className="bg-gray-200 h-4 rounded"></div>
                  <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.cin7_id}
                  product={product}
                  isSelected={selectedProducts.has(product.cin7_id)}
                  onSelect={() => handleProductSelect(product)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Product Card Component
function ProductCard({ product, isSelected, onSelect }) {
  return (
    <div className={`relative bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
      isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Selection indicator */}
      <div className="absolute top-3 right-3 z-10">
        {isSelected ? (
          <CheckCircleIconSolid className="h-6 w-6 text-blue-600" />
        ) : (
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white" />
        )}
      </div>

      {/* Import status */}
      {product.is_imported && (
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            In POS
          </span>
        </div>
      )}

      {/* Brand badges */}
      {(product.is_tomb45 || product.is_tune45) && (
        <div className="absolute top-12 left-3 z-10">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <StarIcon className="h-3 w-3 mr-1" />
            {product.is_tomb45 ? 'Tomb45' : 'Tune 45'}
          </span>
        </div>
      )}

      <div className="p-4" onClick={onSelect}>
        {/* Product image placeholder */}
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <CubeIcon className="h-12 w-12 text-gray-400" />
          )}
        </div>

        {/* Product details */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 line-clamp-2">{product.name}</h4>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">SKU: {product.sku}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              product.is_available 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {product.is_available ? 'Available' : 'Out of Stock'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{product.brand}</span>
            <span className="text-sm text-gray-600 capitalize">{product.category.replace('_', ' ')}</span>
          </div>

          {/* Pricing */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">
                ${product.retail_price ? product.retail_price.toFixed(2) : '0.00'}
              </span>
            </div>
            
            {product.cin7_stock > 0 && (
              <span className="text-xs text-gray-500">
                {product.cin7_stock} in stock
              </span>
            )}
          </div>

          {/* Local inventory info */}
          {product.is_imported && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Local Stock: {product.local_stock}</span>
                <InformationCircleIcon className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
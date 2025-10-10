'use client'

import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  TagIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import { createClient } from '../../lib/supabase/browser-client'

export default function POSProductSelector({ onProductSelect, selectedProducts = [], barbershopId }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [error, setError] = useState(null)

  // Product categories for POS
  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'hair_products', name: 'Hair Products' },
    { id: 'tools', name: 'Tools & Equipment' },
    { id: 'consumables', name: 'Consumables' },
    { id: 'retail', name: 'Retail Products' }
  ]

  // Load products available for POS
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .eq('is_active', true)
          .eq('is_retail', true) // Only products enabled for POS sales
          .gt('current_stock', 0) // Only products in stock
          .order('name', { ascending: true })
        
        if (error) {
          throw error
        }
        
        setProducts(data || [])
      } catch (err) {
        console.error('Error loading POS products:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadProducts()
  }, [])

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Handle product selection
  const handleProductSelect = (product) => {
    if (onProductSelect) {
      onProductSelect(product)
    }
  }

  // Get selected quantity for a product
  const getSelectedQuantity = (productId) => {
    const selected = selectedProducts.find(p => p.id === productId)
    return selected ? selected.quantity : 0
  }

  // Check if product is from marketplace (has CIN7 sync data)
  const isMarketplaceProduct = (product) => {
    return product.specifications?.sync_source === 'cin7' ||
           product.specifications?.is_tomb45 ||
           product.specifications?.is_tune45
  }

  // Get brand badge info
  const getBrandBadge = (product) => {
    if (product.specifications?.is_tomb45 || product.brand?.toLowerCase().includes('tomb45')) {
      return { name: 'Tomb45', color: 'bg-purple-100 text-purple-800' }
    }
    if (product.specifications?.is_tune45 || product.brand?.toLowerCase().includes('tune 45')) {
      return { name: 'Tune 45', color: 'bg-blue-100 text-blue-800' }
    }
    if (isMarketplaceProduct(product)) {
      return { name: 'CIN7', color: 'bg-green-100 text-green-800' }
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Products</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Product Selection</h3>
            <p className="text-sm text-gray-500">Choose products to add to the sale</p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredProducts.length} products available
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
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

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'No products are currently available for sale.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selectedQuantity={getSelectedQuantity(product.id)}
                onSelect={handleProductSelect}
                brandBadge={getBrandBadge(product)}
                isMarketplaceProduct={isMarketplaceProduct(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Product Card Component
function ProductCard({ product, selectedQuantity, onSelect, brandBadge, isMarketplaceProduct }) {
  const [quantity, setQuantity] = useState(selectedQuantity)

  const handleQuantityChange = (newQuantity) => {
    const validQuantity = Math.max(0, Math.min(newQuantity, product.current_stock))
    setQuantity(validQuantity)
    
    // Call parent selection handler
    onSelect({
      ...product,
      quantity: validQuantity
    })
  }

  const incrementQuantity = () => {
    handleQuantityChange(quantity + 1)
  }

  const decrementQuantity = () => {
    handleQuantityChange(quantity - 1)
  }

  const addToCart = () => {
    handleQuantityChange(1)
  }

  return (
    <div className={`bg-white border-2 rounded-lg p-4 hover:shadow-md transition-all ${
      quantity > 0 ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
    }`}>
      
      {/* Product badges */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-wrap gap-1">
          {/* Brand badge */}
          {brandBadge && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${brandBadge.color}`}>
              <StarIcon className="h-3 w-3 mr-1" />
              {brandBadge.name}
            </span>
          )}
          
          {/* Marketplace indicator */}
          {isMarketplaceProduct && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              Marketplace
            </span>
          )}
        </div>
        
        {/* Stock indicator */}
        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
          product.current_stock > 10 
            ? 'bg-green-100 text-green-800'
            : product.current_stock > 0 
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {product.current_stock} in stock
        </div>
      </div>

      {/* Product details */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 line-clamp-2 mb-1">{product.name}</h4>
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>{product.brand}</span>
          <span className="uppercase">{product.sku}</span>
        </div>
        
        {/* Price */}
        <div className="flex items-center space-x-2">
          <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-lg text-gray-900">
            ${product.retail_price ? product.retail_price.toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center justify-between">
        {quantity === 0 ? (
          <button
            onClick={addToCart}
            disabled={product.current_stock === 0}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add to Sale
          </button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <button
                onClick={decrementQuantity}
                className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              
              <span className="text-lg font-medium text-gray-900 min-w-[2rem] text-center">
                {quantity}
              </span>
              
              <button
                onClick={incrementQuantity}
                disabled={quantity >= product.current_stock}
                className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                ${(product.retail_price * quantity).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
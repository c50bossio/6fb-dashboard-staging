'use client'

import { 
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function ProductInventory() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showCin7Modal, setShowCin7Modal] = useState(false)
  const [cin7Connected, setCin7Connected] = useState(false)
  const [cin7Status, setCin7Status] = useState(null)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [isQuickSyncing, setIsQuickSyncing] = useState(false)
  const [showCredentialManager, setShowCredentialManager] = useState(false)
  const [credentialInfo, setCredentialInfo] = useState(null)
  const [showEditCredentials, setShowEditCredentials] = useState(false)
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0
  })

  useEffect(() => {
    loadProducts()
    checkCin7Connection()
  }, [])

  const checkCin7Connection = async () => {
    try {
      const credResponse = await fetch('/api/cin7/credentials')
      if (credResponse.ok) {
        const credData = await credResponse.json()
        const hasValidCredentials = credData.hasCredentials && credData.credentials
        
        setHasCredentials(hasValidCredentials)
        setCin7Connected(hasValidCredentials)
        setCredentialInfo(hasValidCredentials ? credData.credentials : null)
        
        if (hasValidCredentials) {
          setCin7Status('connected')
        } else {
          setCin7Status(null)
        }
      } else {
        setHasCredentials(false)
        setCin7Connected(false)
        setCredentialInfo(null)
        setCin7Status(null)
      }
    } catch (error) {
      console.error('Error checking Cin7 connection:', error)
      setHasCredentials(false)
      setCin7Connected(false)
      setCredentialInfo(null)
      setCin7Status(null)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/shop/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setMetrics(data.metrics || {
          totalProducts: 0,
          totalValue: 0,
          lowStock: 0,
          outOfStock: 0
        })
      } else {
        console.error('Error loading products - using fallback')
        const fallbackResponse = await fetch('/api/test-products')
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          setProducts(fallbackData.products || [])
          setMetrics(fallbackData.metrics || {
            totalProducts: 0,
            totalValue: 0,
            lowStock: 0,
            outOfStock: 0
          })
        }
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProduct = async (productData) => {
    try {
      const url = editingProduct 
        ? `/api/shop/products/${editingProduct.id}`
        : '/api/shop/products'
      
      const method = editingProduct ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      })
      
      if (response.ok) {
        loadProducts()
        setShowAddModal(false)
        setEditingProduct(null)
      }
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      const response = await fetch(`/api/shop/products/${productId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadProducts()
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleCin7Connect = async (credentials) => {
    try {
      // First, save the credentials
      const credentialResponse = await fetch('/api/cin7/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: credentials.apiKey,
          accountId: credentials.accountId 
        })
      })
      
      if (!credentialResponse.ok) {
        const credError = await credentialResponse.json()
        throw new Error(credError.message || 'Failed to save credentials')
      }
      
      const credData = await credentialResponse.json()
      console.log('✅ Credentials saved successfully:', credData.accountName)
      
      // Then, sync the inventory
      const syncResponse = await fetch('/api/cin7/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json()
        setCin7Connected(true)
        setCin7Status('synced')
        setHasCredentials(true)
        setShowCin7Modal(false)
        
        // Update credential info for UI
        await checkCin7Connection()
        
        alert(`🎉 Success! \n\n✅ Credentials saved for ${credData.accountName}\n✅ Synchronized ${syncData.count} products from Cin7\n\n📊 Summary:\n• Low Stock: ${syncData.lowStockCount || 0}\n• Out of Stock: ${syncData.outOfStockCount || 0}`)
        
        loadProducts() // Reload to show synced products
      } else {
        const syncError = await syncResponse.json()
        console.error('Sync error details:', syncError)
        
        // Credentials were saved but sync failed
        setCin7Connected(true)
        setHasCredentials(true)
        setShowCin7Modal(false)
        
        alert(`✅ Credentials saved successfully!\n❌ Initial sync failed: ${syncError.error}\n\nYou can try syncing again using the "Refresh Inventory" button.`)
        
        await checkCin7Connection()
      }
    } catch (error) {
      console.error('Error connecting to Cin7:', error)
      alert(`❌ Connection failed: ${error.message}\n\nPlease check your credentials and try again.`)
    }
  }

  const handleQuickSync = async () => {
    try {
      setIsQuickSyncing(true)
      setCin7Status('syncing')
      
      const response = await fetch('/api/cin7/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCin7Status('synced')
        
        alert(`✅ Inventory refreshed successfully!\n\n📊 Summary:\n• Products synced: ${data.count}\n• Low Stock: ${data.lowStockCount || 0}\n• Out of Stock: ${data.outOfStockCount || 0}\n\nLast sync: ${new Date().toLocaleTimeString()}`)
        loadProducts() // Reload to show updated products
      } else {
        const error = await response.json()
        
        // Check if it's a credentials issue
        if (error.error?.includes('credentials') || response.status === 404) {
          setCin7Connected(false)
          setHasCredentials(false)
          setShowCin7Modal(true)
          alert('❌ No saved credentials found. Please set up your Cin7 connection first.')
        } else {
          setCin7Status('error')
          alert(`❌ Sync failed: ${error.error || error.message}\n\nPlease check your Cin7 connection and try again.`)
        }
      }
    } catch (error) {
      console.error('Error during sync:', error)
      setCin7Status('error')
      alert('❌ Sync failed. Please check your internet connection and try again.')
    } finally {
      setIsQuickSyncing(false)
    }
  }

  const handleDeleteCredentials = async () => {
    const confirmed = confirm(
      '⚠️ Delete Cin7 Credentials?\n\n' +
      'This will permanently remove your saved Cin7 API credentials.\n' +
      'You will need to enter them again to sync your inventory.\n\n' +
      'Are you sure you want to continue?'
    )
    
    if (!confirmed) return
    
    try {
      const response = await fetch('/api/cin7/credentials', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setHasCredentials(false)
        setCin7Connected(false)
        setCredentialInfo(null)
        setCin7Status(null)
        setShowCredentialManager(false)
        
        alert('✅ Cin7 credentials deleted successfully.\nYou can set up new credentials anytime.')
      } else {
        const error = await response.json()
        alert(`❌ Failed to delete credentials: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting credentials:', error)
      alert('❌ Failed to delete credentials. Please try again.')
    }
  }

  const handleEditCredentials = async (newCredentials) => {
    try {
      const response = await fetch('/api/cin7/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCredentials)
      })
      
      if (response.ok) {
        await checkCin7Connection()
        setShowEditCredentials(false)
        setShowCredentialManager(false)
        
        alert('✅ Cin7 credentials updated successfully!')
      } else {
        const error = await response.json()
        alert(`❌ Failed to update credentials: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating credentials:', error)
      alert('❌ Failed to update credentials. Please try again.')
    }
  }

  const handleCin7Sync = async () => {
    try {
      setCin7Status('syncing')
      const response = await fetch('/api/cin7/sync', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCin7Status('synced')
        alert(`✅ Synchronized ${data.count} products from Cin7!\n\n📊 Summary:\n• Low Stock: ${data.lowStockCount || 0}\n• Out of Stock: ${data.outOfStockCount || 0}`)
        loadProducts()
      } else {
        const error = await response.json()
        setCin7Status('error')
        alert(`❌ Sync failed: ${error.error || error.message}\n\nPlease check your Cin7 connection and try again.`)
      }
    } catch (error) {
      console.error('Error syncing with Cin7:', error)
      setCin7Status('error')
      alert('❌ Sync failed. Please check your internet connection and try again.')
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'hair_care', label: 'Hair Care' },
    { value: 'beard_care', label: 'Beard Care' },
    { value: 'tools', label: 'Tools & Equipment' },
    { value: 'accessories', label: 'Accessories' }
  ]

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
        <h1 className="text-3xl font-bold text-gray-900">Product Inventory</h1>
        <p className="text-gray-600 mt-2">Manage your shop's retail products and track inventory</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-olive-100 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-olive-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{metrics.totalProducts}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Total Products</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.totalValue.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Inventory Value</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-800" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{metrics.lowStock}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Low Stock Items</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{metrics.outOfStock}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Out of Stock</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          {/* Sync Cin7 Button */}
          {hasCredentials ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleQuickSync}
                disabled={isQuickSyncing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                <LinkIcon className="h-5 w-5 mr-2" />
                {isQuickSyncing ? 'Syncing...' : 'Refresh Inventory'}
              </button>
              <button
                onClick={() => setShowCredentialManager(true)}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:border-gray-400 flex items-center"
                title="Manage Credentials"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCin7Modal(true)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center"
            >
              <LinkIcon className="h-5 w-5 mr-2" />
              Setup Cin7 Sync
            </button>
          )}

          {/* Add Product Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.brand} • SKU: {product.sku}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    {product.category?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${
                      product.current_stock === 0 ? 'text-red-600' :
                      product.current_stock <= product.min_stock_level ? 'text-amber-800' :
                      'text-gray-900'
                    }`}>
                      {product.current_stock}
                    </span>
                    {product.current_stock <= product.min_stock_level && product.current_stock > 0 && (
                      <ExclamationTriangleIcon className="h-4 w-4 text-amber-800 ml-2" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">${product.retail_price}</div>
                    <div className="text-xs text-gray-500">Cost: ${product.cost_price}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.current_stock === 0 
                      ? 'bg-softred-100 text-softred-900'
                      : product.current_stock <= product.min_stock_level
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-moss-100 text-moss-900'
                  }`}>
                    {product.current_stock === 0 ? 'Out of Stock' :
                     product.current_stock <= product.min_stock_level ? 'Low Stock' :
                     'In Stock'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingProduct(product)
                      setShowAddModal(true)
                    }}
                    className="text-olive-600 hover:text-indigo-900 mr-3"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <ArchiveBoxIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No products found</p>
            
            {/* Cin7 Integration */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              {!hasCredentials ? (
                <button
                  onClick={() => setShowCin7Modal(true)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline flex items-center justify-center mx-auto"
                >
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Advanced: Connect warehouse system
                </button>
              ) : (
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span>Cin7 warehouse connected</span>
                  </div>
                  <span>•</span>
                  <span>Last sync: {cin7Status === 'syncing' ? 'Syncing...' : 'Ready for refresh'}</span>
                  <button
                    onClick={handleQuickSync}
                    disabled={isQuickSyncing}
                    className="text-olive-600 hover:text-olive-700 underline"
                  >
                    {isQuickSyncing ? 'Syncing...' : 'Refresh now'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <ProductModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => {
            setShowAddModal(false)
            setEditingProduct(null)
          }}
        />
      )}

      {/* Cin7 Connection Modal */}
      {showCin7Modal && (
        <Cin7ConnectionModal
          onConnect={handleCin7Connect}
          onClose={() => setShowCin7Modal(false)}
        />
      )}

      {/* Credential Manager Modal */}
      {showCredentialManager && (
        <CredentialManagerModal
          credentialInfo={credentialInfo}
          onEdit={() => {
            setShowCredentialManager(false)
            setShowEditCredentials(true)
          }}
          onDelete={handleDeleteCredentials}
          onClose={() => setShowCredentialManager(false)}
        />
      )}

      {/* Edit Credentials Modal */}
      {showEditCredentials && (
        <Cin7ConnectionModal
          onConnect={handleEditCredentials}
          onClose={() => setShowEditCredentials(false)}
          isEditing={true}
          title="Update Cin7 Credentials"
        />
      )}
    </div>
  )
}

function ProductModal({ product, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || 'hair_care',
    brand: product?.brand || '',
    sku: product?.sku || '',
    cost_price: product?.cost_price || '',
    retail_price: product?.retail_price || '',
    current_stock: product?.current_stock || 0,
    min_stock_level: product?.min_stock_level || 5,
    max_stock_level: product?.max_stock_level || 100,
    track_inventory: product?.track_inventory !== false
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                >
                  <option value="hair_care">Hair Care</option>
                  <option value="beard_care">Beard Care</option>
                  <option value="tools">Tools & Equipment</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.cost_price}
                  onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retail Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.retail_price}
                  onChange={(e) => setFormData({...formData, retail_price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Stock
                </label>
                <input
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Stock Level
                </label>
                <input
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({...formData, min_stock_level: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Stock Level
                </label>
                <input
                  type="number"
                  value={formData.max_stock_level}
                  onChange={(e) => setFormData({...formData, max_stock_level: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="track_inventory"
                checked={formData.track_inventory}
                onChange={(e) => setFormData({...formData, track_inventory: e.target.checked})}
                className="h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="track_inventory" className="ml-2 text-sm text-gray-700">
                Track inventory for this product
              </label>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
              >
                {product ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function CredentialManagerModal({ credentialInfo, onEdit, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <LinkIcon className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Manage Cin7 Credentials</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>
          
          {credentialInfo ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="font-medium text-green-900">Connected to Cin7</span>
                </div>
                
                <div className="text-sm text-green-800 space-y-1">
                  <div>Account: {credentialInfo.maskedAccountId || 'Hidden'}</div>
                  <div>API Version: {credentialInfo.apiVersion || 'Auto-detected'}</div>
                  <div>Last Tested: {credentialInfo.lastTested ? new Date(credentialInfo.lastTested).toLocaleDateString() : 'Unknown'}</div>
                  <div>Last Synced: {credentialInfo.lastSynced ? new Date(credentialInfo.lastSynced).toLocaleDateString() : 'Never'}</div>
                </div>
              </div>
              
              <div className="flex justify-between space-x-3">
                <button
                  onClick={onEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Update Credentials
                </button>
                <button
                  onClick={onDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No credential information available</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Cin7ConnectionModal({ onConnect, onClose, isEditing = false, title = "Sync Cin7 Warehouse Products" }) {
  const [formData, setFormData] = useState({
    apiKey: '',
    accountId: ''
  })
  const [isConnecting, setIsConnecting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsConnecting(true)
    
    try {
      await onConnect(formData)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-amber-100 rounded-lg mr-3">
              <LinkIcon className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              ⚠️ You're currently viewing demo products. Let's sync your actual Cin7 warehouse inventory!
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cin7 Account ID
              </label>
              <input
                type="text"
                required
                value={formData.accountId}
                onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                placeholder="Your Cin7 Account ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cin7 API Application Key
              </label>
              <input
                type="password"
                required
                value={formData.apiKey}
                onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                placeholder="Paste your API key here"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              />
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">ℹ️ Where to find these?</h4>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Log into Cin7 at inventory.dearsystems.com</li>
                <li>Go to Settings → Integrations & API</li>
                <li>Copy your Account ID from the top of the page</li>
                <li>Create or copy an API Application Key</li>
                <li><strong>Note:</strong> System will auto-detect if you're using API v1 or v2</li>
              </ol>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isConnecting}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConnecting}
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
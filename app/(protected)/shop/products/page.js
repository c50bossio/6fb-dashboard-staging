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
  ChartBarIcon,
  ArrowTrendingDownIcon,
  LinkIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import SetupWizard from '@/components/cin7/SetupWizard'
import StatusWidget from '@/components/cin7/StatusWidget'
import StockBadge, { StockIndicator } from '@/components/cin7/StockBadge'
import Cin7IntegrationManager from '@/components/cin7-integration-manager'
import InventoryInsights from '@/components/shop/InventoryInsights'
import POSProductSelector from '@/components/shop/POSProductSelector'
import ProductAnalyticsPanel from '@/components/shop/ProductAnalyticsPanel'
import ProductPerformanceCharts from '@/components/shop/ProductPerformanceCharts'

export default function ProductManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
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
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)
  
  // Checkout mode states
  const [isCheckoutMode, setIsCheckoutMode] = useState(false)
  const [checkoutData, setCheckoutData] = useState(null)
  const [showCheckoutInterface, setShowCheckoutInterface] = useState(false)
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    totalValue: 0,
    totalCost: 0,
    potentialProfit: 0,
    averageMargin: 0,
    lowStock: 0,
    outOfStock: 0,
    needsReorder: 0
  })
  
  // Tab state for organizing views
  const [activeTab, setActiveTab] = useState('inventory') // inventory, pos, analytics

  useEffect(() => {
    loadProducts()
    checkCin7Connection()
    
    // Check for checkout mode
    const checkoutMode = searchParams.get('checkout')
    const appointmentId = searchParams.get('id')
    
    if (checkoutMode === 'appointment' && appointmentId) {
      setIsCheckoutMode(true)
      
      // Get checkout data from sessionStorage
      const pendingCheckout = sessionStorage.getItem('pendingCheckout')
      if (pendingCheckout) {
        try {
          const parsedData = JSON.parse(pendingCheckout)
          setCheckoutData(parsedData)
          setShowCheckoutInterface(true)
          
          // Clear the sessionStorage data to prevent reuse
          sessionStorage.removeItem('pendingCheckout')
        } catch (error) {
          console.error('Error parsing checkout data:', error)
        }
      }
    }
    
    // Check for direct POS mode access
    const posMode = searchParams.get('pos')
    if (posMode === 'true') {
      setIsCheckoutMode(true)
      // Focus on POS functionality - could add additional POS-specific states here
    }
  }, [searchParams])

  const checkCin7Connection = async () => {
    try {
      // Use simplified connect endpoint to check status
      const statusResponse = await fetch('/api/cin7/connect')
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        
        if (statusData.connected) {
          setHasCredentials(true)
          setCin7Connected(true)
          setCredentialInfo({
            account_name: statusData.accountName,
            last_sync: statusData.lastSync,
            last_sync_status: statusData.syncStatus
          })
          setCin7Status('connected')
        } else {
          setHasCredentials(false)
          setCin7Connected(false)
          setCredentialInfo(null)
          setCin7Status(null)
        }
      } else if (statusResponse.status === 401) {
        // Authentication required
        
        setHasCredentials(false)
        setCin7Connected(false)
        setCredentialInfo(null)
        setCin7Status('auth_required')
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
          totalCost: 0,
          potentialProfit: 0,
          averageMargin: 0,
          lowStock: 0,
          outOfStock: 0,
          needsReorder: 0
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

  const handleQuickSale = async (product) => {
    const quantity = prompt(`Quick Sale: ${product.name}\n\nHow many units to sell?`, '1')
    
    if (!quantity || isNaN(quantity) || quantity <= 0) return
    
    const saleQty = parseInt(quantity)
    if (saleQty > product.current_stock) {
      alert(`Not enough stock! Only ${product.current_stock} units available.`)
      return
    }
    
    try {
      // Update stock level
      const newStock = product.current_stock - saleQty
      const response = await fetch(`/api/shop/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stock: newStock })
      })
      
      if (response.ok) {
        const saleAmount = (saleQty * product.retail_price).toFixed(2)
        const profit = product.cost_price 
          ? (saleQty * (product.retail_price - product.cost_price)).toFixed(2)
          : (saleQty * product.retail_price * 0.4).toFixed(2) // Assume 40% margin
        
        alert(`✅ Sale Completed!\n\n${product.name}\nQuantity: ${saleQty}\nTotal: $${saleAmount}\nProfit: $${profit}\n\nStock updated: ${product.current_stock} → ${newStock}`)
        loadProducts() // Refresh the list
      } else {
        alert('Failed to process sale. Please try again.')
      }
    } catch (error) {
      console.error('Quick sale error:', error)
      alert('Error processing sale')
    }
  }
  
  const handleQuickRestock = async (product) => {
    const suggestedQty = product.max_stock_level - product.current_stock
    const quantity = prompt(
      `Quick Restock: ${product.name}\n\nCurrent Stock: ${product.current_stock}\nMax Stock: ${product.max_stock_level}\nSuggested Order: ${suggestedQty}\n\nHow many units to order?`,
      suggestedQty.toString()
    )
    
    if (!quantity || isNaN(quantity) || quantity <= 0) return
    
    const restockQty = parseInt(quantity)
    const newStock = product.current_stock + restockQty
    
    try {
      const response = await fetch(`/api/shop/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stock: newStock })
      })
      
      if (response.ok) {
        const orderCost = product.cost_price 
          ? (restockQty * product.cost_price).toFixed(2)
          : (restockQty * product.retail_price * 0.6).toFixed(2) // Assume 60% cost
        
        alert(`✅ Restock Order Placed!\n\n${product.name}\nQuantity Ordered: ${restockQty}\nOrder Cost: $${orderCost}\n\nStock will be updated: ${product.current_stock} → ${newStock}`)
        loadProducts() // Refresh the list
      } else {
        alert('Failed to place restock order. Please try again.')
      }
    } catch (error) {
      console.error('Quick restock error:', error)
      alert('Error placing restock order')
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

  const handleSetupComplete = async (result) => {
    setShowSetupWizard(false)
    setCin7Connected(true)
    setHasCredentials(true)
    setCin7Status('connected')
    
    // Show success message
    alert(`🎉 Setup Complete!\n\n✅ Connected to ${result.accountName}\n✅ Synced ${result.syncedProducts || 0} products\n\n${result.lowStock ? `⚠️ ${result.lowStock} items are low on stock` : ''}\n${result.outOfStock ? `🔴 ${result.outOfStock} items are out of stock` : ''}`)
    
    // Reload products
    await loadProducts()
    await checkCin7Connection()
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
      {/* Header with Status Widget */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600 mt-2">Manage your shop's retail products and track inventory</p>
          </div>
          {/* Status Widget - shows connection status */}
          <div className="mt-2">
            <StatusWidget
              compact={false}
              onSync={() => {
                // Handle sync through StatusWidget
                if (hasCredentials) {
                  handleQuickSync()
                } else {
                  // If no credentials, guide user to setup
                  setShowSetupWizard(true)
                }
              }}
              onSettings={() => {
                // Handle settings based on current state
                if (!hasCredentials) {
                  // Initial setup for new connections
                  setShowSetupWizard(true)
                } else {
                  // Credential management for existing connections
                  setShowCredentialManager(true)
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Enhanced POS Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        {/* Total Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <ArchiveBoxIcon className="h-5 w-5 text-olive-600" />
            <span className="text-xl font-bold text-gray-900">{metrics.totalProducts}</span>
          </div>
          <p className="text-xs text-gray-600">Total Products</p>
        </div>

        {/* Inventory Value */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
            <span className="text-xl font-bold text-gray-900">
              ${(metrics.totalValue / 1000).toFixed(1)}K
            </span>
          </div>
          <p className="text-xs text-gray-600">Retail Value</p>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">
              ${(metrics.totalCost / 1000).toFixed(1)}K
            </span>
          </div>
          <p className="text-xs text-gray-600">Total Cost</p>
        </div>

        {/* Potential Profit */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
            <span className="text-xl font-bold text-emerald-600">
              ${(metrics.potentialProfit / 1000).toFixed(1)}K
            </span>
          </div>
          <p className="text-xs text-gray-600">Potential Profit</p>
        </div>

        {/* Average Margin */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xl font-bold text-purple-600">
              {metrics.averageMargin}%
            </span>
          </div>
          <p className="text-xs text-gray-600">Avg Margin</p>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <span className="text-xl font-bold text-yellow-600">{metrics.lowStock}</span>
          </div>
          <p className="text-xs text-gray-600">Low Stock</p>
        </div>

        {/* Out of Stock */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="text-xl font-bold text-red-600">{metrics.outOfStock}</span>
          </div>
          <p className="text-xs text-gray-600">Out of Stock</p>
        </div>

        {/* Needs Reorder */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xl font-bold text-orange-600">{metrics.needsReorder}</span>
          </div>
          <p className="text-xs text-gray-600">Reorder Now</p>
        </div>
      </div>

      {/* Tab Navigation - MOVED TO TOP AFTER METRICS */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Inventory Management
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pos'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            POS Settings
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics & Insights
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {/* Inventory Tab - Show table and filters */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Filters and Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
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
                          <div className="text-xs text-gray-500">Cost: ${product.cost_price || 'N/A'}</div>
                          {product.cost_price && (
                            <div className="text-xs font-semibold text-green-600">
                              Margin: {((1 - product.cost_price / product.retail_price) * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StockBadge
                          stock={product.current_stock}
                          minStock={product.min_stock_level || 10}
                          maxStock={product.max_stock_level || 100}
                          size="small"
                          showTrend={false}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Quick Sale Button */}
                          <button
                            onClick={() => handleQuickSale(product)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center"
                            title="Quick Sale"
                          >
                            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Sell
                          </button>
                          
                          {/* Quick Restock Button */}
                          {product.current_stock <= product.reorder_point && (
                            <button
                              onClick={() => handleQuickRestock(product)}
                              className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 flex items-center"
                              title="Quick Restock"
                            >
                              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Restock
                            </button>
                          )}
                          
                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              setEditingProduct(product)
                              setShowAddModal(true)
                            }}
                            className="text-olive-600 hover:text-indigo-900"
                            title="Edit Product"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Product"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
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
          </div>
        )}

        {/* POS Settings Tab */}
        {activeTab === 'pos' && (
          <div className="space-y-6">
            <POSProductSelector 
              products={products} 
              onSave={async (updates) => {
                const response = await fetch('/api/shop/products/pos-settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ updates })
                })
                
                if (response.ok) {
                  const data = await response.json()
                  alert(`✅ POS settings saved!\n\n${data.enabledCount} products enabled for Point of Sale`)
                  loadProducts() // Refresh the product list
                } else {
                  alert('❌ Failed to save POS settings')
                }
              }}
            />
          </div>
        )}
        
        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">📊 Product Analytics & Insights</h2>
            
            {/* Product Analytics Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <ProductAnalyticsPanel products={products} metrics={metrics} />
            </div>
            
            {/* Product Performance Charts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <ProductPerformanceCharts products={products} metrics={metrics} />
            </div>
            
            {/* Inventory Insights */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <InventoryInsights products={products} metrics={metrics} />
            </div>
          </div>
        )}
      </div>

      {/* Simplified Modal Placeholders */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Product Management</h2>
              <p>Product management functionality is being updated.</p>
              <button 
                onClick={() => {
                  setShowAddModal(false)
                  setEditingProduct(null)
                }} 
                className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showSetupWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Setup Wizard</h2>
              <p>Setup functionality is being updated.</p>
              <button 
                onClick={() => setShowSetupWizard(false)} 
                className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
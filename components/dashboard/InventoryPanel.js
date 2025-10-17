'use client'

import { 
  CubeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ShoppingCartIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import { useAuth } from '../SupabaseAuthProvider'
import { createClient } from '../../lib/supabase/client'
import LoadingSpinner, { TableLoadingSkeleton, CardLoadingSkeleton } from '../LoadingSpinner'
import Cin7Marketplace from '../marketplace/Cin7Marketplace'

// Product categories
const PRODUCT_CATEGORIES = [
  { id: 'hair_products', name: 'Hair Products', icon: CubeIcon },
  { id: 'tools', name: 'Tools & Equipment', icon: CubeIcon },
  { id: 'consumables', name: 'Consumables', icon: CubeIcon },
  { id: 'retail', name: 'Retail Products', icon: CubeIcon },
  { id: 'supplies', name: 'Shop Supplies', icon: CubeIcon }
]

export default function InventoryPanel() {
  const { user, profile } = useAuth()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('inventory')

  // Fetch inventory data from API (single source of truth)
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true)

        // Call the shop products API (same as POS page uses)
        // This ensures main dashboard and POS show the same data
        const response = await fetch('/api/shop/products')

        if (!response.ok) {
          throw new Error(`Failed to load inventory: ${response.statusText}`)
        }

        const data = await response.json()

        // Transform API response to match expected format
        const transformedInventory = (data.products || []).map(item => ({
          ...item,
          // Map products table fields to expected format
          max_stock: item.max_stock_level || 100,
          unit_cost: item.cost_price || 0,
          // Calculate status based on stock levels
          status: (item.current_stock || 0) === 0 ? 'critical' :
                  (item.current_stock || 0) <= (item.min_stock_level || 5) ? 'low' : 'good'
        }))

        setInventory(transformedInventory)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch inventory:', err)
        setInventory([])
        setError(err.message || 'Failed to load inventory')
      } finally {
        setLoading(false)
      }
    }

    // Only fetch if we have user and profile
    if (user && profile) {
      fetchInventory()
    }
  }, [user, profile])

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const formatCurrency = (amount) => {
    if (amount === null) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'critical': return 'bg-red-100 text-red-900 border-red-200'
      case 'low': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'good': return 'bg-emerald-100 text-emerald-900 border-emerald-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'critical': 
      case 'low': 
        return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'good': 
        return <CheckCircleIcon className="h-4 w-4" />
      default: 
        return null
    }
  }

  // Calculate totals with BookedBarber colors
  const totalItems = inventory.length
  const lowStockItems = inventory.filter(i => i.status === 'low' || i.status === 'critical').length
  const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0)
  const retailValue = inventory.reduce((sum, item) => {
    if (item.retail_price) {
      return sum + (item.current_stock * item.retail_price)
    }
    return sum
  }, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardLoadingSkeleton key={i} />
          ))}
        </div>
        <TableLoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Inventory</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with BookedBarber branding */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Inventory & POS Management
          </h2>
          <p className="text-muted-foreground">
            Manage products, track stock levels, and process sales with CIN7 marketplace integration
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-olive-100 dark:bg-olive-900/30 text-olive-800 dark:text-olive-200 border border-olive-200 dark:border-olive-800">
            <CubeIcon className="h-4 w-4 mr-1" />
            CIN7 Connected
          </span>
        </div>
      </div>

      {/* Stats Cards with BookedBarber styling */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CubeIcon className="h-8 w-8 text-olive-600 dark:text-olive-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-foreground">{lowStockItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-gold-600 dark:text-gold-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCartIcon className="h-8 w-8 text-olive-600 dark:text-olive-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Retail Value</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(retailValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation with BookedBarber colors */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'inventory'
                ? 'border-olive-600 text-olive-600 dark:text-olive-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
            }`}
          >
            <CubeIcon className="h-5 w-5 mr-2 inline" />
            Inventory
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'marketplace'
                ? 'border-olive-600 text-olive-600 dark:text-olive-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
            }`}
          >
            <BuildingStorefrontIcon className="h-5 w-5 mr-2 inline" />
            CIN7 Marketplace
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'orders'
                ? 'border-olive-600 text-olive-600 dark:text-olive-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
            }`}
          >
            <TruckIcon className="h-5 w-5 mr-2 inline" />
            Purchase Orders
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="pl-10 pr-4 py-2 w-full bg-background border border-border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <select
              className="px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {PRODUCT_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              className="px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="good">Good Stock</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
            </select>

            <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 focus:ring-2 focus:ring-olive-500 flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Product
            </button>
          </div>

          {/* Inventory Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Retail
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-foreground">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.brand}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {PRODUCT_CATEGORIES.find(cat => cat.id === item.category)?.name || item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {item.current_stock} / {item.max_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatCurrency(item.unit_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatCurrency(item.retail_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-olive-600 dark:text-olive-400 hover:text-olive-900 dark:hover:text-olive-300 mr-4">
                          Edit
                        </button>
                        <button className="text-gold-600 dark:text-gold-400 hover:text-gold-900 dark:hover:text-gold-300">
                          Reorder
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredInventory.length === 0 && (
            <div className="text-center py-12">
              <CubeIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'marketplace' && (
        <div>
          <Cin7Marketplace />
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-card rounded-lg border border-border p-8">
          <div className="text-center">
            <TruckIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Purchase Orders</h3>
            <p className="text-muted-foreground mb-4">Manage your product orders and supplier relationships</p>
            <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 focus:ring-2 focus:ring-olive-500">
              Create Order
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
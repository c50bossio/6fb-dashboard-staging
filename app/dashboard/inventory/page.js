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
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

import ProtectedRoute from '../../../components/ProtectedRoute'
import GlobalNavigation from '../../../components/GlobalNavigation'
import { useAuth } from '../../../components/SupabaseAuthProvider'

// Product categories
const PRODUCT_CATEGORIES = [
  { id: 'hair-products', name: 'Hair Products', icon: CubeIcon },
  { id: 'tools', name: 'Tools & Equipment', icon: CubeIcon },
  { id: 'consumables', name: 'Consumables', icon: CubeIcon },
  { id: 'retail', name: 'Retail Products', icon: CubeIcon },
  { id: 'supplies', name: 'Shop Supplies', icon: CubeIcon }
]

// Mock inventory data
const Inventory = [
  {
    id: 'hair-gel-01',
    name: 'Premium Hair Gel',
    category: 'hair-products',
    sku: 'HG-001',
    brand: 'StylePro',
    current_stock: 3,
    min_stock: 10,
    max_stock: 50,
    unit_cost: 8.50,
    retail_price: 15.99,
    supplier: 'Beauty Supplies Co.',
    last_ordered: '2024-01-05',
    last_received: '2024-01-10',
    usage_rate: 2.5, // units per week
    status: 'low',
    location: 'Shelf A-2',
    barcode: '123456789012'
  },
  {
    id: 'shampoo-02',
    name: 'Professional Shampoo',
    category: 'hair-products',
    sku: 'SH-002',
    brand: 'CleanCut',
    current_stock: 24,
    min_stock: 10,
    max_stock: 40,
    unit_cost: 12.00,
    retail_price: 22.99,
    supplier: 'Beauty Supplies Co.',
    last_ordered: '2024-01-01',
    last_received: '2024-01-07',
    usage_rate: 4.0,
    status: 'good',
    location: 'Shelf A-1',
    barcode: '123456789013'
  },
  {
    id: 'clipper-oil-03',
    name: 'Clipper Oil',
    category: 'tools',
    sku: 'CO-003',
    brand: 'BarberPro',
    current_stock: 8,
    min_stock: 5,
    max_stock: 20,
    unit_cost: 4.50,
    retail_price: 9.99,
    supplier: 'Equipment Plus',
    last_ordered: '2023-12-20',
    last_received: '2023-12-25',
    usage_rate: 0.5,
    status: 'good',
    location: 'Cabinet B-1',
    barcode: '123456789014'
  },
  {
    id: 'razor-blades-04',
    name: 'Straight Razor Blades (100pk)',
    category: 'tools',
    sku: 'RB-004',
    brand: 'SharpEdge',
    current_stock: 2,
    min_stock: 3,
    max_stock: 10,
    unit_cost: 15.00,
    retail_price: null,
    supplier: 'Equipment Plus',
    last_ordered: '2023-12-15',
    last_received: '2023-12-20',
    usage_rate: 1.0,
    status: 'critical',
    location: 'Cabinet B-2',
    barcode: '123456789015'
  },
  {
    id: 'neck-strips-05',
    name: 'Neck Strips (500ct)',
    category: 'consumables',
    sku: 'NS-005',
    brand: 'SaniStrip',
    current_stock: 350,
    min_stock: 200,
    max_stock: 1000,
    unit_cost: 0.02,
    retail_price: null,
    supplier: 'Wholesale Barber Supply',
    last_ordered: '2024-01-02',
    last_received: '2024-01-08',
    usage_rate: 50,
    status: 'good',
    location: 'Storage Room',
    barcode: '123456789016'
  },
  {
    id: 'beard-oil-06',
    name: 'Beard Oil',
    category: 'retail',
    sku: 'BO-006',
    brand: 'BeardCraft',
    current_stock: 15,
    min_stock: 10,
    max_stock: 30,
    unit_cost: 10.00,
    retail_price: 24.99,
    supplier: 'Beauty Supplies Co.',
    last_ordered: '2023-12-28',
    last_received: '2024-01-03',
    usage_rate: 3.0,
    status: 'good',
    location: 'Display Case',
    barcode: '123456789017'
  },
  {
    id: 'towels-07',
    name: 'Black Towels (12pk)',
    category: 'supplies',
    sku: 'BT-007',
    brand: 'ProTowel',
    current_stock: 4,
    min_stock: 6,
    max_stock: 20,
    unit_cost: 24.00,
    retail_price: null,
    supplier: 'Wholesale Barber Supply',
    last_ordered: '2023-12-25',
    last_received: '2023-12-30',
    usage_rate: 2.0,
    status: 'low',
    location: 'Laundry Room',
    barcode: '123456789018'
  },
  {
    id: 'aftershave-08',
    name: 'Aftershave Lotion',
    category: 'hair-products',
    sku: 'AS-008',
    brand: 'CoolBreeze',
    current_stock: 12,
    min_stock: 8,
    max_stock: 25,
    unit_cost: 6.50,
    retail_price: 14.99,
    supplier: 'Beauty Supplies Co.',
    last_ordered: '2024-01-03',
    last_received: '2024-01-09',
    usage_rate: 2.0,
    status: 'good',
    location: 'Shelf A-3',
    barcode: '123456789019'
  }
]

export default function InventoryPage() {
  const { user, profile } = useAuth()
  const [inventory, setInventory] = useState(Inventory)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

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
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'low': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'good': return 'bg-green-100 text-green-800 border-green-200'
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

  const getStockPercentage = (current, max) => {
    return Math.min(100, (current / max) * 100)
  }

  // Calculate totals
  const totalItems = inventory.length
  const lowStockItems = inventory.filter(i => i.status === 'low' || i.status === 'critical').length
  const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0)
  const retailValue = inventory.reduce((sum, item) => {
    if (item.retail_price) {
      return sum + (item.current_stock * item.retail_price)
    }
    return sum
  }, 0)

  return (
    <ProtectedRoute>
      <GlobalNavigation />
      <div className="min-h-screen bg-gray-50">
        {/* Main Content - adjusting for sidebar */}
        <div className="lg:ml-80 transition-all duration-300 ease-in-out pt-16 lg:pt-0">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="mb-8">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                      Inventory Management
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                      Track and manage your barbershop supplies and products
                    </p>
                  </div>
                  <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <TruckIcon className="-ml-1 mr-2 h-5 w-5" />
                      Create Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                      Add Product
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CubeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Products</p>
                      <p className="text-2xl font-semibold text-gray-900">{totalItems}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Low Stock</p>
                      <p className="text-2xl font-semibold text-gray-900">{lowStockItems}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Inventory Value</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(totalValue)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ShoppingCartIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Retail Value</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(retailValue)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Filters */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="relative flex-1 max-w-md">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Categories</option>
                        {PRODUCT_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="good">In Stock</option>
                        <option value="low">Low Stock</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Inventory Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Retail Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredInventory.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center">
                            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredInventory.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.brand}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{item.sku}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-gray-900">
                                    {item.current_stock}/{item.max_stock}
                                  </span>
                                </div>
                                <div className="w-32 mt-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        item.status === 'critical' ? 'bg-red-600' :
                                        item.status === 'low' ? 'bg-amber-600' : 'bg-green-600'
                                      }`}
                                      style={{width: `${getStockPercentage(item.current_stock, item.max_stock)}%`}}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                                {getStatusIcon(item.status)}
                                <span className="ml-1 capitalize">{item.status}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(item.unit_cost)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(item.retail_price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.location}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-900 mr-3">
                                Edit
                              </button>
                              {(item.status === 'low' || item.status === 'critical') && (
                                <button className="text-green-600 hover:text-green-900">
                                  Reorder
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                    <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Generate Order List</span>
                        <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Stock Count</span>
                        <ChartBarIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Export Inventory</span>
                        <ArrowTrendingUpIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    {inventory.filter(i => i.status === 'low' || i.status === 'critical').slice(0, 4).map(item => (
                      <div key={item.id} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-700 truncate">{item.name}</span>
                        <span className={`text-xs font-medium ${
                          item.status === 'critical' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {item.current_stock} left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Supplier Info</h3>
                    <TruckIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Beauty Supplies Co.</p>
                      <p className="text-sm text-gray-700">Next delivery: Jan 15</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Equipment Plus</p>
                      <p className="text-sm text-gray-700">Next delivery: Jan 18</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Wholesale Barber Supply</p>
                      <p className="text-sm text-gray-700">Next delivery: Jan 20</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
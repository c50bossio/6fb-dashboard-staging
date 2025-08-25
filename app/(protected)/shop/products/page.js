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
  LinkIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SetupWizard from '@/components/cin7/SetupWizard'
import StatusWidget from '@/components/cin7/StatusWidget'
import StockBadge, { StockIndicator } from '@/components/cin7/StockBadge'
import Cin7IntegrationManager from '@/components/cin7-integration-manager'

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
        console.log('Authentication required for Cin7')
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

  const handleAppointmentCheckout = async (paymentMethod, tipAmount = 0, useHouseAccount = false, barberId = null) => {
    if (!checkoutData) return

    try {
      setLoading(true)

      if (useHouseAccount && checkoutData.customerId) {
        // Process as house account charge
        const response = await fetch('/api/customers/accounts/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: checkoutData.customerId,
            amount: checkoutData.services[0].price,
            tip_amount: tipAmount,
            description: `Service: ${checkoutData.services[0].name}`,
            appointment_id: checkoutData.appointmentId,
            barber_id: barberId
          })
        })

        const data = await response.json()
        if (data.success) {
          // Mark appointment as completed
          await completeAppointment(checkoutData.appointmentId, tipAmount)
          alert(`✅ Charged to House Account!\n\nService: ${checkoutData.services[0].name}\nAmount: $${checkoutData.services[0].price}\nTip: $${tipAmount}\n\nNew Balance: $${data.new_balance}`)
        } else {
          alert(`❌ House Account Error: ${data.error}`)
        }
      } else {
        // Process with regular POS sale API
        const items = checkoutData.services.map(service => ({
          product_id: service.id,
          quantity: 1,
          sale_price: service.price
        }))

        const response = await fetch('/api/inventory/pos-sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            appointment_id: checkoutData.appointmentId,
            payment_total: checkoutData.services[0].price + tipAmount,
            payment_method: paymentMethod,
            barber_id: barberId
          })
        })

        const data = await response.json()
        if (data.success) {
          // Mark appointment as completed
          await completeAppointment(checkoutData.appointmentId, tipAmount)
          alert(`✅ Payment Completed!\n\nService: ${checkoutData.services[0].name}\nAmount: $${checkoutData.services[0].price}\nTip: $${tipAmount}\nMethod: ${paymentMethod}`)
        } else {
          alert(`❌ Payment Error: ${data.error}`)
        }
      }

      // Close checkout interface and return to normal mode
      setShowCheckoutInterface(false)
      setIsCheckoutMode(false)
      setCheckoutData(null)

      // Redirect back to calendar
      router.push('/dashboard/calendar')

    } catch (error) {
      console.error('Checkout error:', error)
      alert('Error processing checkout')
    } finally {
      setLoading(false)
    }
  }

  const completeAppointment = async (appointmentId, tipAmount) => {
    try {
      const response = await fetch(`/api/calendar/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          tip_amount: tipAmount,
          completed_at: new Date().toISOString()
        })
      })
      return response.ok
    } catch (error) {
      console.error('Error completing appointment:', error)
      return false
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

  const handleCin7Connect = async (credentials) => {
    try {
      // Use the new simplified connect endpoint
      const credentialResponse = await fetch('/api/cin7/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: credentials.apiKey,
          accountId: credentials.accountId 
        })
      })
      
      if (!credentialResponse.ok) {
        const credError = await credentialResponse.json()
        throw new Error(credError.error || 'Failed to save credentials')
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
      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <SetupWizard
          onComplete={handleSetupComplete}
          onClose={() => setShowSetupWizard(false)}
        />
      )}

      {/* Appointment Checkout Interface */}
      {showCheckoutInterface && checkoutData && (
        <AppointmentCheckoutModal
          checkoutData={checkoutData}
          onCheckout={handleAppointmentCheckout}
          onCancel={() => {
            setShowCheckoutInterface(false)
            setIsCheckoutMode(false)
            setCheckoutData(null)
            router.push('/dashboard/calendar')
          }}
        />
      )}

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

      {/* CIN7 Integration Manager - Replaces all CIN7 modals */}
      {(showCin7Modal || showCredentialManager || showEditCredentials) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">CIN7 Integration</h2>
                <button
                  onClick={() => {
                    setShowCin7Modal(false)
                    setShowCredentialManager(false)
                    setShowEditCredentials(false)
                    loadProducts() // Refresh products after closing
                    checkCin7Connection() // Refresh connection status
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <Cin7IntegrationManager 
                onConnectionChange={(connected) => {
                  setHasCredentials(connected)
                  setCin7Connected(connected)
                  if (connected) {
                    setCin7Status('connected')
                  }
                }}
                onClose={() => {
                  setShowCin7Modal(false)
                  setShowCredentialManager(false)
                  setShowEditCredentials(false)
                  loadProducts()
                  checkCin7Connection()
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Appointment Checkout Modal */}
      {showCheckoutInterface && (
        <AppointmentCheckoutModal
          isOpen={showCheckoutInterface}
          onClose={() => setShowCheckoutInterface(false)}
          checkoutData={checkoutData}
          onProcessPayment={handleAppointmentCheckout}
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

// Appointment Checkout Modal Component
function AppointmentCheckoutModal({ 
  isOpen, 
  onClose, 
  checkoutData, 
  onProcessPayment 
}) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [tipAmount, setTipAmount] = useState(0)
  const [useHouseAccount, setUseHouseAccount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [availableBarbers, setAvailableBarbers] = useState([])
  const [barbersLoading, setBarbersLoading] = useState(true)
  const [currentUserProfile, setCurrentUserProfile] = useState(null)
  const [autoSelectionReason, setAutoSelectionReason] = useState(null)

  // Load barbers and user profile when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBarbers()
      loadCurrentUserProfile()
    }
  }, [isOpen])

  const loadCurrentUserProfile = async () => {
    try {
      const response = await fetch('/api/profile/current')
      if (response.ok) {
        const data = await response.json()
        setCurrentUserProfile(data.profile)
      } else {
        console.error('Failed to load current user profile')
      }
    } catch (error) {
      console.error('Error loading current user profile:', error)
    }
  }

  const loadBarbers = async () => {
    try {
      setBarbersLoading(true)
      const response = await fetch('/api/staff')
      
      if (response.ok) {
        const data = await response.json()
        setAvailableBarbers(data.staff || [])
        
        // Implement priority-based barber selection
        await applyIntelligentBarberSelection(data.staff || [])
      } else {
        console.error('Failed to load barbers')
      }
    } catch (error) {
      console.error('Error loading barbers:', error)
    } finally {
      setBarbersLoading(false)
    }
  }

  const applyIntelligentBarberSelection = async (staffList) => {
    if (!staffList || staffList.length === 0) return

    let selectedBarber = null
    let reason = null

    // Priority 1: If appointment has assigned barber (existing logic)
    if (checkoutData.barberId) {
      const assignedBarber = staffList.find(barber => barber.user_id === checkoutData.barberId)
      if (assignedBarber) {
        selectedBarber = assignedBarber
        reason = 'appointment'
        console.log('✅ Auto-selected barber from appointment:', assignedBarber.display_name || assignedBarber.full_name)
      }
    }

    // Priority 2: If logged-in user is an active barber (new logic)
    if (!selectedBarber && currentUserProfile && currentUserProfile.role === 'BARBER' && currentUserProfile.is_active_barber) {
      const loggedInBarber = staffList.find(barber => barber.user_id === currentUserProfile.id)
      if (loggedInBarber) {
        selectedBarber = loggedInBarber
        reason = 'logged_in_barber'
        console.log('✅ Auto-selected logged-in barber:', loggedInBarber.display_name || loggedInBarber.full_name)
      }
    }

    // Priority 3: Manual selection (no auto-selection)
    if (!selectedBarber) {
      reason = 'manual'
      console.log('ℹ️  No auto-selection criteria met - user must select manually')
    }

    setSelectedBarber(selectedBarber)
    setAutoSelectionReason(reason)
  }

  // Re-run selection logic when currentUserProfile is loaded
  useEffect(() => {
    if (currentUserProfile && availableBarbers.length > 0) {
      applyIntelligentBarberSelection(availableBarbers)
    }
  }, [currentUserProfile, availableBarbers, checkoutData.barberId])

  if (!isOpen || !checkoutData) return null

  const serviceTotal = checkoutData.services?.reduce((sum, service) => sum + (service.price || 0), 0) || 0
  const totalAmount = serviceTotal + tipAmount

  const handleProcessPayment = async () => {
    if (!selectedBarber) {
      alert('Please select which barber performed this service before completing the transaction.')
      return
    }

    setLoading(true)
    try {
      await onProcessPayment(paymentMethod, tipAmount, useHouseAccount, selectedBarber.user_id)
      onClose()
    } catch (error) {
      console.error('Payment processing error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Complete Appointment</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Customer & Appointment Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Appointment Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Customer: {checkoutData.customerName}</div>
              {checkoutData.customerPhone && (
                <div>Phone: {checkoutData.customerPhone}</div>
              )}
              <div>Appointment ID: {checkoutData.appointmentId}</div>
            </div>
          </div>

          {/* Services */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Services</h3>
            <div className="space-y-2">
              {checkoutData.services?.map((service, index) => (
                <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-gray-500">{service.duration_minutes} min</div>
                  </div>
                  <div className="font-semibold">${service.price?.toFixed(2) || '0.00'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Barber Selection with Auto-Selection Feedback */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Performing Barber *
            </label>
            {barbersLoading ? (
              <div className="flex items-center justify-center py-3 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600 mr-2"></div>
                Loading barbers...
              </div>
            ) : availableBarbers.length === 0 ? (
              <div className="text-center py-3 text-gray-500 bg-gray-50 rounded-lg">
                No active barbers found
              </div>
            ) : (
              <div>
                {/* Auto-Selection Feedback */}
                {selectedBarber && autoSelectionReason && autoSelectionReason !== 'manual' && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-emerald-800">
                          Auto-selected: {selectedBarber.display_name || selectedBarber.full_name || selectedBarber.email}
                        </div>
                        <div className="text-sm text-emerald-700 mt-1">
                          {autoSelectionReason === 'appointment' 
                            ? 'From appointment booking'
                            : 'You are logged in as this barber'
                          }
                        </div>
                        <button
                          onClick={() => {
                            setSelectedBarber(null)
                            setAutoSelectionReason('manual')
                          }}
                          className="text-sm text-emerald-700 hover:text-emerald-800 font-medium mt-2 flex items-center"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m0-4l4-4" />
                          </svg>
                          Change Barber
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Barber Selection List - Show only when no auto-selection or user clicked "Change Barber" */}
                {(!selectedBarber || autoSelectionReason === 'manual') && (
                  <div className="space-y-2">
                    {availableBarbers.map((barber) => (
                      <div
                        key={barber.user_id}
                        onClick={() => {
                          setSelectedBarber(barber)
                          setAutoSelectionReason('manual')
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedBarber?.user_id === barber.user_id
                            ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {barber.display_name || barber.full_name || barber.email || 'Unnamed Barber'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {barber.role === 'OWNER' ? 'Owner' : 'Barber'}
                              {currentUserProfile && barber.user_id === currentUserProfile.id && (
                                <span className="ml-2 text-emerald-600 font-medium">(You)</span>
                              )}
                            </div>
                          </div>
                          {selectedBarber?.user_id === barber.user_id && (
                            <div className="text-emerald-600">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!selectedBarber && !barbersLoading && availableBarbers.length > 0 && (
              <p className="text-sm text-red-600 mt-2">Please select the barber who performed this service</p>
            )}
          </div>

          {/* Tip Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tip Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={tipAmount}
              onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span className="ml-2 text-sm">Cash</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span className="ml-2 text-sm">Card</span>
              </label>
              {checkoutData.customerId && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useHouseAccount}
                    onChange={(e) => setUseHouseAccount(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">Charge to House Account</span>
                </label>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold">Total Amount</div>
              <div className="text-xl font-bold text-emerald-600">
                ${totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Service: ${serviceTotal.toFixed(2)} + Tip: ${tipAmount.toFixed(2)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessPayment}
              disabled={loading}
              className="flex-1 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Complete Checkout'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { ShoppingCartIcon, UserIcon, CreditCardIcon, CheckCircleIcon, XCircleIcon, TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline'

export default function POSPage() {
  // State management
  const [products, setProducts] = useState([])
  const [barbers, setBarbers] = useState([])
  const [cart, setCart] = useState([])
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)
  const [salesHistory, setSalesHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  // Load initial data
  useEffect(() => {
    loadProducts()
    loadBarbers()
    loadSalesHistory()
  }, [])

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/shop/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBarbers = async () => {
    try {
      const response = await fetch('/api/shop/barbers')
      if (response.ok) {
        const data = await response.json()
        setBarbers(data.barbers || [])
      }
    } catch (error) {
      console.error('Error loading barbers:', error)
    }
  }

  const loadSalesHistory = async () => {
    try {
      const response = await fetch('/api/shop/pos?limit=20')
      if (response.ok) {
        const data = await response.json()
        setSalesHistory(data.sales || [])
      }
    } catch (error) {
      console.error('Error loading sales history:', error)
    }
  }

  // Cart operations
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id)

    if (existingItem) {
      updateCartQuantity(product.id, existingItem.quantity + 1)
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        unit_price: product.retail_price,
        quantity: 1,
        max_stock: product.current_stock
      }])
    }
  }

  const updateCartQuantity = (product_id, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(product_id)
      return
    }

    setCart(cart.map(item => {
      if (item.product_id === product_id) {
        return { ...item, quantity: Math.min(newQuantity, item.max_stock) }
      }
      return item
    }))
  }

  const removeFromCart = (product_id) => {
    setCart(cart.filter(item => item.product_id !== product_id))
  }

  const clearCart = () => {
    setCart([])
    setSelectedBarber(null)
    setSelectedCustomer(null)
    setPaymentMethod('cash')
    setNotes('')
  }

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    return {
      subtotal: subtotal.toFixed(2),
      itemCount
    }
  }

  // Process transaction
  const processTransaction = async () => {
    if (cart.length === 0) {
      alert('Cart is empty')
      return
    }

    if (!paymentMethod) {
      alert('Please select a payment method')
      return
    }

    setProcessing(true)

    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))

      const response = await fetch('/api/shop/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          barber_id: selectedBarber,
          customer_id: selectedCustomer,
          payment_method: paymentMethod,
          notes: notes || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setLastTransaction(data)
        setShowReceipt(true)
        clearCart()
        loadProducts() // Refresh product stock
        loadSalesHistory() // Refresh history
      } else {
        const error = await response.json()
        alert(`Transaction failed: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
      alert('Failed to process transaction')
    } finally {
      setProcessing(false)
    }
  }

  // Filter products by search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const totals = calculateTotals()

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading POS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Point of Sale
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Process retail sales and track transactions
              </p>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Search */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Select Products
              </h2>
              <input
                type="text"
                placeholder="Search products by name, SKU, or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Products Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-2 text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">
                      {searchQuery ? 'No products found' : 'No products available'}
                    </p>
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const inStock = product.current_stock > 0
                    const inCart = cart.find(item => item.product_id === product.id)

                    return (
                      <button
                        key={product.id}
                        onClick={() => inStock && addToCart(product)}
                        disabled={!inStock}
                        className={`text-left p-4 rounded-lg border-2 transition-all ${
                          inStock
                            ? 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md cursor-pointer'
                            : 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                        } ${inCart ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500' : 'bg-white dark:bg-slate-700'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">
                              {product.name}
                            </p>
                            {product.brand && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {product.brand}
                              </p>
                            )}
                            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                              ${parseFloat(product.retail_price).toFixed(2)}
                            </p>
                          </div>
                          {inCart && (
                            <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-emerald-600 rounded-full">
                              {inCart.quantity}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className={`font-medium ${inStock ? 'text-slate-600 dark:text-slate-400' : 'text-red-600 dark:text-red-400'}`}>
                            {inStock ? `Stock: ${product.current_stock}` : 'Out of Stock'}
                          </span>
                          {product.sku && (
                            <span className="text-slate-500 dark:text-slate-400 text-xs">
                              SKU: {product.sku}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Sales History (when shown) */}
            {showHistory && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Recent Sales
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead>
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Barber
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {salesHistory.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                            No sales history yet
                          </td>
                        </tr>
                      ) : (
                        salesHistory.map((sale) => (
                          <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                              {new Date(sale.sale_date).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                              {sale.product_name}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                              {sale.barber_name || 'N/A'}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                              {sale.quantity}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                              ${parseFloat(sale.total_amount).toFixed(2)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 capitalize">
                              {sale.payment_method}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Cart & Checkout */}
          <div className="lg:col-span-1 space-y-6">
            {/* Shopping Cart */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <ShoppingCartIcon className="h-5 w-5 mr-2" />
                  Cart ({totals.itemCount})
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <ShoppingCartIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Cart is empty</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ${parseFloat(item.unit_price).toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                          className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium text-slate-900 dark:text-white w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= item.max_stock}
                          className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="p-1 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Barber Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <UserIcon className="h-4 w-4 inline mr-1" />
                  Barber (for commission)
                </label>
                <select
                  value={selectedBarber || ''}
                  onChange={(e) => setSelectedBarber(e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">No barber (no commission)</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <CreditCardIcon className="h-4 w-4 inline mr-1" />
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'card', 'digital'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border-2 capitalize transition-colors ${
                        paymentMethod === method
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add any notes about this transaction..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Subtotal:</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    ${totals.subtotal}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">Total:</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${totals.subtotal}
                  </span>
                </div>
              </div>

              {/* Complete Transaction Button */}
              <button
                onClick={processTransaction}
                disabled={cart.length === 0 || processing}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Complete Transaction
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>

            <div className="text-center mb-6">
              <CheckCircleIcon className="h-16 w-16 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Transaction Complete
              </h2>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Items Sold:</h3>
              <div className="space-y-2">
                {lastTransaction.sales.map((sale, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">
                      {sale.product_name} x{sale.quantity}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      ${parseFloat(sale.total_amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  ${parseFloat(lastTransaction.totals.subtotal).toFixed(2)}
                </span>
              </div>
              {lastTransaction.totals.total_commission > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Commission ({lastTransaction.totals.commission_rate}%):
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    ${parseFloat(lastTransaction.totals.total_commission).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-900 dark:text-white">Total:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ${parseFloat(lastTransaction.totals.subtotal).toFixed(2)}
                </span>
              </div>
            </div>

            {lastTransaction.errors && lastTransaction.errors.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-2">
                  Some items could not be processed:
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-1">
                  {lastTransaction.errors.map((error, index) => (
                    <li key={index}>• {error.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setShowReceipt(false)}
              className="w-full mt-6 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

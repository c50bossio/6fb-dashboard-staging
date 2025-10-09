'use client'

import { useState, useEffect } from 'react'
import { ExclamationTriangleIcon, PlusIcon, MinusIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function InventoryPage() {
  // State management
  const [products, setProducts] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedProduct, setSelectedProduct] = useState('')
  const [adjustmentType, setAdjustmentType] = useState('restock')
  const [quantityChange, setQuantityChange] = useState('')
  const [reason, setReason] = useState('')
  const [costImpact, setCostImpact] = useState('')

  // Filter state
  const [filterProduct, setFilterProduct] = useState('')
  const [filterType, setFilterType] = useState('')

  // UI state
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Load initial data
  useEffect(() => {
    loadProducts()
    loadLowStockProducts()
    loadAdjustmentHistory()
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

  const loadLowStockProducts = async () => {
    try {
      const response = await fetch('/api/shop/inventory?low_stock=true')
      if (response.ok) {
        const data = await response.json()
        setLowStockProducts(data.low_stock_products || [])
      }
    } catch (error) {
      console.error('Error loading low-stock products:', error)
    }
  }

  const loadAdjustmentHistory = async () => {
    try {
      let url = '/api/shop/inventory?limit=50'
      if (filterProduct) url += `&product_id=${filterProduct}`
      if (filterType) url += `&adjustment_type=${filterType}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAdjustments(data.adjustments || [])
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error loading adjustment history:', error)
    }
  }

  // Apply filters
  useEffect(() => {
    loadAdjustmentHistory()
  }, [filterProduct, filterType])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    // Validation
    if (!selectedProduct) {
      setErrorMessage('Please select a product')
      return
    }

    if (!quantityChange || quantityChange === '0') {
      setErrorMessage('Please enter a quantity change')
      return
    }

    if (!reason || reason.trim().length < 10) {
      setErrorMessage('Reason must be at least 10 characters')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/shop/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          adjustment_type: adjustmentType,
          quantity_change: parseInt(quantityChange),
          reason: reason.trim(),
          cost_impact: costImpact ? parseFloat(costImpact) : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccessMessage(`Successfully adjusted ${data.adjustment.product_name} by ${data.adjustment.quantity_change}`)
        setShowSuccess(true)

        // Reset form
        setSelectedProduct('')
        setQuantityChange('')
        setReason('')
        setCostImpact('')

        // Reload data
        loadProducts()
        loadLowStockProducts()
        loadAdjustmentHistory()

        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        const error = await response.json()
        setErrorMessage(error.message || 'Failed to create adjustment')
      }
    } catch (error) {
      console.error('Error creating adjustment:', error)
      setErrorMessage('Failed to create adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  const getSelectedProductStock = () => {
    const product = products.find(p => p.id === selectedProduct)
    return product ? product.current_stock : 0
  }

  const getAdjustmentTypeColor = (type) => {
    const colors = {
      restock: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      damage: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      theft: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      correction: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      return: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
    }
    return colors[type] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }

  const getAdjustmentTypeIcon = (type) => {
    if (type === 'restock') return <PlusIcon className="h-4 w-4" />
    if (type === 'damage' || type === 'theft') return <MinusIcon className="h-4 w-4" />
    if (type === 'correction') return <ArrowPathIcon className="h-4 w-4" />
    return <ArrowPathIcon className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Inventory Management
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Adjust stock levels and track inventory changes
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
            <p className="text-sm text-green-800 dark:text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Adjustment Form & Low Stock */}
          <div className="lg:col-span-1 space-y-6">
            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400 mr-2" />
                  <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-300">
                    Low Stock Alert
                  </h2>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-400 mb-3">
                  {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} need restocking
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="bg-white dark:bg-slate-800 rounded-md p-3 border border-amber-200 dark:border-amber-800">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-amber-700 dark:text-amber-400">
                          Stock: {product.current_stock} / {product.min_stock_level}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedProduct(product.id)
                            setAdjustmentType('restock')
                          }}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                        >
                          Restock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Adjustment Form */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Create Adjustment
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Product *
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Stock: {product.current_stock})
                      </option>
                    ))}
                  </select>
                  {selectedProduct && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Current stock: {getSelectedProductStock()} units
                    </p>
                  )}
                </div>

                {/* Adjustment Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Adjustment Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'restock', label: 'Restock', icon: <PlusIcon className="h-4 w-4" /> },
                      { value: 'damage', label: 'Damage', icon: <MinusIcon className="h-4 w-4" /> },
                      { value: 'theft', label: 'Theft', icon: <MinusIcon className="h-4 w-4" /> },
                      { value: 'correction', label: 'Correction', icon: <ArrowPathIcon className="h-4 w-4" /> },
                      { value: 'return', label: 'Return', icon: <PlusIcon className="h-4 w-4" /> }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAdjustmentType(type.value)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-colors flex items-center justify-center ${
                          adjustmentType === type.value
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                        }`}
                      >
                        {type.icon}
                        <span className="ml-1">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity Change */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Quantity Change *
                  </label>
                  <input
                    type="number"
                    value={quantityChange}
                    onChange={(e) => setQuantityChange(e.target.value)}
                    placeholder="Enter quantity (positive or negative)"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Use positive numbers to add stock, negative to remove
                  </p>
                </div>

                {/* Cost Impact */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Cost Impact (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costImpact}
                    onChange={(e) => setCostImpact(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Financial impact for accounting
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reason * (min 10 characters)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Explain the reason for this adjustment..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {reason.length} / 10 characters minimum
                  </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center">
                    <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                    <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Create Adjustment
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Summary Statistics */}
            {summary && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Adjustment Summary
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Total Adjustments:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{summary.total_adjustments}</span>
                  </div>
                  {Object.entries(summary.by_type).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className={`capitalize ${getAdjustmentTypeColor(type)} px-2 py-1 rounded text-xs`}>
                        {type}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Adjustment History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Adjustment History
                </h2>

                {/* Filters */}
                <div className="flex space-x-2">
                  <select
                    value={filterProduct}
                    onChange={(e) => setFilterProduct(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">All Products</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">All Types</option>
                    <option value="restock">Restock</option>
                    <option value="damage">Damage</option>
                    <option value="theft">Theft</option>
                    <option value="correction">Correction</option>
                    <option value="return">Return</option>
                  </select>
                </div>
              </div>

              {/* Adjustments Table */}
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
                        Type
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Before → After
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Adjusted By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {adjustments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                          No adjustments recorded yet
                        </td>
                      </tr>
                    ) : (
                      adjustments.map((adjustment) => (
                        <tr key={adjustment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                            {new Date(adjustment.adjustment_date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                            {adjustment.product_name}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getAdjustmentTypeColor(adjustment.adjustment_type)}`}>
                              {getAdjustmentTypeIcon(adjustment.adjustment_type)}
                              <span className="ml-1 capitalize">{adjustment.adjustment_type}</span>
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm">
                            <span className={`font-medium ${adjustment.quantity_change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {adjustment.quantity_change > 0 ? '+' : ''}{adjustment.quantity_change}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                            {adjustment.previous_quantity} → {adjustment.new_quantity}
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {adjustment.reason}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                            {adjustment.adjusted_by_name}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

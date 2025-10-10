'use client'

import { useState, useEffect } from 'react'
import { 
  ShoppingCartIcon,
  CurrencyDollarIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CalculatorIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon
} from '@heroicons/react/24/outline'

import ProtectedRoute from '../../../components/ProtectedRoute'
import GlobalNavigation from '../../../components/GlobalNavigation'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import { createClient } from '../../../lib/supabase/client'
import LoadingSpinner from '../../../components/LoadingSpinner'
import POSProductSelector from '../../../components/pos/POSProductSelector'
import PaymentForm from '../../../components/payment/PaymentForm'

export default function POSPage() {
  const { user, profile } = useAuth()
  const [cart, setCart] = useState([])
  const [showPayment, setShowPayment] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [selectedBarber, setSelectedBarber] = useState(profile?.id)
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)

  // Load barbers for commission assignment
  useEffect(() => {
    const loadBarbers = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('role', 'BARBER')
          .or(`barbershop_id.eq.${profile?.barbershop_id || '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'}`)
          .order('first_name', { ascending: true })
        
        setBarbers(data || [])
      } catch (error) {
        console.error('Error loading barbers:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadBarbers()
  }, [profile?.barbershop_id])

  // Handle product selection from POSProductSelector
  const handleProductSelect = (product) => {
    const existingItem = cart.find(item => item.id === product.id)
    
    if (existingItem) {
      // Update quantity
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: Math.min(product.quantity, product.current_stock) }
          : item
      ))
    } else if (product.quantity > 0) {
      // Add new item
      setCart([...cart, { ...product, quantity: Math.min(product.quantity, product.current_stock) }])
    }
  }

  // Update item quantity
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity: Math.min(newQuantity, item.current_stock) }
        : item
    ))
  }

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
    setShowPayment(false)
    setSuccess(false)
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.retail_price * item.quantity), 0)
  const tax = subtotal * 0.08 // 8% tax rate - should be configurable
  const total = subtotal + tax

  // Calculate commission (40% default)
  const commissionRate = 0.40
  const commissionAmount = subtotal * commissionRate

  // Process sale
  const processSale = async (paymentMethod = 'card') => {
    setProcessing(true)
    
    try {
      const supabase = createClient()
      
      // Create transaction record
      const transactionData = {
        barbershop_id: profile?.barbershop_id || '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
        barber_id: selectedBarber,
        type: 'product',
        amount: subtotal,
        tax_amount: tax,
        total_amount: total,
        commission_amount: commissionAmount,
        payment_method: paymentMethod,
        status: 'completed',
        description: `POS Sale: ${cart.length} items`
      }
      
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single()
      
      if (transactionError) throw transactionError

      // Record product sales and update inventory
      for (const item of cart) {
        // Create product sale record
        await supabase
          .from('product_sales')
          .insert({
            barbershop_id: profile?.barbershop_id || '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
            product_id: item.id,
            barber_id: selectedBarber,
            quantity: item.quantity,
            unit_price: item.retail_price,
            total_amount: item.retail_price * item.quantity,
            commission_amount: (item.retail_price * item.quantity) * commissionRate
          })

        // Update inventory stock
        await supabase
          .from('inventory')
          .update({
            current_stock: item.current_stock - item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
      }

      setSuccess(true)
      setTimeout(() => {
        clearCart()
      }, 3000)
      
    } catch (error) {
      console.error('Error processing sale:', error)
      alert('Failed to process sale. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (success) {
    return (
      <ProtectedRoute>
        <GlobalNavigation>
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                  <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                  <h2 className="mt-4 text-2xl font-bold text-gray-900">Sale Completed!</h2>
                  <p className="mt-2 text-gray-600">
                    Transaction processed successfully for ${total.toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Commission earned: ${commissionAmount.toFixed(2)}
                  </p>
                  <button
                    onClick={clearCart}
                    className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-olive-600 hover:bg-olive-700"
                  >
                    New Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </GlobalNavigation>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <GlobalNavigation>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ShoppingCartIcon className="h-8 w-8 mr-3 text-olive-600" />
                Point of Sale
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Process in-store product sales and track commissions
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product Selection */}
              <div className="lg:col-span-2">
                <POSProductSelector
                  onProductSelect={handleProductSelect}
                  selectedProducts={cart}
                  barbershopId={profile?.barbershop_id || '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'}
                />
              </div>

              {/* Shopping Cart */}
              <div className="space-y-6">
                {/* Cart Items */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <ShoppingCartIcon className="h-5 w-5 mr-2" />
                      Cart ({cart.length} items)
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    {cart.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No items in cart</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between border-b border-gray-200 pb-4">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                              <p className="text-xs text-gray-500">{item.brand}</p>
                              <p className="text-sm font-semibold text-gray-900">
                                ${item.retail_price.toFixed(2)} each
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1 rounded-md hover:bg-gray-100"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <span className="text-sm font-medium w-8 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.current_stock}
                                className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="p-1 rounded-md hover:bg-red-100 text-red-600"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {cart.length > 0 && (
                  <>
                    {/* Barber Selection */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <UserIcon className="h-4 w-4 mr-2" />
                        Assign Commission To
                      </h3>
                      <select
                        value={selectedBarber}
                        onChange={(e) => setSelectedBarber(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                      >
                        {barbers.map(barber => (
                          <option key={barber.id} value={barber.id}>
                            {barber.first_name} {barber.last_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <CalculatorIcon className="h-5 w-5 mr-2" />
                        Order Summary
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax (8%):</span>
                          <span className="font-medium">${tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                          <span className="text-gray-600">Commission ({(commissionRate * 100).toFixed(0)}%):</span>
                          <span className="font-medium text-green-600">
                            +${commissionAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                          <span>Total:</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        <button
                          onClick={() => processSale('cash')}
                          disabled={processing}
                          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          {processing ? 'Processing...' : 'Cash Payment'}
                        </button>
                        <button
                          onClick={() => setShowPayment(true)}
                          disabled={processing}
                          className="w-full bg-olive-600 text-white px-4 py-2 rounded-md hover:bg-olive-700 disabled:opacity-50"
                        >
                          Card Payment
                        </button>
                        <button
                          onClick={clearCart}
                          className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Clear Cart
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Modal */}
            {showPayment && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-medium mb-4">Process Card Payment</h3>
                  <PaymentForm
                    amount={total}
                    serviceName={`POS Sale (${cart.length} items)`}
                    paymentType="pos_sale"
                    onSuccess={() => {
                      setShowPayment(false)
                      processSale('card')
                    }}
                    onError={(error) => {
                      console.error('Payment error:', error)
                      alert('Payment failed. Please try again.')
                    }}
                  />
                  <button
                    onClick={() => setShowPayment(false)}
                    className="mt-4 w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </GlobalNavigation>
    </ProtectedRoute>
  )
}
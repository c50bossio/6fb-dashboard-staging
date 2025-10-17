'use client'

import { ShoppingCart, Package, Receipt, Plus, Minus, Trash2, ExternalLink, Edit2, Check, X, Search, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { TerminalPaymentModal } from '@/components/pos/TerminalPaymentModal'
import { CashPaymentModal } from '@/components/pos/CashPaymentModal'
import { PaymentMethodSelector } from '@/components/pos/PaymentMethodSelector'
import { useToast } from '@/hooks/use-toast'

// Simplified Checkout Component
function StripeTerminalCheckout({ barbershopId, userId }) {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [paymentMethodSelectorOpen, setPaymentMethodSelectorOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (barbershopId) {
      loadProducts()
    }
  }, [barbershopId])

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/shop/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error loading products:', error)
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1, price: product.retail_price }])
    }
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, change) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = Math.max(1, item.quantity + change)
        return { ...item, quantity: newQuantity }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  // Calculate subtotal (same for cash and card)
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  // Processing fee only added for card payments (2.9% + 30¢)
  // This gives us immediate margin as Stripe Terminal only charges 2.7%
  const processingFee = subtotal > 0 ? (subtotal * 0.029) + 0.30 : 0

  // Payment method handlers
  const handlePaymentMethodSelect = (method) => {
    setPaymentMethodSelectorOpen(false)
    if (method === 'cash') {
      setCashModalOpen(true)
    } else if (method === 'terminal') {
      setPaymentModalOpen(true)
    }
  }

  const handlePaymentSuccess = () => {
    setCart([])
    setCashModalOpen(false)
    setPaymentModalOpen(false)
    toast({
      title: 'Payment Successful',
      description: 'Sale completed successfully',
      variant: 'default'
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Product Selection */}
      <Card className="card-modern shadow-modern">
        <CardHeader className="border-b border-border bg-gradient-to-r from-card to-brand-50/10 dark:to-brand-900/10">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-600 dark:text-brand-500" />
            Select Products
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No products available</p>
              <p className="text-sm mt-2">Add products in the Inventory tab</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {products.slice(0, 20).map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-3 border rounded-lg hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors text-left"
                >
                  <div className="font-medium text-sm">{product.name}</div>
                  <div className="text-brand-600 dark:text-brand-500 font-semibold">
                    ${product.retail_price?.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stock: {product.current_stock || 0}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cart & Checkout */}
      <Card className="card-modern-gold shadow-gold">
        <CardHeader className="border-b border-brand-600/20 dark:border-brand-700/30 bg-gradient-gold-subtle">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-brand-600 dark:text-brand-500" />
            Cart ({cart.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Cart is empty</p>
              <p className="text-sm">Select products to add them to cart</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ${item.price.toFixed(2)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="h-7 w-7 p-0 text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                {/* Total (processing fee added only for card payments) */}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-brand-600 dark:text-brand-500">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <Button
                  onClick={() => setPaymentMethodSelectorOpen(true)}
                  disabled={cart.length === 0}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Collect Payment
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Select cash or card payment method
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Selector */}
      <PaymentMethodSelector
        isOpen={paymentMethodSelectorOpen}
        onClose={() => setPaymentMethodSelectorOpen(false)}
        onSelectMethod={handlePaymentMethodSelect}
        totalAmount={subtotal}
      />

      {/* Cash Payment Modal */}
      <CashPaymentModal
        isOpen={cashModalOpen}
        onClose={() => setCashModalOpen(false)}
        cartItems={cart}
        barbershopId={barbershopId}
        barberId={userId}
        customerId={null}
        subtotal={subtotal}
        totalAmount={subtotal}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Terminal Payment Modal */}
      <TerminalPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        cartItems={cart}
        barbershopId={barbershopId}
        barberId={userId}
        customerId={null}
        subtotal={subtotal}
        processingFee={processingFee}
        totalAmount={subtotal + processingFee}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}

function FunctionalInventoryManager({ barbershopId }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const { toast } = useToast()

  // Quick Add Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    retail_price: '',
    current_stock: '',
    category: ''
  })

  // Edit Form State
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    if (barbershopId) {
      loadProducts()
    }
  }, [barbershopId])

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

  const addProduct = async (e) => {
    e.preventDefault()

    if (!newProduct.name || !newProduct.retail_price) {
      toast({
        title: 'Missing Fields',
        description: 'Product name and price are required',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/shop/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          retail_price: parseFloat(newProduct.retail_price),
          current_stock: parseInt(newProduct.current_stock) || 0,
          barbershop_id: barbershopId
        })
      })

      if (response.ok) {
        await loadProducts()
        setNewProduct({ name: '', retail_price: '', current_stock: '', category: '' })
        setShowAddForm(false)
        toast({
          title: 'Product Added',
          description: `${newProduct.name} added successfully`,
          variant: 'default'
        })
      } else {
        throw new Error('Failed to add product')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add product',
        variant: 'destructive'
      })
    }
  }

  const startEdit = (product) => {
    setEditingId(product.id)
    setEditForm({ ...product })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (productId) => {
    try {
      const response = await fetch(`/api/shop/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        await loadProducts()
        setEditingId(null)
        toast({
          title: 'Product Updated',
          description: 'Changes saved successfully',
          variant: 'default'
        })
      } else {
        throw new Error('Failed to update product')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive'
      })
    }
  }

  const adjustStock = async (product, delta) => {
    const newStock = (product.current_stock || 0) + delta
    if (newStock < 0) return

    try {
      const response = await fetch(`/api/shop/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stock: newStock })
      })

      if (response.ok) {
        await loadProducts()
        toast({
          title: 'Stock Updated',
          description: `${product.name}: ${product.current_stock} → ${newStock}`,
          variant: 'default'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update stock',
        variant: 'destructive'
      })
    }
  }

  const deleteProduct = async (product) => {
    if (!confirm(`Delete ${product.name}?`)) return

    try {
      const response = await fetch(`/api/shop/products/${product.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadProducts()
        toast({
          title: 'Product Deleted',
          description: `${product.name} removed from inventory`,
          variant: 'default'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive'
      })
    }
  }

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockCount = products.filter(p =>
    (p.current_stock || 0) < (p.min_stock_level || 5)
  ).length

  return (
    <Card className="card-modern shadow-modern">
      <CardHeader className="border-b border-border bg-gradient-to-r from-card to-brand-50/10 dark:to-brand-900/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-600 dark:text-brand-500" />
            Inventory ({products.length} products)
            {lowStockCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                {lowStockCount} low stock
              </span>
            )}
          </CardTitle>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            className="bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showAddForm ? 'Cancel' : 'Add Product'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Quick Add Product Form */}
        {showAddForm && (
          <form onSubmit={addProduct} className="mb-6 p-4 border rounded-lg bg-brand-50 dark:bg-brand-950/30">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Quick Add Product
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Product Name *"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price *"
                value={newProduct.retail_price}
                onChange={(e) => setNewProduct({ ...newProduct, retail_price: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
                required
              />
              <input
                type="number"
                placeholder="Stock"
                value={newProduct.current_stock}
                onChange={(e) => setNewProduct({ ...newProduct, current_stock: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Category"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <Button type="submit" className="mt-3 bg-brand-600 hover:bg-brand-700" size="sm">
              Add Product
            </Button>
          </form>
        )}

        {/* Search Bar */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {products.length === 0 ? 'No Products Yet' : 'No Results Found'}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {products.length === 0 ? 'Click "Add Product" above to get started' : 'Try a different search term'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="p-4 border rounded-lg relative">
                {editingId === product.id ? (
                  // Edit Mode
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm font-medium"
                    />
                    <input
                      type="text"
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-xs"
                      placeholder="Category"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.retail_price || ''}
                        onChange={(e) => setEditForm({ ...editForm, retail_price: parseFloat(e.target.value) })}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        placeholder="Price"
                      />
                      <input
                        type="number"
                        value={editForm.current_stock || ''}
                        onChange={(e) => setEditForm({ ...editForm, current_stock: parseInt(e.target.value) })}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        placeholder="Stock"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => saveEdit(product.id)}
                        size="sm"
                        className="flex-1"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        onClick={cancelEdit}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="mb-3">
                      <div className="font-medium mb-1">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.category || 'Uncategorized'}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                      <span className="text-brand-600 dark:text-brand-500 font-semibold">
                        ${product.retail_price?.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1">
                        {(product.current_stock || 0) < (product.min_stock_level || 5) && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          (product.current_stock || 0) < (product.min_stock_level || 5)
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {product.current_stock || 0}
                        </span>
                      </div>
                    </div>

                    {/* Stock Adjustment Buttons */}
                    <div className="flex gap-1 mb-2">
                      <Button
                        onClick={() => adjustStock(product, -1)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => adjustStock(product, 1)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => adjustStock(product, 5)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        +5
                      </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      <Button
                        onClick={() => startEdit(product)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteProduct(product)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SalesHistoryView() {
  return (
    <Card className="card-modern shadow-modern">
      <CardHeader className="border-b border-border bg-gradient-to-r from-card to-brand-50/10 dark:to-brand-900/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand-600 dark:text-brand-500" />
            Sales History
          </CardTitle>
          <Button
            onClick={() => window.open('https://dashboard.stripe.com/payments', '_blank')}
            variant="outline"
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View in Stripe
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="text-center py-12">
          <Receipt className="h-16 w-16 mx-auto mb-4 text-brand-600 dark:text-brand-500 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Sales Tracking</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
            All sales are processed through Stripe Terminal and visible in your Stripe Dashboard
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => window.open('https://dashboard.stripe.com/payments', '_blank')}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Stripe Dashboard
            </Button>
            <p className="text-xs text-muted-foreground">
              View detailed transaction history, refunds, and reports
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SimplifiedPOSPage() {
  const [barbershopId, setBarbershopId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserContext()
  }, [])

  const loadUserContext = async () => {
    try {
      // Use credentials: 'include' to send auth cookies with the request
      const response = await fetch('/api/profile/current', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          setUserId(data.profile.id)
          setBarbershopId(data.profile.barbershop_id || data.profile.id)
        }
      }
    } catch (error) {
      console.error('Error loading user context:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 animate-pulse text-brand-600 mx-auto mb-4" />
          <p className="text-lg font-medium">Loading POS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header with Brand Styling */}
      <div className="mb-8 p-6 rounded-2xl gradient-gold-subtle border border-brand-600/20 dark:border-brand-700/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center shadow-gold">
            <ShoppingCart className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Point of Sale</h1>
            <p className="text-sm text-muted-foreground">
              Simplified checkout powered by Stripe Terminal
            </p>
          </div>
        </div>
      </div>

      {/* 3-Tab Interface */}
      <Tabs defaultValue="checkout" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid bg-card border border-border shadow-sm">
          <TabsTrigger
            value="checkout"
            className="data-[state=active]:bg-brand-600 data-[state=active]:text-white"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Checkout
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="data-[state=active]:bg-brand-600 data-[state=active]:text-white"
          >
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-brand-600 data-[state=active]:text-white"
          >
            <Receipt className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkout" className="space-y-4">
          <StripeTerminalCheckout barbershopId={barbershopId} userId={userId} />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <FunctionalInventoryManager barbershopId={barbershopId} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <SalesHistoryView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

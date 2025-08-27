'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Package, Search, Plus, Minus, Receipt, CreditCard } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  current_stock: number
  sku?: string
  barcode?: string
  category?: string
  image_url?: string
  thumbnail_url?: string
  tax_rate?: number
  commission_rate?: number
}

interface CartItem extends Product {
  quantity: number
  subtotal: number
}

interface POSInterfaceProps {
  barbershopId: string
  barberId?: string
  customerId?: string
}

export function POSInterface({ barbershopId, barberId, customerId }: POSInterfaceProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash')
  const { toast } = useToast()

  useEffect(() => {
    loadProducts()
  }, [barbershopId, selectedCategory])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        barbershop_id: barbershopId,
        in_stock_only: 'true'
      })
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      const response = await fetch(`/api/pos/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.current_stock < quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.current_stock} units available`,
        variant: "destructive"
      })
      return
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity
        if (newQuantity > product.current_stock) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${product.current_stock} units available`,
            variant: "destructive"
          })
          return prevCart
        }
        
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity, subtotal: newQuantity * product.price }
            : item
        )
      } else {
        return [...prevCart, {
          ...product,
          quantity,
          subtotal: quantity * product.price
        }]
      }
    })
  }

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find(p => p.id === productId)
    if (product && newQuantity > product.current_stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.current_stock} units available`,
        variant: "destructive"
      })
      return
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
          : item
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
  }

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
    const tax = cart.reduce((sum, item) => {
      const itemTax = (item.subtotal * (item.tax_rate || 0)) / 100
      return sum + itemTax
    }, 0)
    return { subtotal, tax, total: subtotal + tax }
  }

  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add products to cart before processing sale",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const sales = cart.map(item => ({
        barbershop_id: barbershopId,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        barber_id: barberId,
        customer_id: customerId,
        payment_method: paymentMethod,
        receipt_number: generateReceiptNumber()
      }))

      // Process each sale
      for (const sale of sales) {
        const response = await fetch('/api/pos/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale)
        })

        if (!response.ok) {
          throw new Error(`Failed to process sale for ${sale.product_id}`)
        }
      }

      toast({
        title: "Sale Processed",
        description: `Successfully sold ${cart.length} items`,
        variant: "default"
      })

      // Clear cart and reload products (to update stock)
      setCart([])
      loadProducts()

    } catch (error) {
      toast({
        title: "Sale Failed",
        description: error instanceof Error ? error.message : "Failed to process sale",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generateReceiptNumber = () => {
    return `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const totals = calculateTotal()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {product.thumbnail_url && (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-md mb-3"
                      />
                    )}
                    <div className="space-y-2">
                      <h3 className="font-medium line-clamp-2">{product.name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">${product.price}</span>
                        <Badge variant={product.current_stock > 0 ? 'default' : 'destructive'}>
                          {product.current_stock} in stock
                        </Badge>
                      </div>
                      {product.sku && (
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      )}
                      <Button
                        onClick={() => addToCart(product)}
                        disabled={product.current_stock === 0}
                        className="w-full"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart Section */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Cart is empty
                </p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-1">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ${item.price} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checkout Section */}
        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <div className="flex gap-2">
                  {(['cash', 'card', 'online'] as const).map(method => (
                    <Button
                      key={method}
                      variant={paymentMethod === method ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod(method)}
                      className="flex-1"
                      size="sm"
                    >
                      {method === 'card' && <CreditCard className="h-4 w-4 mr-1" />}
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Process Sale Button */}
              <Button
                onClick={processSale}
                disabled={loading || cart.length === 0}
                className="w-full"
                size="lg"
              >
                <Receipt className="h-4 w-4 mr-2" />
                {loading ? 'Processing...' : `Process Sale - $${totals.total.toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
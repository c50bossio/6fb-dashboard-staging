"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, CreditCard, Receipt, Trash2 } from 'lucide-react';

// POS Transaction Interface for Single Barbershop MVP
export default function POSTransactionInterface({ barbershopId, staffId }) {
  // Transaction State
  const [cart, setCart] = useState([]);
  const [services, setServices] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Load services on component mount
  useEffect(() => {
    loadServices();
  }, [barbershopId]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/services?barbershop_id=${barbershopId}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data || []);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  // Calculate transaction totals
  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const total = subtotal + tipAmount;

  // Add service to cart
  const addToCart = (service) => {
    const existingItem = cart.find(item => item.id === service.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === service.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { 
        ...service, 
        quantity: 1,
        price: parseFloat(service.price || 0)
      }]);
    }
  };

  // Update item quantity
  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(item => 
      item.id === itemId 
        ? { ...item, quantity }
        : item
    ));
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setTipAmount(0);
  };

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const paymentData = {
        barbershop_id: barbershopId,
        staff_id: staffId,
        customer_id: customer?.id || null,
        items: cart,
        subtotal: subtotal,
        tip_amount: tipAmount,
        total: total,
        payment_method: paymentMethod
      };

      const response = await fetch('/api/pos/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Payment processed successfully');
        
        // Clear cart and reset state
        clearCart();
        
        // Optionally show receipt
        if (result.receipt_url) {
          window.open(result.receipt_url, '_blank');
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Payment processing failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Search and select customer
  const searchCustomers = async (query) => {
    if (!query.trim()) return [];
    
    try {
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}&barbershop_id=${barbershopId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Customer search error:', error);
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Services Selection */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Services</h2>
            
            {services.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No services available</p>
                <p className="text-sm">Add services in Settings to start selling</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {services.map((service) => (
                  <Card 
                    key={service.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => addToCart(service)}
                  >
                    <div className="p-4 text-center">
                      <h3 className="font-medium text-sm mb-2">{service.name}</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        ${parseFloat(service.price || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {service.duration_minutes}min
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cart and Checkout */}
      <div>
        <Card className="h-full">
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Current Order</h2>
              {cart.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearCart}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Customer Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Customer (Optional)</label>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowCustomerModal(true)}
              >
                {customer ? customer.name : 'Walk-in Customer'}
              </Button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 mb-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No items in cart</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-blue-600 font-semibold">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tip Input */}
            {cart.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tip Amount</label>
                <div className="flex gap-2">
                  <Button
                    variant={tipAmount === subtotal * 0.15 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipAmount(subtotal * 0.15)}
                  >
                    15%
                  </Button>
                  <Button
                    variant={tipAmount === subtotal * 0.18 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipAmount(subtotal * 0.18)}
                  >
                    18%
                  </Button>
                  <Button
                    variant={tipAmount === subtotal * 0.20 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipAmount(subtotal * 0.20)}
                  >
                    20%
                  </Button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-2"
                />
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div className="border-t pt-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {tipAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Tip:</span>
                      <span>${tipAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {cart.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={paymentMethod === 'card' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Card
                  </Button>
                  <Button
                    variant={paymentMethod === 'cash' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMethod('cash')}
                  >
                    Cash
                  </Button>
                </div>
              </div>
            )}

            {/* Checkout Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={processPayment}
              disabled={cart.length === 0 || isProcessingPayment}
            >
              {isProcessingPayment ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Charge ${total.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Customer Search Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Select Customer"
      >
        <div className="p-4">
          <Input
            type="text"
            placeholder="Search customers by name or phone..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="mb-4"
          />
          
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setCustomer(null);
                setShowCustomerModal(false);
              }}
            >
              Walk-in Customer (No customer record)
            </Button>
            
            {/* Customer search results would go here */}
            {/* For MVP, we'll keep it simple with walk-in customers */}
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCustomerModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
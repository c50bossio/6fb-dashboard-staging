'use client'

import { DollarSign, CheckCircle2, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export function CashPaymentModal({
  isOpen,
  onClose,
  cartItems,
  barbershopId,
  barberId,
  customerId,
  subtotal,
  totalAmount,
  onPaymentSuccess
}) {
  const [processing, setProcessing] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  const { toast } = useToast()

  const handleCashPayment = async () => {
    const received = parseFloat(amountReceived) || 0

    if (received < totalAmount) {
      toast({
        title: "Insufficient Amount",
        description: `Received $${received.toFixed(2)}, need $${totalAmount.toFixed(2)}`,
        variant: "destructive"
      })
      return
    }

    try {
      setProcessing(true)

      // Record cash sale in database
      const response = await fetch('/api/pos/cash-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId,
          barberId,
          customerId,
          cartItems,
          subtotal,
          totalAmount,
          amountReceived: received,
          change: received - totalAmount
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record cash payment')
      }

      const data = await response.json()

      toast({
        title: "Cash Payment Complete!",
        description: `Change due: $${(received - totalAmount).toFixed(2)}`,
        variant: "default"
      })

      // Auto-close after 2 seconds
      setTimeout(() => {
        onPaymentSuccess()
        onClose()
        resetForm()
      }, 2000)

    } catch (error) {
      console.error('Cash payment error:', error)
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive"
      })
      setProcessing(false)
    }
  }

  const resetForm = () => {
    setAmountReceived('')
    setProcessing(false)
  }

  const change = parseFloat(amountReceived) - totalAmount
  const showChange = amountReceived && parseFloat(amountReceived) >= totalAmount

  // Quick amount buttons
  const quickAmounts = [
    totalAmount,
    Math.ceil(totalAmount / 10) * 10, // Round up to nearest $10
    Math.ceil(totalAmount / 20) * 20, // Round up to nearest $20
    Math.ceil(totalAmount / 50) * 50  // Round up to nearest $50
  ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Cash Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Order Summary</h4>
              <div className="space-y-2">
                {cartItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}

                <div className="border-t my-2"></div>

                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total Due</span>
                  <span className="text-green-600">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Received Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount Received
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={totalAmount.toFixed(2)}
                className="w-full pl-8 pr-4 py-3 text-2xl font-bold border-2 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200"
                autoFocus
                disabled={processing}
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {quickAmounts.map(amount => (
                <Button
                  key={amount}
                  onClick={() => setAmountReceived(amount.toFixed(2))}
                  variant="outline"
                  size="sm"
                  disabled={processing}
                >
                  ${amount.toFixed(0)}
                </Button>
              ))}
            </div>
          </div>

          {/* Change Display */}
          {showChange && (
            <Card className="bg-green-50 dark:bg-green-950 border-green-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900 dark:text-green-100">
                    Change Due
                  </span>
                  <span className="text-3xl font-bold text-green-600">
                    ${change.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onClose()
                resetForm()
              }}
              disabled={processing}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <Button
              onClick={handleCashPayment}
              disabled={!amountReceived || processing || parseFloat(amountReceived) < totalAmount}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Sale
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

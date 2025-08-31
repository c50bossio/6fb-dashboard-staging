'use client'

import { CheckCircle2, XCircle, Clock, CreditCard, Smartphone, Store, Receipt } from 'lucide-react'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface CartItem {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  sku?: string
  image_url?: string
}

interface PaymentSession {
  id: string
  barbershop_id: string
  cart_items: CartItem[]
  total_amount: number
  subtotal: number
  tax_amount: number
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
  stripe_session_url: string
  expires_at: string
  barbershop?: {
    name: string
    address?: string
    phone?: string
  }
}

export default function QRPaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (sessionId) {
      loadPaymentSession()
    }
  }, [sessionId])

  const loadPaymentSession = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/pos/qr-payment?sessionId=${sessionId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Payment session not found')
      }

      const statusData = await response.json()
      
      // If payment is already completed or expired, show status
      if (statusData.status !== 'pending') {
        setPaymentSession({
          id: sessionId,
          status: statusData.status,
          total_amount: statusData.totalAmount,
          cart_items: [],
          subtotal: 0,
          tax_amount: 0,
          barbershop_id: '',
          stripe_session_url: '',
          expires_at: ''
        })
        return
      }

      // Get full session details from database
      const sessionResponse = await fetch(`/api/pos/qr-payment/session/${sessionId}`)
      if (!sessionResponse.ok) {
        throw new Error('Failed to load payment details')
      }

      const sessionData = await sessionResponse.json()
      setPaymentSession(sessionData)

    } catch (error) {
      console.error('Failed to load payment session:', error)
      setError(error instanceof Error ? error.message : 'Failed to load payment session')
    } finally {
      setLoading(false)
    }
  }

  const handlePayNow = async () => {
    if (!paymentSession?.stripe_session_url) {
      toast({
        title: "Error",
        description: "Payment link not available",
        variant: "destructive"
      })
      return
    }

    setRedirecting(true)
    
    // Add a small delay to show the redirecting state
    setTimeout(() => {
      window.location.href = paymentSession.stripe_session_url
    }, 500)
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Invalid time'
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    try {
      const now = new Date()
      const expires = new Date(expiresAt)
      const remaining = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000))
      
      if (remaining <= 0) return 'Expired'
      
      const minutes = Math.floor(remaining / 60)
      const seconds = remaining % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    } catch {
      return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="h-16 w-16 mx-auto text-red-500" />
            <div>
              <h2 className="text-xl font-semibold text-red-700 mb-2">Payment Not Available</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!paymentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Payment session not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show status page for completed/expired payments
  if (paymentSession.status !== 'pending') {
    const isCompleted = paymentSession.status === 'completed'
    const isExpired = paymentSession.status === 'expired'
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                <div>
                  <h2 className="text-xl font-semibold text-green-700 mb-2">Payment Successful!</h2>
                  <p className="text-gray-600">
                    Your payment of ${paymentSession.total_amount.toFixed(2)} has been processed successfully.
                  </p>
                </div>
                <Badge variant="default" className="text-sm">
                  Payment Completed
                </Badge>
              </>
            ) : isExpired ? (
              <>
                <XCircle className="h-16 w-16 mx-auto text-red-500" />
                <div>
                  <h2 className="text-xl font-semibold text-red-700 mb-2">Payment Expired</h2>
                  <p className="text-gray-600">
                    This payment link has expired. Please request a new QR code from the store.
                  </p>
                </div>
                <Badge variant="destructive" className="text-sm">
                  Expired
                </Badge>
              </>
            ) : (
              <>
                <Clock className="h-16 w-16 mx-auto text-gray-500" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">Payment Cancelled</h2>
                  <p className="text-gray-600">
                    This payment was cancelled. Please request a new QR code if you want to complete the purchase.
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  Cancelled
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">
                  {paymentSession.barbershop?.name || 'Barbershop'}
                </CardTitle>
                {paymentSession.barbershop?.address && (
                  <p className="text-sm text-gray-600">{paymentSession.barbershop.address}</p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Timer */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Time Remaining</span>
              </div>
              <Badge variant="outline" className="font-mono">
                {getTimeRemaining(paymentSession.expires_at)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentSession.cart_items.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                  {item.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                    <span className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${paymentSession.subtotal.toFixed(2)}</span>
              </div>
              {paymentSession.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>${paymentSession.tax_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>${paymentSession.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Card>
          <CardContent className="p-4">
            <Button
              onClick={handlePayNow}
              disabled={redirecting}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {redirecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Redirecting...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay ${paymentSession.total_amount.toFixed(2)}
                </>
              )}
            </Button>
            
            <div className="mt-3 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Smartphone className="h-3 w-3" />
                <span>Secure payment powered by Stripe</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-blue-700">
              🔒 Your payment is secure and encrypted. 
              You'll be redirected to Stripe's secure checkout page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
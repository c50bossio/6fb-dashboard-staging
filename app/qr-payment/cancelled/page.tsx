'use client'

import { XCircle, ArrowLeft, RefreshCw, Store } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function QRPaymentCancelledPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      loadPaymentDetails()
    }
  }, [sessionId])

  const loadPaymentDetails = async () => {
    try {
      const response = await fetch(`/api/pos/qr-payment?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentDetails(data)
      }
    } catch (error) {
      console.error('Failed to load payment details:', error)
    } finally {
      setLoading(false)
    }
  }

  const tryAgain = () => {
    if (sessionId) {
      window.location.href = `/qr-payment/${sessionId}`
    }
  }

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.close()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          {/* Cancelled Icon */}
          <div className="relative">
            <XCircle className="h-20 w-20 mx-auto text-red-500" />
          </div>

          {/* Cancelled Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-700">Payment Cancelled</h1>
            <p className="text-gray-600">
              You cancelled the payment process. No charges were made to your account.
            </p>
            {paymentDetails && (
              <p className="text-lg font-semibold text-gray-800">
                Amount: ${paymentDetails.totalAmount?.toFixed(2)}
              </p>
            )}
          </div>

          {/* Additional Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-orange-700 mb-2">
              <Store className="h-4 w-4" />
              <span className="text-sm font-medium">What happens next?</span>
            </div>
            <p className="text-xs text-orange-600">
              Your items are still reserved. You can try the payment again or 
              request a new QR code from the store if this one expires.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {sessionId && (
              <Button 
                onClick={tryAgain}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Payment Again
              </Button>
            )}
            
            <Button 
              onClick={goBack}
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>

          {/* Session ID for reference */}
          {sessionId && (
            <div className="text-xs text-gray-500">
              <p>Transaction ID: {sessionId.slice(-8).toUpperCase()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
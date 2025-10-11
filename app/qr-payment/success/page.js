'use client'

export const dynamic = 'force-dynamic'

import { CheckCircle2, Receipt, Store, ArrowLeft } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'

export default function QRPaymentSuccessPage() {
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
          {/* Success Icon */}
          <div className="relative">
            <CheckCircle2 className="h-20 w-20 mx-auto text-green-500" />
            <div className="absolute -top-2 -right-2 bg-green-100 rounded-full p-2">
              <Receipt className="h-4 w-4 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-green-700">Payment Successful!</h1>
            <p className="text-gray-600">
              Your payment has been processed successfully.
            </p>
            {paymentDetails && (
              <p className="text-lg font-semibold text-gray-800">
                Amount: ${paymentDetails.totalAmount?.toFixed(2)}
              </p>
            )}
          </div>

          {/* Additional Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
              <Store className="h-4 w-4" />
              <span className="text-sm font-medium">Receipt Information</span>
            </div>
            <p className="text-xs text-green-600">
              Your receipt and confirmation details have been sent to the store. 
              You can now collect your items.
            </p>
          </div>

          {/* Session ID for reference */}
          {sessionId && (
            <div className="text-xs text-gray-500">
              <p>Transaction ID: {sessionId.slice(-8).toUpperCase()}</p>
            </div>
          )}

          {/* Back Button */}
          <Button 
            onClick={goBack}
            variant="outline" 
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
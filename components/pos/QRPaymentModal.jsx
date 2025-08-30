'use client'

import { QrCode, CheckCircle2, XCircle, Clock, RefreshCw, Copy, Smartphone, CreditCard, Timer } from 'lucide-react'
import QRCode from 'qrcode'
import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export function QRPaymentModal({ 
  isOpen, 
  onClose, 
  cartItems, 
  barberbarbershopId, 
  barberId, 
  customerId,
  totalAmount,
  onPaymentSuccess 
}) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('generating') // generating, pending, completed, expired, error
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutes in seconds
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [isPolling, setIsPolling] = useState(false)
  const [expiresAt, setExpiresAt] = useState(null)
  const pollIntervalRef = useRef(null)
  const timeIntervalRef = useRef(null)
  const { toast } = useToast()

  // Generate QR code when modal opens
  useEffect(() => {
    if (isOpen && cartItems?.length > 0 && barberbarbershopId) {
      generateQRPayment()
    }
    
    return () => {
      clearPolling()
      clearTimer()
    }
  }, [isOpen, cartItems, barberbarbershopId])

  // Start polling when we have a session ID
  useEffect(() => {
    if (sessionId && paymentStatus === 'pending') {
      startStatusPolling()
    } else {
      clearPolling()
    }
    
    return () => clearPolling()
  }, [sessionId, paymentStatus])

  // Start countdown timer
  useEffect(() => {
    if (expiresAt && paymentStatus === 'pending') {
      startTimer()
    } else {
      clearTimer()
    }
    
    return () => clearTimer()
  }, [expiresAt, paymentStatus])

  const generateQRPayment = async () => {
    setIsGenerating(true)
    setError('')
    setPaymentStatus('generating')

    try {
      const response = await fetch('/api/pos/qr-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems,
          barberbarbershopId,
          barberId,
          customerId,
          expiresInMinutes: 30
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create QR payment')
      }

      // Generate QR code from the checkout URL
      const qrDataUrl = await QRCode.toDataURL(data.checkoutUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })

      setQrCodeDataUrl(qrDataUrl)
      setSessionId(data.sessionId)
      setCheckoutUrl(data.checkoutUrl)
      setExpiresAt(new Date(data.expiresAt))
      setPaymentStatus('pending')

      toast({
        title: "QR Code Generated",
        description: "Customer can scan the QR code to complete payment",
        variant: "default"
      })

    } catch (error) {
      console.error('QR generation error:', error)
      setError(error.message)
      setPaymentStatus('error')
      toast({
        title: "QR Generation Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const startStatusPolling = () => {
    setIsPolling(true)
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/pos/qr-payment?sessionId=${sessionId}`)
        const data = await response.json()

        if (response.ok) {
          setPaymentStatus(data.status)
          
          if (data.status === 'completed') {
            clearPolling()
            clearTimer()
            onPaymentSuccess?.()
            toast({
              title: "Payment Successful!",
              description: `Payment of $${totalAmount.toFixed(2)} completed`,
              variant: "default"
            })
          } else if (data.status === 'expired') {
            clearPolling()
            clearTimer()
            toast({
              title: "Payment Expired",
              description: "The QR code has expired. Generate a new one to continue.",
              variant: "destructive"
            })
          }
        }
      } catch (error) {
        console.error('Status polling error:', error)
      }
    }, 3000) // Poll every 3 seconds
  }

  const clearPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setIsPolling(false)
  }

  const startTimer = () => {
    timeIntervalRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        const now = new Date()
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
        
        if (remaining <= 0) {
          setPaymentStatus('expired')
          clearTimer()
          clearPolling()
        }
        
        return remaining
      })
    }, 1000)
  }

  const clearTimer = () => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current)
      timeIntervalRef.current = null
    }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Payment link copied to clipboard",
        variant: "default"
      })
    })
  }

  const handleRetry = () => {
    generateQRPayment()
  }

  const handleClose = () => {
    clearPolling()
    clearTimer()
    onClose()
  }

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'generating':
        return <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      case 'pending':
        return <QrCode className="h-6 w-6 text-blue-500" />
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />
      case 'expired':
        return <XCircle className="h-6 w-6 text-red-500" />
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />
      default:
        return <Clock className="h-6 w-6 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'generating':
        return 'Generating QR Code...'
      case 'pending':
        return 'Waiting for Payment'
      case 'completed':
        return 'Payment Successful!'
      case 'expired':
        return 'QR Code Expired'
      case 'error':
        return 'Error Occurred'
      default:
        return 'Unknown Status'
    }
  }

  const getStatusVariant = () => {
    switch (paymentStatus) {
      case 'completed':
        return 'default'
      case 'expired':
      case 'error':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            QR Code Payment - ${totalAmount?.toFixed(2)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge variant={getStatusVariant()} className="text-sm px-3 py-1">
              {getStatusText()}
            </Badge>
          </div>

          {/* QR Code Display */}
          {paymentStatus === 'pending' && qrCodeDataUrl && (
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code for Payment"
                  className="mx-auto rounded-lg shadow-lg"
                  style={{ width: 300, height: 300 }}
                />
                
                {/* Timer */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  <span>Expires in: {formatTime(timeLeft)}</span>
                </div>

                {/* Instructions */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Customer scans QR code with phone camera</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Completes payment in mobile browser</span>
                  </div>
                </div>

                {/* Payment Link */}
                {checkoutUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Or share payment link:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={checkoutUrl}
                        readOnly
                        className="flex-1 px-3 py-2 text-xs border rounded-md bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(checkoutUrl)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {paymentStatus === 'generating' && (
            <Card>
              <CardContent className="p-8 text-center">
                <RefreshCw className="h-12 w-12 animate-spin mx-auto text-blue-500 mb-4" />
                <p className="text-muted-foreground">Generating secure payment QR code...</p>
              </CardContent>
            </Card>
          )}

          {/* Success State */}
          {paymentStatus === 'completed' && (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                <div>
                  <h3 className="text-lg font-semibold text-green-700">Payment Completed!</h3>
                  <p className="text-muted-foreground">
                    ${totalAmount?.toFixed(2)} has been successfully processed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {(paymentStatus === 'error' || paymentStatus === 'expired') && (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <XCircle className="h-16 w-16 mx-auto text-red-500" />
                <div>
                  <h3 className="text-lg font-semibold text-red-700">
                    {paymentStatus === 'expired' ? 'QR Code Expired' : 'Payment Failed'}
                  </h3>
                  <p className="text-muted-foreground">
                    {paymentStatus === 'expired' 
                      ? 'The QR code has expired. Generate a new one to continue.'
                      : error || 'An error occurred while processing the payment'
                    }
                  </p>
                </div>
                
                <Button onClick={handleRetry} disabled={isGenerating}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Generate New QR Code
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Order Summary */}
          {cartItems?.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.name} x{item.quantity}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-semibold flex justify-between">
                    <span>Total</span>
                    <span>${totalAmount?.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              {paymentStatus === 'completed' ? 'Close' : 'Cancel'}
            </Button>
            
            {paymentStatus === 'pending' && (
              <Button 
                onClick={handleRetry}
                disabled={isGenerating}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate QR
              </Button>
            )}
          </div>

          {/* Polling Indicator */}
          {isPolling && paymentStatus === 'pending' && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Monitoring payment status...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
'use client'

import { Loader2, Zap, CheckCircle2, XCircle, AlertCircle, Wifi, WifiOff, CreditCard, Smartphone } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export function TerminalPaymentModal({
  isOpen,
  onClose,
  cartItems,
  barbershopId,
  barberId,
  customerId,
  subtotal,
  processingFee,
  totalAmount,
  onPaymentSuccess
}) {
  const [terminal, setTerminal] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected, connecting, connected, error
  const [readers, setReaders] = useState([])
  const [selectedReader, setSelectedReader] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState('idle') // idle, processing, succeeded, failed
  const [paymentIntent, setPaymentIntent] = useState(null)
  const [error, setError] = useState(null)
  const [customerPrompt, setCustomerPrompt] = useState('')
  const { toast } = useToast()
  const terminalRef = useRef(null)

  // Initialize Stripe Terminal when modal opens
  useEffect(() => {
    if (isOpen && !terminal) {
      initializeTerminal()
    }
  }, [isOpen])

  // Cleanup terminal when modal closes
  useEffect(() => {
    if (!isOpen && terminal) {
      disconnectTerminal()
    }
  }, [isOpen, terminal])

  const initializeTerminal = async () => {
    try {
      // Import Stripe Terminal SDK
      const { loadStripeTerminal } = await import('@stripe/terminal-js')
      
      // Get connection token from our API
      const tokenResponse = await fetch('/api/stripe/terminal/connection-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbershopId })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get connection token')
      }

      const { secret } = await tokenResponse.json()

      // Initialize Terminal
      const StripeTerminal = await loadStripeTerminal()
      const terminalInstance = StripeTerminal.create({
        onFetchConnectionToken: () => Promise.resolve(secret),
        onUnexpectedReaderDisconnect: handleReaderDisconnect,
        onConnectionStatusChange: (event) => {
          setConnectionStatus(event.status)
        }
      })

      setTerminal(terminalInstance)
      terminalRef.current = terminalInstance
      setConnectionStatus('connected')

      // Discover readers
      await discoverReaders(terminalInstance)

    } catch (err) {
      console.error('Terminal initialization error:', err)
      setError(err.message)
      setConnectionStatus('error')
      toast({
        title: "Terminal Error",
        description: "Failed to initialize terminal. Please check your connection.",
        variant: "destructive"
      })
    }
  }

  const discoverReaders = async (terminalInstance = terminal) => {
    if (!terminalInstance) return

    try {
      setConnectionStatus('connecting')
      
      // Discover local IP readers (most common for in-person payments)
      const { readers: discoveredReaders, error } = await terminalInstance.discoverReaders({
        simulated: process.env.NODE_ENV === 'development', // Use simulated readers in development
        location: undefined // Discover all available readers
      })

      if (error) {
        throw new Error(error.message)
      }

      setReaders(discoveredReaders || [])
      setConnectionStatus('connected')

      // Auto-select first available reader
      if (discoveredReaders && discoveredReaders.length > 0) {
        setSelectedReader(discoveredReaders[0])
      }

    } catch (err) {
      console.error('Reader discovery error:', err)
      setError(err.message)
      setConnectionStatus('error')
      toast({
        title: "Reader Discovery Failed",
        description: "No card readers found. Please ensure your reader is connected and powered on.",
        variant: "destructive"
      })
    }
  }

  const connectToReader = async (reader) => {
    if (!terminal) return

    try {
      setConnectionStatus('connecting')
      setCustomerPrompt('Connecting to reader...')

      const { reader: connectedReader, error } = await terminal.connectReader(reader)

      if (error) {
        throw new Error(error.message)
      }

      setSelectedReader(connectedReader)
      setConnectionStatus('connected')
      setCustomerPrompt('Reader connected successfully')

      toast({
        title: "Reader Connected",
        description: `Connected to ${connectedReader.label || 'Terminal Reader'}`,
        variant: "default"
      })

    } catch (err) {
      console.error('Reader connection error:', err)
      setError(err.message)
      setConnectionStatus('error')
      setCustomerPrompt('')
      toast({
        title: "Connection Failed",
        description: err.message,
        variant: "destructive"
      })
    }
  }

  const processPayment = async () => {
    if (!terminal || !selectedReader) {
      toast({
        title: "No Reader Selected",
        description: "Please select and connect to a card reader first.",
        variant: "destructive"
      })
      return
    }

    try {
      setPaymentStatus('processing')
      setCustomerPrompt('Creating payment...')

      // Create payment intent via our API
      const paymentResponse = await fetch('/api/stripe/terminal/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId,
          barberId,
          customerId,
          readerId: selectedReader.id,
          cartItems,
          subtotal,
          processingFee,
          amount: Math.round(totalAmount * 100) // Convert to cents
        })
      })

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json()
        throw new Error(error.error || 'Failed to create payment')
      }

      const { payment_intent, reader } = await paymentResponse.json()
      setPaymentIntent(payment_intent)

      // Collect payment method using Terminal
      setCustomerPrompt('Present card to reader...')
      const { paymentIntent: collectedPI, error: collectError } = await terminal.collectPaymentMethod(
        payment_intent.client_secret,
        {
          update_payment_intent: true
        }
      )

      if (collectError) {
        throw new Error(collectError.message)
      }

      // Process payment
      setCustomerPrompt('Processing payment...')
      const { paymentIntent: confirmedPI, error: processError } = await terminal.processPayment(collectedPI)

      if (processError) {
        throw new Error(processError.message)
      }

      // Update payment status in our database
      await fetch('/api/stripe/terminal/process-payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: confirmedPI.id,
          status: confirmedPI.status,
          readerId: selectedReader.id
        })
      })

      if (confirmedPI.status === 'succeeded') {
        setPaymentStatus('succeeded')
        setCustomerPrompt('Payment successful!')
        
        toast({
          title: "Payment Successful!",
          description: `$${totalAmount.toFixed(2)} processed successfully`,
          variant: "default"
        })

        // Auto-close after 2 seconds
        setTimeout(() => {
          onPaymentSuccess()
          onClose()
        }, 2000)
      } else {
        throw new Error(`Payment failed with status: ${confirmedPI.status}`)
      }

    } catch (err) {
      console.error('Payment processing error:', err)
      setError(err.message)
      setPaymentStatus('failed')
      setCustomerPrompt('Payment failed')
      
      toast({
        title: "Payment Failed",
        description: err.message,
        variant: "destructive"
      })
    }
  }

  const handleReaderDisconnect = () => {
    setSelectedReader(null)
    setConnectionStatus('disconnected')
    setCustomerPrompt('')
    toast({
      title: "Reader Disconnected",
      description: "Card reader was disconnected. Please reconnect to continue.",
      variant: "destructive"
    })
  }

  const disconnectTerminal = () => {
    if (terminal) {
      terminal.clearCachedCredentials()
      setTerminal(null)
      terminalRef.current = null
    }
    resetState()
  }

  const resetState = () => {
    setConnectionStatus('disconnected')
    setReaders([])
    setSelectedReader(null)
    setPaymentStatus('idle')
    setPaymentIntent(null)
    setError(null)
    setCustomerPrompt('')
  }

  const handleCancel = () => {
    if (paymentStatus === 'processing' && terminal && paymentIntent) {
      // Cancel the payment if in progress
      terminal.cancelCollectPaymentMethod()
    }
    
    disconnectTerminal()
    onClose()
  }

  // Use props if provided, otherwise calculate (backward compatibility)
  const calculatedSubtotal = subtotal !== undefined ? subtotal : cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const calculatedProcessingFee = processingFee !== undefined ? processingFee : 0
  const tax = cartItems.reduce((sum, item) => {
    const itemTax = (item.price * item.quantity * (item.tax_rate || 0)) / 100
    return sum + itemTax
  }, 0)

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-400" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  const getPaymentStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      case 'succeeded':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <CreditCard className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Terminal Payment
            <div className="ml-auto flex items-center gap-1">
              {getStatusIcon()}
              <span className="text-sm font-normal">
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Reader Selection */}
                {readers.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Available Readers:</label>
                    {readers.map((reader) => (
                      <div
                        key={reader.id}
                        className={`p-2 border rounded-md cursor-pointer transition-colors ${
                          selectedReader?.id === reader.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => connectToReader(reader)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {reader.label || `${reader.device_type} Reader`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {reader.serial_number}
                            </div>
                          </div>
                          <Badge variant={selectedReader?.id === reader.id ? 'default' : 'outline'}>
                            {selectedReader?.id === reader.id ? 'Connected' : 'Available'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Discovery Status */}
                {connectionStatus === 'connecting' && (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Discovering readers...</p>
                  </div>
                )}

                {/* No Readers Found */}
                {connectionStatus === 'connected' && readers.length === 0 && (
                  <div className="text-center py-4">
                    <WifiOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">No readers found</p>
                    <Button
                      onClick={() => discoverReaders()}
                      size="sm"
                      variant="outline"
                    >
                      Refresh
                    </Button>
                  </div>
                )}

                {/* Customer Prompt */}
                {customerPrompt && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center gap-2">
                      {getPaymentStatusIcon()}
                      <p className="text-sm font-medium text-blue-800">{customerPrompt}</p>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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

                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${calculatedSubtotal.toFixed(2)}</span>
                </div>

                {calculatedProcessingFee > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Processing Fee (2.9% + 30¢)</span>
                    <span>${calculatedProcessingFee.toFixed(2)}</span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={paymentStatus === 'processing'}
              className="flex-1"
            >
              Cancel
            </Button>
            
            <Button
              onClick={processPayment}
              disabled={
                !selectedReader || 
                connectionStatus !== 'connected' || 
                paymentStatus === 'processing' ||
                paymentStatus === 'succeeded'
              }
              className="flex-1"
            >
              {paymentStatus === 'processing' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : paymentStatus === 'succeeded' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Completed
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Process Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
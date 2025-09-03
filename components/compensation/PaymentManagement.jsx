/**
 * Payment Management Component
 * Handles Stripe payments, automated payouts, and payment history
 * Integrates with compensation system for booth rent and commission payments
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/Separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  CreditCard,
  DollarSign,
  Send,
  History,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Settings,
  Filter,
  Download,
  RefreshCw,
  Eye,
  User,
  Building2,
  Percent,
  Home
} from 'lucide-react'

export default function PaymentManagement({ 
  barbershopId, 
  barbers = [],
  paymentHistory = [],
  onProcessPayment 
}) {
  const [activeTab, setActiveTab] = useState('process')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    barber_id: '',
    amount: '',
    payment_type: 'commission',
    description: '',
    period_start: '',
    period_end: '',
    payment_method: 'stripe_transfer'
  })
  const [selectedHistory, setSelectedHistory] = useState(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [filters, setFilters] = useState({
    barber_id: '',
    payment_type: '',
    status: '',
    date_range: '30'
  })

  const handlePaymentFormChange = (field, value) => {
    setPaymentForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleProcessPayment = async () => {
    setLoading(true)
    setError(null)

    try {
      // Validation
      if (!paymentForm.barber_id) {
        throw new Error('Please select a barber')
      }
      
      if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
        throw new Error('Please enter a valid payment amount')
      }

      const selectedBarber = barbers.find(b => b.barber_id === paymentForm.barber_id)
      if (!selectedBarber) {
        throw new Error('Selected barber not found')
      }

      const paymentData = {
        barber_id: paymentForm.barber_id,
        amount: parseFloat(paymentForm.amount),
        payment_type: paymentForm.payment_type,
        description: paymentForm.description || `${paymentForm.payment_type} payment to ${selectedBarber.barber?.full_name}`,
        period_start: paymentForm.period_start,
        period_end: paymentForm.period_end,
        metadata: {
          barber_name: selectedBarber.barber?.full_name,
          payment_method: paymentForm.payment_method,
          compensation_model: selectedBarber.model_type
        }
      }

      const result = await onProcessPayment(paymentForm.barber_id, parseFloat(paymentForm.amount), paymentData)
      
      // Reset form on success
      setPaymentForm({
        barber_id: '',
        amount: '',
        payment_type: 'commission',
        description: '',
        period_start: '',
        period_end: '',
        payment_method: 'stripe_transfer'
      })
      
      setShowPaymentDialog(false)
      
    } catch (error) {
      console.error('Error processing payment:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCollectBoothRent = async (barberId) => {
    setLoading(true)
    setError(null)

    try {
      const barber = barbers.find(b => b.barber_id === barberId)
      if (!barber || barber.model_type !== 'booth_rent') {
        throw new Error('Selected barber is not on booth rental model')
      }

      // Calculate booth rent amount
      let amount = barber.booth_rent_amount
      if (barber.booth_rent_frequency === 'weekly') {
        amount = amount * 4.33 // Convert to monthly
      } else if (barber.booth_rent_frequency === 'daily') {
        amount = amount * 22 // Assume 22 working days
      }

      const response = await fetch('/api/stripe/collect-booth-rent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          customer: barber.barber?.stripe_customer_id,
          description: `Booth rent - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          metadata: {
            barber_id: barberId,
            period: barber.booth_rent_frequency,
            due_date: new Date().toISOString().split('T')[0]
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to collect booth rent')
      }

      const result = await response.json()
      console.log('Booth rent collected successfully:', result)
      
    } catch (error) {
      console.error('Error collecting booth rent:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      pending: { variant: 'secondary', icon: Clock, color: 'text-yellow-600' },
      failed: { variant: 'destructive', icon: AlertCircle, color: 'text-red-600' },
      processing: { variant: 'outline', icon: RefreshCw, color: 'text-blue-600' }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span className="capitalize">{status}</span>
      </Badge>
    )
  }

  const getPaymentTypeIcon = (type) => {
    switch (type) {
      case 'commission': return <Percent className="h-4 w-4" />
      case 'booth_rent': return <Home className="h-4 w-4" />
      case 'bonus': return <Zap className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '??'
  }

  // Filter payment history
  const filteredHistory = paymentHistory.filter(payment => {
    if (filters.barber_id && payment.barber_id !== filters.barber_id) return false
    if (filters.payment_type && payment.payment_type !== filters.payment_type) return false
    if (filters.status && payment.status !== filters.status) return false
    
    if (filters.date_range) {
      const daysAgo = parseInt(filters.date_range)
      const filterDate = new Date()
      filterDate.setDate(filterDate.getDate() - daysAgo)
      const paymentDate = new Date(payment.created_at)
      if (paymentDate < filterDate) return false
    }
    
    return true
  })

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Payment Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="process" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Process Payments
          </TabsTrigger>
          <TabsTrigger value="automated" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automated Setup
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        {/* Process Payments Tab */}
        <TabsContent value="process" className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manual Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Process Manual Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Send commission payments or bonuses to barbers via Stripe Transfer
                </p>
                
                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      New Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Process Payment</DialogTitle>
                      <DialogDescription>
                        Send money to a barber via Stripe Transfer
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="payment-barber">Select Barber</Label>
                        <Select value={paymentForm.barber_id} onValueChange={(value) => handlePaymentFormChange('barber_id', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose barber" />
                          </SelectTrigger>
                          <SelectContent>
                            {barbers.map((barber) => (
                              <SelectItem key={barber.barber_id} value={barber.barber_id}>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {barber.barber?.full_name || 'Unknown Barber'}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="payment-amount">Amount</Label>
                        <Input
                          id="payment-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={paymentForm.amount}
                          onChange={(e) => handlePaymentFormChange('amount', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="payment-type">Payment Type</Label>
                        <Select value={paymentForm.payment_type} onValueChange={(value) => handlePaymentFormChange('payment_type', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="commission">Commission</SelectItem>
                            <SelectItem value="bonus">Bonus</SelectItem>
                            <SelectItem value="adjustment">Adjustment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="payment-description">Description</Label>
                        <Textarea
                          id="payment-description"
                          placeholder="Optional payment description"
                          value={paymentForm.description}
                          onChange={(e) => handlePaymentFormChange('description', e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={handleProcessPayment} 
                          disabled={loading}
                          className="flex-1"
                        >
                          {loading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send Payment
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Booth Rent Collection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Booth Rent Collection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Collect booth rent payments from barbers via Stripe charges
                </p>
                
                <div className="space-y-2">
                  {barbers
                    .filter(barber => barber.model_type === 'booth_rent')
                    .map((barber) => (
                      <div key={barber.barber_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={barber.barber?.avatar_url} />
                            <AvatarFallback>
                              {getInitials(barber.barber?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{barber.barber?.full_name}</p>
                            <p className="text-sm text-gray-600">
                              {formatCurrency(barber.booth_rent_amount)}/{barber.booth_rent_frequency}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCollectBoothRent(barber.barber_id)}
                          disabled={loading}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Collect
                        </Button>
                      </div>
                    ))}
                  
                  {barbers.filter(b => b.model_type === 'booth_rent').length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No barbers on booth rental model
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automated Setup Tab */}
        <TabsContent value="automated" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automated Payment Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Automated payment features (scheduled commission payouts, automatic booth rent collection) 
                  are coming soon. For now, use manual payment processing.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="filter-barber">Barber</Label>
                  <Select value={filters.barber_id} onValueChange={(value) => setFilters(prev => ({...prev, barber_id: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All barbers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Barbers</SelectItem>
                      {barbers.map((barber) => (
                        <SelectItem key={barber.barber_id} value={barber.barber_id}>
                          {barber.barber?.full_name || 'Unknown Barber'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filter-type">Payment Type</Label>
                  <Select value={filters.payment_type} onValueChange={(value) => setFilters(prev => ({...prev, payment_type: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="booth_rent">Booth Rent</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filter-status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({...prev, status: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filter-date">Date Range</Label>
                  <Select value={filters.date_range} onValueChange={(value) => setFilters(prev => ({...prev, date_range: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Payment History ({filteredHistory.length})
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No payment history found</p>
                  <p className="text-sm">Process some payments to see history here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barber</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((payment) => {
                      const barber = barbers.find(b => b.barber_id === payment.barber_id)
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={barber?.barber?.avatar_url} />
                                <AvatarFallback>
                                  {getInitials(barber?.barber?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {barber?.barber?.full_name || 'Unknown Barber'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentTypeIcon(payment.payment_type)}
                              <span className="capitalize">{payment.payment_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell>
                            {formatDate(payment.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedHistory(payment)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Details Dialog */}
      {selectedHistory && (
        <Dialog open={!!selectedHistory} onOpenChange={() => setSelectedHistory(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Payment Details
              </DialogTitle>
              <DialogDescription>
                Transaction ID: {selectedHistory.id}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <p className="font-mono text-lg">{formatCurrency(selectedHistory.amount)}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  {getStatusBadge(selectedHistory.status)}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Payment Details</Label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 capitalize">{selectedHistory.payment_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Method:</span>
                    <span className="ml-2">{selectedHistory.payment_method}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2">{formatDate(selectedHistory.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Processed:</span>
                    <span className="ml-2">{formatDate(selectedHistory.processed_at)}</span>
                  </div>
                </div>
              </div>

              {selectedHistory.stripe_transfer_id && (
                <>
                  <Separator />
                  <div>
                    <Label>Stripe Transfer ID</Label>
                    <p className="font-mono text-sm text-gray-600">{selectedHistory.stripe_transfer_id}</p>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
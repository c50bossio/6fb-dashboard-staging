'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CreditCardIcon, 
  BuildingLibraryIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BanknotesIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

/**
 * RentRedi-Style Payment Portal
 * 
 * Clean, mobile-first interface for barbers to:
 * - View rent balance and due dates
 * - Make one-click payments
 * - View payment history
 * - Set up autopay
 * 
 * Inspired by RentRedi's simplicity and tenant-first design
 */
export default function PayRentPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [rentData, setRentData] = useState({
    current_due: null,
    upcoming: [],
    history: [],
    arrangement: null,
    balance_available: 0,
    payment_methods: []
  })
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (user && profile) {
      loadRentData()
    }
  }, [user, profile])

  const loadRentData = async () => {
    setLoading(true)
    try {
      // Get barber's rent arrangement
      const { data: arrangement } = await supabase
        .from('financial_arrangements')
        .select(`
          *,
          barbershops!inner(name, address)
        `)
        .eq('barber_id', user.id)
        .in('arrangement_type', ['booth_rent', 'hybrid'])
        .eq('is_active', true)
        .single()

      if (!arrangement) {
        setRentData(prev => ({ ...prev, arrangement: null }))
        setLoading(false)
        return
      }

      // Get current month's rent
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)

      const { data: currentDue } = await supabase
        .from('rent_ledger')
        .select('*')
        .eq('barber_id', user.id)
        .eq('status', 'pending')
        .gte('due_date', currentMonth.toISOString())
        .order('due_date', { ascending: true })
        .limit(1)
        .single()

      // Get upcoming rent (next 3 months)
      const { data: upcoming } = await supabase
        .from('rent_ledger')
        .select('*')
        .eq('barber_id', user.id)
        .eq('status', 'pending')
        .gt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(3)

      // Get payment history
      const { data: history } = await supabase
        .from('rent_ledger')
        .select('*')
        .eq('barber_id', user.id)
        .eq('status', 'paid')
        .order('paid_at', { descending: true })
        .limit(12)

      // Get commission balance
      const { data: balance } = await supabase
        .from('barber_commission_balances')
        .select('pending_amount')
        .eq('barber_id', user.id)
        .single()

      // Get saved payment methods from Stripe
      const paymentMethods = await fetchPaymentMethods()

      setRentData({
        current_due: currentDue,
        upcoming: upcoming || [],
        history: history || [],
        arrangement: arrangement,
        balance_available: balance?.pending_amount || 0,
        payment_methods: paymentMethods
      })
    } catch (error) {
      console.error('Error loading rent data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payments/methods')
      if (response.ok) {
        const data = await response.json()
        return data.methods || []
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    }
    return []
  }

  const handlePayRent = async () => {
    if (!rentData.current_due || !selectedMethod) return

    setProcessing(true)
    try {
      const response = await fetch('/api/payments/booth-rent/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ledger_id: rentData.current_due.id,
          barbershop_id: rentData.arrangement.barbershop_id,
          barber_id: user.id,
          force_method: selectedMethod
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
        await loadRentData() // Refresh data
      } else {
        alert(data.error || 'Payment failed. Please try again.')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment processing error. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  // Calculate payment method fee
  const calculateFee = (amount, method) => {
    switch (method) {
      case 'balance':
        return 0
      case 'ach':
        return 1.00
      case 'card':
        return (amount * 0.029) + 0.30
      default:
        return 0
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="animate-pulse">
            <div className="h-32 bg-white rounded-xl mb-4"></div>
            <div className="h-48 bg-white rounded-xl mb-4"></div>
            <div className="h-64 bg-white rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!rentData.arrangement) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card className="p-6 text-center">
            <BuildingLibraryIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Rent Arrangement</h2>
            <p className="text-gray-600 mb-4">
              You don't have an active booth rent arrangement.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  const rentAmount = rentData.arrangement.arrangement_type === 'booth_rent' 
    ? rentData.arrangement.booth_rent_amount 
    : rentData.arrangement.hybrid_base_rent

  const isOverdue = rentData.current_due && new Date(rentData.current_due.due_date) < new Date()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Success Banner */}
      {showSuccess && (
        <div className="fixed top-0 left-0 right-0 bg-green-500 text-white p-4 text-center z-50 animate-slide-down">
          <CheckCircleIcon className="h-5 w-5 inline mr-2" />
          Payment successful! Your rent has been paid.
        </div>
      )}

      <div className="max-w-md mx-auto p-4 pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pay Rent</h1>
          <p className="text-gray-600 mt-1">
            {rentData.arrangement.barbershops.name}
          </p>
        </div>

        {/* Current Balance Card */}
        <Card className={`mb-4 ${isOverdue ? 'border-red-500 border-2' : ''}`}>
          <div className="p-6">
            {isOverdue && (
              <div className="flex items-center mb-3 text-red-600">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Payment Overdue</span>
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Amount Due</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(rentAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Due Date</p>
                <p className="text-lg font-medium text-gray-900">
                  {rentData.current_due 
                    ? new Date(rentData.current_due.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'N/A'
                  }
                </p>
              </div>
            </div>

            {/* Quick Pay Section */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Select Payment Method
              </p>

              <div className="space-y-2 mb-4">
                {/* Commission Balance Option */}
                {rentData.balance_available >= rentAmount && (
                  <button
                    onClick={() => setSelectedMethod('balance')}
                    className={`w-full p-3 rounded-lg border-2 transition-colors ${
                      selectedMethod === 'balance'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BanknotesIcon className="h-5 w-5 text-green-600 mr-3" />
                        <div className="text-left">
                          <p className="font-medium">Commission Balance</p>
                          <p className="text-xs text-gray-600">
                            Available: {formatCurrency(rentData.balance_available)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-600">
                        No Fee
                      </span>
                    </div>
                  </button>
                )}

                {/* Bank Account (ACH) */}
                <button
                  onClick={() => setSelectedMethod('ach')}
                  className={`w-full p-3 rounded-lg border-2 transition-colors ${
                    selectedMethod === 'ach'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BuildingLibraryIcon className="h-5 w-5 text-blue-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium">Bank Account</p>
                        <p className="text-xs text-gray-600">ACH Transfer</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600">
                      Fee: $1.00
                    </span>
                  </div>
                </button>

                {/* Credit/Debit Card */}
                <button
                  onClick={() => setSelectedMethod('card')}
                  className={`w-full p-3 rounded-lg border-2 transition-colors ${
                    selectedMethod === 'card'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCardIcon className="h-5 w-5 text-purple-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium">Credit/Debit Card</p>
                        <p className="text-xs text-gray-600">Instant</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600">
                      Fee: {formatCurrency(calculateFee(rentAmount, 'card'))}
                    </span>
                  </div>
                </button>
              </div>

              {/* Total with Fee */}
              {selectedMethod && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Rent Amount</span>
                    <span>{formatCurrency(rentAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Processing Fee</span>
                    <span>{formatCurrency(calculateFee(rentAmount, selectedMethod))}</span>
                  </div>
                  <div className="flex justify-between font-medium text-base border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(rentAmount + calculateFee(rentAmount, selectedMethod))}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handlePayRent}
                disabled={!selectedMethod || processing}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  `Pay ${formatCurrency(rentAmount + calculateFee(rentAmount, selectedMethod))}`
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Upcoming Payments */}
        {rentData.upcoming.length > 0 && (
          <Card className="mb-4">
            <div className="p-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                Upcoming Payments
              </h3>
              <div className="space-y-2">
                {rentData.upcoming.map((payment) => (
                  <div key={payment.id} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-gray-600">
                      {new Date(payment.due_date).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(payment.rent_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Payment History */}
        {rentData.history.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-gray-400" />
                Payment History
              </h3>
              <div className="space-y-2">
                {rentData.history.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm text-gray-900">
                        {new Date(payment.paid_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.payment_method === 'balance' && 'Commission Balance'}
                        {payment.payment_method === 'ach' && 'Bank Transfer'}
                        {payment.payment_method === 'card' && 'Card Payment'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.rent_amount)}
                      </p>
                      {payment.processing_fee > 0 && (
                        <p className="text-xs text-gray-500">
                          Fee: {formatCurrency(payment.processing_fee)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-2">
          <Link href="/barber/autopay" className="block text-sm text-blue-600 hover:text-blue-700">
            Set Up Autopay
          </Link>
          <Link href="/dashboard" className="block text-sm text-gray-600 hover:text-gray-700">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
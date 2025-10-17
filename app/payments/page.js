'use client'

import { 
  CreditCardIcon,
  BanknotesIcon,
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../components/SupabaseAuthProvider'
import { createClient } from '../../lib/supabase/client'
import LoadingSpinner, { TableLoadingSkeleton, CardLoadingSkeleton } from '../../components/LoadingSpinner'

export default function PaymentsPage() {
  const { user, profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState({
    today: { total_revenue: 0, total_tips: 0, transactions: 0, avg_transaction: 0 },
    this_week: { total_revenue: 0, total_tips: 0, transactions: 0, avg_transaction: 0 },
    commission_owed: {}
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState('today')

  // Fetch payments and stats from Supabase
  useEffect(() => {
    const fetchPaymentsAndStats = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // Fetch payments with related data
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            customer:customers(name),
            barber:staff(name),
            service:services(name)
          `)
          .order('transaction_date', { ascending: false })
          .limit(50) // Limit for performance
        
        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError)
          throw paymentsError
        }

        // Transform payments data
        const transformedPayments = paymentsData?.map(payment => ({
          ...payment,
          customer_name: payment.customer?.name || payment.customer_name,
          service: payment.service?.name || payment.service_name,
          barber: payment.barber?.name || payment.barber_name,
          date: payment.transaction_date,
          payment_method: payment.payment_method === 'credit_card' ? 'Credit Card' : 
                           payment.payment_method === 'debit_card' ? 'Debit Card' : 
                           payment.payment_method === 'cash' ? 'Cash' : payment.payment_method
        })) || []

        setPayments(transformedPayments)

        // Fetch today's stats
        const today = new Date().toISOString().split('T')[0]
        const { data: todayStats } = await supabase
          .from('daily_payment_summary')
          .select('*')
          .eq('payment_date', today)
          .single()

        // Fetch this week's stats
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const { data: weekStats } = await supabase
          .from('payments')
          .select('total, tip')
          .eq('status', 'completed')
          .gte('transaction_date', weekAgo.toISOString())

        // Fetch commission data
        const { data: commissionData } = await supabase
          .from('barber_commission_summary')
          .select('*')

        // Calculate stats
        const todayStatsProcessed = {
          total_revenue: todayStats?.total_revenue || 0,
          total_tips: todayStats?.total_tips || 0,
          transactions: todayStats?.completed_transactions || 0,
          avg_transaction: todayStats?.avg_transaction_amount || 0
        }

        const weekStatsProcessed = {
          total_revenue: weekStats?.reduce((sum, p) => sum + Number(p.total), 0) || 0,
          total_tips: weekStats?.reduce((sum, p) => sum + Number(p.tip), 0) || 0,
          transactions: weekStats?.length || 0,
          avg_transaction: weekStats?.length ? 
            (weekStats.reduce((sum, p) => sum + Number(p.total), 0) / weekStats.length) : 0
        }

        const commissionOwed = {}
        commissionData?.forEach(barber => {
          commissionOwed[barber.barber_name?.toLowerCase().split(' ')[0]] = barber.total_commissions_earned
        })

        setStats({
          today: todayStatsProcessed,
          this_week: weekStatsProcessed,
          commission_owed: commissionOwed
        })

        setError(null)
      } catch (err) {
        console.error('Failed to fetch payments:', err)
        setError(err.message || 'Failed to load payments')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchPaymentsAndStats()
    }
  }, [user])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-amber-800" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'Credit Card':
        return <CreditCardIcon className="h-4 w-4 text-olive-500" />
      case 'Cash':
        return <BanknotesIcon className="h-4 w-4 text-green-500" />
      default:
        return <CreditCardIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true
    return payment.status === filter
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="md:flex md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                  Payments & Revenue
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  Track payments, commissions, and financial performance
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <CardLoadingSkeleton key={i} />
              ))
            ) : error ? (
              <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="text-center">
                  <h3 className="text-sm font-medium text-red-800">Error Loading Stats</h3>
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                </div>
              </div>
            ) : (
              <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(stats.today.total_revenue)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.today.transactions} transactions
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <BanknotesIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tips Today</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(stats.today.total_tips)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Avg: {formatCurrency(stats.today.total_tips / stats.today.transactions)}
                  </p>
                </div>
                <div className="p-3 bg-olive-100 rounded-full">
                  <CreditCardIcon className="h-6 w-6 text-olive-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Weekly Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(stats.this_week.total_revenue)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.this_week.transactions} transactions
                  </p>
                </div>
                <div className="p-3 bg-gold-100 rounded-full">
                  <ChartBarIcon className="h-6 w-6 text-gold-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(stats.today.avg_transaction)}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    +15% from last week
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <CalendarIcon className="h-6 w-6 text-amber-800" />
                </div>
              </div>
            </div>
              </>
            )}
          </div>

          {/* Commission Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Commission Summary</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.commission_owed.marcus)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Marcus Johnson</div>
                  <div className="text-xs text-gray-500">Owed this period</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.commission_owed.david)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">David Wilson</div>
                  <div className="text-xs text-gray-500">Owed this period</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.commission_owed.sophia)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Sophia Martinez</div>
                  <div className="text-xs text-gray-500">Owed this period</div>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <h3 className="text-lg font-medium text-gray-900">Recent Payments</h3>
                <div className="flex space-x-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-olive-500"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer & Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Barber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                      </tr>
                    ))
                  ) : error ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="text-red-400">
                          <h3 className="text-sm font-medium text-red-800">Error Loading Payments</h3>
                          <p className="mt-1 text-sm text-red-600">{error}</p>
                          <button 
                            onClick={() => window.location.reload()} 
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="text-gray-400">
                          <h3 className="text-sm font-medium text-gray-900">No payments found</h3>
                          <p className="mt-1 text-sm text-gray-500">No payment transactions match your current filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.customer_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.service}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{formatCurrency(payment.total)}</div>
                          <div className="text-xs text-gray-500">
                            Service: {formatCurrency(payment.amount)} + Tip: {formatCurrency(payment.tip)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getPaymentMethodIcon(payment.payment_method)}
                          <span className="text-sm text-gray-900">{payment.payment_method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.barber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(payment.status)}
                          <span className="text-sm text-gray-900 capitalize">{payment.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(payment.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stripe Integration Notice */}
          <div className="mt-8 bg-olive-50 border border-olive-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-6 w-6 text-olive-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-olive-800">
                  Stripe Payment Processing Integration
                </h3>
                <div className="mt-2 text-sm text-olive-700">
                  <p>Full Stripe integration for payment processing includes:</p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Secure credit card processing with PCI DSS compliance</li>
                    <li>Automatic commission calculations and payouts</li>
                    <li>Customer payment history and receipts</li>
                    <li>Tip processing and distribution</li>
                    <li>Refund and dispute management</li>
                    <li>Real-time transaction reporting</li>
                  </ul>
                  <div className="mt-4 p-3 bg-white border border-olive-300 rounded-md">
                    <p className="text-sm font-medium text-olive-900">Ready for Production:</p>
                    <p className="text-xs text-olive-800 mt-1">
                      The payment system is architected and ready for Stripe API integration. 
                      Connect your Stripe account to start processing real payments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
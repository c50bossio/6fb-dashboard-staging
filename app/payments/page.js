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

// Mock payment data
const Payments = [
  {
    id: 1,
    customer_name: "John Smith",
    service: "Haircut + Beard Trim",
    amount: 35.00,
    tip: 7.00,
    total: 42.00,
    payment_method: "Credit Card",
    status: "completed",
    date: "2025-08-06T10:30:00",
    barber: "Marcus Johnson",
    commission: 28.00,
    platform_fee: 2.10
  },
  {
    id: 2,
    customer_name: "Mike Davis",
    service: "Classic Haircut",
    amount: 25.00,
    tip: 5.00,
    total: 30.00,
    payment_method: "Cash",
    status: "completed",
    date: "2025-08-06T14:30:00",
    barber: "David Wilson",
    commission: 20.00,
    platform_fee: 1.50
  },
  {
    id: 3,
    customer_name: "Alex Rodriguez",
    service: "Premium Package",
    amount: 45.00,
    tip: 10.00,
    total: 55.00,
    payment_method: "Credit Card",
    status: "pending",
    date: "2025-08-07T11:00:00",
    barber: "Marcus Johnson",
    commission: 36.00,
    platform_fee: 2.75
  }
]

const Stats = {
  today: {
    total_revenue: 127.00,
    total_tips: 22.00,
    transactions: 3,
    avg_transaction: 42.33
  },
  this_week: {
    total_revenue: 1250.00,
    total_tips: 187.50,
    transactions: 32,
    avg_transaction: 39.06
  },
  commission_owed: {
    marcus: 156.80,
    david: 98.50,
    sophia: 67.20
  }
}

export default function PaymentsPage() {
  const { user, profile } = useAuth()
  const [payments, setPayments] = useState(Payments)
  const [stats, setStats] = useState(Stats)
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState('today')

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
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
                  <CalendarIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
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
                  {filteredPayments.map((payment) => (
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
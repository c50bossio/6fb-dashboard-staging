'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { useAdminAuth } from '../../../hooks/useAdminAuth'

import RevenueMetrics from '../../../components/admin/RevenueMetrics'
import SubscriptionTable from '../../../components/admin/SubscriptionTable'
import GrowthChart from '../../../components/admin/GrowthChart'
import PaymentIssues from '../../../components/admin/PaymentIssues'
import AdminHeader from '../../../components/admin/AdminHeader'

export default function AdminSubscriptionsPage() {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading, error: adminError } = useAdminAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  const [metrics, setMetrics] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [paymentIssues, setPaymentIssues] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  
  const [filters, setFilters] = useState({
    search: '',
    tier: 'all',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    if (authLoading || adminLoading) return
    
    if (!user) {
      router.push('/login')
      return
    }

    if (!isAdmin) {
      setLoading(false)
      return
    }

    loadDashboardData().finally(() => setLoading(false))
  }, [user, authLoading, isAdmin, adminLoading, router])

  const loadDashboardData = async () => {
    try {
      setRefreshing(true)
      
      const [metricsRes, subscriptionsRes, paymentIssuesRes] = await Promise.all([
        fetch('/api/admin/subscriptions/metrics?period=30d'),
        fetch(`/api/admin/subscriptions/list?${buildQueryString()}`),
        fetch('/api/admin/subscriptions/list?status=past_due&limit=10')
      ])

      if (!metricsRes.ok || !subscriptionsRes.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const [metricsData, subscriptionsData, paymentIssuesData] = await Promise.all([
        metricsRes.json(),
        subscriptionsRes.json(),
        paymentIssuesRes.json()
      ])

      setMetrics(metricsData)
      setSubscriptions(subscriptionsData.subscriptions)
      setPagination(subscriptionsData.pagination)
      setPaymentIssues(paymentIssuesData.subscriptions || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setAdminError('Failed to load dashboard data')
    } finally {
      setRefreshing(false)
    }
  }

  const buildQueryString = () => {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.append(key, value)
      }
    })
    
    params.append('page', pagination.page.toString())
    params.append('limit', pagination.limit.toString())
    
    return params.toString()
  }

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters })
    setPagination({ ...pagination, page: 1 })
  }

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage })
  }

  const handleRefresh = () => {
    loadDashboardData()
  }

  const handleSubscriptionAction = async (action, subscriptionId, options = {}) => {
    try {
      const response = await fetch('/api/admin/subscriptions/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          userId: subscriptionId,
          ...options
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Action failed')
      }

      alert(`Successfully ${action.replace('_', ' ')} for user`)
      await loadDashboardData()
    } catch (error) {
      console.error('Subscription action failed:', error)
      alert(`Failed to ${action.replace('_', ' ')}: ${error.message}`)
    }
  }

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/api/admin/subscriptions/list?${buildQueryString()}&export=csv`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('CSV export failed:', error)
      alert('Failed to export CSV')
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData()
    }
  }, [filters, pagination.page])

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (adminError || (!isAdmin && !adminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-red-50 rounded-lg max-w-md">
          <div className="text-red-600 text-xl font-semibold mb-2">
            Access Denied
          </div>
          <p className="text-red-700 mb-4">{adminError || 'Access denied - SUPER_ADMIN role required'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <AdminHeader 
        title="Subscription Management"
        user={user}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Revenue Metrics */}
        <div className="mb-8">
          <RevenueMetrics 
            metrics={metrics}
            loading={refreshing}
          />
        </div>

        {/* Growth Chart */}
        {metrics?.growth && (
          <div className="mb-8">
            <GrowthChart 
              data={metrics.growth.dailyGrowth}
              period={metrics.growth.period}
            />
          </div>
        )}

        {/* Payment Issues Alert */}
        {paymentIssues.length > 0 && (
          <div className="mb-8">
            <PaymentIssues 
              issues={paymentIssues}
              onResolve={(userId) => handleSubscriptionAction('resume_subscription', userId)}
            />
          </div>
        )}

        {/* Subscription Table */}
        <div className="bg-white rounded-lg shadow">
          <SubscriptionTable
            subscriptions={subscriptions}
            loading={refreshing}
            filters={filters}
            onFilterChange={handleFilterChange}
            pagination={pagination}
            onPageChange={handlePageChange}
            onSubscriptionAction={handleSubscriptionAction}
            onExportCSV={handleExportCSV}
          />
        </div>
      </div>
    </div>
  )
}
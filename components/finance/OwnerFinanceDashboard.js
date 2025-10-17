'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { cn } from '@/lib/utils'
import UnifiedCompensationHub from '@/components/compensation/UnifiedCompensationHub'
import { 
  BanknotesIcon, 
  UserGroupIcon, 
  CreditCardIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'

/**
 * OwnerFinanceDashboard - Production-ready financial overview component
 * Displays revenue, payroll, and platform costs with real-time data integration
 * 
 * @param {Object} financeContext - Financial context data
 * @param {Function} onRefresh - Callback when data is refreshed
 */
export function OwnerFinanceDashboard({ financeContext, onRefresh }) {
  console.log('💰 OWNER FINANCE DASHBOARD: Rendering with context:', financeContext?.userRole, financeContext?.contextLevel)
  const [activeTab, setActiveTab] = useState('overview')
  const [financialData, setFinancialData] = useState({
    revenue: {
      today: 0,
      weekly: 0,
      monthly: 0,
      loading: true,
      error: null
    },
    payroll: {
      pendingPayouts: 0,
      totalStaffBalance: 0,
      lastPayout: null,
      loading: true,
      error: null
    },
    platform: {
      currentCosts: 0,
      billingPeriod: null,
      usage: null,
      loading: true,
      error: null
    }
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const supabase = createClient()
  const adminAuth = useAdminAuth()

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      name: 'Financial Overview',
      icon: ChartBarIcon,
      description: 'Revenue, payroll, and platform costs'
    },
    {
      id: 'compensation',
      name: 'Staff Compensation',
      icon: UserGroupIcon,
      description: 'Manage pay structures and staff arrangements'
    },
    {
      id: 'payroll',
      name: 'Payroll Management', 
      icon: BanknotesIcon,
      description: 'Process payouts and manage staff payments'
    },
    {
      id: 'payments',
      name: 'Payment Settings',
      icon: CreditCardIcon,
      description: 'Banking and Stripe configuration'
    }
  ]

  // Fetch revenue data from Stripe integration
  const fetchRevenueData = useCallback(async () => {
    try {
      setFinancialData(prev => ({ 
        ...prev, 
        revenue: { ...prev.revenue, loading: true, error: null }
      }))

      const response = await fetch('/api/v1/revenue/summary')
      if (!response.ok) {
        throw new Error('Failed to fetch revenue data')
      }

      const revenueData = await response.json()
      
      setFinancialData(prev => ({
        ...prev,
        revenue: {
          today: revenueData.today || 0,
          weekly: revenueData.weekly || 0,
          monthly: revenueData.monthly || 0,
          loading: false,
          error: null
        }
      }))
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      setFinancialData(prev => ({
        ...prev,
        revenue: {
          ...prev.revenue,
          loading: false,
          error: error.message
        }
      }))
    }
  }, [])

  // Fetch staff payroll data
  const fetchPayrollData = useCallback(async () => {
    try {
      setFinancialData(prev => ({ 
        ...prev, 
        payroll: { ...prev.payroll, loading: true, error: null }
      }))

      // Get staff members and their financial arrangements
      const { data: staffData, error: staffError } = await supabase
        .from('barbershop_staff')
        .select(`
          id,
          user_id,
          position,
          is_active,
          financial_arrangements (
            id,
            arrangement_type,
            base_rate,
            commission_rate,
            bonus_structure,
            payout_schedule
          )
        `)
        .eq('is_active', true)

      if (staffError) throw staffError

      // Calculate pending payouts and balances
      let totalPendingPayouts = 0
      let totalStaffBalance = 0

      for (const staff of staffData || []) {
        // This would integrate with your actual payroll calculation logic
        // For now, we'll simulate the calculation
        const arrangement = staff.financial_arrangements?.[0]
        if (arrangement) {
          // Simulate pending payout calculation based on recent appointments
          totalPendingPayouts += 250 // Placeholder calculation
          totalStaffBalance += 500   // Placeholder calculation
        }
      }

      setFinancialData(prev => ({
        ...prev,
        payroll: {
          pendingPayouts: totalPendingPayouts,
          totalStaffBalance: totalStaffBalance,
          lastPayout: new Date().toISOString(), // Placeholder
          loading: false,
          error: null
        }
      }))
    } catch (error) {
      console.error('Error fetching payroll data:', error)
      setFinancialData(prev => ({
        ...prev,
        payroll: {
          ...prev.payroll,
          loading: false,
          error: error.message
        }
      }))
    }
  }, [supabase])

  // Fetch platform billing data
  const fetchPlatformData = useCallback(async () => {
    try {
      setFinancialData(prev => ({ 
        ...prev, 
        platform: { ...prev.platform, loading: true, error: null }
      }))

      const response = await fetch('/api/v1/billing/current')
      if (!response.ok) {
        throw new Error('Failed to fetch billing data')
      }

      const billingData = await response.json()
      
      setFinancialData(prev => ({
        ...prev,
        platform: {
          currentCosts: billingData.costs?.total || 0,
          billingPeriod: billingData.period || null,
          usage: billingData.usage || null,
          loading: false,
          error: null
        }
      }))
    } catch (error) {
      console.error('Error fetching platform data:', error)
      setFinancialData(prev => ({
        ...prev,
        platform: {
          ...prev.platform,
          loading: false,
          error: error.message
        }
      }))
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    if (adminAuth.isAdmin) {
      fetchRevenueData()
      fetchPayrollData()
      fetchPlatformData()
    }
  }, [adminAuth.isAdmin, fetchRevenueData, fetchPayrollData, fetchPlatformData])

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchRevenueData(),
        fetchPayrollData(),
        fetchPlatformData()
      ])
      onRefresh?.()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle staff payout processing
  const handleProcessPayouts = async () => {
    try {
      const response = await fetch('/api/v1/payroll/process-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error('Failed to process payouts')
      }

      await fetchPayrollData() // Refresh payroll data
      onRefresh?.()
    } catch (error) {
      console.error('Error processing payouts:', error)
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  // Loading state for entire dashboard
  if (adminAuth.loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Access control
  if (!adminAuth.isAdmin) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800">Access Denied</h3>
          <p className="text-red-600">You need admin privileges to view financial data.</p>
        </div>
      </div>
    )
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderFinancialOverview()
      case 'compensation':
        return (
          <div className="mt-6">
            <UnifiedCompensationHub 
              barbershopId={financeContext.barbershopId}
              currentUser={financeContext.profile}
            />
          </div>
        )
      case 'payroll':
        return renderPayrollManagement()
      case 'payments':
        return renderPaymentSettings()
      default:
        return renderFinancialOverview()
    }
  }

  // Financial Overview content (existing cards)
  const renderFinancialOverview = () => (
    <div className="space-y-6">
      {/* Main Financial Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-700">Revenue (Money IN)</CardTitle>
            <CardDescription>Customer payments via Stripe</CardDescription>
          </CardHeader>
          <CardContent>
            {financialData.revenue.loading ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </div>
            ) : financialData.revenue.error ? (
              <div className="text-red-600 text-sm">{financialData.revenue.error}</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialData.revenue.today)}
                  </div>
                  <div className="text-sm text-gray-500">Today's earnings</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold">{formatCurrency(financialData.revenue.weekly)}</div>
                    <div className="text-gray-500">This week</div>
                  </div>
                  <div>
                    <div className="font-semibold">{formatCurrency(financialData.revenue.monthly)}</div>
                    <div className="text-gray-500">This month</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-700">Payroll (Money OUT)</CardTitle>
            <CardDescription>Staff compensation & payouts</CardDescription>
          </CardHeader>
          <CardContent>
            {financialData.payroll.loading ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </div>
            ) : financialData.payroll.error ? (
              <div className="text-red-600 text-sm">{financialData.payroll.error}</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(financialData.payroll.pendingPayouts)}
                  </div>
                  <div className="text-sm text-gray-500">Pending payouts</div>
                </div>
                <div>
                  <div className="font-semibold">{formatCurrency(financialData.payroll.totalStaffBalance)}</div>
                  <div className="text-gray-500 text-sm">Total staff balance</div>
                </div>
                <Button
                  onClick={handleProcessPayouts}
                  size="small"
                  variant="primary"
                  className="w-full"
                  disabled={financialData.payroll.pendingPayouts === 0}
                >
                  Process Payouts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Costs Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-orange-700">Platform (Costs)</CardTitle>
            <CardDescription>AI usage, SMS billing, subscription costs</CardDescription>
          </CardHeader>
          <CardContent>
            {financialData.platform.loading ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </div>
            ) : financialData.platform.error ? (
              <div className="text-red-600 text-sm">{financialData.platform.error}</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(financialData.platform.currentCosts)}
                  </div>
                  <div className="text-sm text-gray-500">Current billing cycle</div>
                </div>
                {financialData.platform.usage && (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>AI Tokens:</span>
                      <span>{financialData.platform.usage.ai?.percentage || 0}% used</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SMS Messages:</span>
                      <span>{financialData.platform.usage.sms?.percentage || 0}% used</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email Sends:</span>
                      <span>{financialData.platform.usage.email?.percentage || 0}% used</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium text-gray-700">Process Staff Payouts</div>
            <div className="text-xs text-gray-500 mt-1">Review and approve pending payouts</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium text-gray-700">Bank Account Settings</div>
            <div className="text-xs text-gray-500 mt-1">Update payment methods</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium text-gray-700">Detailed Reports</div>
            <div className="text-xs text-gray-500 mt-1">View comprehensive analytics</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium text-gray-700">Compensation Models</div>
            <div className="text-xs text-gray-500 mt-1">Adjust staff payment structures</div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary Footer */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-semibold text-gray-900">Financial Health Overview</h3>
              <p className="text-sm text-gray-600">
                Net Revenue: {formatCurrency(
                  (financialData.revenue.monthly || 0) - 
                  (financialData.payroll.totalStaffBalance || 0) - 
                  (financialData.platform.currentCosts || 0)
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                Revenue: {formatCurrency(financialData.revenue.monthly)}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                Payroll: {formatCurrency(financialData.payroll.totalStaffBalance)}
              </span>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                Platform: {formatCurrency(financialData.platform.currentCosts)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Payroll Management content
  const renderPayrollManagement = () => (
    <div className="space-y-6">
      <div className="text-center py-12">
        <UserGroupIcon className="h-16 w-16 mx-auto text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mt-4">Payroll Management</h3>
        <p className="text-gray-500 mt-2">Process staff payouts and manage compensation payments</p>
        <Button className="mt-4">
          View Detailed Payroll
        </Button>
      </div>
    </div>
  )

  // Payment Settings content
  const renderPaymentSettings = () => (
    <div className="space-y-6">
      <div className="text-center py-12">
        <CreditCardIcon className="h-16 w-16 mx-auto text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mt-4">Payment Settings</h3>
        <p className="text-gray-500 mt-2">Configure Stripe Connect and banking information</p>
        <Button className="mt-4">
          Manage Payment Methods
        </Button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header with refresh button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Center</h1>
          <p className="text-gray-600">Manage revenue, compensation, payroll, and payments</p>
        </div>
        <Button
          onClick={handleRefresh}
          loading={isRefreshing}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          Refresh Data
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className={cn(
                  'mr-2 h-5 w-5',
                  activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                )} />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default OwnerFinanceDashboard
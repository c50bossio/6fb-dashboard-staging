'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Trophy,
  ArrowUp,
  ArrowDown,
  Calendar,
  Filter,
  Download,
  Eye,
  ChevronRight
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import financialService from '@/lib/financial-service'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

const _supabase = createClient()

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface CommissionSummary {
  service_commissions: {
    total_revenue: number
    total_commission: number
    transaction_count: number
    barber_breakdown: Record<string, any>
  }
  product_commissions: {
    total_revenue: number
    total_commission: number
    transaction_count: number
    barber_breakdown: Record<string, any>
    category_breakdown: Record<string, any>
  }
  combined_totals: {
    total_revenue: number
    total_commission: number
    total_shop_earnings: number
    transaction_count: number
    barber_breakdown: Record<string, any>
  }
  tier_impact: {
    total_tier_bonuses: number
    tier_upgrades_count: number
  }
}

interface BarberCommissionData {
  barberId: string
  barberName: string
  serviceCommission: number
  productCommission: number
  totalCommission: number
  tierLevel: number
  tierName: string
  tierProgress: number
  nextTierThreshold: number
  serviceRevenue: number
  productRevenue: number
  combinedRevenue: number
}

interface UnifiedCommissionDashboardProps {
  barbershopId: string
  currentUser?: any
  showBarberFilter?: boolean
}

const UnifiedCommissionDashboard: React.FC<UnifiedCommissionDashboardProps> = ({
  barbershopId,
  currentUser,
  showBarberFilter = true
}) => {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedBarber, setSelectedBarber] = useState<string>('all')
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null)
  const [barberData, setBarberData] = useState<BarberCommissionData[]>([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadCommissionData()
  }, [barbershopId, dateRange, selectedBarber])

  const loadCommissionData = async () => {
    setLoading(true)
    try {
      // Load comprehensive commission summary
      const summaryResult = await financialService.getComprehensiveCommissionSummary(
        barbershopId, 
        dateRange
      )
      
      if (summaryResult.error) {
        throw new Error(summaryResult.error)
      }
      
      setCommissionSummary(summaryResult.data)

      // Load individual barber data with tier information
      await loadBarberCommissionData(summaryResult.data)
      
    } catch (error) {
      console.error('Error loading commission data:', error)
      toast.error('Failed to load commission data')
    }
    setLoading(false)
  }

  const loadBarberCommissionData = async (summaryData) => {
    try {
      // Get all barbers from the commission summary
      const allBarberIds = new Set([
        ...Object.keys(summaryData.service_commissions.barber_breakdown || {}),
        ...Object.keys(summaryData.product_commissions.barber_breakdown || {})
      ])

      const barberPromises = Array.from(allBarberIds).map(async (barberId) => {
        // Get barber's tier status
        const { data: tierStatus } = await financialService.getBarberTierStatus(barberId, barbershopId)
        
        // Get barber profile info
        const { data: profile } = await _supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name')
          .eq('id', barberId)
          .single()

        const serviceData = summaryData.service_commissions.barber_breakdown[barberId] || { revenue: 0, commission: 0 }
        const productData = summaryData.product_commissions.barber_breakdown[barberId] || { revenue: 0, commission: 0 }
        const combinedData = summaryData.combined_totals.barber_breakdown[barberId] || {
          total_revenue: 0, total_commission: 0, service_revenue: 0, service_commission: 0,
          product_revenue: 0, product_commission: 0
        }

        return {
          barberId: barberId,
          barberName: profile?.full_name || profile?.first_name + ' ' + profile?.last_name || `Barber ${barberId.slice(-4)}`,
          serviceCommission: serviceData.commission,
          productCommission: productData.commission,
          totalCommission: combinedData.total_commission,
          serviceRevenue: serviceData.revenue,
          productRevenue: productData.revenue,
          combinedRevenue: combinedData.total_revenue,
          
          // Tier information
          tierLevel: tierStatus?.current_tier?.tier_level || 1,
          tierName: tierStatus?.current_tier?.name || 'Starter',
          tierProgress: tierStatus?.progressToNextTier || 0,
          nextTierThreshold: tierStatus?.nextTierThreshold || 0,
          currentPeriodRevenue: tierStatus?.current_period_revenue || 0,
          projectedRevenue: tierStatus?.projected_period_revenue || 0,
          
          // Additional metrics
          totalTransactions: (serviceData.count || 0) + (productData.count || 0),
          averageTransactionValue: combinedData.total_revenue > 0 
            ? combinedData.total_revenue / ((serviceData.count || 0) + (productData.count || 0))
            : 0
        }
      })

      const barberDataResults = await Promise.all(barberPromises)
      setBarberData(barberDataResults.sort((a, b) => b.totalCommission - a.totalCommission))
    } catch (error) {
      console.error('Error loading barber commission data:', error)
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString()
          }
        }
      }
    }
  }

  const donutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  }

  // Generate chart data
  const generateRevenueComparisonChart = () => {
    if (!commissionSummary) return null

    const data = {
      labels: ['Service Revenue', 'Product Revenue'],
      datasets: [
        {
          label: 'Revenue',
          data: [
            commissionSummary.service_commissions.total_revenue,
            commissionSummary.product_commissions.total_revenue
          ],
          backgroundColor: ['#3B82F6', '#10B981'],
          borderColor: ['#2563EB', '#059669'],
          borderWidth: 2
        }
      ]
    }

    return <Doughnut data={data} options={donutOptions} />
  }

  const generateCommissionTrendChart = () => {
    if (!commissionSummary) return null

    // This would typically use historical data
    // For now, showing current period breakdown
    const data = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Service Commission',
          data: [
            commissionSummary.service_commissions.total_commission * 0.2,
            commissionSummary.service_commissions.total_commission * 0.25,
            commissionSummary.service_commissions.total_commission * 0.3,
            commissionSummary.service_commissions.total_commission * 0.25
          ],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Product Commission',
          data: [
            commissionSummary.product_commissions.total_commission * 0.15,
            commissionSummary.product_commissions.total_commission * 0.3,
            commissionSummary.product_commissions.total_commission * 0.35,
            commissionSummary.product_commissions.total_commission * 0.2
          ],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        }
      ]
    }

    return <Line data={data} options={chartOptions} />
  }

  const generateBarberPerformanceChart = () => {
    if (!commissionSummary || !commissionSummary.combined_totals.barber_breakdown) return null

    const barbers = Object.entries(commissionSummary.combined_totals.barber_breakdown)
      .sort((a, b) => b[1].total_commission - a[1].total_commission)
      .slice(0, 8) // Top 8 performers

    const data = {
      labels: barbers.map(([id, data]) => `Barber ${id.slice(-4)}`),
      datasets: [
        {
          label: 'Service Commission',
          data: barbers.map(([id, data]) => data.service_commission),
          backgroundColor: '#3B82F6',
        },
        {
          label: 'Product Commission',
          data: barbers.map(([id, data]) => data.product_commission),
          backgroundColor: '#10B981',
        }
      ]
    }

    return <Bar data={data} options={chartOptions} />
  }

  const generateProductCategoryChart = () => {
    if (!commissionSummary || !commissionSummary.product_commissions.category_breakdown) return null

    const categories = Object.entries(commissionSummary.product_commissions.category_breakdown)
    
    const data = {
      labels: categories.map(([category]) => 
        category.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      ),
      datasets: [
        {
          data: categories.map(([, data]) => data.commission),
          backgroundColor: [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#EC4899'
          ]
        }
      ]
    }

    return <Doughnut data={data} options={donutOptions} />
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading commission dashboard...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commission Dashboard</h1>
          <p className="text-gray-600">Unified service and product commission tracking</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="px-3 py-2 border rounded-md text-sm"
            />
          </div>
          
          {showBarberFilter && (
            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
              {React.createElement(SelectTrigger as any, { className: "w-[180px]" },
                React.createElement(SelectValue as any, { placeholder: "All Barbers" })
              )}
              {React.createElement(SelectContent as any, {},
                React.createElement(SelectItem as any, { value: "all", key: "all" }, "All Barbers"),
                ...barberData.map(barber => 
                  React.createElement(SelectItem as any, { 
                    key: barber.barberId, 
                    value: barber.barberId 
                  }, barber.barberName)
                )
              )}
            </Select>
          )}
          
          {React.createElement(Button as any, { variant: "outline", size: "sm" },
            React.createElement(Download, { className: "h-4 w-4 mr-2" }),
            "Export"
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {commissionSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${commissionSummary.combined_totals.total_revenue.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-2 text-sm">
                    <span className="text-blue-600">
                      Services: ${commissionSummary.service_commissions.total_revenue.toLocaleString()}
                    </span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-green-600">
                      Products: ${commissionSummary.product_commissions.total_revenue.toLocaleString()}
                    </span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${commissionSummary.combined_totals.total_commission.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-2 text-sm">
                    <span className="text-blue-600">
                      Services: ${commissionSummary.service_commissions.total_commission.toLocaleString()}
                    </span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-green-600">
                      Products: ${commissionSummary.product_commissions.total_commission.toLocaleString()}
                    </span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Shop Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${commissionSummary.combined_totals.total_shop_earnings.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {((commissionSummary.combined_totals.total_shop_earnings / commissionSummary.combined_totals.total_revenue) * 100).toFixed(1)}% of revenue
                  </p>
                </div>
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tier Bonuses</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${commissionSummary.tier_impact.total_tier_bonuses.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-2">
                    <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm text-gray-600">
                      {commissionSummary.tier_impact.tier_upgrades_count} tier upgrades
                    </span>
                  </div>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {React.createElement(TabsList as any, { className: "grid w-full grid-cols-5" },
          React.createElement(TabsTrigger as any, { value: "overview" }, "Overview"),
          React.createElement(TabsTrigger as any, { value: "barbers" }, "Barber Performance"),
          React.createElement(TabsTrigger as any, { value: "products" }, "Product Sales"),
          React.createElement(TabsTrigger as any, { value: "tiers" }, "Tier Progress"),
          React.createElement(TabsTrigger as any, { value: "individual" }, "Individual Details")
        )}

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Service vs Product Revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  {generateRevenueComparisonChart()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commission Trends</CardTitle>
                <CardDescription>Weekly commission performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  {generateCommissionTrendChart()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Summary</CardTitle>
              <CardDescription>Breakdown of all transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">Service Transactions</span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {commissionSummary?.service_commissions.transaction_count || 0}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    ${commissionSummary?.service_commissions.total_revenue.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Avg: ${commissionSummary?.service_commissions.transaction_count 
                      ? (commissionSummary.service_commissions.total_revenue / commissionSummary.service_commissions.transaction_count).toLocaleString()
                      : '0'}
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-900">Product Transactions</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {commissionSummary?.product_commissions.transaction_count || 0}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    ${commissionSummary?.product_commissions.total_revenue.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Avg: ${commissionSummary?.product_commissions.transaction_count 
                      ? (commissionSummary.product_commissions.total_revenue / commissionSummary.product_commissions.transaction_count).toLocaleString()
                      : '0'}
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-purple-900">Combined Total</span>
                    <Badge variant="outline" className="bg-purple-100 text-purple-800">
                      {(commissionSummary?.service_commissions.transaction_count || 0) + 
                       (commissionSummary?.product_commissions.transaction_count || 0)}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    ${commissionSummary?.combined_totals.total_revenue.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    Commission Rate: {commissionSummary?.combined_totals.total_revenue 
                      ? ((commissionSummary.combined_totals.total_commission / commissionSummary.combined_totals.total_revenue) * 100).toFixed(1) + '%'
                      : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Barber Performance Tab */}
        <TabsContent value="barbers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Commission by barber</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  {generateBarberPerformanceChart()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* This would show individual barber metrics */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Service Commission</span>
                    <span className="font-medium">
                      ${commissionSummary && Object.keys(commissionSummary.service_commissions.barber_breakdown).length > 0
                        ? (commissionSummary.service_commissions.total_commission / Object.keys(commissionSummary.service_commissions.barber_breakdown).length).toLocaleString()
                        : '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Product Commission</span>
                    <span className="font-medium">
                      ${commissionSummary && Object.keys(commissionSummary.product_commissions.barber_breakdown).length > 0
                        ? (commissionSummary.product_commissions.total_commission / Object.keys(commissionSummary.product_commissions.barber_breakdown).length).toLocaleString()
                        : '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Top Earner Bonus</span>
                    <Badge variant="secondary">
                      ${commissionSummary?.tier_impact.total_tier_bonuses.toLocaleString() || '0'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Product Sales Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Categories</CardTitle>
                <CardDescription>Commission by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: '300px' }}>
                  {generateProductCategoryChart()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
                <CardDescription>Category breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commissionSummary?.product_commissions.category_breakdown && 
                    Object.entries(commissionSummary.product_commissions.category_breakdown)
                      .sort((a, b) => b[1].commission - a[1].commission)
                      .map(([category, data]) => (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="font-medium capitalize">
                              {category.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${data.commission.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">{data.count} sales</div>
                          </div>
                        </div>
                      ))}
                  {(!commissionSummary?.product_commissions.category_breakdown || 
                    Object.keys(commissionSummary.product_commissions.category_breakdown).length === 0) && (
                    <p className="text-gray-500 text-center py-4">No product sales data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tier Progress Tab */}
        <TabsContent value="tiers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tier System Impact</CardTitle>
              <CardDescription>How product sales contribute to tier progression</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-900 mb-2">
                      ${commissionSummary?.tier_impact.total_tier_bonuses.toLocaleString() || '0'}
                    </div>
                    <p className="text-blue-700 font-medium">Total Tier Bonuses</p>
                    <p className="text-sm text-blue-600 mt-1">
                      From combined sales performance
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-900 mb-2">
                      {commissionSummary?.tier_impact.tier_upgrades_count || 0}
                    </div>
                    <p className="text-green-700 font-medium">Tier Upgrades</p>
                    <p className="text-sm text-green-600 mt-1">
                      Achievements this period
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-900 mb-2">
                      {commissionSummary?.combined_totals.total_revenue 
                        ? ((commissionSummary.product_commissions.total_revenue / commissionSummary.combined_totals.total_revenue) * 100).toFixed(1) + '%'
                        : '0%'}
                    </div>
                    <p className="text-purple-700 font-medium">Product Contribution</p>
                    <p className="text-sm text-purple-600 mt-1">
                      To total tier progress
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-4">Tier Integration Benefits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">Combined Progress</span>
                    </div>
                    <p className="text-sm text-green-800">
                      Service and product sales work together to advance tier levels, 
                      encouraging barbers to excel in all areas.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Trophy className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Balanced Incentives</span>
                    </div>
                    <p className="text-sm text-blue-800">
                      Product tier weights ensure service quality remains primary while 
                      still rewarding retail excellence.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Details Tab */}
        <TabsContent value="individual" className="space-y-6">
          {barberData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {(selectedBarber === 'all' ? barberData : barberData.filter(b => b.barberId === selectedBarber))
                .map((barber) => (
                  <Card key={barber.barberId} className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{barber.barberName}</CardTitle>
                          <CardDescription>
                            Tier {barber.tierLevel}: {barber.tierName}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: barber.tierLevel }, (_, i) => (
                            <TrendingUp key={i} className="h-4 w-4 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Revenue & Commission Summary */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="text-lg font-bold text-gray-900">
                            ${barber.combinedRevenue.toLocaleString()}
                          </p>
                          <div className="flex items-center text-xs text-gray-500">
                            <span className="text-blue-600">
                              Service: ${barber.serviceRevenue.toLocaleString()}
                            </span>
                            <span className="mx-1">•</span>
                            <span className="text-green-600">
                              Product: ${barber.productRevenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Total Commission</p>
                          <p className="text-lg font-bold text-green-600">
                            ${barber.totalCommission.toLocaleString()}
                          </p>
                          <div className="flex items-center text-xs text-gray-500">
                            <span className="text-blue-600">
                              Service: ${barber.serviceCommission.toLocaleString()}
                            </span>
                            <span className="mx-1">•</span>
                            <span className="text-green-600">
                              Product: ${barber.productCommission.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tier Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Tier Progress</span>
                          <span className="text-sm text-gray-500">{barber.tierProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={barber.tierProgress} className="h-2" />
                        {barber.nextTierThreshold > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            ${(barber.nextTierThreshold - barber.currentPeriodRevenue).toLocaleString()} to next tier
                          </p>
                        )}
                      </div>

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div>
                          <p className="text-xs text-gray-600">Transactions</p>
                          <p className="font-semibold">{barber.totalTransactions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Avg Transaction</p>
                          <p className="font-semibold">${barber.averageTransactionValue.toFixed(0)}</p>
                        </div>
                      </div>

                      {/* Projected Performance */}
                      {barber.projectedRevenue > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-600 mb-1">Projected Period Revenue</p>
                          <p className="text-sm font-medium text-blue-600">
                            ${barber.projectedRevenue.toLocaleString()}
                          </p>
                          <div className="flex items-center mt-1">
                            {barber.projectedRevenue > barber.currentPeriodRevenue ? (
                              <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                            )}
                            <span className="text-xs text-gray-500">
                              {((barber.projectedRevenue - barber.currentPeriodRevenue) / barber.currentPeriodRevenue * 100).toFixed(1)}% vs current
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
          
          {barberData.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Barber Data Available</h3>
                  <p className="text-gray-500">Commission data will appear here once barbers start processing payments.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default UnifiedCommissionDashboard
'use client'

import { 
  ChartBarIcon,
  TrophyIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import financialService from '@/lib/financial-service'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatPercentage = (value) => {
  return `${(value || 0).toFixed(1)}%`
}

export default function TierAnalyticsDashboard({ barbershopId }) {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('3months') // '1month', '3months', '6months', '1year'
  const [tierStructure, setTierStructure] = useState(null)
  const [tierHistory, setTierHistory] = useState([])
  const [staff, setStaff] = useState([])
  const [currentAssignments, setCurrentAssignments] = useState({})
  const [error, setError] = useState(null)

  // Load all tier analytics data
  const loadAnalyticsData = async () => {
    if (!barbershopId) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Load tier structure
      const { data: structure } = await financialService.getTierStructure(barbershopId)
      setTierStructure(structure)
      
      // Load real tier history data
      const { data: tierHistoryData, error: tierHistoryError } = await supabase
        .from('commission_tier_history')
        .select(`
          id,
          barber_id,
          barbershop_id,
          tier_id,
          period_start,
          period_end,
          achieved_at,
          period_revenue,
          period_bookings,
          final_tier_level,
          avg_commission_rate,
          period_product_revenue,
          period_product_sales,
          combined_period_revenue
        `)
        .eq('barbershop_id', barbershopId)
        .gte('achieved_at', getDateRangeStart(dateRange))
        .order('achieved_at', { ascending: false })

      if (tierHistoryError) throw tierHistoryError
      
      // Get barber names for the tier history
      const barberIds = [...new Set(tierHistoryData?.map(h => h.barber_id) || [])]
      const { data: barberProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name')
        .in('id', barberIds)
      
      const barberNameMap = new Map(barberProfiles?.map(p => [
        p.id, 
        p.full_name || `${p.first_name} ${p.last_name}`.trim() || `Barber ${p.id.slice(-4)}`
      ]) || [])
      
      // Enrich tier history with barber names
      const enrichedTierHistory = tierHistoryData?.map(history => ({
        ...history,
        barber_name: barberNameMap.get(history.barber_id) || `Barber ${history.barber_id.slice(-4)}`
      })) || []
      
      setTierHistory(enrichedTierHistory)
      
      // Load current staff with tier assignments
      const { data: staffWithTiers, error: staffError } = await supabase
        .from('barber_tier_assignments')
        .select(`
          barber_id,
          current_tier_id,
          current_period_revenue,
          current_period_bookings,
          current_period_product_revenue,
          combined_tier_progress_amount,
          profiles:barber_id(id, first_name, last_name, full_name),
          current_tier:commission_tiers(tier_level, name, commission_percentage)
        `)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
      
      if (staffError) throw staffError
      
      const enrichedStaff = staffWithTiers?.map(assignment => ({
        id: assignment.barber_id,
        name: assignment.profiles?.full_name || 
               `${assignment.profiles?.first_name} ${assignment.profiles?.last_name}`.trim() || 
               `Barber ${assignment.barber_id.slice(-4)}`,
        current_tier_level: assignment.current_tier?.tier_level || 1,
        current_tier_name: assignment.current_tier?.name || 'Starter',
        current_period_revenue: assignment.current_period_revenue || 0,
        current_period_bookings: assignment.current_period_bookings || 0,
        current_period_product_revenue: assignment.current_period_product_revenue || 0,
        combined_tier_progress: assignment.combined_tier_progress_amount || 0,
        commission_rate: assignment.current_tier?.commission_percentage || 50
      })) || []
      
      setStaff(enrichedStaff)
      
    } catch (err) {
      console.error('Error loading tier analytics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Helper function to get date range start based on selection
  const getDateRangeStart = (range) => {
    const now = new Date()
    switch (range) {
      case '1month':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString()
      case '3months':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString()
      case '6months':
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString()
      case '1year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString()
      default:
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString()
    }
  }
  
  useEffect(() => {
    loadAnalyticsData()
  }, [barbershopId, dateRange])
  
  // Calculate analytics from tier history
  const analytics = useMemo(() => {
    if (!tierHistory.length || !tierStructure) return null
    
    // Group by period
    const periodGroups = tierHistory.reduce((acc, record) => {
      const key = `${record.period_start}-${record.period_end}`
      if (!acc[key]) acc[key] = []
      acc[key].push(record)
      return acc
    }, {})
    
    // Calculate metrics
    const totalPeriods = Object.keys(periodGroups).length
    const totalAchievements = tierHistory.length
    const totalRevenue = tierHistory.reduce((sum, record) => sum + record.period_revenue, 0)
    const totalBookings = tierHistory.reduce((sum, record) => sum + record.period_bookings, 0)
    
    // Tier distribution
    const tierDistribution = tierStructure.tiers.map(tier => {
      const achievements = tierHistory.filter(record => record.final_tier_level === tier.tier_level)
      return {
        tier,
        count: achievements.length,
        percentage: totalAchievements > 0 ? (achievements.length / totalAchievements) * 100 : 0,
        avgRevenue: achievements.length > 0 
          ? achievements.reduce((sum, a) => sum + a.period_revenue, 0) / achievements.length 
          : 0
      }
    })
    
    // Performance trends
    const sortedHistory = [...tierHistory].sort((a, b) => 
      new Date(a.period_start) - new Date(b.period_start)
    )
    
    const recentPeriods = sortedHistory.slice(-6) // Last 6 periods
    const avgRevenueGrowth = recentPeriods.length >= 2 
      ? ((recentPeriods[recentPeriods.length - 1].period_revenue - recentPeriods[0].period_revenue) 
         / recentPeriods[0].period_revenue) * 100
      : 0
    
    // Top performers
    const barberPerformance = staff.map(barber => {
      const barberHistory = tierHistory.filter(record => record.barber_id === barber.id)
      const totalRevenue = barberHistory.reduce((sum, record) => sum + record.period_revenue, 0)
      const avgTierLevel = barberHistory.length > 0 
        ? barberHistory.reduce((sum, record) => sum + record.final_tier_level, 0) / barberHistory.length 
        : barber.current_tier_level || 1
      
      return {
        ...barber,
        historicalRevenue: totalRevenue,
        avgTierLevel,
        achievementCount: barberHistory.length,
        highestTier: Math.max(...barberHistory.map(h => h.final_tier_level), barber.current_tier_level || 1)
      }
    }).sort((a, b) => b.historicalRevenue - a.historicalRevenue)
    
    return {
      totalPeriods,
      totalAchievements,
      totalRevenue,
      totalBookings,
      avgRevenuePerPeriod: totalPeriods > 0 ? totalRevenue / totalPeriods : 0,
      avgBookingsPerPeriod: totalPeriods > 0 ? totalBookings / totalPeriods : 0,
      tierDistribution,
      avgRevenueGrowth,
      topPerformers: barberPerformance.slice(0, 5)
    }
  }, [tierHistory, tierStructure, staff])
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    )
  }
  
  if (error || !analytics) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {error ? 'Failed to Load Analytics' : 'No Analytics Data'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {error || 'No tier history available for analysis'}
          </p>
          {error && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={loadAnalyticsData}
            >
              Try Again
            </Button>
          )}
        </div>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tier Analytics Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Historical performance analysis and tier achievement trends
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
          
          <Button 
            variant="outline" 
            onClick={loadAnalyticsData}
          >
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(analytics.avgRevenuePerPeriod)} avg/period
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tier Achievements</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalAchievements}
              </p>
              <p className="text-xs text-gray-500">
                Across {analytics.totalPeriods} periods
              </p>
            </div>
            <TrophyIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalBookings.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {Math.round(analytics.avgBookingsPerPeriod)} avg/period
              </p>
            </div>
            <CalendarIcon className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue Growth</p>
              <p className={`text-2xl font-bold ${
                analytics.avgRevenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {analytics.avgRevenueGrowth >= 0 ? '+' : ''}{analytics.avgRevenueGrowth.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                Period over period
              </p>
            </div>
            {analytics.avgRevenueGrowth >= 0 ? (
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
            ) : (
              <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
            )}
          </div>
        </Card>
      </div>
      
      {/* Tier Distribution Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Achievement Distribution</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analytics.tierDistribution.map((tierData) => (
            <div 
              key={tierData.tier.id}
              className="p-4 rounded-lg border"
              style={{ borderColor: tierData.tier.color_code }}
            >
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: tierData.tier.color_code }}
                >
                  {tierData.count}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatPercentage(tierData.percentage)}
                </span>
              </div>
              
              <h4 className="font-semibold text-gray-900">{tierData.tier.name}</h4>
              <p className="text-sm text-gray-600 mb-2">
                {tierData.tier.commission_percentage}% Commission
              </p>
              
              {tierData.count > 0 && (
                <div className="text-xs text-gray-500">
                  Avg Revenue: {formatCurrency(tierData.avgRevenue)}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
      
      {/* Top Performers */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Barbers</h3>
        
        <div className="space-y-4">
          {analytics.topPerformers.map((barber, index) => (
            <div 
              key={barber.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-olive-400 to-olive-600 rounded-full flex items-center justify-center text-white font-bold">
                    #{index + 1}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900">{barber.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Total Revenue: {formatCurrency(barber.historicalRevenue)}</span>
                    <span>Avg Tier Level: {barber.avgTierLevel.toFixed(1)}</span>
                    <span>Achievements: {barber.achievementCount}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {Array.from({ length: barber.highestTier }, (_, i) => (
                    <StarIcon key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-600">
                  Level {barber.highestTier}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Tier Structure Info */}
      {tierStructure && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Current Tier Structure: {tierStructure.name}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">{tierStructure.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reset Period:</span>
                  <span className="font-medium capitalize">{tierStructure.reset_period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Tiers:</span>
                  <span className="font-medium">{tierStructure.tiers?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Commission Range:</span>
                  <span className="font-medium">
                    {Math.min(...(tierStructure.tiers?.map(t => t.commission_percentage) || [0]))}% - 
                    {Math.max(...(tierStructure.tiers?.map(t => t.commission_percentage) || [0]))}%
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Tier Breakdown</h4>
              <div className="space-y-2">
                {tierStructure.tiers?.map((tier) => (
                  <div key={tier.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tier.color_code }}
                      />
                      <span>{tier.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500">
                        {tier.threshold_amount > 0 ? formatCurrency(tier.threshold_amount) : 'Starting'}
                      </span>
                      <span className="font-medium">
                        {tier.commission_percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Period-by-Period History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievement History</h3>
        
        {tierHistory.length === 0 ? (
          <div className="text-center py-8">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h4 className="mt-2 text-sm font-medium text-gray-900">No History Available</h4>
            <p className="mt-1 text-sm text-gray-500">
              Tier achievements will appear here as barbers reach new performance levels.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barber
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier Achieved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tierHistory
                  .sort((a, b) => new Date(b.period_start) - new Date(a.period_start))
                  .slice(0, 10)
                  .map((record) => {
                    const tier = tierStructure?.tiers?.find(t => t.tier_level === record.final_tier_level)
                    
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(record.period_start)} - {formatDate(record.period_end)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.barber_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: tier?.color_code || '#6B7280' }}
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {tier?.name || `Level ${record.final_tier_level}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(record.period_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.period_bookings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPercentage(record.avg_commission_rate)}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
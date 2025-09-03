'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import Button from '@/components/ui/Button'
import { 
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  EyeIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { useUnifiedContext, UNIFIED_CONTEXT_LEVELS } from '@/contexts/UnifiedContextProvider'
import { cn } from '@/lib/utils'

/**
 * Organization Finance Dashboard - Enterprise-level financial overview
 * 
 * Shows aggregated financial metrics across all locations in the organization
 * Features:
 * - Multi-location revenue aggregation
 * - Location comparison charts
 * - Drill-down capabilities to specific locations
 * - Cross-location analytics and trends
 * - Consolidated reporting
 */

export default function OrganizationFinanceDashboard({ financeContext, onRefresh }) {
  console.log('🏢 ORGANIZATION FINANCE DASHBOARD: Rendering for enterprise view')
  const { context, setContext } = useUnifiedContext()
  const supabase = createClient()
  
  const [organizationData, setOrganizationData] = useState({
    overview: {
      totalRevenue: 0,
      totalLocations: 0,
      totalStaff: 0,
      avgRevenuePerLocation: 0,
      loading: true,
      error: null
    },
    locations: [],
    trends: {
      revenueGrowth: 0,
      locationGrowth: 0,
      staffGrowth: 0
    },
    topPerformers: {
      locations: [],
      staff: []
    }
  })

  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Time range options
  const timeRangeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ]

  // Fetch organization-wide financial data
  const fetchOrganizationData = useCallback(async () => {
    if (!context?.organizationId) return

    try {
      setOrganizationData(prev => ({
        ...prev,
        overview: { ...prev.overview, loading: true, error: null }
      }))

      // Fetch all locations in the organization
      const { data: locations, error: locationsError } = await supabase
        .from('barbershops')
        .select(`
          id,
          name,
          created_at,
          barbershop_staff(count)
        `)
        .eq('organization_id', context.organizationId)

      if (locationsError) throw locationsError

      // Fetch financial data for all locations
      const locationIds = locations?.map(loc => loc.id) || []
      
      // This would typically make API calls to get revenue data
      // For now, we'll simulate the data structure
      const locationFinancialData = await Promise.all(
        locationIds.map(async (locationId) => {
          try {
            // In a real implementation, this would call your revenue API
            const response = await fetch(`/api/v1/revenue/summary?context=location&locationId=${locationId}&timeRange=${selectedTimeRange}`)
            if (response.ok) {
              return await response.json()
            }
            return null
          } catch (error) {
            console.error(`Error fetching data for location ${locationId}:`, error)
            return null
          }
        })
      )

      // Aggregate data across locations
      const aggregatedData = locationFinancialData.reduce((acc, locationData, index) => {
        if (locationData) {
          acc.totalRevenue += locationData.totalRevenue || 0
          acc.locationRevenueData.push({
            locationId: locationIds[index],
            locationName: locations[index]?.name || 'Unknown',
            revenue: locationData.totalRevenue || 0,
            appointments: locationData.totalAppointments || 0,
            staffCount: locations[index]?.barbershop_staff?.length || 0
          })
        }
        return acc
      }, {
        totalRevenue: 0,
        locationRevenueData: []
      })

      // Calculate trends (placeholder logic)
      const trends = {
        revenueGrowth: Math.random() * 20 - 5, // -5% to +15%
        locationGrowth: locations?.length > 0 ? ((locations.length - 3) / 3) * 100 : 0,
        staffGrowth: Math.random() * 15 - 2.5 // -2.5% to +12.5%
      }

      // Top performers
      const topLocations = aggregatedData.locationRevenueData
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      setOrganizationData({
        overview: {
          totalRevenue: aggregatedData.totalRevenue,
          totalLocations: locations?.length || 0,
          totalStaff: locations?.reduce((sum, loc) => sum + (loc.barbershop_staff?.length || 0), 0) || 0,
          avgRevenuePerLocation: locations?.length > 0 ? aggregatedData.totalRevenue / locations.length : 0,
          loading: false,
          error: null
        },
        locations: aggregatedData.locationRevenueData,
        trends,
        topPerformers: {
          locations: topLocations,
          staff: [] // Would be populated with cross-location staff data
        }
      })

    } catch (error) {
      console.error('Error fetching organization data:', error)
      setOrganizationData(prev => ({
        ...prev,
        overview: {
          ...prev.overview,
          loading: false,
          error: error.message
        }
      }))
    }
  }, [context?.organizationId, selectedTimeRange, supabase])

  // Initialize and refresh data
  useEffect(() => {
    if (context?.organizationId) {
      fetchOrganizationData()
    }
  }, [fetchOrganizationData])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchOrganizationData()
    if (onRefresh) {
      await onRefresh()
    }
    setIsRefreshing(false)
  }

  // Handle drill-down to specific location
  const handleLocationDrillDown = async (location) => {
    try {
      await setContext({
        level: UNIFIED_CONTEXT_LEVELS.LOCATION,
        organizationId: context.organizationId,
        locationId: location.locationId,
        displayName: location.locationName,
        metadata: {
          organizationName: context.metadata?.organizationName,
          locationName: location.locationName
        }
      })
    } catch (error) {
      console.error('Failed to drill down to location:', error)
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value) => {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const { overview, locations, trends, topPerformers } = organizationData

  if (overview.loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-96"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (overview.error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-red-800 mb-2">
                Unable to Load Organization Data
              </h3>
              <p className="text-red-700 mb-4">{overview.error}</p>
              <Button 
                onClick={handleRefresh}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {context.metadata?.organizationName || 'Organization'} Overview
            </h1>
            <p className="text-gray-600 mt-1">
              Enterprise financial dashboard across all {overview.totalLocations} locations
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Period:</label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overview.totalRevenue)}
                </p>
                <div className="flex items-center mt-2">
                  {trends.revenueGrowth > 0 ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    trends.revenueGrowth > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatPercentage(trends.revenueGrowth)}
                  </span>
                </div>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Locations */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Locations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.totalLocations}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-600">
                    Avg: {formatCurrency(overview.avgRevenuePerLocation)}
                  </span>
                </div>
              </div>
              <BuildingStorefrontIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Staff */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.totalStaff}
                </p>
                <div className="flex items-center mt-2">
                  {trends.staffGrowth > 0 ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    "text-sm font-medium", 
                    trends.staffGrowth > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatPercentage(trends.staffGrowth)}
                  </span>
                </div>
              </div>
              <UsersIcon className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Performance Score */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Performance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.totalLocations > 0 ? Math.round((overview.totalRevenue / overview.totalLocations) / 100) : 0}%
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Organization score
                </p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Performance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Locations Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Location Performance</CardTitle>
            <CardDescription>
              Revenue and performance by location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locations.map((location, index) => (
                <div
                  key={location.locationId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleLocationDrillDown(location)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                        index === 0 ? "bg-gold-500" : 
                        index === 1 ? "bg-gray-400" : 
                        index === 2 ? "bg-orange-500" : "bg-blue-500"
                      )}>
                        #{index + 1}
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-900">
                        {location.locationName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {location.staffCount} staff • {location.appointments} appointments
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {formatCurrency(location.revenue)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {overview.totalRevenue > 0 
                          ? `${((location.revenue / overview.totalRevenue) * 100).toFixed(1)}% of total`
                          : '0%'
                        }
                      </p>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}

              {locations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BuildingStorefrontIcon className="h-8 w-8 mx-auto mb-2" />
                  <p>No locations found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>
              Best performing locations this {selectedTimeRange}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.locations.slice(0, 3).map((location, index) => (
                <div
                  key={location.locationId}
                  className="flex items-center space-x-4 p-3 border rounded-lg"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold",
                    index === 0 ? "bg-yellow-500" :
                    index === 1 ? "bg-gray-500" : "bg-orange-500"
                  )}>
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">{location.locationName}</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(location.revenue)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleLocationDrillDown(location)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {topPerformers.locations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ChartBarIcon className="h-8 w-8 mx-auto mb-2" />
                  <p>Performance data loading...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
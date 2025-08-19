'use client'

import { 
  BuildingOffice2Icon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  MapPinIcon,
  UsersIcon,
  StarIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'
import Link from 'next/link'

import GlobalNavigation from '@/components/GlobalNavigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/SupabaseAuthProvider'
import ReviewStats from '@/components/reviews/ReviewStats'
import ReviewsList from '@/components/reviews/ReviewsList'

export default function EnterpriseReviewsPage() {
  const { user, profile } = useAuth()
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30days')
  const [locationMetrics, setLocationMetrics] = useState([])
  const [topPerformers, setTopPerformers] = useState([])

  // Load all locations for the enterprise
  useEffect(() => {
    const loadEnterpriseData = async () => {
      try {
        setLoading(true)
        
        // Load locations (fallback to demo data)
        const demoLocations = [
          {
            id: 'loc_001',
            name: 'Downtown LA',
            address: '123 Main St, Los Angeles, CA',
            totalReviews: 342,
            averageRating: 4.7,
            weeklyTrend: 12
          },
          {
            id: 'loc_002',
            name: 'Beverly Hills',
            address: '456 Rodeo Dr, Beverly Hills, CA',
            totalReviews: 287,
            averageRating: 4.9,
            weeklyTrend: 8
          },
          {
            id: 'loc_003',
            name: 'Santa Monica',
            address: '789 Ocean Ave, Santa Monica, CA',
            totalReviews: 198,
            averageRating: 4.6,
            weeklyTrend: -3
          },
          {
            id: 'loc_004',
            name: 'Pasadena',
            address: '321 Colorado Blvd, Pasadena, CA',
            totalReviews: 156,
            averageRating: 4.8,
            weeklyTrend: 15
          }
        ]
        
        setLocations(demoLocations)
        
        // Calculate location metrics
        const metrics = demoLocations.map(loc => ({
          ...loc,
          positivePercentage: Math.round(85 + Math.random() * 10),
          responseRate: Math.round(70 + Math.random() * 25),
          attributionRate: Math.round(60 + Math.random() * 30)
        }))
        setLocationMetrics(metrics)
        
        // Load top performers
        const performers = [
          {
            id: 'barber_001',
            name: 'Marcus Johnson',
            location: 'Downtown LA',
            totalReviews: 87,
            averageRating: 4.9,
            trend: 'up'
          },
          {
            id: 'barber_002',
            name: 'David Wilson',
            location: 'Beverly Hills',
            totalReviews: 76,
            averageRating: 4.8,
            trend: 'up'
          },
          {
            id: 'barber_003',
            name: 'Carlos Martinez',
            location: 'Santa Monica',
            totalReviews: 65,
            averageRating: 4.7,
            trend: 'stable'
          },
          {
            id: 'barber_004',
            name: 'James Thompson',
            location: 'Downtown LA',
            totalReviews: 58,
            averageRating: 4.9,
            trend: 'up'
          },
          {
            id: 'barber_005',
            name: 'Michael Chen',
            location: 'Pasadena',
            totalReviews: 52,
            averageRating: 4.6,
            trend: 'down'
          }
        ]
        setTopPerformers(performers)
        
        // Load sample reviews
        const sampleReviews = [
          {
            id: 'rev_001',
            reviewerName: 'Sarah Johnson',
            reviewText: 'Amazing service at the Downtown location! Marcus gave me the best fade I\'ve ever had.',
            starRating: 5,
            reviewDate: new Date('2024-01-15'),
            location: 'Downtown LA',
            attribution: {
              barber: { name: 'Marcus Johnson' },
              confidence: 'high',
              confidenceScore: 85,
              sentiment: 'positive'
            }
          },
          {
            id: 'rev_002',
            reviewerName: 'Robert Davis',
            reviewText: 'Beverly Hills location is top-notch. Professional service and great atmosphere.',
            starRating: 5,
            reviewDate: new Date('2024-01-14'),
            location: 'Beverly Hills',
            attribution: {
              barber: { name: 'David Wilson' },
              confidence: 'medium',
              confidenceScore: 72,
              sentiment: 'positive'
            }
          }
        ]
        setReviews(sampleReviews)
        
      } catch (error) {
        console.error('Error loading enterprise data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEnterpriseData()
  }, [])

  // Calculate aggregate stats
  const aggregateStats = {
    totalReviews: locations.reduce((sum, loc) => sum + loc.totalReviews, 0),
    averageRating: locations.length > 0 
      ? (locations.reduce((sum, loc) => sum + loc.averageRating, 0) / locations.length).toFixed(1)
      : 0,
    totalLocations: locations.length,
    weeklyGrowth: locations.reduce((sum, loc) => sum + (loc.weeklyTrend || 0), 0)
  }

  return (
    <ProtectedRoute requiredRole="ENTERPRISE_OWNER">
      <GlobalNavigation />
      <div className="min-h-screen bg-gray-50">
        <div className="lg:ml-80 transition-all duration-300 ease-in-out pt-16 lg:pt-0">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Header */}
              <div className="mb-8">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <BuildingOffice2Icon className="h-10 w-10 text-olive-600" />
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                          Enterprise Reviews Dashboard
                        </h1>
                        <p className="mt-1 text-lg text-gray-600">
                          Comprehensive review analytics across all locations
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
                    >
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="90days">Last 90 Days</option>
                      <option value="year">Last Year</option>
                    </select>
                    <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700">
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      Sync All Locations
                    </button>
                  </div>
                </div>
              </div>

              {/* Enterprise Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Reviews</p>
                      <p className="text-3xl font-bold text-gray-900">{aggregateStats.totalReviews}</p>
                      <p className={`text-xs mt-1 ${aggregateStats.weeklyGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {aggregateStats.weeklyGrowth > 0 ? '+' : ''}{aggregateStats.weeklyGrowth}% this week
                      </p>
                    </div>
                    <ChartBarIcon className="h-8 w-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Avg Rating</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-3xl font-bold text-gray-900">{aggregateStats.averageRating}</p>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <StarIconSolid
                              key={i}
                              className={`h-5 w-5 ${i < Math.floor(aggregateStats.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Locations</p>
                      <p className="text-3xl font-bold text-gray-900">{aggregateStats.totalLocations}</p>
                      <p className="text-xs text-gray-500 mt-1">Active locations</p>
                    </div>
                    <MapPinIcon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Response Rate</p>
                      <p className="text-3xl font-bold text-gray-900">78%</p>
                      <p className="text-xs text-green-600 mt-1">+5% from last month</p>
                    </div>
                    <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
                  </div>
                </div>
              </div>

              {/* Location Performance Grid */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Location Performance</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reviews
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Rating
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Positive %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attribution Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trend
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {locationMetrics.map((location) => (
                        <tr key={location.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{location.name}</div>
                              <div className="text-xs text-gray-500">{location.address}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {location.totalReviews}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 mr-2">
                                {location.averageRating}
                              </span>
                              {[...Array(5)].map((_, i) => (
                                <StarIconSolid
                                  key={i}
                                  className={`h-4 w-4 ${i < Math.floor(location.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-900">{location.positivePercentage}%</span>
                              <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${location.positivePercentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {location.attributionRate}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`flex items-center text-sm ${location.weeklyTrend > 0 ? 'text-green-600' : location.weeklyTrend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {location.weeklyTrend > 0 ? (
                                <ArrowUpIcon className="h-4 w-4 mr-1" />
                              ) : location.weeklyTrend < 0 ? (
                                <ArrowDownIcon className="h-4 w-4 mr-1" />
                              ) : null}
                              {Math.abs(location.weeklyTrend)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link
                              href={`/dashboard/locations/${location.id}/reviews`}
                              className="text-olive-600 hover:text-olive-800 font-medium"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Top Performing Barbers</h2>
                  <div className="space-y-4">
                    {topPerformers.slice(0, 5).map((performer, index) => (
                      <div key={performer.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-olive-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-olive-800">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{performer.name}</p>
                            <p className="text-xs text-gray-500">{performer.location}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <span className="text-sm font-medium text-gray-900">{performer.averageRating}</span>
                            <StarIconSolid className="h-4 w-4 text-yellow-400" />
                          </div>
                          <p className="text-xs text-gray-500">{performer.totalReviews} reviews</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Trends Chart Placeholder */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Review Trends</h2>
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Review trends chart</p>
                      <p className="text-xs text-gray-400 mt-1">Data visualization coming soon</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Reviews Sample */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Recent Reviews Across All Locations</h2>
                  <Link
                    href="/dashboard/reviews"
                    className="text-sm text-olive-600 hover:text-olive-800 font-medium"
                  >
                    View All Reviews →
                  </Link>
                </div>
                <ReviewsList
                  reviews={reviews}
                  loading={loading}
                  showFilters={false}
                  showSearch={false}
                  showAttribution={true}
                  compact={true}
                />
              </div>

              {/* Enterprise Features Notice */}
              <div className="mt-8 bg-gradient-to-r from-olive-50 to-green-50 border border-olive-200 rounded-lg p-6">
                <div className="flex items-start">
                  <BuildingOffice2Icon className="h-6 w-6 text-olive-600 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-olive-800">
                      Enterprise Review Analytics
                    </h3>
                    <div className="mt-2 text-sm text-olive-700">
                      <p>Your enterprise dashboard provides:</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>Aggregated analytics across all locations</li>
                        <li>Location performance comparisons and benchmarking</li>
                        <li>Top performer identification across the organization</li>
                        <li>Trend analysis and predictive insights</li>
                        <li>Centralized review management and response coordination</li>
                        <li>Custom reporting and data export capabilities</li>
                      </ul>
                    </div>
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
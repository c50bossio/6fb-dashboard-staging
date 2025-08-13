'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import {
  BuildingOffice2Icon,
  MapPinIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  ChartBarIcon,
  EyeIcon,
  CloudArrowUpIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

export default function EnterpriseWebsiteManagement() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Enterprise website settings
  const [settings, setSettings] = useState({
    // Basic Info
    name: 'Elite Barber Group',
    tagline: 'Excellence Across Every Location',
    description: 'Premier barbershop chain with locations throughout the city',
    slug: 'elite-group',
    custom_domain: '',
    
    // Branding
    logo_url: '',
    favicon_url: '',
    cover_image_url: '',
    primary_color: '#1E40AF',
    secondary_color: '#3B82F6',
    accent_color: '#10B981',
    text_color: '#1F2937',
    background_color: '#FFFFFF',
    heading_font: 'Montserrat',
    body_font: 'Inter',
    
    // Content
    hero_title: 'Find Your Perfect Barbershop',
    hero_subtitle: 'With 12 locations across the city, excellence is always nearby',
    about_content: 'Elite Barber Group has been setting the standard for premium grooming services since 2010.',
    mission_statement: 'To provide exceptional grooming experiences that make every client look and feel their best.',
    
    // Features
    show_location_map: true,
    show_location_directory: true,
    enable_online_booking: true,
    enable_shop_comparison: true,
    
    // Social
    instagram_url: 'https://instagram.com/elitebarbergroup',
    facebook_url: 'https://facebook.com/elitebarbergroup',
    twitter_url: '',
    youtube_url: '',
    tiktok_url: '',
    
    // SEO
    seo_title: 'Elite Barber Group - Premium Barbershops Across the City',
    seo_description: 'Visit any of our 12 barbershop locations for exceptional haircuts and grooming services.',
    seo_keywords: 'barbershop chain, haircut, grooming, multiple locations',
    google_analytics_id: '',
    
    // Status
    is_published: true
  })

  // Locations data
  const [locations, setLocations] = useState([
    {
      id: '1',
      name: 'Elite Cuts Downtown',
      address: '123 Main St, Downtown',
      city: 'Los Angeles',
      state: 'CA',
      phone: '(555) 123-4567',
      manager: 'John Smith',
      barbers: 8,
      rating: 4.8,
      reviews: 342,
      monthly_revenue: 45000,
      status: 'active',
      website_status: 'published',
      custom_branding: false,
      performance: {
        bookings_this_month: 450,
        revenue_change: 12,
        new_clients: 67
      }
    },
    {
      id: '2',
      name: 'Elite Cuts Westside',
      address: '456 Ocean Ave, Westside',
      city: 'Los Angeles',
      state: 'CA',
      phone: '(555) 234-5678',
      manager: 'Mike Johnson',
      barbers: 6,
      rating: 4.9,
      reviews: 289,
      monthly_revenue: 38000,
      status: 'active',
      website_status: 'published',
      custom_branding: true,
      performance: {
        bookings_this_month: 380,
        revenue_change: 8,
        new_clients: 45
      }
    },
    {
      id: '3',
      name: 'Elite Cuts Hollywood',
      address: '789 Sunset Blvd, Hollywood',
      city: 'Los Angeles',
      state: 'CA',
      phone: '(555) 345-6789',
      manager: 'Sarah Davis',
      barbers: 10,
      rating: 4.7,
      reviews: 567,
      monthly_revenue: 62000,
      status: 'active',
      website_status: 'draft',
      custom_branding: false,
      performance: {
        bookings_this_month: 620,
        revenue_change: -5,
        new_clients: 89
      }
    }
  ])

  // Analytics data
  const [analytics, setAnalytics] = useState({
    total_locations: 12,
    total_barbers: 84,
    total_monthly_revenue: 485000,
    avg_rating: 4.8,
    total_reviews: 3421,
    total_bookings_month: 4250,
    revenue_change: 15,
    top_location: 'Elite Cuts Downtown',
    website_visitors_month: 25000,
    conversion_rate: 12.5
  })

  // Tabs
  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'locations', name: 'Locations', icon: MapPinIcon },
    { id: 'branding', name: 'Enterprise Branding', icon: PaintBrushIcon },
    { id: 'content', name: 'Portal Content', icon: GlobeAltIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon }
  ]

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setMessage({ 
        type: 'success', 
        text: 'Enterprise website settings saved successfully!' 
      })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to save settings. Please try again.' 
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSettings({ ...settings, is_published: !settings.is_published })
      setMessage({ 
        type: 'success', 
        text: settings.is_published ? 'Portal unpublished' : 'Portal published successfully!' 
      })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update publish status' })
    } finally {
      setSaving(false)
    }
  }

  const toggleLocationStatus = (locationId) => {
    setLocations(locations.map(loc => 
      loc.id === locationId 
        ? { ...loc, website_status: loc.website_status === 'published' ? 'draft' : 'published' }
        : loc
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BuildingOffice2Icon className="h-6 w-6 text-indigo-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Enterprise Website Management
              </h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                settings.is_published 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {settings.is_published ? 'Live' : 'Draft'}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open(`/enterprise/${settings.slug}`, '_blank')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                View Portal
              </button>
              
              <button
                onClick={handlePublish}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                )}
                {settings.is_published ? 'Unpublish' : 'Publish Portal'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Message */}
      {message.text && (
        <div className={`mx-4 mt-4 p-4 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckIcon className="h-5 w-5 mr-2" />
          ) : (
            <XMarkIcon className="h-5 w-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Locations</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.total_locations}</p>
                  </div>
                  <MapPinIcon className="h-8 w-8 text-indigo-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Barbers</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.total_barbers}</p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(analytics.total_monthly_revenue / 1000).toFixed(0)}K
                    </p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                      {analytics.revenue_change}%
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Website Visitors</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(analytics.website_visitors_month / 1000).toFixed(0)}K
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {analytics.conversion_rate}% conversion
                    </p>
                  </div>
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Top Performing Locations */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Top Performing Locations
              </h2>
              <div className="space-y-4">
                {locations.slice(0, 3).map((location, index) => (
                  <div key={location.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`
                        h-10 w-10 rounded-full flex items-center justify-center text-white font-bold
                        ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'}
                      `}>
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{location.name}</h3>
                        <p className="text-sm text-gray-500">{location.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${(location.monthly_revenue / 1000).toFixed(0)}K
                      </p>
                      <p className="text-sm text-gray-500">
                        {location.performance.bookings_this_month} bookings
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                  <PlusIcon className="h-6 w-6 text-indigo-600 mb-2" />
                  <h3 className="font-medium text-gray-900">Add New Location</h3>
                  <p className="text-sm text-gray-500">Register a new barbershop location</p>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                  <ChartBarIcon className="h-6 w-6 text-green-600 mb-2" />
                  <h3 className="font-medium text-gray-900">View Reports</h3>
                  <p className="text-sm text-gray-500">Detailed analytics and insights</p>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                  <UsersIcon className="h-6 w-6 text-purple-600 mb-2" />
                  <h3 className="font-medium text-gray-900">Manage Staff</h3>
                  <p className="text-sm text-gray-500">Add or remove barbers across locations</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Location Management
                </h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search locations..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Location
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Barbers
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Website
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {locations.map((location) => (
                      <tr key={location.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{location.name}</div>
                            <div className="text-sm text-gray-500">{location.address}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{location.manager}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{location.barbers} barbers</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              ${(location.monthly_revenue / 1000).toFixed(0)}K/mo
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              {location.performance.revenue_change > 0 ? (
                                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <ArrowTrendingUpIcon className="h-4 w-4 text-red-500 mr-1 rotate-180" />
                              )}
                              {Math.abs(location.performance.revenue_change)}%
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleLocationStatus(location.id)}
                              className={`px-3 py-1 text-xs font-medium rounded-full ${
                                location.website_status === 'published'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {location.website_status === 'published' ? 'Published' : 'Draft'}
                            </button>
                            {location.custom_branding && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                Custom
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => window.open(`/shop/${location.id}/website`, '_blank')}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => window.open(`/shop/${location.id}`, '_blank')}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Location Website Management
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Each location can have its own customized website</li>
                <li>• Custom branding allows locations to override enterprise colors</li>
                <li>• All locations remain under your enterprise domain</li>
                <li>• You maintain control over what gets published</li>
              </ul>
            </div>
          </div>
        )}

        {/* Enterprise Branding Tab */}
        {activeTab === 'branding' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Enterprise Identity
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enterprise Name
                    </label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={settings.tagline}
                      onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={settings.description}
                      onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Domain (Optional)
                    </label>
                    <input
                      type="text"
                      value={settings.custom_domain}
                      onChange={(e) => setSettings({ ...settings, custom_domain: e.target.value })}
                      placeholder="www.yourbarbergroup.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Logo & Images
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enterprise Logo
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 cursor-pointer">
                      <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Brand Colors
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.primary_color}
                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.primary_color}
                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.secondary_color}
                        onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.secondary_color}
                        onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accent Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.accent_color}
                        onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.accent_color}
                        onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    These colors will be inherited by all locations unless they enable custom branding.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Typography
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Heading Font
                    </label>
                    <select
                      value={settings.heading_font}
                      onChange={(e) => setSettings({ ...settings, heading_font: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Playfair Display">Playfair Display</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Body Font
                    </label>
                    <select
                      value={settings.body_font}
                      onChange={(e) => setSettings({ ...settings, body_font: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portal Content Tab */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Hero Section
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hero Title
                    </label>
                    <input
                      type="text"
                      value={settings.hero_title}
                      onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hero Subtitle
                    </label>
                    <textarea
                      value={settings.hero_subtitle}
                      onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  About Section
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      About Content
                    </label>
                    <textarea
                      value={settings.about_content}
                      onChange={(e) => setSettings({ ...settings, about_content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mission Statement
                    </label>
                    <textarea
                      value={settings.mission_statement}
                      onChange={(e) => setSettings({ ...settings, mission_statement: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Portal Features
                </h2>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.show_location_map}
                      onChange={(e) => setSettings({ ...settings, show_location_map: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show interactive location map</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.show_location_directory}
                      onChange={(e) => setSettings({ ...settings, show_location_directory: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show location directory</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enable_online_booking}
                      onChange={(e) => setSettings({ ...settings, enable_online_booking: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable online booking</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enable_shop_comparison}
                      onChange={(e) => setSettings({ ...settings, enable_shop_comparison: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable location comparison tool</span>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  SEO Settings
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SEO Title
                    </label>
                    <input
                      type="text"
                      value={settings.seo_title}
                      onChange={(e) => setSettings({ ...settings, seo_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SEO Description
                    </label>
                    <textarea
                      value={settings.seo_description}
                      onChange={(e) => setSettings({ ...settings, seo_description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Portal Visitors</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {(analytics.website_visitors_month / 1000).toFixed(1)}K
                </p>
                <p className="text-sm text-green-600 mt-2">+23% from last month</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Conversion Rate</h3>
                <p className="text-3xl font-bold text-gray-900">{analytics.conversion_rate}%</p>
                <p className="text-sm text-green-600 mt-2">+2.3% improvement</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Session Duration</h3>
                <p className="text-3xl font-bold text-gray-900">3:45</p>
                <p className="text-sm text-gray-500 mt-2">minutes</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Traffic Sources
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Organic Search</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">45%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Direct</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '30%' }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">30%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Social Media</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">15%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Referral</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">10%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
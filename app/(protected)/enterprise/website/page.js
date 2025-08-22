'use client'

import { useState, useEffect } from 'react'
import { 
  GlobeAltIcon,
  PaintBrushIcon,
  PhotoIcon,
  CodeBracketIcon,
  EyeIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function EnterpriseWebsite() {
  const { user, profile } = useAuth()
  const [websiteData, setWebsiteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadWebsiteData()
  }, [])

  const loadWebsiteData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/enterprise/website')
      const result = await response.json()
      
      if (result.success) {
        setWebsiteData(result.data)
      } else {
        throw new Error(result.error || 'Failed to load website data')
      }
    } catch (err) {
      console.error('Error loading website data:', err)
      setError(err.message)
      // Set mock data for development
      setWebsiteData({
        domain: 'enterprise-barbers.com',
        status: 'active',
        locations: [
          { 
            id: 1, 
            name: 'Downtown Location', 
            subdomain: 'downtown.enterprise-barbers.com',
            status: 'published',
            visits: 2340
          },
          { 
            id: 2, 
            name: 'Mall Location', 
            subdomain: 'mall.enterprise-barbers.com',
            status: 'published',
            visits: 1890
          },
          { 
            id: 3, 
            name: 'Uptown Branch', 
            subdomain: 'uptown.enterprise-barbers.com',
            status: 'draft',
            visits: 0
          }
        ],
        theme: 'modern-dark',
        totalVisits: 4230,
        conversionRate: 12.5
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !websiteData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Enterprise Website</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={loadWebsiteData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: GlobeAltIcon },
    { id: 'design', name: 'Design', icon: PaintBrushIcon },
    { id: 'locations', name: 'Locations', icon: DocumentDuplicateIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'offline':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Website</h1>
          <p className="text-gray-600 mt-1">Manage your multi-location website and portal</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center space-x-2">
            <EyeIcon className="h-4 w-4" />
            <span>Preview</span>
          </button>
          <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 text-sm font-medium">
            Publish Changes
          </button>
        </div>
      </div>

      {/* Website Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-olive-100 rounded-lg flex items-center justify-center">
              <GlobeAltIcon className="h-6 w-6 text-olive-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{websiteData?.domain}</h3>
              <p className="text-sm text-gray-600">Enterprise Website</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(websiteData?.status)}`}>
              {websiteData?.status}
            </span>
            <p className="text-sm text-gray-600 mt-1">{websiteData?.totalVisits} total visits</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Visits</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{websiteData?.totalVisits?.toLocaleString()}</p>
                  </div>
                  <EyeIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-2">
                  <span className="text-sm text-green-600 font-medium">+15%</span>
                  <span className="text-sm text-gray-500 ml-1">from last month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{websiteData?.conversionRate}%</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-2">
                  <span className="text-sm text-green-600 font-medium">+2.1%</span>
                  <span className="text-sm text-gray-500 ml-1">from last month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Locations</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {websiteData?.locations?.filter(l => l.status === 'published').length || 0}
                    </p>
                  </div>
                  <DocumentDuplicateIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mt-2">
                  <span className="text-sm text-gray-500">
                    of {websiteData?.locations?.length || 0} total
                  </span>
                </div>
              </div>
            </div>

            {/* Location Pages */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Location Pages</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        URL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {websiteData?.locations?.map((location) => (
                      <tr key={location.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{location.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-blue-600 hover:text-blue-800">
                            <a href={`https://${location.subdomain}`} target="_blank" rel="noopener noreferrer">
                              {location.subdomain}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(location.status)}`}>
                            {location.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {location.visits?.toLocaleString() || '0'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-olive-600 hover:text-olive-900 mr-3">
                            Edit
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            Preview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'design' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Website Design & Branding</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">Theme Selection</h3>
                <div className="space-y-3">
                  <div className="p-4 border-2 border-olive-200 rounded-lg bg-olive-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Modern Dark</span>
                      <span className="text-xs bg-olive-600 text-white px-2 py-1 rounded">Current</span>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer">
                    <span className="font-medium">Classic Light</span>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer">
                    <span className="font-medium">Minimalist</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-3">Brand Assets</h3>
                <div className="space-y-3">
                  <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-center">
                    <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-600">Upload Logo</span>
                  </button>
                  <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-center">
                    <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-600">Upload Banner Images</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'locations' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Location Management</h2>
              <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 text-sm font-medium">
                Add Location Page
              </button>
            </div>
            <p className="text-gray-600 mb-6">Manage individual location pages and their content.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {websiteData?.locations?.map((location) => (
                <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">{location.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(location.status)}`}>
                      {location.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{location.subdomain}</p>
                  <div className="flex space-x-2">
                    <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                      Edit
                    </button>
                    <button className="flex-1 px-3 py-2 bg-olive-100 text-olive-700 rounded text-sm hover:bg-olive-200">
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Website Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Domain
                </label>
                <input
                  type="text"
                  value={websiteData?.domain || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-olive-500 focus:border-olive-500"
                  placeholder="your-domain.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Settings
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-olive-500 focus:border-olive-500"
                  placeholder="Website description for search engines..."
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">SSL Certificate</h4>
                  <p className="text-sm text-gray-600">Secure connection enabled</p>
                </div>
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <button className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'
import AddLocationModal from '@/components/modals/AddLocationModal'
import EditLocationModal from '@/components/modals/EditLocationModal'
import ViewLocationModal from '@/components/modals/ViewLocationModal'
import { 
  GlobeAltIcon,
  BuildingOfficeIcon,
  MapIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

export default function EnterpriseWebsiteCustomization() {
  const { user } = useAuth()
  const { availableLocations, refreshLocations, permissions } = useGlobalDashboard()
  const [activeTab, setActiveTab] = useState('overview')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [showEditLocationModal, setShowEditLocationModal] = useState(false)
  const [showViewLocationModal, setShowViewLocationModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  
  const [settings, setSettings] = useState({
    // Organization Info
    organization_name: '',
    organization_description: '',
    website_url: '',
    corporate_email: '',
    corporate_phone: '',
    
    // Multi-Location Settings
    unified_branding: true,
    centralized_booking: true,
    location_finder_enabled: true,
    
    // Brand Standards
    global_logo_url: '',
    global_brand_color: '#4F46E5',
    global_font_family: 'Inter',
    allow_location_customization: false,
    
    // Enterprise Features
    analytics_dashboard_enabled: true,
    reporting_enabled: true,
    staff_management_enabled: true,
    inventory_sync_enabled: false,
    
    // Marketing
    seo_optimization: true,
    social_media_integration: true,
    review_aggregation: true,
    automated_marketing: false
  })

  const supabase = createClient()

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BuildingOfficeIcon },
    { id: 'locations', name: 'Locations', icon: MapIcon },
    { id: 'branding', name: 'Global Branding', icon: GlobeAltIcon },
    { id: 'features', name: 'Enterprise Features', icon: ChartBarIcon }
  ]

  useEffect(() => {
    loadEnterpriseSettings()
    // Locations are now loaded automatically by GlobalDashboardContext
  }, [user])

  const loadEnterpriseSettings = async () => {
    if (!user) return

    try {
      // Check if user has organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single()

        if (org) {
          setSettings(prev => ({
            ...prev,
            organization_name: org.name || '',
            organization_description: org.description || '',
            website_url: org.website_url || '',
            corporate_email: org.email || '',
            corporate_phone: org.phone || '',
            global_logo_url: org.logo_url || '',
            global_brand_color: org.brand_color || '#4F46E5',
            unified_branding: org.unified_branding !== false,
            centralized_booking: org.centralized_booking !== false
          }))
        }
      }
    } catch (error) {
      console.error('Error loading enterprise settings:', error)
    }
  }

  // Locations are now managed by GlobalDashboardContext
  // This ensures consistency with the top bar location selector

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // For now, just update user profile with enterprise settings
      // In a real app, you'd have an organizations table
      const { error } = await supabase
        .from('profiles')
        .update({
          enterprise_settings: settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: 'Enterprise settings saved successfully!' 
      })

      setTimeout(() => setMessage({ type: '', text: '' }), 3000)

    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to save settings. Please try again.' 
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const addLocation = () => {
    // Open the same modal used by GlobalContextSelector for consistency
    setShowAddLocationModal(true)
  }
  
  const handleLocationModalClose = () => {
    setShowAddLocationModal(false)
    // Refresh locations after modal closes to show any new additions
    refreshLocations()
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={settings.organization_name}
                  onChange={(e) => updateSetting('organization_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Elite Cuts Enterprise"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={settings.organization_description}
                  onChange={(e) => updateSetting('organization_description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe your multi-location barbershop enterprise..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    value={settings.corporate_email}
                    onChange={(e) => updateSetting('corporate_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="corporate@elitecuts.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corporate Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.corporate_phone}
                    onChange={(e) => updateSetting('corporate_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corporate Website
                </label>
                <input
                  type="url"
                  value={settings.website_url}
                  onChange={(e) => updateSetting('website_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://www.elitecuts.com"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Enterprise Overview</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{availableLocations.length}</div>
                  <div className="text-sm text-gray-600">Total Locations</div>
                </div>
                
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {availableLocations.reduce((total, loc) => total + (loc.staff_count || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Staff</div>
                </div>
                
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">95%</div>
                  <div className="text-sm text-gray-600">Avg Rating</div>
                </div>
                
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">$125K</div>
                  <div className="text-sm text-gray-600">Monthly Revenue</div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mt-4">
                Monitor and manage all your locations from this centralized dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Your Locations</h4>
                <div className="flex items-center gap-2 mt-1">
                  <LinkIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">
                    Synced with Global Dashboard • {availableLocations.length} location{availableLocations.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {permissions?.canAddLocations && (
                <button
                  onClick={addLocation}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Location
                </button>
              )}
            </div>

            {availableLocations.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <MapIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h5 className="text-lg font-medium text-gray-900 mb-2">No Locations Yet</h5>
                <p className="text-gray-600 mb-4">Add your first location to get started with multi-location management.</p>
                {permissions?.canAddLocations && (
                  <button
                    onClick={addLocation}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Add Your First Location
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableLocations.map((location) => (
                  <div key={location.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900">{location.name}</h5>
                        <p className="text-sm text-gray-600">{location.city}, {location.state}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Active
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1 mb-4">
                      <p>📞 {location.phone}</p>
                      <p>📍 {location.address}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => {
                          setSelectedLocation(location)
                          setShowEditLocationModal(true)
                        }}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Manage
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedLocation(location)
                          setShowViewLocationModal(true)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Global Branding Tab */}
        {activeTab === 'branding' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Global Logo URL
                </label>
                <input
                  type="url"
                  value={settings.global_logo_url}
                  onChange={(e) => updateSetting('global_logo_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Global Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.global_brand_color}
                    onChange={(e) => updateSetting('global_brand_color', e.target.value)}
                    className="w-16 h-8 border border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">{settings.global_brand_color}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.unified_branding}
                    onChange={(e) => updateSetting('unified_branding', e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enforce unified branding across all locations</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.allow_location_customization}
                    onChange={(e) => updateSetting('allow_location_customization', e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow individual location customization</span>
                </label>
              </div>
            </div>

            {/* Brand Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Brand Preview</h5>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: settings.global_brand_color + '20' }}
                  >
                    {settings.global_logo_url ? (
                      <img src={settings.global_logo_url} alt="Logo" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <BuildingOfficeIcon className="h-5 w-5" style={{ color: settings.global_brand_color }} />
                    )}
                  </div>
                  <div>
                    <h6 className="font-medium text-gray-900">
                      {settings.organization_name || 'Your Organization'}
                    </h6>
                    <p className="text-xs text-gray-600">Enterprise Brand</p>
                  </div>
                </div>
                
                <button 
                  className="w-full py-2 px-3 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: settings.global_brand_color }}
                >
                  Book at Any Location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Features Tab */}
        {activeTab === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-base font-medium text-gray-900 mb-4">Management Features</h5>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Analytics Dashboard</div>
                    <div className="text-xs text-gray-600">Enterprise-wide analytics and reporting</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.analytics_dashboard_enabled}
                    onChange={(e) => updateSetting('analytics_dashboard_enabled', e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Staff Management</div>
                    <div className="text-xs text-gray-600">Centralized staff management across locations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.staff_management_enabled}
                    onChange={(e) => updateSetting('staff_management_enabled', e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Centralized Booking</div>
                    <div className="text-xs text-gray-600">Allow booking across all locations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.centralized_booking}
                    onChange={(e) => updateSetting('centralized_booking', e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                </label>
              </div>
            </div>

            <div>
              <h5 className="text-base font-medium text-gray-900 mb-4">Marketing Features</h5>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">SEO Optimization</div>
                    <div className="text-xs text-gray-600">Enhanced search engine visibility</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.seo_optimization}
                    onChange={(e) => updateSetting('seo_optimization', e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Review Aggregation</div>
                    <div className="text-xs text-gray-600">Collect and display reviews from all locations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.review_aggregation}
                    onChange={(e) => updateSetting('review_aggregation', e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Social Media Integration</div>
                    <div className="text-xs text-gray-600">Connect with social media platforms</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.social_media_integration}
                    onChange={(e) => updateSetting('social_media_integration', e.target.checked)}
                    className="h-4 w-4 text-green-600 rounded"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Section */}
      <div className="pt-4 border-t border-gray-200">
        {message.text && (
          <div className={`mb-3 p-2 rounded flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 
            message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-4 w-4" />
            ) : (
              <XMarkIcon className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {saving && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          )}
          {saving ? 'Saving...' : 'Save Enterprise Settings'}
        </button>
      </div>
      
      {/* Add Location Modal - Same one used by GlobalContextSelector */}
      {showAddLocationModal && (
        <AddLocationModal
          isOpen={showAddLocationModal}
          onClose={handleLocationModalClose}
        />
      )}
      
      {/* Edit Location Modal */}
      {showEditLocationModal && (
        <EditLocationModal
          isOpen={showEditLocationModal}
          onClose={() => {
            setShowEditLocationModal(false)
            setSelectedLocation(null)
            refreshLocations() // Refresh the list after edit
          }}
          location={selectedLocation}
        />
      )}
      
      {/* View Location Modal */}
      {showViewLocationModal && (
        <ViewLocationModal
          isOpen={showViewLocationModal}
          onClose={() => {
            setShowViewLocationModal(false)
            setSelectedLocation(null)
          }}
          location={selectedLocation}
        />
      )}
    </div>
  )
}
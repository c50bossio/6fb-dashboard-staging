'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { 
  BuildingStorefrontIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  PhotoIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

export default function BarbershopWebsiteCustomization() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [previewMode, setPreviewMode] = useState('desktop')
  
  const [settings, setSettings] = useState({
    name: '',
    tagline: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    website_url: '',
    instagram_url: '',
    facebook_url: '',
    
    // Branding
    logo_url: '',
    brand_color: '#4F46E5',
    secondary_color: '#10B981',
    font_family: 'Inter',
    
    // Hours
    business_hours: {
      monday: { open: '09:00', close: '18:00', is_open: true },
      tuesday: { open: '09:00', close: '18:00', is_open: true },
      wednesday: { open: '09:00', close: '18:00', is_open: true },
      thursday: { open: '09:00', close: '18:00', is_open: true },
      friday: { open: '09:00', close: '18:00', is_open: true },
      saturday: { open: '09:00', close: '17:00', is_open: true },
      sunday: { open: '10:00', close: '16:00', is_open: false }
    },
    
    // Settings
    online_booking_enabled: true,
    show_prices: true,
    require_phone: true,
    allow_walk_ins: true,
    
    // SEO
    meta_description: '',
    keywords: []
  })

  const supabase = createClient()

  const tabs = [
    { id: 'general', name: 'General Info', icon: BuildingStorefrontIcon },
    { id: 'branding', name: 'Branding', icon: PaintBrushIcon },
    { id: 'hours', name: 'Hours & Booking', icon: CalendarDaysIcon },
    { id: 'seo', name: 'SEO & Marketing', icon: GlobeAltIcon }
  ]

  const colorOptions = [
    { name: 'Blue', value: '#4F46E5' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Teal', value: '#14B8A6' }
  ]

  useEffect(() => {
    loadBarbershopSettings()
  }, [user])

  const loadBarbershopSettings = async () => {
    if (!user) return

    try {
      // Get user's barbershop
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, barbershop_id')
        .eq('id', user.id)
        .single()

      if (!profile?.shop_id && !profile?.barbershop_id) return

      const shopId = profile.shop_id || profile.barbershop_id
      
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', shopId)
        .single()

      if (barbershop) {
        setSettings(prev => ({
          ...prev,
          name: barbershop.name || '',
          tagline: barbershop.tagline || '',
          description: barbershop.description || '',
          phone: barbershop.phone || '',
          email: barbershop.email || '',
          address: barbershop.address || '',
          city: barbershop.city || '',
          state: barbershop.state || '',
          zip_code: barbershop.zip_code || '',
          website_url: barbershop.website_url || '',
          logo_url: barbershop.logo_url || '',
          brand_color: barbershop.brand_color || '#4F46E5',
          business_hours: barbershop.business_hours || prev.business_hours,
          online_booking_enabled: barbershop.online_booking_enabled !== false,
          show_prices: barbershop.show_prices !== false
        }))
      }
    } catch (error) {
      console.error('Error loading barbershop settings:', error)
    }
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // Get shop ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, barbershop_id')
        .eq('id', user.id)
        .single()

      if (!profile?.shop_id && !profile?.barbershop_id) {
        throw new Error('No barbershop associated with your account')
      }

      const shopId = profile.shop_id || profile.barbershop_id

      // Update barbershop
      const { error } = await supabase
        .from('barbershops')
        .update({
          name: settings.name,
          tagline: settings.tagline,
          description: settings.description,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          zip_code: settings.zip_code,
          website_url: settings.website_url,
          logo_url: settings.logo_url,
          brand_color: settings.brand_color,
          business_hours: settings.business_hours,
          online_booking_enabled: settings.online_booking_enabled,
          show_prices: settings.show_prices,
          updated_at: new Date().toISOString()
        })
        .eq('id', shopId)

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: 'Website settings saved successfully!' 
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
                    ? 'border-purple-500 text-purple-600'
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Info Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => updateSetting('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Elite Cuts Barbershop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => updateSetting('tagline', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your Style, Our Craft"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => updateSetting('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe your barbershop, services, and what makes you unique..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => updateSetting('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="info@yourshop.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => updateSetting('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) => updateSetting('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Los Angeles"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={settings.state}
                    onChange={(e) => updateSetting('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="CA"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={settings.zip_code}
                    onChange={(e) => updateSetting('zip_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="90210"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Brand Color
                </label>
                <div className="flex gap-2 mb-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateSetting('brand_color', color.value)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        settings.brand_color === color.value ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={settings.brand_color}
                  onChange={(e) => updateSetting('brand_color', e.target.value)}
                  className="w-20 h-8 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={settings.logo_url}
                  onChange={(e) => updateSetting('logo_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload your logo to a service like Imgur or use your website URL
                </p>
              </div>
            </div>
          )}

          {/* Other tabs would be implemented similarly */}
          {(activeTab === 'hours' || activeTab === 'seo') && (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>This section is coming soon!</p>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-4 sticky top-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Website Preview</h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-2 py-1 text-xs rounded ${previewMode === 'desktop' ? 'bg-purple-100 text-purple-800' : 'text-gray-500'}`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-2 py-1 text-xs rounded ${previewMode === 'mobile' ? 'bg-purple-100 text-purple-800' : 'text-gray-500'}`}
                >
                  Mobile
                </button>
              </div>
            </div>
            
            <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${previewMode === 'mobile' ? 'max-w-xs mx-auto' : ''}`}>
              {/* Mock Website Preview */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4" style={{ backgroundColor: settings.brand_color + '20' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <BuildingStorefrontIcon className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 text-sm">
                      {settings.name || 'Your Shop Name'}
                    </h5>
                    {settings.tagline && (
                      <p className="text-xs text-gray-600">{settings.tagline}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-3">
                {settings.description && (
                  <p className="text-xs text-gray-700 mb-2">
                    {settings.description.length > 60 ? settings.description.substring(0, 60) + '...' : settings.description}
                  </p>
                )}
                
                <div className="space-y-1 text-xs text-gray-600">
                  {settings.phone && <p>📞 {settings.phone}</p>}
                  {settings.address && <p>📍 {settings.address}</p>}
                  {settings.email && <p>✉️ {settings.email}</p>}
                </div>
                
                <button
                  className="w-full mt-3 px-3 py-1.5 text-xs font-medium text-white rounded"
                  style={{ backgroundColor: settings.brand_color }}
                >
                  Book Appointment
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Preview of your booking website
            </p>
          </div>
        </div>
      </div>

      {/* Save Section */}
      <div className="pt-4 border-t border-gray-200">
        {message.text && (
          <div className={`mb-3 p-2 rounded flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
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
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {saving && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          )}
          {saving ? 'Saving...' : 'Save Website'}
        </button>
      </div>
    </div>
  )
}
'use client'

import {
  BuildingStorefrontIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  XMarkIcon,
  PhotoIcon,
  CalendarDaysIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import ConfirmationDialog, { SaveChangesDialog, DiscardChangesDialog } from '@/components/ui/ConfirmationDialog'
import ImageUpload, { uploadImageToService } from '@/components/ui/ImageUpload'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { getTenant } from '@/lib/tenant-resolver-client'

export default function BarbershopWebsiteCustomization({ onUnsavedChanges }) {
  const { user: _user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [previewMode, setPreviewMode] = useState('desktop')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [originalSettings, setOriginalSettings] = useState({})
  
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
    tiktok_url: '',
    
    // Branding
    logo_url: '',
    hero_image_url: '',
    gallery_images: [],
    brand_color: '#4F46E5',
    secondary_color: '#10B981',
    accent_color: '#F59E0B',
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
    show_reviews: true,
    auto_confirm_bookings: false,
    booking_lead_time: 60, // minutes
    max_advance_booking: 30, // days
    
    // SEO & Marketing
    meta_description: '',
    keywords: [],
    google_analytics_id: '',
    facebook_pixel_id: '',
    custom_css: '',
    
    // Features
    services_offered: [],
    team_members: [],
    testimonials: [],
    special_offers: []
  })

  // Detect unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)
    setHasUnsavedChanges(hasChanges)
    if (onUnsavedChanges) {
      onUnsavedChanges(hasChanges)
    }
  }, [settings, originalSettings]) // Remove onUnsavedChanges to prevent infinite loop

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || !user) return

    const autoSaveTimer = setTimeout(() => {
      handleAutoSave()
    }, 5000) // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(autoSaveTimer)
  }, [hasUnsavedChanges, user, handleAutoSave]) // Removed settings to prevent infinite loop

  const handleAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return
    
    try {
      setAutoSaving(true)
      await saveToDatabase()
      setMessage({ type: 'info', text: 'Changes auto-saved' })
      setTimeout(() => setMessage({ type: '', text: '' }), 2000)
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setAutoSaving(false)
    }
  }, [hasUnsavedChanges, saveToDatabase, setMessage, setAutoSaving])

  const _supabase = createClient()

  const tabs = [
    { id: 'general', name: 'General Info', icon: BuildingStorefrontIcon, description: 'Basic business details' },
    { id: 'branding', name: 'Branding', icon: PaintBrushIcon, description: 'Logo, colors & style' },
    { id: 'gallery', name: 'Photos', icon: PhotoIcon, description: 'Hero & gallery images' },
    { id: 'hours', name: 'Hours & Booking', icon: CalendarDaysIcon, description: 'Schedule & settings' },
    { id: 'seo', name: 'SEO & Marketing', icon: GlobeAltIcon, description: 'Online visibility' }
  ]

  const colorOptions = [
    { name: 'Professional Blue', value: '#4F46E5', secondary: '#1E40AF' },
    { name: 'Success Green', value: '#10B981', secondary: '#047857' },
    { name: 'Royal Purple', value: '#8B5CF6', secondary: '#7C3AED' },
    { name: 'Classic Black', value: '#1F2937', secondary: '#374151' },
    { name: 'Warm Orange', value: '#F97316', secondary: '#EA580C' },
    { name: 'Modern Teal', value: '#14B8A6', secondary: '#0D9488' }
  ]

  const fontOptions = [
    { name: 'Inter (Modern)', value: 'Inter' },
    { name: 'Roboto (Clean)', value: 'Roboto' },
    { name: 'Open Sans (Friendly)', value: 'Open Sans' },
    { name: 'Montserrat (Bold)', value: 'Montserrat' },
    { name: 'Playfair (Elegant)', value: 'Playfair Display' }
  ]

  const loadBarbershopSettings = useCallback(async () => {
    if (!user) return

    try {
      // Get user's barbershop
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      let barbershopId
      try {
        const result = await getTenant(profile.id, { supabase })
        barbershopId = result.barbershopId
      } catch (error) {
        console.error('Error getting barbershop ID:', error)
        return
      }
      
      if (!barbershopId) return
      
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .single()

      if (barbershop) {
        const loadedSettings = {
          ...settings,
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
          instagram_url: barbershop.instagram_url || '',
          facebook_url: barbershop.facebook_url || '',
          tiktok_url: barbershop.tiktok_url || '',
          logo_url: barbershop.logo_url || '',
          hero_image_url: barbershop.hero_image_url || '',
          gallery_images: barbershop.gallery_images || [],
          brand_color: barbershop.brand_color || '#4F46E5',
          secondary_color: barbershop.secondary_color || '#10B981',
          accent_color: barbershop.accent_color || '#F59E0B',
          font_family: barbershop.font_family || 'Inter',
          business_hours: barbershop.business_hours || settings.business_hours,
          online_booking_enabled: barbershop.online_booking_enabled !== false,
          show_prices: barbershop.show_prices !== false,
          show_reviews: barbershop.show_reviews !== false,
          auto_confirm_bookings: barbershop.auto_confirm_bookings === true,
          booking_lead_time: barbershop.booking_lead_time || 60,
          max_advance_booking: barbershop.max_advance_booking || 30,
          meta_description: barbershop.meta_description || '',
          keywords: barbershop.keywords || [],
          services_offered: barbershop.services_offered || [],
          team_members: barbershop.team_members || []
        }
        setSettings(loadedSettings)
        setOriginalSettings(JSON.parse(JSON.stringify(loadedSettings)))
      }
    } catch (error) {
      console.error('Error loading barbershop settings:', error)
    }
  }, [user])

  useEffect(() => {
    loadBarbershopSettings()
  }, [user, loadBarbershopSettings])

  const saveToDatabase = async () => {
    if (!user) return

    // Get shop ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('Profile not found')
    }

    let barbershopId
    try {
      const result = await getTenant(profile.id, { supabase })
      barbershopId = result.barbershopId
    } catch (error) {
      console.error('Error getting barbershop ID:', error)
      throw new Error('No barbershop associated with your account')
    }
    
    if (!barbershopId) {
      throw new Error('No barbershop associated with your account')
    }

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
        instagram_url: settings.instagram_url,
        facebook_url: settings.facebook_url,
        tiktok_url: settings.tiktok_url,
        logo_url: settings.logo_url,
        hero_image_url: settings.hero_image_url,
        gallery_images: settings.gallery_images,
        brand_color: settings.brand_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
        font_family: settings.font_family,
        business_hours: settings.business_hours,
        online_booking_enabled: settings.online_booking_enabled,
        show_prices: settings.show_prices,
        show_reviews: settings.show_reviews,
        auto_confirm_bookings: settings.auto_confirm_bookings,
        booking_lead_time: settings.booking_lead_time,
        max_advance_booking: settings.max_advance_booking,
        meta_description: settings.meta_description,
        keywords: settings.keywords,
        services_offered: settings.services_offered,
        team_members: settings.team_members,
        updated_at: new Date().toISOString()
      })
      .eq('id', barbershopId)

    if (error) throw error
    
    // Update original settings to reflect saved state
    setOriginalSettings(JSON.parse(JSON.stringify(settings)))
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })
      
      await saveToDatabase()

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

  const handleImageUpload = async (file) => {
    try {
      // In a real implementation, you would upload to your storage service
      const mockUrl = URL.createObjectURL(file)
      return mockUrl
    } catch (error) {
      throw new Error('Failed to upload image')
    }
  }

  const handleLogoUpload = async (file) => {
    try {
      const url = await handleImageUpload(file)
      updateSetting('logo_url', url)
      return url
    } catch (error) {
      throw new Error('Failed to upload logo')
    }
  }

  const handleHeroUpload = async (file) => {
    try {
      const url = await handleImageUpload(file)
      updateSetting('hero_image_url', url)
      return url
    } catch (error) {
      throw new Error('Failed to upload hero image')
    }
  }

  const handleGalleryUpload = async (file) => {
    try {
      const url = await handleImageUpload(file)
      const newImages = [...settings.gallery_images, url]
      updateSetting('gallery_images', newImages)
      return url
    } catch (error) {
      throw new Error('Failed to upload gallery image')
    }
  }

  const handleDiscard = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings)))
    setShowDiscardDialog(false)
    setMessage({ type: 'info', text: 'Changes discarded' })
    setTimeout(() => setMessage({ type: '', text: '' }), 2000)
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const navigateToSettings = (path) => {
    router.push(`/shop/settings/${path}`)
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

          {/* Hours & Booking Tab */}
          {activeTab === 'hours' && (
            <div className="space-y-6">
              <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Business Hours & Booking Settings</h4>
                <p className="text-gray-600 mb-4">
                  Configure your operating hours and booking preferences in the dedicated settings pages.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => navigateToSettings('hours')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ClockIcon className="h-4 w-4 mr-2" />
                    Business Hours
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-2" />
                  </button>
                  <button
                    onClick={() => navigateToSettings('booking')}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CalendarDaysIcon className="h-4 w-4 mr-2" />
                    Booking Settings
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>

              {/* Preview of current business hours if available */}
              {settings.business_hours && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Current Business Hours Preview</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(settings.business_hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between py-1">
                        <span className="capitalize text-gray-600">{day}:</span>
                        <span className="text-gray-900">
                          {!hours.is_open ? 'Closed' : `${hours.open} - ${hours.close}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEO & Marketing Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">SEO & Marketing Settings</h4>
                <p className="text-gray-600 mb-4">
                  Basic SEO settings for your website. More advanced marketing tools coming soon!
                </p>
              </div>

              {/* Basic SEO Form */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={settings.meta_description}
                    onChange={(e) => updateSetting('meta_description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of your barbershop for search engines..."
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {settings.meta_description.length}/160 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    value={settings.keywords.join(', ')}
                    onChange={(e) => updateSetting('keywords', e.target.value.split(',').map(k => k.trim()))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="barbershop, haircuts, beard trim, your city"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Keywords help search engines understand your business
                  </p>
                </div>
              </div>
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
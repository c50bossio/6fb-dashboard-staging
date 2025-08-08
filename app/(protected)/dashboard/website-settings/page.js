'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import {
  PaintBrushIcon,
  PhotoIcon,
  GlobeAltIcon,
  EyeIcon,
  Cog6ToothIcon,
  ClipboardIcon,
  CheckIcon,
  CloudArrowUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function WebsiteSettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [settings, setSettings] = useState({
    // Basic Info
    name: '',
    tagline: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    
    // Branding
    logo_url: '',
    cover_image_url: '',
    brand_colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#10B981',
      text: '#1F2937',
      background: '#FFFFFF'
    },
    custom_fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    theme_preset: 'default',
    
    // Content
    hero_title: '',
    hero_subtitle: '',
    about_text: '',
    
    // Settings
    website_enabled: true,
    shop_slug: '',
    
    // Social Links
    social_links: {
      instagram: '',
      facebook: '',
      google: '',
      twitter: ''
    },
    
    // SEO
    seo_title: '',
    seo_description: '',
    seo_keywords: ''
  })

  // Get current barbershop ID (demo implementation)
  const [shopId, setShopId] = useState('demo-barbershop')
  
  // In a real implementation, you'd get this from user context or API
  useEffect(() => {
    // For demo purposes, we'll use a fixed shop ID
    // In production, this would come from the authenticated user's barbershop
    setShopId('demo-barbershop')
  }, [])

  // Tabs configuration
  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'branding', name: 'Branding', icon: PaintBrushIcon },
    { id: 'content', name: 'Content', icon: PhotoIcon },
    { id: 'seo', name: 'SEO', icon: GlobeAltIcon },
    { id: 'preview', name: 'Preview', icon: EyeIcon }
  ]

  // Predefined theme presets
  const themePresets = [
    {
      id: 'default',
      name: 'Default',
      colors: { primary: '#3B82F6', secondary: '#1E40AF', accent: '#10B981', text: '#1F2937', background: '#FFFFFF' }
    },
    {
      id: 'classic',
      name: 'Classic Barbershop',
      colors: { primary: '#8B4513', secondary: '#654321', accent: '#DAA520', text: '#2C1810', background: '#FFF8DC' }
    },
    {
      id: 'modern',
      name: 'Modern Minimal',
      colors: { primary: '#000000', secondary: '#4A5568', accent: '#ED8936', text: '#2D3748', background: '#FFFFFF' }
    },
    {
      id: 'premium',
      name: 'Premium Luxury',
      colors: { primary: '#1A202C', secondary: '#2D3748', accent: '#D69E2E', text: '#1A202C', background: '#F7FAFC' }
    }
  ]

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // First, try to create demo data if it doesn't exist
      const demoResponse = await fetch('/api/demo/setup', { method: 'POST' })
      const demoResult = await demoResponse.json()
      
      let actualShopId = shopId
      if (demoResult.shopId) {
        actualShopId = demoResult.shopId
        setShopId(actualShopId)
      }

      const response = await fetch(`/api/customization/${actualShopId}/settings`)
      if (response.ok) {
        const { data } = await response.json()
        setSettings({
          ...settings,
          ...data,
          // Ensure all required fields have defaults
          brand_colors: data.brand_colors || settings.brand_colors,
          custom_fonts: data.custom_fonts || settings.custom_fonts,
          social_links: data.social_links || settings.social_links
        })
        setMessage({ type: 'success', text: 'Settings loaded successfully' })
      } else {
        // If it still fails, use default settings
        setMessage({ type: 'info', text: 'Using default settings - save to create your barbershop profile' })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Using default settings - save to create your profile' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // First create a barbershop record if it doesn't exist
      const createResponse = await fetch('/api/demo/simple-setup', { method: 'POST' })
      const createResult = await createResponse.json()
      
      let actualShopId = shopId
      if (createResult.shopId) {
        actualShopId = createResult.shopId
        setShopId(actualShopId)
      }

      // Then save the settings
      const response = await fetch(`/api/customization/${actualShopId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings: ' + error.message })
    } finally {
      setSaving(false)
      // Clear message after 5 seconds for better UX
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }
  }

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleThemeChange = (themeId) => {
    const theme = themePresets.find(t => t.id === themeId)
    if (theme) {
      setSettings(prev => ({
        ...prev,
        theme_preset: themeId,
        brand_colors: theme.colors
      }))
    }
  }

  const handleFileUpload = async (file, uploadType) => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', uploadType)
    formData.append('shopId', shopId)

    try {
      const response = await fetch('/api/customization/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const { url } = await response.json()
        const fieldName = uploadType === 'logo' ? 'logo_url' : 'cover_image_url'
        handleInputChange(fieldName, url)
        setMessage({ type: 'success', text: 'Image uploaded successfully!' })
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setMessage({ type: 'error', text: 'Failed to upload image' })
    }
  }

  const generateSlug = () => {
    const slug = settings.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    handleInputChange('shop_slug', slug)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Website Settings</h1>
          <p className="text-gray-600 mt-2">Customize your barbershop's website and booking page</p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                )
              })}
            </nav>

            {/* Save Button */}
            <div className="mt-8">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-8">
              
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">General Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        value={settings.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Elite Cuts Barbershop"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tagline
                      </label>
                      <input
                        type="text"
                        value={settings.tagline}
                        onChange={(e) => handleInputChange('tagline', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Premium Cuts, Professional Service"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={settings.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of your barbershop and services..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={settings.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="info@barbershop.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={settings.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="123 Main Street"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={settings.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="New York"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL Slug
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={settings.shop_slug}
                        onChange={(e) => handleInputChange('shop_slug', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your-barbershop"
                      />
                      <button
                        onClick={generateSlug}
                        className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 text-gray-700 font-medium"
                      >
                        Generate
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Your website will be accessible at: yoursite.com/{settings.shop_slug || 'your-slug'}
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.website_enabled}
                      onChange={(e) => handleInputChange('website_enabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Enable public website
                    </label>
                  </div>
                </div>
              )}

              {/* Branding Tab */}
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Branding & Theme</h2>
                  
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo
                    </label>
                    <div className="flex items-start space-x-4">
                      {settings.logo_url && (
                        <div className="relative">
                          <img
                            src={settings.logo_url}
                            alt="Logo"
                            className="w-20 h-20 object-contain border border-gray-200 rounded-lg"
                          />
                          <button
                            onClick={() => handleInputChange('logo_url', '')}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e.target.files[0], 'logo')}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Recommended: 200x200px, PNG or SVG
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hero/Cover Image
                    </label>
                    <div className="space-y-4">
                      {settings.cover_image_url && (
                        <div className="relative">
                          <img
                            src={settings.cover_image_url}
                            alt="Cover"
                            className="w-full h-32 object-cover border border-gray-200 rounded-lg"
                          />
                          <button
                            onClick={() => handleInputChange('cover_image_url', '')}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], 'cover')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="text-sm text-gray-500">
                        Recommended: 1200x400px, high quality image
                      </p>
                    </div>
                  </div>

                  {/* Theme Presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Theme Preset
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {themePresets.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => handleThemeChange(theme.id)}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            settings.theme_preset === theme.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex space-x-1 mb-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: theme.colors.primary }}
                            ></div>
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: theme.colors.secondary }}
                            ></div>
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: theme.colors.accent }}
                            ></div>
                          </div>
                          <p className="text-sm font-medium">{theme.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Custom Colors
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(settings.brand_colors).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm text-gray-600 mb-2 capitalize">
                            {key}
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={value}
                              onChange={(e) => handleInputChange(`brand_colors.${key}`, e.target.value)}
                              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => handleInputChange(`brand_colors.${key}`, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Website Content</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hero Title
                    </label>
                    <input
                      type="text"
                      value={settings.hero_title}
                      onChange={(e) => handleInputChange('hero_title', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Welcome to Elite Cuts Barbershop"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hero Subtitle
                    </label>
                    <input
                      type="text"
                      value={settings.hero_subtitle}
                      onChange={(e) => handleInputChange('hero_subtitle', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Experience professional barbering with master craftsmen"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      About Section
                    </label>
                    <textarea
                      value={settings.about_text}
                      onChange={(e) => handleInputChange('about_text', e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tell your story... What makes your barbershop unique? Share your passion, experience, and commitment to quality."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Social Media Links
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Instagram</label>
                        <input
                          type="url"
                          value={settings.social_links.instagram}
                          onChange={(e) => handleInputChange('social_links.instagram', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://instagram.com/your-barbershop"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Facebook</label>
                        <input
                          type="url"
                          value={settings.social_links.facebook}
                          onChange={(e) => handleInputChange('social_links.facebook', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://facebook.com/your-barbershop"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Google Business</label>
                        <input
                          type="url"
                          value={settings.social_links.google}
                          onChange={(e) => handleInputChange('social_links.google', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://g.page/your-barbershop"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Twitter/X</label>
                        <input
                          type="url"
                          value={settings.social_links.twitter}
                          onChange={(e) => handleInputChange('social_links.twitter', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://twitter.com/your-barbershop"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEO Tab */}
              {activeTab === 'seo' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">SEO Settings</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SEO Title
                    </label>
                    <input
                      type="text"
                      value={settings.seo_title}
                      onChange={(e) => handleInputChange('seo_title', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Elite Cuts Barbershop | Professional Haircuts in Downtown"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Appears in search results and browser tabs (50-60 characters recommended)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meta Description
                    </label>
                    <textarea
                      value={settings.seo_description}
                      onChange={(e) => handleInputChange('seo_description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Experience premium barbering at Elite Cuts. Professional haircuts, modern fades, beard grooming & styling. Book online today!"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Appears in search results below the title (150-160 characters recommended)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Keywords
                    </label>
                    <input
                      type="text"
                      value={settings.seo_keywords}
                      onChange={(e) => handleInputChange('seo_keywords', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="barbershop, haircuts, fade, beard trim, grooming, downtown"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Comma-separated keywords related to your business
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">SEO Tips</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Include your location and main services in the title</li>
                      <li>• Write natural, compelling descriptions that encourage clicks</li>
                      <li>• Use keywords your customers would search for</li>
                      <li>• Keep titles under 60 characters and descriptions under 160</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Live Preview</h2>
                  
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Website Preview</h3>
                    <div 
                      className="bg-white rounded-lg shadow-lg overflow-hidden"
                      style={{ 
                        borderColor: settings.brand_colors.primary,
                        borderWidth: '2px'
                      }}
                    >
                      {/* Preview Header */}
                      <div 
                        className="px-6 py-4 text-white"
                        style={{ backgroundColor: settings.brand_colors.primary }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {settings.logo_url && (
                              <img 
                                src={settings.logo_url} 
                                alt="Logo" 
                                className="h-8 w-8 object-contain"
                              />
                            )}
                            <h1 className="text-xl font-bold">{settings.name || 'Your Barbershop'}</h1>
                          </div>
                        </div>
                      </div>
                      
                      {/* Preview Hero */}
                      <div 
                        className="px-6 py-12 text-center"
                        style={{ 
                          backgroundColor: settings.brand_colors.background,
                          color: settings.brand_colors.text,
                          backgroundImage: settings.cover_image_url ? `url(${settings.cover_image_url})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        <h2 className="text-3xl font-bold mb-4">
                          {settings.hero_title || settings.name || 'Welcome to Your Barbershop'}
                        </h2>
                        <p className="text-lg mb-6">
                          {settings.hero_subtitle || settings.tagline || 'Professional barbering services'}
                        </p>
                        <button 
                          className="px-6 py-3 rounded-lg font-semibold text-white transition-colors"
                          style={{ backgroundColor: settings.brand_colors.accent }}
                        >
                          Book Appointment
                        </button>
                      </div>
                      
                      {/* Preview About */}
                      <div className="px-6 py-8">
                        <h3 className="text-2xl font-bold mb-4" style={{ color: settings.brand_colors.text }}>
                          About Us
                        </h3>
                        <p style={{ color: settings.brand_colors.text }}>
                          {settings.about_text || settings.description || 'Professional barbering services with attention to detail and customer satisfaction.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preview Links */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Preview Your Website</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ClipboardIcon className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-700">
                            {typeof window !== 'undefined' ? window.location.origin : 'localhost:9999'}/barbershop/{settings.shop_slug || 'your-slug'}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const url = `${typeof window !== 'undefined' ? window.location.origin : 'localhost:9999'}/barbershop/${settings.shop_slug || 'your-slug'}`
                            navigator.clipboard.writeText(url)
                            setMessage({ type: 'success', text: 'URL copied to clipboard!' })
                            setTimeout(() => setMessage({ type: '', text: '' }), 2000)
                          }}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            // Save current settings to localStorage for preview
                            localStorage.setItem('preview-barbershop', JSON.stringify(settings))
                            // Open preview page
                            window.open('/barbershop/preview', '_blank')
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          🔗 View Live Preview →
                        </button>
                        <button
                          onClick={() => {
                            const previewUrl = `${typeof window !== 'undefined' ? window.location.origin : 'localhost:9999'}/barbershop/preview`
                            navigator.clipboard.writeText(previewUrl)
                            setMessage({ type: 'success', text: 'Preview URL copied to clipboard!' })
                            setTimeout(() => setMessage({ type: '', text: '' }), 2000)
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          📋 Copy Preview Link →
                        </button>
                      </div>
                      {!settings.shop_slug && (
                        <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          💡 Tip: Generate a URL slug in the General tab to create your preview link
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
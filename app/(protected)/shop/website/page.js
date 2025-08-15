'use client'

import {
  PaintBrushIcon,
  PhotoIcon,
  GlobeAltIcon,
  EyeIcon,
  Cog6ToothIcon,
  UsersIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  CheckIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  HomeIcon,
  SparklesIcon,
  CalendarDaysIcon,
  StarIcon,
  ChatBubbleBottomCenterTextIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function ShopWebsiteCustomization() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [previewMode, setPreviewMode] = useState('desktop')
  
  const [settings, setSettings] = useState({
    name: 'Elite Cuts Barbershop',
    tagline: 'Where Style Meets Precision',
    description: 'Premier barbershop offering classic cuts and modern styles',
    slug: 'elite-cuts',
    
    phone: '(555) 123-4567',
    email: 'info@elitecuts.com',
    address: '123 Main Street',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90001',
    
    business_hours: {
      monday: { open: '09:00', close: '19:00', closed: false },
      tuesday: { open: '09:00', close: '19:00', closed: false },
      wednesday: { open: '09:00', close: '19:00', closed: false },
      thursday: { open: '09:00', close: '20:00', closed: false },
      friday: { open: '09:00', close: '20:00', closed: false },
      saturday: { open: '08:00', close: '18:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: false }
    },
    
    logo_url: '',
    favicon_url: '',
    cover_image_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    accent_color: '#10B981',
    text_color: '#1F2937',
    background_color: '#FFFFFF',
    heading_font: 'Inter',
    body_font: 'Inter',
    theme_template: 'modern',
    
    hero_title: 'Welcome to Elite Cuts',
    hero_subtitle: 'Experience the perfect blend of traditional barbering and modern style',
    hero_cta_text: 'Book Your Appointment',
    about_title: 'About Our Shop',
    about_content: 'With over 15 years of experience, Elite Cuts has been the go-to barbershop for discerning clients who appreciate quality, precision, and style.',
    services_title: 'Our Services',
    services_description: 'From classic cuts to modern styles, we offer a full range of grooming services',
    team_title: 'Meet Our Barbers',
    team_description: 'Our skilled team of professional barbers are here to give you the perfect look',
    
    enable_online_booking: true,
    show_pricing: true,
    show_portfolio: true,
    show_team: true,
    show_testimonials: true,
    show_barber_pages: true,
    barber_page_template: 'profile',
    booking_widget_position: 'bottom-right',
    
    barber_pages: [
      {
        id: '1',
        name: 'John Martinez',
        slug: 'john-martinez',
        approved: true,
        published: true,
        custom_branding: false
      },
      {
        id: '2',
        name: 'Mike Johnson',
        slug: 'mike-johnson',
        approved: true,
        published: true,
        custom_branding: false
      },
      {
        id: '3',
        name: 'Chris Williams',
        slug: 'chris-williams',
        approved: false,
        published: false,
        custom_branding: true
      }
    ],
    
    instagram_url: 'https://instagram.com/elitecuts',
    facebook_url: 'https://facebook.com/elitecuts',
    google_business_url: 'https://g.page/elitecuts',
    tiktok_url: '',
    youtube_url: '',
    
    seo_title: 'Elite Cuts Barbershop - Premium Haircuts in Los Angeles',
    seo_description: 'Visit Elite Cuts for the best haircuts, beard trims, and grooming services in Los Angeles. Book online today!',
    seo_keywords: 'barbershop, haircut, Los Angeles, beard trim, mens grooming',
    google_analytics_id: '',
    
    require_deposit: false,
    deposit_amount: 25,
    cancellation_policy: 'Cancellations must be made at least 24 hours in advance',
    
    is_published: true,
    maintenance_mode: false,
    maintenance_message: 'We are updating our website. Please check back soon!'
  })

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'branding', name: 'Branding', icon: PaintBrushIcon },
    { id: 'homepage', name: 'Homepage', icon: HomeIcon },
    { id: 'barbers', name: 'Barber Pages', icon: UsersIcon },
    { id: 'booking', name: 'Booking', icon: CalendarDaysIcon },
    { id: 'seo', name: 'SEO & Marketing', icon: MegaphoneIcon },
    { id: 'preview', name: 'Preview', icon: EyeIcon }
  ]

  const themeTemplates = [
    { id: 'modern', name: 'Modern', description: 'Clean and contemporary design' },
    { id: 'classic', name: 'Classic', description: 'Traditional barbershop aesthetic' },
    { id: 'minimal', name: 'Minimal', description: 'Simple and elegant' },
    { id: 'bold', name: 'Bold', description: 'Strong colors and typography' }
  ]

  const fontOptions = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
    'Poppins', 'Raleway', 'Playfair Display', 'Bebas Neue'
  ]

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setMessage({ 
        type: 'success', 
        text: 'Website settings saved successfully!' 
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
        text: settings.is_published ? 'Website unpublished' : 'Website published successfully!' 
      })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update publish status' })
    } finally {
      setSaving(false)
    }
  }

  const handleBarberApproval = (barberId, approved) => {
    setSettings({
      ...settings,
      barber_pages: settings.barber_pages.map(barber =>
        barber.id === barberId ? { ...barber, approved, published: approved } : barber
      )
    })
  }

  const updateBusinessHours = (day, field, value) => {
    setSettings({
      ...settings,
      business_hours: {
        ...settings.business_hours,
        [day]: {
          ...settings.business_hours[day],
          [field]: value
        }
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BuildingStorefrontIcon className="h-6 w-6 text-olive-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Shop Website Customization
              </h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                settings.is_published 
                  ? 'bg-moss-100 text-moss-800' 
                  : 'bg-amber-100 text-amber-900'
              }`}>
                {settings.is_published ? 'Published' : 'Draft'}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open(`/shop/${settings.slug}`, '_blank')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                View Live
              </button>
              
              <button
                onClick={handlePublish}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-olive-600 text-white text-sm font-medium rounded-lg hover:bg-olive-700 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                )}
                {settings.is_published ? 'Unpublish' : 'Publish'}
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

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-olive-500 text-olive-600'
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

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Basic Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shop Name
                    </label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL Slug
                    </label>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">6fb.com/shop/</span>
                      <input
                        type="text"
                        value={settings.slug}
                        onChange={(e) => setSettings({ ...settings, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Contact Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={settings.city}
                        onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={settings.state}
                        onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Business Hours
                </h2>
                
                <div className="space-y-3">
                  {Object.entries(settings.business_hours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize w-24">
                        {day}
                      </span>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={!hours.closed}
                          onChange={(e) => updateBusinessHours(day, 'closed', !e.target.checked)}
                          className="h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        
                        {!hours.closed && (
                          <>
                            <input
                              type="time"
                              value={hours.open}
                              onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={hours.close}
                              onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </>
                        )}
                        
                        {hours.closed && (
                          <span className="text-sm text-gray-500">Closed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Social Media Links
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={settings.instagram_url}
                      onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                      placeholder="https://instagram.com/yourshop"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook
                    </label>
                    <input
                      type="url"
                      value={settings.facebook_url}
                      onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                      placeholder="https://facebook.com/yourshop"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Business
                    </label>
                    <input
                      type="url"
                      value={settings.google_business_url}
                      onChange={(e) => setSettings({ ...settings, google_business_url: e.target.value })}
                      placeholder="https://g.page/yourshop"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Logo & Images
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 cursor-pointer">
                      <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Image
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 cursor-pointer">
                      <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Recommended: 1920x1080px
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Theme Template
                </h2>
                
                <div className="space-y-3">
                  {themeTemplates.map((template) => (
                    <label
                      key={template.id}
                      className={`flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        settings.theme_template === template.id
                          ? 'border-olive-500 bg-indigo-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={template.id}
                        checked={settings.theme_template === template.id}
                        onChange={(e) => setSettings({ ...settings, theme_template: e.target.value })}
                        className="mt-1 h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{template.name}</p>
                        <p className="text-sm text-gray-500">{template.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Color Scheme
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    >
                      {fontOptions.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Body Font
                    </label>
                    <select
                      value={settings.body_font}
                      onChange={(e) => setSettings({ ...settings, body_font: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    >
                      {fontOptions.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Homepage Tab */}
        {activeTab === 'homepage' && (
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Call to Action Text
                    </label>
                    <input
                      type="text"
                      value={settings.hero_cta_text}
                      onChange={(e) => setSettings({ ...settings, hero_cta_text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
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
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={settings.about_title}
                      onChange={(e) => setSettings({ ...settings, about_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      About Content
                    </label>
                    <textarea
                      value={settings.about_content}
                      onChange={(e) => setSettings({ ...settings, about_content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Services Section
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={settings.services_title}
                      onChange={(e) => setSettings({ ...settings, services_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Services Description
                    </label>
                    <textarea
                      value={settings.services_description}
                      onChange={(e) => setSettings({ ...settings, services_description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.show_pricing}
                        onChange={(e) => setSettings({ ...settings, show_pricing: e.target.checked })}
                        className="h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show pricing on website</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Team Section
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={settings.team_title}
                      onChange={(e) => setSettings({ ...settings, team_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team Description
                    </label>
                    <textarea
                      value={settings.team_description}
                      onChange={(e) => setSettings({ ...settings, team_description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.show_team}
                        onChange={(e) => setSettings({ ...settings, show_team: e.target.checked })}
                        className="h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show team section</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.show_portfolio}
                        onChange={(e) => setSettings({ ...settings, show_portfolio: e.target.checked })}
                        className="h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show portfolio gallery</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.show_testimonials}
                        onChange={(e) => setSettings({ ...settings, show_testimonials: e.target.checked })}
                        className="h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show testimonials</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barber Pages Tab */}
        {activeTab === 'barbers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Barber Page Management
                </h2>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.show_barber_pages}
                      onChange={(e) => setSettings({ ...settings, show_barber_pages: e.target.checked })}
                      className="h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable barber pages</span>
                  </label>

                  <select
                    value={settings.barber_page_template}
                    onChange={(e) => setSettings({ ...settings, barber_page_template: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="card">Card Layout</option>
                    <option value="profile">Profile Layout</option>
                    <option value="minimal">Minimal Layout</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {settings.barber_pages.map((barber) => (
                  <div key={barber.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <UsersIcon className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{barber.name}</h3>
                          <p className="text-sm text-gray-500">
                            6fb.com/shop/{settings.slug}/barber/{barber.slug}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {barber.custom_branding && (
                          <span className="px-2 py-1 bg-gold-100 text-gold-700 text-xs font-medium rounded-full">
                            Custom Branding
                          </span>
                        )}

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleBarberApproval(barber.id, !barber.approved)}
                            className={`px-3 py-1 text-sm font-medium rounded-lg ${
                              barber.approved
                                ? 'bg-moss-100 text-moss-800 hover:bg-green-200'
                                : 'bg-amber-100 text-amber-900 hover:bg-yellow-200'
                            }`}
                          >
                            {barber.approved ? 'Approved' : 'Pending'}
                          </button>

                          <button
                            onClick={() => window.open(`/shop/${settings.slug}/barber/${barber.slug}`, '_blank')}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {barber.custom_branding && !barber.approved && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          This barber has requested custom branding for their page. Review and approve their changes.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-olive-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-olive-900 mb-2">
                Barber Page Settings
              </h4>
              <ul className="text-xs text-olive-700 space-y-1">
                <li>• Barbers can customize their individual pages after approval</li>
                <li>• Custom branding allows barbers to use their own colors and styling</li>
                <li>• All pages remain under your shop's domain for better SEO</li>
                <li>• You maintain full control over what gets published</li>
              </ul>
            </div>
          </div>
        )}

        {/* Booking Tab */}
        {activeTab === 'booking' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Booking Settings
                </h2>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enable_online_booking}
                      onChange={(e) => setSettings({ ...settings, enable_online_booking: e.target.checked })}
                      className="h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable online booking</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Booking Widget Position
                    </label>
                    <select
                      value={settings.booking_widget_position}
                      onChange={(e) => setSettings({ ...settings, booking_widget_position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-banner">Top Banner</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.require_deposit}
                      onChange={(e) => setSettings({ ...settings, require_deposit: e.target.checked })}
                      className="h-4 w-4 text-olive-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Require deposit for bookings</span>
                  </label>

                  {settings.require_deposit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deposit Amount
                      </label>
                      <div className="flex items-center">
                        <span className="text-gray-500 mr-2">$</span>
                        <input
                          type="number"
                          value={settings.deposit_amount}
                          onChange={(e) => setSettings({ ...settings, deposit_amount: parseFloat(e.target.value) })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Cancellation Policy
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Policy Text
                    </label>
                    <textarea
                      value={settings.cancellation_policy}
                      onChange={(e) => setSettings({ ...settings, cancellation_policy: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SEO & Marketing Tab */}
        {activeTab === 'seo' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {settings.seo_title.length}/60 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SEO Description
                    </label>
                    <textarea
                      value={settings.seo_description}
                      onChange={(e) => setSettings({ ...settings, seo_description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {settings.seo_description.length}/160 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SEO Keywords
                    </label>
                    <input
                      type="text"
                      value={settings.seo_keywords}
                      onChange={(e) => setSettings({ ...settings, seo_keywords: e.target.value })}
                      placeholder="barbershop, haircut, beard trim, mens grooming"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Analytics & Tracking
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Analytics ID
                    </label>
                    <input
                      type="text"
                      value={settings.google_analytics_id}
                      onChange={(e) => setSettings({ ...settings, google_analytics_id: e.target.value })}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Website Preview
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className={`mx-auto ${previewMode === 'mobile' ? 'max-w-sm' : 'w-full'}`}>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                      <div className="flex-1 bg-white rounded px-3 py-1 text-sm text-gray-600 truncate">
                        6fb.com/shop/{settings.slug}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white" style={{ minHeight: '600px' }}>
                    {/* Hero Section Preview */}
                    <div 
                      className="relative h-64 flex items-center justify-center text-white"
                      style={{ backgroundColor: settings.primary_color }}
                    >
                      <div className="text-center px-4">
                        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: settings.heading_font }}>
                          {settings.hero_title}
                        </h1>
                        <p className="text-lg opacity-90" style={{ fontFamily: settings.body_font }}>
                          {settings.hero_subtitle}
                        </p>
                        <button 
                          className="mt-4 px-6 py-3 rounded-lg font-medium"
                          style={{ backgroundColor: settings.accent_color }}
                        >
                          {settings.hero_cta_text}
                        </button>
                      </div>
                    </div>

                    {/* About Section Preview */}
                    <div className="p-8">
                      <h2 className="text-2xl font-bold mb-4" style={{ color: settings.text_color, fontFamily: settings.heading_font }}>
                        {settings.about_title}
                      </h2>
                      <p className="text-gray-600" style={{ fontFamily: settings.body_font }}>
                        {settings.about_content}
                      </p>
                    </div>

                    {/* Services Section Preview */}
                    {settings.show_team && (
                      <div className="p-8 bg-gray-50">
                        <h2 className="text-2xl font-bold mb-4" style={{ color: settings.text_color, fontFamily: settings.heading_font }}>
                          {settings.services_title}
                        </h2>
                        <p className="text-gray-600 mb-6" style={{ fontFamily: settings.body_font }}>
                          {settings.services_description}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {['Classic Cut', 'Fade', 'Beard Trim'].map((service) => (
                            <div key={service} className="bg-white p-4 rounded-lg shadow">
                              <h3 className="font-medium">{service}</h3>
                              {settings.show_pricing && <p className="text-gray-500">$35</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-olive-50 rounded-lg p-4">
              <p className="text-sm text-olive-700">
                This is a simplified preview. The actual website will include all sections, responsive design, and interactive elements.
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 bg-olive-600 text-white font-medium rounded-lg hover:bg-olive-700 disabled:opacity-50"
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
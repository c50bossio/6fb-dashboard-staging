'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card } from '../ui/card'
import InheritanceIndicator from './InheritanceIndicator'
import SettingsSection from './SettingsSection'
import {
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  ClockIcon,
  CreditCardIcon,
  BellIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline'

export default function UnifiedSettingsInterface() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({})
  const [activeCategory, setActiveCategory] = useState('business_info')
  
  // Settings categories for navigation
  const categories = [
    { id: 'business_info', name: 'Business Info', icon: BuildingStorefrontIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'booking_preferences', name: 'Booking', icon: ClockIcon },
    { id: 'integrations', name: 'Integrations', icon: CreditCardIcon },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon }
  ]

  useEffect(() => {
    if (user && profile) {
      loadSettings()
    }
  }, [user, profile])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // Get barbershop data (primary source for business info)
      const barbershopId = profile?.shop_id || profile?.barbershop_id
      
      if (barbershopId) {
        const { data: barbershop } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', barbershopId)
          .single()
        
        if (barbershop) {
          // Convert barbershop data to unified settings format
          setSettings({
            business_info: {
              name: barbershop.name || '',
              description: barbershop.description || '',
              email: barbershop.email || '',
              phone: barbershop.phone || '',
              website: barbershop.website || '',
              address: barbershop.address || '',
              city: barbershop.city || '',
              state: barbershop.state || '',
              zip_code: barbershop.zip_code || '',
              country: barbershop.country || 'USA'
            },
            notifications: {
              email_reminders: barbershop.email_reminders || false,
              sms_reminders: barbershop.sms_reminders || false,
              booking_notifications: barbershop.booking_notifications || true
            },
            booking_preferences: barbershop.business_hours || {},
            integrations: {
              stripe_connected: false, // TODO: Check stripe_accounts table
              google_calendar: barbershop.google_calendar_enabled || false
            },
            appearance: {
              brand_color: barbershop.brand_color || '#3C4A3E',
              logo_url: barbershop.logo_url || ''
            }
          })
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const barbershopId = profile?.shop_id || profile?.barbershop_id
      
      if (barbershopId && settings.business_info) {
        // Update barbershop table with business info
        await supabase
          .from('barbershops')
          .update({
            name: settings.business_info.name,
            description: settings.business_info.description,
            email: settings.business_info.email,
            phone: settings.business_info.phone,
            website: settings.business_info.website,
            address: settings.business_info.address,
            city: settings.business_info.city,
            state: settings.business_info.state,
            zip_code: settings.business_info.zip_code,
            country: settings.business_info.country,
            brand_color: settings.appearance?.brand_color,
            logo_url: settings.appearance?.logo_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', barbershopId)
      }
      
      // TODO: Implement settings_hierarchy integration for other categories
      
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-12 bg-gray-300 rounded"></div>
              ))}
            </div>
            <div className="lg:col-span-3">
              <div className="h-96 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your barbershop settings and preferences</p>
      </div>

      <InheritanceIndicator 
        category={activeCategory}
        level="user"
        organizationId={null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeCategory === category.id
                      ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {category.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {activeCategory === 'business_info' && (
            <SettingsSection 
              title="Business Information"
              description="Basic information about your barbershop"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={settings.business_info?.name || ''}
                    onChange={(e) => handleSettingChange('business_info', 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.business_info?.email || ''}
                    onChange={(e) => handleSettingChange('business_info', 'email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.business_info?.phone || ''}
                    onChange={(e) => handleSettingChange('business_info', 'phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={settings.business_info?.website || ''}
                    onChange={(e) => handleSettingChange('business_info', 'website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={settings.business_info?.address || ''}
                    onChange={(e) => handleSettingChange('business_info', 'address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={settings.business_info?.city || ''}
                    onChange={(e) => handleSettingChange('business_info', 'city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={settings.business_info?.state || ''}
                    onChange={(e) => handleSettingChange('business_info', 'state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={settings.business_info?.description || ''}
                  onChange={(e) => handleSettingChange('business_info', 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="Tell customers about your barbershop..."
                />
              </div>
            </SettingsSection>
          )}

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
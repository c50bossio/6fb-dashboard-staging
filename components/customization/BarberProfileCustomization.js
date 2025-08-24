'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { 
  UserCircleIcon,
  CalendarDaysIcon,
  SparklesIcon,
  PaintBrushIcon,
  CheckCircleIcon,
  XMarkIcon,
  StarIcon
} from '@heroicons/react/24/outline'

export default function BarberProfileCustomization() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [settings, setSettings] = useState({
    full_name: '',
    bio: '',
    phone: '',
    instagram_handle: '',
    years_experience: 0,
    specializations: [],
    preferred_hours: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '09:00', end: '15:00', available: true },
      sunday: { start: '10:00', end: '14:00', available: false }
    },
    booking_buffer_minutes: 15,
    max_bookings_per_day: 8,
    profile_theme: 'professional',
    show_reviews: true,
    show_experience: true,
    show_specializations: true
  })

  const supabase = createClient()

  const tabs = [
    { id: 'profile', name: 'Profile Info', icon: UserCircleIcon },
    { id: 'availability', name: 'Availability', icon: CalendarDaysIcon },
    { id: 'services', name: 'Specializations', icon: SparklesIcon },
    { id: 'branding', name: 'Profile Theme', icon: PaintBrushIcon }
  ]

  useEffect(() => {
    loadBarberSettings()
  }, [user])

  const loadBarberSettings = async () => {
    if (!user) return

    try {
      // Load from user profile and barbershop_staff
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setSettings(prev => ({
          ...prev,
          full_name: profile.full_name || user.user_metadata?.full_name || '',
          bio: profile.bio || '',
          phone: profile.phone || '',
          years_experience: profile.years_experience || 0,
        }))
      }

    } catch (error) {
      console.error('Error loading barber settings:', error)
    }
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: settings.full_name,
          bio: settings.bio,
          phone: settings.phone,
          years_experience: settings.years_experience,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: 'Profile settings saved successfully!' 
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
                    ? 'border-blue-500 text-blue-600'
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
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.full_name}
                    onChange={(e) => updateSetting('full_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your professional name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    value={settings.years_experience}
                    onChange={(e) => updateSetting('years_experience', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professional Bio
                </label>
                <textarea
                  value={settings.bio}
                  onChange={(e) => updateSetting('bio', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell clients about your experience and specialties..."
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={settings.instagram_handle}
                    onChange={(e) => updateSetting('instagram_handle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="@yourusername"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Specializations Tab */}
          {activeTab === 'services' && (
            <div>
              <h4 className="text-base font-medium text-gray-900 mb-3">
                Select Your Specializations
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  'Classic Cuts', 'Fades', 'Beard Trimming', 'Straight Razor Shaves',
                  'Hair Washing', 'Styling', 'Color Services', 'Kids Cuts',
                  'Senior Cuts', 'Wedding Prep', 'Hot Towel Service', 'Scalp Treatments'
                ].map((specialization) => (
                  <label key={specialization} className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.specializations.includes(specialization)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateSetting('specializations', [...settings.specializations, specialization])
                        } else {
                          updateSetting('specializations', settings.specializations.filter(s => s !== specialization))
                        }
                      }}
                      className="h-3 w-3 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-xs text-gray-700">{specialization}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Other tabs would be implemented similarly */}
          {(activeTab === 'availability' || activeTab === 'branding') && (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>This section is coming soon!</p>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-4 sticky top-0">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Profile Preview</h4>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-center mb-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h5 className="font-medium text-gray-900">
                  {settings.full_name || 'Your Name'}
                </h5>
                {settings.years_experience > 0 && (
                  <p className="text-xs text-gray-600">
                    {settings.years_experience} years experience
                  </p>
                )}
              </div>
              
              {settings.bio && (
                <p className="text-xs text-gray-700 mb-3">
                  {settings.bio.length > 80 ? settings.bio.substring(0, 80) + '...' : settings.bio}
                </p>
              )}
              
              {settings.specializations.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {settings.specializations.slice(0, 2).map((spec) => (
                      <span key={spec} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                        {spec}
                      </span>
                    ))}
                    {settings.specializations.length > 2 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{settings.specializations.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-1 text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} className="h-3 w-3 fill-current" />
                ))}
                <span className="text-xs text-gray-500 ml-1">5.0</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Preview of your customer-facing profile
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2 text-sm"
        >
          {saving && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          )}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
'use client'

import {
  UserCircleIcon,
  PaintBrushIcon,
  CalendarDaysIcon,
  SparklesIcon,
  PhotoIcon,
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  XMarkIcon,
  StarIcon,
  ChatBubbleBottomCenterTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import OnboardingStepBanner from '@/components/onboarding/OnboardingStepBanner'
import { useParams } from 'next/navigation'

export default function BarberSettings() {
  const { user } = useAuth()
  const params = useParams()
  const barbershopId = params.barbershopId

  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [settings, setSettings] = useState({
    // Personal Profile
    full_name: '',
    bio: '',
    profile_image_url: '',
    specializations: [],
    years_experience: 0,
    
    // Contact Preferences
    phone: '',
    email: '',
    instagram_handle: '',
    
    // Availability Preferences
    preferred_hours: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '09:00', end: '15:00', available: true },
      sunday: { start: '10:00', end: '14:00', available: false }
    },
    
    // Service Preferences
    service_preferences: [],
    booking_buffer_minutes: 15,
    max_bookings_per_day: 8,
    
    // Profile Customization
    profile_theme: 'professional',
    show_reviews: true,
    show_experience: true,
    show_specializations: true
  })

  const supabase = createClient()

  const tabs = [
    {
      id: 'profile',
      name: 'Profile',
      icon: UserCircleIcon,
      description: 'Personal information and bio'
    },
    {
      id: 'availability',
      name: 'Availability',
      icon: CalendarDaysIcon,
      description: 'Schedule preferences and hours'
    },
    {
      id: 'services',
      name: 'Services',
      icon: SparklesIcon,
      description: 'Specializations and preferences'
    },
    {
      id: 'branding',
      name: 'Branding',
      icon: PaintBrushIcon,
      description: 'Profile appearance and theme'
    }
  ]

  useEffect(() => {
    loadBarberSettings()
  }, [user, barbershopId])

  const loadBarberSettings = async () => {
    if (!user || !barbershopId) return

    try {
      setLoading(true)
      
      // Load barber profile from barbershop_staff table
      const { data: staffData, error: staffError } = await supabase
        .from('barbershop_staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('barbershop_id', barbershopId)
        .single()

      if (staffError && staffError.code !== 'PGRST116') {
        console.error('Error loading barber data:', staffError)
        return
      }

      if (staffData) {
        setSettings(prev => ({
          ...prev,
          full_name: staffData.full_name || user.user_metadata?.full_name || '',
          bio: staffData.bio || '',
          profile_image_url: staffData.profile_image_url || '',
          phone: staffData.phone || '',
          email: staffData.email || user.email || '',
          years_experience: staffData.years_experience || 0,
          specializations: staffData.specializations || [],
          preferred_hours: staffData.preferred_hours || prev.preferred_hours,
          service_preferences: staffData.service_preferences || [],
          booking_buffer_minutes: staffData.booking_buffer_minutes || 15,
          max_bookings_per_day: staffData.max_bookings_per_day || 8,
          profile_theme: staffData.profile_theme || 'professional',
          show_reviews: staffData.show_reviews !== false,
          show_experience: staffData.show_experience !== false,
          show_specializations: staffData.show_specializations !== false
        }))
      }
    } catch (error) {
      console.error('Error loading barber settings:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to load settings. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !barbershopId) return

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // Update or create barber staff record
      const { error } = await supabase
        .from('barbershop_staff')
        .upsert({
          user_id: user.id,
          barbershop_id: barbershopId,
          full_name: settings.full_name,
          bio: settings.bio,
          profile_image_url: settings.profile_image_url,
          phone: settings.phone,
          email: settings.email,
          years_experience: settings.years_experience,
          specializations: settings.specializations,
          preferred_hours: settings.preferred_hours,
          service_preferences: settings.service_preferences,
          booking_buffer_minutes: settings.booking_buffer_minutes,
          max_bookings_per_day: settings.max_bookings_per_day,
          profile_theme: settings.profile_theme,
          show_reviews: settings.show_reviews,
          show_experience: settings.show_experience,
          show_specializations: settings.show_specializations,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,barbershop_id'
        })

      if (error) {
        throw error
      }

      setMessage({ 
        type: 'success', 
        text: 'Profile settings saved successfully!' 
      })

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' })
      }, 3000)

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
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateNestedSetting = (parent, key, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [key]: value
      }
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingStepBanner currentStep="branding" />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <UserCircleIcon className="h-8 w-8 text-brand-600" />
              Barber Profile Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Customize your profile, availability, and booking preferences
            </p>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                      ${activeTab === tab.id
                        ? 'border-brand-500 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={settings.full_name}
                            onChange={(e) => updateSetting('full_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="Your professional name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Years of Experience
                          </label>
                          <input
                            type="number"
                            value={settings.years_experience}
                            onChange={(e) => updateSetting('years_experience', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="5"
                            min="0"
                            max="50"
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Professional Bio
                        </label>
                        <textarea
                          value={settings.bio}
                          onChange={(e) => updateSetting('bio', e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="Tell clients about your experience, specialties, and what makes you unique..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={settings.phone}
                            onChange={(e) => updateSetting('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Instagram Handle
                          </label>
                          <input
                            type="text"
                            value={settings.instagram_handle}
                            onChange={(e) => updateSetting('instagram_handle', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="@yourusername"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Availability Tab */}
                {activeTab === 'availability' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferred Working Hours</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Set your preferred availability. Your manager can still schedule you outside these hours.
                      </p>
                      
                      <div className="space-y-4">
                        {Object.entries(settings.preferred_hours).map(([day, hours]) => (
                          <div key={day} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                            <div className="w-20">
                              <label className="block text-sm font-medium text-gray-700 capitalize">
                                {day}
                              </label>
                            </div>
                            
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={hours.available}
                                onChange={(e) => updateNestedSetting('preferred_hours', day, {
                                  ...hours,
                                  available: e.target.checked
                                })}
                                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-600">Available</span>
                            </label>
                            
                            {hours.available && (
                              <>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="time"
                                    value={hours.start}
                                    onChange={(e) => updateNestedSetting('preferred_hours', day, {
                                      ...hours,
                                      start: e.target.value
                                    })}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                  />
                                  <span className="text-gray-500">to</span>
                                  <input
                                    type="time"
                                    value={hours.end}
                                    onChange={(e) => updateNestedSetting('preferred_hours', day, {
                                      ...hours,
                                      end: e.target.value
                                    })}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Buffer Time Between Appointments
                        </label>
                        <select
                          value={settings.booking_buffer_minutes}
                          onChange={(e) => updateSetting('booking_buffer_minutes', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        >
                          <option value={0}>No buffer</option>
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Bookings Per Day
                        </label>
                        <input
                          type="number"
                          value={settings.max_bookings_per_day}
                          onChange={(e) => updateSetting('max_bookings_per_day', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          min="1"
                          max="20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Services Tab */}
                {activeTab === 'services' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Specializations</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Select your areas of expertise. These will be displayed on your profile.
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          'Classic Cuts', 'Fades', 'Beard Trimming', 'Straight Razor Shaves',
                          'Hair Washing', 'Styling', 'Color Services', 'Kids Cuts',
                          'Senior Cuts', 'Wedding Prep', 'Hot Towel Service', 'Scalp Treatments'
                        ].map((specialization) => (
                          <label key={specialization} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{specialization}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Branding Tab */}
                {activeTab === 'branding' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Appearance</h3>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-4">
                            Profile Display Options
                          </label>
                          
                          <div className="space-y-3">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={settings.show_reviews}
                                onChange={(e) => updateSetting('show_reviews', e.target.checked)}
                                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                              />
                              <span className="ml-3 text-sm text-gray-700">Show customer reviews and ratings</span>
                            </label>
                            
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={settings.show_experience}
                                onChange={(e) => updateSetting('show_experience', e.target.checked)}
                                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                              />
                              <span className="ml-3 text-sm text-gray-700">Display years of experience</span>
                            </label>
                            
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={settings.show_specializations}
                                onChange={(e) => updateSetting('show_specializations', e.target.checked)}
                                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                              />
                              <span className="ml-3 text-sm text-gray-700">Show specializations and skills</span>
                            </label>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Profile Theme
                          </label>
                          <select
                            value={settings.profile_theme}
                            onChange={(e) => updateSetting('profile_theme', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          >
                            <option value="professional">Professional</option>
                            <option value="modern">Modern</option>
                            <option value="classic">Classic</option>
                            <option value="minimal">Minimal</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  {message.text && (
                    <div className={`mb-4 p-3 rounded-md flex items-center gap-2 ${
                      message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      {message.type === 'success' ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <XMarkIcon className="h-5 w-5" />
                      )}
                      {message.text}
                    </div>
                  )}
                  
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-brand-600 text-white px-6 py-2 rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <EyeIcon className="h-5 w-5" />
                  Profile Preview
                </h3>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <UserCircleIcon className="h-10 w-10 text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      {settings.full_name || 'Your Name'}
                    </h4>
                    {settings.show_experience && settings.years_experience > 0 && (
                      <p className="text-sm text-gray-600">
                        {settings.years_experience} years experience
                      </p>
                    )}
                  </div>
                  
                  {settings.bio && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-700">
                        {settings.bio.length > 100 
                          ? settings.bio.substring(0, 100) + '...' 
                          : settings.bio
                        }
                      </p>
                    </div>
                  )}
                  
                  {settings.show_specializations && settings.specializations.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Specializations</h5>
                      <div className="flex flex-wrap gap-1">
                        {settings.specializations.slice(0, 3).map((spec) => (
                          <span key={spec} className="px-2 py-1 bg-brand-100 text-brand-800 text-xs rounded-full">
                            {spec}
                          </span>
                        ))}
                        {settings.specializations.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{settings.specializations.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {settings.show_reviews && (
                    <div className="flex items-center justify-center gap-1 text-yellow-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon key={star} className="h-4 w-4 fill-current" />
                      ))}
                      <span className="text-sm text-gray-600 ml-1">5.0 (12 reviews)</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mt-3">
                  This is how customers will see your profile when booking appointments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
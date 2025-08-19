'use client'

import { 
  UserCircleIcon,
  PaintBrushIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import ReviewsList from '@/components/reviews/ReviewsList'
import ReviewStats from '@/components/reviews/ReviewStats'
import useReviews from '@/hooks/useReviews'

export default function BarberProfilePage() {
  const { user, profile: userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('basic')
  
  // Get reviews for this barber
  const { 
    reviews, 
    stats: reviewStats, 
    loading: reviewsLoading,
    refreshReviews 
  } = useReviews({ 
    barberId: userProfile?.id,
    autoLoad: true 
  })
  const [profile, setProfile] = useState({
    custom_path: '',
    page_title: '',
    meta_description: '',
    bio: '',
    years_experience: 0,
    specialties: [],
    certifications: [],
    languages_spoken: [],
    
    primary_color: '#000000',
    secondary_color: '#FFFFFF',
    accent_color: '#FFD700',
    font_family: 'Inter',
    background_image_url: '',
    logo_url: '',
    
    display_phone: '',
    display_email: '',
    instagram_handle: '',
    tiktok_handle: '',
    facebook_url: '',
    youtube_url: '',
    
    accepts_walk_ins: false,
    booking_advance_days: 30,
    minimum_notice_hours: 24,
    cancellation_policy: '',
    deposit_required: false,
    deposit_amount: 0,
    
    portfolio_images: [],
    before_after_images: [],
    featured_work: []
  })
  
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadProfile()
    loadServices()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/barber/profile')
      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          setProfile(data.profile)
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  const loadServices = async () => {
    try {
      const response = await fetch('/api/barber/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Failed to load services:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/barber/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully!' })
      } else {
        throw new Error('Failed to save profile')
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      setMessage({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayInput = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean)
    setProfile(prev => ({ ...prev, [field]: items }))
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: UserCircleIcon },
    { id: 'branding', label: 'Branding', icon: PaintBrushIcon },
    { id: 'services', label: 'Services', icon: CurrencyDollarIcon },
    { id: 'availability', label: 'Availability', icon: CalendarDaysIcon },
    { id: 'portfolio', label: 'Portfolio', icon: PhotoIcon },
    { id: 'reviews', label: 'My Reviews', icon: ChatBubbleLeftRightIcon },
    { id: 'social', label: 'Social Links', icon: LinkIcon }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Barber Profile Management</h1>
          <p className="text-gray-600 mt-2">
            Customize your professional profile and landing page. Your page will be available at:
            <span className="font-mono text-amber-700 ml-2">
              barbershop.com/{profile.custom_path || 'your-name'}
            </span>
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-amber-500 text-amber-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom URL Path
                    </label>
                    <input
                      type="text"
                      value={profile.custom_path}
                      onChange={(e) => handleInputChange('custom_path', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="john-doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Letters, numbers, and hyphens only</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={profile.years_experience}
                      onChange={(e) => handleInputChange('years_experience', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Tell clients about your experience, style, and what makes you unique..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialties (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={profile.specialties?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('specialties', e.target.value)}
                    placeholder="Fades, Beard Sculpting, Hair Design, Kids Cuts"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certifications (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={profile.certifications?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('certifications', e.target.value)}
                    placeholder="Master Barber, Color Specialist, Safety Certified"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Languages Spoken (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={profile.languages_spoken?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('languages_spoken', e.target.value)}
                    placeholder="English, Spanish, French"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={profile.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={profile.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={profile.secondary_color}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={profile.secondary_color}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accent Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={profile.accent_color}
                        onChange={(e) => handleInputChange('accent_color', e.target.value)}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={profile.accent_color}
                        onChange={(e) => handleInputChange('accent_color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Family
                  </label>
                  <select
                    value={profile.font_family}
                    onChange={(e) => handleInputChange('font_family', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="Inter">Inter (Modern & Clean)</option>
                    <option value="Roboto">Roboto (Professional)</option>
                    <option value="Playfair Display">Playfair Display (Elegant)</option>
                    <option value="Montserrat">Montserrat (Bold)</option>
                    <option value="Open Sans">Open Sans (Friendly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Image URL
                  </label>
                  <input
                    type="url"
                    value={profile.background_image_url}
                    onChange={(e) => handleInputChange('background_image_url', e.target.value)}
                    placeholder="https://example.com/background.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={profile.logo_url}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Preview */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Preview</h3>
                  <div 
                    className="h-32 rounded-lg p-4"
                    style={{
                      backgroundColor: profile.primary_color,
                      color: profile.secondary_color,
                      fontFamily: profile.font_family
                    }}
                  >
                    <p className="text-lg font-bold">Your Brand Preview</p>
                    <p style={{ color: profile.accent_color }}>Accent elements will appear like this</p>
                  </div>
                </div>
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Your Services</h3>
                  <button className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-700">
                    Add Service
                  </button>
                </div>

                {services.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">No services added yet</p>
                    <p className="text-xs text-gray-500 mt-1">Add your first service to start accepting bookings</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {services.map((service, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{service.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm text-gray-500">
                                Duration: {service.duration_minutes} min
                              </span>
                              <span className="text-sm font-medium text-amber-700">
                                ${service.price}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button className="text-olive-600 hover:text-olive-800">Edit</button>
                            <button className="text-red-600 hover:text-red-800">Remove</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Advance Booking Days
                    </label>
                    <input
                      type="number"
                      value={profile.booking_advance_days}
                      onChange={(e) => handleInputChange('booking_advance_days', parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">How far in advance clients can book</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Notice Hours
                    </label>
                    <input
                      type="number"
                      value={profile.minimum_notice_hours}
                      onChange={(e) => handleInputChange('minimum_notice_hours', parseInt(e.target.value) || 24)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum hours before appointment time</p>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={profile.accepts_walk_ins}
                      onChange={(e) => handleInputChange('accepts_walk_ins', e.target.checked)}
                      className="h-4 w-4 text-amber-700 focus:ring-amber-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Accept Walk-ins</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation Policy
                  </label>
                  <textarea
                    value={profile.cancellation_policy}
                    onChange={(e) => handleInputChange('cancellation_policy', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Describe your cancellation policy..."
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={profile.deposit_required}
                      onChange={(e) => handleInputChange('deposit_required', e.target.checked)}
                      className="h-4 w-4 text-amber-700 focus:ring-amber-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Require Deposit</span>
                  </label>
                  
                  {profile.deposit_required && (
                    <div className="mt-3 ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deposit Amount
                      </label>
                      <div className="flex items-center">
                        <span className="mr-2">$</span>
                        <input
                          type="number"
                          value={profile.deposit_amount}
                          onChange={(e) => handleInputChange('deposit_amount', parseFloat(e.target.value) || 0)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
              <div className="space-y-6">
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Upload your best work</p>
                  <button className="mt-4 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-700">
                    Upload Images
                  </button>
                </div>
                
                <p className="text-sm text-gray-500">
                  Portfolio features coming soon. You'll be able to upload before/after photos, 
                  showcase your best work, and build a gallery that attracts new clients.
                </p>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Review Stats */}
                <ReviewStats 
                  stats={reviewStats} 
                  showTrends={false}
                  compact={false}
                />
                
                {/* Reviews List */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Customer Reviews</h3>
                    <button 
                      onClick={refreshReviews}
                      className="px-4 py-2 text-sm bg-olive-600 text-white rounded-lg hover:bg-olive-700"
                    >
                      Sync Reviews
                    </button>
                  </div>
                  
                  <ReviewsList
                    reviews={reviews}
                    loading={reviewsLoading}
                    onRefresh={refreshReviews}
                    showFilters={false}
                    showSearch={true}
                    showAttribution={true}
                    compact={false}
                  />
                  
                  {reviews.length === 0 && !reviewsLoading && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
                      <h4 className="text-yellow-900 font-medium mb-2">No Reviews Yet</h4>
                      <p className="text-yellow-700 text-sm">
                        Reviews from Google My Business that mention your name or are attributed to you will appear here.
                        Make sure your barbershop has connected their Google My Business account.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Social Links Tab */}
            {activeTab === 'social' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profile.display_phone}
                      onChange={(e) => handleInputChange('display_phone', e.target.value)}
                      placeholder="(555) 000-0000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Email
                    </label>
                    <input
                      type="email"
                      value={profile.display_email}
                      onChange={(e) => handleInputChange('display_email', e.target.value)}
                      placeholder="john@barbershop.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instagram Handle
                    </label>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">@</span>
                      <input
                        type="text"
                        value={profile.instagram_handle}
                        onChange={(e) => handleInputChange('instagram_handle', e.target.value)}
                        placeholder="johndoebarber"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TikTok Handle
                    </label>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">@</span>
                      <input
                        type="text"
                        value={profile.tiktok_handle}
                        onChange={(e) => handleInputChange('tiktok_handle', e.target.value)}
                        placeholder="johndoecuts"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={profile.facebook_url}
                      onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                      placeholder="https://facebook.com/johndoebarber"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YouTube URL
                    </label>
                    <input
                      type="url"
                      value={profile.youtube_url}
                      onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                      placeholder="https://youtube.com/@johndoebarber"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => window.open(`/preview/${profile.custom_path || 'preview'}`, '_blank')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Preview Page
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
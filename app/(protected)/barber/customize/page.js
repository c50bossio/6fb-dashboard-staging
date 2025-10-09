'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import {
  UserCircleIcon,
  PaintBrushIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  XCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function BarberCustomizePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [isNewCustomization, setIsNewCustomization] = useState(true)

  const [customization, setCustomization] = useState({
    custom_url_slug: '',
    display_name: '',
    bio: '',
    profile_image_url: '',
    cover_image_url: '',
    specialties: [],
    social_media_links: {
      instagram: '',
      facebook: '',
      tiktok: '',
      twitter: '',
      youtube: ''
    },
    custom_brand_color: '#F59E0B',
    is_accepting_bookings: true
  })

  const [approvalStatus, setApprovalStatus] = useState({
    is_approved: false,
    approved_at: null,
    approved_by_name: null,
    rejection_reason: null
  })

  useEffect(() => {
    loadCustomization()
  }, [])

  const loadCustomization = async () => {
    try {
      const response = await fetch('/api/barber/customization')

      if (response.ok) {
        const data = await response.json()

        if (data.customization) {
          setIsNewCustomization(false)
          setCustomization({
            custom_url_slug: data.customization.custom_url_slug || '',
            display_name: data.customization.display_name || '',
            bio: data.customization.bio || '',
            profile_image_url: data.customization.profile_image_url || '',
            cover_image_url: data.customization.cover_image_url || '',
            specialties: data.customization.specialties || [],
            social_media_links: data.customization.social_media_links || {
              instagram: '',
              facebook: '',
              tiktok: '',
              twitter: '',
              youtube: ''
            },
            custom_brand_color: data.customization.custom_brand_color || '#F59E0B',
            is_accepting_bookings: data.customization.is_accepting_bookings ?? true
          })

          setApprovalStatus({
            is_approved: data.customization.is_approved || false,
            approved_at: data.customization.approved_at,
            approved_by_name: data.customization.approved_by_name,
            rejection_reason: data.customization.rejection_reason
          })
        } else {
          setIsNewCustomization(true)
        }
      }
    } catch (error) {
      console.error('Failed to load customization:', error)
      setMessage({ type: 'error', text: 'Failed to load customization profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validation
    if (!customization.custom_url_slug.trim()) {
      setMessage({ type: 'error', text: 'URL slug is required' })
      return
    }

    if (!customization.display_name.trim()) {
      setMessage({ type: 'error', text: 'Display name is required' })
      return
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(customization.custom_url_slug)) {
      setMessage({
        type: 'error',
        text: 'URL slug must be lowercase letters, numbers, and hyphens only'
      })
      return
    }

    // Validate color format
    const colorRegex = /^#[0-9A-Fa-f]{6}$/
    if (customization.custom_brand_color && !colorRegex.test(customization.custom_brand_color)) {
      setMessage({
        type: 'error',
        text: 'Brand color must be a valid hex color (e.g., #F59E0B)'
      })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const method = isNewCustomization ? 'POST' : 'PATCH'
      const response = await fetch('/api/barber/customization', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customization)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || 'Customization saved successfully!'
        })

        if (isNewCustomization) {
          setIsNewCustomization(false)
        }

        // Reload to get updated approval status
        await loadCustomization()
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to save customization'
        })
      }
    } catch (error) {
      console.error('Failed to save customization:', error)
      setMessage({ type: 'error', text: 'Failed to save customization' })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    setCustomization(prev => ({ ...prev, [field]: value }))
  }

  const handleSocialLinkChange = (platform, value) => {
    setCustomization(prev => ({
      ...prev,
      social_media_links: {
        ...prev.social_media_links,
        [platform]: value
      }
    }))
  }

  const handleSpecialtiesChange = (value) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean)
    setCustomization(prev => ({ ...prev, specialties: items }))
  }

  const handleSlugChange = (value) => {
    // Auto-format to lowercase with hyphens
    const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-')
    handleInputChange('custom_url_slug', formatted)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-muted">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-card rounded-lg shadow-sm border border-gray-200 dark:border-border p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-card-foreground flex items-center">
                <SparklesIcon className="h-7 w-7 mr-2 text-amber-600" />
                Customize Your Landing Page
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Create your personal booking page with custom branding.
                {customization.custom_url_slug && (
                  <span className="block mt-1 font-mono text-sm text-amber-700">
                    Your page: barbershop.com/{customization.custom_url_slug}
                  </span>
                )}
              </p>
            </div>

            {/* Approval Status Badge */}
            {!isNewCustomization && (
              <div className="ml-4">
                {approvalStatus.is_approved ? (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-800 rounded-lg border border-green-200">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Approved</span>
                  </div>
                ) : approvalStatus.rejection_reason ? (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-800 rounded-lg border border-red-200">
                    <XCircleIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Rejected</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                    <ClockIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Pending Approval</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rejection Reason */}
          {approvalStatus.rejection_reason && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900">Reason for rejection:</p>
              <p className="text-sm text-red-700 mt-1">{approvalStatus.rejection_reason}</p>
            </div>
          )}
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

        {/* Form */}
        <div className="bg-white dark:bg-card rounded-lg shadow-sm border border-gray-200 dark:border-border p-6 space-y-8">
          {/* Basic Information */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <UserCircleIcon className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-card-foreground">
                Basic Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom URL Slug *
                </label>
                <input
                  type="text"
                  value={customization.custom_url_slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="john-smith"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                  disabled={!isNewCustomization} // Can't change slug after creation
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isNewCustomization
                    ? 'Lowercase letters, numbers, and hyphens only. This cannot be changed later.'
                    : 'URL slug cannot be changed after creation'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={customization.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your professional name as it appears on your landing page
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={customization.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  placeholder="Tell clients about your experience, style, and what makes you unique..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Specialties (comma-separated)
                </label>
                <input
                  type="text"
                  value={customization.specialties?.join(', ') || ''}
                  onChange={(e) => handleSpecialtiesChange(e.target.value)}
                  placeholder="Fades, Beard Sculpting, Hair Design, Kids Cuts"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={customization.is_accepting_bookings}
                    onChange={(e) => handleInputChange('is_accepting_bookings', e.target.checked)}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Currently accepting bookings
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Visual Branding */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <PaintBrushIcon className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-card-foreground">
                Visual Branding
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profile Image URL
                </label>
                <input
                  type="url"
                  value={customization.profile_image_url}
                  onChange={(e) => handleInputChange('profile_image_url', e.target.value)}
                  placeholder="https://example.com/profile.jpg"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={customization.cover_image_url}
                  onChange={(e) => handleInputChange('cover_image_url', e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={customization.custom_brand_color}
                    onChange={(e) => handleInputChange('custom_brand_color', e.target.value)}
                    className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customization.custom_brand_color}
                    onChange={(e) => handleInputChange('custom_brand_color', e.target.value)}
                    placeholder="#F59E0B"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Must be a valid hex color (e.g., #F59E0B)
                </p>
              </div>

              {/* Color Preview */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</p>
                <div
                  className="h-20 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: customization.custom_brand_color }}
                >
                  Your brand color
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <LinkIcon className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-card-foreground">
                Social Media Links
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instagram
                </label>
                <input
                  type="url"
                  value={customization.social_media_links?.instagram || ''}
                  onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/yourusername"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Facebook
                </label>
                <input
                  type="url"
                  value={customization.social_media_links?.facebook || ''}
                  onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/yourusername"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TikTok
                </label>
                <input
                  type="url"
                  value={customization.social_media_links?.tiktok || ''}
                  onChange={(e) => handleSocialLinkChange('tiktok', e.target.value)}
                  placeholder="https://tiktok.com/@yourusername"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Twitter
                </label>
                <input
                  type="url"
                  value={customization.social_media_links?.twitter || ''}
                  onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/yourusername"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  YouTube
                </label>
                <input
                  type="url"
                  value={customization.social_media_links?.youtube || ''}
                  onChange={(e) => handleSocialLinkChange('youtube', e.target.value)}
                  placeholder="https://youtube.com/@yourusername"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg focus:ring-amber-500 focus:border-amber-500 dark:bg-background dark:text-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {saving ? 'Saving...' : isNewCustomization ? 'Create Customization' : 'Save Changes'}
          </button>
        </div>

        {/* Approval Notice */}
        {!isNewCustomization && !approvalStatus.is_approved && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Changes to your customization require shop owner approval before they go live.
              {approvalStatus.rejection_reason && ' Please address the rejection reason above and resubmit.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

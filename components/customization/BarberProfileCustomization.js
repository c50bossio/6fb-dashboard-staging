'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { getDisplayName, splitFullName, combineNames, normalizeNameData, createNameUpdateObject } from '@/lib/name-utils'

function BarberProfileCustomization({ onUnsavedChanges }) {
  const { user, updateProfile } = useAuth()
  const [settings, setSettings] = useState({
    full_name: '',
    first_name: '',
    last_name: '',
    bio: '',
    phone: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const loadSettings = useCallback(async () => {
    if (!user) return
    setLoading(true)
    
    try {
      // Use normalized name data for consistent handling
      const nameData = normalizeNameData({
        firstName: user.user_metadata?.firstName || user.user_metadata?.first_name,
        lastName: user.user_metadata?.lastName || user.user_metadata?.last_name,
        fullName: user.user_metadata?.fullName || user.user_metadata?.full_name
      })
      
      // Get display name with proper fallback
      const displayName = getDisplayName({
        firstName: nameData.firstName,
        lastName: nameData.lastName,
        fullName: nameData.fullName,
        email: user.email,
        defaultName: ''
      })
      
      setSettings({
        full_name: displayName,
        first_name: nameData.firstName || '',
        last_name: nameData.lastName || '',
        bio: user.user_metadata?.bio || '',
        phone: user.user_metadata?.phone || ''
      })
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  const handleSaveSettings = useCallback(async () => {
    if (!user || !hasUnsavedChanges) return
    
    setSaving(true)
    try {
      // Create name update object with both formats
      const nameUpdate = createNameUpdateObject({
        firstName: settings.first_name,
        lastName: settings.last_name
      })
      
      const updateData = {
        ...nameUpdate,
        bio: settings.bio,
        phone: settings.phone
      }
      
      if (updateProfile) {
        await updateProfile(updateData)
      }
      
      setHasUnsavedChanges(false)
      if (onUnsavedChanges) {
        onUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }, [user, settings, hasUnsavedChanges, updateProfile, onUnsavedChanges])

  const handleFieldChange = useCallback((field, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [field]: value }
      
      // Auto-update full_name when first_name or last_name changes
      if (field === 'first_name' || field === 'last_name') {
        const firstName = field === 'first_name' ? value : prev.first_name
        const lastName = field === 'last_name' ? value : prev.last_name
        newSettings.full_name = combineNames(firstName, lastName)
      }
      
      return newSettings
    })
    
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true)
      if (onUnsavedChanges) {
        onUnsavedChanges(true)
      }
    }
  }, [hasUnsavedChanges, onUnsavedChanges])

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user, loadSettings])

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Profile Customization</h2>
        {hasUnsavedChanges && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={settings.first_name}
              onChange={(e) => handleFieldChange('first_name', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
              placeholder="Enter your first name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={settings.last_name}
              onChange={(e) => handleFieldChange('last_name', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
              placeholder="Enter your last name (optional)"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={settings.full_name}
            readOnly
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-600"
            placeholder="This will be generated from your first and last name"
          />
          <p className="mt-1 text-xs text-gray-500">
            This is how your name will appear to customers and on booking pages
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            value={settings.bio}
            onChange={(e) => handleFieldChange('bio', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
            rows={3}
            placeholder="Tell customers about your experience and specialties..."
          />
          <p className="mt-1 text-xs text-gray-500">
            This will appear on your public profile and booking pages
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={settings.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
            placeholder="(555) 123-4567"
          />
          <p className="mt-1 text-xs text-gray-500">
            This will be used for appointment confirmations and client communication
          </p>
        </div>
        
        {hasUnsavedChanges && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              You have unsaved changes. Click "Save Changes" to update your profile.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BarberProfileCustomization
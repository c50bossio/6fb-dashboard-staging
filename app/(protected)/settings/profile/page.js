'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import { useAuth } from '../../../../components/SupabaseAuthProvider'
import Button from '../../../../components/Button'

export default function ProfileSettingsPage() {
  const { user, profile, updateProfile } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    phone: '',
    email: ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', content: '' })
  const [hasChanges, setHasChanges] = useState(false)

  // Load profile data when component mounts
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        email: profile.email || user?.email || ''
      })
    }
  }, [profile, user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setHasChanges(true)
    
    // Auto-update full name when first/last name changes
    if (name === 'first_name' || name === 'last_name') {
      const firstName = name === 'first_name' ? value : formData.first_name
      const lastName = name === 'last_name' ? value : formData.last_name
      const fullName = `${firstName} ${lastName}`.trim()
      
      setFormData(prev => ({
        ...prev,
        full_name: fullName
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', content: '' })

    try {
      // Prepare update data
      const updates = {
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        full_name: formData.full_name.trim() || 'User',
        phone: formData.phone.trim() || null,
        updated_at: new Date().toISOString()
      }

      await updateProfile(updates)
      
      setMessage({
        type: 'success',
        content: 'Profile updated successfully!'
      })
      setHasChanges(false)

      // Redirect to dashboard after successful update
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } catch (error) {
      console.error('Profile update error:', error)
      setMessage({
        type: 'error',
        content: error.message || 'Failed to update profile. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getProviderInfo = () => {
    if (profile?.oauth_provider && profile.oauth_provider !== 'email') {
      return {
        provider: profile.oauth_provider,
        isOAuth: true
      }
    }
    return {
      provider: 'email',
      isOAuth: false
    }
  }

  const providerInfo = getProviderInfo()

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="bg-white dark:bg-card shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-border">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-card-foreground">Profile Settings</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Update your personal information and account details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Account Info */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-card-foreground mb-4">Account Information</h2>
            
            {/* Email (read-only) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-muted text-gray-500 dark:text-gray-300 cursor-not-allowed"
                />
                <div className="absolute right-3 top-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {providerInfo.isOAuth ? providerInfo.provider : 'email'}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                Email address cannot be changed. Contact support if you need to update this.
              </p>
            </div>

            {/* First Name */}
            <div className="mb-4">
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1" />
                First Name
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                placeholder="Enter your first name"
              />
            </div>

            {/* Last Name */}
            <div className="mb-4">
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1" />
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                placeholder="Enter your last name"
              />
            </div>

            {/* Full Name Preview */}
            <div className="mb-4">
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                placeholder="This is how your name will appear in the system"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                This is automatically created from your first and last name, but you can customize it.
              </p>
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <PhoneIcon className="h-4 w-4 inline mr-1" />
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* Message Display */}
          {message.content && (
            <div className={`p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <CheckIcon className="h-5 w-5 text-green-400 mr-2" />
                ) : (
                  <XMarkIcon className="h-5 w-5 text-red-400 mr-2" />
                )}
                <p className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.content}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-border">
            <Button
              type="submit"
              disabled={isLoading || !hasChanges}
              className="sm:order-2"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
              className="sm:order-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
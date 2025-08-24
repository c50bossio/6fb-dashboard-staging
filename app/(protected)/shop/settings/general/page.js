'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function GeneralSettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [notification, setNotification] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA'
  })

  const [originalData, setOriginalData] = useState(null)
  const initialValues = useRef(null)

  useEffect(() => {
    loadShopData()
  }, [user])

  // Capture initial state on first render
  useEffect(() => {
    if (!initialValues.current) {
      initialValues.current = JSON.parse(JSON.stringify(formData))
    }
  }, [])

  useEffect(() => {
    // Always check if data has changed against initial values
    if (initialValues.current) {
      const changed = JSON.stringify(formData) !== JSON.stringify(initialValues.current)
      setHasChanges(changed)
    }
  }, [formData])

  const loadShopData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // First try to get shop by owner_id
      let { data: shop, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', user.id)
        .single()
      
      // If no shop found by owner_id, check profile for shop_id
      if (!shop || error) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id, barbershop_id')
          .eq('id', user.id)
          .single()
        
        const shopId = profile?.shop_id || profile?.barbershop_id
        if (shopId) {
          const { data: shopByProfile } = await supabase
            .from('barbershops')
            .select('*')
            .eq('id', shopId)
            .single()
          
          shop = shopByProfile
        }
      }
      
      if (shop) {
        const shopData = {
          name: shop.name || '',
          description: shop.description || '',
          email: shop.email || '',
          phone: shop.phone || '',
          website: shop.website || '',
          address: shop.address || '',
          city: shop.city || '',
          state: shop.state || '',
          zip_code: shop.zip_code || '',
          country: shop.country || 'USA'
        }
        setFormData(shopData)
        setOriginalData(shopData)
        // Update initial values to the loaded data
        initialValues.current = JSON.parse(JSON.stringify(shopData))
      } else {
        // No barbershop exists yet - this is expected during onboarding
        console.log('No barbershop found - ready for initial setup')
        // Pre-fill with user's email if available
        setFormData(prev => ({
          ...prev,
          email: user.email || prev.email
        }))
      }
    } catch (error) {
      console.error('Error loading shop data:', error)
      // Don't show error during onboarding when no shop exists
      if (!error.message?.includes('No rows') && !error.message?.includes('multiple')) {
        showNotification('error', 'Failed to load shop information')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setNotification(null)
    
    try {
      // Check if barbershop exists
      const { data: existingShop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user?.id)
        .single()
      
      if (existingShop) {
        // Update existing barbershop
        const { error } = await supabase
          .from('barbershops')
          .update({
            name: formData.name,
            description: formData.description,
            email: formData.email,
            phone: formData.phone,
            website: formData.website,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zip_code,
            country: formData.country,
            updated_at: new Date().toISOString()
          })
          .eq('owner_id', user?.id)
        
        if (error) throw error
      } else {
        // Create new barbershop (during onboarding)
        const { data: newShop, error } = await supabase
          .from('barbershops')
          .insert({
            owner_id: user?.id,
            name: formData.name,
            description: formData.description,
            email: formData.email,
            phone: formData.phone,
            website: formData.website,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zip_code,
            country: formData.country,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Update profile with shop_id
        if (newShop) {
          await supabase
            .from('profiles')
            .update({ 
              shop_id: newShop.id,
              barbershop_id: newShop.id 
            })
            .eq('id', user?.id)
        }
      }
      
      // No complex onboarding progress tracking needed!
      // The new /api/onboarding/status endpoint automatically detects completion
      // based on actual data existence - much simpler and more reliable
      
      setOriginalData(formData)
      // Update initial values to the newly saved data
      initialValues.current = JSON.parse(JSON.stringify(formData))
      setHasChanges(false)
      showNotification('success', 'Settings saved successfully!')
    } catch (error) {
      console.error('Error saving:', error)
      showNotification('error', 'Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    // Reset to initial values
    if (initialValues.current) {
      setFormData(initialValues.current)
    } else if (originalData) {
      setFormData(originalData)
    }
    setHasChanges(false)
    showNotification('info', 'Changes discarded')
  }

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      
      {/* Header with Save Button */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BuildingStorefrontIcon className="h-6 w-6 text-gray-400 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">General Information</h1>
                <p className="text-sm text-gray-600">Basic information about your barbershop</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <button
                  onClick={handleDiscard}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                  !hasChanges || saving
                    ? 'bg-gray-400 text-gray-500 cursor-not-allowed'
                    : 'bg-olive-600 text-white hover:bg-olive-700'
                }`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : originalData === null ? (
                  'Save Settings'
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`px-6 py-3 ${
            notification.type === 'success' ? 'bg-green-50 border-b border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border-b border-red-200' :
            'bg-blue-50 border-b border-blue-200'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              ) : notification.type === 'error' ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-500 mr-2" />
              )}
              <span className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </span>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6">
          {/* Helper text for first-time users */}
          {!originalData && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Welcome to your barbershop setup!</strong> Fill in the fields below and click "Save Settings" to create your barbershop profile.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="Enter your shop name"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="Brief description of your barbershop..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="shop@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PhoneIcon className="h-4 w-4 inline mr-1" />
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <GlobeAltIcon className="h-4 w-4 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="https://www.yourshop.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Location</h2>
          <p className="text-sm text-gray-600">Your shop's physical address</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="New York"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="NY"
                maxLength={2}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="10001"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                placeholder="USA"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
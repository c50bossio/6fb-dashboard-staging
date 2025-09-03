'use client'

import {
  MapPinIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MapIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { 
  US_STATES, 
  CANADIAN_PROVINCES, 
  COUNTRIES, 
  formatPhoneNumber, 
  validatePostalCode, 
  getStateOptions, 
  getStateLabel, 
  getPostalCodeLabel 
} from '@/lib/constants/locations'
import LocalBusinessSchema from '@/components/seo/LocalBusinessSchema'

export default function LocationSettingsPage() {
  const { user: _user } = useAuth()
  const _supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [notification, setNotification] = useState(null)
  const [barbershopId, setbarbershopId] = useState(null)
  
  const [formData, setFormData] = useState({
    // NAP (Name, Address, Phone) - Critical for SEO
    phone: '',
    
    // Physical Address
    address: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US', // Use ISO codes
    
    // Map Coordinates
    latitude: null,
    longitude: null,
    
    // Service Area
    service_radius: 0, // 0 means in-shop only
    mobile_services: false,
    service_areas: [], // ZIP codes or areas served
    
    // Location Details
    parking_available: false,
    wheelchair_accessible: false,
    public_transit_nearby: false,
    landmark_description: '',
    
    // Hours by Location (for multi-location support)
    timezone: 'America/New_York',
    location_name: 'Main Location',
    location_type: 'primary' // primary, branch, mobile
  })

  const [originalData, setOriginalData] = useState(null)
  const [mapPreview, setMapPreview] = useState(null)
  const initialValues = useRef(null)

  useEffect(() => {
    loadLocationData()
  }, [_user])

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

  const loadLocationData = async () => {
    if (!_user) return
    
    try {
      setLoading(true)
      
      // Get user's barbershop
      const { data: profile } = await _supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', _user.id)
        .single()
      
      if (!profile?.barbershop_id) {
        setNotification({
          type: 'error',
          message: 'No barbershop found for this user'
        })
        setLoading(false)
        return
      }
      
      setbarbershopId(profile.barbershop_id)
      
      // Load barbershop location data
      const { data: barbershop, error } = await _supabase
        .from('barbershops')
        .select('*')
        .eq('id', profile.barbershop_id)
        .single()
      
      if (error) throw error
      
      if (barbershop) {
        // Convert legacy country names to ISO codes
        let countryCode = barbershop.country || 'US'
        if (countryCode === 'USA') countryCode = 'US'
        if (countryCode === 'United States') countryCode = 'US'
        if (countryCode === 'Canada') countryCode = 'CA'
        if (countryCode === 'United Kingdom') countryCode = 'GB'
        if (countryCode === 'Mexico') countryCode = 'MX'

        const locationData = {
          // NAP fields that exist in database
          phone: barbershop.phone || '',
          address: barbershop.address || '',
          city: barbershop.city || '',
          state: barbershop.state || '',
          zip_code: barbershop.zip_code || '',
          country: countryCode,
          latitude: barbershop.latitude || null,
          longitude: barbershop.longitude || null,
          timezone: barbershop.timezone || 'America/New_York',
          
          // Service Area fields (now in database)
          mobile_services: barbershop.mobile_services || false,
          
          // Accessibility & Amenities fields (now in database)
          parking_available: barbershop.parking_available || false,
          wheelchair_accessible: barbershop.wheelchair_accessible || false,
          public_transit_nearby: barbershop.public_transit_nearby || false,
          landmark_description: barbershop.landmark_description || '',
          
          // Fields not in database yet - default values for UI
          address_line_2: '', // Not in DB
          service_radius: 0, // Not in DB
          service_areas: [], // Not in DB
          location_name: 'Main Location', // Not in DB
          location_type: 'primary' // Not in DB
        }
        
        setFormData(locationData)
        setOriginalData(locationData)
        
        // Generate map preview if coordinates exist
        if (locationData.latitude && locationData.longitude) {
          generateMapPreview(locationData.latitude, locationData.longitude)
        }
      }
    } catch (error) {
      console.error('Error loading location data:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load location settings'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateMapPreview = (lat, lng) => {
    // Using OpenStreetMap static image
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`
    setMapPreview(mapUrl)
  }

  const geocodeAddress = async () => {
    const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}, ${formData.country}`
    
    try {
      // Using Nominatim for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        }))
        generateMapPreview(parseFloat(lat), parseFloat(lon))
        
        setNotification({
          type: 'success',
          message: 'Address coordinates updated successfully'
        })
      } else {
        setNotification({
          type: 'warning',
          message: 'Could not find coordinates for this address'
        })
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      setNotification({
        type: 'error',
        message: 'Failed to geocode address'
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!barbershopId) {
      setNotification({
        type: 'error',
        message: 'No barbershop ID found'
      })
      return
    }
    
    setSaving(true)
    setNotification(null)
    
    // NAP validation before saving
    const validationErrors = []
    
    if (!formData.phone?.trim()) {
      validationErrors.push('Phone number is required')
    }
    
    if (!formData.address?.trim()) {
      validationErrors.push('Street address is required')
    }
    
    if (!formData.city?.trim()) {
      validationErrors.push('City is required')
    }
    
    if (['US', 'CA'].includes(formData.country) && !formData.state?.trim()) {
      validationErrors.push(`${getStateLabel(formData.country)} is required`)
    }
    
    if (formData.zip_code && !validatePostalCode(formData.zip_code, formData.country)) {
      validationErrors.push(`Please enter a valid ${getPostalCodeLabel(formData.country)}`)
    }
    
    if (validationErrors.length > 0) {
      setNotification({
        type: 'error',
        message: validationErrors.join(', ')
      })
      setSaving(false)
      return
    }
    
    try {
      // Prepare update object with fields that exist in the database
      const updateData = {
        // NAP fields critical for SEO
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        timezone: formData.timezone,
        
        // Service Area fields
        mobile_services: formData.mobile_services,
        
        // Accessibility & Amenities fields
        parking_available: formData.parking_available,
        wheelchair_accessible: formData.wheelchair_accessible,
        public_transit_nearby: formData.public_transit_nearby,
        landmark_description: formData.landmark_description,
        
        updated_at: new Date().toISOString()
      }
      
      // Only include geographic data if they have values
      // This prevents errors if columns don't exist yet
      if (formData.latitude !== null && formData.latitude !== undefined) {
        updateData.latitude = formData.latitude
      }
      if (formData.longitude !== null && formData.longitude !== undefined) {
        updateData.longitude = formData.longitude
      }
      
      console.log('Updating barbershop with data:', updateData)
      
      const { error } = await _supabase
        .from('barbershops')
        .update(updateData)
        .eq('id', barbershopId)
      
      if (error) {
        console.error('Supabase update error details:', error)
        throw error
      }
      
      setOriginalData(formData)
      setHasChanges(false)
      setNotification({
        type: 'success',
        message: 'Location settings saved successfully'
      })
    } catch (error) {
      console.error('Error saving location settings:', error)
      
      // Show detailed error message to help with debugging
      let errorMessage = 'Failed to save location settings'
      
      if (error.message) {
        errorMessage = error.message
      } else if (error.details) {
        errorMessage = error.details
      } else if (error.hint) {
        errorMessage = error.hint
      }
      
      // Common error scenarios
      if (error.code === 'PGRST116') {
        errorMessage = 'Barbershop not found. Please contact support.'
      } else if (error.code === '42703') {
        errorMessage = 'Database column missing. Please run the migration first.'
      } else if (error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied. Please check your account access.'
      }
      
      setNotification({
        type: 'error',
        message: errorMessage
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setFormData(originalData)
    setHasChanges(false)
    setNotification(null)
  }

  // Handle phone number formatting for NAP compliance
  const handlePhoneChange = (value) => {
    const formatted = formatPhoneNumber(value)
    setFormData({...formData, phone: formatted})
  }

  // Handle country change - reset state when country changes
  const handleCountryChange = (countryCode) => {
    setFormData({
      ...formData, 
      country: countryCode,
      state: '' // Reset state when country changes
    })
  }

  // Get current state options based on selected country
  const stateOptions = getStateOptions(formData.country)
  const stateLabel = getStateLabel(formData.country)
  const postalCodeLabel = getPostalCodeLabel(formData.country)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* SEO Schema Markup */}
      <LocalBusinessSchema businessData={{
        name: originalData?.name, // Business name from barbershop
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        latitude: formData.latitude,
        longitude: formData.longitude
      }} />
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Location Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your barbershop's NAP (Name, Address, Phone) and location details
        </p>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-lg flex items-start ${
          notification.type === 'success' ? 'bg-green-50' :
          notification.type === 'error' ? 'bg-red-50' :
          'bg-yellow-50'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-2" />
          ) : (
            <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 mr-2 ${
              notification.type === 'error' ? 'text-red-400' : 'text-yellow-400'
            }`} />
          )}
          <span className={`text-sm ${
            notification.type === 'success' ? 'text-green-800' :
            notification.type === 'error' ? 'text-red-800' :
            'text-yellow-800'
          }`}>
            {notification.message}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Physical Address Section */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <BuildingStorefrontIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">NAP Information</h2>
              <span className="ml-2 text-sm text-gray-500">(Name, Address, Phone - Critical for SEO)</span>
            </div>
            
            {/* Phone Number Field - Critical for NAP */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">
                <PhoneIcon className="h-4 w-4 inline mr-1" />
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
              <p className="mt-1 text-sm text-gray-500">Primary contact number for your business</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={formData.address_line_2}
                  onChange={(e) => setFormData({...formData, address_line_2: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  placeholder="Suite, Floor, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {stateLabel}
                </label>
                {stateOptions.length > 0 ? (
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                    autoComplete="address-level1"
                  >
                    <option value="">Select {stateLabel}</option>
                    {stateOptions.map(option => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                    placeholder={stateLabel}
                    autoComplete="address-level1"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {postalCodeLabel}
                </label>
                <input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  placeholder={formData.country === 'US' ? '12345' : formData.country === 'CA' ? 'A1A 1A1' : 'Postal Code'}
                  autoComplete="postal-code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  autoComplete="country"
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={geocodeAddress}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
              >
                <MapPinIcon className="h-4 w-4 mr-2" />
                Get Coordinates
              </button>
              {formData.latitude && formData.longitude && (
                <span className="ml-4 text-sm text-gray-600">
                  Lat: {formData.latitude.toFixed(6)}, Lng: {formData.longitude.toFixed(6)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Map Preview */}
        {mapPreview && (
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
            <div className="px-4 py-6 sm:p-8">
              <div className="flex items-center mb-4">
                <MapIcon className="h-6 w-6 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Location Preview</h2>
              </div>
              <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  src={mapPreview}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  allowFullScreen
                  aria-hidden="false"
                  tabIndex="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Service Area Section */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <GlobeAltIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Service Area</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.mobile_services}
                    onChange={(e) => setFormData({...formData, mobile_services: e.target.checked})}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Offer mobile/on-location services
                  </span>
                </label>
              </div>

              {formData.mobile_services && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Service Radius (miles)
                  </label>
                  <input
                    type="number"
                    value={formData.service_radius}
                    onChange={(e) => setFormData({...formData, service_radius: parseInt(e.target.value) || 0})}
                    className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                    min="0"
                    max="100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum distance you'll travel for mobile services
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accessibility Section */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Accessibility & Amenities</h2>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.parking_available}
                  onChange={(e) => setFormData({...formData, parking_available: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Parking available</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.wheelchair_accessible}
                  onChange={(e) => setFormData({...formData, wheelchair_accessible: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Wheelchair accessible</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.public_transit_nearby}
                  onChange={(e) => setFormData({...formData, public_transit_nearby: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Public transit nearby</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Landmark or Additional Directions (Optional)
                </label>
                <textarea
                  value={formData.landmark_description}
                  onChange={(e) => setFormData({...formData, landmark_description: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  placeholder="e.g., Next to the Starbucks, Second floor above the pharmacy"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Timezone Section */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Time Zone</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Time Zone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Phoenix">Arizona Time</option>
                <option value="Pacific/Honolulu">Hawaii Time</option>
                <option value="America/Anchorage">Alaska Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!hasChanges || saving}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !hasChanges || saving
                ? 'bg-gray-400 text-gray-500 cursor-not-allowed'
                : 'bg-olive-600 text-white hover:bg-olive-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
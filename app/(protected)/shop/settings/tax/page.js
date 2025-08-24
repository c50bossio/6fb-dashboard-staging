'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  CalculatorIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function TaxSettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [notification, setNotification] = useState(null)
  const [barbershopId, setBarbershopId] = useState(null)
  
  const [formData, setFormData] = useState({
    // Stripe Tax Integration
    stripe_tax_enabled: false,
    stripe_tax_settings_id: '',
    
    // Display Settings
    show_tax_in_receipts: true,
    tax_label: 'Sales Tax',
    
    // Business Information (for compliance)
    tax_id: '',
    tax_id_type: 'ein', // ein, ssn
    business_license_number: '',
    
    // Simple override for cash transactions
    manual_tax_rate: 0, // For cash/non-Stripe transactions only
    
    // Customer experience
    tax_inclusive_pricing: false, // Show prices with tax included
    show_tax_breakdown: true // Show tax breakdown in checkout
  })

  const [originalData, setOriginalData] = useState(null)
  const initialValues = useRef(null)

  useEffect(() => {
    loadTaxData()
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

  const loadTaxData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Get user's barbershop
      const { data: profile } = await supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', user.id)
        .single()
      
      if (!profile?.barbershop_id) {
        setNotification({
          type: 'error',
          message: 'No barbershop found for this user'
        })
        setLoading(false)
        return
      }
      
      setBarbershopId(profile.barbershop_id)
      
      // Load tax settings from business_settings
      const { data: settings, error } = await supabase
        .from('business_settings')
        .select('tax_settings')
        .eq('user_id', user.id)
        .single()
      
      if (settings?.tax_settings) {
        const taxData = {
          stripe_tax_enabled: settings.tax_settings.stripe_tax_enabled || false,
          stripe_tax_settings_id: settings.tax_settings.stripe_tax_settings_id || '',
          show_tax_in_receipts: settings.tax_settings.show_tax_in_receipts !== false,
          tax_label: settings.tax_settings.tax_label || 'Sales Tax',
          tax_id: settings.tax_settings.tax_id || '',
          tax_id_type: settings.tax_settings.tax_id_type || 'ein',
          business_license_number: settings.tax_settings.business_license_number || '',
          manual_tax_rate: settings.tax_settings.manual_tax_rate || 0,
          tax_inclusive_pricing: settings.tax_settings.tax_inclusive_pricing || false,
          show_tax_breakdown: settings.tax_settings.show_tax_breakdown !== false
        }
        
        setFormData(taxData)
        setOriginalData(taxData)
      }
    } catch (error) {
      console.error('Error loading tax settings:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load tax settings'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNotification(null)
    
    try {
      // Check if business_settings exists
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      const taxSettings = {
        ...formData,
        updated_at: new Date().toISOString()
      }
      
      if (existing) {
        // Update existing settings
        await supabase
          .from('business_settings')
          .update({
            tax_settings: taxSettings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      } else {
        // Create new settings
        await supabase
          .from('business_settings')
          .insert({
            user_id: user.id,
            tax_settings: taxSettings
          })
      }
      
      setOriginalData(formData)
      setHasChanges(false)
      setNotification({
        type: 'success',
        message: 'Tax settings saved successfully'
      })
    } catch (error) {
      console.error('Error saving tax settings:', error)
      setNotification({
        type: 'error',
        message: 'Failed to save tax settings'
      })
    } finally {
      setSaving(false)
    }
  }

  const openStripeSettings = () => {
    // Open Stripe Dashboard in new tab
    window.open('https://dashboard.stripe.com/settings/tax', '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tax & Compliance</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage tax calculation and compliance with Stripe Tax
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
        {/* Stripe Tax Integration */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <ShieldCheckIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Stripe Tax (Recommended)</h2>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Why use Stripe Tax?</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Automatic tax calculation for all US jurisdictions</li>
                    <li>Always up-to-date with changing tax laws</li>
                    <li>Handles state, county, city, and special district taxes</li>
                    <li>Optional tax filing and remittance service</li>
                    <li>Reduces compliance risk and penalties</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.stripe_tax_enabled}
                    onChange={(e) => setFormData({...formData, stripe_tax_enabled: e.target.checked})}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Enable Stripe Tax for automatic tax calculation
                  </span>
                </label>
                <p className="mt-1 ml-6 text-xs text-gray-500">
                  Stripe will automatically calculate and collect the correct tax amount
                </p>
              </div>

              {formData.stripe_tax_enabled && (
                <div>
                  <button
                    type="button"
                    onClick={openStripeSettings}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                    Configure in Stripe Dashboard
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    Complete tax registration and settings in your Stripe account
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <BuildingLibraryIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tax ID Type
                </label>
                <select
                  value={formData.tax_id_type}
                  onChange={(e) => setFormData({...formData, tax_id_type: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                >
                  <option value="ein">EIN (Employer Identification Number)</option>
                  <option value="ssn">SSN (Social Security Number)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tax ID Number
                </label>
                <input
                  type="text"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                  placeholder={formData.tax_id_type === 'ein' ? 'XX-XXXXXXX' : 'XXX-XX-XXXX'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Business License Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.business_license_number}
                  onChange={(e) => setFormData({...formData, business_license_number: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Manual Tax Settings (for cash transactions) */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <CalculatorIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Cash Transaction Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Manual Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.manual_tax_rate}
                  onChange={(e) => setFormData({...formData, manual_tax_rate: parseFloat(e.target.value) || 0})}
                  step="0.01"
                  min="0"
                  max="20"
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used only for cash or manual transactions when Stripe Tax is not available
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Display Settings</h2>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.show_tax_in_receipts}
                  onChange={(e) => setFormData({...formData, show_tax_in_receipts: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Show tax line item in receipts
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.tax_inclusive_pricing}
                  onChange={(e) => setFormData({...formData, tax_inclusive_pricing: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Display prices with tax included
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.show_tax_breakdown}
                  onChange={(e) => setFormData({...formData, show_tax_breakdown: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Show detailed tax breakdown at checkout
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tax Label on Receipts
                </label>
                <input
                  type="text"
                  value={formData.tax_label}
                  onChange={(e) => setFormData({...formData, tax_label: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  placeholder="e.g., Sales Tax, VAT, GST"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {hasChanges && (
            <button
              type="button"
              onClick={() => {
                setFormData(originalData)
                setHasChanges(false)
              }}
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
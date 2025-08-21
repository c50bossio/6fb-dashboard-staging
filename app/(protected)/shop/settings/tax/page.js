'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  DocumentTextIcon,
  CalculatorIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon
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
    // Tax Information
    tax_id: '',
    tax_type: 'ein', // ein, ssn, other
    tax_rate: 0,
    tax_included_in_price: false,
    
    // State & Local Taxes
    state_tax_rate: 0,
    local_tax_rate: 0,
    special_tax_district: '',
    
    // Business Registration
    business_license_number: '',
    business_license_expiry: '',
    cosmetology_license_number: '',
    cosmetology_license_expiry: '',
    
    // Compliance
    collect_sales_tax: true,
    tax_exempt: false,
    tax_exempt_reason: '',
    quarterly_filing: true,
    tax_filing_frequency: 'quarterly', // monthly, quarterly, annually
    
    // Additional Compliance
    health_permit_number: '',
    health_permit_expiry: '',
    insurance_policy_number: '',
    insurance_expiry: '',
    workers_comp_policy: '',
    
    // Record Keeping
    retain_records_years: 7,
    digital_receipts_enabled: true,
    paper_receipts_required: false
  })

  const [originalData, setOriginalData] = useState(null)

  useEffect(() => {
    loadTaxData()
  }, [user])

  useEffect(() => {
    if (originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData)
      setHasChanges(changed)
    }
  }, [formData, originalData])

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
      
      // Load tax settings from barbershops table or business_settings
      const { data: barbershop, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', profile.barbershop_id)
        .single()
      
      if (error) throw error
      
      if (barbershop) {
        // Map database fields to form fields
        const taxData = {
          tax_id: barbershop.tax_id || '',
          tax_type: barbershop.tax_type || 'ein',
          tax_rate: barbershop.tax_rate || 0,
          tax_included_in_price: barbershop.tax_included_in_price || false,
          state_tax_rate: barbershop.state_tax_rate || 0,
          local_tax_rate: barbershop.local_tax_rate || 0,
          special_tax_district: barbershop.special_tax_district || '',
          business_license_number: barbershop.business_license_number || '',
          business_license_expiry: barbershop.business_license_expiry || '',
          cosmetology_license_number: barbershop.cosmetology_license_number || '',
          cosmetology_license_expiry: barbershop.cosmetology_license_expiry || '',
          collect_sales_tax: barbershop.collect_sales_tax !== false,
          tax_exempt: barbershop.tax_exempt || false,
          tax_exempt_reason: barbershop.tax_exempt_reason || '',
          quarterly_filing: barbershop.quarterly_filing !== false,
          tax_filing_frequency: barbershop.tax_filing_frequency || 'quarterly',
          health_permit_number: barbershop.health_permit_number || '',
          health_permit_expiry: barbershop.health_permit_expiry || '',
          insurance_policy_number: barbershop.insurance_policy_number || '',
          insurance_expiry: barbershop.insurance_expiry || '',
          workers_comp_policy: barbershop.workers_comp_policy || '',
          retain_records_years: barbershop.retain_records_years || 7,
          digital_receipts_enabled: barbershop.digital_receipts_enabled !== false,
          paper_receipts_required: barbershop.paper_receipts_required || false
        }
        
        setFormData(taxData)
        setOriginalData(taxData)
      }
    } catch (error) {
      console.error('Error loading tax data:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load tax settings'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalTaxRate = () => {
    const total = parseFloat(formData.tax_rate || 0) + 
                  parseFloat(formData.state_tax_rate || 0) + 
                  parseFloat(formData.local_tax_rate || 0)
    return total.toFixed(2)
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
    
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', barbershopId)
      
      if (error) throw error
      
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

  const handleReset = () => {
    setFormData(originalData)
    setHasChanges(false)
    setNotification(null)
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
        <h1 className="text-2xl font-bold text-gray-900">Tax & Compliance Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage tax rates, business licenses, and compliance requirements
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
        {/* Tax Information Section */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <CalculatorIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Tax Information</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tax ID Type
                </label>
                <select
                  value={formData.tax_type}
                  onChange={(e) => setFormData({...formData, tax_type: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                >
                  <option value="ein">EIN (Employer Identification Number)</option>
                  <option value="ssn">SSN (Social Security Number)</option>
                  <option value="other">Other</option>
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  placeholder="XX-XXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({...formData, tax_rate: parseFloat(e.target.value) || 0})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  State Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.state_tax_rate}
                  onChange={(e) => setFormData({...formData, state_tax_rate: parseFloat(e.target.value) || 0})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Local Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.local_tax_rate}
                  onChange={(e) => setFormData({...formData, local_tax_rate: parseFloat(e.target.value) || 0})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div className="flex items-center">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Total Tax Rate: </span>
                  <span className="text-lg font-semibold text-olive-600">
                    {calculateTotalTaxRate()}%
                  </span>
                </div>
              </div>

              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.tax_included_in_price}
                    onChange={(e) => setFormData({...formData, tax_included_in_price: e.target.checked})}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Tax is included in displayed prices
                  </span>
                </label>
              </div>

              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.collect_sales_tax}
                    onChange={(e) => setFormData({...formData, collect_sales_tax: e.target.checked})}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Collect sales tax on transactions
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Business Licenses Section */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <DocumentTextIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Business Licenses</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Business License Number
                </label>
                <input
                  type="text"
                  value={formData.business_license_number}
                  onChange={(e) => setFormData({...formData, business_license_number: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Business License Expiry
                </label>
                <input
                  type="date"
                  value={formData.business_license_expiry}
                  onChange={(e) => setFormData({...formData, business_license_expiry: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cosmetology License Number
                </label>
                <input
                  type="text"
                  value={formData.cosmetology_license_number}
                  onChange={(e) => setFormData({...formData, cosmetology_license_number: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cosmetology License Expiry
                </label>
                <input
                  type="date"
                  value={formData.cosmetology_license_expiry}
                  onChange={(e) => setFormData({...formData, cosmetology_license_expiry: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Health Permit Number
                </label>
                <input
                  type="text"
                  value={formData.health_permit_number}
                  onChange={(e) => setFormData({...formData, health_permit_number: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Health Permit Expiry
                </label>
                <input
                  type="date"
                  value={formData.health_permit_expiry}
                  onChange={(e) => setFormData({...formData, health_permit_expiry: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Insurance & Compliance Section */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <BuildingLibraryIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Insurance & Compliance</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Insurance Policy Number
                </label>
                <input
                  type="text"
                  value={formData.insurance_policy_number}
                  onChange={(e) => setFormData({...formData, insurance_policy_number: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Insurance Expiry
                </label>
                <input
                  type="date"
                  value={formData.insurance_expiry}
                  onChange={(e) => setFormData({...formData, insurance_expiry: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Workers Compensation Policy Number
                </label>
                <input
                  type="text"
                  value={formData.workers_comp_policy}
                  onChange={(e) => setFormData({...formData, workers_comp_policy: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tax Filing Frequency
                </label>
                <select
                  value={formData.tax_filing_frequency}
                  onChange={(e) => setFormData({...formData, tax_filing_frequency: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Record Retention (Years)
                </label>
                <input
                  type="number"
                  value={formData.retain_records_years}
                  onChange={(e) => setFormData({...formData, retain_records_years: parseInt(e.target.value) || 7})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  min="1"
                  max="10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Settings */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Receipt Settings</h2>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.digital_receipts_enabled}
                  onChange={(e) => setFormData({...formData, digital_receipts_enabled: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable digital receipts
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.paper_receipts_required}
                  onChange={(e) => setFormData({...formData, paper_receipts_required: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Paper receipts required by law
                </span>
              </label>
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
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              !hasChanges || saving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
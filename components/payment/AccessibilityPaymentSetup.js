'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import {
  HeartIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PhoneIcon,
  UserIcon,
  ClipboardDocumentCheckIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

/**
 * AccessibilityPaymentSetup Component
 * 
 * Configures payment accommodations for accessibility needs.
 * Supports various payment assistance options and accessibility features.
 */
export default function AccessibilityPaymentSetup({ barbershopId, userRole = 'BARBER' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [config, setConfig] = useState({
    offers_payment_assistance: false,
    accepts_disability_vouchers: false,
    has_accessible_payment_terminal: false,
    offers_invoice_billing: false,
    accepts_insurance_billing: false,
    offers_sliding_scale: false,
    payment_assistance_staff_trained: false,
    accessibility_payment_methods: [],
    disability_discount_percentage: 0,
    assistance_contact_method: 'phone'
  })
  const [barbershop, setBarbershop] = useState(null)
  
  const supabase = createClient()

  // Load current configuration
  useEffect(() => {
    loadAccessibilityConfig()
    loadBarbershopInfo()
  }, [barbershopId])

  const loadBarbershopInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('barbershops')
        .select('name, wheelchair_accessible, accessibility_payment_config')
        .eq('id', barbershopId)
        .single()

      if (error) throw error
      setBarbershop(data)

      // Load existing config if available
      if (data.accessibility_payment_config) {
        setConfig(prev => ({
          ...prev,
          ...data.accessibility_payment_config
        }))
      }
    } catch (err) {
      console.error('Error loading barbershop info:', err)
      setError('Failed to load barbershop information')
    }
  }

  const loadAccessibilityConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('barbershops')
        .select('accessibility_payment_config')
        .eq('id', barbershopId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data?.accessibility_payment_config) {
        setConfig(prev => ({
          ...prev,
          ...data.accessibility_payment_config
        }))
      }
    } catch (err) {
      console.error('Error loading accessibility config:', err)
      setError('Failed to load accessibility configuration')
    }
  }

  const saveAccessibilityConfig = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Update barbershop accessibility payment config
      const { error: updateError } = await supabase
        .from('barbershops')
        .update({
          accessibility_payment_config: config
        })
        .eq('id', barbershopId)

      if (updateError) throw updateError

      // Create payment routing rules for accessibility accommodations
      if (config.offers_payment_assistance) {
        await supabase
          .from('payment_routing_rules')
          .upsert({
            barbershop_id: barbershopId,
            rule_name: 'Accessibility Accommodation Routing',
            rule_type: 'accessibility',
            conditions: {
              requires_accessibility: true,
              payment_assistance_needed: true
            },
            route_to: 'ask', // Let staff decide payment method
            priority: 90, // High priority
            is_active: true
          }, {
            onConflict: 'barbershop_id,rule_name'
          })
      }

      setSuccess('Accessibility payment settings saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving accessibility config:', err)
      setError('Failed to save accessibility payment settings')
    } finally {
      setLoading(false)
    }
  }

  const updatePaymentMethod = (method, enabled) => {
    setConfig(prev => ({
      ...prev,
      accessibility_payment_methods: enabled
        ? [...prev.accessibility_payment_methods, method]
        : prev.accessibility_payment_methods.filter(m => m !== method)
    }))
  }

  const accessibilityPaymentMethods = [
    {
      id: 'voice_authorization',
      name: 'Voice Authorization',
      description: 'Allow verbal payment confirmation for clients with mobility limitations'
    },
    {
      id: 'large_print_receipts',
      name: 'Large Print Receipts',
      description: 'Provide receipts with larger text for visually impaired clients'
    },
    {
      id: 'audio_payment_confirmation',
      name: 'Audio Payment Confirmation',
      description: 'Verbal confirmation of payment amounts and processing'
    },
    {
      id: 'assisted_card_entry',
      name: 'Assisted Card Entry',
      description: 'Staff assistance with card payment entry when needed'
    },
    {
      id: 'alternative_signature',
      name: 'Alternative Signature Methods',
      description: 'Accept alternative signature methods (verbal, witness, etc.)'
    },
    {
      id: 'extended_payment_time',
      name: 'Extended Payment Processing Time',
      description: 'Allow extra time for payment processing without timeout'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HeartIcon className="h-8 w-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold">Accessibility Payment Setup</h2>
          <p className="text-gray-600">Configure payment accommodations for accessibility needs</p>
        </div>
      </div>

      {/* Current Accessibility Status */}
      {barbershop && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Current Accessibility Status</h4>
              <p className="text-sm text-blue-800">
                {barbershop.name} is {barbershop.wheelchair_accessible ? '' : 'not '}wheelchair accessible.
                {barbershop.wheelchair_accessible 
                  ? ' Consider adding payment accommodations to fully support all clients.'
                  : ' Payment accommodations can help serve clients with various accessibility needs.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Accessibility Features */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Accessibility Features</h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.offers_payment_assistance}
              onChange={(e) => setConfig({...config, offers_payment_assistance: e.target.checked})}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <div>
              <p className="font-medium">Offer Payment Assistance</p>
              <p className="text-sm text-gray-600">Staff trained to assist clients with payment processing</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.has_accessible_payment_terminal}
              onChange={(e) => setConfig({...config, has_accessible_payment_terminal: e.target.checked})}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <div>
              <p className="font-medium">Accessible Payment Terminal</p>
              <p className="text-sm text-gray-600">Card reader at wheelchair-accessible height with audio prompts</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.payment_assistance_staff_trained}
              onChange={(e) => setConfig({...config, payment_assistance_staff_trained: e.target.checked})}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <div>
              <p className="font-medium">Staff Accessibility Training</p>
              <p className="text-sm text-gray-600">Team trained in assisting clients with disabilities</p>
            </div>
          </label>
        </div>
      </div>

      {/* Specialized Payment Options */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Specialized Payment Options</h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.accepts_disability_vouchers}
              onChange={(e) => setConfig({...config, accepts_disability_vouchers: e.target.checked})}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <div>
              <p className="font-medium">Accept Disability Service Vouchers</p>
              <p className="text-sm text-gray-600">Accept government or organization-issued vouchers</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.accepts_insurance_billing}
              onChange={(e) => setConfig({...config, accepts_insurance_billing: e.target.checked})}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <div>
              <p className="font-medium">Insurance Billing</p>
              <p className="text-sm text-gray-600">Bill insurance directly for eligible services</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.offers_invoice_billing}
              onChange={(e) => setConfig({...config, offers_invoice_billing: e.target.checked})}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <div>
              <p className="font-medium">Invoice Billing</p>
              <p className="text-sm text-gray-600">Send invoices for payment at client's convenience</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.offers_sliding_scale}
              onChange={(e) => setConfig({...config, offers_sliding_scale: e.target.checked})}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <div>
              <p className="font-medium">Sliding Scale Pricing</p>
              <p className="text-sm text-gray-600">Offer reduced rates based on client's ability to pay</p>
            </div>
          </label>
        </div>

        {/* Disability Discount */}
        {config.offers_sliding_scale && (
          <div className="mt-4 pl-7">
            <label className="block text-sm font-medium mb-2">
              Disability Discount Percentage
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.disability_discount_percentage}
                onChange={(e) => setConfig({...config, disability_discount_percentage: parseFloat(e.target.value)})}
                min="0"
                max="50"
                step="5"
                className="w-20 px-3 py-2 border rounded-lg text-center"
              />
              <span className="text-sm text-gray-600">% discount for qualified clients</span>
            </div>
          </div>
        )}
      </div>

      {/* Accessible Payment Methods */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Accessible Payment Methods</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select payment accommodations you can provide to clients with disabilities
        </p>
        
        <div className="space-y-3">
          {accessibilityPaymentMethods.map(method => (
            <label key={method.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={config.accessibility_payment_methods.includes(method.id)}
                onChange={(e) => updatePaymentMethod(method.id, e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded mt-0.5"
              />
              <div>
                <p className="font-medium text-sm">{method.name}</p>
                <p className="text-xs text-gray-600">{method.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Contact Method for Assistance */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Assistance Contact</h3>
        <p className="text-sm text-gray-600 mb-4">
          How should clients request payment assistance?
        </p>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              value="phone"
              checked={config.assistance_contact_method === 'phone'}
              onChange={(e) => setConfig({...config, assistance_contact_method: e.target.value})}
              className="h-4 w-4 text-blue-600"
            />
            <PhoneIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm">Call ahead to request assistance</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="radio"
              value="in_person"
              checked={config.assistance_contact_method === 'in_person'}
              onChange={(e) => setConfig({...config, assistance_contact_method: e.target.value})}
              className="h-4 w-4 text-blue-600"
            />
            <UserIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm">Request assistance upon arrival</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="radio"
              value="booking"
              checked={config.assistance_contact_method === 'booking'}
              onChange={(e) => setConfig({...config, assistance_contact_method: e.target.value})}
              className="h-4 w-4 text-blue-600"
            />
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm">Note assistance needs during booking</span>
          </label>
        </div>
      </div>

      {/* Legal Compliance Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-2">
          <InformationCircleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">ADA Compliance Note</p>
            <p>
              Under the Americans with Disabilities Act (ADA), businesses must provide reasonable accommodations 
              for payment processing. These settings help ensure compliance and improve accessibility for all clients.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-2">
            <ExclamationCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={saveAccessibilityConfig}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
        >
          {loading ? 'Saving...' : 'Save Accessibility Settings'}
        </button>
      </div>
    </div>
  )
}
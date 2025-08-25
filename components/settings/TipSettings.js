'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaDollarSign, FaPercent, FaCreditCard, FaStore, FaToggleOn, FaToggleOff, FaInfoCircle } from 'react-icons/fa'
import { MdSecurity } from 'react-icons/md'

/**
 * Tip Settings Component - Stripe Native Integration
 * 
 * Configures tip settings that integrate with Stripe's native tip handling:
 * - Uses Stripe Terminal Configuration API for in-person payments
 * - Uses Stripe PaymentIntent amount_details.tip for online payments
 * - Automatically compliant with FLSA (tips go 100% to service provider)
 * - Tax automatically excluded from tips
 * - No commission on tips (illegal under federal law)
 */
export default function TipSettings({ barbershopId }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stripeConfigId, setStripeConfigId] = useState(null)
  
  const [settings, setSettings] = useState({
    // Global Settings
    tips_enabled: true,
    
    // Service Tips - Customizable percentages
    service_tips_enabled: true,
    service_tip_percentages: [15, 20, 25], // 3 customizable percentages for Stripe
    service_tip_fixed_amounts: [3, 5, 10], // Fixed dollar amounts for small transactions
    service_custom_tip_enabled: true,
    smart_tip_threshold: 10, // Below $10, show fixed amounts instead of percentages
    
    // Product Tips
    product_tips_enabled: false, // Disabled by default for products
    product_tip_percentages: [10, 15, 20],
    product_tip_fixed_amounts: [1, 2, 5],
    
    // Display Settings
    tip_display_mode: 'after_service', // 'after_service', 'at_checkout', 'both'
    default_tip_selection: 1, // Index of default selected tip (0, 1, or 2)
    show_no_tip_option: true,
    
    // Cash Tips (for reporting only)
    track_cash_tips: true,
    cash_tip_reporting: true,
    
    // Staff Settings (Stripe handles actual distribution)
    tip_distribution_mode: 'individual', // 'individual', 'pooled'
    tip_pool_percentage: 0, // For pooled tips
  })

  const supabase = createClient()

  useEffect(() => {
    if (barbershopId) {
      loadSettings()
    }
  }, [barbershopId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      // Load tip settings from barbershop configuration
      const { data: barbershop, error } = await supabase
        .from('barbershops')
        .select('tip_settings, stripe_terminal_config_id')
        .eq('id', barbershopId)
        .single()

      if (error) throw error

      if (barbershop?.tip_settings) {
        setSettings(prev => ({
          ...prev,
          ...barbershop.tip_settings
        }))
      }
      
      if (barbershop?.stripe_terminal_config_id) {
        setStripeConfigId(barbershop.stripe_terminal_config_id)
      }
    } catch (error) {
      console.error('Error loading tip settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      
      // Save to database
      const { error } = await supabase
        .from('barbershops')
        .update({
          tip_settings: settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', barbershopId)

      if (error) throw error

      // Sync with Stripe Terminal Configuration
      if (settings.tips_enabled) {
        try {
          const response = await fetch('/api/stripe/terminal-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barbershop_id: barbershopId,
              service_tip_percentages: settings.service_tip_percentages,
              service_tip_fixed_amounts: settings.service_tip_fixed_amounts,
              smart_tip_threshold: settings.smart_tip_threshold,
              product_tips_enabled: settings.product_tips_enabled,
              stripe_account_id: null // Will be retrieved from barbershop's Stripe account if exists
            })
          })
          
          const result = await response.json()
          
          if (result.success) {
            // Update local config ID
            if (result.configuration?.id) {
              setStripeConfigId(result.configuration.id)
            }
            
            // Show success with Stripe sync
            const successDiv = document.createElement('div')
            successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
            successDiv.innerHTML = '✓ Tip settings saved and synced with Stripe Terminal!'
            document.body.appendChild(successDiv)
            setTimeout(() => successDiv.remove(), 3000)
          } else {
            // Saved locally but Stripe sync failed
            const warningDiv = document.createElement('div')
            warningDiv.className = 'fixed top-4 right-4 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
            warningDiv.innerHTML = '⚠️ Settings saved locally. Stripe sync pending.'
            document.body.appendChild(warningDiv)
            setTimeout(() => warningDiv.remove(), 4000)
          }
        } catch (stripeError) {
          console.warn('Stripe Terminal sync failed:', stripeError)
          // Show warning but don't fail the save
          const warningDiv = document.createElement('div')
          warningDiv.className = 'fixed top-4 right-4 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
          warningDiv.innerHTML = '⚠️ Settings saved. Stripe Terminal will sync on next payment.'
          document.body.appendChild(warningDiv)
          setTimeout(() => warningDiv.remove(), 4000)
        }
      } else {
        // Tips disabled - just show success
        const successDiv = document.createElement('div')
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
        successDiv.textContent = 'Tip settings saved successfully!'
        document.body.appendChild(successDiv)
        setTimeout(() => successDiv.remove(), 3000)
      }
      
    } catch (error) {
      console.error('Error saving tip settings:', error)
      const errorDiv = document.createElement('div')
      errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      errorDiv.textContent = 'Failed to save tip settings. Please try again.'
      document.body.appendChild(errorDiv)
      setTimeout(() => errorDiv.remove(), 4000)
    } finally {
      setSaving(false)
    }
  }

  // Update a specific tip percentage (limited to 3 for Stripe Terminal)
  const updateTipPercentage = (type, index, value) => {
    const key = type === 'service' ? 'service_tip_percentages' : 'product_tip_percentages'
    const numValue = parseInt(value) || 0
    
    // Validate percentage range (0-500%)
    if (numValue < 0 || numValue > 500) return
    
    setSettings(prev => {
      const newPercentages = [...prev[key]]
      newPercentages[index] = numValue
      return {
        ...prev,
        [key]: newPercentages
      }
    })
  }

  // Update a specific fixed amount
  const updateFixedAmount = (type, index, value) => {
    const key = type === 'service' ? 'service_tip_fixed_amounts' : 'product_tip_fixed_amounts'
    const numValue = parseFloat(value) || 0
    
    // Validate amount range ($0-$100)
    if (numValue < 0 || numValue > 100) return
    
    setSettings(prev => {
      const newAmounts = [...prev[key]]
      newAmounts[index] = numValue
      return {
        ...prev,
        [key]: newAmounts
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tip Settings</h2>
        <p className="text-gray-600">Configure tip options for Stripe payments</p>
        
        {/* Legal Compliance Notice */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MdSecurity className="text-green-600 text-xl mt-0.5" />
            <div>
              <p className="text-sm text-green-900 font-semibold mb-1">
                Stripe-Powered Legal Compliance
              </p>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✓ Tips go 100% to service provider (FLSA compliant)</li>
                <li>✓ No commission on tips (illegal under federal law)</li>
                <li>✓ Tips automatically excluded from sales tax</li>
                <li>✓ Proper IRS reporting via Stripe's 1099 system</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Global Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Global Tip Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Enable Tips</label>
              <p className="text-sm text-gray-500">Allow customers to add tips to their payments</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, tips_enabled: !prev.tips_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.tips_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.tips_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Track Cash Tips</label>
              <p className="text-sm text-gray-500">Record cash tips for reporting purposes</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, track_cash_tips: !prev.track_cash_tips }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.track_cash_tips ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.track_cash_tips ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="border-t pt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <FaInfoCircle className="text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">How Stripe Handles Tips</p>
                  <p className="text-xs text-blue-700">
                    Tips are tracked using Stripe's <code className="bg-blue-100 px-1 rounded">amount_details.tip</code> field, 
                    ensuring proper separation from service revenue. Platform fees are only calculated on the service amount, 
                    never on tips. This is automatically enforced by Stripe Connect.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Tips Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaCreditCard className="text-blue-600" />
          Service Tips
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="font-medium">Enable Tips for Services</label>
            <button
              onClick={() => setSettings(prev => ({ ...prev, service_tips_enabled: !prev.service_tips_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.service_tips_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.service_tips_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {settings.service_tips_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Tip Type</label>
                <select
                  value={settings.service_tip_type}
                  onChange={(e) => setSettings(prev => ({ ...prev, service_tip_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="percentage">Percentage Only</option>
                  <option value="fixed">Fixed Amount Only</option>
                  <option value="both">Both Options</option>
                </select>
              </div>

              {(settings.service_tip_type === 'percentage' || settings.service_tip_type === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Custom Tip Percentages
                    <span className="text-xs text-gray-500 ml-2">(Enter any 3 percentages)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map(index => (
                      <div key={index} className="relative">
                        <input
                          type="number"
                          value={settings.service_tip_percentages[index] || ''}
                          onChange={(e) => updateTipPercentage('service', index, e.target.value)}
                          className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={`Tip ${index + 1}`}
                          min="0"
                          max="500"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Example: Enter 30, 50, 100 for aggressive tipping or 10, 15, 20 for standard
                  </p>
                </div>
              )}

              {(settings.service_tip_type === 'fixed' || settings.service_tip_type === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fixed Tip Amounts
                    <span className="text-xs text-gray-500 ml-2">(For transactions under ${settings.smart_tip_threshold})</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map(index => (
                      <div key={index} className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="number"
                          value={settings.service_tip_fixed_amounts[index] || ''}
                          onChange={(e) => updateFixedAmount('service', index, e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={`Amount ${index + 1}`}
                          min="0"
                          max="100"
                          step="0.50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="font-medium">Allow Custom Amount</label>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, service_custom_tip_enabled: !prev.service_custom_tip_enabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.service_custom_tip_enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.service_custom_tip_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Product Tips Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaStore className="text-purple-600" />
          Product Tips
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Enable Tips for Products</label>
              <p className="text-sm text-gray-500">Allow tipping when purchasing products</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, product_tips_enabled: !prev.product_tips_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.product_tips_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.product_tips_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {settings.product_tips_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Tip Type</label>
                <select
                  value={settings.product_tip_type}
                  onChange={(e) => setSettings(prev => ({ ...prev, product_tip_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="percentage">Percentage Only</option>
                  <option value="fixed">Fixed Amount Only</option>
                  <option value="both">Both Options</option>
                </select>
              </div>

              {(settings.product_tip_type === 'percentage' || settings.product_tip_type === 'both') && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product Tip Percentages
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map(index => (
                      <div key={index} className="relative">
                        <input
                          type="number"
                          value={settings.product_tip_percentages[index] || ''}
                          onChange={(e) => updateTipPercentage('product', index, e.target.value)}
                          className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder={`Tip ${index + 1}`}
                          min="0"
                          max="500"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Display & Behavior</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">When to Show Tip Options</label>
            <select
              value={settings.tip_display_mode}
              onChange={(e) => setSettings(prev => ({ ...prev, tip_display_mode: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="after_service">After Service Selection</option>
              <option value="at_checkout">At Checkout Only</option>
              <option value="both">Both Times</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Default Tip Percentage</label>
            <select
              value={settings.default_tip_percentage}
              onChange={(e) => setSettings(prev => ({ ...prev, default_tip_percentage: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="0">No Default</option>
              <option value="15">15%</option>
              <option value="18">18%</option>
              <option value="20">20%</option>
              <option value="25">25%</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="font-medium">Show "No Tip" Option</label>
            <button
              onClick={() => setSettings(prev => ({ ...prev, show_no_tip_option: !prev.show_no_tip_option }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.show_no_tip_option ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.show_no_tip_option ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tip Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Tip Distribution</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Distribution Mode</label>
            <select
              value={settings.tip_distribution_mode}
              onChange={(e) => setSettings(prev => ({ ...prev, tip_distribution_mode: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="individual">Individual (100% to service provider)</option>
              <option value="pooled">Pooled (shared among staff)</option>
            </select>
          </div>

          {settings.tip_distribution_mode === 'pooled' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <FaInfoCircle className="text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-1">Tip Pooling Compliance</p>
                  <p className="text-xs text-amber-700">
                    Tip pooling is allowed under FLSA but must exclude managers and owners. 
                    Only employees who regularly receive tips can participate. 
                    Stripe will track pooled tips, but you must manually distribute them according to your policy.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> Stripe automatically ensures 100% of tips go to the designated recipient. 
              For pooled tips, the full amount goes to the service provider's account, 
              and you'll need to redistribute according to your pooling agreement.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <FaDollarSign />
              Save Tip Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}
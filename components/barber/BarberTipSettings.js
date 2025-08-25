'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { FaPercent, FaDollarSign, FaToggleOn, FaToggleOff } from 'react-icons/fa'

export default function BarberTipSettings({ barberId, barbershopId }) {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  
  // Shop defaults for reference
  const [shopSettings, setShopSettings] = useState(null)
  
  // Barber's custom settings
  const [settings, setSettings] = useState({
    use_shop_defaults: true,
    service_tip_percentages: [15, 20, 25],
    service_tip_fixed_amounts: [3, 5, 10],
    smart_tip_threshold: 10,
    product_tips_enabled: false,
    default_tip_index: 1 // Middle option
  })

  useEffect(() => {
    loadSettings()
  }, [barberId, barbershopId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load shop defaults first
      const { data: shopData } = await supabase
        .from('barbershop_settings')
        .select('tip_settings')
        .eq('barbershop_id', barbershopId)
        .single()

      if (shopData?.tip_settings) {
        setShopSettings(shopData.tip_settings)
      } else {
        // Use system defaults if shop has no settings
        setShopSettings({
          service_tip_percentages: [15, 20, 25],
          service_tip_fixed_amounts: [3, 5, 10],
          smart_tip_threshold: 10,
          product_tips_enabled: false
        })
      }

      // Load barber's custom settings
      const { data: barberData } = await supabase
        .from('barber_tip_settings')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .single()

      if (barberData) {
        setSettings({
          use_shop_defaults: barberData.use_shop_defaults,
          service_tip_percentages: barberData.service_tip_percentages || shopSettings?.service_tip_percentages || [15, 20, 25],
          service_tip_fixed_amounts: barberData.service_tip_fixed_amounts || shopSettings?.service_tip_fixed_amounts || [3, 5, 10],
          smart_tip_threshold: barberData.smart_tip_threshold || shopSettings?.smart_tip_threshold || 10,
          product_tips_enabled: barberData.product_tips_enabled ?? shopSettings?.product_tips_enabled ?? false,
          default_tip_index: barberData.default_tip_index ?? 1
        })
      } else {
        // No custom settings yet, use shop defaults
        setSettings({
          use_shop_defaults: true,
          service_tip_percentages: shopSettings?.service_tip_percentages || [15, 20, 25],
          service_tip_fixed_amounts: shopSettings?.service_tip_fixed_amounts || [3, 5, 10],
          smart_tip_threshold: shopSettings?.smart_tip_threshold || 10,
          product_tips_enabled: shopSettings?.product_tips_enabled || false,
          default_tip_index: 1
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setError('Failed to load tip settings')
    } finally {
      setLoading(false)
    }
  }

  const handlePercentageChange = (index, value) => {
    const newPercentages = [...settings.service_tip_percentages]
    newPercentages[index] = parseInt(value) || 0
    setSettings({
      ...settings,
      service_tip_percentages: newPercentages
    })
  }

  const handleFixedAmountChange = (index, value) => {
    const newAmounts = [...settings.service_tip_fixed_amounts]
    newAmounts[index] = parseFloat(value) || 0
    setSettings({
      ...settings,
      service_tip_fixed_amounts: newAmounts
    })
  }

  const toggleUseShopDefaults = () => {
    if (!settings.use_shop_defaults && shopSettings) {
      // Switching to custom - keep current values
      setSettings({
        ...settings,
        use_shop_defaults: false
      })
    } else {
      // Switching to shop defaults - reset to shop values
      setSettings({
        use_shop_defaults: true,
        service_tip_percentages: shopSettings?.service_tip_percentages || [15, 20, 25],
        service_tip_fixed_amounts: shopSettings?.service_tip_fixed_amounts || [3, 5, 10],
        smart_tip_threshold: shopSettings?.smart_tip_threshold || 10,
        product_tips_enabled: shopSettings?.product_tips_enabled || false,
        default_tip_index: 1
      })
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Prepare data for save
      const dataToSave = {
        barber_id: barberId,
        barbershop_id: barbershopId,
        use_shop_defaults: settings.use_shop_defaults,
        default_tip_index: settings.default_tip_index
      }

      // Only save custom values if not using shop defaults
      if (!settings.use_shop_defaults) {
        dataToSave.service_tip_percentages = settings.service_tip_percentages
        dataToSave.service_tip_fixed_amounts = settings.service_tip_fixed_amounts
        dataToSave.smart_tip_threshold = settings.smart_tip_threshold
        dataToSave.product_tips_enabled = settings.product_tips_enabled
      } else {
        // Set to null to inherit from shop
        dataToSave.service_tip_percentages = null
        dataToSave.service_tip_fixed_amounts = null
        dataToSave.smart_tip_threshold = null
        dataToSave.product_tips_enabled = null
      }

      // Upsert barber settings
      const { error: saveError } = await supabase
        .from('barber_tip_settings')
        .upsert(dataToSave, {
          onConflict: 'barber_id,barbershop_id'
        })

      if (saveError) throw saveError

      // Sync with Stripe Terminal if custom settings
      if (!settings.use_shop_defaults) {
        try {
          const response = await fetch('/api/stripe/terminal-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barbershop_id: barbershopId,
              barber_id: barberId,
              service_tip_percentages: settings.service_tip_percentages,
              service_tip_fixed_amounts: settings.service_tip_fixed_amounts,
              smart_tip_threshold: settings.smart_tip_threshold,
              product_tips_enabled: settings.product_tips_enabled
            })
          })

          if (!response.ok) {
            console.warn('Stripe sync failed, but settings saved locally')
          }
        } catch (stripeError) {
          console.warn('Could not sync with Stripe:', stripeError)
          // Don't fail the save - Stripe sync is optional
        }
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Shop Defaults Toggle */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Configuration Mode</h3>
            <p className="text-sm text-gray-600 mt-1">
              Use shop defaults or customize your own tip settings
            </p>
          </div>
          <button
            onClick={toggleUseShopDefaults}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors"
            style={{
              backgroundColor: settings.use_shop_defaults ? '#f3f4f6' : '#3c4a3e',
              borderColor: settings.use_shop_defaults ? '#d1d5db' : '#3c4a3e',
              color: settings.use_shop_defaults ? '#374151' : 'white'
            }}
          >
            {settings.use_shop_defaults ? (
              <>
                <FaToggleOff className="h-5 w-5" />
                <span>Using Shop Defaults</span>
              </>
            ) : (
              <>
                <FaToggleOn className="h-5 w-5" />
                <span>Custom Settings</span>
              </>
            )}
          </button>
        </div>

        {/* Show shop defaults for reference */}
        {settings.use_shop_defaults && shopSettings && (
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current Shop Defaults:</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Tip Percentages: {shopSettings.service_tip_percentages?.join('%, ')}%</div>
              <div>Fixed Amounts: ${shopSettings.service_tip_fixed_amounts?.join(', $')}</div>
              <div>Smart Threshold: ${shopSettings.smart_tip_threshold}</div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Settings (enabled when not using shop defaults) */}
      <div className={`bg-white rounded-lg shadow p-6 ${settings.use_shop_defaults ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Tip Configuration</h3>
        
        {/* Tip Percentages */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FaPercent className="inline h-4 w-4 mr-1" />
            Service Tip Percentages
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Three percentage options shown at checkout
          </p>
          <div className="grid grid-cols-3 gap-3">
            {settings.service_tip_percentages.map((percentage, index) => (
              <div key={index}>
                <label className="block text-xs text-gray-500 mb-1">
                  Option {index + 1} {index === settings.default_tip_index && '(Default)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => handlePercentageChange(index, e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    disabled={settings.use_shop_defaults}
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Amounts */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FaDollarSign className="inline h-4 w-4 mr-1" />
            Fixed Tip Amounts
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Shown for transactions below the smart threshold
          </p>
          <div className="grid grid-cols-3 gap-3">
            {settings.service_tip_fixed_amounts.map((amount, index) => (
              <div key={index}>
                <label className="block text-xs text-gray-500 mb-1">
                  Amount {index + 1}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={amount}
                    onChange={(e) => handleFixedAmountChange(index, e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    disabled={settings.use_shop_defaults}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Threshold */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Smart Tip Threshold
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Below this amount, show fixed tip amounts instead of percentages
          </p>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-2.5 text-gray-400">$</span>
            <input
              type="number"
              min="0"
              step="1"
              value={settings.smart_tip_threshold}
              onChange={(e) => setSettings({ ...settings, smart_tip_threshold: parseFloat(e.target.value) || 0 })}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              disabled={settings.use_shop_defaults}
            />
          </div>
        </div>

        {/* Default Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Tip Selection
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Which option is pre-selected at checkout (customer can change)
          </p>
          <select
            value={settings.default_tip_index}
            onChange={(e) => setSettings({ ...settings, default_tip_index: parseInt(e.target.value) })}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            disabled={settings.use_shop_defaults}
          >
            <option value={0}>First option ({settings.service_tip_percentages[0]}%)</option>
            <option value={1}>Middle option ({settings.service_tip_percentages[1]}%)</option>
            <option value={2}>Last option ({settings.service_tip_percentages[2]}%)</option>
          </select>
        </div>

        {/* Product Tips */}
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Product Tips
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Allow tips on product sales
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.product_tips_enabled}
            onChange={(e) => setSettings({ ...settings, product_tips_enabled: e.target.checked })}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            disabled={settings.use_shop_defaults}
          />
        </div>
      </div>

      {/* Legal Compliance Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Tip Compliance
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              All tips go 100% to you per FLSA requirements. The barbershop cannot take
              any commission or fees from tips. This is automatically enforced by our
              payment system.
            </p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">
                Settings saved successfully! Your custom tip configuration is now active.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
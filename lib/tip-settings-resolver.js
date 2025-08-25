/**
 * Tip Settings Resolver
 * 
 * Resolves the appropriate tip settings for a given context,
 * implementing the inheritance cascade:
 * System → Barbershop → Barber → Service
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Get the effective tip settings for a checkout session
 * @param {Object} params - Parameters for resolving tip settings
 * @param {string} params.barbershopId - The barbershop ID
 * @param {string} params.barberId - The barber ID (optional)
 * @param {string} params.serviceId - The service ID (optional)
 * @returns {Object} Resolved tip settings with source information
 */
export async function resolveTipSettings({ barbershopId, barberId, serviceId }) {
  const supabase = createClient()
  
  try {
    // Start with system defaults
    let resolvedSettings = {
      tips_enabled: true,
      service_tip_percentages: [15, 20, 25],
      service_tip_fixed_amounts: [3, 5, 10],
      smart_tip_threshold: 10,
      product_tips_enabled: false,
      tip_distribution_mode: 'individual',
      default_tip_index: 1, // Middle option
      source: 'system'
    }

    // Layer 1: Barbershop settings
    if (barbershopId) {
      const { data: shopSettings } = await supabase
        .from('barbershop_settings')
        .select('tip_settings')
        .eq('barbershop_id', barbershopId)
        .single()

      if (shopSettings?.tip_settings) {
        resolvedSettings = {
          ...resolvedSettings,
          ...shopSettings.tip_settings,
          source: 'barbershop'
        }
      }
    }

    // Layer 2: Barber settings (if barber specified)
    if (barberId && barbershopId) {
      const { data: barberSettings } = await supabase
        .from('barber_tip_settings')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .single()

      if (barberSettings && !barberSettings.use_shop_defaults) {
        // Apply barber overrides
        resolvedSettings = {
          tips_enabled: true,
          service_tip_percentages: barberSettings.service_tip_percentages || resolvedSettings.service_tip_percentages,
          service_tip_fixed_amounts: barberSettings.service_tip_fixed_amounts || resolvedSettings.service_tip_fixed_amounts,
          smart_tip_threshold: barberSettings.smart_tip_threshold ?? resolvedSettings.smart_tip_threshold,
          product_tips_enabled: barberSettings.product_tips_enabled ?? resolvedSettings.product_tips_enabled,
          tip_distribution_mode: barberSettings.tip_distribution_mode || resolvedSettings.tip_distribution_mode,
          default_tip_index: barberSettings.default_tip_index ?? resolvedSettings.default_tip_index,
          source: 'barber'
        }
      }
    }

    // Layer 3: Service-specific overrides (if service specified)
    if (serviceId && barbershopId) {
      const { data: serviceOverride } = await supabase
        .from('service_tip_overrides')
        .select('*')
        .eq('service_id', serviceId)
        .eq('barbershop_id', barbershopId)
        .eq('barber_id', barberId || null)
        .single()

      if (serviceOverride) {
        resolvedSettings = {
          ...resolvedSettings,
          tips_enabled: serviceOverride.tips_enabled ?? resolvedSettings.tips_enabled,
          service_tip_percentages: serviceOverride.custom_percentages || resolvedSettings.service_tip_percentages,
          service_tip_fixed_amounts: serviceOverride.custom_fixed_amounts || resolvedSettings.service_tip_fixed_amounts,
          source: 'service'
        }
      }
    }

    return resolvedSettings

  } catch (error) {
    console.error('Error resolving tip settings:', error)
    // Return system defaults on error
    return {
      tips_enabled: true,
      service_tip_percentages: [15, 20, 25],
      service_tip_fixed_amounts: [3, 5, 10],
      smart_tip_threshold: 10,
      product_tips_enabled: false,
      tip_distribution_mode: 'individual',
      default_tip_index: 1,
      source: 'system',
      error: error.message
    }
  }
}

/**
 * Determine which tip options to show based on amount and settings
 * @param {number} amount - The service amount
 * @param {Object} settings - The resolved tip settings
 * @returns {Object} Tip display configuration
 */
export function getTipDisplayOptions(amount, settings) {
  const useFixedAmounts = amount < settings.smart_tip_threshold
  
  if (useFixedAmounts) {
    // Show fixed amounts for small transactions
    return {
      type: 'fixed',
      options: settings.service_tip_fixed_amounts.map(amt => ({
        label: `$${amt}`,
        value: amt,
        amount: amt
      })),
      defaultIndex: Math.min(settings.default_tip_index, settings.service_tip_fixed_amounts.length - 1)
    }
  } else {
    // Show percentages for larger transactions
    return {
      type: 'percentage',
      options: settings.service_tip_percentages.map(pct => ({
        label: `${pct}%`,
        value: pct,
        amount: (amount * pct / 100).toFixed(2)
      })),
      defaultIndex: Math.min(settings.default_tip_index, settings.service_tip_percentages.length - 1)
    }
  }
}

/**
 * Calculate tip amount based on selection
 * @param {number} serviceAmount - The base service amount
 * @param {Object} tipSelection - The selected tip option
 * @param {string} tipSelection.type - 'percentage' or 'fixed'
 * @param {number} tipSelection.value - The tip value (percentage or dollar amount)
 * @returns {number} Calculated tip amount
 */
export function calculateTipAmount(serviceAmount, tipSelection) {
  if (!tipSelection || tipSelection.value === 0) {
    return 0
  }

  if (tipSelection.type === 'percentage') {
    return Number((serviceAmount * tipSelection.value / 100).toFixed(2))
  } else {
    // Fixed amount
    return Number(tipSelection.value)
  }
}

/**
 * Format tip options for display in UI
 * @param {Object} tipOptions - The tip display options
 * @param {number} serviceAmount - The service amount for calculations
 * @returns {Array} Formatted options for UI components
 */
export function formatTipOptionsForUI(tipOptions, serviceAmount) {
  return tipOptions.options.map((option, index) => ({
    id: `tip-option-${index}`,
    label: option.label,
    amount: option.amount,
    value: option.value,
    isDefault: index === tipOptions.defaultIndex,
    description: tipOptions.type === 'percentage' 
      ? `$${option.amount} tip`
      : `${((option.value / serviceAmount) * 100).toFixed(0)}% of service`
  }))
}

/**
 * Get tip settings for a specific checkout context
 * This is the main function to use at checkout
 * @param {Object} checkoutContext - The checkout context
 * @returns {Object} Complete tip configuration for checkout
 */
export async function getTipSettingsForCheckout(checkoutContext) {
  const { barbershopId, barberId, serviceId, serviceAmount } = checkoutContext
  
  // Resolve the settings based on hierarchy
  const settings = await resolveTipSettings({ barbershopId, barberId, serviceId })
  
  // If tips are disabled, return early
  if (!settings.tips_enabled) {
    return {
      enabled: false,
      source: settings.source
    }
  }
  
  // Get display options based on amount and smart threshold
  const displayOptions = getTipDisplayOptions(serviceAmount, settings)
  
  // Format for UI
  const formattedOptions = formatTipOptionsForUI(displayOptions, serviceAmount)
  
  return {
    enabled: true,
    source: settings.source,
    distributionMode: settings.tip_distribution_mode,
    options: formattedOptions,
    defaultSelection: formattedOptions[displayOptions.defaultIndex],
    type: displayOptions.type,
    rawSettings: settings
  }
}
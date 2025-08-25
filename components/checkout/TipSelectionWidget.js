'use client'

import { useState, useEffect } from 'react'
import { getTipSettingsForCheckout, calculateTipAmount } from '@/lib/tip-settings-resolver'
import { CurrencyDollarIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

/**
 * Tip Selection Widget for Checkout
 * 
 * This component demonstrates how to integrate the multi-level
 * tip configuration system into any checkout flow.
 * 
 * Usage:
 * <TipSelectionWidget
 *   barbershopId={barbershopId}
 *   barberId={barberId}
 *   serviceId={serviceId}
 *   serviceAmount={35.00}
 *   onTipChange={(tipAmount) => setTipAmount(tipAmount)}
 * />
 */
export default function TipSelectionWidget({
  barbershopId,
  barberId,
  serviceId,
  serviceAmount = 0,
  onTipChange,
  className = ''
}) {
  const [loading, setLoading] = useState(true)
  const [tipConfig, setTipConfig] = useState(null)
  const [selectedTip, setSelectedTip] = useState(null)
  const [customTipAmount, setCustomTipAmount] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    loadTipSettings()
  }, [barbershopId, barberId, serviceId, serviceAmount])

  const loadTipSettings = async () => {
    try {
      setLoading(true)
      
      const config = await getTipSettingsForCheckout({
        barbershopId,
        barberId,
        serviceId,
        serviceAmount
      })
      
      setTipConfig(config)
      
      // Pre-select the default option
      if (config.enabled && config.defaultSelection) {
        handleTipSelection(config.defaultSelection)
      }
    } catch (error) {
      console.error('Error loading tip settings:', error)
      // Fall back to basic tip options
      setTipConfig({
        enabled: true,
        source: 'fallback',
        options: [
          { id: 'tip-15', label: '15%', amount: (serviceAmount * 0.15).toFixed(2), value: 15 },
          { id: 'tip-20', label: '20%', amount: (serviceAmount * 0.20).toFixed(2), value: 20, isDefault: true },
          { id: 'tip-25', label: '25%', amount: (serviceAmount * 0.25).toFixed(2), value: 25 }
        ],
        defaultSelection: { 
          id: 'tip-20', 
          label: '20%', 
          amount: (serviceAmount * 0.20).toFixed(2), 
          value: 20 
        },
        type: 'percentage'
      })
      handleTipSelection(tipConfig.defaultSelection)
    } finally {
      setLoading(false)
    }
  }

  const handleTipSelection = (option) => {
    if (!option) {
      setSelectedTip(null)
      onTipChange?.(0)
      return
    }

    setSelectedTip(option)
    setShowCustom(false)
    setCustomTipAmount('')
    
    const tipAmount = parseFloat(option.amount)
    onTipChange?.(tipAmount)
  }

  const handleNoTip = () => {
    setSelectedTip(null)
    setShowCustom(false)
    setCustomTipAmount('')
    onTipChange?.(0)
  }

  const handleCustomTip = () => {
    setSelectedTip(null)
    setShowCustom(true)
  }

  const handleCustomTipSubmit = () => {
    const amount = parseFloat(customTipAmount)
    if (!isNaN(amount) && amount >= 0) {
      const customOption = {
        id: 'tip-custom',
        label: 'Custom',
        amount: amount.toFixed(2),
        value: amount
      }
      setSelectedTip(customOption)
      onTipChange?.(amount)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!tipConfig?.enabled) {
    return null // Tips disabled for this context
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
          Add Tip
        </h3>
        {tipConfig.source && tipConfig.source !== 'system' && (
          <span className="text-xs text-gray-500">
            {tipConfig.source === 'barber' ? 'Barber preferences' : 
             tipConfig.source === 'barbershop' ? 'Shop defaults' :
             tipConfig.source === 'service' ? 'Service specific' : ''}
          </span>
        )}
      </div>

      {/* Pre-configured tip options */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {tipConfig.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleTipSelection(option)}
            className={`relative px-3 py-3 rounded-lg border-2 transition-all ${
              selectedTip?.id === option.id
                ? 'border-brand-600 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            {option.isDefault && !selectedTip && (
              <span className="absolute -top-2 -right-2 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                Default
              </span>
            )}
            <div className="text-sm font-medium text-gray-900">
              {option.label}
            </div>
            <div className="text-xs text-gray-500">
              ${option.amount}
            </div>
          </button>
        ))}
      </div>

      {/* Additional options */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleNoTip}
          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
            selectedTip === null && !showCustom
              ? 'border-gray-400 bg-gray-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          No Tip
        </button>
        <button
          onClick={handleCustomTip}
          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
            showCustom || selectedTip?.id === 'tip-custom'
              ? 'border-brand-600 bg-brand-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          Custom Amount
        </button>
      </div>

      {/* Custom tip input */}
      {showCustom && (
        <div className="mt-3 flex items-center space-x-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-gray-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={customTipAmount}
              onChange={(e) => setCustomTipAmount(e.target.value)}
              onBlur={handleCustomTipSubmit}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomTipSubmit()}
              placeholder="0.00"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              autoFocus
            />
          </div>
          <button
            onClick={handleCustomTipSubmit}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm"
          >
            Apply
          </button>
        </div>
      )}

      {/* Tip amount display */}
      {selectedTip && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Tip Amount:</span>
            <span className="text-sm font-semibold text-gray-900">
              ${selectedTip.amount}
            </span>
          </div>
        </div>
      )}

      {/* Legal notice */}
      {tipConfig.distributionMode === 'individual' && (
        <div className="mt-3 flex items-start space-x-2">
          <InformationCircleIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-500">
            Tips go directly to your service provider
          </p>
        </div>
      )}
    </div>
  )
}
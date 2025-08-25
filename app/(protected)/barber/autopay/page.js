'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CreditCardIcon, 
  BuildingLibraryIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  BellIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

/**
 * Autopay Configuration Page
 * 
 * Allows barbers to set up automatic rent payments with:
 * - Method prioritization (balance → ACH → card)
 * - Payment date configuration
 * - Notification preferences
 * - Backup payment methods
 */
export default function AutopayPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [arrangement, setArrangement] = useState(null)
  const [autopayConfig, setAutopayConfig] = useState({
    enabled: false,
    payment_day: 1,
    payment_priority: ['balance', 'ach', 'card'],
    retry_failed: true,
    notify_before_charge: true,
    notify_on_success: true,
    notify_on_failure: true,
    advance_notice_days: 3
  })
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (user && profile) {
      loadAutopayConfig()
    }
  }, [user, profile])

  const loadAutopayConfig = async () => {
    setLoading(true)
    try {
      // Get barber's rent arrangement
      const { data: arrangement } = await supabase
        .from('financial_arrangements')
        .select(`
          *,
          barbershops!inner(name, address)
        `)
        .eq('barber_id', user.id)
        .in('arrangement_type', ['booth_rent', 'hybrid'])
        .eq('is_active', true)
        .single()

      if (arrangement) {
        setArrangement(arrangement)
        
        // Load autopay configuration
        const { data: config } = await supabase
          .from('autopay_configurations')
          .select('*')
          .eq('arrangement_id', arrangement.id)
          .single()

        if (config) {
          setAutopayConfig({
            enabled: config.is_active,
            payment_day: config.payment_day || arrangement.due_date_day || 1,
            payment_priority: config.payment_priority || arrangement.payment_method_priority || ['balance', 'ach', 'card'],
            retry_failed: config.retry_failed !== false,
            notify_before_charge: config.notify_before_charge !== false,
            notify_on_success: config.notify_on_success !== false,
            notify_on_failure: config.notify_on_failure !== false,
            advance_notice_days: config.advance_notice_days || 3
          })
        } else {
          // Use arrangement defaults
          setAutopayConfig(prev => ({
            ...prev,
            payment_day: arrangement.due_date_day || 1,
            payment_priority: arrangement.payment_method_priority || ['balance', 'ach', 'card']
          }))
        }
      }
    } catch (error) {
      console.error('Error loading autopay config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAutopay = async () => {
    if (!arrangement) return

    setSaving(true)
    try {
      const response = await fetch('/api/payments/autopay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arrangement_id: arrangement.id,
          barbershop_id: arrangement.barbershop_id,
          barber_id: user.id,
          is_active: autopayConfig.enabled,
          payment_day: autopayConfig.payment_day,
          payment_priority: autopayConfig.payment_priority,
          retry_failed: autopayConfig.retry_failed,
          notify_before_charge: autopayConfig.notify_before_charge,
          notify_on_success: autopayConfig.notify_on_success,
          notify_on_failure: autopayConfig.notify_on_failure,
          advance_notice_days: autopayConfig.advance_notice_days
        })
      })

      if (response.ok) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to save autopay settings')
      }
    } catch (error) {
      console.error('Error saving autopay:', error)
      alert('Failed to save autopay settings')
    } finally {
      setSaving(false)
    }
  }

  const movePaymentMethod = (method, direction) => {
    const currentIndex = autopayConfig.payment_priority.indexOf(method)
    if (currentIndex === -1) return

    const newPriority = [...autopayConfig.payment_priority]
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= newPriority.length) return

    // Swap positions
    [newPriority[currentIndex], newPriority[newIndex]] = 
    [newPriority[newIndex], newPriority[currentIndex]]

    setAutopayConfig(prev => ({ ...prev, payment_priority: newPriority }))
  }

  const getMethodIcon = (method) => {
    switch (method) {
      case 'balance':
        return <BanknotesIcon className="h-5 w-5" />
      case 'ach':
        return <BuildingLibraryIcon className="h-5 w-5" />
      case 'card':
        return <CreditCardIcon className="h-5 w-5" />
      default:
        return null
    }
  }

  const getMethodLabel = (method) => {
    switch (method) {
      case 'balance':
        return 'Commission Balance'
      case 'ach':
        return 'Bank Account (ACH)'
      case 'card':
        return 'Credit/Debit Card'
      default:
        return method
    }
  }

  const getMethodFee = (method, amount = 1000) => {
    switch (method) {
      case 'balance':
        return 'No fee'
      case 'ach':
        return 'Fee: $1.00'
      case 'card':
        return `Fee: ${formatCurrency(amount * 0.029 + 0.30)}`
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="animate-pulse">
            <div className="h-32 bg-white rounded-xl mb-4"></div>
            <div className="h-64 bg-white rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!arrangement) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card className="p-6 text-center">
            <BuildingLibraryIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Rent Arrangement</h2>
            <p className="text-gray-600 mb-4">
              You don't have an active booth rent arrangement.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  const rentAmount = arrangement.arrangement_type === 'booth_rent' 
    ? arrangement.booth_rent_amount 
    : arrangement.hybrid_base_rent

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Banner */}
      {showSuccess && (
        <div className="fixed top-0 left-0 right-0 bg-green-500 text-white p-4 text-center z-50">
          <CheckIcon className="h-5 w-5 inline mr-2" />
          Autopay settings saved successfully!
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 pt-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/barber/pay-rent" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
            ← Back to Pay Rent
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Autopay Settings</h1>
          <p className="text-gray-600 mt-1">
            Set up automatic rent payments for {arrangement.barbershops.name}
          </p>
        </div>

        {/* Enable Autopay Card */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Enable Autopay</h3>
                  <p className="text-sm text-gray-600">
                    Automatically pay {formatCurrency(rentAmount)} on day {autopayConfig.payment_day} of each month
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autopayConfig.enabled}
                  onChange={(e) => setAutopayConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {autopayConfig.enabled && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="space-y-1 text-xs">
                  <li>• We'll try payment methods in your preferred order</li>
                  <li>• If one fails, we automatically try the next</li>
                  <li>• You'll be notified before and after each payment</li>
                  <li>• Cancel anytime with no penalties</li>
                </ul>
              </div>
            )}
          </div>
        </Card>

        {autopayConfig.enabled && (
          <>
            {/* Payment Configuration */}
            <Card className="mb-6">
              <div className="p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <CalendarDaysIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Payment Schedule
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Day of Month
                    </label>
                    <select
                      value={autopayConfig.payment_day}
                      onChange={(e) => setAutopayConfig(prev => ({ ...prev, payment_day: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[...Array(28)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} of each month
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autopayConfig.retry_failed}
                        onChange={(e) => setAutopayConfig(prev => ({ ...prev, retry_failed: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Retry failed payments</span>
                        <p className="text-xs text-gray-500">Automatically retry with next payment method if one fails</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Priority */}
            <Card className="mb-6">
              <div className="p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Payment Method Priority
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  We'll try payment methods in this order to minimize fees:
                </p>

                <div className="space-y-2">
                  {autopayConfig.payment_priority.map((method, index) => (
                    <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-gray-400 mr-3">
                          {index + 1}
                        </span>
                        <div className="text-gray-700 mr-3">
                          {getMethodIcon(method)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {getMethodLabel(method)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getMethodFee(method, rentAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => movePaymentMethod(method, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => movePaymentMethod(method, 'down')}
                          disabled={index === autopayConfig.payment_priority.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Notifications */}
            <Card className="mb-6">
              <div className="p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <BellIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Notification Preferences
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autopayConfig.notify_before_charge}
                      onChange={(e) => setAutopayConfig(prev => ({ ...prev, notify_before_charge: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Payment reminder</span>
                      <p className="text-xs text-gray-500">
                        Notify me {autopayConfig.advance_notice_days} days before payment
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autopayConfig.notify_on_success}
                      onChange={(e) => setAutopayConfig(prev => ({ ...prev, notify_on_success: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Payment confirmation</span>
                      <p className="text-xs text-gray-500">Notify me when payment is successful</p>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autopayConfig.notify_on_failure}
                      onChange={(e) => setAutopayConfig(prev => ({ ...prev, notify_on_failure: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Payment issues</span>
                      <p className="text-xs text-gray-500">Alert me if all payment methods fail</p>
                    </div>
                  </label>

                  {autopayConfig.notify_before_charge && (
                    <div className="ml-6 mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Advance notice days
                      </label>
                      <select
                        value={autopayConfig.advance_notice_days}
                        onChange={(e) => setAutopayConfig(prev => ({ ...prev, advance_notice_days: parseInt(e.target.value) }))}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={1}>1 day before</option>
                        <option value={2}>2 days before</option>
                        <option value={3}>3 days before</option>
                        <option value={5}>5 days before</option>
                        <option value={7}>7 days before</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-between">
          <Link href="/barber/pay-rent">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleSaveAutopay}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
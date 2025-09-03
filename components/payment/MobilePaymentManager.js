'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import {
  DevicePhoneMobileIcon,
  MapPinIcon,
  CreditCardIcon,
  BanknotesIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  WifiIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline'

/**
 * MobilePaymentManager Component
 * 
 * Handles mobile service payment configuration and processing.
 * Supports both online and offline payment collection.
 */
export default function MobilePaymentManager({ barberId, barbershopId }) {
  const [loading, setLoading] = useState(false)
  const [mobileConfig, setMobileConfig] = useState({
    enabled: false,
    prepaymentRequired: false,
    serviceFee: 0,
    feeType: 'flat', // flat or percentage
    acceptedMethods: ['card', 'cash'],
    maxRadius: 10,
    offlineMode: false
  })
  const [stripeReaderStatus, setStripeReaderStatus] = useState(null)
  const [pendingSessions, setPendingSessions] = useState([])
  const [error, setError] = useState('')
  
  const supabase = createClient()

  // Load mobile payment configuration
  useEffect(() => {
    loadMobileConfig()
    checkPendingSessions()
  }, [barberId, barbershopId])

  const loadMobileConfig = async () => {
    try {
      // Get barber payment settings
      const { data: settings, error: settingsError } = await supabase
        .from('barber_payment_settings')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError
      }

      if (settings) {
        setMobileConfig({
          enabled: settings.mobile_payment_enabled || false,
          prepaymentRequired: settings.mobile_prepayment_required || false,
          serviceFee: settings.mobile_service_fee || 0,
          feeType: 'flat',
          acceptedMethods: settings.mobile_payment_methods || ['card', 'cash'],
          maxRadius: 10,
          offlineMode: false
        })

        // Check Stripe reader status if configured
        if (settings.stripe_mobile_reader_id) {
          checkReaderStatus(settings.stripe_mobile_reader_id)
        }
      }
    } catch (err) {
      console.error('Error loading mobile config:', err)
      setError('Failed to load mobile payment configuration')
    }
  }

  const checkReaderStatus = async (readerId) => {
    try {
      const response = await fetch('/api/stripe/check-reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerId })
      })

      if (response.ok) {
        const data = await response.json()
        setStripeReaderStatus(data)
      }
    } catch (err) {
      console.error('Error checking reader status:', err)
    }
  }

  const checkPendingSessions = async () => {
    try {
      // Get pending mobile payment sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('mobile_payment_sessions')
        .select('*')
        .eq('barber_id', barberId)
        .in('session_status', ['pending', 'service_complete'])
        .order('scheduled_at', { ascending: true })

      if (sessionError) throw sessionError

      setPendingSessions(sessions || [])
    } catch (err) {
      console.error('Error loading pending sessions:', err)
    }
  }

  const saveMobileConfig = async () => {
    setLoading(true)
    setError('')

    try {
      // Update barber payment settings
      const { error: updateError } = await supabase
        .from('barber_payment_settings')
        .upsert({
          barber_id: barberId,
          barbershop_id: barbershopId,
          mobile_payment_enabled: mobileConfig.enabled,
          mobile_prepayment_required: mobileConfig.prepaymentRequired,
          mobile_service_fee: mobileConfig.serviceFee,
          mobile_payment_methods: mobileConfig.acceptedMethods
        }, {
          onConflict: 'barber_id,barbershop_id'
        })

      if (updateError) throw updateError

      // Update barber profile
      await supabase
        .from('profiles')
        .update({
          offers_mobile_services: mobileConfig.enabled,
          mobile_service_radius_miles: mobileConfig.maxRadius,
          mobile_payment_methods: mobileConfig.acceptedMethods
        })
        .eq('id', barberId)

      setError('')
      alert('Mobile payment settings saved successfully!')
    } catch (err) {
      console.error('Error saving mobile config:', err)
      setError('Failed to save mobile payment settings')
    } finally {
      setLoading(false)
    }
  }

  const initiateMobilePayment = async (sessionId) => {
    setLoading(true)
    setError('')

    try {
      const session = pendingSessions.find(s => s.id === sessionId)
      if (!session) throw new Error('Session not found')

      // Check if online
      if (!navigator.onLine && !mobileConfig.offlineMode) {
        setError('No internet connection. Enable offline mode to continue.')
        setLoading(false)
        return
      }

      // Process payment based on method
      if (session.payment_method === 'card') {
        // Use Stripe Terminal SDK for card payments
        const response = await fetch('/api/stripe/mobile-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            amount: session.total_amount,
            readerId: stripeReaderStatus?.reader_id
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Payment failed')
        }

        // Update session status
        await supabase
          .from('mobile_payment_sessions')
          .update({
            session_status: 'paid',
            payment_collected_at: new Date().toISOString(),
            processor_transaction_id: result.chargeId
          })
          .eq('id', sessionId)

        // Refresh pending sessions
        await checkPendingSessions()
        
        alert('Payment collected successfully!')
      } else if (session.payment_method === 'cash') {
        // Mark as paid for cash
        await supabase
          .from('mobile_payment_sessions')
          .update({
            session_status: 'paid',
            payment_collected_at: new Date().toISOString(),
            payment_method: 'cash'
          })
          .eq('id', sessionId)

        await checkPendingSessions()
        alert('Cash payment recorded!')
      }
    } catch (err) {
      console.error('Error processing mobile payment:', err)
      setError(err.message || 'Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  const syncOfflinePayments = async () => {
    setLoading(true)
    setError('')

    try {
      // Get offline payments from local storage
      const offlinePayments = JSON.parse(localStorage.getItem('offline_payments') || '[]')
      
      if (offlinePayments.length === 0) {
        alert('No offline payments to sync')
        return
      }

      // Sync each payment
      for (const payment of offlinePayments) {
        await supabase
          .from('mobile_payment_sessions')
          .update({
            session_status: 'paid',
            payment_collected_at: payment.collected_at,
            payment_method: payment.method,
            notes: `Synced from offline mode: ${payment.notes || ''}`
          })
          .eq('id', payment.session_id)
      }

      // Clear offline storage
      localStorage.removeItem('offline_payments')
      
      await checkPendingSessions()
      alert(`Successfully synced ${offlinePayments.length} offline payments!`)
    } catch (err) {
      console.error('Error syncing offline payments:', err)
      setError('Failed to sync offline payments')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DevicePhoneMobileIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Mobile Payment Settings</h2>
            <p className="text-gray-600">Configure payment processing for mobile services</p>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {navigator.onLine ? (
            <>
              <WifiIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600">Online</span>
            </>
          ) : (
            <>
              <SignalSlashIcon className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-600">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Mobile Service Toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Enable Mobile Services</h3>
            <p className="text-sm text-gray-600">Accept payments for services at client locations</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={mobileConfig.enabled}
              onChange={(e) => setMobileConfig({...mobileConfig, enabled: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {mobileConfig.enabled && (
          <div className="space-y-4 pt-4 border-t">
            {/* Service Radius */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Maximum Service Radius (miles)
              </label>
              <input
                type="number"
                value={mobileConfig.maxRadius}
                onChange={(e) => setMobileConfig({...mobileConfig, maxRadius: parseInt(e.target.value)})}
                min="1"
                max="50"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Mobile Service Fee */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Mobile Service Fee
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={mobileConfig.serviceFee}
                  onChange={(e) => setMobileConfig({...mobileConfig, serviceFee: parseFloat(e.target.value)})}
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
                <select
                  value={mobileConfig.feeType}
                  onChange={(e) => setMobileConfig({...mobileConfig, feeType: e.target.value})}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="flat">Flat Fee ($)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
            </div>

            {/* Prepayment Requirement */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="prepayment"
                checked={mobileConfig.prepaymentRequired}
                onChange={(e) => setMobileConfig({...mobileConfig, prepaymentRequired: e.target.checked})}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="prepayment" className="text-sm">
                Require prepayment for mobile services
              </label>
            </div>

            {/* Accepted Payment Methods */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Accepted Payment Methods
              </label>
              <div className="space-y-2">
                {['card', 'cash', 'digital_wallet', 'check'].map(method => (
                  <label key={method} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mobileConfig.acceptedMethods.includes(method)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMobileConfig({
                            ...mobileConfig,
                            acceptedMethods: [...mobileConfig.acceptedMethods, method]
                          })
                        } else {
                          setMobileConfig({
                            ...mobileConfig,
                            acceptedMethods: mobileConfig.acceptedMethods.filter(m => m !== method)
                          })
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm capitalize">{method.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Offline Mode */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="offline"
                checked={mobileConfig.offlineMode}
                onChange={(e) => setMobileConfig({...mobileConfig, offlineMode: e.target.checked})}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="offline" className="text-sm">
                Enable offline payment collection (sync when online)
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Stripe Reader Status */}
      {mobileConfig.enabled && mobileConfig.acceptedMethods.includes('card') && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Card Reader Status</h3>
          
          {stripeReaderStatus ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reader ID:</span>
                <span className="font-mono">{stripeReaderStatus.reader_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  stripeReaderStatus.online ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stripeReaderStatus.online ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Battery:</span>
                <span>{stripeReaderStatus.battery_level || 'N/A'}%</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-3">No card reader configured</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Set Up Card Reader
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending Mobile Sessions */}
      {mobileConfig.enabled && pendingSessions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Pending Mobile Payments</h3>
            {mobileConfig.offlineMode && !navigator.onLine && (
              <button
                onClick={syncOfflinePayments}
                disabled={loading}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                Sync Offline Payments
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {pendingSessions.map(session => (
              <div key={session.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{session.client_name || 'Client'}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(session.scheduled_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${session.total_amount}</p>
                    <p className="text-xs text-gray-500">{session.service_location_type}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => initiateMobilePayment(session.id)}
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Collect Payment
                  </button>
                  <button className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-2">
            <ExclamationCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={saveMobileConfig}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
        >
          {loading ? 'Saving...' : 'Save Mobile Payment Settings'}
        </button>
      </div>
    </div>
  )
}
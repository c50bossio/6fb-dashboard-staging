'use client'

import { useState, useEffect } from 'react'
import { 
  UserGroupIcon,
  CogIcon,
  CheckIcon,
  XMarkIcon,
  LockClosedIcon,
  SparklesIcon,
  ChartBarIcon,
  BellIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  GiftIcon,
  ShieldCheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

export default function CustomerPortalSettings({ barbershopId, subscriptionTier = 'basic' }) {
  const [settings, setSettings] = useState({
    // Basic Features (All Tiers)
    allowPublicBooking: true,
    requireAccountForBooking: false,
    allowGuestCheckout: true,
    enableProgressiveSignup: true,
    
    // Customer Portal Features
    enableCustomerPortal: false,
    allowSelfRescheduling: false,
    allowSelfCancellation: false,
    cancellationWindowHours: 24,
    
    // Advanced Features (Professional+)
    enableLoyaltyProgram: false,
    pointsPerDollar: 1,
    rewardThreshold: 100,
    enableReferralProgram: false,
    referralBonus: 10,
    
    // Premium Features (Enterprise)
    enableAIInsights: false,
    enableAutomatedMarketing: false,
    enableCustomerSegmentation: false,
    enablePredictiveBooking: false,
    
    // Communication Settings
    sendBookingConfirmations: true,
    sendReminders: true,
    reminderHoursBefore: 24,
    sendMarketingEmails: false,
    sendBirthdayOffers: false,
    
    // Payment Settings
    savePaymentMethods: false,
    enableTipping: true,
    defaultTipPercentages: [15, 18, 20, 25],
    
    // Data & Privacy
    dataRetentionDays: 365,
    allowDataExport: true,
    requireConsent: true
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const supabase = createClient()

  // Feature availability by tier
  const tierFeatures = {
    basic: {
      allowPublicBooking: true,
      requireAccountForBooking: true,
      allowGuestCheckout: true,
      enableProgressiveSignup: true,
      enableCustomerPortal: false,
      allowSelfRescheduling: false,
      allowSelfCancellation: false,
      enableLoyaltyProgram: false,
      enableReferralProgram: false,
      enableAIInsights: false,
      enableAutomatedMarketing: false,
      savePaymentMethods: false
    },
    professional: {
      allowPublicBooking: true,
      requireAccountForBooking: true,
      allowGuestCheckout: true,
      enableProgressiveSignup: true,
      enableCustomerPortal: true,
      allowSelfRescheduling: true,
      allowSelfCancellation: true,
      enableLoyaltyProgram: true,
      enableReferralProgram: true,
      enableAIInsights: false,
      enableAutomatedMarketing: false,
      savePaymentMethods: true
    },
    enterprise: {
      allowPublicBooking: true,
      requireAccountForBooking: true,
      allowGuestCheckout: true,
      enableProgressiveSignup: true,
      enableCustomerPortal: true,
      allowSelfRescheduling: true,
      allowSelfCancellation: true,
      enableLoyaltyProgram: true,
      enableReferralProgram: true,
      enableAIInsights: true,
      enableAutomatedMarketing: true,
      savePaymentMethods: true,
      enableCustomerSegmentation: true,
      enablePredictiveBooking: true
    }
  }

  useEffect(() => {
    loadSettings()
  }, [barbershopId])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('barbershops')
        .select('customer_portal_settings, booking_settings')
        .eq('id', barbershopId)
        .single()

      if (data) {
        // Merge stored settings with defaults
        const storedSettings = {
          ...settings,
          ...(data.customer_portal_settings || {}),
          ...(data.booking_settings || {})
        }
        setSettings(storedSettings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          customer_portal_settings: settings,
          booking_settings: {
            allowPublicBooking: settings.allowPublicBooking,
            requireAccountForBooking: settings.requireAccountForBooking,
            allowGuestCheckout: settings.allowGuestCheckout,
            enableProgressiveSignup: settings.enableProgressiveSignup
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', barbershopId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const isFeatureAvailable = (feature) => {
    return tierFeatures[subscriptionTier]?.[feature] !== false
  }

  const FeatureToggle = ({ 
    label, 
    description, 
    settingKey, 
    locked = false,
    requiredTier = null,
    icon: Icon 
  }) => {
    const available = !locked && isFeatureAvailable(settingKey)
    
    return (
      <div className={`p-4 rounded-lg border ${
        available ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {Icon && (
              <div className={`p-2 rounded-lg ${
                available ? 'bg-blue-50' : 'bg-gray-100'
              }`}>
                <Icon className={`h-5 w-5 ${
                  available ? 'text-blue-600' : 'text-gray-400'
                }`} />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={`font-medium ${
                  available ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {label}
                </h4>
                {!available && requiredTier && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    {requiredTier}+
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 ${
                available ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {description}
              </p>
            </div>
          </div>
          
          <div className="ml-4">
            {available ? (
              <button
                onClick={() => setSettings({...settings, [settingKey]: !settings[settingKey]})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings[settingKey] ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings[settingKey] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            ) : (
              <LockClosedIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
        
        {/* Additional Settings */}
        {available && settings[settingKey] && settingKey === 'allowSelfCancellation' && (
          <div className="mt-4 pl-10">
            <label className="block text-sm font-medium text-gray-700">
              Cancellation window (hours before appointment)
            </label>
            <input
              type="number"
              value={settings.cancellationWindowHours}
              onChange={(e) => setSettings({
                ...settings, 
                cancellationWindowHours: parseInt(e.target.value)
              })}
              className="mt-1 w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
              min="1"
              max="72"
            />
          </div>
        )}
        
        {available && settings[settingKey] && settingKey === 'enableLoyaltyProgram' && (
          <div className="mt-4 pl-10 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Points per dollar spent
              </label>
              <input
                type="number"
                value={settings.pointsPerDollar}
                onChange={(e) => setSettings({
                  ...settings, 
                  pointsPerDollar: parseInt(e.target.value)
                })}
                className="mt-1 w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Points needed for reward
              </label>
              <input
                type="number"
                value={settings.rewardThreshold}
                onChange={(e) => setSettings({
                  ...settings, 
                  rewardThreshold: parseInt(e.target.value)
                })}
                className="mt-1 w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="50"
                max="1000"
                step="50"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Portal Settings</h2>
          <p className="text-gray-600 mt-1">
            Configure how customers interact with your barbershop online
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Subscription:</span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
            {subscriptionTier}
          </span>
        </div>
      </div>

      {/* Booking Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Booking Experience</h3>
        </div>
        <div className="p-6 space-y-4">
          <FeatureToggle
            label="Allow Public Booking"
            description="Let customers book without creating an account first"
            settingKey="allowPublicBooking"
            icon={CalendarDaysIcon}
          />
          
          <FeatureToggle
            label="Enable Progressive Signup"
            description="Offer account creation after successful booking"
            settingKey="enableProgressiveSignup"
            icon={UserGroupIcon}
          />
          
          <FeatureToggle
            label="Allow Guest Checkout"
            description="Complete bookings without requiring registration"
            settingKey="allowGuestCheckout"
            icon={CheckIcon}
          />
        </div>
      </div>

      {/* Customer Portal Features */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Customer Self-Service</h3>
        </div>
        <div className="p-6 space-y-4">
          <FeatureToggle
            label="Enable Customer Portal"
            description="Give customers a dashboard to manage their appointments"
            settingKey="enableCustomerPortal"
            requiredTier="professional"
            icon={UserGroupIcon}
          />
          
          <FeatureToggle
            label="Allow Self-Rescheduling"
            description="Let customers change their appointment times"
            settingKey="allowSelfRescheduling"
            requiredTier="professional"
            icon={CalendarDaysIcon}
          />
          
          <FeatureToggle
            label="Allow Self-Cancellation"
            description="Let customers cancel their own appointments"
            settingKey="allowSelfCancellation"
            requiredTier="professional"
            icon={XMarkIcon}
          />
        </div>
      </div>

      {/* Loyalty & Rewards */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Loyalty & Rewards</h3>
        </div>
        <div className="p-6 space-y-4">
          <FeatureToggle
            label="Enable Loyalty Program"
            description="Reward customers with points for each visit"
            settingKey="enableLoyaltyProgram"
            requiredTier="professional"
            icon={GiftIcon}
          />
          
          <FeatureToggle
            label="Enable Referral Program"
            description="Give bonuses for customer referrals"
            settingKey="enableReferralProgram"
            requiredTier="professional"
            icon={UserGroupIcon}
          />
        </div>
      </div>

      {/* AI & Automation (Enterprise) */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">AI & Automation</h3>
        </div>
        <div className="p-6 space-y-4">
          <FeatureToggle
            label="AI Customer Insights"
            description="Use AI to analyze customer behavior and preferences"
            settingKey="enableAIInsights"
            requiredTier="enterprise"
            icon={SparklesIcon}
          />
          
          <FeatureToggle
            label="Automated Marketing"
            description="Send personalized marketing campaigns automatically"
            settingKey="enableAutomatedMarketing"
            requiredTier="enterprise"
            icon={BellIcon}
          />
          
          <FeatureToggle
            label="Customer Segmentation"
            description="Automatically group customers for targeted campaigns"
            settingKey="enableCustomerSegmentation"
            requiredTier="enterprise"
            icon={ChartBarIcon}
          />
          
          <FeatureToggle
            label="Predictive Booking"
            description="AI suggests optimal booking times to customers"
            settingKey="enablePredictiveBooking"
            requiredTier="enterprise"
            icon={SparklesIcon}
          />
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payment Options</h3>
        </div>
        <div className="p-6 space-y-4">
          <FeatureToggle
            label="Save Payment Methods"
            description="Allow customers to save cards for future use"
            settingKey="savePaymentMethods"
            requiredTier="professional"
            icon={CreditCardIcon}
          />
          
          <FeatureToggle
            label="Enable Tipping"
            description="Allow customers to add tips during checkout"
            settingKey="enableTipping"
            icon={GiftIcon}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        {message && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckIcon className="h-5 w-5" />
            ) : (
              <XMarkIcon className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}
        
        <button
          onClick={saveSettings}
          disabled={saving}
          className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
      
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Upgrade to unlock more features</p>
            <p>
              Professional and Enterprise plans include advanced customer portal features, 
              AI-powered insights, and automated marketing tools. 
              <a href="/pricing" className="underline ml-1">View pricing</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
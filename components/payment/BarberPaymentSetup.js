'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import {
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon,
  UserIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'

/**
 * BarberPaymentSetup Component
 * 
 * Handles payment setup for individual barbers in booth rental model.
 * Each barber gets their own Stripe Connected Account with direct charges.
 */
export default function BarberPaymentSetup({ barbershopId, barberId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [stripeStatus, setStripeStatus] = useState(null)
  const [barbershop, setBarbershop] = useState(null)
  const [barberProfile, setBarberProfile] = useState(null)
  const [existingAccount, setExistingAccount] = useState(null)
  
  const supabase = createClient()
  const router = useRouter()

  // Load barbershop and barber information
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get barbershop details
        const { data: shopData, error: shopError } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', barbershopId)
          .single()
        
        if (shopError) throw shopError
        setBarbershop(shopData)

        // Get barber profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', barberId)
          .single()
        
        if (profileError) throw profileError
        setBarberProfile(profileData)

        // Check for existing Stripe account
        const { data: accountData } = await supabase
          .from('stripe_connected_accounts')
          .select('*')
          .eq('user_id', barberId)
          .eq('account_owner_type', 'barber')
          .single()
        
        if (accountData) {
          setExistingAccount(accountData)
          setStripeStatus(accountData)
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load payment information')
      }
    }

    if (barbershopId && barberId) {
      loadData()
    }
  }, [barbershopId, barberId, supabase])

  // Create Stripe Connected Account for barber
  const createBarberStripeAccount = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Call API to create Stripe Connected Account
      const response = await fetch('/api/stripe/barber-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          barbershopId,
          email: barberProfile?.email,
          businessType: 'individual', // Most booth renters are individuals
          accountType: 'express', // Express for simpler onboarding
          chargeType: 'direct', // Direct charges for booth rental
          metadata: {
            model: 'booth_rental',
            barbershop_name: barbershop?.name,
            barber_name: barberProfile?.full_name
          }
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create Stripe account')
      }

      if (result.onboarding_url) {
        // Store session data for return
        sessionStorage.setItem('barber_stripe_setup', 'true')
        sessionStorage.setItem('return_path', window.location.pathname)
        
        setSuccess('Redirecting to Stripe for account setup...')
        
        // Redirect to Stripe onboarding
        setTimeout(() => {
          window.location.href = result.onboarding_url
        }, 1000)
      }
    } catch (err) {
      console.error('Error creating Stripe account:', err)
      setError(err.message || 'Failed to create payment account')
    } finally {
      setLoading(false)
    }
  }

  // Handle return from Stripe onboarding
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const setupComplete = urlParams.get('setup_complete') === 'true'
    
    if (setupComplete && sessionStorage.getItem('barber_stripe_setup') === 'true') {
      sessionStorage.removeItem('barber_stripe_setup')
      setSuccess('Payment account successfully created! You can now process your own payments.')
      
      // Reload account status
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
  }, [])

  // If shop doesn't allow booth rental
  if (barbershop && barbershop.payment_model !== 'booth_rental' && barbershop.payment_model !== 'hybrid') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex gap-3">
          <ExclamationCircleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">
              Individual Payment Processing Not Available
            </h3>
            <p className="text-yellow-800 mb-3">
              {barbershop.name} uses a {barbershop.payment_model} payment model. 
              All payments are processed through the shop's account.
            </p>
            <p className="text-sm text-yellow-700">
              Contact your shop owner if you believe you should have independent payment processing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If barber already has an active account
  if (existingAccount && existingAccount.charges_enabled) {
    return (
      <div className="space-y-6">
        {/* Success Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">
                Payment Processing Active
              </h3>
              <p className="text-green-800 mb-4">
                You're all set to process your own payments as an independent contractor.
              </p>
              
              {/* Account Details */}
              <div className="bg-white rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account Type:</span>
                  <span className="font-medium">Independent Barber</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Processing Model:</span>
                  <span className="font-medium">Direct Charges</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 font-medium">Active</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  View Stripe Dashboard
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
                <button
                  onClick={() => router.push('/dashboard/payments')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  View Transactions
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Tax Reminder</p>
              <p>As an independent contractor, you're responsible for your own taxes. 
              Stripe will provide 1099 forms for tax filing. Consider setting aside 25-30% for taxes.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Setup form for new accounts
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Independent Payment Processing</h2>
        <p className="text-gray-600">
          Set up your own Stripe account to process payments directly from clients.
        </p>
      </div>

      {/* Booth Rental Context */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <BuildingStorefrontIcon className="h-8 w-8 text-gray-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-2">Booth Rental at {barbershop?.name}</h3>
            <p className="text-sm text-gray-600 mb-3">
              As a booth renter, you'll process your own payments and keep 100% of service revenue. 
              You're responsible for paying booth rent separately to the shop.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Your Status:</span>
                <p className="font-medium">Independent Contractor</p>
              </div>
              <div>
                <span className="text-gray-500">Tax Form:</span>
                <p className="font-medium">1099 (Self-Employed)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What You'll Get */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold mb-4">What You'll Get</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Your Own Stripe Account</p>
              <p className="text-xs text-gray-600">Process payments directly, no middleman</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Next-Day Deposits</p>
              <p className="text-xs text-gray-600">Funds deposited directly to your bank</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Full Transaction History</p>
              <p className="text-xs text-gray-600">Access all your payment data anytime</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Tax Reporting</p>
              <p className="text-xs text-gray-600">Automated 1099 generation for tax filing</p>
            </div>
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

      {/* Setup Button */}
      <div className="flex gap-4">
        <button
          onClick={createBarberStripeAccount}
          disabled={loading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <CreditCardIcon className="h-5 w-5" />
              Set Up Payment Processing
            </>
          )}
        </button>
        
        <button
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">Important Notes</h4>
        <ul className="space-y-1 text-sm text-yellow-800">
          <li>• You'll need your SSN or EIN for tax reporting</li>
          <li>• Bank account verification takes 1-2 business days</li>
          <li>• Stripe charges 2.9% + 30¢ per transaction</li>
          <li>• BookedBarber platform fee: 2.5% per transaction</li>
          <li>• Remember to set aside money for quarterly tax payments</li>
        </ul>
      </div>
    </div>
  )
}
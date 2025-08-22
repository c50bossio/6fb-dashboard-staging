'use client'

import { useState } from 'react'
import { 
  UserIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  StarIcon,
  GiftIcon,
  BellIcon,
  CreditCardIcon,
  ArrowRightIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

export default function ProgressiveAccountCreation({ 
  bookingDetails,
  customerInfo,
  onAccountCreated,
  onSkip 
}) {
  const [isCreating, setIsCreating] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [accountCreated, setAccountCreated] = useState(false)

  const supabase = createClient()

  const benefits = [
    {
      icon: CalendarDaysIcon,
      title: 'Manage Appointments',
      description: 'View, reschedule, or cancel bookings anytime'
    },
    {
      icon: ClockIcon,
      title: 'Quick Rebooking',
      description: 'Book your favorite services in seconds'
    },
    {
      icon: StarIcon,
      title: 'Earn Rewards',
      description: 'Get loyalty points with every visit'
    },
    {
      icon: CreditCardIcon,
      title: 'Saved Payment Methods',
      description: 'Securely store cards for faster checkout'
    },
    {
      icon: BellIcon,
      title: 'Smart Reminders',
      description: 'Never miss an appointment again'
    },
    {
      icon: GiftIcon,
      title: 'Exclusive Offers',
      description: 'Get member-only deals and discounts'
    }
  ]

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    setError(null)
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsCreating(true)

    try {
      // Create account with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: customerInfo.email,
        password: password,
        options: {
          data: {
            full_name: customerInfo.name,
            phone: customerInfo.phone,
            source: 'progressive_signup'
          }
        }
      })

      if (authError) throw authError

      // Link the booking to the new user account
      if (authData.user && bookingDetails.id) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ 
            user_id: authData.user.id,
            customer_account_created: true 
          })
          .eq('id', bookingDetails.id)

        if (updateError) {
          console.error('Failed to link booking:', updateError)
        }
      }

      // Create customer profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('customers')
          .insert({
            id: authData.user.id,
            barbershop_id: bookingDetails.barbershop_id,
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
            first_visit_date: new Date().toISOString(),
            total_visits: 1,
            last_visit_date: bookingDetails.scheduled_at,
            loyalty_points: 10, // Welcome bonus
            source: 'progressive_signup'
          })

        if (profileError) {
          console.error('Failed to create customer profile:', profileError)
        }
      }

      setAccountCreated(true)
      
      if (onAccountCreated) {
        onAccountCreated(authData.user)
      }

    } catch (error) {
      console.error('Account creation error:', error)
      setError(error.message || 'Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  if (accountCreated) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircleIcon className="h-12 w-12 text-green-600" />
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Account Created Successfully!
          </h3>
          <p className="text-gray-600">
            Check your email to verify your account
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
          <h4 className="font-semibold text-blue-900 mb-3">Welcome Rewards</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <GiftIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>10 loyalty points added to your account</span>
            </li>
            <li className="flex items-start">
              <StarIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>You're now earning points with every visit</span>
            </li>
            <li className="flex items-start">
              <CalendarDaysIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Access your bookings anytime from your dashboard</span>
            </li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <a
            href="/dashboard"
            className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
            <ArrowRightIcon className="inline-block h-4 w-4 ml-2" />
          </a>
          <button
            onClick={onSkip}
            className="block w-full text-gray-600 py-2 text-sm hover:text-gray-800"
          >
            Continue as guest
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <UserIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Save Time on Future Bookings
        </h3>
        <p className="text-gray-600">
          Create a free account to manage your appointments and earn rewards
        </p>
      </div>
      
      {/* Benefits Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon
          return (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Icon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{benefit.title}</p>
                <p className="text-xs text-gray-600">{benefit.description}</p>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Account Creation Form */}
      <form onSubmit={handleCreateAccount} className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <ShieldCheckIcon className="inline-block h-4 w-4 mr-1" />
            Your booking is already confirmed. Creating an account is optional.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={customerInfo.email}
            disabled
            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Create Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="At least 6 characters"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Re-enter your password"
          />
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <div className="space-y-3">
          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating Account...' : 'Create Free Account'}
          </button>
          
          <button
            type="button"
            onClick={onSkip}
            className="w-full text-gray-600 py-2 text-sm hover:text-gray-800"
          >
            Skip for now, I'll create an account later
          </button>
        </div>
        
        <p className="text-xs text-center text-gray-500">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </form>
    </div>
  )
}
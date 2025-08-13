'use client'

import { useState } from 'react'

import { triggerNotification, NOTIFICATION_TEMPLATES } from '../lib/novu'
import { posthog } from '../lib/posthog'
import { captureException, setUser } from '../lib/sentry'
import { getStripe, createCustomer } from '../lib/stripe'

import { useFeatureFlags, WhenFeatureEnabled } from './EdgeConfigFeatureFlag'
import { useAuth } from './SupabaseAuthProvider'
import TurnstileWidget from './TurnstileWidget'

export default function AuthenticationForm({ mode = 'login' }) {
  const { signIn, signUp, resetPassword, loading: authLoading } = useAuth()
  const { isFeatureEnabled } = useFeatureFlags()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    shopName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [showTurnstile, setShowTurnstile] = useState(false)
  const [turnstileReset, setTurnstileReset] = useState(0)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear errors when user starts typing
    if (error) setError('')
  }

  const handleTurnstileVerify = (token) => {
    console.log('Turnstile verified:', token)
    setTurnstileToken(token)
    setError('')
  }

  const handleTurnstileError = () => {
    console.error('Turnstile verification failed')
    setTurnstileToken(null)
    setError('CAPTCHA verification failed. Please try again.')
  }

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required')
      return false
    }

    if (mode === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return false
      }
      
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long')
        return false
      }
      
      if (!formData.firstName || !formData.lastName) {
        setError('First name and last name are required')
        return false
      }
    }

    // Check if CAPTCHA is required and verified
    if (showTurnstile && !turnstileToken) {
      setError('Please complete the CAPTCHA verification')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'login') {
        // Login
        const result = await signIn({
          email: formData.email,
          password: formData.password
        })
        
        if (result.user) {
          // Track login with PostHog
          posthog.capture('user_login', {
            email: formData.email,
            timestamp: new Date().toISOString()
          })
          
          // Set user in Sentry
          setUser(result.user)
          
          // Send welcome notification via Novu
          if (isFeatureEnabled('welcomeNotifications')) {
            try {
              await triggerNotification(
                NOTIFICATION_TEMPLATES.WELCOME_EMAIL,
                result.user.id,
                {
                  firstName: result.user.user_metadata?.firstName || 'there',
                  email: formData.email
                }
              )
            } catch (notifError) {
              console.warn('Welcome notification failed:', notifError)
            }
          }
          
          setSuccess('Login successful! Redirecting...')
        }
        
      } else if (mode === 'register') {
        // Registration
        const metadata = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          shopName: formData.shopName,
          turnstileToken: turnstileToken // Include CAPTCHA token
        }
        
        const result = await signUp({
          email: formData.email,
          password: formData.password,
          metadata
        })
        
        if (result.user) {
          // Track registration with PostHog
          posthog.capture('user_registration', {
            email: formData.email,
            shopName: formData.shopName,
            timestamp: new Date().toISOString()
          })
          
          // Create Stripe customer if billing is enabled
          if (isFeatureEnabled('billingIntegration')) {
            try {
              await createCustomer(
                formData.email,
                `${formData.firstName} ${formData.lastName}`,
                {
                  userId: result.user.id,
                  shopName: formData.shopName
                }
              )
            } catch (stripeError) {
              console.warn('Stripe customer creation failed:', stripeError)
              // Don't fail registration for Stripe errors
            }
          }
          
          // Send welcome notification
          try {
            await triggerNotification(
              NOTIFICATION_TEMPLATES.WELCOME_EMAIL,
              result.user.id,
              {
                firstName: formData.firstName,
                email: formData.email,
                shopName: formData.shopName
              }
            )
          } catch (notifError) {
            console.warn('Welcome notification failed:', notifError)
          }
          
          if (result.requiresEmailConfirmation) {
            setSuccess('Registration successful! Please check your email to verify your account.')
          } else {
            setSuccess('Registration successful! You are now logged in.')
          }
        }
        
      } else if (mode === 'reset') {
        // Password reset
        await resetPassword(formData.email)
        setSuccess('Password reset email sent! Check your inbox.')
        
        // Track password reset with PostHog
        posthog.capture('password_reset_requested', {
          email: formData.email,
          timestamp: new Date().toISOString()
        })
      }
      
    } catch (err) {
      console.error('Authentication error:', err)
      setError(err.message || 'An error occurred. Please try again.')
      
      // Show CAPTCHA after failed attempts (security feature)
      if (err.message?.includes('Too many') || err.message?.includes('rate limit')) {
        setShowTurnstile(true)
        setTurnstileReset(prev => prev + 1) // Reset CAPTCHA
      }
      
      // Log error to Sentry
      captureException(err, {
        tags: {
          operation: mode,
          email: formData.email
        },
        user: {
          email: formData.email
        }
      })
      
    } finally {
      setLoading(false)
    }
  }

  const getSubmitButtonText = () => {
    if (loading) {
      return mode === 'login' ? 'Signing in...' : 
             mode === 'register' ? 'Creating account...' : 
             'Sending reset email...'
    }
    
    return mode === 'login' ? 'Sign In' :
           mode === 'register' ? 'Create Account' :
           'Send Reset Email'
  }

  const getTitle = () => {
    return mode === 'login' ? 'Sign In to Your Account' :
           mode === 'register' ? 'Create Your Account' :
           'Reset Your Password'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {getTitle()}
          </h2>
          {mode === 'login' && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <a href="/register" className="font-medium text-olive-600 hover:text-olive-500">
                create a new account
              </a>
            </p>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Registration fields */}
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required={mode === 'register'}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-olive-500 focus:z-10 sm:text-sm"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required={mode === 'register'}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-olive-500 focus:z-10 sm:text-sm"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
                    Shop Name (Optional)
                  </label>
                  <input
                    id="shopName"
                    name="shopName"
                    type="text"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-olive-500 focus:z-10 sm:text-sm"
                    placeholder="Your Barbershop Name"
                    value={formData.shopName}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
            
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-olive-500 focus:z-10 sm:text-sm"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            {/* Password fields */}
            {mode !== 'reset' && (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-olive-500 focus:z-10 sm:text-sm"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>

                {mode === 'register' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-olive-500 focus:z-10 sm:text-sm"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Turnstile CAPTCHA - show when needed */}
          <WhenFeatureEnabled flag="captchaProtection" fallback={
            showTurnstile && (
              <TurnstileWidget
                onVerify={handleTurnstileVerify}
                onError={handleTurnstileError}
                resetTrigger={turnstileReset}
                className="my-4"
              />
            )
          }>
            {(showTurnstile || mode === 'register') && (
              <TurnstileWidget
                onVerify={handleTurnstileVerify}
                onError={handleTurnstileError}
                resetTrigger={turnstileReset}
                className="my-4"
              />
            )}
          </WhenFeatureEnabled>

          {/* Error and success messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-sm text-green-800">{success}</div>
            </div>
          )}

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={loading || authLoading || (showTurnstile && !turnstileToken)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getSubmitButtonText()}
            </button>
          </div>

          {/* Additional links */}
          <div className="flex items-center justify-between">
            {mode === 'login' && (
              <a
                href="/reset-password"
                className="text-sm text-olive-600 hover:text-olive-500"
              >
                Forgot your password?
              </a>
            )}
            
            {mode !== 'login' && (
              <a
                href="/login"
                className="text-sm text-olive-600 hover:text-olive-500"
              >
                Back to Sign In
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
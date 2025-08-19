'use client'

import { createClient } from '@/lib/supabase/browser-client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogoHeader } from '@/components/ui/Logo'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  UserIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const { signInWithGoogle, signIn, signUp, resetPassword } = useAuth()
  
  // Check for OAuth callback on page load
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const code = urlParams.get('code')
      const error = urlParams.get('error')
      const accessToken = hashParams.get('access_token')
      
      if (error) {
        setError(`OAuth error: ${error}`)
        return
      }
      
      if (code || accessToken) {
        console.log('OAuth callback detected, processing...', { code: !!code, accessToken: !!accessToken })
        setIsLoading(true)
        
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.error('OAuth processing timeout')
          setError('Authentication timeout. Please try again.')
          setIsLoading(false)
        }, 10000) // 10 second timeout
        
        try {
          const supabase = createClient()
          
          if (code) {
            // PKCE flow - exchange code for session
            console.log('Exchanging code for session...')
            
            try {
              // Add timeout to the specific exchange call
              const exchangePromise = supabase.auth.exchangeCodeForSession(code)
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Code exchange timeout')), 5000)
              })
              
              const { data, error } = await Promise.race([exchangePromise, timeoutPromise])
              console.log('Code exchange result:', { data, error })
              
              if (error) {
                console.error('Code exchange error:', error)
                clearTimeout(timeoutId)
                setError(`Authentication failed: ${error.message}`)
                setIsLoading(false)
                return
              }
              
              if (data?.session) {
                console.log('Session created successfully:', data.session)
                console.log('User data:', data.user)
                
                clearTimeout(timeoutId) // Clear the timeout
                
                // Clear URL parameters and redirect
                window.history.replaceState({}, document.title, '/login')
                
                // Set success message briefly before redirect
                setSuccess('Authentication successful! Redirecting...')
                
                setTimeout(() => {
                  router.push('/dashboard')
                }, 500)
                return
              } else {
                console.warn('No session in exchange response:', data)
                clearTimeout(timeoutId)
                setError('Authentication failed: No session created')
                setIsLoading(false)
                return
              }
            } catch (exchangeError) {
              console.error('Code exchange failed with exception:', exchangeError)
              clearTimeout(timeoutId)
              
              // If exchange fails, try alternative approach - manual session retrieval
              console.log('Attempting alternative authentication...')
              try {
                const { data: { user }, error: userError } = await supabase.auth.getUser()
                if (user && !userError) {
                  console.log('Alternative auth successful:', user)
                  setSuccess('Authentication successful! Redirecting...')
                  window.history.replaceState({}, document.title, '/login')
                  setTimeout(() => router.push('/dashboard'), 500)
                  return
                }
              } catch (altError) {
                console.error('Alternative auth failed:', altError)
              }
              
              setError(`Authentication error: ${exchangeError.message}`)
              setIsLoading(false)
              return
            }
          }
          
          if (accessToken) {
            // Implicit flow - access token received directly
            console.log('Access token received, redirecting to dashboard...')
            clearTimeout(timeoutId)
            // Clear URL hash and redirect
            window.history.replaceState({}, document.title, '/login')
            router.push('/dashboard')
            return
          }
          
        } catch (err) {
          console.error('OAuth processing error:', err)
          clearTimeout(timeoutId)
          setError('Authentication failed. Please try again.')
        }
        
        clearTimeout(timeoutId)
        setIsLoading(false)
      }
    }
    
    handleOAuthCallback()
  }, [])
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // Use centralized auth provider - redirect to login for OAuth callback
      await signInWithGoogle(`${window.location.origin}/login`)
    } catch (err) {
      setError('Failed to connect with Google. Please try again.')
      setIsLoading(false)
    }
  }
  
  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    // Validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      setIsLoading(false)
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }
    
    if (isSignUp && !fullName.trim()) {
      setError('Please enter your full name')
      setIsLoading(false)
      return
    }
    
    try {
      if (isSignUp) {
        // Sign up new user with metadata using centralized auth
        const data = await signUp({
          email,
          password,
          metadata: {
            full_name: fullName.trim(),
            role: 'CLIENT'
          }
        })
        
        if (data?.user) {
          // Check if email confirmation is required
          if (data.user.identities?.length === 0) {
            setSuccess('Account created! Please check your email to confirm your account before signing in.')
          } else {
            // Auto sign-in if email confirmation not required - auth provider will handle redirect
            setSuccess('Account created successfully! Signing you in...')
          }
        }
      } else {
        // Sign in existing user using centralized auth
        const data = await signIn({ email, password })
        
        if (data?.user) {
          setSuccess('Sign in successful! Redirecting...')
          // Auth provider will handle the redirect to dashboard
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      // Use centralized auth provider for magic link
      await resetPassword(email)
      setSuccess('Check your email for the login link!')
    } catch (err) {
      setError('Failed to send magic link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-200 via-white to-sand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoHeader size="large" />
          </div>
          <p className="text-olive-600 font-medium">Professional Barbershop Management Platform</p>
        </div>
        
        {/* Main Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sand-300">
          
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-moss-50 border border-moss-300 rounded-lg flex items-start gap-3">
              <CheckCircleIcon className="h-5 w-5 text-moss-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-moss-800">{success}</div>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-softred-50 border border-softred-300 rounded-lg flex items-start gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-softred-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-softred-800">{error}</div>
            </div>
          )}
          
          {/* Page Title */}
          <h2 className="text-2xl font-bold text-olive-700 text-center mb-8">
            {isSignUp ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          
          {/* Google Sign In - Primary CTA */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 mb-6 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? 'Connecting...' : 'Continue with Google'}
          </button>
          
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sand-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-olive-500">or continue with email</span>
            </div>
          </div>
          
          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-olive-400" />
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-sand-50 border border-sand-300 text-olive-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder-olive-400"
                />
              </div>
            )}
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-olive-400" />
              </div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-sand-50 border border-sand-300 text-olive-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder-olive-400"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-olive-400" />
              </div>
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isSignUp}
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-sand-50 border border-sand-300 text-olive-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder-olive-400"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-olive-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-olive-700 transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>
          
          {/* Magic Link Option */}
          <button
            onClick={handleMagicLink}
            disabled={isLoading || !email}
            className="w-full mt-3 text-olive-500 hover:text-olive-700 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Send magic link instead
          </button>
          
          {/* Toggle Sign Up/In */}
          <div className="mt-6 pt-6 border-t border-sand-200 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setSuccess('')
              }}
              className="text-olive-600 hover:text-olive-700 text-sm font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-olive-500 text-xs">
          <p>© 2025 BookedBarber. All rights reserved.</p>
          <p className="mt-2">
            <a href="/terms" className="hover:text-olive-700 transition-colors">Terms</a>
            {' • '}
            <a href="/privacy" className="hover:text-olive-700 transition-colors">Privacy</a>
            {' • '}
            <a href="/contact" className="hover:text-olive-700 transition-colors">Support</a>
          </p>
        </div>
      </div>
    </div>
  )
}
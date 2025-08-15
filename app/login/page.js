'use client'

import { 
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import ConversionTracker, { useLoginTracking } from '@/components/analytics/ConversionTracker'
import { useAuth } from '../../components/SupabaseAuthProvider'
import Logo from '../../components/ui/Logo'


export default function LoginPage() {
  const router = useRouter()
  const { user, signIn, signInWithGoogle } = useAuth()
  const loginTracking = useLoginTracking()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard')
    }
  }, [user, router, isLoading])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    loginTracking.trackLoginAttempt('email')

    try {
      const result = await signIn({ 
        email: formData.email, 
        password: formData.password 
      })
      
      loginTracking.trackLoginSuccess('email', result?.user?.id)
      
      // Redirect to dashboard after successful login
      router.push('/dashboard')
      
    } catch (err) {
      loginTracking.trackLoginFailure('email', err.message || 'Unknown error')
      
      setError(err.message || 'Login failed. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    console.log('🔍 Standard Google sign-in from login page')
    
    try {
      setIsLoading(true)
      setError('')
      
      loginTracking.trackOAuthAttempt('google')
      
      if (!signInWithGoogle) {
        throw new Error('Google sign-in not available. Please refresh the page.')
      }
      
      console.log('🚀 Starting Google OAuth with client-side callback...')
      
      // Ensure we're using the client-side callback URL
      const callbackUrl = `${window.location.origin}/auth/callback`
      console.log('📍 OAuth callback URL:', callbackUrl)
      
      const result = await signInWithGoogle(callbackUrl)
      console.log('✅ OAuth initiated successfully, redirecting to Google...')
      
      if (result) {
        loginTracking.trackOAuthAttempt('google')
      }
      
      // Note: The page will redirect to Google, then back to /auth/callback
      // The loading state will persist until the redirect happens
      
      
    } catch (err) {
      console.error('❌ Google sign-in error:', err)
      
      loginTracking.trackLoginFailure('google', err.message || 'Unknown error')
      
      setError(err.message || 'Google sign-in failed.')
      setIsLoading(false)
    }
  }

  return (
    <ConversionTracker 
      page="login"
      customProperties={{
        has_error: !!error,
        loading_state: isLoading,
        form_filled: !!(formData.email && formData.password)
      }}
    >
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Logo size="medium" priority />
        </div>
        <h2 className="text-center text-3xl font-bold text-foreground gradient-text">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to your BookedBarber account or{' '}
          <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors duration-200">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-elevated backdrop-blur-sm">
          <form className="space-y-6" onSubmit={handleSubmit} data-track-form="login-form" data-track-view="login-form">
            {error && (
              <div className="status-error px-4 py-3 rounded-xl text-sm font-medium border border-destructive/20">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="input-field pl-10 pr-3 focus:ring-primary focus:border-primary disabled:opacity-50"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="input-field pl-10 pr-10 focus:ring-primary focus:border-primary disabled:opacity-50"
                  placeholder="Enter your password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="text-muted-foreground hover:text-foreground focus:outline-none disabled:opacity-50 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link 
                  href="/forgot-password" 
                  className="font-medium text-primary hover:text-primary/80 transition-colors duration-200"
                  onClick={() => loginTracking.trackPasswordReset()}
                  data-track-click="password-reset-link"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`btn-primary w-full transition-all duration-200 ${
                  isLoading
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                disabled={isLoading}
                className={`btn-outline w-full flex items-center justify-center transition-all duration-200 ${
                  isLoading
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-lg hover:-translate-y-0.5'
                }`}
                onClick={(e) => {
                  console.log('🖱️ Google OAuth button clicked!')
                  e.preventDefault()
                  handleGoogleSignIn()
                }}
                data-track-click="oauth-google-signin"
                data-track-view="oauth-signin-button"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                    Connecting...
                  </span>
                ) : (
                  <span>Sign in with Google</span>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home page
          </Link>
        </div>
      </div>
    </ConversionTracker>
  )
}
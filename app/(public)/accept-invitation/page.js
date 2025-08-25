'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState(null)
  const [acceptanceStatus, setAcceptanceStatus] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  // Form states for new user signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkInvitation()
    checkCurrentUser()
  }, [token])

  const checkCurrentUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const checkInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/staff/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, action: 'verify' })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid or expired invitation')
      } else {
        setInvitation(data.invitation)
        setEmail(data.invitation.invited_email || '')
        setFullName(data.invitation.invited_name || '')
      }
    } catch (err) {
      setError('Failed to verify invitation')
      console.error('Error checking invitation:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignupAndAccept = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Create new account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invitation_token: token
          }
        }
      })

      if (signUpError) {
        throw signUpError
      }

      // Accept the invitation
      await acceptInvitation()

    } catch (err) {
      setError(err.message || 'Failed to create account')
      setSubmitting(false)
    }
  }

  const acceptInvitation = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/staff/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, action: 'accept' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      setAcceptanceStatus('success')
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

    } catch (err) {
      setError(err.message || 'Failed to accept invitation')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => router.push('/')}
              variant="primary"
              className="w-full"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (acceptanceStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Team!</h2>
            <p className="text-gray-600 mb-6">
              You've successfully joined {invitation?.barbershop_name} as a {invitation?.role?.toLowerCase()}.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              You're Invited!
            </h2>
            <p className="mt-2 text-gray-600">
              Join <span className="font-semibold">{invitation?.barbershop_name}</span> as a {invitation?.role?.toLowerCase()}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {currentUser ? (
            // Existing user - just need to accept
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  You're already signed in as <span className="font-semibold">{currentUser.email}</span>
                </p>
              </div>
              
              <Button
                onClick={acceptInvitation}
                disabled={submitting}
                variant="primary"
                className="w-full"
              >
                {submitting ? 'Accepting...' : 'Accept Invitation'}
              </Button>

              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  setCurrentUser(null)
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Use a different account
              </button>
            </div>
          ) : (
            // New user - need to create account
            <form onSubmit={handleSignupAndAccept} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                variant="primary"
                className="w-full"
              >
                {submitting ? 'Creating Account...' : 'Create Account & Join'}
              </Button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push(`/login?redirect=/accept-invitation?token=${token}`)}
                  className="font-medium text-purple-600 hover:text-purple-500"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          This invitation will expire in 7 days from when it was sent.
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  )
}
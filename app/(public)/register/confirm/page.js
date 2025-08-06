'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function RegisterConfirmPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'your email'
  const { resendEmailConfirmation } = useAuth()
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState(null)

  const handleResendEmail = async () => {
    if (email === 'your email') {
      setResendStatus({ type: 'error', message: 'Email address not found. Please try registering again.' })
      return
    }

    setIsResending(true)
    setResendStatus(null)

    try {
      await resendEmailConfirmation(email)
      setResendStatus({ 
        type: 'success', 
        message: 'Verification email sent successfully! Check your inbox.' 
      })
    } catch (error) {
      setResendStatus({ 
        type: 'error', 
        message: error.message || 'Failed to send verification email. Please try again.' 
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">6FB</span>
          </div>
        </div>

        {/* Success Icon */}
        <div className="flex justify-center mt-6">
          <CheckCircleIcon className="h-16 w-16 text-green-500" />
        </div>

        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Account Created Successfully!
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We've sent a verification email to confirm your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Email Icon and Info */}
          <div className="text-center">
            <div className="flex justify-center">
              <div className="bg-blue-100 rounded-full p-3">
                <EnvelopeIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Check Your Email
            </h3>
            
            <p className="mt-2 text-sm text-gray-600">
              We've sent a verification link to:
            </p>
            
            <p className="mt-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md px-3 py-2">
              {email}
            </p>
          </div>

          {/* Instructions */}
          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Next Steps:</h4>
              <ol className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-3 mt-0.5 flex-shrink-0">1</span>
                  <span>Check your email inbox (and spam folder)</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-3 mt-0.5 flex-shrink-0">2</span>
                  <span>Click the verification link in the email</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-3 mt-0.5 flex-shrink-0">3</span>
                  <span>Log in to access your barbershop dashboard</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Status Message */}
          {resendStatus && (
            <div className={`mt-4 px-4 py-3 rounded-md text-sm ${
              resendStatus.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-600' 
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {resendStatus.message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <Link
              href="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
            >
              Go to Login Page
            </Link>
            
            <button
              onClick={handleResendEmail}
              disabled={isResending}
              className={`w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium transition duration-150 ease-in-out ${
                isResending 
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                  : 'text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isResending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                  Sending...
                </div>
              ) : (
                'Resend Verification Email'
              )}
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or{' '}
              <Link href="/support" className="text-blue-600 hover:text-blue-500">
                contact support
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Your 14-day free trial has started!
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Once verified, you'll have full access to all professional features with no credit card required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
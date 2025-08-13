'use client'

import { useState, useEffect, useRef } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function MFAVerification({ onVerified, onCancel, userEmail }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [useBackupCode])

  const handleVerify = async (e) => {
    e.preventDefault()
    
    if (!code || (useBackupCode ? code.length !== 8 : code.length !== 6)) {
      setError(useBackupCode ? 'Please enter an 8-character backup code' : 'Please enter a 6-digit code')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: code,
          isSetup: false
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError('Too many attempts. Please wait before trying again.')
        } else {
          setError(data.error || 'Invalid verification code')
          setAttempts(prev => prev + 1)
        }
        setCode('')
        return
      }

      if (data.usedBackupCode) {
        // Show warning if backup code was used
        if (onVerified) {
          onVerified({ 
            success: true, 
            warning: 'You used a backup code. Consider regenerating backup codes for security.' 
          })
        }
      } else {
        if (onVerified) {
          onVerified({ success: true })
        }
      }

    } catch (err) {
      setError('Network error. Please try again.')
      setAttempts(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  const handleCodeInput = (value) => {
    if (useBackupCode) {
      // Backup codes are 8 characters, alphanumeric
      setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
    } else {
      // TOTP codes are 6 digits
      setCode(value.replace(/\\D/g, '').slice(0, 6))
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 border">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-sm text-gray-600">
            {userEmail && `Signing in as ${userEmail}`}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {useBackupCode 
              ? 'Enter one of your 8-character backup codes'
              : 'Enter the 6-digit code from your authenticator app'
            }
          </p>
        </div>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="mfa-code" className="sr-only">
              {useBackupCode ? 'Backup code' : 'Verification code'}
            </label>
            <input
              ref={inputRef}
              id="mfa-code"
              type="text"
              value={code}
              onChange={(e) => handleCodeInput(e.target.value)}
              placeholder={useBackupCode ? 'ABCD1234' : '123456'}
              className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-wider"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!useBackupCode && code.length !== 6) || (useBackupCode && code.length !== 8)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode)
              setCode('')
              setError('')
            }}
            className="w-full text-sm text-blue-600 hover:text-blue-500 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            {useBackupCode 
              ? 'Use authenticator app instead' 
              : 'Use backup code instead'
            }
          </button>

          {attempts >= 3 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Having trouble?</p>
                  <p>Make sure your device's time is correct and try using a backup code if available.</p>
                </div>
              </div>
            </div>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full text-sm text-gray-600 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded py-2"
            >
              Cancel and sign out
            </button>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
            <span>Your account is protected with two-factor authentication</span>
          </div>
        </div>
      </div>
    </div>
  )
}
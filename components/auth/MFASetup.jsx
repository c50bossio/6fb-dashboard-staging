'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function MFASetup({ onComplete, onCancel }) {
  const [step, setStep] = useState(1) // 1: setup, 2: verify, 3: backup codes
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const { user } = useAuth()

  const handleSetupMFA = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup MFA')
      }

      setQrCode(data.qrCodeUrl)
      setSecret(data.manualEntryKey)
      setStep(2)
      setSuccess('QR code generated successfully. Scan it with your authenticator app.')

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code')
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
          token: verificationCode,
          isSetup: true
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }

      setBackupCodes(data.backupCodes || [])
      setStep(3)
      setSuccess('MFA has been successfully enabled!')

    } catch (err) {
      setError(err.message)
      setVerificationCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete()
    }
  }

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\\n')
    navigator.clipboard.writeText(codesText)
    setSuccess('Backup codes copied to clipboard')
  }

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\\n')
    const blob = new Blob([codesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '6fb-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSuccess('Backup codes downloaded')
  }

  useEffect(() => {
    if (step === 1) {
      handleSetupMFA()
    }
  }, [step])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="text-sm font-medium">Setup</span>
        </div>
        <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="text-sm font-medium">Verify</span>
        </div>
        <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="text-sm font-medium">Backup</span>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: QR Code Display */}
      {step === 2 && (
        <Card className="p-6">
          <div className="text-center space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Scan QR Code
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
              </p>
            </div>

            {qrCode && (
              <div className="flex justify-center">
                <Image 
                  src={qrCode} 
                  alt="MFA QR Code" 
                  width={256}
                  height={256}
                  className="border border-gray-200 rounded-lg"
                />
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-2">Manual entry key:</p>
              <code className="text-sm font-mono bg-white px-2 py-1 rounded border break-all">
                {secret}
              </code>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit code from your app:
                </label>
                <input
                  id="verification-code"
                  type="text"
                  maxLength="6"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\\D/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable MFA'}
                </button>
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Backup Codes */}
      {step === 3 && (
        <Card className="p-6">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">MFA Enabled Successfully!</h3>
                <Badge className="mt-1 bg-green-100 text-green-800">Secure</Badge>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <div className="text-left">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Important: Save Your Backup Codes</p>
                  <p className="text-sm text-yellow-700">
                    These backup codes can be used to access your account if you lose your authenticator device. 
                    Each code can only be used once.
                  </p>
                </div>
              </div>
            </div>

            {backupCodes.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Your Backup Codes:</h4>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="text-sm font-mono bg-white px-2 py-1 rounded border text-center">
                      {code}
                    </code>
                  ))}
                </div>
                
                <div className="flex space-x-2 justify-center">
                  <button
                    onClick={copyBackupCodes}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Copy Codes
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Download Codes
                  </button>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Next Steps:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 text-left">
                <li>• Store your backup codes in a secure location</li>
                <li>• Test your authenticator app before closing this setup</li>
                <li>• Consider adding your backup codes to a password manager</li>
              </ul>
            </div>

            <button
              onClick={handleComplete}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
            >
              Complete Setup
            </button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && step === 1 && (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Setting up Multi-Factor Authentication...</p>
          </div>
        </Card>
      )}
    </div>
  )
}
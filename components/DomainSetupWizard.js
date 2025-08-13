'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon, ClipboardDocumentIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function DomainSetupWizard({ domain, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [verificationStatus, setVerificationStatus] = useState('pending')
  const [dnsProvider, setDnsProvider] = useState('')
  const [copied, setCopied] = useState({ a: false, cname: false })
  
  // DNS records the user needs to add
  const dnsRecords = {
    a: {
      type: 'A',
      name: '@',
      value: '76.76.21.21', // Vercel's IP
      ttl: '3600'
    },
    cname: {
      type: 'CNAME',
      name: 'www',
      value: 'cname.vercel-dns.com',
      ttl: '3600'
    }
  }
  
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopied({ ...copied, [type]: true })
    setTimeout(() => {
      setCopied({ ...copied, [type]: false })
    }, 2000)
  }
  
  const verifyDomain = async () => {
    setVerificationStatus('checking')
    
    // Simulate DNS verification
    setTimeout(() => {
      const random = Math.random()
      if (random > 0.3) {
        setVerificationStatus('verified')
        onComplete()
      } else {
        setVerificationStatus('failed')
      }
    }, 3000)
  }
  
  const providerInstructions = {
    godaddy: {
      name: 'GoDaddy',
      steps: [
        'Log in to your GoDaddy account',
        'Go to "My Products" → "Domains"',
        'Click "Manage" next to your domain',
        'Select "DNS" from the menu',
        'Add the records shown below'
      ],
      videoUrl: 'https://www.youtube.com/watch?v=example'
    },
    namecheap: {
      name: 'Namecheap',
      steps: [
        'Log in to your Namecheap account',
        'Go to "Domain List"',
        'Click "Manage" next to your domain',
        'Select "Advanced DNS" tab',
        'Add the records shown below'
      ],
      videoUrl: 'https://www.youtube.com/watch?v=example'
    },
    google: {
      name: 'Google Domains',
      steps: [
        'Log in to Google Domains',
        'Click on your domain',
        'Go to "DNS" on the left menu',
        'Scroll to "Custom resource records"',
        'Add the records shown below'
      ],
      videoUrl: 'https://www.youtube.com/watch?v=example'
    },
    cloudflare: {
      name: 'Cloudflare',
      steps: [
        'Log in to Cloudflare Dashboard',
        'Select your domain',
        'Go to "DNS" tab',
        'Click "Add record"',
        'Add the records shown below'
      ],
      videoUrl: 'https://www.youtube.com/watch?v=example'
    },
    other: {
      name: 'Other Provider',
      steps: [
        'Log in to your domain provider',
        'Find DNS or Domain Settings',
        'Look for "DNS Records" or "Zone File"',
        'Add the records shown below',
        'Save your changes'
      ]
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Connect Your Domain: {domain}
        </h2>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? 'bg-olive-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className="ml-3 font-medium">Choose Provider</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-4" />
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              currentStep >= 2 ? 'bg-olive-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className="ml-3 font-medium">Add DNS Records</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-4" />
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              currentStep >= 3 ? 'bg-olive-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
            <span className="ml-3 font-medium">Verify</span>
          </div>
        </div>
        
        {/* Step 1: Choose Provider */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Where did you buy your domain?
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(providerInstructions).map(([key, provider]) => (
                <button
                  key={key}
                  onClick={() => {
                    setDnsProvider(key)
                    setCurrentStep(2)
                  }}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-olive-500 hover:bg-olive-50 transition-all"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">
                      {key === 'godaddy' && '🟠'}
                      {key === 'namecheap' && '🔵'}
                      {key === 'google' && '🟢'}
                      {key === 'cloudflare' && '🟡'}
                      {key === 'other' && '🌐'}
                    </div>
                    <div className="font-medium">{provider.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Step 2: Add DNS Records */}
        {currentStep === 2 && dnsProvider && (
          <div className="space-y-6">
            <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
              <h3 className="font-semibold text-olive-900 mb-3">
                Follow these steps for {providerInstructions[dnsProvider].name}:
              </h3>
              <ol className="space-y-2">
                {providerInstructions[dnsProvider].steps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-olive-100 text-olive-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      {index + 1}
                    </span>
                    <span className="text-sm text-olive-800">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Add these DNS records:</h4>
              
              {/* A Record */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-medium text-gray-900">Record 1: A Record</h5>
                  <button
                    onClick={() => copyToClipboard(dnsRecords.a.value, 'a')}
                    className="flex items-center text-sm text-olive-600 hover:text-olive-700"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                    {copied.a ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <div className="font-mono font-bold">{dnsRecords.a.type}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Name/Host:</span>
                    <div className="font-mono font-bold">{dnsRecords.a.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Value/Points to:</span>
                    <div className="font-mono font-bold">{dnsRecords.a.value}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">TTL:</span>
                    <div className="font-mono font-bold">{dnsRecords.a.ttl}</div>
                  </div>
                </div>
              </div>
              
              {/* CNAME Record */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-medium text-gray-900">Record 2: CNAME Record</h5>
                  <button
                    onClick={() => copyToClipboard(dnsRecords.cname.value, 'cname')}
                    className="flex items-center text-sm text-olive-600 hover:text-olive-700"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                    {copied.cname ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <div className="font-mono font-bold">{dnsRecords.cname.type}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Name/Host:</span>
                    <div className="font-mono font-bold">{dnsRecords.cname.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Value/Points to:</span>
                    <div className="font-mono font-bold">{dnsRecords.cname.value}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">TTL:</span>
                    <div className="font-mono font-bold">{dnsRecords.cname.ttl}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> DNS changes can take 1-48 hours to propagate. 
                Most changes work within 1-2 hours.
              </p>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
              >
                I've Added the Records →
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Verify */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center py-8">
              {verificationStatus === 'pending' && (
                <>
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ArrowPathIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Ready to Verify Your Domain
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Click below to check if your DNS records are set up correctly
                  </p>
                  <button
                    onClick={verifyDomain}
                    className="px-8 py-3 bg-olive-600 text-white rounded-lg font-medium hover:bg-olive-700"
                  >
                    Verify Domain Setup
                  </button>
                </>
              )}
              
              {verificationStatus === 'checking' && (
                <>
                  <div className="w-20 h-20 bg-olive-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-olive-600"></div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Checking Your Domain...
                  </h3>
                  <p className="text-gray-600">
                    This may take a few moments. We're verifying your DNS records.
                  </p>
                </>
              )}
              
              {verificationStatus === 'verified' && (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-900 mb-2">
                    Domain Verified Successfully! 🎉
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your domain {domain} is now connected and will be live within 24 hours.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-green-800">
                      <strong>What happens next:</strong><br />
                      • SSL certificate will be automatically provisioned<br />
                      • Your booking page will be accessible at {domain}<br />
                      • You'll receive an email when everything is ready
                    </p>
                  </div>
                </>
              )}
              
              {verificationStatus === 'failed' && (
                <>
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-red-900 mb-2">
                    Verification Failed
                  </h3>
                  <p className="text-gray-600 mb-6">
                    We couldn't verify your DNS records yet. This is normal if you just added them.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto mb-6">
                    <p className="text-sm text-yellow-800">
                      <strong>Common issues:</strong><br />
                      • DNS changes can take 1-48 hours to propagate<br />
                      • Double-check the records match exactly<br />
                      • Make sure you saved the changes in your DNS provider
                    </p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      ← Check Records Again
                    </button>
                    <button
                      onClick={verifyDomain}
                      className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
                    >
                      Try Again
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Need help? <a href="#" className="text-olive-600 hover:underline">Contact support</a>
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
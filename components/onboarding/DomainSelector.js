'use client'

import { CheckCircleIcon, GlobeAltIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function DomainSelector({ onDomainSelect, businessName }) {
  const [domainOption, setDomainOption] = useState('free') // free, buy, existing
  const [customDomain, setCustomDomain] = useState('')
  const [selectedNewDomain, setSelectedNewDomain] = useState('')
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availableDomains, setAvailableDomains] = useState([])
  
  const generateDomainSuggestions = () => {
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '')
    return [
      { domain: `${slug}.com`, price: '$12/year', available: true, recommended: true },
      { domain: `${slug}barbershop.com`, price: '$12/year', available: true },
      { domain: `${slug}cuts.com`, price: '$15/year', available: false },
      { domain: `get${slug}.com`, price: '$12/year', available: true },
      { domain: `${slug}.shop`, price: '$35/year', available: true },
      { domain: `${slug}.hair`, price: '$45/year', available: true }
    ]
  }

  const checkDomainAvailability = async () => {
    setIsCheckingAvailability(true)
    setTimeout(() => {
      setAvailableDomains(generateDomainSuggestions())
      setIsCheckingAvailability(false)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Choose Your Web Address
        </h3>
        
        {/* Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free Subdomain */}
          <div 
            onClick={() => setDomainOption('free')}
            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
              domainOption === 'free' 
                ? 'border-olive-500 bg-olive-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {domainOption === 'free' && (
              <CheckCircleIcon className="absolute top-2 right-2 w-5 h-5 text-olive-600" />
            )}
            <div className="text-center">
              <div className="text-2xl mb-2">🆓</div>
              <h4 className="font-semibold text-gray-900">Free Address</h4>
              <p className="text-sm text-gray-600 mt-1">
                Get started instantly
              </p>
              <div className="mt-3 p-2 bg-gray-100 rounded text-xs font-mono">
                {businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.bookedbarber.com
              </div>
              <p className="text-xs text-green-600 mt-2 font-semibold">
                No cost • Instant setup
              </p>
            </div>
          </div>

          {/* Buy New Domain */}
          <div 
            onClick={() => {
              setDomainOption('buy')
              checkDomainAvailability()
            }}
            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
              domainOption === 'buy' 
                ? 'border-olive-500 bg-olive-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {domainOption === 'buy' && (
              <CheckCircleIcon className="absolute top-2 right-2 w-5 h-5 text-olive-600" />
            )}
            <div className="text-center">
              <div className="text-2xl mb-2">🌐</div>
              <h4 className="font-semibold text-gray-900">Buy New Domain</h4>
              <p className="text-sm text-gray-600 mt-1">
                Professional look
              </p>
              <div className="mt-3 p-2 bg-gray-100 rounded text-xs font-mono">
                yourbusiness.com
              </div>
              <p className="text-xs text-olive-600 mt-2 font-semibold">
                From $12/year • We set it up
              </p>
            </div>
          </div>

          {/* Use Existing Domain */}
          <div 
            onClick={() => setDomainOption('existing')}
            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
              domainOption === 'existing' 
                ? 'border-olive-500 bg-olive-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {domainOption === 'existing' && (
              <CheckCircleIcon className="absolute top-2 right-2 w-5 h-5 text-olive-600" />
            )}
            <div className="text-center">
              <div className="text-2xl mb-2">🔗</div>
              <h4 className="font-semibold text-gray-900">I Have a Domain</h4>
              <p className="text-sm text-gray-600 mt-1">
                Connect your own
              </p>
              <div className="mt-3 p-2 bg-gray-100 rounded text-xs font-mono">
                yourdomain.com
              </div>
              <p className="text-xs text-gold-600 mt-2 font-semibold">
                Free • Guided setup
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content Based on Selection */}
      {domainOption === 'free' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="ml-3">
              <h4 className="font-semibold text-green-900">Perfect for Getting Started!</h4>
              <p className="text-sm text-green-700 mt-1">
                Your free web address will be: <span className="font-mono font-bold">
                  {businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.bookedbarber.com
                </span>
              </p>
              <p className="text-xs text-green-600 mt-2">
                ✓ Instant activation • ✓ SSL included • ✓ Always free • ✓ Upgrade anytime
              </p>
            </div>
          </div>
        </div>
      )}

      {domainOption === 'buy' && (
        <div className="space-y-4">
          <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
            <h4 className="font-semibold text-olive-900 mb-3">
              🎯 Available Domains for "{businessName}"
            </h4>
            
            {isCheckingAvailability ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Checking availability...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableDomains.map((item, index) => (
                  <div 
                    key={index}
                    onClick={() => item.available && setSelectedNewDomain(item.domain)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      item.available 
                        ? selectedNewDomain === item.domain 
                          ? 'border-olive-500 bg-white shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        checked={selectedNewDomain === item.domain}
                        disabled={!item.available}
                        onChange={() => {}}
                        className="mr-3"
                      />
                      <div>
                        <span className={`font-mono text-sm ${!item.available && 'line-through'}`}>
                          {item.domain}
                        </span>
                        {item.recommended && (
                          <span className="ml-2 px-2 py-0.5 bg-moss-100 text-moss-800 text-xs rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        {item.available ? item.price : 'Taken'}
                      </div>
                      {item.available && (
                        <div className="text-xs text-gray-500">First year</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>💡 What's Included:</strong> Domain registration • Automatic renewal • 
                DNS setup • SSL certificate • Email forwarding • 24/7 support
              </p>
            </div>
          </div>

          <button 
            onClick={() => onDomainSelect({ type: 'buy', domain: selectedNewDomain })}
            disabled={!selectedNewDomain}
            className="w-full py-3 bg-olive-600 text-white rounded-lg font-medium hover:bg-olive-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Continue with {selectedNewDomain || 'Selected Domain'} →
          </button>
        </div>
      )}

      {domainOption === 'existing' && (
        <div className="space-y-4">
          <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
            <h4 className="font-semibold text-gold-900 mb-3">
              Connect Your Existing Domain
            </h4>
            
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="www.yourdomain.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
            
            <div className="mt-4 space-y-3">
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-gold-100 text-gold-600 rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Enter your domain above</p>
                  <p className="text-xs text-gray-600">The domain you already own</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-gold-100 text-gold-600 rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">We'll email you simple instructions</p>
                  <p className="text-xs text-gray-600">Just 2 clicks in your domain settings</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-gold-100 text-gold-600 rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Your domain goes live in 24 hours</p>
                  <p className="text-xs text-gray-600">We handle all the technical stuff</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-olive-50 rounded-lg">
              <p className="text-xs text-olive-800">
                <strong>🛡️ Don't worry!</strong> Our support team will help you every step of the way. 
                Works with GoDaddy, Namecheap, Google Domains, and all major providers.
              </p>
            </div>
          </div>

          <button 
            onClick={() => onDomainSelect({ type: 'existing', domain: customDomain })}
            disabled={!customDomain}
            className="w-full py-3 bg-gold-700 text-white rounded-lg font-medium hover:bg-gold-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Continue with My Domain →
          </button>
        </div>
      )}
    </div>
  )
}
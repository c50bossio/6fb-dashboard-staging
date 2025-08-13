'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/SupabaseAuthProvider'
import Link from 'next/link'
import {
  CheckCircleIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function WelcomePage() {
  const router = useRouter()
  const { user, profile, updateProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessType: 'barbershop'
  })

  useEffect(() => {
    // If no user, redirect to login
    if (!user && !profile) {
      router.push('/login')
    }
  }, [user, profile, router])

  const handleBusinessUpdate = (e) => {
    const { name, value } = e.target
    setBusinessData(prev => ({ ...prev, [name]: value }))
  }

  const handleCompleteSetup = async () => {
    setIsLoading(true)
    try {
      // Update profile with business information
      await updateProfile({
        shop_name: businessData.businessName,
        shop_address: businessData.businessAddress,
        shop_phone: businessData.businessPhone,
        business_type: businessData.businessType
      })
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipSetup = () => {
    // Allow users to skip and complete later
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Success Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <CheckCircleIcon className="h-20 w-20 text-green-500 animate-bounce" />
            <div className="absolute inset-0 h-20 w-20 bg-green-500 opacity-20 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to BookedBarber! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Hi {profile?.full_name || user?.email?.split('@')[0] || 'there'}! Your account has been created successfully.
          </p>
          <div className="mt-4 p-4 bg-green-50 rounded-lg inline-block">
            <p className="text-green-800">
              ✅ Account created with: <strong>{user?.email}</strong>
            </p>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {step === 1 ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Let's set up your barbershop
                </h2>
                <p className="text-gray-600">
                  Take a moment to add your business details. You can always update these later.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                    Business Name
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="businessName"
                      name="businessName"
                      type="text"
                      value={businessData.businessName}
                      onChange={handleBusinessUpdate}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Premium Cuts Barbershop"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700">
                    Business Address
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="businessAddress"
                      name="businessAddress"
                      type="text"
                      value={businessData.businessAddress}
                      onChange={handleBusinessUpdate}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700">
                    Business Phone
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="businessPhone"
                      name="businessPhone"
                      type="tel"
                      value={businessData.businessPhone}
                      onChange={handleBusinessUpdate}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
                    Business Type
                  </label>
                  <select
                    id="businessType"
                    name="businessType"
                    value={businessData.businessType}
                    onChange={handleBusinessUpdate}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="barbershop">Barbershop</option>
                    <option value="salon">Hair Salon</option>
                    <option value="spa">Beauty Spa</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex space-x-4">
                <button
                  onClick={handleCompleteSetup}
                  disabled={isLoading || !businessData.businessName}
                  className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleSkipSetup}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Skip for now
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* What's Next Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            What you can do with BookedBarber:
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>Manage appointments and bookings online</span>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>Send automated reminders to customers</span>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>Track business analytics and revenue</span>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>Manage staff and services</span>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>Accept online payments</span>
            </li>
          </ul>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need help getting started?{' '}
            <Link href="/help" className="text-blue-600 hover:text-blue-500 font-medium">
              Visit our Help Center
            </Link>
            {' '}or{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-500 font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
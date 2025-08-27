'use client'

import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, BuildingStorefrontIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { Fragment, useState } from 'react'

export default function AddLocationModal({ isOpen, onClose, onLocationCreated }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeInfo, setUpgradeInfo] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Location name is required')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/locations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Show success message
        setSuccess(`${formData.name} has been created successfully!`)
        
        // Call parent callback
        if (result.location) {
          onLocationCreated(result.location)
        }
        
        // Reset form after short delay to show success
        setTimeout(() => {
          setFormData({
            name: '',
            address: '',
            city: '',
            state: '',
            phone: '',
            email: ''
          })
          setSuccess('')
          onClose()
        }, 2000)
        
      } else {
        const errorData = await response.json()
        
        // Check if this is an upgrade prompt
        if (errorData.requiresUpgrade && errorData.upgradeInfo) {
          // Show upgrade modal instead of error
          setError('') // Clear any previous error
          setUpgradeInfo(errorData.upgradeInfo)
          setShowUpgrade(true)
          return
        }
        
        setError(errorData.error || 'Failed to create location')
      }
    } catch (error) {
      console.error('Error creating location:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleUpgrade = () => {
    router.push(upgradeInfo?.ctaLink || '/dashboard/settings/billing?plan=enterprise')
    setShowUpgrade(false)
    onClose()
  }

  const handleLearnMore = () => {
    router.push(upgradeInfo?.alternativeLink || '/pricing#enterprise')
    setShowUpgrade(false)
    onClose()
  }

  // Show upgrade prompt if needed
  if (showUpgrade && upgradeInfo) {
    return (
      <Transition appear show={true} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowUpgrade(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-left align-middle shadow-xl transition-all border border-amber-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <SparklesIcon className="h-6 w-6 text-amber-600" />
                      <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">
                        {upgradeInfo.title}
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={() => setShowUpgrade(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    {upgradeInfo.message}
                  </p>

                  <div className="bg-white rounded-lg p-4 mb-4 border border-amber-100">
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">What's included:</h4>
                    <ul className="space-y-2">
                      {upgradeInfo.benefits.map((benefit, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <span className="mr-2">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleLearnMore}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {upgradeInfo.alternativeText}
                    </button>
                    <button
                      type="button"
                      onClick={handleUpgrade}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 border border-transparent rounded-md hover:from-amber-600 hover:to-orange-600 shadow-sm"
                    >
                      {upgradeInfo.ctaText}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    )
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <BuildingStorefrontIcon className="h-5 w-5 text-amber-500" />
                    <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                      Add New Location
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  
                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-600">{success}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Downtown Barbershop"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="123 Main St"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="City"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="State"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contact@barbershop.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !formData.name.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-amber-500 border border-transparent rounded-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Location'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
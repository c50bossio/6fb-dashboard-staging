'use client'

import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { Fragment, useState } from 'react'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'
import { useAuth } from '../SupabaseAuthProvider'
import { toast } from '@/hooks/use-toast'

export default function AddLocationModal({ isOpen, onClose, onLocationCreated }) {
  const { user } = useAuth()
  const { refreshLocations } = useGlobalDashboard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    description: ''
  })
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // Validate required fields
      if (!formData.name || !formData.city || !formData.state) {
        throw new Error('Name, city, and state are required')
      }
      
      // Call the enterprise locations API
      const response = await fetch('/api/enterprise/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createLocation',
          data: formData
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Location creation failed:', result)
        
        // Provide specific error messages based on the response
        let errorMessage = result.error || 'Failed to create location'
        
        if (result.details) {
          errorMessage += `: ${result.details}`
        }
        
        if (response.status === 403) {
          errorMessage = 'You do not have permission to create locations. Please contact your administrator.'
        } else if (response.status === 400) {
          errorMessage = result.error || 'Please check that all required fields are filled correctly.'
        } else if (response.status === 500) {
          errorMessage = 'There was a server error while creating the location. Please try again or contact support.'
        }
        
        throw new Error(errorMessage)
      }

      console.log(`[Location Create] ✅ Successfully created: ${formData.name}`)
      
      // Show success toast
      toast({
        title: 'Location Created Successfully!',
        description: `"${formData.name}" has been added to your locations.`,
        variant: 'success',
        duration: 4000
      })

      // Create default services for the new location
      if (result.location) {
        const defaultServices = [
          { name: 'Haircut', duration: 30, price: 35, description: 'Standard haircut' },
          { name: 'Beard Trim', duration: 15, price: 20, description: 'Beard trimming and shaping' },
          { name: 'Hair & Beard', duration: 45, price: 50, description: 'Haircut and beard trim combo' },
          { name: 'Kids Cut', duration: 20, price: 25, description: 'Children\'s haircut' }
        ]
        
        const supabase = createClient()
        const servicesData = defaultServices.map(service => ({
          barbershop_id: result.location.id,
          name: service.name,
          duration: service.duration,
          price: service.price,
          description: service.description,
          is_active: true
        }))
        
        await supabase.from('services').insert(servicesData)
      }
      
      // Refresh locations in global context
      if (refreshLocations) {
        await refreshLocations()
      }

      // Notify parent component
      if (onLocationCreated && result.location) {
        onLocationCreated(result.location)
      }
      
      // Reset form and close modal
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        description: ''
      })
      
      onClose()
    } catch (err) {
      console.error('Error creating location:', err)
      
      // Show error toast
      toast({
        title: 'Failed to Create Location',
        description: err.message || 'An unexpected error occurred while creating the location.',
        variant: 'destructive',
        duration: 6000
      })
      
      // Keep the error state for form display
      setError(err.message || 'Failed to create location')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Transition.Root show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-olive-100 sm:mx-0 sm:h-10 sm:w-10">
                    <BuildingOfficeIcon className="h-6 w-6 text-olive-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Add New Location
                    </Dialog.Title>
                    
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      {error && (
                        <div className="rounded-md bg-red-50 p-4">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      )}
                      
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Location Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                          Street Address
                        </label>
                        <input
                          type="text"
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                            City *
                          </label>
                          <input
                            type="text"
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                            State *
                          </label>
                          <input
                            type="text"
                            id="state"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                            maxLength="2"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                            ZIP Code
                          </label>
                          <input
                            type="text"
                            id="zipCode"
                            value={formData.zipCode}
                            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Phone
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="description"
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                        />
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex w-full justify-center items-center rounded-md bg-olive-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-olive-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading && (
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {loading ? 'Creating Location...' : 'Create Location'}
                        </button>
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                          onClick={onClose}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '../SupabaseAuthProvider'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'

export default function AddLocationModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const { refreshLocations } = useGlobalDashboard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    description: ''
  })
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // Validate required fields
      if (!formData.name || !formData.city || !formData.state) {
        throw new Error('Name, city, and state are required')
      }
      
      // Create new barbershop location
      const { data, error: insertError } = await supabase
        .from('barbershops')
        .insert({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          phone: formData.phone,
          email: formData.email,
          description: formData.description,
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (insertError) throw insertError
      
      // Create default services for the new location
      const defaultServices = [
        { name: 'Haircut', duration: 30, price: 35, description: 'Standard haircut' },
        { name: 'Beard Trim', duration: 15, price: 20, description: 'Beard trimming and shaping' },
        { name: 'Hair & Beard', duration: 45, price: 50, description: 'Haircut and beard trim combo' },
        { name: 'Kids Cut', duration: 20, price: 25, description: 'Children\'s haircut' }
      ]
      
      const servicesData = defaultServices.map(service => ({
        barbershop_id: data.id,
        name: service.name,
        duration: service.duration,
        price: service.price,
        description: service.description,
        is_active: true
      }))
      
      await supabase.from('services').insert(servicesData)
      
      // Refresh locations in global context
      await refreshLocations()
      
      // Reset form and close modal
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: '',
        description: ''
      })
      
      onClose()
    } catch (err) {
      console.error('Error creating location:', err)
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
                          <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                            ZIP Code
                          </label>
                          <input
                            type="text"
                            id="zip"
                            value={formData.zip}
                            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
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
                          className="inline-flex w-full justify-center rounded-md bg-olive-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-olive-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Creating...' : 'Create Location'}
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
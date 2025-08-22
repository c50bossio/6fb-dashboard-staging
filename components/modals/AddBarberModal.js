'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '../SupabaseAuthProvider'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'

export default function AddBarberModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const { selectedLocations, availableLocations, refreshBarbers } = useGlobalDashboard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteStep, setInviteStep] = useState(true) // Start with invite step
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'barber',
    location_id: selectedLocations[0] || '',
    commission_rate: 60,
    booth_rent: 0,
    send_invite: true
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
      if (!formData.email || !formData.full_name || !formData.location_id) {
        throw new Error('Email, name, and location are required')
      }
      
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single()
      
      let barberId = existingProfile?.id
      
      if (!existingProfile) {
        // Create a new profile for the barber
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone,
            role: 'BARBER',
            onboarding_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (profileError) throw profileError
        barberId = newProfile.id
      }
      
      // Add barber to barbershop_staff
      const { error: staffError } = await supabase
        .from('barbershop_staff')
        .insert({
          user_id: barberId,
          barbershop_id: formData.location_id,
          role: formData.role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (staffError) {
        // Check if already exists
        if (staffError.code === '23505') {
          throw new Error('This barber is already assigned to this location')
        }
        throw staffError
      }
      
      // Create financial arrangement
      const arrangementType = formData.booth_rent > 0 ? 'booth_rent' : 'commission'
      const { error: financialError } = await supabase
        .from('financial_arrangements')
        .insert({
          barber_id: barberId,
          barbershop_id: formData.location_id,
          arrangement_type: arrangementType,
          commission_percentage: arrangementType === 'commission' ? formData.commission_rate : null,
          booth_rent_amount: arrangementType === 'booth_rent' ? formData.booth_rent : null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (financialError) {
        console.error('Error creating financial arrangement:', financialError)
        // Don't fail the whole operation if financial arrangement fails
      }
      
      // Send invite email if requested
      if (formData.send_invite) {
        try {
          await fetch('/api/invites/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.access_token}`
            },
            body: JSON.stringify({
              email: formData.email,
              name: formData.full_name,
              barbershop_id: formData.location_id,
              role: 'barber'
            })
          })
        } catch (inviteError) {
          console.error('Error sending invite:', inviteError)
          // Don't fail if invite fails
        }
      }
      
      // Refresh barbers in global context
      await refreshBarbers()
      
      // Reset form and close modal
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        role: 'barber',
        location_id: selectedLocations[0] || '',
        commission_rate: 60,
        booth_rent: 0,
        send_invite: true
      })
      setInviteStep(true)
      
      onClose()
    } catch (err) {
      console.error('Error adding barber:', err)
      setError(err.message || 'Failed to add barber')
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
                    <UserPlusIcon className="h-6 w-6 text-olive-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Add New Barber
                    </Dialog.Title>
                    
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      {error && (
                        <div className="rounded-md bg-red-50 p-4">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      )}
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                          Assign to Location *
                        </label>
                        <select
                          id="location"
                          value={formData.location_id}
                          onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                          required
                        >
                          <option value="">Select a location</option>
                          {availableLocations.map(location => (
                            <option key={location.id} value={location.id}>
                              {location.name} - {location.city}, {location.state}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          id="role"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                        >
                          <option value="barber">Barber</option>
                          <option value="manager">Manager</option>
                          <option value="receptionist">Receptionist</option>
                        </select>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Financial Arrangement</h4>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="arrangement"
                                checked={formData.booth_rent === 0}
                                onChange={() => setFormData({ ...formData, booth_rent: 0 })}
                                className="mr-2 text-olive-600 focus:ring-olive-500"
                              />
                              <span className="text-sm text-gray-700">Commission Based</span>
                            </label>
                            {formData.booth_rent === 0 && (
                              <div className="ml-6 mt-2">
                                <label htmlFor="commission" className="block text-sm text-gray-600">
                                  Commission Rate (%)
                                </label>
                                <input
                                  type="number"
                                  id="commission"
                                  min="0"
                                  max="100"
                                  value={formData.commission_rate}
                                  onChange={(e) => setFormData({ ...formData, commission_rate: parseInt(e.target.value) })}
                                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                                />
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="arrangement"
                                checked={formData.booth_rent > 0}
                                onChange={() => setFormData({ ...formData, booth_rent: 500 })}
                                className="mr-2 text-olive-600 focus:ring-olive-500"
                              />
                              <span className="text-sm text-gray-700">Booth Rental</span>
                            </label>
                            {formData.booth_rent > 0 && (
                              <div className="ml-6 mt-2">
                                <label htmlFor="booth_rent" className="block text-sm text-gray-600">
                                  Monthly Rent ($)
                                </label>
                                <input
                                  type="number"
                                  id="booth_rent"
                                  min="0"
                                  value={formData.booth_rent}
                                  onChange={(e) => setFormData({ ...formData, booth_rent: parseInt(e.target.value) })}
                                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="send_invite"
                          checked={formData.send_invite}
                          onChange={(e) => setFormData({ ...formData, send_invite: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                        />
                        <label htmlFor="send_invite" className="ml-2 block text-sm text-gray-900">
                          Send invitation email
                        </label>
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex w-full justify-center rounded-md bg-olive-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-olive-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Adding...' : 'Add Barber'}
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
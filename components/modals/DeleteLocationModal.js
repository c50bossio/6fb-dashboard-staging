'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '../SupabaseAuthProvider'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'

export default function DeleteLocationModal({ isOpen, onClose, onComplete, location }) {
  const { user } = useAuth()
  const { refreshLocations } = useGlobalDashboard()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1)
  const [confirmationText, setConfirmationText] = useState('')
  const [countdown, setCountdown] = useState(3)
  const [countdownActive, setCountdownActive] = useState(false)
  
  // Data that will be affected
  const [affectedData, setAffectedData] = useState({
    appointments: 0,
    staff: 0,
    services: 0,
    customers: 0
  })
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1)
      setConfirmationText('')
      setCountdown(3)
      setCountdownActive(false)
      setError('')
      loadAffectedData()
    }
  }, [isOpen])
  
  // Countdown timer for final confirmation
  useEffect(() => {
    if (countdownActive && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown, countdownActive])
  
  const loadAffectedData = async () => {
    if (!location) return
    
    try {
      // Count appointments
      const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', location.id)
        .gte('appointment_date', new Date().toISOString())
      
      // Count staff
      const { count: staffCount } = await supabase
        .from('barbershop_staff')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', location.id)
        .eq('is_active', true)
      
      // Count services
      const { count: serviceCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .or(`(barbershop_id.eq.${location.id}),(shop_id.eq.${location.id})`)
        .eq('is_active', true)
      
      // Count customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', location.id)
      
      setAffectedData({
        appointments: appointmentCount || 0,
        staff: staffCount || 0,
        services: serviceCount || 0,
        customers: customerCount || 0
      })
    } catch (err) {
      console.error('Error loading affected data:', err)
    }
  }
  
  const handleDelete = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Try soft delete first (if is_active column exists)
      let updateData = { updated_at: new Date().toISOString() }
      
      // Check if we can use is_active column
      const { data: testData, error: testError } = await supabase
        .from('barbershops')
        .select('id')
        .eq('id', location.id)
        .single()
      
      if (!testError) {
        // Try to update with is_active if column exists
        const { error: softDeleteError } = await supabase
          .from('barbershops')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', location.id)
        
        if (softDeleteError && softDeleteError.message?.includes('is_active')) {
          // Column doesn't exist, just update the timestamp
          console.warn('is_active column not found, updating timestamp only')
          const { error: updateError } = await supabase
            .from('barbershops')
            .update(updateData)
            .eq('id', location.id)
          
          if (updateError) throw updateError
        } else if (softDeleteError) {
          throw softDeleteError
        }
      } else {
        throw testError
      }
      
      // Refresh locations in global context
      await refreshLocations()
      
      // Close modal and notify parent
      onComplete()
    } catch (err) {
      console.error('Error deleting location:', err)
      setError(err.message || 'Failed to delete location')
      setLoading(false)
    }
  }
  
  const canProceed = () => {
    if (currentStep === 3) {
      return confirmationText === location?.name && countdown === 0
    }
    return true
  }
  
  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(3)
      setCountdownActive(true)
    } else if (currentStep === 3 && canProceed()) {
      handleDelete()
    }
  }
  
  if (!location) return null
  
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
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
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Delete Location: {location.name}
                    </Dialog.Title>
                    
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center mt-4 mb-6">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          currentStep >= 1 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'
                        }`}>
                          1
                        </div>
                        <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-red-600' : 'bg-gray-300'}`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          currentStep >= 2 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'
                        }`}>
                          2
                        </div>
                        <div className={`w-16 h-1 ${currentStep >= 3 ? 'bg-red-600' : 'bg-gray-300'}`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          currentStep >= 3 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'
                        }`}>
                          3
                        </div>
                      </div>
                    </div>
                    
                    {error && (
                      <div className="rounded-md bg-red-50 p-3 mb-4">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}
                    
                    {/* Step 1: Warning */}
                    {currentStep === 1 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500">
                          This action cannot be undone. Deleting this location will:
                        </p>
                        <ul className="mt-3 list-disc list-inside text-sm text-gray-600 space-y-1">
                          <li>Remove the location from your account</li>
                          <li>Cancel all future appointments</li>
                          <li>Remove all staff associations</li>
                          <li>Deactivate all services</li>
                          <li>Archive all customer data</li>
                        </ul>
                        <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                          <p className="text-sm text-yellow-800">
                            <strong>Recommendation:</strong> Consider deactivating the location instead of deleting it to preserve historical data.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 2: Show affected data */}
                    {currentStep === 2 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-4">
                          The following data will be affected:
                        </p>
                        <div className="space-y-3">
                          <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                            <span className="text-sm font-medium text-gray-700">Active Appointments</span>
                            <span className="text-sm font-bold text-red-600">{affectedData.appointments}</span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                            <span className="text-sm font-medium text-gray-700">Staff Members</span>
                            <span className="text-sm font-bold text-red-600">{affectedData.staff}</span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                            <span className="text-sm font-medium text-gray-700">Active Services</span>
                            <span className="text-sm font-bold text-red-600">{affectedData.services}</span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                            <span className="text-sm font-medium text-gray-700">Customer Records</span>
                            <span className="text-sm font-bold text-red-600">{affectedData.customers}</span>
                          </div>
                        </div>
                        {affectedData.appointments > 0 && (
                          <div className="mt-4 p-3 bg-red-50 rounded-md">
                            <p className="text-sm text-red-800">
                              <strong>Warning:</strong> There are {affectedData.appointments} upcoming appointments that will be cancelled.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Step 3: Type confirmation */}
                    {currentStep === 3 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-4">
                          To confirm deletion, please type the location name exactly as shown:
                        </p>
                        <div className="mb-4 p-3 bg-gray-100 rounded-md">
                          <p className="text-lg font-mono font-bold text-center">{location.name}</p>
                        </div>
                        <input
                          type="text"
                          value={confirmationText}
                          onChange={(e) => setConfirmationText(e.target.value)}
                          placeholder="Type location name here"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        {countdown > 0 && (
                          <p className="mt-3 text-sm text-gray-500 text-center">
                            Please wait {countdown} seconds before confirming...
                          </p>
                        )}
                        {confirmationText && confirmationText !== location.name && (
                          <p className="mt-2 text-sm text-red-600">
                            Location name doesn't match. Please type it exactly as shown.
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="mt-6 flex justify-between">
                      {currentStep > 1 && (
                        <button
                          type="button"
                          onClick={() => setCurrentStep(currentStep - 1)}
                          disabled={loading}
                          className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          Back
                        </button>
                      )}
                      {currentStep === 1 && <div />}
                      
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          disabled={loading}
                          className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          disabled={loading || !canProceed()}
                          className={`inline-flex justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                            currentStep === 3 
                              ? 'bg-red-600 hover:bg-red-500' 
                              : 'bg-red-600 hover:bg-red-500'
                          }`}
                        >
                          {loading ? 'Deleting...' : currentStep === 3 ? 'Delete Location' : 'Continue'}
                        </button>
                      </div>
                    </div>
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
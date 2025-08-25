'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon, 
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { createBrowserClient } from '@supabase/ssr'
import EditLocationModal from './EditLocationModal'

export default function ViewLocationModal({ isOpen, onClose, location }) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [locationDetails, setLocationDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  useEffect(() => {
    if (location && isOpen) {
      loadLocationDetails()
    }
  }, [location, isOpen])
  
  const loadLocationDetails = async () => {
    setLoading(true)
    try {
      // Load additional details about the location
      const [staffResponse, servicesResponse, appointmentsResponse] = await Promise.all([
        // Get staff count
        supabase
          .from('barbershop_staff')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', location.id)
          .eq('is_active', true),
        
        // Get services
        supabase
          .from('services')
          .select('*')
          .or(`(barbershop_id.eq.${location.id}),(shop_id.eq.${location.id})`)
          .eq('is_active', true)
          .limit(5),
        
        // Get recent appointments count
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', location.id)
          .gte('appointment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ])
      
      setLocationDetails({
        ...location,
        staffCount: staffResponse.count || 0,
        services: servicesResponse.data || [],
        recentAppointments: appointmentsResponse.count || 0
      })
    } catch (error) {
      console.error('Error loading location details:', error)
      setLocationDetails(location)
    } finally {
      setLoading(false)
    }
  }
  
  const handleEdit = () => {
    setShowEditModal(true)
  }
  
  const handleEditComplete = () => {
    setShowEditModal(false)
    loadLocationDetails() // Reload details after edit
  }
  
  if (!location) return null
  
  const details = locationDetails || location
  
  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => {
          // Don't close if edit modal is open
          if (!showEditModal) {
            onClose()
          }
        }}>
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
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
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
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                      <BuildingOfficeIcon className="h-6 w-6 text-green-600" />
                    </div>
                    
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                        Location Details
                      </Dialog.Title>
                      
                      {loading ? (
                        <div className="mt-6 flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        </div>
                      ) : (
                        <div className="mt-6 space-y-6">
                          {/* Basic Information */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h4>
                            <div className="space-y-3">
                              <div className="flex items-start">
                                <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{details.name}</p>
                                  {details.description && (
                                    <p className="text-sm text-gray-500 mt-1">{details.description}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-start">
                                <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                                <div>
                                  <p className="text-sm text-gray-900">
                                    {details.address && `${details.address}, `}
                                    {details.city}, {details.state} {details.zip || details.zip_code}
                                  </p>
                                </div>
                              </div>
                              
                              {details.phone && (
                                <div className="flex items-center">
                                  <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                                  <p className="text-sm text-gray-900">{details.phone}</p>
                                </div>
                              )}
                              
                              {details.email && (
                                <div className="flex items-center">
                                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                                  <p className="text-sm text-gray-900">{details.email}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Statistics */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center">
                                  <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                                  <div>
                                    <p className="text-2xl font-semibold text-gray-900">{details.staffCount || 0}</p>
                                    <p className="text-xs text-gray-500">Staff Members</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center">
                                  <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                                  <div>
                                    <p className="text-2xl font-semibold text-gray-900">{details.recentAppointments || 0}</p>
                                    <p className="text-xs text-gray-500">Recent Bookings</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center">
                                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                                  <div>
                                    <p className="text-2xl font-semibold text-gray-900">{details.services?.length || 0}</p>
                                    <p className="text-xs text-gray-500">Services</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Services */}
                          {details.services && details.services.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Services Offered</h4>
                              <div className="space-y-2">
                                {details.services.map((service, index) => (
                                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{service.name}</p>
                                      {service.description && (
                                        <p className="text-xs text-gray-500">{service.description}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-gray-900">${service.price}</p>
                                      <p className="text-xs text-gray-500">{service.duration || service.duration_minutes} min</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Business Hours */}
                          {details.business_hours && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Business Hours</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(details.business_hours).map(([day, hours]) => (
                                  <div key={day} className="flex justify-between py-1">
                                    <span className="text-gray-600 capitalize">{day}:</span>
                                    <span className="text-gray-900">
                                      {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Action buttons */}
                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={handleEdit}
                          className="inline-flex justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                        >
                          Edit Location
                        </button>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      
      {/* Edit Location Modal */}
      <EditLocationModal
        isOpen={showEditModal}
        onClose={handleEditComplete}
        location={location}
      />
    </>
  )
}
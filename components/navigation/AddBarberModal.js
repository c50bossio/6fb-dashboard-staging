'use client'

import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, UserPlusIcon, EnvelopeIcon, UserIcon } from '@heroicons/react/24/outline'
import { Fragment, useState } from 'react'

export default function AddBarberModal({ isOpen, onClose, onBarberAdded, locationId }) {
  const [activeTab, setActiveTab] = useState('invite') // 'invite' or 'create'
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    role: 'BARBER'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const endpoint = activeTab === 'invite' 
        ? '/api/staff/invite' 
        : '/api/staff/create'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          locationId,
          inviteType: activeTab,
          barbershopId: locationId // Add for compatibility with existing API
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Build success message based on actual result
        let successMessage = ''
        if (activeTab === 'invite') {
          successMessage = result.existingUser 
            ? `${formData.email} has been added to your team!`
            : `Invitation sent to ${formData.email}!`
        } else {
          // Create tab - show more detailed success
          successMessage = result.message || `Account created for ${formData.email}!`
        }
        
        setSuccess(successMessage)
        
        // Show additional instructions if provided
        if (result.instructions && result.instructions.length > 0) {
          // Join instructions with line breaks for display
          const instructionsText = result.instructions.join('\n')
          console.log('Staff operation completed:', instructionsText)
        }
        
        // Show temp password in dev mode for create flow
        if (activeTab === 'create' && result.data?.tempPassword) {
          console.log('Development Mode - Temporary Password:', result.data.tempPassword)
          setSuccess(`${successMessage}\n\nDev Mode - Temp Password: ${result.data.tempPassword}`)
        }
        
        // Call parent callback with the new staff member data
        if (result.data || result.staff) {
          // Format the data for the parent component
          const newStaffMember = {
            id: result.data?.id || result.staff?.user_id,
            user_id: result.data?.id || result.staff?.user_id,
            name: formData.fullName || formData.email,
            email: formData.email,
            role: formData.role,
            is_active: true
          }
          onBarberAdded(newStaffMember)
        }
        
        // Reset form after short delay to show success
        setTimeout(() => {
          setFormData({
            email: '',
            fullName: '',
            phone: '',
            role: 'BARBER'
          })
          setSuccess('')
          onClose()
        }, activeTab === 'create' && result.data?.tempPassword ? 4000 : 2000) // Longer delay for create to show password
        
      } else {
        const errorData = await response.json()
        setError(errorData.error || `Failed to ${activeTab} barber`)
      }
    } catch (error) {
      console.error(`Error ${activeTab}ing barber:`, error)
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
                    <UserPlusIcon className="h-5 w-5 text-amber-500" />
                    <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                      Add Team Member
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 mb-4">
                  <button
                    onClick={() => setActiveTab('invite')}
                    className={`flex-1 flex items-center justify-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                      activeTab === 'invite' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    <span>Invite</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`flex-1 flex items-center justify-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                      activeTab === 'create' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>Create</span>
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
                      <p className="text-sm text-green-600 whitespace-pre-line">{success}</p>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      {activeTab === 'invite' 
                        ? 'Send an invitation to an existing barber to join your team.'
                        : 'Create a new account for a barber and send them login credentials.'
                      }
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="barber@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  {activeTab === 'create' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          placeholder="John Smith"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
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
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="BARBER">Barber</option>
                      <option value="MANAGER">Manager</option>
                    </select>
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
                      disabled={loading || !formData.email.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-amber-500 border border-transparent rounded-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading 
                        ? (activeTab === 'invite' ? 'Inviting...' : 'Creating...')
                        : (activeTab === 'invite' ? 'Send Invite' : 'Create Account')
                      }
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
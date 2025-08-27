'use client'

import { 
  XMarkIcon, 
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import ProfileUpdateTest from '@/components/debug/ProfileUpdateTest'
import StaffSaveDebugger from '@/components/debug/StaffSaveDebugger'
import Button from '@/components/ui/Button'
import { Card } from "@/components/ui/card.jsx"
import { Modal } from '@/components/ui/Modal'
import {
  formatCommissionDisplay,
  formatCommissionInput,
  parseCommissionInput,
  formatBoothRent,
  parseBoothRentInput,
  formatFinancialModel,
  formatRentFrequency,
  getRentFrequencyOptions,
  formatHybridModelDisplay,
  calculateEarningsPreview,
  validateFinancialArrangement,
  standardizeFinancialFields
} from '@/lib/financial-display-utils'
import { 
  getDisplayName, 
  splitFullName, 
  combineNames, 
  normalizeNameData,
  createNameUpdateObject 
} from '@/lib/name-utils'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

export default function StaffDetailModal({ staff, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editedData, setEditedData] = useState({})
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

  useEffect(() => {
    if (staff) {
      // Handle both old and new name field formats
      const nameData = {
        firstName: staff.user?.first_name,
        lastName: staff.user?.last_name,
        fullName: staff.user?.full_name
      }
      const normalizedNames = normalizeNameData(nameData)
      
      setEditedData({
        first_name: normalizedNames.firstName || '',
        last_name: normalizedNames.lastName || '',
        full_name: normalizedNames.fullName || '', // Keep for backward compatibility
        email: staff.user?.email || '',
        phone: staff.user?.phone || '',
        role: staff.role || 'barber',
        arrangement_type: staff.arrangement_type || staff.financial_model || 'commission',
        commission_rate: staff.commission_rate || 0.6, // Default 60%
        hourly_rate: staff.hourly_rate || 0,
        booth_rent_amount: staff.booth_rent_amount || 0,
        rent_frequency: staff.rent_frequency || 'monthly',
        is_active: staff.is_active !== false
      })
    }
  }, [staff])

  const handleSave = async () => {
    console.log('🚀 [StaffDetailModal] SAVE BUTTON CLICKED - Starting save process')
    console.log('🔍 [StaffDetailModal] Current editedData state:', editedData)
    console.log('🔍 [StaffDetailModal] Staff object:', staff)
    
    setLoading(true)
    console.log('🔍 [StaffDetailModal] Loading state set to true')
    
    try {
      // Validate financial arrangement before saving
      console.log('🔍 [StaffDetailModal] Starting validation...')
      const validation = validateFinancialArrangement(editedData)
      console.log('🔍 [StaffDetailModal] Validation result:', validation)
      
      if (!validation.isValid) {
        console.log('❌ [StaffDetailModal] Validation failed:', validation.errors)
        toast.error(`Please fix the following: ${validation.errors.join(', ')}`)
        setLoading(false)
        return
      }
      
      console.log('✅ [StaffDetailModal] Validation passed, proceeding with save...')

      // Debug: Log what we're about to send
      console.log('🔍 [StaffDetailModal] Raw editedData:', editedData)
      
      const nameUpdateData = createNameUpdateObject(editedData)
      console.log('🔍 [StaffDetailModal] Name update data:', nameUpdateData)
      
      // Standardize both financial and name data before sending to API
      const standardizedData = {
        ...standardizeFinancialFields(editedData),
        ...nameUpdateData
      }
      
      console.log('🔍 [StaffDetailModal] Final data being sent to API:', standardizedData)
      
      // PRODUCTION: Use proper staff API with authorization
      console.log('🌐 [StaffDetailModal] Making API request to:', `/api/staff/${staff.id}`)
      console.log('🌐 [StaffDetailModal] Staff ID (user_id):', staff.id)
      console.log('🌐 [StaffDetailModal] Request method: PATCH')
      console.log('🌐 [StaffDetailModal] Request body:', JSON.stringify(standardizedData, null, 2))
      
      const response = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(standardizedData)
      })

      console.log('🌐 [StaffDetailModal] Raw response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      const data = await response.json()
      
      console.log('🔍 [StaffDetailModal] Parsed response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update staff')
      }

      toast.success('Staff member updated successfully')
      setIsEditing(false)
      
      // Update the local state with the new data from proper staff API
      if (data.staff) {
        // The API now always returns user profile data
        if (data.staff.user) {
          const updatedNameData = normalizeNameData({
            firstName: data.staff.user.first_name,
            lastName: data.staff.user.last_name,
            fullName: data.staff.user.full_name
          })
          
          setEditedData(prev => ({
            ...prev,
            first_name: updatedNameData.firstName || '',
            last_name: updatedNameData.lastName || '',
            full_name: updatedNameData.fullName || '',
            email: data.staff.user.email || prev.email,
            phone: data.staff.user.phone || prev.phone
          }))
          
          console.log('🔍 [StaffDetailModal] Updated local state with new profile data:', updatedNameData)
        }
        
        if (onUpdate) {
          // Pass the complete updated staff data to the dashboard
          const updatedStaffData = {
            ...staff,
            ...data.staff,
            // Ensure name fields are present for UI display
            first_name: data.staff.user?.first_name || editedData.first_name,
            last_name: data.staff.user?.last_name || editedData.last_name,
            full_name: data.staff.user?.full_name || combineNames(editedData.first_name, editedData.last_name),
            display_name: getDisplayName({
              firstName: data.staff.user?.first_name || editedData.first_name,
              lastName: data.staff.user?.last_name || editedData.last_name,
              fullName: data.staff.user?.full_name,
              email: data.staff.user?.email || staff.email
            })
          }
          console.log('🔍 [StaffDetailModal] Calling onUpdate with:', updatedStaffData)
          onUpdate(updatedStaffData)
        }
      }
    } catch (error) {
      console.error('🚨 [StaffDetailModal] Error during save process:', error)
      console.error('🚨 [StaffDetailModal] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      toast.error(error.message || 'Failed to update staff member')
    } finally {
      console.log('🔍 [StaffDetailModal] Save process completed, setting loading to false')
      setLoading(false)
    }
  }

  const handleDeactivate = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/staff/${staff.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate staff')
      }

      toast.success('Staff member deactivated')
      setShowDeactivateConfirm(false)
      if (onUpdate) onUpdate(data.staff)
      onClose()
    } catch (error) {
      console.error('Error deactivating staff:', error)
      toast.error(error.message || 'Failed to deactivate staff member')
    } finally {
      setLoading(false)
    }
  }

  const handleReactivate = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate staff')
      }

      toast.success('Staff member reactivated')
      setEditedData(prev => ({ ...prev, is_active: true }))
      if (onUpdate) onUpdate(data.staff)
    } catch (error) {
      console.error('Error reactivating staff:', error)
      toast.error(error.message || 'Failed to reactivate staff member')
    } finally {
      setLoading(false)
    }
  }

  if (!staff) return null

  const isInactive = !editedData.is_active

  return (
    <Modal isOpen={true} onClose={onClose} size="large">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
              <UserCircleIcon className="h-10 w-10 text-gray-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {getDisplayName({ firstName: editedData.first_name, lastName: editedData.last_name, fullName: editedData.full_name, email: staff.user?.email })}
              </h2>
              <p className="text-gray-600 capitalize">{editedData.role}</p>
              {isInactive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                  Inactive
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="flex items-center"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                {isInactive ? (
                  <Button
                    onClick={handleReactivate}
                    variant="primary"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    Reactivate
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowDeactivateConfirm(true)}
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Deactivate
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  variant="primary"
                  disabled={loading}
                  className="flex items-center"
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false)
                    // Reset to original values using name utilities for consistency
                    const nameData = {
                      firstName: staff.user?.first_name,
                      lastName: staff.user?.last_name,
                      fullName: staff.user?.full_name
                    }
                    const normalizedNames = normalizeNameData(nameData)
                    
                    setEditedData({
                      first_name: normalizedNames.firstName || '',
                      last_name: normalizedNames.lastName || '',
                      full_name: normalizedNames.fullName || '', // Keep for backward compatibility
                      email: staff.user?.email || '',
                      phone: staff.user?.phone || '',
                      role: staff.role || 'barber',
                      financial_model: staff.financial_model || 'commission',
                      commission_rate: staff.commission_rate || 0.5, // Default 50%
                      hourly_rate: staff.hourly_rate || 0,
                      booth_rent_amount: staff.booth_rent_amount || 0,
                      is_active: staff.is_active !== false
                    })
                  }}
                  variant="outline"
                  disabled={loading}
                >
                  Cancel
                </Button>
              </>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Debug Panel (Development Only) */}
        {process.env.NODE_ENV === 'development' && isEditing && (
          <div className="space-y-4">
            <StaffSaveDebugger 
              staff={staff}
              onSaveAttempt={(success, result) => {
                if (success) {
                  console.log('Debug save succeeded:', result)
                  toast.success('Debug test passed!')
                } else {
                  console.error('Debug save failed:', result)
                }
              }}
            />
            <ProfileUpdateTest userId={staff?.user_id} />
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <UserCircleIcon className="h-5 w-5 mr-2 text-gray-600" />
              Personal Information
            </h3>
            <div className="space-y-3">
              {/* First Name and Last Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.first_name}
                      onChange={(e) => setEditedData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{editedData.first_name || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600">Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.last_name}
                      onChange={(e) => setEditedData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{editedData.last_name || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 flex items-center">
                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedData.email}
                    onChange={(e) => setEditedData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                  />
                ) : (
                  <p className="text-gray-900">{editedData.email}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600 flex items-center">
                  <PhoneIcon className="h-4 w-4 mr-1" />
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedData.phone}
                    onChange={(e) => setEditedData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                  />
                ) : (
                  <p className="text-gray-900">{editedData.phone || 'Not set'}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Professional Information */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <BriefcaseIcon className="h-5 w-5 mr-2 text-gray-600" />
              Professional Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Role</label>
                {isEditing ? (
                  <select
                    value={editedData.role}
                    onChange={(e) => setEditedData(prev => ({ ...prev, role: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                  >
                    <option value="barber">Barber</option>
                    <option value="barber & manager">Barber & Manager</option>
                    <option value="manager">Manager</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="owner">Owner</option>
                  </select>
                ) : (
                  <p className="text-gray-900 font-medium capitalize">{editedData.role}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600">Status</label>
                <p className={`font-medium ${isInactive ? 'text-red-600' : 'text-green-600'}`}>
                  {isInactive ? 'Inactive' : 'Active'}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-600">Member Since</label>
                <p className="text-gray-900">
                  {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </Card>

          {/* Financial Information */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 text-gray-600" />
              Financial Arrangement
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Model</label>
                {isEditing ? (
                  <select
                    value={editedData.arrangement_type}
                    onChange={(e) => setEditedData(prev => ({ ...prev, arrangement_type: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                  >
                    <option value="commission">Commission</option>
                    <option value="booth_rent">Booth Rent</option>
                    <option value="hourly">Hourly</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                ) : (
                  <p className="text-gray-900 font-medium">
                    {formatFinancialModel(editedData.arrangement_type)}
                  </p>
                )}
              </div>

              {editedData.arrangement_type === 'commission' && (
                <div>
                  <label className="text-sm text-gray-600">Commission Rate</label>
                  {isEditing ? (
                    <div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          value={formatCommissionInput(editedData.commission_rate)}
                          onChange={(e) => setEditedData(prev => ({ ...prev, commission_rate: parseCommissionInput(e.target.value || 0) }))}
                          className="mt-1 w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                          placeholder="60"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Enter as percentage (e.g., 60 for 60%)</p>
                      <p className="text-xs text-gray-400 mt-1">Barber receives this percentage, shop gets the remainder</p>
                    </div>
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {formatCommissionDisplay(editedData.commission_rate)}
                    </p>
                  )}
                </div>
              )}

              {editedData.arrangement_type === 'booth_rent' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Booth Rent Amount</label>
                    {isEditing ? (
                      <div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={editedData.booth_rent_amount || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, booth_rent_amount: parseBoothRentInput(e.target.value) }))}
                            className="mt-1 w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                            placeholder="1500"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {formatBoothRent(editedData.booth_rent_amount, editedData.rent_frequency)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Payment Frequency</label>
                    {isEditing ? (
                      <div>
                        <select
                          value={editedData.rent_frequency}
                          onChange={(e) => setEditedData(prev => ({ ...prev, rent_frequency: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                        >
                          {getRentFrequencyOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label} - {option.description}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Barber pays this amount to the shop</p>
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {formatRentFrequency(editedData.rent_frequency)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {editedData.arrangement_type === 'hourly' && (
                <div>
                  <label className="text-sm text-gray-600">Hourly Rate</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={editedData.hourly_rate}
                      onChange={(e) => setEditedData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {formatCurrency(editedData.hourly_rate)}/hour
                    </p>
                  )}
                </div>
              )}

              {editedData.arrangement_type === 'hybrid' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Base Monthly Rent</label>
                    {isEditing ? (
                      <div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={editedData.hybrid_base_rent || editedData.booth_rent_amount || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, hybrid_base_rent: parseBoothRentInput(e.target.value) }))}
                            className="mt-1 w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                            placeholder="800"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {formatBoothRent(editedData.hybrid_base_rent || editedData.booth_rent_amount)}/month
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Revenue Threshold</label>
                    {isEditing ? (
                      <div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={editedData.hybrid_revenue_threshold || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, hybrid_revenue_threshold: parseBoothRentInput(e.target.value) }))}
                            className="mt-1 w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                            placeholder="3000"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Commission applies only to revenue above this amount</p>
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {formatBoothRent(editedData.hybrid_revenue_threshold)}/month
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Commission Rate (Above Threshold)</label>
                    {isEditing ? (
                      <div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            value={formatCommissionInput(editedData.hybrid_commission_rate || editedData.commission_rate)}
                            onChange={(e) => setEditedData(prev => ({ ...prev, hybrid_commission_rate: parseCommissionInput(e.target.value || 0) }))}
                            className="mt-1 w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                            placeholder="20"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Commission rate on revenue above threshold</p>
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {formatCommissionDisplay(editedData.hybrid_commission_rate || editedData.commission_rate)}
                      </p>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="bg-olive-50 border border-olive-200 rounded-lg p-3">
                      <p className="text-sm text-olive-700">
                        {formatHybridModelDisplay(editedData)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {staff.commission_balance && (
                <div>
                  <label className="text-sm text-gray-600">Pending Commission</label>
                  <p className="text-gray-900 font-semibold text-green-600">
                    {formatCurrency(staff.commission_balance[0]?.pending_amount || 0)}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-gray-600" />
              Performance (30 Days)
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Bookings</span>
                <span className="font-medium text-gray-900">{staff.metrics?.totalBookings || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Revenue Generated</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(staff.metrics?.revenue || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="font-medium text-gray-900">
                  {staff.metrics?.completionRate || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">No-Show Rate</span>
                <span className="font-medium text-gray-900">
                  {staff.metrics?.noShowRate || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average Rating</span>
                <span className="font-medium text-gray-900">
                  {staff.metrics?.rating > 0 ? `${staff.metrics.rating}/5` : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Deactivate Confirmation Modal */}
        {showDeactivateConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Deactivation
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to deactivate this staff member? They will no longer be able to receive bookings.
                You can reactivate them at any time.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowDeactivateConfirm(false)}
                  variant="outline"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeactivate}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? 'Deactivating...' : 'Deactivate'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Modal>
  )
}
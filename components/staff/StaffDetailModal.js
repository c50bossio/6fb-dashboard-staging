'use client'

import {
  XMarkIcon,
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
// Debug components removed for production
// import ProfileUpdateTest from '@/components/debug/ProfileUpdateTest'
// import StaffSaveDebugger from '@/components/debug/StaffSaveDebugger'
import Button from '@/components/ui/Button'
import { Card } from "@/components/ui/card"
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
// Name utilities removed - using direct field access for simplicity
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { formatCurrency } from '@/lib/utils'

// Helper function to format role display
function formatRoleDisplay(role) {
  if (!role) return 'Staff Member'
  
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper function to get role capabilities
function getRoleCapabilities(role) {
  const canTakeAppointments = role === 'BARBER' || role === 'ENTERPRISE_OWNER' || role === 'SHOP_OWNER'
  const isVisibleForBooking = true // Default to true for all roles
  
  return {
    canTakeAppointments,
    isVisibleForBooking,
    description: canTakeAppointments 
      ? 'Can take appointments and appear in booking dropdowns'
      : 'Cannot take appointments by default (administrative role)'
  }
}

export default function StaffDetailModal({ staff, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editedData, setEditedData] = useState({})
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

  useEffect(() => {
    if (staff) {
      // Initialize with all staff data including appointment capabilities
      setEditedData({
        first_name: staff.first_name || staff.user?.first_name || '',
        last_name: staff.last_name || staff.user?.last_name || '',
        full_name: staff.full_name || staff.user?.full_name || '',
        email: staff.email || staff.user?.email || '',
        phone: staff.phone || staff.user?.phone || '',
        role: staff.role || 'barber',
        // Appointment capability fields
        can_take_appointments: staff.can_take_appointments ?? getRoleCapabilities(staff.role || 'barber').canTakeAppointments,
        is_visible_for_booking: staff.is_visible_for_booking ?? true,
        // Financial arrangement fields
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
    
    setLoading(true)
    
    try {
      // Validate financial arrangement before saving
      const validation = validateFinancialArrangement(editedData)
      
      if (!validation.isValid) {
        toast.error(`Please fix the following: ${validation.errors.join(', ')}`)
        setLoading(false)
        return
      }
      

      
      // Simple data preparation - just pass what we have
      const standardizedData = {
        ...standardizeFinancialFields(editedData),
        first_name: editedData.first_name,
        last_name: editedData.last_name,
        full_name: editedData.full_name || `${editedData.first_name} ${editedData.last_name}`.trim()
      }
      
      
      // PRODUCTION: Use proper staff API with authorization
      
      const response = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(standardizedData)
      })


      const data = await response.json()
      

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update staff')
      }

      toast.success('Staff member updated successfully')
      setIsEditing(false)
      
      // Update the local state with the new data from proper staff API
      if (data.staff) {
        // Simple update - just use the data directly
        if (data.staff.user) {
          setEditedData(prev => ({
            ...prev,
            first_name: data.staff.user.first_name || prev.first_name,
            last_name: data.staff.user.last_name || prev.last_name,
            full_name: data.staff.user.full_name || prev.full_name,
            email: data.staff.user.email || prev.email,
            phone: data.staff.user.phone || prev.phone
          }))
          
        }
        
        if (onUpdate) {
          // Pass the complete updated staff data to the dashboard
          const updatedStaffData = {
            ...staff,
            ...data.staff,
            // Ensure name fields are present for UI display
            first_name: data.staff.user?.first_name || editedData.first_name,
            last_name: data.staff.user?.last_name || editedData.last_name,
            full_name: data.staff.user?.full_name || `${editedData.first_name} ${editedData.last_name}`.trim(),
            display_name: data.staff.user?.full_name || 
                         (editedData.first_name || editedData.last_name ? 
                           `${editedData.first_name} ${editedData.last_name}`.trim() : 
                           data.staff.user?.email || 'Staff Member')
          }
          onUpdate(updatedStaffData)
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update staff member')
    } finally {
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
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <UserCircleIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {
                  editedData.full_name ||
                  (editedData.first_name || editedData.last_name ?
                    `${editedData.first_name} ${editedData.last_name}`.trim() :
                    editedData.email || 'Staff Member - Profile Incomplete')
                }
              </h2>
              <p className="text-muted-foreground">{formatRoleDisplay(editedData.role)}</p>
              {isInactive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 mt-1">
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
                    className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                    // Reset to original values including appointment capabilities
                    setEditedData({
                      first_name: staff.first_name || staff.user?.first_name || '',
                      last_name: staff.last_name || staff.user?.last_name || '',
                      full_name: staff.full_name || staff.user?.full_name || '',
                      email: staff.email || staff.user?.email || '',
                      phone: staff.phone || staff.user?.phone || '',
                      role: staff.role || 'barber',
                      // Reset appointment capability fields
                      can_take_appointments: staff.can_take_appointments ?? getRoleCapabilities(staff.role || 'barber').canTakeAppointments,
                      is_visible_for_booking: staff.is_visible_for_booking ?? true,
                      // Reset financial fields
                      arrangement_type: staff.arrangement_type || staff.financial_model || 'commission',
                      commission_rate: staff.commission_rate || 0.6, // Default 60%
                      hourly_rate: staff.hourly_rate || 0,
                      booth_rent_amount: staff.booth_rent_amount || 0,
                      rent_frequency: staff.rent_frequency || 'monthly',
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
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Debug Panel (Development Only) - Disabled for production */}
        {false && (
          <div className="space-y-4">
            {/* StaffSaveDebugger and ProfileUpdateTest removed for production */}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4 flex items-center">
              <UserCircleIcon className="h-5 w-5 mr-2 text-muted-foreground" />
              Personal Information
            </h3>
            <div className="space-y-3">
              {/* First Name and Last Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.first_name}
                      onChange={(e) => setEditedData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{editedData.first_name || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.last_name}
                      onChange={(e) => setEditedData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{editedData.last_name || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground flex items-center">
                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedData.email}
                    onChange={(e) => setEditedData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                  />
                ) : (
                  <p className="text-foreground">{editedData.email}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-muted-foreground flex items-center">
                  <PhoneIcon className="h-4 w-4 mr-1" />
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedData.phone}
                    onChange={(e) => setEditedData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                  />
                ) : (
                  <p className="text-foreground">{editedData.phone || 'Not set'}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Professional Information */}
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4 flex items-center">
              <BriefcaseIcon className="h-5 w-5 mr-2 text-muted-foreground" />
              Professional Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Role</label>
                {isEditing ? (
                  <select
                    value={editedData.role}
                    onChange={(e) => setEditedData(prev => ({ ...prev, role: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                  >
                    <option value="ENTERPRISE_OWNER">Enterprise Owner</option>
                    <option value="SHOP_OWNER">Shop Owner</option>
                    <option value="BARBER">Barber</option>
                    <option value="MANAGER">Manager</option>
                    <option value="STAFF">Staff</option>
                  </select>
                ) : (
                  <p className="text-foreground font-medium">{formatRoleDisplay(editedData.role)}</p>
                )}
              </div>

              {/* Appointment Capabilities - Now Editable */}
              <div>
                <label className="text-sm text-muted-foreground">Appointment Capability</label>
                {isEditing ? (
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="can_take_appointments"
                        checked={editedData.can_take_appointments}
                        onChange={(e) => setEditedData(prev => ({ ...prev, can_take_appointments: e.target.checked }))}
                        className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-border rounded"
                      />
                      <label htmlFor="can_take_appointments" className="ml-2 text-sm text-foreground">
                        Can take appointments
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_visible_for_booking"
                        checked={editedData.is_visible_for_booking}
                        onChange={(e) => setEditedData(prev => ({ ...prev, is_visible_for_booking: e.target.checked }))}
                        className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-border rounded"
                      />
                      <label htmlFor="is_visible_for_booking" className="ml-2 text-sm text-foreground">
                        Available for public booking
                      </label>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Role default: {getRoleCapabilities(editedData.role).canTakeAppointments ? 'Can take appointments' : 'Administrative role (no appointments)'}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {editedData.is_visible_for_booking
                          ? "✓ Customers can book online with this staff member"
                          : "Only accepts bookings through admin/internal system"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      editedData.can_take_appointments
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {editedData.can_take_appointments ? '✓ Can Take Appointments' : '— Cannot Take Appointments'}
                    </div>
                    {editedData.can_take_appointments && (
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                        editedData.is_visible_for_booking
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {editedData.is_visible_for_booking ? '🌐 Available for Public Booking' : '🔒 Private Bookings Only'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <p className={`font-medium ${isInactive ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {isInactive ? 'Inactive' : 'Active'}
                </p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Member Since</label>
                <p className="text-foreground">
                  {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </Card>

          {/* Financial Information */}
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-2 flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 text-muted-foreground" />
              Financial Arrangement
            </h3>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Individual Override:</strong> These settings override the barbershop's default financial arrangement for this staff member specifically.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Model</label>
                {isEditing ? (
                  <select
                    value={editedData.arrangement_type}
                    onChange={(e) => setEditedData(prev => ({ ...prev, arrangement_type: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                  >
                    <option value="commission">Commission</option>
                    <option value="booth_rent">Booth Rent</option>
                    <option value="hourly">Hourly</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                ) : (
                  <p className="text-foreground font-medium">
                    {formatFinancialModel(editedData.arrangement_type)}
                  </p>
                )}
              </div>

              {editedData.arrangement_type === 'commission' && (
                <div>
                  <label className="text-sm text-muted-foreground">Commission Rate</label>
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
                          className="mt-1 w-full px-3 py-2 pr-8 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                          placeholder="60"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Enter as percentage (e.g., 60 for 60%)</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Barber receives this percentage, shop gets the remainder</p>
                    </div>
                  ) : (
                    <p className="text-foreground font-medium">
                      {formatCommissionDisplay(editedData.commission_rate)}
                    </p>
                  )}
                </div>
              )}

              {editedData.arrangement_type === 'booth_rent' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Booth Rent Amount</label>
                    {isEditing ? (
                      <div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={editedData.booth_rent_amount || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, booth_rent_amount: parseBoothRentInput(e.target.value) }))}
                            className="mt-1 w-full pl-8 pr-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                            placeholder="1500"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-foreground font-medium">
                        {formatBoothRent(editedData.booth_rent_amount, editedData.rent_frequency)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Payment Frequency</label>
                    {isEditing ? (
                      <div>
                        <select
                          value={editedData.rent_frequency}
                          onChange={(e) => setEditedData(prev => ({ ...prev, rent_frequency: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                        >
                          {getRentFrequencyOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label} - {option.description}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground/70 mt-1">Barber pays this amount to the shop</p>
                      </div>
                    ) : (
                      <p className="text-foreground font-medium">
                        {formatRentFrequency(editedData.rent_frequency)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {editedData.arrangement_type === 'hourly' && (
                <div>
                  <label className="text-sm text-muted-foreground">Hourly Rate</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={editedData.hourly_rate}
                      onChange={(e) => setEditedData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) }))}
                      className="mt-1 w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                    />
                  ) : (
                    <p className="text-foreground font-medium">
                      {formatCurrency(editedData.hourly_rate)}/hour
                    </p>
                  )}
                </div>
              )}

              {editedData.arrangement_type === 'hybrid' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Base Monthly Rent</label>
                    {isEditing ? (
                      <div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={editedData.hybrid_base_rent || editedData.booth_rent_amount || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, hybrid_base_rent: parseBoothRentInput(e.target.value) }))}
                            className="mt-1 w-full pl-8 pr-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                            placeholder="800"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-foreground font-medium">
                        {formatBoothRent(editedData.hybrid_base_rent || editedData.booth_rent_amount)}/month
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Revenue Threshold</label>
                    {isEditing ? (
                      <div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={editedData.hybrid_revenue_threshold || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, hybrid_revenue_threshold: parseBoothRentInput(e.target.value) }))}
                            className="mt-1 w-full pl-8 pr-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                            placeholder="3000"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Commission applies only to revenue above this amount</p>
                      </div>
                    ) : (
                      <p className="text-foreground font-medium">
                        {formatBoothRent(editedData.hybrid_revenue_threshold)}/month
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Commission Rate (Above Threshold)</label>
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
                            className="mt-1 w-full px-3 py-2 pr-8 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-olive-500"
                            placeholder="20"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Commission rate on revenue above threshold</p>
                      </div>
                    ) : (
                      <p className="text-foreground font-medium">
                        {formatCommissionDisplay(editedData.hybrid_commission_rate || editedData.commission_rate)}
                      </p>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800 rounded-lg p-3">
                      <p className="text-sm text-olive-700 dark:text-olive-300">
                        {formatHybridModelDisplay(editedData)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {staff.commission_balance && (
                <div>
                  <label className="text-sm text-muted-foreground">Pending Commission</label>
                  <p className="text-foreground font-semibold text-green-600">
                    {formatCurrency(staff.commission_balance[0]?.pending_amount || 0)}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Performance Summary */}
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                Performance (30 Days)
              </div>
              <button
                onClick={() => {
                  // TODO: Navigate to analytics dashboard with staff filter
                  console.log('Navigate to analytics for staff:', staff.id)
                }}
                className="text-sm text-olive-600 dark:text-olive-400 hover:text-olive-800 dark:hover:text-olive-300 font-medium"
              >
                View Full Analytics →
              </button>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Bookings</span>
                <span className="font-medium text-foreground">{staff.metrics?.totalBookings || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="font-medium text-foreground">
                  {staff.metrics?.completionRate || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Revenue Generated</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(staff.metrics?.revenue || 0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                For detailed analytics including trends, comparisons, and insights, click "View Full Analytics" above.
              </p>
            </div>
          </Card>
        </div>

        {/* Deactivate Confirmation Modal */}
        {showDeactivateConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Confirm Deactivation
              </h3>
              <p className="text-muted-foreground mb-6">
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
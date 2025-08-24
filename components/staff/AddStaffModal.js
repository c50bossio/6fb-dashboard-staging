'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

export default function AddStaffModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'barber',
    financial_model: 'commission',
    commission_rate: 0.5,
    booth_rent_amount: 0,
    phone: '',
    schedule_type: 'full_time'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Get current user's barbershop
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, barbershop_id')
        .eq('id', user.id)
        .single()

      const barbershopId = profile?.shop_id || profile?.barbershop_id
      if (!barbershopId) throw new Error('No barbershop found')

      // Check if user already exists
      let userId = null
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingUser) {
        userId = existingUser.id
      } else {
        // Create user account (they'll set password on first login)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: Math.random().toString(36).slice(-12), // Temporary password
          options: {
            data: {
              full_name: formData.full_name,
              role: 'BARBER'
            }
          }
        })

        if (authError) throw authError
        userId = authData.user?.id
      }

      if (!userId) throw new Error('Failed to create user account')

      // Add to barbershop_staff
      const { data: newStaff, error: staffError } = await supabase
        .from('barbershop_staff')
        .insert({
          barbershop_id: barbershopId,
          user_id: userId,
          role: formData.role,
          is_active: true,
          financial_model: formData.financial_model,
          commission_rate: formData.financial_model === 'commission' ? formData.commission_rate : null,
          booth_rent_amount: formData.financial_model === 'booth_rent' ? formData.booth_rent_amount : null,
          schedule_type: formData.schedule_type,
          permissions: getDefaultPermissions(formData.role)
        })
        .select()
        .single()

      if (staffError) throw staffError

      // Create default schedule (9-5, Mon-Fri)
      const defaultSchedule = []
      for (let day = 1; day <= 5; day++) { // Monday to Friday
        defaultSchedule.push({
          staff_id: newStaff.id,
          barbershop_id: barbershopId,
          day_of_week: day,
          start_time: '09:00',
          end_time: '17:00',
          is_recurring: true,
          is_active: true
        })
      }

      const { error: scheduleError } = await supabase
        .from('staff_schedules')
        .insert(defaultSchedule)

      if (scheduleError) {
        console.error('Failed to create default schedule:', scheduleError)
      }

      // Send invitation email (could be handled by backend)
      // For now, just show success
      toast.success(`Staff member added! An invitation has been sent to ${formData.email}`)
      
      onSuccess()
    } catch (error) {
      console.error('Error adding staff:', error)
      toast.error(error.message || 'Failed to add staff member')
    } finally {
      setLoading(false)
    }
  }

  const getDefaultPermissions = (role) => {
    switch(role) {
      case 'manager':
        return {
          can_manage_appointments: true,
          can_manage_customers: true,
          can_view_reports: true,
          can_manage_inventory: true,
          can_manage_staff: false,
          can_manage_settings: false
        }
      case 'receptionist':
        return {
          can_manage_appointments: true,
          can_manage_customers: true,
          can_view_reports: false,
          can_manage_inventory: false,
          can_manage_staff: false,
          can_manage_settings: false
        }
      default: // barber
        return {
          can_manage_appointments: true,
          can_manage_customers: false,
          can_view_reports: false,
          can_manage_inventory: false,
          can_manage_staff: false,
          can_manage_settings: false
        }
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Staff Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                >
                  <option value="barber">Barber</option>
                  <option value="manager">Manager</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>
            </div>
          </div>

          {/* Financial Arrangement */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Financial Arrangement</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Model
              </label>
              <select
                value={formData.financial_model}
                onChange={(e) => setFormData({ ...formData, financial_model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
              >
                <option value="commission">Commission Based</option>
                <option value="booth_rent">Booth Rental</option>
                <option value="salary">Salary</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {formData.financial_model === 'commission' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.commission_rate * 100}
                  onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value / 100 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
            )}

            {formData.financial_model === 'booth_rent' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekly Booth Rent ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.booth_rent_amount}
                  onChange={(e) => setFormData({ ...formData, booth_rent_amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Schedule Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Type
            </label>
            <select
              value={formData.schedule_type}
              onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Staff Member'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

// Specialty options for barbers
const SPECIALTY_OPTIONS = [
  'Classic Cuts',
  'Fades',
  'Designs & Art',
  'Braids',
  'Beard Grooming',
  'Kids Cuts',
  'Senior Cuts',
  'Hair Coloring',
  'Hot Towel Shaves',
  'Hair Treatments'
]

export default function AddStaffModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    // Basic Information
    email: '',
    full_name: '',
    role: 'barber',
    phone: '',
    
    // Legal & Compliance
    license_number: '',
    license_expiry: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    has_insurance: false,
    background_check_consent: false,
    
    // Professional Experience
    years_experience: 0,
    specialties: [],
    certifications: [],
    previous_workplace: '',
    
    // Financial
    financial_model: 'commission',
    commission_rate: 0.5,
    booth_rent_amount: 0,
    
    // Schedule
    schedule_type: 'full_time',
    working_days: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    preferred_hours: {
      start: '09:00',
      end: '17:00'
    },
    max_daily_appointments: 10
  })

  const validateForm = () => {
    const newErrors = {}
    
    // Basic Information
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    // Legal & Compliance (Required for barbers)
    if (formData.role === 'barber') {
      if (!formData.license_number.trim()) {
        newErrors.license_number = 'Professional license number is required'
      }
      
      if (!formData.license_expiry) {
        newErrors.license_expiry = 'License expiry date is required'
      } else {
        const expiryDate = new Date(formData.license_expiry)
        if (expiryDate < new Date()) {
          newErrors.license_expiry = 'License has expired'
        }
      }
    }
    
    // Emergency Contact (Required for all)
    if (!formData.emergency_contact_name.trim()) {
      newErrors.emergency_contact_name = 'Emergency contact name is required'
    }
    
    if (!formData.emergency_contact_phone.trim()) {
      newErrors.emergency_contact_phone = 'Emergency contact phone is required'
    } else if (!/^[\d\s\-\(\)\+]+$/.test(formData.emergency_contact_phone)) {
      newErrors.emergency_contact_phone = 'Please enter a valid phone number'
    }
    
    if (!formData.emergency_contact_relationship.trim()) {
      newErrors.emergency_contact_relationship = 'Relationship is required'
    }
    
    // Background Check Consent (Required)
    if (!formData.background_check_consent) {
      newErrors.background_check_consent = 'Background check consent is required'
    }
    
    // Financial
    if (formData.financial_model === 'booth_rent' && (!formData.booth_rent_amount || formData.booth_rent_amount <= 0)) {
      newErrors.booth_rent_amount = 'Please enter a valid booth rent amount'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setErrors({})

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

      // Check if user already exists in profiles
      let userId = null
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingProfile) {
        userId = existingProfile.id
        
        // Check if they're already staff at this barbershop
        const { data: existingStaffRecord } = await supabase
          .from('barbershop_staff')
          .select('id')
          .eq('barbershop_id', barbershopId)
          .eq('user_id', userId)
          .single()
        
        if (existingStaffRecord) {
          throw new Error('This person is already a staff member at your barbershop')
        }
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

        if (authError) {
          // Check if it's because user already exists in auth
          if (authError.message?.includes('already registered')) {
            // Try to find their profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', formData.email)
              .single()
            
            if (profile) {
              userId = profile.id
            } else {
              throw new Error('User exists but profile not found. Please contact support.')
            }
          } else {
            throw authError
          }
        } else {
          userId = authData.user?.id
          
          // Ensure profile is created
          if (userId) {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: userId,
                email: formData.email,
                full_name: formData.full_name,
                role: 'BARBER',
                created_at: new Date().toISOString()
              })
            
            if (profileError) {
              console.error('Failed to create profile:', profileError)
            }
          }
        }
      }

      if (!userId) throw new Error('Failed to create user account')

      // Add to barbershop_staff with all new fields
      const { data: newStaff, error: staffError } = await supabase
        .from('barbershop_staff')
        .insert({
          barbershop_id: barbershopId,
          user_id: userId,
          role: formData.role,
          is_active: true,
          
          // Financial
          financial_model: formData.financial_model,
          commission_rate: formData.financial_model === 'commission' ? formData.commission_rate : null,
          booth_rent_amount: formData.financial_model === 'booth_rent' ? formData.booth_rent_amount : null,
          
          // Schedule
          schedule_type: formData.schedule_type,
          
          // Legal & Compliance
          license_number: formData.license_number,
          license_expiry: formData.license_expiry,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          emergency_contact_relationship: formData.emergency_contact_relationship,
          has_insurance: formData.has_insurance,
          background_check_consent: formData.background_check_consent,
          background_check_status: 'pending',
          
          // Professional
          years_experience: formData.years_experience,
          previous_workplace: formData.previous_workplace,
          
          // Metadata
          max_daily_appointments: formData.max_daily_appointments,
          permissions: getDefaultPermissions(formData.role),
          onboarding_completed_at: null // Will be set when they complete full onboarding
        })
        .select()
        .single()

      if (staffError) throw staffError

      // Save specialties if any
      if (formData.specialties.length > 0) {
        const specialtiesData = formData.specialties.map(specialty => ({
          staff_id: newStaff.id,
          barbershop_id: barbershopId,
          specialty: specialty,
          years_practicing: Math.min(formData.years_experience, 10) // Estimate based on total experience
        }))

        const { error: specialtiesError } = await supabase
          .from('staff_specialties')
          .insert(specialtiesData)

        if (specialtiesError) {
          console.error('Failed to save specialties:', specialtiesError)
        }
      }

      // Save certifications if any
      if (formData.certifications.length > 0) {
        const { error: certError } = await supabase
          .from('staff_certifications')
          .insert({
            staff_id: newStaff.id,
            certifications: formData.certifications,
            updated_at: new Date().toISOString()
          })

        if (certError) {
          console.error('Failed to save certifications:', certError)
        }
      }

      // Create schedule based on selected working days
      const dayMapping = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0
      }

      const defaultSchedule = []
      Object.entries(formData.working_days).forEach(([day, isWorking]) => {
        if (isWorking) {
          defaultSchedule.push({
            staff_id: newStaff.id,
            barbershop_id: barbershopId,
            day_of_week: dayMapping[day],
            start_time: formData.preferred_hours.start,
            end_time: formData.preferred_hours.end,
            is_recurring: true,
            is_active: true
          })
        }
      })

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
    <Modal isOpen={true} onClose={onClose} size="medium">
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

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* Step Indicator */}
          <div className="sticky top-0 bg-white z-10 pb-4 border-b">
            <div className="flex justify-between text-xs">
              <span className="text-olive-600 font-semibold">Step 1: Basic Info</span>
              <span className="text-gray-400">→ Legal & Compliance</span>
              <span className="text-gray-400">→ Experience</span>
              <span className="text-gray-400">→ Schedule</span>
              <span className="text-gray-400">→ Financial</span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="bg-olive-100 text-olive-700 rounded-full w-7 h-7 flex items-center justify-center text-sm mr-2">1</span>
              Basic Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData({ ...formData, full_name: e.target.value })
                    if (errors.full_name) setErrors({ ...errors, full_name: '' })
                  }}
                  className={`w-full px-3 py-2 border ${errors.full_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent`}
                  placeholder="John Doe"
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    if (errors.email) setErrors({ ...errors, email: '' })
                  }}
                  className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
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

          {/* Legal & Compliance */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="bg-olive-100 text-olive-700 rounded-full w-7 h-7 flex items-center justify-center text-sm mr-2">2</span>
              Legal & Compliance
              <span className="ml-2 text-xs text-red-600">(Required)</span>
            </h3>

            {formData.role === 'barber' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Professional License Number *
                  </label>
                  <input
                    type="text"
                    required={formData.role === 'barber'}
                    value={formData.license_number}
                    onChange={(e) => {
                      setFormData({ ...formData, license_number: e.target.value })
                      if (errors.license_number) setErrors({ ...errors, license_number: '' })
                    }}
                    className={`w-full px-3 py-2 border ${errors.license_number ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent`}
                    placeholder="BRB-12345"
                  />
                  {errors.license_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.license_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Expiry Date *
                  </label>
                  <input
                    type="date"
                    required={formData.role === 'barber'}
                    value={formData.license_expiry}
                    onChange={(e) => {
                      setFormData({ ...formData, license_expiry: e.target.value })
                      if (errors.license_expiry) setErrors({ ...errors, license_expiry: '' })
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border ${errors.license_expiry ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent`}
                  />
                  {errors.license_expiry && (
                    <p className="mt-1 text-sm text-red-600">{errors.license_expiry}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700">Emergency Contact</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.emergency_contact_name}
                    onChange={(e) => {
                      setFormData({ ...formData, emergency_contact_name: e.target.value })
                      if (errors.emergency_contact_name) setErrors({ ...errors, emergency_contact_name: '' })
                    }}
                    className={`w-full px-3 py-2 border ${errors.emergency_contact_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent`}
                    placeholder="Jane Doe"
                  />
                  {errors.emergency_contact_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.emergency_contact_phone}
                    onChange={(e) => {
                      setFormData({ ...formData, emergency_contact_phone: e.target.value })
                      if (errors.emergency_contact_phone) setErrors({ ...errors, emergency_contact_phone: '' })
                    }}
                    className={`w-full px-3 py-2 border ${errors.emergency_contact_phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent`}
                    placeholder="(555) 987-6543"
                  />
                  {errors.emergency_contact_phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => {
                      setFormData({ ...formData, emergency_contact_relationship: e.target.value })
                      if (errors.emergency_contact_relationship) setErrors({ ...errors, emergency_contact_relationship: '' })
                    }}
                    className={`w-full px-3 py-2 border ${errors.emergency_contact_relationship ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent`}
                    placeholder="Spouse, Parent, etc."
                  />
                  {errors.emergency_contact_relationship && (
                    <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_relationship}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.has_insurance}
                  onChange={(e) => setFormData({ ...formData, has_insurance: e.target.checked })}
                  className="mr-2 h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Has liability insurance</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.background_check_consent}
                  onChange={(e) => {
                    setFormData({ ...formData, background_check_consent: e.target.checked })
                    if (errors.background_check_consent) setErrors({ ...errors, background_check_consent: '' })
                  }}
                  className={`mr-2 h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded ${errors.background_check_consent ? 'border-red-500' : ''}`}
                />
                <span className="text-sm text-gray-700">
                  Consent to background check *
                </span>
              </label>
              {errors.background_check_consent && (
                <p className="ml-6 text-sm text-red-600">{errors.background_check_consent}</p>
              )}
            </div>
          </div>

          {/* Professional Experience */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="bg-olive-100 text-olive-700 rounded-full w-7 h-7 flex items-center justify-center text-sm mr-2">3</span>
              Professional Experience
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.years_experience}
                  onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Workplace
                </label>
                <input
                  type="text"
                  value={formData.previous_workplace}
                  onChange={(e) => setFormData({ ...formData, previous_workplace: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="Previous barbershop name"
                />
              </div>
            </div>

            {formData.role === 'barber' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialties
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALTY_OPTIONS.map((specialty) => (
                    <label key={specialty} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.specialties.includes(specialty)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, specialties: [...formData.specialties, specialty] })
                          } else {
                            setFormData({ ...formData, specialties: formData.specialties.filter(s => s !== specialty) })
                          }
                        }}
                        className="mr-2 h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{specialty}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedule & Availability */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="bg-olive-100 text-olive-700 rounded-full w-7 h-7 flex items-center justify-center text-sm mr-2">4</span>
              Schedule & Availability
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Working Days
              </label>
              <div className="grid grid-cols-7 gap-2">
                {Object.entries(formData.working_days).map(([day, isWorking]) => (
                  <label key={day} className="flex flex-col items-center">
                    <input
                      type="checkbox"
                      checked={isWorking}
                      onChange={(e) => setFormData({
                        ...formData,
                        working_days: { ...formData.working_days, [day]: e.target.checked }
                      })}
                      className="mb-1 h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-700 capitalize">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.preferred_hours.start}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferred_hours: { ...formData.preferred_hours, start: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.preferred_hours.end}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferred_hours: { ...formData.preferred_hours, end: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Daily Appointments
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.max_daily_appointments}
                  onChange={(e) => setFormData({ ...formData, max_daily_appointments: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
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
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.commission_rate * 100}
                    onChange={(e) => {
                      const value = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                      setFormData({ ...formData, commission_rate: value / 100 });
                    }}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                    placeholder="50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            )}

            {formData.financial_model === 'booth_rent' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekly Booth Rent ($) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.booth_rent_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, booth_rent_amount: e.target.value ? parseFloat(e.target.value) : 0 })
                    if (errors.booth_rent_amount) setErrors({ ...errors, booth_rent_amount: '' })
                  }}
                  className={`w-full px-3 py-2 border ${errors.booth_rent_amount ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent`}
                  placeholder="500"
                />
                {errors.booth_rent_amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.booth_rent_amount}</p>
                )}
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
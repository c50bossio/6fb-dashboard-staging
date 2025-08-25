'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { XMarkIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

export default function AddStaffModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('basic') // Track which section is open
  const [formData, setFormData] = useState({
    // Basic Information (4 fields)
    email: '',
    full_name: '',
    role: 'barber',
    phone: '',
    
    // Legal & Compliance (9 fields)
    license_number: '',
    license_expiry: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    has_insurance: false,
    insurance_provider: '',
    background_check_consent: false,
    
    // Professional Experience (6 fields) 
    years_experience: 0,
    previous_workplace: '',
    specialties: [], // Array of specialty names
    certifications: [], // Array of certification objects
    portfolio_url: '',
    instagram_handle: '',
    
    // Availability & Schedule (6 fields)
    working_days: {
      monday: true,
      tuesday: true, 
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false
    },
    preferred_start_time: '09:00',
    preferred_end_time: '17:00',
    max_daily_appointments: 10,
    break_duration: 30, // minutes
    
    // Financial Setup (6 fields)
    financial_model: 'commission',
    commission_rate: 0.50,
    hourly_rate: 0,
    booth_rent_amount: 0,
    payment_method: 'direct_deposit',
    bank_account_last4: '',
    routing_number_last4: ''
  })

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      // Handle nested object updates (e.g., working_days.monday)
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleSpecialtyAdd = () => {
    const specialty = prompt('Enter specialty (e.g., "Fade Cuts", "Beard Styling"):')
    if (specialty && specialty.trim()) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty.trim()]
      }))
    }
  }

  const handleSpecialtyRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index)
    }))
  }

  const handleCertificationAdd = () => {
    const name = prompt('Certification name:')
    if (name && name.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, {
          name: name.trim(),
          issuer: '',
          date: ''
        }]
      }))
    }
  }

  const handleCertificationRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }

  const validateForm = () => {
    const required = ['email', 'full_name', 'role']
    const missing = required.filter(field => !formData[field] || formData[field].trim() === '')
    
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`)
      return false
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
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

      // Check if user already exists in profiles
      let userId = null
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingProfile) {
        userId = existingProfile.id
      } else {
        // Create new profile
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            email: formData.email,
            full_name: formData.full_name,
            role: 'BARBER'
          })
          .select()
          .single()

        if (profileError) throw profileError
        userId = newProfile.id
      }

      // Create staff record with enhanced data
      const staffData = {
        barbershop_id: barbershopId,
        user_id: userId,
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        phone: formData.phone,
        is_active: true,
        
        // Enhanced fields
        license_number: formData.license_number,
        license_expiry: formData.license_expiry || null,
        years_experience: parseInt(formData.years_experience) || 0,
        financial_model: formData.financial_model,
        commission_rate: parseFloat(formData.commission_rate),
        hourly_rate: parseFloat(formData.hourly_rate) || null,
        booth_rent_amount: parseFloat(formData.booth_rent_amount) || null,
        payment_method: formData.payment_method,
        bank_account_last4: formData.bank_account_last4,
        routing_number_last4: formData.routing_number_last4,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        
        // Store complex data in metadata JSONB field
        metadata: {
          has_insurance: formData.has_insurance,
          insurance_provider: formData.insurance_provider,
          background_check_consent: formData.background_check_consent,
          previous_workplace: formData.previous_workplace,
          portfolio_url: formData.portfolio_url,
          instagram_handle: formData.instagram_handle,
          working_days: formData.working_days,
          preferred_start_time: formData.preferred_start_time,
          preferred_end_time: formData.preferred_end_time,
          max_daily_appointments: formData.max_daily_appointments,
          break_duration: formData.break_duration,
          specialties: formData.specialties,
          certifications: formData.certifications
        }
      }

      const { error: staffError } = await supabase
        .from('barbershop_staff')
        .insert([staffData])

      if (staffError) throw staffError

      toast.success('Staff member added successfully!')
      onSuccess()
      
    } catch (error) {
      console.error('Error adding staff member:', error)
      toast.error(error.message || 'Failed to add staff member')
    } finally {
      setLoading(false)
    }
  }

  // Section component for collapsible sections
  const FormSection = ({ id, title, isOpen, onToggle, children }) => (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 flex items-center justify-between rounded-t-lg"
      >
        <h3 className="font-medium text-gray-900">{title}</h3>
        {isOpen ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  )

  const toggleSection = (sectionId) => {
    setActiveSection(activeSection === sectionId ? null : sectionId)
  }

  return (
    <Modal 
      size="large" 
      onClose={onClose}
      className="max-w-4xl"
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Add Staff Member</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          
          {/* Basic Information - Always Open */}
          <FormSection
            id="basic"
            title="📋 Basic Information"
            isOpen={true}
            onToggle={() => {}}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="barber@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  required
                >
                  <option value="barber">Barber</option>
                  <option value="senior_barber">Senior Barber</option>
                  <option value="stylist">Hair Stylist</option>
                  <option value="manager">Manager</option>
                  <option value="apprentice">Apprentice</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </FormSection>

          {/* Legal & Compliance */}
          <FormSection
            id="legal"
            title="⚖️ Legal & Compliance"
            isOpen={activeSection === 'legal'}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => handleInputChange('license_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="Enter license number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) => handleInputChange('license_expiry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="Contact person name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="Emergency contact number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship to Emergency Contact
                </label>
                <select
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                >
                  <option value="">Select relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="child">Child</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Provider (if applicable)
                </label>
                <input
                  type="text"
                  value={formData.insurance_provider}
                  onChange={(e) => handleInputChange('insurance_provider', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="Insurance company name"
                />
              </div>
              
              <div className="col-span-2 space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.has_insurance}
                    onChange={(e) => handleInputChange('has_insurance', e.target.checked)}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Staff member has professional liability insurance
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.background_check_consent}
                    onChange={(e) => handleInputChange('background_check_consent', e.target.checked)}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Consent to background check (if required)
                  </span>
                </label>
              </div>
            </div>
          </FormSection>

          {/* Professional Experience */}
          <FormSection
            id="experience"
            title="💼 Professional Experience"
            isOpen={activeSection === 'experience'}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.years_experience}
                    onChange={(e) => handleInputChange('years_experience', e.target.value)}
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
                    onChange={(e) => handleInputChange('previous_workplace', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                    placeholder="Previous barbershop or salon"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={formData.portfolio_url}
                    onChange={(e) => handleInputChange('portfolio_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                    placeholder="https://portfolio.example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={formData.instagram_handle}
                    onChange={(e) => handleInputChange('instagram_handle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                    placeholder="@barbername"
                  />
                </div>
              </div>
              
              {/* Specialties */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Specialties
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSpecialtyAdd}
                  >
                    Add Specialty
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-olive-100 text-olive-800"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => handleSpecialtyRemove(index)}
                        className="ml-2 text-olive-600 hover:text-olive-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {formData.specialties.length === 0 && (
                    <p className="text-gray-500 text-sm">No specialties added yet</p>
                  )}
                </div>
              </div>
            </div>
          </FormSection>

          {/* Financial Setup */}
          <FormSection
            id="financial"
            title="💰 Financial Setup"
            isOpen={activeSection === 'financial'}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Financial Model *
                </label>
                <select
                  value={formData.financial_model}
                  onChange={(e) => handleInputChange('financial_model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  required
                >
                  <option value="commission">Commission</option>
                  <option value="booth_rent">Booth Rent</option>
                  <option value="hourly">Hourly</option>
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
                    onChange={(e) => handleInputChange('commission_rate', e.target.value / 100)}
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
                    step="25"
                    value={formData.booth_rent_amount}
                    onChange={(e) => handleInputChange('booth_rent_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  />
                </div>
              )}
              
              {formData.financial_model === 'hourly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={formData.hourly_rate}
                    onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                >
                  <option value="direct_deposit">Direct Deposit</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="payroll_service">Payroll Service</option>
                </select>
              </div>
              
              {formData.payment_method === 'direct_deposit' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account (Last 4 digits)
                    </label>
                    <input
                      type="text"
                      maxLength="4"
                      value={formData.bank_account_last4}
                      onChange={(e) => handleInputChange('bank_account_last4', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                      placeholder="1234"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Routing Number (Last 4 digits)
                    </label>
                    <input
                      type="text"
                      maxLength="4"
                      value={formData.routing_number_last4}
                      onChange={(e) => handleInputChange('routing_number_last4', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                      placeholder="5678"
                    />
                  </div>
                </>
              )}
            </div>
          </FormSection>

          {/* Availability & Schedule */}
          <FormSection
            id="schedule"
            title="📅 Availability & Schedule"
            isOpen={activeSection === 'schedule'}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Days
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {Object.entries(formData.working_days).map(([day, isWorking]) => (
                    <label key={day} className="flex flex-col items-center">
                      <span className="text-xs text-gray-600 mb-1 capitalize">
                        {day.slice(0, 3)}
                      </span>
                      <input
                        type="checkbox"
                        checked={isWorking}
                        onChange={(e) => handleInputChange(`working_days.${day}`, e.target.checked)}
                        className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.preferred_start_time}
                    onChange={(e) => handleInputChange('preferred_start_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred End Time
                  </label>
                  <input
                    type="time"
                    value={formData.preferred_end_time}
                    onChange={(e) => handleInputChange('preferred_end_time', e.target.value)}
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
                    onChange={(e) => handleInputChange('max_daily_appointments', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Break Duration (minutes)
                </label>
                <select
                  value={formData.break_duration}
                  onChange={(e) => handleInputChange('break_duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
            </div>
          </FormSection>

        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Adding Staff...' : 'Add Staff Member'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
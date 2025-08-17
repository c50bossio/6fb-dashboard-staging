'use client'

import { useState, useEffect } from 'react'
import {
  UserPlusIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ScissorsIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  StarIcon,
  CalendarIcon,
  PhotoIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'

export default function StaffSetup({ data = {}, updateData, onComplete }) {
  const [staff, setStaff] = useState(data.staff || [])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'barber',
    specialty: '',
    experience: 1,
    chairNumber: '',
    bio: '',
    certifications: [],
    languages: ['English'],
    availability: 'full_time',
    instagram: '',
    profileImage: ''
  })
  const [errors, setErrors] = useState({})
  const [uploadingImage, setUploadingImage] = useState(false)

  // Role options with color codes instead of emojis
  const roleOptions = [
    { value: 'barber', label: 'Barber', color: 'blue' },
    { value: 'stylist', label: 'Hair Stylist', color: 'pink' },
    { value: 'colorist', label: 'Colorist', color: 'purple' },
    { value: 'manager', label: 'Manager', color: 'gray' },
    { value: 'receptionist', label: 'Receptionist', color: 'green' },
    { value: 'apprentice', label: 'Apprentice', color: 'amber' }
  ]

  // Specialty options
  const specialtyOptions = [
    'Classic Cuts',
    'Fades & Tapers',
    'Beard Grooming',
    'Hair Design',
    'Kids Cuts',
    'Long Hair',
    'Curly Hair',
    'Color Services',
    'Hair Treatments',
    'Shaves'
  ]

  // Language options
  const languageOptions = [
    'English',
    'Spanish',
    'French',
    'Mandarin',
    'Arabic',
    'Portuguese',
    'Russian',
    'Japanese',
    'Korean',
    'Vietnamese'
  ]

  // Availability options
  const availabilityOptions = [
    { value: 'full_time', label: 'Full Time', description: '40+ hours/week' },
    { value: 'part_time', label: 'Part Time', description: '20-39 hours/week' },
    { value: 'weekends', label: 'Weekends Only', description: 'Sat & Sun' },
    { value: 'flexible', label: 'Flexible', description: 'Varies by week' }
  ]

  // Validation
  const validateField = (name, value) => {
    switch (name) {
      case 'firstName':
        if (!value || value.length < 2) {
          return 'First name must be at least 2 characters'
        }
        break
      case 'lastName':
        if (!value || value.length < 2) {
          return 'Last name must be at least 2 characters'
        }
        break
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address'
        }
        break
      case 'phone':
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
        if (value && !phoneRegex.test(value.replace(/\D/g, ''))) {
          return 'Please enter a valid phone number'
        }
        break
    }
    return null
  }

  // Format phone number
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  // Handle input changes
  const handleChange = (name, value) => {
    if (name === 'phone') {
      value = formatPhoneNumber(value)
    }
    
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Validate
    const error = validateField(name, value)
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle profile image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, profileImage: 'Please select a valid image file' }))
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, profileImage: 'Image size should be less than 5MB' }))
        return
      }
      
      setUploadingImage(true)
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.profileImage
        return newErrors
      })
      
      try {
        // Upload to Supabase Storage
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        
        const response = await fetch('/api/upload/staff-photo', {
          method: 'POST',
          body: uploadFormData
        })
        
        if (response.ok) {
          const { url } = await response.json()
          setFormData(prev => ({ ...prev, profileImage: url }))
        } else {
          const error = await response.json()
          console.error('Upload failed:', error)
          setErrors(prev => ({ ...prev, profileImage: error.error || 'Failed to upload image' }))
          
          // Fallback to base64 if upload fails
          const reader = new FileReader()
          reader.onload = (e) => {
            setFormData(prev => ({ ...prev, profileImage: e.target.result }))
          }
          reader.readAsDataURL(file)
        }
      } catch (error) {
        console.error('Error uploading image:', error)
        setErrors(prev => ({ ...prev, profileImage: 'Network error during upload' }))
        
        // Fallback to base64 if network error
        const reader = new FileReader()
        reader.onload = (e) => {
          setFormData(prev => ({ ...prev, profileImage: e.target.result }))
        }
        reader.readAsDataURL(file)
      } finally {
        setUploadingImage(false)
      }
    }
  }

  // Remove profile image
  const removeProfileImage = () => {
    setFormData(prev => ({ ...prev, profileImage: '' }))
  }

  // Add or update staff member
  const handleSaveStaff = () => {
    // Validate required fields
    const newErrors = {}
    if (!formData.firstName) newErrors.firstName = 'First name is required'
    if (!formData.lastName) newErrors.lastName = 'Last name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    
    
    // Check for existing validation errors
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key])
      if (error) newErrors[key] = error
    })
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    if (editingId) {
      // Update existing staff member
      setStaff(prev => prev.map(member => 
        member.id === editingId 
          ? { ...formData, id: editingId, name: `${formData.firstName} ${formData.lastName}` }
          : member
      ))
    } else {
      // Add new staff member
      const newMember = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`, // Combined for display
        id: Date.now().toString(),
        addedAt: new Date().toISOString()
      }
      setStaff(prev => [...prev, newMember])
    }
    
    // Reset form
    resetForm()
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'barber',
      specialty: '',
      experience: 1,
      chairNumber: '',
      bio: '',
      certifications: [],
      languages: ['English'],
      availability: 'full_time',
      instagram: '',
      profileImage: ''
    })
    setErrors({})
    setShowAddForm(false)
    setEditingId(null)
  }

  // Edit staff member
  const handleEdit = (member) => {
    // Split existing name into first and last name for editing
    const nameParts = member.name ? member.name.split(' ') : ['', '']
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || '' // Handle names with multiple parts
    
    setFormData({
      ...member,
      firstName,
      lastName
    })
    setEditingId(member.id)
    setShowAddForm(true)
  }

  // Delete staff member
  const handleDelete = (id) => {
    setStaff(prev => prev.filter(member => member.id !== id))
  }

  // Toggle language selection
  const toggleLanguage = (language) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }))
  }

  // Update parent data
  useEffect(() => {
    if (updateData) {
      updateData({ staff })
    }
  }, [staff])

  // Handle completion
  const handleComplete = () => {
    if (onComplete) {
      onComplete({ staff })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
        <p className="text-sm text-gray-600 mt-1">
          Add your barbers and staff members. You can always add more later.
        </p>
      </div>

      {/* Staff List */}
      {staff.length > 0 && (
        <div className="space-y-3">
          {staff.map((member) => {
            const role = roleOptions.find(r => r.value === member.role)
            return (
              <div
                key={member.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {member.profileImage ? (
                        <img
                          src={member.profileImage}
                          alt={`${member.name}'s profile`}
                          className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center border-2 border-gray-200">
                          <UserIcon className="h-6 w-6 text-brand-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{member.name}</h4>
                      <p className="text-sm text-gray-600">{role?.label || member.role}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-500 flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {member.email}
                        </p>
                        {member.phone && (
                          <p className="text-sm text-gray-500 flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            {member.phone}
                          </p>
                        )}
                        {member.specialty && (
                          <p className="text-sm text-gray-500 flex items-center">
                            <ScissorsIcon className="h-4 w-4 mr-1" />
                            {member.specialty}
                          </p>
                        )}
                      </div>
                      {member.languages.length > 1 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {member.languages.map(lang => (
                            <span
                              key={lang}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(member)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm ? (
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h4 className="font-medium text-gray-900">
            {editingId ? 'Edit Team Member' : 'Add Team Member'}
          </h4>

          {/* Profile Photo Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Profile Photo
            </label>
            <div className="flex items-center space-x-4">
              {/* Photo Preview */}
              <div className="flex-shrink-0">
                {formData.profileImage ? (
                  <div className="relative">
                    <img
                      src={formData.profileImage}
                      alt="Profile preview"
                      className="h-20 w-20 rounded-full object-cover border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={removeProfileImage}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      title="Remove photo"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <PhotoIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="profileImage"
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
                      uploadingImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {uploadingImage ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                        {formData.profileImage ? 'Change Photo' : 'Upload Photo'}
                      </>
                    )}
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Recommended: Square image, at least 200x200px. Max 5MB.
                </p>
                {errors.profileImage && (
                  <p className="mt-1 text-sm text-red-600">{errors.profileImage}</p>
                )}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.firstName
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-brand-500'
                }`}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.lastName
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-brand-500'
                }`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-brand-500'
                }`}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.phone
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-brand-500'
                }`}
                placeholder="(555) 123-4567"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {roleOptions.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Professional Information (for barbers/stylists) */}
          {(formData.role === 'barber' || formData.role === 'stylist' || formData.role === 'colorist') && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialty
                  </label>
                  <select
                    value={formData.specialty}
                    onChange={(e) => handleChange('specialty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select a specialty</option>
                    {specialtyOptions.map(specialty => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    value={formData.experience}
                    onChange={(e) => handleChange('experience', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    min="0"
                    max="50"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chair/Station Number
                  </label>
                  <input
                    type="text"
                    value={formData.chairNumber}
                    onChange={(e) => handleChange('chairNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g., Chair 1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio (Optional)
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  rows="2"
                  placeholder="Brief description for booking page..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram Handle (Optional)
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="@johndoe"
                />
              </div>
            </>
          )}

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Availability
            </label>
            <div className="grid grid-cols-2 gap-3">
              {availabilityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('availability', option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    formData.availability === option.value
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Languages Spoken
            </label>
            <div className="flex flex-wrap gap-2">
              {languageOptions.map(language => (
                <button
                  key={language}
                  type="button"
                  onClick={() => toggleLanguage(language)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    formData.languages.includes(language)
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveStaff}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              {editingId ? 'Update' : 'Add'} Team Member
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center text-gray-600 hover:text-gray-700"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add Team Member
        </button>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">
              Team Management Tips
            </h3>
            <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
              <li>You can add team members later from your dashboard</li>
              <li>Staff will receive an invitation email to set up their account</li>
              <li>Payment structures will be configured in the next step</li>
              <li>Each barber will have their own booking page</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className="flex justify-center items-center pt-4">
        <div className="text-sm text-gray-500">
          {staff.length} team member{staff.length !== 1 ? 's' : ''} added
        </div>
      </div>
    </div>
  )
}
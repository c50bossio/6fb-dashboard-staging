'use client'

import { useState, useRef } from 'react'
import { UserCircleIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { validateEmail, validatePhone, validateLength, validateSpecialties } from '@/lib/form-validation'

/**
 * Step 1: Basic Information
 * Collects staff member's personal details, bio, and profile photo
 */
export default function OnboardingStep1BasicInfo({ data, onChange, onNext, onBack }) {
  const [errors, setErrors] = useState({})
  const [photoPreview, setPhotoPreview] = useState(data.photoUrl || null)
  const fileInputRef = useRef(null)

  const handleChange = (field, value) => {
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }

    onChange({ [field]: value })
  }

  const handleSpecialtiesChange = (value) => {
    // Split by comma, trim, filter empty
    const specialties = value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    onChange({ specialties, specialtiesInput: value })
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, photo: 'Please select an image file' }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'Image must be less than 5MB' }))
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result)
    }
    reader.readAsDataURL(file)

    onChange({ photo: file, photoUrl: null })
    setErrors(prev => ({ ...prev, photo: null }))
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    onChange({ photo: null, photoUrl: null })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Required fields
    const firstNameValidation = validateLength(data.firstName, 2, 50, 'First name')
    if (!firstNameValidation.valid) {
      newErrors.firstName = firstNameValidation.error
    }

    const lastNameValidation = validateLength(data.lastName, 2, 50, 'Last name')
    if (!lastNameValidation.valid) {
      newErrors.lastName = lastNameValidation.error
    }

    const emailValidation = validateEmail(data.email)
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error
    }

    // Optional phone validation
    if (data.phone) {
      const phoneValidation = validatePhone(data.phone)
      if (!phoneValidation.valid) {
        newErrors.phone = phoneValidation.error
      }
    }

    // Optional bio validation
    if (data.bio) {
      const bioValidation = validateLength(data.bio, 0, 500, 'Bio')
      if (!bioValidation.valid) {
        newErrors.bio = bioValidation.error
      }
    }

    // Specialties validation
    if (data.specialties && data.specialties.length > 0) {
      const specialtiesValidation = validateSpecialties(data.specialties)
      if (!specialtiesValidation.valid) {
        newErrors.specialties = specialtiesValidation.error
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
        <p className="text-gray-600 mt-1">Let's start with the basics about your new team member</p>
      </div>

      {/* Profile Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Profile Photo (Optional)
        </label>
        <div className="flex items-center space-x-4">
          {/* Photo Preview */}
          <div className="flex-shrink-0">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile preview"
                className="h-24 w-24 rounded-full object-cover border-2 border-gray-300"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                <UserCircleIcon className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              id="photo-upload"
            />
            <div className="flex space-x-2">
              <label
                htmlFor="photo-upload"
                className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center"
              >
                <PhotoIcon className="h-5 w-5 mr-2" />
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-4 py-2 bg-white border border-red-300 rounded-lg hover:bg-red-50 text-sm font-medium text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            {errors.photo && (
              <p className="text-red-600 text-sm mt-1">{errors.photo}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG, or WebP. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            value={data.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.firstName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            value={data.lastName || ''}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.lastName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Smith"
          />
          {errors.lastName && (
            <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Contact Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={data.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="john.smith@example.com"
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            id="phone"
            value={data.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="+1-555-123-4567"
          />
          {errors.phone && (
            <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Format: +1-555-123-4567
          </p>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          Bio (Optional)
        </label>
        <textarea
          id="bio"
          value={data.bio || ''}
          onChange={(e) => handleChange('bio', e.target.value)}
          rows={4}
          maxLength={500}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
            errors.bio ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Specialist in fades and beard trims with 5+ years of experience..."
        />
        <div className="flex justify-between items-center mt-1">
          {errors.bio ? (
            <p className="text-red-600 text-sm">{errors.bio}</p>
          ) : (
            <p className="text-xs text-gray-500">
              Tell customers what makes this barber special
            </p>
          )}
          <p className="text-xs text-gray-500">
            {(data.bio || '').length}/500
          </p>
        </div>
      </div>

      {/* Specialties */}
      <div>
        <label htmlFor="specialties" className="block text-sm font-medium text-gray-700 mb-1">
          Specialties (Optional)
        </label>
        <input
          type="text"
          id="specialties"
          value={data.specialtiesInput || ''}
          onChange={(e) => handleSpecialtiesChange(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 ${
            errors.specialties ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Fades, Beard Trims, Hot Towel Shaves"
        />
        {errors.specialties ? (
          <p className="text-red-600 text-sm mt-1">{errors.specialties}</p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Separate specialties with commas. Max 10 items, 50 characters each.
          </p>
        )}

        {/* Specialty Tags Preview */}
        {data.specialties && data.specialties.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {data.specialties.map((specialty, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-olive-100 text-olive-800"
              >
                {specialty}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2 text-white bg-olive-600 rounded-lg hover:bg-olive-700 focus:ring-4 focus:ring-olive-200"
        >
          Continue to Services
        </button>
      </div>
    </div>
  )
}

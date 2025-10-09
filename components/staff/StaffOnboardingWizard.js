'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useWizardState, createStep } from '@/lib/use-wizard-state'

// Step Components
import OnboardingStep1BasicInfo from './OnboardingStep1BasicInfo'
import OnboardingStep2Services from './OnboardingStep2Services'
import OnboardingStep3Financial from './OnboardingStep3Financial'
import OnboardingStep4Review from './OnboardingStep4Review'

/**
 * Staff Onboarding Wizard
 * Main orchestrator for the 4-step onboarding process
 */
export default function StaffOnboardingWizard({ onComplete }) {
  const router = useRouter()
  const [apiError, setApiError] = useState(null)

  // Define wizard steps with validation
  const steps = [
    createStep(
      'Basic Info',
      'Name, email, and bio',
      (data) => data.firstName && data.lastName && data.email,
      OnboardingStep1BasicInfo
    ),
    createStep(
      'Services',
      'Assign services',
      (data) => data.selectedServices && data.selectedServices.length > 0,
      OnboardingStep2Services
    ),
    createStep(
      'Financials',
      'Commission & rent',
      (data) => {
        if (!data.financialModel) return false
        if (data.financialModel === 'commission') {
          return data.commissionPercentage >= 0 && data.commissionPercentage <= 100
        }
        if (data.financialModel === 'booth_rent') {
          return data.boothRentAmount > 0 && data.boothRentFrequency
        }
        return false
      },
      OnboardingStep3Financial
    ),
    createStep(
      'Review',
      'Generate booking link',
      (data) => data.bookingSlug && data.bookingSlug.length >= 3,
      OnboardingStep4Review
    ),
  ]

  // Initialize wizard state
  const wizard = useWizardState(
    {
      // Step 1 - Basic Info
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      bio: '',
      specialties: [],
      specialtiesInput: '',
      photo: null,
      photoUrl: null,

      // Step 2 - Services
      selectedServices: [],

      // Step 3 - Financials
      financialModel: null, // 'commission' | 'booth_rent'
      commissionPercentage: 60,
      boothRentAmount: 0,
      boothRentFrequency: null, // 'weekly' | 'monthly'

      // Step 4 - Review
      bookingSlug: '',
    },
    0,
    steps
  )

  const handleComplete = async () => {
    wizard.setLoadingState(true)
    wizard.clearError()
    setApiError(null)

    try {
      // Prepare staff member data for API
      const formData = new FormData()

      // Basic Info
      formData.append('first_name', wizard.wizardData.firstName)
      formData.append('last_name', wizard.wizardData.lastName)
      formData.append('email', wizard.wizardData.email)
      if (wizard.wizardData.phone) {
        formData.append('phone', wizard.wizardData.phone)
      }
      if (wizard.wizardData.bio) {
        formData.append('bio', wizard.wizardData.bio)
      }
      if (wizard.wizardData.specialties && wizard.wizardData.specialties.length > 0) {
        formData.append('specialties', JSON.stringify(wizard.wizardData.specialties))
      }
      if (wizard.wizardData.photo) {
        formData.append('photo', wizard.wizardData.photo)
      }

      // Services
      formData.append('service_ids', JSON.stringify(wizard.wizardData.selectedServices))

      // Financial
      formData.append('financial_model', wizard.wizardData.financialModel)
      if (wizard.wizardData.financialModel === 'commission') {
        formData.append('commission_percentage', wizard.wizardData.commissionPercentage)
      } else if (wizard.wizardData.financialModel === 'booth_rent') {
        formData.append('booth_rent_amount', wizard.wizardData.boothRentAmount)
        formData.append('booth_rent_frequency', wizard.wizardData.boothRentFrequency)
      }

      // Booking slug
      formData.append('booking_slug', wizard.wizardData.bookingSlug)

      // Role
      formData.append('role', 'BARBER')

      // Create staff member via API
      const response = await fetch('/api/admin/staff/create', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create staff member')
      }

      // Success - call completion handler
      if (onComplete) {
        onComplete(result.staff)
      }

      // Redirect to staff management page
      router.push(`/admin/staff?success=true&name=${wizard.wizardData.firstName}`)
    } catch (err) {
      console.error('Onboarding error:', err)
      setApiError(err.message)
      wizard.setErrorState(err.message)
    } finally {
      wizard.setLoadingState(false)
    }
  }

  // Get current step component
  const CurrentStepComponent = steps[wizard.currentStep].component

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Team Member</h1>
        <p className="text-gray-600 mt-2">
          Complete the steps below to onboard a new barber to your team
        </p>
      </div>

      {/* Progress Indicator */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => (
            <li key={index} className="relative flex-1">
              <div className="flex items-center">
                {/* Connector Line (except for last step) */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-5 left-1/2 -ml-px w-full h-0.5 ${
                      wizard.currentStep > index ? 'bg-olive-600' : 'bg-gray-300'
                    }`}
                    style={{ left: '50%', width: 'calc(100% - 2.5rem)' }}
                  />
                )}

                {/* Step Circle */}
                <button
                  type="button"
                  onClick={() => wizard.goToStep(index)}
                  disabled={index > wizard.currentStep && !wizard.isStepCompleted(index)}
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
                    wizard.currentStep === index
                      ? 'bg-olive-600 text-white ring-4 ring-olive-100'
                      : wizard.isStepCompleted(index) || wizard.currentStep > index
                      ? 'bg-olive-600 text-white cursor-pointer hover:ring-2 hover:ring-olive-200'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {wizard.isStepCompleted(index) && wizard.currentStep > index ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    index + 1
                  )}
                </button>
              </div>

              {/* Step Label */}
              <div className="mt-2 text-center">
                <span
                  className={`text-sm font-medium ${
                    wizard.currentStep >= index ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* API Error Alert */}
      {apiError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Onboarding Failed</h3>
              <p className="text-sm text-red-700 mt-1">{apiError}</p>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-500 font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <CurrentStepComponent
          data={wizard.wizardData}
          onChange={wizard.updateData}
          onNext={wizard.goToNext}
          onBack={wizard.currentStep > 0 ? wizard.goToPrevious : null}
          onComplete={handleComplete}
          isLoading={wizard.isLoading}
        />
      </div>

      {/* Help Text */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>
          Need help?{' '}
          <a href="/help/staff-onboarding" className="text-olive-600 hover:text-olive-700 font-medium">
            View onboarding guide
          </a>
        </p>
      </div>
    </div>
  )
}

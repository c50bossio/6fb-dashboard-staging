'use client'

import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XMarkIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { EnhancedNoShowPolicy } from '@/lib/booking-rules-engine/EnhancedNoShowPolicy'
import { getStripe } from '@/lib/stripe-client'
import ClientHistoryTracker from './ClientHistoryTracker'

/**
 * NoShowRecoveryFlow - Comprehensive client redemption process for blocked clients
 * 
 * This component handles the complete client recovery workflow including:
 * - Multi-step recovery wizard with clear progress tracking
 * - Payment integration for outstanding fees via Stripe
 * - Manager approval workflow interface
 * - Automated communications for status updates
 * - Recovery timeline with deadlines and next steps
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.clientId - ID of the blocked client
 * @param {Object} props.clientData - Client information and history
 * @param {Object} props.rules - No-show policy rules configuration
 * @param {Function} props.onRecoveryComplete - Callback when recovery is completed
 * @param {Function} props.onClose - Callback to close the recovery flow
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {boolean} props.isManager - Whether current user is a manager
 */
export default function NoShowRecoveryFlow({
  clientId,
  clientData,
  rules = {},
  onRecoveryComplete,
  onClose,
  isOpen = false,
  isManager = false
}) {
  // Recovery flow state
  const [currentStep, setCurrentStep] = useState('overview')
  const [selectedRecoveryOption, setSelectedRecoveryOption] = useState(null)
  const [recoveryOptions, setRecoveryOptions] = useState([])
  const [recoveryStatus, setRecoveryStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Payment state
  const [outstandingFees, setOutstandingFees] = useState([])
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)
  
  // Manager review state
  const [managerNotes, setManagerNotes] = useState('')
  const [reviewDecision, setReviewDecision] = useState('')
  const [managerContact, setManagerContact] = useState(null)
  
  // Communication preferences
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    sms: true,
    phone: false
  })

  const noShowPolicy = new EnhancedNoShowPolicy(rules)

  // Recovery flow steps configuration
  const RECOVERY_STEPS = {
    overview: { title: 'Account Status', icon: InformationCircleIcon },
    options: { title: 'Recovery Options', icon: ArrowRightIcon },
    payment: { title: 'Payment', icon: CurrencyDollarIcon },
    deposit: { title: 'Deposit Setup', icon: ShieldCheckIcon },
    manager_review: { title: 'Manager Review', icon: UserGroupIcon },
    waiting: { title: 'Waiting Period', icon: ClockIcon },
    confirmation: { title: 'Confirmation', icon: CheckCircleIcon }
  }

  useEffect(() => {
    if (isOpen && clientData) {
      initializeRecoveryFlow()
    }
  }, [isOpen, clientData])

  /**
   * Initialize the recovery flow by loading client data and available options
   */
  const initializeRecoveryFlow = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get recovery options from the policy engine
      const options = noShowPolicy.getRecoveryOptions(clientData)
      setRecoveryOptions(options)

      // Load outstanding fees
      await loadOutstandingFees()

      // Check if there's an existing recovery request
      await checkExistingRecoveryRequest()

    } catch (err) {
      console.error('Error initializing recovery flow:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load outstanding fees for the client
   */
  const loadOutstandingFees = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/outstanding-fees`)
      if (!response.ok) throw new Error('Failed to load outstanding fees')
      
      const fees = await response.json()
      setOutstandingFees(fees)
      setPaymentAmount(fees.reduce((total, fee) => total + fee.amount, 0))
    } catch (err) {
      console.error('Error loading outstanding fees:', err)
    }
  }

  /**
   * Check for existing recovery request
   */
  const checkExistingRecoveryRequest = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/recovery-status`)
      if (response.ok) {
        const status = await response.json()
        if (status.active) {
          setRecoveryStatus(status.status)
          setSelectedRecoveryOption(status.recovery_option)
          if (status.status !== 'pending') {
            setCurrentStep('confirmation')
          }
        }
      }
    } catch (err) {
      // No existing recovery request - this is normal
      console.log('No existing recovery request found')
    }
  }

  /**
   * Handle recovery option selection
   */
  const handleOptionSelect = async (optionId) => {
    setSelectedRecoveryOption(optionId)
    
    // Navigate to appropriate step based on option
    switch (optionId) {
      case 'pay_outstanding_fees':
        setCurrentStep('payment')
        break
      case 'deposit_required_period':
        setCurrentStep('deposit')
        break
      case 'manager_approval':
        setCurrentStep('manager_review')
        break
      case 'waiting_period':
        setCurrentStep('waiting')
        break
      default:
        setCurrentStep('confirmation')
    }
  }

  /**
   * Process payment for outstanding fees
   */
  const processPayment = async () => {
    // Prevent double processing
    if (paymentProcessing || paymentComplete) {
      return
    }

    try {
      setPaymentProcessing(true)
      setError(null)

      // Validate payment amount
      if (!paymentAmount || paymentAmount <= 0) {
        throw new Error('Invalid payment amount')
      }

      const stripe = await getStripe()
      
      // Create payment intent for outstanding fees
      const response = await fetch('/api/payments/recovery-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          amount: paymentAmount,
          fees: outstandingFees,
          recoveryOptionId: selectedRecoveryOption
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const { clientSecret } = await response.json()

      // Process payment with Stripe
      const result = await stripe.confirmCardPayment(clientSecret)

      if (result.error) {
        throw new Error(result.error.message)
      }

      setPaymentComplete(true)
      await completeRecovery('payment_completed')

    } catch (err) {
      console.error('Payment error:', err)
      setError(err.message)
    } finally {
      setPaymentProcessing(false)
    }
  }

  /**
   * Submit manager review request
   */
  const submitManagerReview = async () => {
    // Prevent double submission
    if (loading) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Validate required fields
      if (!clientId) {
        throw new Error('Client ID is required')
      }

      const response = await fetch('/api/clients/recovery/manager-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          notes: managerNotes,
          notificationPreferences,
          recoveryOptionId: selectedRecoveryOption
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit manager review request')
      }

      const result = await response.json()
      setManagerContact(result.managerInfo)
      
      // Send notifications
      await sendRecoveryNotifications({
        type: 'manager_review_requested',
        clientId,
        managerEmail: result.managerInfo.email
      })

      await completeRecovery('manager_review_pending')

    } catch (err) {
      console.error('Manager review error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Setup deposit requirement period
   */
  const setupDepositPeriod = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/clients/recovery/deposit-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          recoveryOptionId: selectedRecoveryOption,
          notificationPreferences
        })
      })

      if (!response.ok) {
        throw new Error('Failed to setup deposit period')
      }

      await sendRecoveryNotifications({
        type: 'deposit_period_started',
        clientId
      })

      await completeRecovery('deposit_period_active')

    } catch (err) {
      console.error('Deposit setup error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Start waiting period
   */
  const startWaitingPeriod = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/clients/recovery/waiting-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          recoveryOptionId: selectedRecoveryOption,
          notificationPreferences
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start waiting period')
      }

      await sendRecoveryNotifications({
        type: 'waiting_period_started',
        clientId
      })

      await completeRecovery('waiting_period_active')

    } catch (err) {
      console.error('Waiting period error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Manager approval decision (for manager users)
   */
  const submitManagerDecision = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/clients/recovery/manager-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          decision: reviewDecision,
          notes: managerNotes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit manager decision')
      }

      await sendRecoveryNotifications({
        type: 'manager_decision_made',
        clientId,
        decision: reviewDecision
      })

      const newStatus = reviewDecision === 'approve' ? 'recovery_approved' : 'recovery_denied'
      await completeRecovery(newStatus)

    } catch (err) {
      console.error('Manager decision error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Send recovery notifications
   */
  const sendRecoveryNotifications = async (notificationData) => {
    try {
      await fetch('/api/notifications/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notificationData,
          preferences: notificationPreferences
        })
      })
    } catch (err) {
      console.error('Notification error:', err)
      // Don't throw - notifications are not critical to recovery flow
    }
  }

  /**
   * Complete the recovery process
   */
  const completeRecovery = async (status) => {
    setRecoveryStatus(status)
    setCurrentStep('confirmation')

    // Call completion callback if provided
    if (onRecoveryComplete) {
      onRecoveryComplete({
        clientId,
        recoveryOption: selectedRecoveryOption,
        status,
        completedAt: new Date().toISOString()
      })
    }
  }

  /**
   * Navigate between steps
   */
  const goToStep = (step) => {
    setCurrentStep(step)
    setError(null)
  }

  /**
   * Render progress indicator
   */
  const renderProgressIndicator = () => {
    const steps = Object.keys(RECOVERY_STEPS)
    const currentIndex = steps.indexOf(currentStep)

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.slice(0, -1).map((step, index) => {
            const StepIcon = RECOVERY_STEPS[step].icon
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isAccessible = index <= currentIndex || 
                                (step === 'options' && currentStep !== 'overview')

            return (
              <div key={step} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => isAccessible && goToStep(step)}
                  disabled={!isAccessible}
                  className={`
                    flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all
                    ${isCompleted 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : isCurrent 
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isAccessible
                          ? 'border-gray-300 text-gray-600 hover:border-blue-400'
                          : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </button>
                
                {index < steps.length - 2 && (
                  <div className={`w-8 md:w-12 h-0.5 mx-1 md:mx-2 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
        
        <div className="mt-2 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            {RECOVERY_STEPS[currentStep].title}
          </h3>
        </div>
      </div>
    )
  }

  /**
   * Render account status overview
   */
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Client history */}
      <ClientHistoryTracker
        clientId={clientId}
        rules={rules}
        showFullHistory={true}
      />

      {/* Recovery introduction */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Account Recovery Available</h4>
            <p className="text-sm text-blue-800 mb-4">
              Your booking privileges have been temporarily suspended due to missed appointments. 
              However, we value your business and offer several paths to restore your account.
            </p>
            <p className="text-sm text-blue-800">
              Choose from the recovery options below to regain full booking access.
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={() => setCurrentStep('options')}
          icon={ArrowRightIcon}
          iconPosition="right"
        >
          View Recovery Options
        </Button>
      </div>
    </div>
  )

  /**
   * Render recovery options selection
   */
  const renderOptions = () => (
    <div className="space-y-6">
      <div className="grid gap-4">
        {recoveryOptions.map((option) => {
          const isSelected = selectedRecoveryOption === option.id
          
          return (
            <div
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              className={`
                p-4 border rounded-lg cursor-pointer transition-all
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {option.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {option.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-gray-500">Requirements:</span>
                      <ul className="text-xs text-gray-600 ml-2">
                        {option.requirements.map((req, idx) => (
                          <li key={idx}>• {req}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-xs font-medium text-gray-500">Timeframe:</span>
                        <span className="text-xs text-gray-600 ml-1">{option.timeframe}</span>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Difficulty:</span>
                        <span className={`text-xs ml-1 capitalize ${
                          option.difficulty === 'easy' ? 'text-green-600' :
                          option.difficulty === 'moderate' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {option.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {isSelected && (
                  <CheckCircleIcon className="h-6 w-6 text-blue-600 ml-3" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="secondary" 
          onClick={() => setCurrentStep('overview')}
          icon={ArrowLeftIcon}
        >
          Back
        </Button>
        <Button 
          disabled={!selectedRecoveryOption}
          onClick={() => {
            const option = recoveryOptions.find(opt => opt.id === selectedRecoveryOption)
            if (option) handleOptionSelect(option.id)
          }}
          icon={ArrowRightIcon}
          iconPosition="right"
        >
          Continue
        </Button>
      </div>
    </div>
  )

  /**
   * Render payment step
   */
  const renderPayment = () => (
    <div className="space-y-6">
      {/* Outstanding fees summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Outstanding Fees</h4>
        <div className="space-y-2 mb-4">
          {outstandingFees.map((fee, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {fee.description} ({fee.date})
              </span>
              <span className="font-medium">${fee.amount}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-2 flex justify-between font-medium">
          <span>Total Amount Due:</span>
          <span className="text-lg">${paymentAmount}</span>
        </div>
      </div>

      {/* Payment form placeholder */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center mb-4">
          <CreditCardIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h4 className="font-medium text-gray-900">Payment Information</h4>
        </div>
        
        {!paymentComplete ? (
          <div className="space-y-4">
            {/* In a real implementation, this would be a Stripe Elements form */}
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Stripe Payment Form</p>
              <p className="text-sm text-gray-500 mt-1">
                Credit card form would be embedded here
              </p>
            </div>
            
            <Button
              onClick={processPayment}
              loading={paymentProcessing}
              className="w-full"
              size="large"
            >
              {paymentProcessing ? 'Processing Payment...' : `Pay $${paymentAmount}`}
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-green-900 mb-1">Payment Successful!</h4>
            <p className="text-sm text-green-700">
              Your payment has been processed and your account will be restored within 24 hours.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {!paymentComplete && (
        <div className="flex justify-between">
          <Button 
            variant="secondary" 
            onClick={() => setCurrentStep('options')}
            icon={ArrowLeftIcon}
          >
            Back
          </Button>
        </div>
      )}
    </div>
  )

  /**
   * Render deposit period setup
   */
  const renderDepositSetup = () => (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <ShieldCheckIcon className="h-6 w-6 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-2">Deposit-Required Period</h4>
            <p className="text-sm text-amber-800 mb-2">
              For the next 3 months, all appointments will require a 20% deposit at booking time.
            </p>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Deposits are refundable if you attend your appointment</li>
              <li>• After 3 consecutive successful appointments, normal booking resumes</li>
              <li>• Missed appointments during this period may result in additional penalties</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Notification preferences */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Communication Preferences</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notificationPreferences.email}
              onChange={(e) => setNotificationPreferences(prev => ({
                ...prev,
                email: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <EnvelopeIcon className="h-4 w-4 text-gray-600 ml-2 mr-1" />
            <span className="text-sm text-gray-700">Email notifications</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notificationPreferences.sms}
              onChange={(e) => setNotificationPreferences(prev => ({
                ...prev,
                sms: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <PhoneIcon className="h-4 w-4 text-gray-600 ml-2 mr-1" />
            <span className="text-sm text-gray-700">SMS reminders</span>
          </label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="secondary" 
          onClick={() => setCurrentStep('options')}
          icon={ArrowLeftIcon}
        >
          Back
        </Button>
        <Button 
          onClick={setupDepositPeriod}
          loading={loading}
          icon={ArrowRightIcon}
          iconPosition="right"
        >
          Start Deposit Period
        </Button>
      </div>
    </div>
  )

  /**
   * Render manager review step
   */
  const renderManagerReview = () => (
    <div className="space-y-6">
      {/* Manager review info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <UserGroupIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Manager Review Process</h4>
            <p className="text-sm text-blue-800 mb-2">
              A manager will review your account history and circumstances to determine 
              if your booking privileges can be restored.
            </p>
            <p className="text-sm text-blue-800">
              Please provide any relevant information that might help with the review.
            </p>
          </div>
        </div>
      </div>

      {/* Notes section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Information (Optional)
        </label>
        <Textarea
          value={managerNotes}
          onChange={(e) => setManagerNotes(e.target.value)}
          placeholder="Explain any circumstances that led to missed appointments or why you believe your account should be restored..."
          rows={4}
          className="w-full"
        />
      </div>

      {/* Manager decision section (for managers only) */}
      {isManager && (
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Manager Decision</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision
              </label>
              <select
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select decision...</option>
                <option value="approve">Approve - Restore full access</option>
                <option value="approve_with_deposit">Approve - Require deposit period</option>
                <option value="deny">Deny - Maintain current restrictions</option>
              </select>
            </div>
            
            <Button
              onClick={submitManagerDecision}
              disabled={!reviewDecision}
              loading={loading}
              variant="success"
              className="w-full"
            >
              Submit Decision
            </Button>
          </div>
        </div>
      )}

      {/* Communication preferences */}
      {!isManager && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">How should we contact you?</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationPreferences.email}
                onChange={(e) => setNotificationPreferences(prev => ({
                  ...prev,
                  email: e.target.checked
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <EnvelopeIcon className="h-4 w-4 text-gray-600 ml-2 mr-1" />
              <span className="text-sm text-gray-700">Email updates</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationPreferences.sms}
                onChange={(e) => setNotificationPreferences(prev => ({
                  ...prev,
                  sms: e.target.checked
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <PhoneIcon className="h-4 w-4 text-gray-600 ml-2 mr-1" />
              <span className="text-sm text-gray-700">SMS updates</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationPreferences.phone}
                onChange={(e) => setNotificationPreferences(prev => ({
                  ...prev,
                  phone: e.target.checked
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <PhoneIcon className="h-4 w-4 text-gray-600 ml-2 mr-1" />
              <span className="text-sm text-gray-700">Phone call</span>
            </label>
          </div>
        </div>
      )}

      {/* Navigation */}
      {!isManager && (
        <div className="flex justify-between">
          <Button 
            variant="secondary" 
            onClick={() => setCurrentStep('options')}
            icon={ArrowLeftIcon}
          >
            Back
          </Button>
          <Button 
            onClick={submitManagerReview}
            loading={loading}
            icon={ArrowRightIcon}
            iconPosition="right"
          >
            Submit Review Request
          </Button>
        </div>
      )}
    </div>
  )

  /**
   * Render waiting period step
   */
  const renderWaitingPeriod = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
        <div className="flex items-start">
          <ClockIcon className="h-6 w-6 text-gray-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900 mb-2">6-Month Waiting Period</h4>
            <p className="text-sm text-gray-600 mb-2">
              Your booking privileges will be restored automatically after 6 months of no booking attempts.
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Waiting period starts immediately upon confirmation</li>
              <li>• Do not attempt to book during this period</li>
              <li>• You will receive a notification when privileges are restored</li>
              <li>• Contact us if circumstances change significantly</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Start Date:</span>
            <span className="font-medium">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Restoration Date:</span>
            <span className="font-medium">
              {new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Communication preferences */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Notification Preferences</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notificationPreferences.email}
              onChange={(e) => setNotificationPreferences(prev => ({
                ...prev,
                email: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <EnvelopeIcon className="h-4 w-4 text-gray-600 ml-2 mr-1" />
            <span className="text-sm text-gray-700">Email when restrictions are lifted</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notificationPreferences.sms}
              onChange={(e) => setNotificationPreferences(prev => ({
                ...prev,
                sms: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <PhoneIcon className="h-4 w-4 text-gray-600 ml-2 mr-1" />
            <span className="text-sm text-gray-700">SMS reminder before restoration</span>
          </label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="secondary" 
          onClick={() => setCurrentStep('options')}
          icon={ArrowLeftIcon}
        >
          Back
        </Button>
        <Button 
          onClick={startWaitingPeriod}
          loading={loading}
          icon={ArrowRightIcon}
          iconPosition="right"
        >
          Start Waiting Period
        </Button>
      </div>
    </div>
  )

  /**
   * Render confirmation step
   */
  const renderConfirmation = () => {
    const getStatusMessage = () => {
      switch (recoveryStatus) {
        case 'payment_completed':
          return {
            icon: CheckCircleIcon,
            color: 'green',
            title: 'Payment Successful',
            message: 'Your payment has been processed successfully. Your booking privileges will be restored within 24 hours.',
            nextSteps: ['Check your email for payment confirmation', 'Booking access will be restored automatically', 'Contact us if you have any questions']
          }
        case 'deposit_period_active':
          return {
            icon: ShieldCheckIcon,
            color: 'amber',
            title: 'Deposit Period Started',
            message: 'Your account is now in deposit-required mode for the next 3 months.',
            nextSteps: ['20% deposit required for all bookings', 'Complete 3 successful appointments', 'Normal booking will resume afterward']
          }
        case 'manager_review_pending':
          return {
            icon: UserGroupIcon,
            color: 'blue',
            title: 'Manager Review Requested',
            message: 'Your request has been submitted for manager review. We\'ll contact you within 2 business days.',
            nextSteps: ['Manager will review your account', 'You\'ll receive an update within 48 hours', 'Check your email and phone for notifications']
          }
        case 'waiting_period_active':
          return {
            icon: ClockIcon,
            color: 'gray',
            title: 'Waiting Period Started',
            message: 'Your 6-month waiting period has begun. Booking privileges will be restored automatically.',
            nextSteps: ['Do not attempt to book during this period', 'Privileges restore automatically in 6 months', 'You\'ll receive a notification when ready']
          }
        case 'recovery_approved':
          return {
            icon: CheckCircleIcon,
            color: 'green',
            title: 'Recovery Approved',
            message: 'Great news! Your account has been restored by management.',
            nextSteps: ['Your booking privileges are now active', 'Book your next appointment normally', 'Thank you for your patience']
          }
        case 'recovery_denied':
          return {
            icon: XMarkIcon,
            color: 'red',
            title: 'Recovery Denied',
            message: 'Unfortunately, your recovery request has been denied at this time.',
            nextSteps: ['Consider other recovery options', 'Contact us to discuss alternatives', 'You may reapply after 3 months']
          }
        default:
          return {
            icon: InformationCircleIcon,
            color: 'blue',
            title: 'Recovery Process Complete',
            message: 'Your recovery process has been completed.',
            nextSteps: ['Check your account status', 'Contact us if you need assistance']
          }
      }
    }

    const statusInfo = getStatusMessage()
    const StatusIcon = statusInfo.icon

    return (
      <div className="space-y-6">
        {/* Status message */}
        <div className={`bg-${statusInfo.color}-50 border border-${statusInfo.color}-200 rounded-lg p-6 text-center`}>
          <StatusIcon className={`h-12 w-12 text-${statusInfo.color}-600 mx-auto mb-4`} />
          <h3 className={`font-medium text-${statusInfo.color}-900 mb-2`}>
            {statusInfo.title}
          </h3>
          <p className={`text-sm text-${statusInfo.color}-800 mb-4`}>
            {statusInfo.message}
          </p>
        </div>

        {/* Next steps */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Next Steps</h4>
          <ul className="space-y-2">
            {statusInfo.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start text-sm text-gray-600">
                <span className="font-medium text-gray-900 mr-2">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Contact information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
          <p className="text-sm text-gray-600 mb-3">
            If you have questions about your recovery process, contact us:
          </p>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center">
              <PhoneIcon className="h-4 w-4 mr-2" />
              <span>(555) 123-4567</span>
            </div>
            <div className="flex items-center">
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              <span>support@bookedbarber.com</span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="text-center">
          <Button 
            onClick={onClose}
            size="large"
            variant="primary"
          >
            Close Recovery Flow
          </Button>
        </div>
      </div>
    )
  }

  /**
   * Render current step content
   */
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'overview':
        return renderOverview()
      case 'options':
        return renderOptions()
      case 'payment':
        return renderPayment()
      case 'deposit':
        return renderDepositSetup()
      case 'manager_review':
        return renderManagerReview()
      case 'waiting':
        return renderWaitingPeriod()
      case 'confirmation':
        return renderConfirmation()
      default:
        return renderOverview()
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="p-4 md:p-6 max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Account Recovery
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Restore your booking privileges
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress indicator */}
        {currentStep !== 'confirmation' && renderProgressIndicator()}

        {/* Error display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Error</h4>
                <p className="text-sm text-red-800 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && currentStep === 'overview' ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          renderCurrentStep()
        )}
      </div>
    </Modal>
  )
}

/**
 * Utility hook for managing recovery flow state externally
 * @param {string} clientId - Client ID
 * @returns {Object} Recovery flow state and controls
 */
export function useNoShowRecoveryFlow(clientId) {
  const [isOpen, setIsOpen] = useState(false)
  const [recoveryData, setRecoveryData] = useState(null)

  const openRecoveryFlow = (clientData) => {
    setRecoveryData(clientData)
    setIsOpen(true)
  }

  const closeRecoveryFlow = () => {
    setIsOpen(false)
    setRecoveryData(null)
  }

  const handleRecoveryComplete = (result) => {
    // Handle completion logic
    console.log('Recovery completed:', result)
  }

  return {
    isOpen,
    recoveryData,
    openRecoveryFlow,
    closeRecoveryFlow,
    handleRecoveryComplete
  }
}
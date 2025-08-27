'use client'

import {
  HeartIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XMarkIcon,
  InformationCircleIcon,
  GiftIcon,
  PhoneIcon,
  EnvelopeIcon,
  SparklesIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import ClientHistoryTracker from './ClientHistoryTracker'
import { useAuth } from '../SupabaseAuthProvider'

/**
 * ClientCareFlow - Relationship-focused client re-engagement system
 * 
 * This component transforms missed appointments into relationship-building opportunities:
 * - Caring, empathetic communication approach
 * - Focus on understanding and solving problems
 * - Dale Carnegie principles applied throughout
 * - Positive reinforcement and appreciation
 * - Flexible solutions that work for the client
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.clientId - ID of the client we're reaching out to
 * @param {Object} props.clientData - Client information and relationship history
 * @param {Object} props.rules - Care approach configuration
 * @param {Function} props.onCareComplete - Callback when care process is completed
 * @param {Function} props.onClose - Callback to close the care flow
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {boolean} props.isManager - Whether current user is a manager
 */
export default function ClientCareFlow({
  clientId,
  clientData,
  rules = {},
  onCareComplete,
  onClose,
  isOpen = false,
  isManager = false
}) {
  const { user, profile } = useAuth()
  
  // Care flow state
  const [currentStep, setCurrentStep] = useState(clientData ? 'understanding' : 'client_selection')
  const [selectedCareOption, setSelectedCareOption] = useState(null)
  const [careOptions, setCareOptions] = useState([])
  const [careStatus, setCareStatus] = useState('reaching_out')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Client selection state
  const [selectedClientId, setSelectedClientId] = useState(clientId)
  const [selectedClientData, setSelectedClientData] = useState(clientData)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  
  // Relationship building state
  const [clientConcerns, setClientConcerns] = useState('')
  const [proposedSolutions, setProposedSolutions] = useState([])
  const [personalMessage, setPersonalMessage] = useState('')
  const [careApproach, setCareApproach] = useState('gentle')
  
  // Communication preferences  
  const [communicationStyle, setCommunicationStyle] = useState({
    personal_call: true,
    warm_text: true,
    friendly_email: true,
    in_person_chat: false
  })

  // Care flow steps - relationship focused
  const CARE_STEPS = {
    client_selection: { title: 'Select Client', icon: UserGroupIcon, description: 'Choose who needs care' },
    understanding: { title: 'Understanding', icon: HeartIcon, description: 'We care about what happened' },
    solutions: { title: 'Solutions', icon: SparklesIcon, description: 'How can we help?' },
    reconnection: { title: 'Reconnect', icon: HandRaisedIcon, description: 'Welcome back!' },
    celebration: { title: 'Celebrate', icon: GiftIcon, description: 'Great to have you!' }
  }

  useEffect(() => {
    if (isOpen && selectedClientData) {
      initializeCareFlow()
    }
  }, [isOpen, selectedClientData])

  useEffect(() => {
    if (isOpen && !selectedClientData && currentStep === 'client_selection') {
      searchForClientsNeedingCare()
    }
  }, [isOpen, currentStep])

  /**
   * Search for clients who might need care
   */
  const searchForClientsNeedingCare = async () => {
    try {
      setLoadingSearch(true)
      setError(null)

      // Search for clients with recent missed appointments or those who haven't visited recently
      const response = await fetch('/api/client-care/needs-attention?priority=all&limit=50', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to search for clients needing attention')
      }

      const results = await response.json()
      
      // Transform the results to include care-specific information
      const clientsWithCareInfo = (results.clients || []).map(client => ({
        ...client,
        // Add care-specific fields for the UI
        care_priority: client.priority,
        care_reason: client.reason,
        suggested_action: client.suggested_action,
        days_since_last_visit: client.last_visit_at ? 
          Math.floor((new Date() - new Date(client.last_visit_at)) / (1000 * 60 * 60 * 24)) : null
      }))
      
      setSearchResults(clientsWithCareInfo)

    } catch (err) {
      console.error('Error searching for clients:', err)
      setError(err.message)
    } finally {
      setLoadingSearch(false)
    }
  }

  /**
   * Search clients by name/email
   */
  const searchClients = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    // Get barbershop_id from profile
    const barbershopId = profile?.shop_id || profile?.barbershop_id
    if (!barbershopId) {
      setError('No barbershop associated with your account')
      return
    }

    try {
      setLoadingSearch(true)
      setError(null)

      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}&barbershop_id=${barbershopId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to search customers')
      }

      const results = await response.json()
      setSearchResults(results.customers || [])

    } catch (err) {
      console.error('Error searching clients:', err)
      setError(err.message)
    } finally {
      setLoadingSearch(false)
    }
  }

  /**
   * Handle client selection
   */
  const handleClientSelect = async (client) => {
    try {
      setSelectedClientId(client.id)
      
      // Fetch full client data including care history
      const response = await fetch(`/api/no-show/strikes?client_id=${client.id}`)
      if (response.ok) {
        const clientData = await response.json()
        setSelectedClientData({
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          ...clientData
        })
        setCurrentStep('understanding')
      } else {
        // Use basic client data if detailed data not available
        setSelectedClientData(client)
        setCurrentStep('understanding')
      }
    } catch (err) {
      console.error('Error selecting client:', err)
      setError('Failed to load client data')
    }
  }

  /**
   * Initialize the care flow with relationship-building approach
   */
  const initializeCareFlow = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get caring outreach options based on client relationship
      const options = generateCareOptions(selectedClientData)
      setCareOptions(options)

      // Set personalized message based on client history
      const personalNote = generatePersonalMessage(selectedClientData)
      setPersonalMessage(personalNote)

    } catch (err) {
      console.error('Error initializing care flow:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Generate caring outreach options based on Dale Carnegie principles
   */
  const generateCareOptions = (clientData) => {
    const baseOptions = [
      {
        id: 'personal_outreach',
        title: 'Personal Check-in Call',
        description: 'A warm, caring phone call to see how they\'re doing and if everything is okay.',
        approach: 'Show genuine interest in their wellbeing',
        timeframe: 'Same day',
        difficulty: 'easy',
        carnegie_principle: 'Become genuinely interested in other people'
      },
      {
        id: 'flexible_rescheduling',
        title: 'Ultra-Flexible Booking Options',
        description: 'Offer priority scheduling, same-day booking, or flexible time windows that work for their life.',
        approach: 'Make their life easier, not harder',
        timeframe: 'Immediate',
        difficulty: 'easy',
        carnegie_principle: 'Make the other person feel important'
      },
      {
        id: 'loyalty_appreciation',
        title: 'Valued Client Recognition',
        description: 'Acknowledge their loyalty and offer VIP treatment to show we appreciate their business.',
        approach: 'Give honest and sincere appreciation',
        timeframe: '1-2 days',
        difficulty: 'moderate',
        carnegie_principle: 'Give honest and sincere appreciation'
      },
      {
        id: 'problem_solving',
        title: 'Life Solutions Partnership',
        description: 'Work together to identify what\'s making appointments difficult and solve it together.',
        approach: 'Collaborative problem-solving',
        timeframe: '2-3 days',
        difficulty: 'moderate', 
        carnegie_principle: 'Let the other person feel the idea is his or hers'
      }
    ]

    // Customize based on client relationship length and history
    if (clientData.relationshipLength > 12) {
      baseOptions.push({
        id: 'longtime_friend',
        title: 'Long-time Friend Approach',
        description: 'Reach out like the valued long-term relationship they are - personal, warm, and understanding.',
        approach: 'Treat like family',
        timeframe: 'Personal timing',
        difficulty: 'easy',
        carnegie_principle: 'Remember that a person\'s name is the sweetest sound'
      })
    }

    return baseOptions
  }

  /**
   * Generate personalized message based on client history
   */
  const generatePersonalMessage = (clientData) => {
    const clientName = clientData.name || 'friend'
    const lastVisit = clientData.lastVisit ? new Date(clientData.lastVisit).toLocaleDateString() : 'recently'
    
    return `Hi ${clientName}! We noticed you missed your appointment and wanted to reach out because we genuinely care about you as a person, not just as a client. 

We know life gets busy and things come up - that's completely normal and human! Your business means a lot to us, and more importantly, we want to make sure everything is okay with you.

Is there anything we can do to make booking appointments easier or more convenient for your schedule? We're here to work WITH you, not against you.

Looking forward to seeing you again soon! 💙`
  }

  /**
   * Handle care option selection
   */
  const handleCareOptionSelect = (optionId) => {
    setSelectedCareOption(optionId)
    setCurrentStep('solutions')
  }

  /**
   * Send caring outreach
   */
  const sendCaringOutreach = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/client-care/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          careOption: selectedCareOption,
          personalMessage,
          communicationStyle,
          careApproach,
          concerns: clientConcerns
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send caring outreach')
      }

      const result = await response.json()
      setCareStatus('outreach_sent')
      setCurrentStep('celebration')

      // Show success and next steps
      if (onCareComplete) {
        onCareComplete({
          clientId: selectedClientId,
          careOption: selectedCareOption,
          status: 'care_initiated',
          approach: 'relationship_building',
          completedAt: new Date().toISOString()
        })
      }

    } catch (err) {
      console.error('Care outreach error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
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
   * Render progress indicator with relationship focus
   */
  const renderProgressIndicator = () => {
    const steps = Object.keys(CARE_STEPS)
    const currentIndex = steps.indexOf(currentStep)

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const StepIcon = CARE_STEPS[step].icon
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex

            return (
              <div key={step} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => goToStep(step)}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                    ${isCompleted 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : isCurrent 
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-blue-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </button>
                
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
        
        <div className="mt-3 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            {CARE_STEPS[currentStep].title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {CARE_STEPS[currentStep].description}
          </p>
        </div>
      </div>
    )
  }

  /**
   * Render client selection step
   */
  const renderClientSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <UserGroupIcon className="h-12 w-12 text-blue-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Who needs some care?</h3>
        <p className="text-gray-600">
          Select a client who might benefit from a caring check-in and relationship building
        </p>
      </div>

      {/* Search input */}
      <div className="mb-4">
        <Input
          placeholder="Search by client name or email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            searchClients(e.target.value)
          }}
          className="w-full"
        />
      </div>

      {/* Search results */}
      {loadingSearch ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
          <span className="ml-2 text-gray-600">Searching for clients...</span>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {searchResults.map((client) => {
            // Determine priority badge styling
            const priorityStyles = {
              high: 'bg-red-100 text-red-800 border-red-200',
              medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
              low: 'bg-green-100 text-green-800 border-green-200'
            }
            
            // Determine reason display
            const reasonLabels = {
              recent_no_show: 'Recent No-Show',
              inactive: 'Inactive Client',
              cancelled_not_rescheduled: 'Cancelled - Need Reschedule'
            }
            
            return (
              <div
                key={client.id}
                onClick={() => handleClientSelect(client)}
                className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{client.name}</h4>
                      {client.care_priority && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityStyles[client.care_priority] || priorityStyles.low}`}>
                          {client.care_priority.toUpperCase()} PRIORITY
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">{client.email}</p>
                      {client.phone && (
                        <p className="text-sm text-gray-500">{client.phone}</p>
                      )}
                      
                      {client.care_reason && (
                        <div className="flex items-center gap-1">
                          <InformationCircleIcon className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-blue-600 font-medium">
                            {reasonLabels[client.care_reason] || client.care_reason}
                          </span>
                        </div>
                      )}
                      
                      {client.suggested_action && (
                        <p className="text-xs text-gray-600 italic mt-1">
                          💡 {client.suggested_action}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {client.total_visits && (
                          <span>{client.total_visits} visits</span>
                        )}
                        {client.total_spent && (
                          <span>${client.total_spent} spent</span>
                        )}
                        {client.days_since_last_visit !== null && (
                          <span>{client.days_since_last_visit} days since last visit</span>
                        )}
                      </div>
                      
                      {(client.last_visit_at || client.lastVisit) && (
                        <p className="text-xs text-gray-500">
                          Last visit: {new Date(client.last_visit_at || client.lastVisit).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-3">
                    <HeartIcon className="h-5 w-5 text-rose-400" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : searchQuery.length >= 2 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No clients found matching "{searchQuery}"</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Start typing to search for clients</p>
          <p className="text-sm mt-1">Or we'll automatically show clients who might need care</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        {searchQuery.length < 2 && searchResults.length === 0 && (
          <Button 
            onClick={searchForClientsNeedingCare}
            loading={loadingSearch}
            icon={HeartIcon}
          >
            Find Clients Who Need Care
          </Button>
        )}
      </div>
    </div>
  )

  /**
   * Render understanding step - empathetic approach
   */
  const renderUnderstanding = () => (
    <div className="space-y-6">
      {/* Client relationship history */}
      <ClientHistoryTracker
        clientId={selectedClientId}
        rules={rules}
        showFullHistory={true}
        viewMode="caring"
      />

      {/* Empathetic introduction */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <HeartIcon className="h-8 w-8 text-blue-600 mr-4 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-medium text-blue-900 mb-3">We Care About You</h4>
            <p className="text-blue-800 mb-4">
              We've noticed you've missed a few appointments, and we wanted to reach out because 
              you matter to us - not just as a client, but as a person we genuinely care about.
            </p>
            <p className="text-blue-800 mb-4">
              Life gets complicated, schedules change, and things come up - we completely understand! 
              We're not here to judge or penalize you. We're here because we want to make sure 
              everything is okay and see how we can better serve you.
            </p>
            <p className="text-blue-800">
              Your business and relationship with us is valuable, and we want to find solutions 
              that work for YOUR life, not create more stress.
            </p>
          </div>
        </div>
      </div>

      {/* Understanding questions */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Help Us Understand</h4>
        <p className="text-sm text-gray-600 mb-4">
          We'd love to learn more about what would make scheduling easier for you. 
          No judgment - just genuine desire to help!
        </p>
        
        <Textarea
          value={clientConcerns}
          onChange={(e) => setClientConcerns(e.target.value)}
          placeholder="Is there anything we should know about your schedule, preferences, or how we can serve you better? (Optional - just helps us care for you better)"
          rows={3}
          className="w-full"
        />
      </div>

      {/* Action buttons */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onClose}>
          Maybe Later
        </Button>
        <Button 
          onClick={() => setCurrentStep('solutions')}
          icon={ArrowRightIcon}
          iconPosition="right"
        >
          Let's Find Solutions
        </Button>
      </div>
    </div>
  )

  /**
   * Render solutions step - collaborative problem solving
   */
  const renderSolutions = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <SparklesIcon className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">How Can We Help?</h3>
        <p className="text-gray-600">
          Choose the approach that feels right for reaching out. We want this to feel genuine and caring.
        </p>
      </div>

      <div className="grid gap-4">
        {careOptions.map((option) => {
          const isSelected = selectedCareOption === option.id
          
          return (
            <div
              key={option.id}
              onClick={() => handleCareOptionSelect(option.id)}
              className={`
                p-6 border rounded-xl cursor-pointer transition-all hover:shadow-md
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {option.title}
                  </h4>
                  <p className="text-gray-600 mb-3">
                    {option.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-blue-600">Approach:</span>
                      <span className="text-gray-600 ml-2">{option.approach}</span>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium text-green-600">Carnegie Principle:</span>
                      <span className="text-gray-600 ml-2 italic">"{option.carnegie_principle}"</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="font-medium text-purple-600">Timeframe:</span>
                        <span className="text-gray-600 ml-1">{option.timeframe}</span>
                      </div>
                      <div>
                        <span className="font-medium text-orange-600">Feel:</span>
                        <span className={`ml-1 capitalize ${
                          option.difficulty === 'easy' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {option.difficulty === 'easy' ? 'Natural & Easy' : 'Thoughtful & Personal'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {isSelected && (
                  <CheckCircleIcon className="h-6 w-6 text-blue-600 ml-4 flex-shrink-0" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Personal message customization */}
      {selectedCareOption && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Personal Touch</h4>
          <p className="text-sm text-gray-600 mb-3">
            Feel free to customize this message to make it feel authentic to your relationship with this client:
          </p>
          <Textarea
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            rows={4}
            className="w-full"
          />
        </div>
      )}

      {/* Communication preferences */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">How Should We Reach Out?</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={communicationStyle.personal_call}
              onChange={(e) => setCommunicationStyle(prev => ({
                ...prev,
                personal_call: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <PhoneIcon className="h-4 w-4 text-gray-600 ml-2 mr-1" />
            <span className="text-sm text-gray-700">Warm phone call</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={communicationStyle.warm_text}
              onChange={(e) => setCommunicationStyle(prev => ({
                ...prev,
                warm_text: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 ml-6">Caring text message</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={communicationStyle.friendly_email}
              onChange={(e) => setCommunicationStyle(prev => ({
                ...prev,
                friendly_email: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <EnvelopeIcon className="h-4 w-4 text-gray-600 ml-2 mr-1" />
            <span className="text-sm text-gray-700">Friendly email</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={communicationStyle.in_person_chat}
              onChange={(e) => setCommunicationStyle(prev => ({
                ...prev,
                in_person_chat: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 ml-6">Next visit chat</span>
          </label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="secondary" 
          onClick={() => setCurrentStep('understanding')}
          icon={ArrowLeftIcon}
        >
          Back
        </Button>
        <Button 
          disabled={!selectedCareOption}
          onClick={sendCaringOutreach}
          loading={loading}
          icon={HeartIcon}
          iconPosition="right"
        >
          Send Caring Outreach
        </Button>
      </div>
    </div>
  )

  /**
   * Render celebration step - positive conclusion
   */
  const renderCelebration = () => (
    <div className="space-y-6">
      {/* Success message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <GiftIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="font-semibold text-green-900 mb-2">
          Caring Outreach Sent! 💙
        </h3>
        <p className="text-green-800 mb-4">
          We've reached out with genuine care and interest. This is relationship-building, not enforcement.
        </p>
        <p className="text-green-700 text-sm">
          Remember: We win people over with sincere appreciation and genuine interest in their wellbeing.
        </p>
      </div>

      {/* Next steps - relationship focused */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">What Happens Next?</h4>
        <ul className="space-y-3">
          <li className="flex items-start text-sm text-gray-600">
            <span className="font-medium text-green-600 mr-2">1.</span>
            Client receives our caring, non-judgmental message
          </li>
          <li className="flex items-start text-sm text-gray-600">
            <span className="font-medium text-green-600 mr-2">2.</span>
            We follow up based on their response and preferences
          </li>
          <li className="flex items-start text-sm text-gray-600">
            <span className="font-medium text-green-600 mr-2">3.</span>
            We work together to find solutions that fit their life
          </li>
          <li className="flex items-start text-sm text-gray-600">
            <span className="font-medium text-green-600 mr-2">4.</span>
            We welcome them back warmly when they're ready
          </li>
        </ul>
      </div>

      {/* Carnegie wisdom */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Remember Dale Carnegie's Wisdom</h4>
        <p className="text-blue-800 text-sm italic">
          "You can make more friends in two months by becoming interested in other people 
          than you can in two years by trying to get other people interested in you."
        </p>
        <p className="text-blue-700 text-sm mt-2">
          We're building relationships, not enforcing policies. Every interaction is an opportunity 
          to show we genuinely care about them as people.
        </p>
      </div>

      {/* Action button */}
      <div className="text-center">
        <Button 
          onClick={onClose}
          size="large"
          variant="primary"
          icon={HeartIcon}
        >
          Relationship Building Complete
        </Button>
      </div>
    </div>
  )

  /**
   * Render current step content
   */
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'client_selection':
        return renderClientSelection()
      case 'understanding':
        return renderUnderstanding()
      case 'solutions':
        return renderSolutions()
      case 'celebration':
        return renderCelebration()
      default:
        return selectedClientData ? renderUnderstanding() : renderClientSelection()
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="p-6 max-h-[90vh] overflow-y-auto">
        {/* Header - warm and caring */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <HeartIcon className="h-6 w-6 text-blue-600 mr-2" />
              Client Care & Connection
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Building relationships through genuine care and understanding
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
        {currentStep !== 'celebration' && currentStep !== 'client_selection' && renderProgressIndicator()}

        {/* Error display - gentle and understanding */}
        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Something went wrong</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Don't worry - we can try again or reach out manually. {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (currentStep === 'understanding' || currentStep === 'solutions') ? (
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
 * Utility hook for managing client care flow externally
 * @param {string} clientId - Client ID
 * @returns {Object} Care flow state and controls
 */
export function useClientCareFlow(clientId) {
  const [isOpen, setIsOpen] = useState(false)
  const [careData, setCareData] = useState(null)

  const openCareFlow = (clientData) => {
    setCareData(clientData)
    setIsOpen(true)
  }

  const closeCareFlow = () => {
    setIsOpen(false)
    setCareData(null)
  }

  const handleCareComplete = (result) => {
    // Handle completion with positive reinforcement
    
  }

  return {
    isOpen,
    careData,
    openCareFlow,
    closeCareFlow,
    handleCareComplete
  }
}
'use client'

import { 
  InformationCircleIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { EnhancedNoShowPolicy } from '@/lib/booking-rules-engine/EnhancedNoShowPolicy'

export default function PolicyPreview({ rules, sampleService = { name: "Haircut", price: 45, duration: 60 } }) {
  const formatTime = (hours) => {
    if (hours === 0) return 'anytime'
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  const formatFee = (amount, type) => {
    if (amount === 0) return 'No fee'
    if (type === 'percentage') return `${amount}% of service price`
    return `$${amount}`
  }

  const calculateFee = (amount, type, servicePrice) => {
    if (amount === 0) return 0
    if (type === 'percentage') return Math.round((amount / 100) * servicePrice)
    return amount
  }

  const cancellationFee = calculateFee(rules.cancellationFee, rules.cancellationFeeType, sampleService.price)
  const noShowFee = calculateFee(rules.noShowFee, rules.noShowFeeType, sampleService.price)
  const depositAmount = calculateFee(rules.depositAmount, rules.depositType, sampleService.price)

  // Initialize enhanced no-show policy for advanced preview
  const enhancedPolicy = new EnhancedNoShowPolicy(rules)
  
  // Generate sample penalty scenarios
  const sampleScenarios = [
    {
      type: 'First-time client',
      client: { noShowStrikes: 0, totalBookings: 1, loyaltyMonths: 0 },
      icon: UserGroupIcon,
      color: 'blue'
    },
    {
      type: 'Regular client (2nd no-show)',
      client: { noShowStrikes: 1, totalBookings: 15, loyaltyMonths: 8 },
      icon: ExclamationTriangleIcon,
      color: 'yellow'
    },
    {
      type: 'Loyal client (3rd no-show)',
      client: { noShowStrikes: 2, totalBookings: 25, loyaltyMonths: 12 },
      icon: ShieldCheckIcon,
      color: 'green'
    },
    {
      type: 'Repeat offender',
      client: { noShowStrikes: 3, totalBookings: 8, loyaltyMonths: 2 },
      icon: XCircleIcon,
      color: 'red'
    }
  ].map(scenario => {
    const penalty = enhancedPolicy.calculateNoShowPenalty(sampleService, scenario.client)
    const explanation = enhancedPolicy.generatePenaltyExplanation(penalty, { date: 'your appointment' })
    return { ...scenario, penalty, explanation }
  })

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
      <div className="flex items-start">
        <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-3">
            Client Booking Experience Preview
          </h4>
          <div className="text-sm text-blue-800 space-y-3">
            
            {/* Service Info */}
            <div className="bg-white/50 p-3 rounded border border-blue-200">
              <div className="font-medium mb-2">Booking: {sampleService.name}</div>
              <div className="text-xs text-blue-700 grid grid-cols-2 gap-2">
                <span>Duration: {sampleService.duration} mins</span>
                <span>Price: ${sampleService.price}</span>
              </div>
            </div>

            {/* Booking Requirements */}
            <div>
              <div className="font-medium text-blue-900 mb-2 flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                Booking Requirements
              </div>
              <ul className="space-y-1 text-xs">
                {rules.minAdvanceBooking > 0 && (
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-3 w-3 text-green-600 mr-2" />
                    Book at least {Math.floor(rules.minAdvanceBooking / 60)} hours in advance
                  </li>
                )}
                {!rules.allowSameDayBooking && (
                  <li className="flex items-center">
                    <XCircleIcon className="h-3 w-3 text-red-600 mr-2" />
                    Same-day booking not available
                  </li>
                )}
                {rules.requireDeposit && (
                  <li className="flex items-center">
                    <CurrencyDollarIcon className="h-3 w-3 text-yellow-600 mr-2" />
                    ${depositAmount} deposit required to secure booking
                  </li>
                )}
                {rules.requireFullPayment && (
                  <li className="flex items-center">
                    <CurrencyDollarIcon className="h-3 w-3 text-yellow-600 mr-2" />
                    Full payment required at booking
                  </li>
                )}
              </ul>
            </div>

            {/* Cancellation Policy */}
            <div>
              <div className="font-medium text-blue-900 mb-2 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                Cancellation Policy
              </div>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center">
                  <ClockIcon className="h-3 w-3 text-blue-600 mr-2" />
                  Cancel {formatTime(rules.cancellationWindow)} before appointment
                </li>
                {cancellationFee > 0 && (
                  <li className="flex items-center">
                    <CurrencyDollarIcon className="h-3 w-3 text-orange-600 mr-2" />
                    Late cancellation fee: ${cancellationFee}
                  </li>
                )}
                {rules.allowRescheduling && (
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-3 w-3 text-green-600 mr-2" />
                    Rescheduling allowed {formatTime(rules.rescheduleWindow)} before appointment
                  </li>
                )}
              </ul>
            </div>

            {/* Enhanced No-Show Policy */}
            {rules.noShowFee > 0 && (
              <div>
                <div className="font-medium text-blue-900 mb-2 flex items-center">
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  Enhanced No-Show Policy
                </div>
                
                {/* Basic Policy Info */}
                <div className="mb-3">
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-center">
                      <CurrencyDollarIcon className="h-3 w-3 text-red-600 mr-2" />
                      Base no-show fee: ${noShowFee} (adjusted by client history)
                    </li>
                    {rules.noShowStrikeLimit > 0 && (
                      <li className="flex items-center">
                        <ExclamationTriangleIcon className="h-3 w-3 text-orange-600 mr-2" />
                        {rules.noShowStrikeLimit} no-shows result in booking restrictions
                      </li>
                    )}
                    {rules.enableGracePeriod !== false && (
                      <li className="flex items-center">
                        <CheckCircleIcon className="h-3 w-3 text-green-600 mr-2" />
                        First-time clients receive grace period (warning only)
                      </li>
                    )}
                    {rules.enableLoyaltyDiscount !== false && (
                      <li className="flex items-center">
                        <ShieldCheckIcon className="h-3 w-3 text-blue-600 mr-2" />
                        Loyal clients receive 25% discount on fees
                      </li>
                    )}
                  </ul>
                </div>

                {/* Enhanced Penalty Preview */}
                <div className="bg-white/60 border border-blue-200 rounded p-3">
                  <div className="text-xs font-medium text-blue-800 mb-2">Fee Examples by Client Type:</div>
                  <div className="space-y-2">
                    {sampleScenarios.slice(0, 3).map((scenario, index) => {
                      const Icon = scenario.icon
                      return (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <div className="flex items-center">
                            <Icon className={`h-3 w-3 text-${scenario.color}-600 mr-2`} />
                            <span className="text-blue-800">{scenario.type}</span>
                          </div>
                          <div className={`font-medium ${
                            scenario.penalty.gracePeriodApplied ? 'text-green-600' :
                            scenario.penalty.loyaltyDiscountApplied ? 'text-blue-600' :
                            scenario.penalty.penaltyLevel === 'high' ? 'text-red-600' :
                            'text-orange-600'
                          }`}>
                            {scenario.penalty.gracePeriodApplied ? 'Warning Only' : `$${scenario.penalty.feeAmount}`}
                            {scenario.penalty.loyaltyDiscountApplied && (
                              <span className="text-blue-500 ml-1">(25% off)</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Service-Based Adjustments */}
                  {(rules.enableServiceAdjustments !== false) && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <div className="text-xs text-blue-700">
                        <span className="font-medium">Smart Adjustments:</span>
                        {sampleService.duration >= 60 && <span className="ml-1">+25% for long services,</span>}
                        {sampleService.price >= 100 && <span className="ml-1">+30% for premium services,</span>}
                        <span className="ml-1">Lower fees for quick services</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Required Information */}
            <div>
              <div className="font-medium text-blue-900 mb-2">Required Information</div>
              <div className="text-xs flex flex-wrap gap-2">
                {rules.collectClientInfo.map((field) => (
                  <span key={field} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </span>
                ))}
              </div>
            </div>

            {/* Notifications */}
            {(rules.sendReminderEmail || rules.sendReminderSMS) && (
              <div>
                <div className="font-medium text-blue-900 mb-2">You'll receive</div>
                <ul className="space-y-1 text-xs">
                  {rules.sendConfirmationEmail && (
                    <li className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-600 mr-2" />
                      Email confirmation
                    </li>
                  )}
                  {rules.sendReminderEmail && (
                    <li className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-600 mr-2" />
                      Email reminder {formatTime(rules.reminderTiming)} before appointment
                    </li>
                  )}
                  {rules.sendReminderSMS && (
                    <li className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-600 mr-2" />
                      Text reminder {formatTime(rules.reminderTiming)} before appointment
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
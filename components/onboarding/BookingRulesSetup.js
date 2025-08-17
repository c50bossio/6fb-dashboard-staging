'use client'

import { useState, useEffect } from 'react'
import {
  ClockIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  BellIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

export default function BookingRulesSetup({ data = {}, updateData, onComplete }) {
  const [rules, setRules] = useState({
    // Booking window
    minAdvanceBooking: data.minAdvanceBooking || 60, // minutes
    maxAdvanceBooking: data.maxAdvanceBooking || 30, // days
    allowSameDayBooking: data.allowSameDayBooking !== undefined ? data.allowSameDayBooking : true,
    
    // Cancellation policy
    cancellationWindow: data.cancellationWindow || 24, // hours
    cancellationFee: data.cancellationFee || 0, // percentage or fixed
    cancellationFeeType: data.cancellationFeeType || 'percentage',
    requireCancellationReason: data.requireCancellationReason || false,
    
    // No-show policy  
    noShowFee: data.noShowFee || 25, // percentage or fixed
    noShowFeeType: data.noShowFeeType || 'percentage',
    noShowStrikeLimit: data.noShowStrikeLimit || 3,
    noShowStrikePeriod: data.noShowStrikePeriod || 90, // days
    blockAfterNoShows: data.blockAfterNoShows || false,
    
    // Payment requirements
    requireDeposit: data.requireDeposit || false,
    depositAmount: data.depositAmount || 20, // percentage or fixed
    depositType: data.depositType || 'percentage',
    requireFullPayment: data.requireFullPayment || false,
    
    // Booking limits
    maxBookingsPerDay: data.maxBookingsPerDay || 0, // 0 = unlimited
    maxBookingsPerWeek: data.maxBookingsPerWeek || 0,
    maxActiveBookings: data.maxActiveBookings || 5,
    allowDoubleBooking: data.allowDoubleBooking || false,
    
    // Client requirements
    requirePhoneVerification: data.requirePhoneVerification || false,
    requireEmailConfirmation: data.requireEmailConfirmation || true,
    collectClientInfo: data.collectClientInfo || ['name', 'phone', 'email'],
    requireTermsAcceptance: data.requireTermsAcceptance || true,
    
    // Notifications
    sendConfirmationEmail: data.sendConfirmationEmail !== undefined ? data.sendConfirmationEmail : true,
    sendConfirmationSMS: data.sendConfirmationSMS || false,
    sendReminderEmail: data.sendReminderEmail !== undefined ? data.sendReminderEmail : true,
    sendReminderSMS: data.sendReminderSMS || false,
    reminderTiming: data.reminderTiming || 24, // hours before appointment
    
    // Special rules
    allowWaitlist: data.allowWaitlist || true,
    allowRescheduling: data.allowRescheduling !== undefined ? data.allowRescheduling : true,
    rescheduleWindow: data.rescheduleWindow || 12, // hours
    priorityBooking: data.priorityBooking || false,
    membershipRequired: data.membershipRequired || false
  })

  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Policy templates
  const policyTemplates = [
    {
      id: 'flexible',
      name: 'Flexible',
      icon: '🤝',
      description: 'Customer-friendly with easy cancellations',
      rules: {
        cancellationWindow: 2,
        cancellationFee: 0,
        noShowFee: 0,
        requireDeposit: false,
        allowSameDayBooking: true,
        allowRescheduling: true
      }
    },
    {
      id: 'balanced',
      name: 'Balanced',
      icon: '⚖️',
      description: 'Fair policies for both parties',
      rules: {
        cancellationWindow: 24,
        cancellationFee: 0,
        noShowFee: 25,
        noShowFeeType: 'percentage',
        requireDeposit: false,
        allowSameDayBooking: true,
        allowRescheduling: true
      }
    },
    {
      id: 'strict',
      name: 'Strict',
      icon: '🔒',
      description: 'Minimize no-shows and late cancellations',
      rules: {
        cancellationWindow: 48,
        cancellationFee: 50,
        cancellationFeeType: 'percentage',
        noShowFee: 100,
        noShowFeeType: 'percentage',
        requireDeposit: true,
        depositAmount: 30,
        depositType: 'percentage',
        allowSameDayBooking: false,
        blockAfterNoShows: true
      }
    }
  ]

  // Client info options
  const clientInfoOptions = [
    { value: 'name', label: 'Full Name', required: true },
    { value: 'phone', label: 'Phone Number', required: true },
    { value: 'email', label: 'Email Address', required: true },
    { value: 'address', label: 'Address', required: false },
    { value: 'birthday', label: 'Birthday', required: false },
    { value: 'notes', label: 'Special Notes', required: false }
  ]

  // Handle rule changes
  const handleRuleChange = (field, value) => {
    setRules(prev => ({ ...prev, [field]: value }))
  }

  // Apply template
  const applyTemplate = (template) => {
    setRules(prev => ({ ...prev, ...template.rules }))
    setSelectedPolicy(template.id)
  }

  // Toggle client info collection
  const toggleClientInfo = (field) => {
    setRules(prev => ({
      ...prev,
      collectClientInfo: prev.collectClientInfo.includes(field)
        ? prev.collectClientInfo.filter(f => f !== field)
        : [...prev.collectClientInfo, field]
    }))
  }

  // Calculate policy score (how strict/flexible)
  const calculatePolicyScore = () => {
    let score = 0
    
    // Cancellation policy
    if (rules.cancellationWindow <= 12) score += 2
    else if (rules.cancellationWindow <= 24) score += 1
    else score -= 1
    
    if (rules.cancellationFee === 0) score += 2
    else if (rules.cancellationFee <= 25) score += 1
    else score -= 1
    
    // No-show policy
    if (rules.noShowFee === 0) score += 2
    else if (rules.noShowFee <= 50) score += 1
    else score -= 1
    
    // Deposit requirements
    if (!rules.requireDeposit) score += 2
    else score -= 1
    
    // Booking flexibility
    if (rules.allowSameDayBooking) score += 1
    if (rules.allowRescheduling) score += 1
    
    return score
  }

  const policyScore = calculatePolicyScore()
  const policyType = policyScore >= 5 ? 'Flexible' : policyScore >= 0 ? 'Balanced' : 'Strict'

  // Update parent data
  useEffect(() => {
    if (updateData) {
      updateData({ bookingRules: rules })
    }
  }, [rules])

  // Handle completion
  const handleComplete = () => {
    if (onComplete) {
      onComplete({ bookingRules: rules })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Booking Rules & Policies</h3>
        <p className="text-sm text-gray-600 mt-1">
          Set rules to manage bookings and protect your business.
        </p>
      </div>

      {/* Policy Templates */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quick Policy Templates
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {policyTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedPolicy === template.id
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start">
                <span className="text-2xl mr-3">{template.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Policy Score Indicator */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Current Policy Type</h4>
            <p className="text-sm text-gray-600 mt-1">
              Your policies are currently <span className="font-semibold">{policyType}</span>
            </p>
          </div>
          <div className={`text-2xl ${
            policyType === 'Flexible' ? 'text-green-600' :
            policyType === 'Balanced' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {policyType === 'Flexible' ? '😊' :
             policyType === 'Balanced' ? '⚖️' :
             '🔒'}
          </div>
        </div>
      </div>

      {/* Booking Window */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
          Booking Window
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Advance Booking
            </label>
            <select
              value={rules.minAdvanceBooking}
              onChange={(e) => handleRuleChange('minAdvanceBooking', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="0">No minimum</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
              <option value="1440">24 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Advance Booking
            </label>
            <select
              value={rules.maxAdvanceBooking}
              onChange={(e) => handleRuleChange('maxAdvanceBooking', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="7">1 week</option>
              <option value="14">2 weeks</option>
              <option value="30">1 month</option>
              <option value="60">2 months</option>
              <option value="90">3 months</option>
              <option value="180">6 months</option>
            </select>
          </div>
        </div>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={rules.allowSameDayBooking}
            onChange={(e) => handleRuleChange('allowSameDayBooking', e.target.checked)}
            className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Allow same-day bookings</span>
        </label>
      </div>

      {/* Cancellation Policy */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-gray-400" />
          Cancellation Policy
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Window
            </label>
            <select
              value={rules.cancellationWindow}
              onChange={(e) => handleRuleChange('cancellationWindow', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="0">Anytime</option>
              <option value="1">1 hour before</option>
              <option value="2">2 hours before</option>
              <option value="4">4 hours before</option>
              <option value="12">12 hours before</option>
              <option value="24">24 hours before</option>
              <option value="48">48 hours before</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Fee
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={rules.cancellationFee}
                onChange={(e) => handleRuleChange('cancellationFee', Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                min="0"
                max={rules.cancellationFeeType === 'percentage' ? 100 : 1000}
              />
              <select
                value={rules.cancellationFeeType}
                onChange={(e) => handleRuleChange('cancellationFeeType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="percentage">%</option>
                <option value="fixed">$</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rules.allowRescheduling}
              onChange={(e) => handleRuleChange('allowRescheduling', e.target.checked)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Allow rescheduling</span>
          </label>

          {rules.allowRescheduling && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reschedule Window
              </label>
              <select
                value={rules.rescheduleWindow}
                onChange={(e) => handleRuleChange('rescheduleWindow', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="1">1 hour before</option>
                <option value="2">2 hours before</option>
                <option value="4">4 hours before</option>
                <option value="12">12 hours before</option>
                <option value="24">24 hours before</option>
              </select>
            </div>
          )}

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rules.requireCancellationReason}
              onChange={(e) => handleRuleChange('requireCancellationReason', e.target.checked)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require cancellation reason</span>
          </label>
        </div>
      </div>

      {/* No-Show Policy */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <XCircleIcon className="h-5 w-5 mr-2 text-gray-400" />
          No-Show Policy
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              No-Show Fee
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={rules.noShowFee}
                onChange={(e) => handleRuleChange('noShowFee', Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                min="0"
                max={rules.noShowFeeType === 'percentage' ? 100 : 1000}
              />
              <select
                value={rules.noShowFeeType}
                onChange={(e) => handleRuleChange('noShowFeeType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="percentage">%</option>
                <option value="fixed">$</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strike Limit
            </label>
            <select
              value={rules.noShowStrikeLimit}
              onChange={(e) => handleRuleChange('noShowStrikeLimit', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="0">No limit</option>
              <option value="1">1 strike</option>
              <option value="2">2 strikes</option>
              <option value="3">3 strikes</option>
              <option value="5">5 strikes</option>
            </select>
          </div>
        </div>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={rules.blockAfterNoShows}
            onChange={(e) => handleRuleChange('blockAfterNoShows', e.target.checked)}
            className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">
            Block clients after reaching strike limit
          </span>
        </label>
      </div>

      {/* Payment Requirements */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <CurrencyDollarIcon className="h-5 w-5 mr-2 text-gray-400" />
          Payment Requirements
        </h4>
        
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rules.requireDeposit}
              onChange={(e) => handleRuleChange('requireDeposit', e.target.checked)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require deposit to book</span>
          </label>

          {rules.requireDeposit && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deposit Amount
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={rules.depositAmount}
                  onChange={(e) => handleRuleChange('depositAmount', Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  min="0"
                  max={rules.depositType === 'percentage' ? 100 : 1000}
                />
                <select
                  value={rules.depositType}
                  onChange={(e) => handleRuleChange('depositType', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">$</option>
                </select>
              </div>
            </div>
          )}

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rules.requireFullPayment}
              onChange={(e) => handleRuleChange('requireFullPayment', e.target.checked)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require full payment at booking</span>
          </label>
        </div>
      </div>

      {/* Client Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <UserGroupIcon className="h-5 w-5 mr-2 text-gray-400" />
          Client Information
        </h4>
        
        <div className="space-y-2">
          {clientInfoOptions.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="checkbox"
                checked={rules.collectClientInfo.includes(option.value)}
                onChange={() => toggleClientInfo(option.value)}
                disabled={option.required}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                {option.label}
                {option.required && <span className="text-gray-400 ml-1">(Required)</span>}
              </span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rules.requirePhoneVerification}
              onChange={(e) => handleRuleChange('requirePhoneVerification', e.target.checked)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require phone verification</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rules.requireEmailConfirmation}
              onChange={(e) => handleRuleChange('requireEmailConfirmation', e.target.checked)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require email confirmation</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rules.requireTermsAcceptance}
              onChange={(e) => handleRuleChange('requireTermsAcceptance', e.target.checked)}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Require terms acceptance</span>
          </label>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <BellIcon className="h-5 w-5 mr-2 text-gray-400" />
          Notifications
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rules.sendConfirmationEmail}
                onChange={(e) => handleRuleChange('sendConfirmationEmail', e.target.checked)}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Confirmation emails</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rules.sendReminderEmail}
                onChange={(e) => handleRuleChange('sendReminderEmail', e.target.checked)}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Reminder emails</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rules.sendConfirmationSMS}
                onChange={(e) => handleRuleChange('sendConfirmationSMS', e.target.checked)}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Confirmation SMS</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rules.sendReminderSMS}
                onChange={(e) => handleRuleChange('sendReminderSMS', e.target.checked)}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Reminder SMS</span>
            </label>
          </div>
        </div>

        {(rules.sendReminderEmail || rules.sendReminderSMS) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send reminder
            </label>
            <select
              value={rules.reminderTiming}
              onChange={(e) => handleRuleChange('reminderTiming', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="1">1 hour before</option>
              <option value="2">2 hours before</option>
              <option value="4">4 hours before</option>
              <option value="24">24 hours before</option>
              <option value="48">48 hours before</option>
            </select>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max bookings per day
                </label>
                <input
                  type="number"
                  value={rules.maxBookingsPerDay}
                  onChange={(e) => handleRuleChange('maxBookingsPerDay', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  min="0"
                  placeholder="0 = unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max bookings per week
                </label>
                <input
                  type="number"
                  value={rules.maxBookingsPerWeek}
                  onChange={(e) => handleRuleChange('maxBookingsPerWeek', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  min="0"
                  placeholder="0 = unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max active bookings
                </label>
                <input
                  type="number"
                  value={rules.maxActiveBookings}
                  onChange={(e) => handleRuleChange('maxActiveBookings', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  min="0"
                  placeholder="0 = unlimited"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rules.allowWaitlist}
                  onChange={(e) => handleRuleChange('allowWaitlist', e.target.checked)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Allow waitlist for full slots</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rules.allowDoubleBooking}
                  onChange={(e) => handleRuleChange('allowDoubleBooking', e.target.checked)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Allow double booking</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rules.priorityBooking}
                  onChange={(e) => handleRuleChange('priorityBooking', e.target.checked)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Enable priority booking for VIP clients</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rules.membershipRequired}
                  onChange={(e) => handleRuleChange('membershipRequired', e.target.checked)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Membership required to book</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">
              Policy Recommendations
            </h3>
            <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
              <li>Start with flexible policies and adjust based on experience</li>
              <li>Clear cancellation policies reduce no-shows</li>
              <li>Deposits are recommended for high-value services</li>
              <li>Reminder notifications can reduce missed appointments by 50%</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className="flex justify-center items-center pt-4">
        <div className="text-sm text-gray-500">
          Policy type: <span className="font-medium">{policyType}</span>
        </div>
      </div>
    </div>
  )
}
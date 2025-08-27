'use client'

import { useState } from 'react'
import PolicyTemplateGenerator from '@/components/booking/PolicyTemplateGenerator'

// Sample booking rules for testing
const sampleRules = {
  minAdvanceBooking: 120, // 2 hours
  maxAdvanceBooking: 30, // 30 days
  allowSameDayBooking: false,
  cancellationWindow: 24, // 24 hours
  cancellationFee: 25, // 25%
  cancellationFeeType: 'percentage',
  noShowFee: 50, // 50%
  noShowFeeType: 'percentage',
  noShowStrikeLimit: 3,
  requireDeposit: true,
  depositAmount: 20, // 20%
  depositType: 'percentage',
  requireFullPayment: false,
  collectClientInfo: ['name', 'phone', 'email'],
  requireTermsAcceptance: true,
  sendConfirmationEmail: true,
  sendReminderEmail: true,
  sendConfirmationSMS: false,
  sendReminderSMS: true,
  reminderTiming: 24, // 24 hours
  allowRescheduling: true,
  rescheduleWindow: 12 // 12 hours
}

const sampleBusinessInfo = {
  name: 'Elite Cuts Barbershop',
  phone: '(555) 987-6543',
  email: 'hello@elitecuts.com',
  website: 'elitecuts.com',
  address: '123 Main Street, Downtown, NY 10001'
}

export default function TestTemplatesPage() {
  const [rules, setRules] = useState(sampleRules)
  const [businessInfo, setBusinessInfo] = useState(sampleBusinessInfo)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Communication Templates Generator Test
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Testing the PolicyTemplateGenerator component with sample booking rules
          </p>
        </div>

        {/* Sample Rules Display */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Test Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Advance Booking:</strong> {Math.floor(rules.minAdvanceBooking / 60)} hours minimum
            </div>
            <div>
              <strong>Cancellation Window:</strong> {rules.cancellationWindow} hours
            </div>
            <div>
              <strong>Cancellation Fee:</strong> {rules.cancellationFee}% of service price
            </div>
            <div>
              <strong>No-Show Fee:</strong> {rules.noShowFee}% of service price
            </div>
            <div>
              <strong>Deposit Required:</strong> {rules.requireDeposit ? `${rules.depositAmount}%` : 'No'}
            </div>
            <div>
              <strong>Rescheduling:</strong> {rules.allowRescheduling ? `Up to ${rules.rescheduleWindow}h before` : 'Not allowed'}
            </div>
          </div>
        </div>

        {/* Template Generator */}
        <div className="bg-white rounded-lg shadow p-6">
          <PolicyTemplateGenerator 
            rules={rules}
            businessInfo={businessInfo}
            className="w-full"
          />
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Testing Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Try different communication tones (Professional, Friendly, Strict)</li>
            <li>• Select various template types and copy the generated content</li>
            <li>• Notice how the templates adapt to the current booking rules</li>
            <li>• Check that business information is properly inserted</li>
            <li>• Test the copy-to-clipboard functionality</li>
            <li>• View the preview mode to see formatted output</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
'use client'

import { 
  UserPlusIcon, 
  CalendarIcon, 
  ArrowRightIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function EmptyBarberState({ onAddBarber, shopName = 'your barbershop', onboardingIncomplete = false }) {
  const [showQuickStart, setShowQuickStart] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center h-[500px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Icon */}
        <div className="mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-olive-100 rounded-full flex items-center justify-center mx-auto">
              <UserPlusIcon className="w-10 h-10 text-olive-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-gold-600" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {onboardingIncomplete ? 'Almost Ready to Book!' : 'Ready to Start Booking?'}
        </h3>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          {onboardingIncomplete 
            ? `Complete your barbershop setup and add your first barber to start accepting appointments.`
            : `Add your first barber to ${shopName} and start accepting appointments. You're just one step away from managing your calendar!`
          }
        </p>

        {/* Main CTA */}
        <button
          onClick={onAddBarber}
          className="inline-flex items-center px-6 py-3 bg-olive-600 hover:bg-olive-700 text-white font-semibold rounded-lg transition-colors shadow-sm mb-4"
        >
          <UserPlusIcon className="w-5 h-5 mr-2" />
          {onboardingIncomplete ? 'Complete Setup' : 'Add Your First Barber'}
          <ArrowRightIcon className="w-4 h-4 ml-2" />
        </button>

        {/* Quick Start Toggle */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowQuickStart(!showQuickStart)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showQuickStart ? 'Hide' : 'Show'} quick start guide
          </button>
        </div>

        {/* Quick Start Guide */}
        {showQuickStart && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 text-left">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-olive-600" />
              Quick Setup Guide
            </h4>
            <ol className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="inline-block w-5 h-5 bg-olive-100 text-olive-600 rounded-full text-xs font-semibold flex items-center justify-center mr-2 mt-0.5">1</span>
                Add barber details (name, specialties, hours)
              </li>
              <li className="flex items-start">
                <span className="inline-block w-5 h-5 bg-olive-100 text-olive-600 rounded-full text-xs font-semibold flex items-center justify-center mr-2 mt-0.5">2</span>
                Set up your services and pricing
              </li>
              <li className="flex items-start">
                <span className="inline-block w-5 h-5 bg-olive-100 text-olive-600 rounded-full text-xs font-semibold flex items-center justify-center mr-2 mt-0.5">3</span>
                Share your booking link with customers
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

// Minimal version for calendar timeline view
export function MinimalEmptyBarberState({ onAddBarber }) {
  return (
    <div className="flex items-center justify-center py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 margin-4">
      <div className="text-center">
        <UserPlusIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-3">No barbers added yet</p>
        <button
          onClick={onAddBarber}
          className="inline-flex items-center px-4 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <UserPlusIcon className="w-4 h-4 mr-1" />
          Add Barber
        </button>
      </div>
    </div>
  )
}
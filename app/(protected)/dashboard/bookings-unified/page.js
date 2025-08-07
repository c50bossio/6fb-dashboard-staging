'use client'

import { 
  CalendarDaysIcon,
  SparklesIcon,
  ChartBarIcon,
  CogIcon,
  ClockIcon,
  UserGroupIcon,
  PlusIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { useState, lazy, Suspense } from 'react'

import TabbedPageLayout, { TabContent, EmptyStates } from '../../../../components/layout/TabbedPageLayout'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

// Lazy load the different booking components
const BookingCalendar = lazy(() => import('../../../../components/calendar/BookingCalendar'))
const AppointmentCalendar = lazy(() => import('../../../../components/calendar/AppointmentCalendar'))
const SimpleBookingCalendar = lazy(() => import('../../../../components/calendar/SimpleBookingCalendar'))

// Mock AI-enhanced booking component
const AIBookingInterface = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <SparklesIcon className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI-Powered Smart Scheduling</h3>
      </div>
      <p className="text-gray-700 mb-4">
        Intelligent booking system that optimizes appointment scheduling based on barber availability, 
        customer preferences, and historical booking patterns.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded border">
          <h4 className="font-medium text-gray-900">Smart Suggestions</h4>
          <p className="text-sm text-gray-600 mt-1">AI suggests optimal time slots</p>
        </div>
        <div className="bg-white p-4 rounded border">
          <h4 className="font-medium text-gray-900">Conflict Detection</h4>
          <p className="text-sm text-gray-600 mt-1">Prevents double-bookings automatically</p>
        </div>
        <div className="bg-white p-4 rounded border">
          <h4 className="font-medium text-gray-900">Revenue Optimization</h4>
          <p className="text-sm text-gray-600 mt-1">Maximizes daily revenue potential</p>
        </div>
      </div>
    </div>
    
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded"></div>}>
        <AppointmentCalendar />
      </Suspense>
    </div>
  </div>
)

// Booking Analytics component
const BookingAnalytics = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
              <dd className="text-lg font-medium text-gray-900">1,247</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ClockIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
              <dd className="text-lg font-medium text-gray-900">94.2%</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <UserGroupIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Repeat Customers</dt>
              <dd className="text-lg font-medium text-gray-900">78%</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ChartBarIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Avg Revenue/Day</dt>
              <dd className="text-lg font-medium text-gray-900">$1,247</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
    
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Trends</h3>
      <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
        <p className="text-gray-500">Booking analytics chart would go here</p>
      </div>
    </div>
  </div>
)

// Settings component
const BookingSettings = () => (
  <div className="space-y-6">
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Configuration</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Appointment Duration</label>
          <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Advance Booking Limit</label>
          <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            <option value="7">1 week</option>
            <option value="14">2 weeks</option>
            <option value="30">1 month</option>
            <option value="90">3 months</option>
          </select>
        </div>
      </div>
    </div>
  </div>
)

export default function UnifiedBookingsPage() {
  const { user, profile } = useAuth()

  // Define all booking tabs
  const bookingTabs = [
    {
      id: 'ai-enhanced',
      name: 'AI Enhanced',
      icon: SparklesIcon,
      badge: 'Smart',
      description: 'Intelligent booking system with AI-powered optimization and conflict detection.',
      features: [
        'Smart time slot suggestions',
        'Automatic conflict prevention', 
        'Revenue optimization',
        'Customer preference learning'
      ],
      component: <AIBookingInterface />
    },
    {
      id: 'calendar-view',
      name: 'Calendar View',
      icon: CalendarDaysIcon,
      description: 'Full-featured calendar interface with drag-and-drop scheduling and resource management.',
      features: [
        'Multi-barber resource view',
        'Drag and drop scheduling',
        'Real-time availability',
        'Recurring appointments'
      ],
      component: (
        <TabContent loading={false}>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded"></div>}>
              <BookingCalendar />
            </Suspense>
          </div>
        </TabContent>
      )
    },
    {
      id: 'simple-view',
      name: 'Simple View',
      icon: ClockIcon,
      description: 'Streamlined booking interface focusing on essential scheduling functionality.',
      features: [
        'Clean, minimal interface',
        'Fast booking creation',
        'Essential features only',
        'Mobile optimized'
      ],
      component: (
        <TabContent loading={false}>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded"></div>}>
              <SimpleBookingCalendar />
            </Suspense>
          </div>
        </TabContent>
      )
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: ChartBarIcon,
      description: 'Comprehensive booking analytics and performance insights.',
      features: [
        'Booking completion rates',
        'Revenue analytics',
        'Customer retention metrics',
        'Peak time analysis'
      ],
      component: <BookingAnalytics />
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: CogIcon,
      description: 'Configure booking system preferences and business rules.',
      features: [
        'Appointment duration settings',
        'Availability rules',
        'Notification preferences',
        'Business hour configuration'
      ],
      component: <BookingSettings />
    }
  ]

  // Page actions
  const pageActions = (
    <div className="flex items-center space-x-3">
      <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        <ClockIcon className="h-4 w-4 mr-2" />
        Quick Book
      </button>
      <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        <PlusIcon className="h-4 w-4 mr-2" />
        New Appointment
      </button>
    </div>
  )

  return (
    <TabbedPageLayout
      title="Smart Booking System"
      description="Manage appointments with AI-powered scheduling and analytics"
      icon={CalendarDaysIcon}
      tabs={bookingTabs}
      defaultTab="ai-enhanced"
      actions={pageActions}
      fullWidth={true}
    />
  )
}
'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamic imports to reduce initial bundle size
const EnhancedProfessionalCalendar = dynamic(() => import('./EnhancedProfessionalCalendar'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse">
      <div className="h-96 bg-gray-200 rounded-lg"></div>
    </div>
  )
})

const SimpleFullCalendar = dynamic(() => import('./SimpleFullCalendar'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse">
      <div className="h-96 bg-gray-200 rounded-lg"></div>
    </div>
  )
})

const AppointmentBookingModal = dynamic(() => import('./AppointmentBookingModal'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">Loading...</div>
})

export function DynamicEnhancedCalendar(props) {
  return (
    <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>}>
      <EnhancedProfessionalCalendar {...props} />
    </Suspense>
  )
}

export function DynamicSimpleCalendar(props) {
  return (
    <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>}>
      <SimpleFullCalendar {...props} />
    </Suspense>
  )
}

export function DynamicBookingModal(props) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">Loading...</div>}>
      <AppointmentBookingModal {...props} />
    </Suspense>
  )
}

export default DynamicEnhancedCalendar
'use client'

import SimpleFullCalendar from '../../components/calendar/SimpleFullCalendar'

export default function TestRRulePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔄 RRule Plugin Test Page
        </h1>
        <SimpleFullCalendar />
      </div>
    </div>
  )
}
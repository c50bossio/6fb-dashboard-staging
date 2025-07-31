'use client'

import { useState } from 'react'
import { ChartBarIcon } from '@heroicons/react/outline'

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">6FB Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive performance analytics for all 6 AI agents</p>
      </div>

      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center">
          <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Overview</h2>
          <p className="text-gray-600">Your analytics dashboard is loading...</p>
        </div>
      </div>
    </div>
  )
}
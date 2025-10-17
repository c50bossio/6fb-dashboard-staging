'use client'

import { useRouter } from 'next/navigation'
import { ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import SettingsSection from './SettingsSection'

export default function NoShowSettings() {
  const router = useRouter()
  
  return (
    <SettingsSection 
      title="No-Show Management"
      description="Configure policies for handling no-shows and late cancellations"
    >
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <ExclamationTriangleIcon className="h-8 w-8 text-amber-500 mr-3" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              No-Show & Late Cancellation Policies
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage strike systems, fees, grace periods, and automated workflows
            </p>
          </div>
        </div>
        
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Strike System</h4>
              <p className="text-sm text-gray-600">
                Configure how many no-shows lead to blocking and recovery requirements
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Fee Management</h4>
              <p className="text-sm text-gray-600">
                Set no-show and late cancellation fees with automated collection
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Grace Periods</h4>
              <p className="text-sm text-gray-600">
                Define different grace periods for new, regular, VIP, and loyal clients
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Recovery Workflows</h4>
              <p className="text-sm text-gray-600">
                Help blocked clients recover their booking privileges
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => router.push('/shop/settings/booking?tab=no-show')}
              className="w-full flex items-center justify-center px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <span>Configure No-Show Management</span>
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              Access comprehensive no-show management including analytics, automation, and client care flows
            </p>
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
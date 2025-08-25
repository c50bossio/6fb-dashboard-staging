'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  CurrencyDollarIcon, 
  ClockIcon, 
  UserGroupIcon 
} from '@heroicons/react/24/outline'

// Utility function for currency formatting
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0)
}

export default function PayrollDashboard({ staff = [], metrics = {} }) {
  const [loading, setLoading] = useState(false)

  // Calculate aggregate payroll metrics
  const boothRentDue = staff
    .filter(s => s.financial_model === 'booth_rent' || s.financial_model === 'hybrid')
    .reduce((sum, s) => sum + (s.booth_rent_amount || 0), 0)

  const staffCounts = {
    commission: staff.filter(s => s.financial_model === 'commission').length,
    booth: staff.filter(s => s.financial_model === 'booth_rent').length,
    hybrid: staff.filter(s => s.financial_model === 'hybrid').length
  }

  const handleExportPayroll = () => {
    setLoading(true)
    // TODO: Implement actual export functionality
    setTimeout(() => {
      alert('Export feature coming soon')
      setLoading(false)
    }, 1000)
  }

  const handleProcessPayouts = () => {
    setLoading(true)
    // TODO: Implement actual payout processing
    setTimeout(() => {
      alert('Payout processing coming soon')
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending Commissions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.pendingPayroll)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Booth Rent Due</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(boothRentDue)}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Staff Count</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{staff.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {staffCounts.commission} Commission | 
                {' '}{staffCounts.booth} Booth | 
                {' '}{staffCounts.hybrid} Hybrid
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Compensation Details Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Staff Compensation Details</h3>
          <button 
            onClick={() => window.location.href = '/dashboard/settings?tab=compensation'}
            className="text-sm text-olive-600 hover:text-olive-700 font-medium"
          >
            Configure Compensation →
          </button>
        </div>
        
        {staff.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No staff members configured</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue (30d)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission/Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {member.user?.full_name || member.user?.email || 'Unnamed'}
                      </div>
                      <div className="text-sm text-gray-500">{member.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.financial_model === 'commission' && (
                        <span className="text-sm text-blue-600">
                          {((member.commission_rate || 0.4) * 100).toFixed(0)}% Commission
                        </span>
                      )}
                      {member.financial_model === 'booth_rent' && (
                        <span className="text-sm text-purple-600">
                          Booth Rent
                        </span>
                      )}
                      {member.financial_model === 'hybrid' && (
                        <span className="text-sm text-green-600">
                          Hybrid Model
                        </span>
                      )}
                      {!member.financial_model && (
                        <span className="text-sm text-gray-400">Not configured</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(member.metrics?.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {member.financial_model === 'commission' && (
                        <span className="text-green-600">
                          +{formatCurrency(member.metrics?.pendingCommission)}
                        </span>
                      )}
                      {member.financial_model === 'booth_rent' && (
                        <span className="text-orange-600">
                          -{formatCurrency(member.booth_rent_amount || 1500)}/mo
                        </span>
                      )}
                      {member.financial_model === 'hybrid' && (
                        <span className="text-blue-600">
                          -{formatCurrency(member.hybrid_base_rent || 800)}/mo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.metrics?.pendingCommission > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* Quick Actions */}
      <div className="flex justify-end space-x-4">
        <Button 
          variant="outline" 
          onClick={handleExportPayroll}
          disabled={loading}
        >
          Export Payroll Report
        </Button>
        <Button 
          onClick={handleProcessPayouts}
          disabled={loading}
        >
          Process Payouts
        </Button>
      </div>
    </div>
  )
}
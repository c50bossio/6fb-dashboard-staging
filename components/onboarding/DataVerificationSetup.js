'use client'

import {
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  CalendarDaysIcon,
  ClockIcon,
  EyeIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

// Mock imported data for demonstration
const MOCK_IMPORTED_DATA = {
  customers: [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+1 (555) 123-4567',
      lastVisit: '2024-01-15',
      status: 'verified',
      issues: []
    },
    {
      id: 2,
      name: 'Jane Doe',
      email: 'jane@email.com',
      phone: '555-987-6543',
      lastVisit: '2024-01-10',
      status: 'warning',
      issues: ['Phone format inconsistent']
    },
    {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike.johnson@invalid',
      phone: '',
      lastVisit: '2024-01-05',
      status: 'error',
      issues: ['Invalid email format', 'Missing phone number']
    }
  ],
  appointments: [
    {
      id: 1,
      customerName: 'John Smith',
      service: 'Haircut',
      date: '2024-02-15',
      time: '10:00 AM',
      price: 35,
      status: 'verified',
      issues: []
    },
    {
      id: 2,
      customerName: 'Jane Doe',
      service: 'Haircut & Beard',
      date: '2024-02-16',
      time: '14:30',
      price: 55,
      status: 'warning',
      issues: ['Customer not found in imported customer list']
    }
  ],
  services: [
    {
      id: 1,
      name: 'Haircut',
      duration: 30,
      price: 35,
      status: 'verified',
      issues: []
    },
    {
      id: 2,
      name: 'Beard Trim',
      duration: 20,
      price: 20,
      status: 'verified',
      issues: []
    }
  ]
}

export default function DataVerificationSetup({ onComplete, initialData = {} }) {
  const [importedData, setImportedData] = useState(MOCK_IMPORTED_DATA)
  const [selectedCategory, setSelectedCategory] = useState('customers')
  const [editingItem, setEditingItem] = useState(null)
  const [showDetails, setShowDetails] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)

  const categories = [
    {
      id: 'customers',
      name: 'Customers',
      icon: UserIcon,
      count: importedData.customers?.length || 0,
      verified: importedData.customers?.filter(c => c.status === 'verified').length || 0,
      warnings: importedData.customers?.filter(c => c.status === 'warning').length || 0,
      errors: importedData.customers?.filter(c => c.status === 'error').length || 0
    },
    {
      id: 'appointments',
      name: 'Appointments',
      icon: CalendarDaysIcon,
      count: importedData.appointments?.length || 0,
      verified: importedData.appointments?.filter(a => a.status === 'verified').length || 0,
      warnings: importedData.appointments?.filter(a => a.status === 'warning').length || 0,
      errors: importedData.appointments?.filter(a => a.status === 'error').length || 0
    },
    {
      id: 'services',
      name: 'Services',
      icon: ClockIcon,
      count: importedData.services?.length || 0,
      verified: importedData.services?.filter(s => s.status === 'verified').length || 0,
      warnings: importedData.services?.filter(s => s.status === 'warning').length || 0,
      errors: importedData.services?.filter(s => s.status === 'error').length || 0
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleEditItem = (item) => {
    setEditingItem({ ...item, category: selectedCategory })
  }

  const handleSaveEdit = () => {
    const updatedData = { ...importedData }
    const categoryData = updatedData[selectedCategory]
    const itemIndex = categoryData.findIndex(item => item.id === editingItem.id)
    
    if (itemIndex >= 0) {
      // Mark as verified after editing
      categoryData[itemIndex] = { ...editingItem, status: 'verified', issues: [] }
      setImportedData(updatedData)
    }
    
    setEditingItem(null)
  }

  const handleDeleteItem = (itemId) => {
    const updatedData = { ...importedData }
    updatedData[selectedCategory] = updatedData[selectedCategory].filter(item => item.id !== itemId)
    setImportedData(updatedData)
  }

  const handleFixIssue = (itemId, issueType) => {
    const updatedData = { ...importedData }
    const categoryData = updatedData[selectedCategory]
    const itemIndex = categoryData.findIndex(item => item.id === itemId)
    
    if (itemIndex >= 0) {
      const item = categoryData[itemIndex]
      // Remove the specific issue and update status if no issues remain
      item.issues = item.issues.filter(issue => !issue.toLowerCase().includes(issueType.toLowerCase()))
      if (item.issues.length === 0) {
        item.status = 'verified'
      }
      setImportedData(updatedData)
    }
  }

  const handleCompleteVerification = async () => {
    setIsProcessing(true)

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))

    setVerificationComplete(true)
    setIsProcessing(false)

    // Complete the step after showing success
    setTimeout(() => {
      const verificationData = {
        verificationCompleted: true,
        importedData,
        verificationSummary: {
          totalItems: categories.reduce((sum, cat) => sum + cat.count, 0),
          verifiedItems: categories.reduce((sum, cat) => sum + cat.verified, 0),
          warningsResolved: categories.reduce((sum, cat) => sum + cat.warnings, 0),
          errorsFixed: categories.reduce((sum, cat) => sum + cat.errors, 0)
        },
        completedAt: new Date().toISOString()
      }
      
      onComplete && onComplete(verificationData)
    }, 2000)
  }

  const renderCustomerFields = (item) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={item.name || ''}
          onChange={(e) => setEditingItem({ ...item, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={item.email || ''}
          onChange={(e) => setEditingItem({ ...item, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="tel"
          value={item.phone || ''}
          onChange={(e) => setEditingItem({ ...item, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Last Visit</label>
        <input
          type="date"
          value={item.lastVisit || ''}
          onChange={(e) => setEditingItem({ ...item, lastVisit: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )

  const renderAppointmentFields = (item) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
        <input
          type="text"
          value={item.customerName || ''}
          onChange={(e) => setEditingItem({ ...item, customerName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
        <input
          type="text"
          value={item.service || ''}
          onChange={(e) => setEditingItem({ ...item, service: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          type="date"
          value={item.date || ''}
          onChange={(e) => setEditingItem({ ...item, date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
        <input
          type="time"
          value={item.time || ''}
          onChange={(e) => setEditingItem({ ...item, time: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
        <input
          type="number"
          value={item.price || ''}
          onChange={(e) => setEditingItem({ ...item, price: parseFloat(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )

  const renderServiceFields = (item) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
        <input
          type="text"
          value={item.name || ''}
          onChange={(e) => setEditingItem({ ...item, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
        <input
          type="number"
          value={item.duration || ''}
          onChange={(e) => setEditingItem({ ...item, duration: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
        <input
          type="number"
          value={item.price || ''}
          onChange={(e) => setEditingItem({ ...item, price: parseFloat(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )

  // Show success state
  if (verificationComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckBadgeIcon className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Verified!</h2>
          <p className="text-gray-600">
            Your imported data has been reviewed and verified. 
            You're ready to move to the next step.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckBadgeIcon className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Data</h1>
        <p className="text-lg text-gray-600">
          Review and verify your imported data before finalizing
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {categories.map((category) => {
          const Icon = category.icon
          return (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                cursor-pointer p-6 rounded-xl border-2 transition-all duration-200
                ${selectedCategory === category.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Icon className="h-8 w-8 text-gray-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.count} items</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">✓ Verified</span>
                  <span className="font-semibold">{category.verified}</span>
                </div>
                {category.warnings > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-yellow-600">⚠ Warnings</span>
                    <span className="font-semibold">{category.warnings}</span>
                  </div>
                )}
                {category.errors > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-600">✗ Errors</span>
                    <span className="font-semibold">{category.errors}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            {categories.find(c => c.id === selectedCategory)?.name}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {importedData[selectedCategory]?.map((item, index) => (
            <div key={item.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${getStatusColor(item.status)}
                    `}>
                      {item.status}
                    </span>
                    <h4 className="font-semibold text-gray-900">
                      {selectedCategory === 'customers' ? item.name :
                       selectedCategory === 'appointments' ? `${item.customerName} - ${item.service}` :
                       item.name}
                    </h4>
                  </div>
                  
                  {/* Issues */}
                  {item.issues && item.issues.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm text-red-600 mb-2">Issues found:</div>
                      <div className="space-y-1">
                        {item.issues.map((issue, issueIndex) => (
                          <div key={issueIndex} className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-lg">
                            <span className="text-sm text-red-700">{issue}</span>
                            <button
                              onClick={() => handleFixIssue(item.id, issue)}
                              className="text-xs text-red-600 hover:text-red-800 underline"
                            >
                              Mark Fixed
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Item details */}
                  <div className="text-sm text-gray-600">
                    {selectedCategory === 'customers' && (
                      <div>Email: {item.email} • Phone: {item.phone || 'Not provided'}</div>
                    )}
                    {selectedCategory === 'appointments' && (
                      <div>{item.date} at {item.time} • ${item.price}</div>
                    )}
                    {selectedCategory === 'services' && (
                      <div>{item.duration} min • ${item.price}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setShowDetails({ ...showDetails, [item.id]: !showDetails[item.id] })}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEditItem(item)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Expanded details */}
              {showDetails[item.id] && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <pre className="text-xs text-gray-600 bg-gray-50 rounded p-3 overflow-auto">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit {selectedCategory.slice(0, -1)}
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-6">
                {selectedCategory === 'customers' && renderCustomerFields(editingItem)}
                {selectedCategory === 'appointments' && renderAppointmentFields(editingItem)}
                {selectedCategory === 'services' && renderServiceFields(editingItem)}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <InformationCircleIcon className="h-4 w-4 inline mr-1" />
          Review all items and fix any issues before proceeding
        </div>
        
        <button
          onClick={handleCompleteVerification}
          disabled={isProcessing || categories.some(cat => cat.errors > 0)}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {isProcessing ? (
            <>
              <ClockIcon className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Complete Verification</span>
              <ArrowRightIcon className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Help Information */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">Verification Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Review all items marked with warnings or errors</li>
          <li>• Edit any incorrect information directly</li>
          <li>• Delete duplicate or irrelevant entries</li>
          <li>• All errors must be resolved before proceeding</li>
          <li>• Warnings can be acknowledged if the data is correct</li>
        </ul>
      </div>
    </div>
  )
}
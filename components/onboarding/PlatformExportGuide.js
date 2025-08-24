'use client'

import { useState } from 'react'
import { 
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

export default function PlatformExportGuide({ platform, config, isOpen, onToggle }) {
  const [currentStep, setCurrentStep] = useState(0)

  // Platform-specific export instructions with enhanced details
  const exportGuides = {
    square: {
      title: 'Export from Square Appointments',
      difficulty: 'Easy',
      time: '2-3 minutes',
      steps: [
        {
          title: 'Sign in to Square Dashboard',
          description: 'Go to squareup.com and log in to your account',
          tip: 'Make sure you have admin access to export data',
          screenshot: '/guides/square/step1.png'
        },
        {
          title: 'Navigate to Appointments',
          description: 'From the main dashboard, click on "Appointments" or go to "Payments" → "Appointments"',
          tip: 'You might see this under different menu items depending on your Square plan',
          screenshot: '/guides/square/step2.png'
        },
        {
          title: 'Go to Settings',
          description: 'Click on "Settings" in the Appointments section',
          tip: 'Look for the gear icon or Settings link',
          screenshot: '/guides/square/step3.png'
        },
        {
          title: 'Find History Section',
          description: 'Navigate to the "History" or "Export" section',
          tip: 'This might be under "Data & Privacy" in some accounts',
          screenshot: '/guides/square/step4.png'
        },
        {
          title: 'Export Appointment History',
          description: 'Click "Export" and select "Export to CSV"',
          tip: 'Choose "All time" for the date range to get all your data',
          screenshot: '/guides/square/step5.png'
        },
        {
          title: 'Download the File',
          description: 'Save the CSV file to your computer',
          tip: 'Remember where you save it - you\'ll upload it in the next step',
          screenshot: '/guides/square/step6.png'
        }
      ],
      notes: [
        'The export includes customers, appointments, and services in one file',
        'Future appointments cannot be exported directly',
        'Staff availability must be set up separately after import'
      ]
    },
    
    booksy: {
      title: 'Export from Booksy',
      difficulty: 'Requires Support',
      time: '10-15 minutes',
      specialNotice: 'Booksy doesn\'t offer self-service CSV export. You\'ll need to contact their support team.',
      steps: [
        {
          title: 'Open Booksy App or Web',
          description: 'Log in to your Booksy account',
          tip: 'The web version at booksy.com/biz works best for this',
          icon: '💻'
        },
        {
          title: 'Find Support Chat',
          description: 'Click the "?" icon in the left menu',
          tip: 'Usually at the bottom of the sidebar',
          icon: '❓'
        },
        {
          title: 'Start Live Chat',
          description: 'Click "Support" to open the chat window',
          tip: 'Support hours are typically Mon-Fri 9am-6pm EST',
          icon: '💬'
        },
        {
          title: 'Request Your Data',
          description: 'Send this message: "I need a copy of my client list and appointment history in CSV format for data migration"',
          tip: 'Be specific that you need CSV format, not PDF',
          icon: '📝'
        },
        {
          title: 'Wait for Support',
          description: 'The agent will prepare and send your files in the chat',
          tip: 'This usually takes 5-10 minutes',
          icon: '⏳'
        },
        {
          title: 'Download Files',
          description: 'Download the CSV file(s) when they\'re sent in the chat',
          tip: 'They might send separate files for clients and appointments',
          icon: '💾'
        }
      ],
      notes: [
        'Support response time varies - best to do this during business hours',
        'They may send multiple files - upload all of them',
        'Financial data might not be included in the export'
      ]
    },
    
    acuity: {
      title: 'Export from Acuity Scheduling',
      difficulty: 'Moderate',
      time: '5-7 minutes',
      multiFile: true,
      files: [
        { name: 'Appointments Export', required: true },
        { name: 'Clients Export', required: true }
      ],
      steps: [
        {
          title: 'Export Appointments (File 1 of 2)',
          substeps: [
            'Log in to your Acuity account',
            'Click "Reports" in the main menu',
            'Select "Export" option',
            'Choose your date range (select "All time" for everything)',
            'Click "Export appointments"',
            'Save the CSV file as "appointments.csv"'
          ],
          tip: 'Include canceled appointments if you want complete history',
          important: true
        },
        {
          title: 'Export Clients (File 2 of 2)',
          substeps: [
            'Go to "Clients" in the main menu',
            'Click "Import/export"',
            'Select "Export client list"',
            'Choose "All clients" from the dropdown',
            'Click "Export"',
            'Save the CSV file as "clients.csv"'
          ],
          tip: 'This gets all client contact information and history',
          important: true
        }
      ],
      notes: [
        'You need BOTH files for a complete import',
        'Files are limited to 1000 appointments or 5000 clients',
        'Timezone must match our supported list for proper import'
      ]
    },
    
    trafft: {
      title: 'Export from Trafft',
      difficulty: 'Easy',
      time: '3-5 minutes',
      multiFile: true,
      files: [
        { name: 'Customers Export', required: true },
        { name: 'Appointments Export', required: true }
      ],
      steps: [
        {
          title: 'Export Customers (File 1 of 2)',
          substeps: [
            'Log in to your Trafft dashboard',
            'Navigate to "Customers" section',
            'Click "Export Data" button (next to Import Data)',
            'Choose comma delimiter when prompted',
            'Select all columns or customize as needed',
            'Download the CSV file'
          ],
          tip: 'Name this file "customers.csv" for easy identification',
          important: true
        },
        {
          title: 'Export Appointments (File 2 of 2)',
          substeps: [
            'Go to "Appointments" section',
            'Select your date range (or leave for all)',
            'Click "Export Data" button',
            'Choose comma delimiter',
            'Select all columns',
            'Download the CSV file'
          ],
          tip: 'Name this file "appointments.csv"',
          important: true
        }
      ],
      notes: [
        'Both files are required for complete data transfer',
        'Custom fields will need manual mapping',
        'Employee schedules must be recreated after import'
      ]
    },
    
    schedulicity: {
      title: 'Export from Schedulicity',
      difficulty: 'Easy',
      time: '3-4 minutes',
      steps: [
        {
          title: 'Log in to Schedulicity',
          description: 'Go to schedulicity.com and sign in to your business account',
          tip: 'Make sure you\'re logging in as the business, not as a client',
          icon: '🔑'
        },
        {
          title: 'Navigate to Reports',
          description: 'Find "Reports" in the main menu',
          tip: 'Usually in the top navigation or sidebar',
          icon: '📊'
        },
        {
          title: 'Go to Export Data',
          description: 'Click on "Export Data" or "Data Export" option',
          tip: 'Might be under "Advanced" or "Settings"',
          icon: '💾'
        },
        {
          title: 'Select Date Range',
          description: 'Choose "All Time" or select your desired date range',
          tip: 'Get all data for the most complete transfer',
          icon: '📅'
        },
        {
          title: 'Choose Export Type',
          description: 'Select "Detailed" export type for maximum data',
          tip: 'Detailed gives you more fields to work with',
          icon: '📋'
        },
        {
          title: 'Export and Download',
          description: 'Click "Export to CSV" and download both Client and Appointment reports if available',
          tip: 'You might get separate files for different data types',
          icon: '⬇️'
        }
      ],
      notes: [
        'Online booking settings won\'t transfer',
        'Staff schedules need to be recreated',
        'Client preferences might be limited in the export'
      ]
    },
    
    other: {
      title: 'Export from Your Platform',
      difficulty: 'Varies',
      time: 'Depends on platform',
      genericSteps: true,
      steps: [
        {
          title: 'Locate Export Feature',
          description: 'Look for "Export", "Download", or "Reports" in your current system',
          tip: 'Check Settings, Reports, or Data Management sections',
          icon: '🔍'
        },
        {
          title: 'Choose Data to Export',
          description: 'Select customers, appointments, and services if available separately',
          tip: 'Get as much data as possible for best results',
          icon: '☑️'
        },
        {
          title: 'Select CSV Format',
          description: 'Choose CSV or Excel format for the export',
          tip: 'CSV is preferred, but Excel (.xlsx) also works',
          icon: '📄'
        },
        {
          title: 'Download Files',
          description: 'Save all exported files to a folder on your computer',
          tip: 'Keep track of what each file contains',
          icon: '💾'
        }
      ],
      notes: [
        'Column mapping may require manual adjustment',
        'Some platform-specific features may not transfer',
        'Contact your current platform\'s support if you can\'t find export options'
      ]
    }
  }

  const guide = exportGuides[platform] || exportGuides.other

  return (
    <div className="mb-6">
      {/* Collapsible Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
          <div className="text-left">
            <p className="font-medium text-gray-900">
              How to export from {config?.name || 'your platform'}
            </p>
            <p className="text-sm text-gray-600">
              {guide.difficulty} • {guide.time}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="mt-4 p-6 bg-white border border-gray-200 rounded-lg">
          {/* Special Notice for Booksy */}
          {guide.specialNotice && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 mb-1">Special Process Required</p>
                  <p className="text-sm text-yellow-700">{guide.specialNotice}</p>
                </div>
              </div>
            </div>
          )}

          {/* Multi-file Notice */}
          {guide.multiFile && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 mb-2">This platform requires {guide.files.length} separate files:</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {guide.files.map((file, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckIcon className="h-4 w-4" />
                        {file.name} {file.required && <span className="text-xs text-blue-600">(Required)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step-by-step Instructions */}
          <div className="space-y-4">
            {guide.steps.map((step, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg ${
                  currentStep === index ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === index ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step.icon || index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {step.title}
                      {step.important && (
                        <span className="ml-2 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                          Required File
                        </span>
                      )}
                    </h4>
                    
                    {step.description && (
                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                    )}
                    
                    {step.substeps && (
                      <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                        {step.substeps.map((substep, i) => (
                          <li key={i}>{substep}</li>
                        ))}
                      </ol>
                    )}
                    
                    {step.tip && (
                      <div className="mt-2 text-sm text-blue-600 flex items-start gap-1">
                        <InformationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{step.tip}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          {guide.steps.length > 1 && !guide.genericSteps && (
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous Step
              </button>
              <button
                onClick={() => setCurrentStep(Math.min(guide.steps.length - 1, currentStep + 1))}
                disabled={currentStep === guide.steps.length - 1}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step →
              </button>
            </div>
          )}

          {/* Important Notes */}
          {guide.notes && guide.notes.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Important Notes:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {guide.notes.map((note, i) => (
                  <li key={i}>• {note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
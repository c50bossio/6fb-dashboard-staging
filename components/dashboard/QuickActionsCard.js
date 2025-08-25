'use client'

import {
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

/**
 * Quick Actions Card for Dashboard
 * Provides permanent, always-visible links to common operations
 * Replaces the conditional DataImportWidget with consistent navigation
 */
export default function QuickActionsCard({ profile }) {
  const quickActions = [
    {
      title: 'Import Customers',
      description: 'Add customers from CSV',
      icon: DocumentArrowUpIcon,
      href: '/barber/clients?action=import',
      color: 'blue'
    },
    {
      title: 'Export Data',
      description: 'Download customer list',
      icon: DocumentArrowDownIcon,
      href: '/barber/clients?action=export',
      color: 'green'
    },
    {
      title: 'View Customers',
      description: 'Manage all customers',
      icon: UserGroupIcon,
      href: '/barber/clients',
      color: 'purple'
    },
    {
      title: 'Book Appointment',
      description: 'Schedule a new booking',
      icon: CalendarDaysIcon,
      href: '/appointments/new',
      color: 'orange'
    },
    {
      title: 'View Analytics',
      description: 'Performance metrics',
      icon: ChartBarIcon,
      href: '/dashboard?mode=analytics',
      color: 'indigo'
    },
    {
      title: 'Payroll & Finance',
      description: 'Staff payments & commissions',
      icon: BanknotesIcon,
      href: '/shop/financial',
      color: 'emerald'
    },
    {
      title: 'Transaction History',
      description: 'Payment records',
      icon: CurrencyDollarIcon,
      href: '/payments',
      color: 'teal'
    }
  ]

  const colorStyles = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200',
    teal: 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200'
  }

  const iconColors = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
    indigo: 'text-indigo-500',
    emerald: 'text-emerald-500',
    teal: 'text-teal-500'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate">Quick Actions</h3>
        <p className="text-sm text-gray-600 mt-1 truncate">
          Common tasks and operations
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`
              group relative flex flex-col items-center p-4 rounded-lg border transition-all duration-200
              ${colorStyles[action.color]}
            `}
          >
            <action.icon className={`h-8 w-8 mb-2 ${iconColors[action.color]}`} />
            <span className="text-sm font-medium text-center truncate px-1">
              {action.title}
            </span>
            <span className="text-xs text-gray-600 text-center mt-1 hidden lg:block truncate px-1">
              {action.description}
            </span>
            <ArrowRightIcon className="h-3 w-3 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <span className="font-medium">💡 Tip:</span> You can import and export customer data anytime from the Customers section. 
          No need to wait for special prompts or widgets.
        </p>
      </div>
    </div>
  )
}
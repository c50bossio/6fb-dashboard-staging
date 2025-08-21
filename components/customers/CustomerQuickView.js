/**
 * Customer Quick View Modal Component
 * 
 * Provides a lightweight, fast-loading customer overview modal
 * Optimized for quick information access and basic actions
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  MapPinIcon,
  StarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  HeartIcon,
  GiftIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import { customerDesignTokens } from './CustomerDesignSystem'
import { AnimatedContainer, CountUp } from '../../utils/animations'
import { HoverCard, Tooltip } from './CustomerMicroInteractions'

/**
 * Quick stats component
 */
function QuickStats({ customer, className = '' }) {
  const stats = [
    {
      label: 'Total Visits',
      value: customer.totalVisits || 0,
      icon: CalendarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Total Spent',
      value: customer.totalSpent || 0,
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      prefix: '$'
    },
    {
      label: 'Avg Visit',
      value: customer.totalVisits > 0 ? Math.round(customer.totalSpent / customer.totalVisits) : 0,
      icon: TagIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      prefix: '$'
    }
  ]

  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div key={stat.label} className="text-center">
          <div className={`inline-flex items-center justify-center w-8 h-8 ${stat.bgColor} rounded-lg mb-2`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <div className="text-lg font-bold text-gray-900">
            <CountUp 
              end={stat.value} 
              prefix={stat.prefix || ''} 
              duration={800}
            />
          </div>
          <div className="text-xs text-gray-500">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * Recent activity timeline
 */
function RecentActivity({ customerId, className = '' }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  // Mock activities for demo - replace with actual API call
  useEffect(() => {
    const mockActivities = [
      {
        id: 1,
        type: 'visit',
        title: 'Haircut & Beard Trim',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        amount: 45
      },
      {
        id: 2,
        type: 'appointment',
        title: 'Scheduled Appointment',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        amount: null
      },
      {
        id: 3,
        type: 'visit',
        title: 'Full Service',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        amount: 65
      }
    ]

    setTimeout(() => {
      setActivities(mockActivities)
      setLoading(false)
    }, 500)
  }, [customerId])

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex items-center space-x-3">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center
            ${activity.type === 'visit' ? 'bg-green-100' : 'bg-blue-100'}
          `}>
            {activity.type === 'visit' ? (
              <CalendarIcon className={`h-4 w-4 ${activity.type === 'visit' ? 'text-green-600' : 'text-blue-600'}`} />
            ) : (
              <ClockIcon className="h-4 w-4 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {activity.title}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {activity.date.toLocaleDateString()}
              </p>
              {activity.amount && (
                <span className="text-xs font-medium text-green-600">
                  ${activity.amount}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Main Quick View Modal
 */
export default function CustomerQuickView({
  customer,
  isOpen = false,
  onClose,
  onEdit,
  onCall,
  onEmail,
  onViewFull,
  onToggleFavorite,
  className = ''
}) {
  const [isFavorite, setIsFavorite] = useState(customer?.isFavorite || false)
  const modalRef = useRef(null)

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusableElements[0]?.focus()
    }
  }, [isOpen])

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite)
    onToggleFavorite?.(customer, !isFavorite)
  }

  const getSegmentColor = (segment) => {
    switch (segment) {
      case 'vip': return 'bg-gold-100 text-gold-800 border-gold-200'
      case 'new': return 'bg-green-100 text-green-800 border-green-200'
      case 'lapsed': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'regular': return 'bg-olive-100 text-olive-800 border-olive-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative bg-white rounded-2xl shadow-2xl w-full max-w-md
          animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4
          ${className}
        `}
      >
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-olive-100 to-moss-100 rounded-full flex items-center justify-center">
                  <span className="text-olive-700 font-bold text-lg">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {customer.segment === 'vip' && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 rounded-full flex items-center justify-center">
                    <StarSolidIcon className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Name and segment */}
              <div>
                <h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>
                {customer.segment && (
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                    ${getSegmentColor(customer.segment)}
                  `}>
                    {customer.segment.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-1">
              <Tooltip content={isFavorite ? "Remove from favorites" : "Add to favorites"}>
                <button
                  onClick={handleToggleFavorite}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  {isFavorite ? (
                    <HeartSolidIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <HeartIcon className="h-5 w-5" />
                  )}
                </button>
              </Tooltip>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Information */}
          <div className="space-y-3">
            {customer.phone && (
              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-900">{formatPhone(customer.phone)}</span>
                <button
                  onClick={() => onCall?.(customer)}
                  className="ml-auto p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <PhoneIcon className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {customer.email && (
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-900 flex-1 truncate">{customer.email}</span>
                <button
                  onClick={() => onEmail?.(customer)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <EnvelopeIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {customer.lastVisit && customer.lastVisit !== 'Never' && (
              <div className="flex items-center space-x-3">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">
                  Last visit: {new Date(customer.lastVisit).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <QuickStats customer={customer} />

          {/* Recent Activity */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
              Recent Activity
            </h3>
            <RecentActivity customerId={customer.id} />
          </div>

          {/* Notes */}
          {customer.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {customer.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex space-x-3">
            <button
              onClick={() => onViewFull?.(customer)}
              className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View Full Profile
            </button>
            
            <button
              onClick={() => onEdit?.(customer)}
              className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-olive-600 rounded-lg hover:bg-olive-700 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Customer
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex justify-center space-x-4 mt-3">
            <Tooltip content="Call customer">
              <button
                onClick={() => onCall?.(customer)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <PhoneIcon className="h-5 w-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="Send email">
              <button
                onClick={() => onEmail?.(customer)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <EnvelopeIcon className="h-5 w-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="Send gift card">
              <button
                onClick={() => console.log('Send gift card')}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <GiftIcon className="h-5 w-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="Open in new tab">
              <button
                onClick={() => onViewFull?.(customer)}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}
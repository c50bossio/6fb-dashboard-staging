'use client'

import React from 'react'
import { 
  UserPlusIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  LightBulbIcon,
  InformationCircleIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui'
import { AnimatedContainer, StaggeredFadeIn } from '../../utils/animations'
import { customerDesignTokens } from './CustomerDesignSystem'

/**
 * SVG Illustrations for better visual appeal
 */
const EmptyStateIllustrations = {
  NoCustomers: () => (
    <svg viewBox="0 0 200 160" className="w-32 h-24 mx-auto mb-4 text-gray-400">
      <defs>
        <linearGradient id="chairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8ba362" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6f8a4c" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* Barber chair */}
      <rect x="70" y="80" width="60" height="60" rx="8" fill="url(#chairGradient)" />
      <rect x="75" y="85" width="50" height="50" rx="25" fill="currentColor" opacity="0.1" />
      <circle cx="100" cy="70" r="15" fill="currentColor" opacity="0.2" />
      {/* Dotted lines suggesting waiting area */}
      <circle cx="40" cy="120" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="50" cy="120" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="60" cy="120" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="140" cy="120" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="150" cy="120" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="160" cy="120" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  
  NoResults: () => (
    <svg viewBox="0 0 200 160" className="w-32 h-24 mx-auto mb-4 text-gray-400">
      {/* Magnifying glass */}
      <circle cx="80" cy="70" r="25" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.6" />
      <line x1="100" y1="90" x2="120" y2="110" stroke="currentColor" strokeWidth="3" opacity="0.6" />
      {/* Question marks floating */}
      <text x="60" y="45" fontSize="16" fill="currentColor" opacity="0.4">?</text>
      <text x="110" y="50" fontSize="12" fill="currentColor" opacity="0.3">?</text>
      <text x="45" y="100" fontSize="14" fill="currentColor" opacity="0.3">?</text>
    </svg>
  ),
  
  NoMatches: () => (
    <svg viewBox="0 0 200 160" className="w-32 h-24 mx-auto mb-4 text-gray-400">
      {/* Target with no hits */}
      <circle cx="100" cy="80" r="30" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <circle cx="100" cy="80" r="20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <circle cx="100" cy="80" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      {/* Arrows missing target */}
      <line x1="60" y1="60" x2="75" y2="65" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <polygon points="75,65 72,62 72,68" fill="currentColor" opacity="0.4" />
      <line x1="140" y1="100" x2="125" y2="95" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <polygon points="125,95 128,92 128,98" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

/**
 * Enhanced EmptyBarberState Component
 * 
 * Displays delightful empty states with illustrations and contextual guidance
 */
export default function EmptyBarberState({
  type = 'no-customers', // 'no-customers', 'no-results', 'no-matches'
  searchQuery = '',
  hasFilters = false,
  onClearFilters,
  onAddCustomer,
  className = ''
}) {
  const stateConfig = {
    'no-customers': {
      icon: UserPlusIcon,
      title: 'Welcome to your customer hub!',
      subtitle: 'Time to build your clientele',
      description: 'Every great barbershop starts with the first customer. Add your inaugural client and begin building lasting relationships.',
      action: {
        label: 'Add First Customer',
        onClick: onAddCustomer,
        variant: 'primary',
        icon: UserPlusIcon
      },
      illustration: EmptyStateIllustrations.NoCustomers,
      gradient: 'from-olive-50 to-moss-50',
      tips: [
        'Start with customers you already know',
        'Add their contact preferences for better service',
        'Include any special notes about their preferences'
      ]
    },
    'no-results': {
      icon: MagnifyingGlassIcon,
      title: 'No customers found',
      subtitle: searchQuery ? `for "${searchQuery}"` : 'with current filters',
      description: 'We couldn\'t find any customers matching your criteria. Try adjusting your search or filters.',
      action: hasFilters ? {
        label: 'Clear All Filters',
        onClick: onClearFilters,
        variant: 'secondary',
        icon: null
      } : null,
      illustration: EmptyStateIllustrations.NoResults,
      gradient: 'from-blue-50 to-indigo-50',
      tips: [
        'Search by name, email, or phone number',
        'Use partial words for broader results',
        'Check for typos in your search query',
        'Remove filters to see more customers'
      ]
    },
    'no-matches': {
      icon: ExclamationCircleIcon,
      title: 'Too specific',
      subtitle: 'Try broadening your search',
      description: 'Your search criteria are very specific. Consider removing some filters or adjusting your search terms.',
      action: {
        label: 'Reset Search',
        onClick: onClearFilters,
        variant: 'secondary',
        icon: null
      },
      illustration: EmptyStateIllustrations.NoMatches,
      gradient: 'from-amber-50 to-orange-50',
      tips: [
        'Remove some filter criteria',
        'Try searching for partial names',
        'Check different customer segments',
        'Consider expanding date ranges'
      ]
    }
  }

  const config = stateConfig[type] || stateConfig['no-customers']
  const Icon = config.icon
  const IllustrationComponent = config.illustration

  return (
    <AnimatedContainer animation="fadeIn" className={`text-center py-16 ${className}`}>
      <div className="max-w-lg mx-auto">
        {/* Background gradient */}
        <div className={`rounded-3xl bg-gradient-to-br ${config.gradient} p-8 mb-6 relative overflow-hidden`}>
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 opacity-20">
            <Icon className="h-12 w-12 text-gray-400" />
          </div>
          
          {/* Main illustration */}
          <div className="relative z-10">
            <IllustrationComponent />
          </div>
        </div>

        {/* Title and subtitle */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {config.title}
          </h3>
          {config.subtitle && (
            <p className="text-lg text-gray-600 font-medium mb-3">
              {config.subtitle}
            </p>
          )}
          <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
            {config.description}
          </p>
        </div>

        {/* Action Button */}
        {config.action && (
          <div className="mb-8">
            <Button
              variant={config.action.variant}
              onClick={config.action.onClick}
              icon={config.action.icon}
              className="px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              {config.action.label}
            </Button>
          </div>
        )}

        {/* Tips section */}
        <StaggeredFadeIn delay={150} className="mt-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <div className="p-2 bg-olive-100 rounded-full">
                <LightBulbIcon className="h-5 w-5 text-olive-600" />
              </div>
              <h4 className="ml-3 text-lg font-semibold text-gray-900">
                {type === 'no-customers' ? 'Getting Started Tips' : 'Search Tips'}
              </h4>
            </div>
            
            <ul className="space-y-3 text-left">
              {config.tips.map((tip, index) => (
                <li 
                  key={index} 
                  className="flex items-start space-x-3 text-sm text-gray-700 animate-in slide-in-from-left-2"
                  style={{ animationDelay: `${(index + 1) * 100}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex-shrink-0 w-1.5 h-1.5 bg-olive-500 rounded-full mt-2" />
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </StaggeredFadeIn>

        {/* Secondary actions for specific states */}
        {(type === 'no-results' || type === 'no-matches') && (
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-gray-500 hover:text-gray-700 underline hover:no-underline transition-colors"
            >
              Refresh page
            </button>
            {type === 'no-results' && onAddCustomer && (
              <>
                <span className="text-gray-300">•</span>
                <button
                  onClick={onAddCustomer}
                  className="text-sm text-olive-600 hover:text-olive-700 underline hover:no-underline transition-colors"
                >
                  Add new customer instead
                </button>
              </>
            )}
          </div>
        )}

        {/* Contextual help for first-time users */}
        {type === 'no-customers' && (
          <div className="mt-8 p-4 bg-gradient-to-r from-olive-50 to-moss-50 rounded-lg border border-olive-200">
            <div className="flex items-start space-x-3">
              <RocketLaunchIcon className="h-5 w-5 text-olive-600 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h5 className="text-sm font-semibold text-olive-900 mb-1">
                  Pro Tip: Import Existing Customers
                </h5>
                <p className="text-sm text-olive-800">
                  Have customers from another system? Consider importing them to get started faster.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedContainer>
  )
}
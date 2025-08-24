'use client'

import * as HeroIcons from '@heroicons/react/24/outline'
import Link from 'next/link'

import { Card, Badge } from '../ui'

const {
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  SparklesIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  MegaphoneIcon,
  CogIcon,
  PlusIcon,
  ArrowRightIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  PaintBrushIcon,
  GlobeAltIcon
} = HeroIcons

// Unified customization URL for all user roles
const getCustomizationUrl = () => '/customize'

// Unified customization content with progressive disclosure
const getCustomizationContent = () => ({
  title: 'Customize Experience',
  description: 'Personalize your profile, website, and branding'
})

const FallbackIcon = ({ className }) => (
  <div className={`${className} bg-gray-300 rounded-full`} />
)

export default function QuickActions({ profile }) {
  // Get unified customization content
  const customizationContent = getCustomizationContent()
  const customizationUrl = getCustomizationUrl()
  const primaryActions = [
    {
      title: 'AI Command Center',
      description: 'Start a conversation with your AI business coach',
      href: '/dashboard/ai-command-center',
      icon: ChatBubbleLeftRightIcon,
      color: 'purple',
      badge: 'Most Popular',
      badgeVariant: 'solid-purple'
    },
    {
      title: 'View Analytics',
      description: 'Check your business performance and insights',
      href: '/dashboard?mode=analytics',
      icon: ChartBarIcon,
      color: 'blue',
      badge: 'Live Data',
      badgeVariant: 'info'
    },
    {
      title: 'Manage Bookings',
      description: 'View and organize customer appointments',
      href: '/dashboard/bookings',
      icon: CalendarDaysIcon,
      color: 'green',
      badge: '12 Today',
      badgeVariant: 'success'
    }
  ]

  const secondaryActions = [
    {
      title: customizationContent.title,
      description: customizationContent.description,
      href: customizationUrl,
      icon: PaintBrushIcon,
      color: 'indigo'
    },
    {
      title: 'Customer Management',
      description: 'View and manage your customer database',
      href: '/dashboard/customers',
      icon: UserGroupIcon,
      color: 'orange'
    },
    {
      title: 'Marketing Campaigns',
      description: 'Create and manage marketing automation',
      href: '/dashboard/marketing',
      icon: MegaphoneIcon,
      color: 'pink'
    },
    {
      title: 'AI Training',
      description: 'Train and customize your AI agents',
      href: '/dashboard/ai-training',
      icon: SparklesIcon,
      color: 'emerald'
    }
  ]

  const quickStartActions = [
    {
      title: 'Setup AI Agent',
      description: 'Configure your first AI assistant',
      href: '/dashboard/ai-training',
      icon: RocketLaunchIcon,
      color: 'emerald',
      isNew: true
    },
    {
      title: 'Import Customers',
      description: 'Upload your existing customer list',
      href: '/dashboard/customers',
      icon: PlusIcon,
      color: 'blue'
    },
    {
      title: 'View Tutorials',
      description: 'Learn how to maximize your AI system',
      href: '/dashboard/help',
      icon: LightBulbIcon,
      color: 'amber'
    }
  ]

  const getColorClasses = (color) => {
    const colorMap = {
      purple: 'text-gold-600 bg-gold-50 hover:bg-gold-100',
      blue: 'text-olive-600 bg-olive-50 hover:bg-olive-100',
      green: 'text-green-600 bg-green-50 hover:bg-green-100',
      orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
      pink: 'text-pink-600 bg-pink-50 hover:bg-pink-100',
      indigo: 'text-olive-600 bg-indigo-50 hover:bg-indigo-100',
      emerald: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100',
      amber: 'text-amber-700 bg-amber-50 hover:bg-amber-100'
    }
    return colorMap[color] || colorMap.blue
  }

  const isNewUser = !profile?.subscription_status || profile?.subscription_status === 'trial'

  return (
    <div className="space-y-8">
      {/* Quick Start Section for New Users */}
      {isNewUser && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Quick Start</h2>
              <p className="text-sm text-gray-600 mt-1">Get your AI system up and running in minutes</p>
            </div>
            <Badge variant="primary">New User</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickStartActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card clickable hover className="h-full">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${getColorClasses(action.color)}`}>
                      {action.icon ? (
                        <action.icon className="h-6 w-6" />
                      ) : (
                        <FallbackIcon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{action.title}</h3>
                        {action.isNew && <Badge variant="success" size="sm">New</Badge>}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                    </div>
                    {ArrowRightIcon ? (
                      <ArrowRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <FallbackIcon className="h-4 w-4" />
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Primary Actions */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Most Used Features</h2>
          <span className="text-sm text-gray-500">Quick access to your main tools</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {primaryActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card clickable hover variant="elevated" className="h-full group">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className={`p-3 sm:p-4 rounded-xl ${getColorClasses(action.color)} group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>
                    {action.icon ? (
                      <action.icon className="h-6 w-6 sm:h-8 sm:w-8" />
                    ) : (
                      <FallbackIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors text-base sm:text-lg">
                        {action.title}
                      </h3>
                      {action.badge && (
                        <Badge variant={action.badgeVariant || 'default'} size="sm" className="mt-1 sm:mt-0 w-fit">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{action.description}</p>
                    <div className="flex items-center mt-3 sm:mt-4 text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                      <span>Get started</span>
                      {ArrowRightIcon ? (
                        <ArrowRightIcon className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                      ) : (
                        <FallbackIcon className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Secondary Actions */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">More Tools</h2>
          <span className="text-sm text-gray-500">Additional features and settings</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {secondaryActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card clickable hover className="group">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-lg ${getColorClasses(action.color)}`}>
                    {action.icon ? (
                      <action.icon className="h-5 w-5" />
                    ) : (
                      <FallbackIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm group-hover:text-gray-700 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">{action.description}</p>
                  </div>
                  {ArrowRightIcon ? (
                    <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
                  ) : (
                    <FallbackIcon className="h-4 w-4" />
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Settings Quick Access */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">System Settings</h3>
            <p className="text-sm text-gray-600 mt-1">Configure your AI system preferences</p>
          </div>
          <Link href="/dashboard/settings">
            <div className="flex items-center space-x-2 text-olive-600 hover:text-olive-700 transition-colors cursor-pointer">
              {CogIcon ? (
                <CogIcon className="h-5 w-5" />
              ) : (
                <FallbackIcon className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">Settings</span>
              {ArrowRightIcon ? (
                <ArrowRightIcon className="h-4 w-4" />
              ) : (
                <FallbackIcon className="h-4 w-4" />
              )}
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
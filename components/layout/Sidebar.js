'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  HomeIcon,
  CpuChipIcon,
  LinkIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

const Sidebar = ({ isOpen, onClose, className = '' }) => {
  const pathname = usePathname()
  
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: HomeIcon,
      description: 'Overview & insights'
    },
    { 
      name: 'AI Agents', 
      href: '/dashboard/agents', 
      icon: CpuChipIcon,
      description: 'Manage your agents'
    },
    { 
      name: 'Integrations', 
      href: '/dashboard/integrations', 
      icon: LinkIcon,
      description: 'Connect platforms'
    },
    { 
      name: 'Analytics', 
      href: '/dashboard/analytics', 
      icon: ChartBarIcon,
      description: 'Performance metrics'
    },
    { 
      name: 'Settings', 
      href: '/dashboard/settings', 
      icon: Cog6ToothIcon,
      description: 'Account & preferences'
    }
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-mono-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 glass-sidebar transform transition-transform duration-300 ease-in-out",
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:inset-0',
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-mono-200/50 dark:border-mono-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-soft">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-heading-sm font-serif font-semibold text-text-default dark:text-text-dark-default">
                  6FB AI
                </h1>
                <p className="text-body-xs text-text-tertiary dark:text-text-dark-tertiary">
                  Agent System
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const IconComponent = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    isActive ? 'nav-item-active' : 'nav-item',
                    'group'
                  )}
                  onClick={onClose}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <IconComponent className={clsx(
                      "h-5 w-5 flex-shrink-0",
                      isActive 
                        ? "text-brand-600 dark:text-brand-400" 
                        : "text-text-tertiary dark:text-text-dark-tertiary group-hover:text-text-secondary dark:group-hover:text-text-dark-secondary"
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className={clsx(
                        "text-body-sm font-medium truncate",
                        isActive 
                          ? "text-brand-700 dark:text-brand-300" 
                          : "text-text-secondary dark:text-text-dark-secondary group-hover:text-text-default dark:group-hover:text-text-dark-default"
                      )}>
                        {item.name}
                      </p>
                      <p className="text-body-xs text-text-tertiary dark:text-text-dark-tertiary truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>
          
          {/* Footer */}
          <div className="p-4 border-t border-mono-200/50 dark:border-mono-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-xs font-medium text-text-secondary dark:text-text-dark-secondary">
                  Version 1.0.0
                </p>
                <p className="text-body-xs text-text-tertiary dark:text-text-dark-tertiary">
                  Enterprise
                </p>
              </div>
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse-gentle" title="System online" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar